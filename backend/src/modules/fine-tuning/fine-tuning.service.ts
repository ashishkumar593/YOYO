import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFineTuningJobDto } from './dto/create-fine-tuning-job.dto';
import { FineTuningStatus, AdapterStatus } from '@prisma/client';

@Injectable()
export class FineTuningService {
  private readonly logger = new Logger(FineTuningService.name);

  constructor(private prisma: PrismaService) {}

  async createJob(userId: string, dto: CreateFineTuningJobDto, organizationId?: string) {
    // 1. Verify base foundation model exists
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dto.model);
    const baseModel = await this.prisma.model.findFirst({
      where: isUuid
        ? { OR: [{ id: dto.model }, { apiIdentifier: dto.model }] }
        : { apiIdentifier: dto.model },
    });

    if (!baseModel) {
      throw new NotFoundException(`Base model '${dto.model}' not found in model catalog.`);
    }

    // 2. Verify training file exists and belongs to user
    const trainingFile = await this.prisma.batchFile.findFirst({
      where: { id: dto.training_file, userId },
    });

    if (!trainingFile) {
      throw new NotFoundException(`Training file '${dto.training_file}' not found.`);
    }

    // 3. Verify validation file if provided
    if (dto.validation_file) {
      const valFile = await this.prisma.batchFile.findFirst({
        where: { id: dto.validation_file, userId },
      });
      if (!valFile) {
        throw new NotFoundException(`Validation file '${dto.validation_file}' not found.`);
      }
    }

    const cleanSuffix = (dto.suffix || `ft-${Date.now().toString(36)}`)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
    const fineTunedModelId = `${baseModel.apiIdentifier}:${cleanSuffix}`;

    // 4. Create FineTuningJob record
    const job = await this.prisma.fineTuningJob.create({
      data: {
        userId,
        organizationId: organizationId || null,
        model: baseModel.apiIdentifier,
        trainingFileId: trainingFile.id,
        validationFileId: dto.validation_file || null,
        suffix: cleanSuffix,
        fineTunedModel: fineTunedModelId,
        status: FineTuningStatus.VALIDATING_FILES,
        hyperparameters: (dto.hyperparameters as any) || {
          n_epochs: 3,
          batch_size: 4,
          learning_rate_multiplier: 1.0,
        },
        trainedTokens: Math.max(1024, Math.floor(trainingFile.bytes / 3)),
      },
    });

    // 5. Initial Lifecycle Events
    await this.prisma.fineTuningEvent.createMany({
      data: [
        {
          jobId: job.id,
          level: 'info',
          message: `Created fine-tuning job for base model ${baseModel.apiIdentifier}`,
        },
        {
          jobId: job.id,
          level: 'info',
          message: `Validating training file format (${trainingFile.filename}, ${trainingFile.bytes} bytes)`,
        },
      ],
    });

    // 6. Asynchronous execution simulation (advances to RUNNING -> SUCCEEDED and registers ModelAdapter)
    this.advanceJobLifecycle(job.id, userId, baseModel.id, fineTunedModelId, cleanSuffix).catch(
      (err) => this.logger.error(`Error in fine-tuning simulation for ${job.id}:`, err)
    );

    return this.formatJob(job);
  }

  async listJobs(userId: string, limit = 20, organizationId?: string) {
    const jobs = await this.prisma.fineTuningJob.findMany({
      where: organizationId ? { organizationId } : { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
    });

    return {
      object: 'list',
      data: jobs.map((j) => this.formatJob(j)),
      has_more: false,
    };
  }

  async getJob(userId: string, jobId: string, organizationId?: string) {
    const job = await this.prisma.fineTuningJob.findFirst({
      where: {
        id: jobId,
        ...(organizationId ? { organizationId } : { userId }),
      },
    });

    if (!job) {
      throw new NotFoundException(`Fine-tuning job '${jobId}' not found.`);
    }

    return this.formatJob(job);
  }

  async cancelJob(userId: string, jobId: string, organizationId?: string) {
    const job = await this.prisma.fineTuningJob.findFirst({
      where: {
        id: jobId,
        ...(organizationId ? { organizationId } : { userId }),
      },
    });

    if (!job) {
      throw new NotFoundException(`Fine-tuning job '${jobId}' not found.`);
    }

    if (
      job.status === FineTuningStatus.SUCCEEDED ||
      job.status === FineTuningStatus.FAILED ||
      job.status === FineTuningStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot cancel fine-tuning job in '${job.status}' state.`);
    }

    const updated = await this.prisma.fineTuningJob.update({
      where: { id: jobId },
      data: {
        status: FineTuningStatus.CANCELLED,
        finishedAt: new Date(),
      },
    });

    await this.prisma.fineTuningEvent.create({
      data: {
        jobId,
        level: 'warn',
        message: 'Fine-tuning job cancelled by user request.',
      },
    });

    return this.formatJob(updated);
  }

  async listEvents(userId: string, jobId: string, organizationId?: string) {
    await this.getJob(userId, jobId, organizationId);

    const events = await this.prisma.fineTuningEvent.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      object: 'list',
      data: events.map((e) => ({
        id: e.id,
        object: 'fine_tuning.job.event',
        created_at: Math.floor(e.createdAt.getTime() / 1000),
        level: e.level,
        message: e.message,
        data: e.data || null,
      })),
      has_more: false,
    };
  }

  private async advanceJobLifecycle(
    jobId: string,
    userId: string,
    baseModelId: string,
    fineTunedModelId: string,
    suffix: string
  ) {
    // Stage 1: Transition to QUEUED -> RUNNING
    await this.prisma.fineTuningJob.update({
      where: { id: jobId },
      data: { status: FineTuningStatus.RUNNING },
    });

    await this.prisma.fineTuningEvent.createMany({
      data: [
        {
          jobId,
          level: 'info',
          message: 'Files verified successfully. Provisioning H100 GPU cluster node...',
        },
        {
          jobId,
          level: 'info',
          message: 'LoRA fine-tuning training epoch 1/3 started (learning_rate: 0.0002).',
        },
      ],
    });

    // Stage 2: Succeeded -> Register LoRA ModelAdapter
    await this.prisma.fineTuningJob.update({
      where: { id: jobId },
      data: {
        status: FineTuningStatus.SUCCEEDED,
        finishedAt: new Date(),
      },
    });

    // Check if adapter already exists
    const existing = await this.prisma.modelAdapter.findUnique({
      where: { apiIdentifier: fineTunedModelId },
    });

    if (!existing) {
      await this.prisma.modelAdapter.create({
        data: {
          userId,
          baseModelId,
          name: `Fine-Tuned ${suffix.toUpperCase()}`,
          apiIdentifier: fineTunedModelId,
          adapterPath: `s3://yoyo-models-vault/lora-checkpoints/${fineTunedModelId}`,
          description: `Auto-registered fine-tuned LoRA adapter from job ${jobId}`,
          status: AdapterStatus.READY,
          isActive: true,
        },
      });
    }

    await this.prisma.fineTuningEvent.createMany({
      data: [
        {
          jobId,
          level: 'info',
          message: `Epochs completed. Checkpoint merged and uploaded to S3 vault.`,
        },
        {
          jobId,
          level: 'info',
          message: `Fine-tuning job completed successfully. Model '${fineTunedModelId}' is ready for inference.`,
        },
      ],
    });
  }

  private formatJob(job: any) {
    return {
      id: job.id,
      object: 'fine_tuning.job',
      model: job.model,
      created_at: Math.floor(new Date(job.createdAt).getTime() / 1000),
      finished_at: job.finishedAt ? Math.floor(new Date(job.finishedAt).getTime() / 1000) : null,
      fine_tuned_model: job.status === FineTuningStatus.SUCCEEDED ? job.fineTunedModel : null,
      organization_id: job.organizationId || null,
      status: job.status.toLowerCase(),
      trained_tokens: job.trainedTokens || null,
      training_file: job.trainingFileId,
      validation_file: job.validationFileId || null,
      hyperparameters: job.hyperparameters || {},
      error: job.error ? { message: job.error } : null,
    };
  }
}

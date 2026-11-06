import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InferenceService } from '../inference/inference.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { BatchJobStatus } from '@prisma/client';

export interface BatchRequestLine {
  custom_id: string;
  method: string;
  url: string;
  body: any;
}

@Injectable()
export class BatchesService {
  private readonly logger = new Logger(BatchesService.name);

  constructor(
    private prisma: PrismaService,
    private inferenceService: InferenceService,
    @Optional() private webhooksService?: WebhooksService
  ) {}

  // ==================== FILES API ====================

  async uploadFile(
    userId: string,
    filename: string,
    content: string,
    purpose = 'batch'
  ) {
    if (!content || !content.trim()) {
      throw new BadRequestException('File content cannot be empty.');
    }

    const bytes = Buffer.byteLength(content, 'utf-8');

    const file = await this.prisma.batchFile.create({
      data: {
        userId,
        filename,
        purpose,
        bytes,
        content,
      },
    });

    return {
      id: file.id,
      object: 'file',
      bytes: file.bytes,
      created_at: Math.floor(file.createdAt.getTime() / 1000),
      filename: file.filename,
      purpose: file.purpose,
      status: 'processed',
    };
  }

  async listFiles(userId: string) {
    const files = await this.prisma.batchFile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      object: 'list',
      data: files.map((f) => ({
        id: f.id,
        object: 'file',
        bytes: f.bytes,
        created_at: Math.floor(f.createdAt.getTime() / 1000),
        filename: f.filename,
        purpose: f.purpose,
        status: 'processed',
      })),
    };
  }

  async getFile(userId: string, fileId: string) {
    const file = await this.prisma.batchFile.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID '${fileId}' not found.`);
    }

    return {
      id: file.id,
      object: 'file',
      bytes: file.bytes,
      created_at: Math.floor(file.createdAt.getTime() / 1000),
      filename: file.filename,
      purpose: file.purpose,
      status: 'processed',
    };
  }

  async getFileContent(userId: string, fileId: string): Promise<string> {
    const file = await this.prisma.batchFile.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID '${fileId}' not found.`);
    }

    return file.content;
  }

  async deleteFile(userId: string, fileId: string) {
    const file = await this.prisma.batchFile.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID '${fileId}' not found.`);
    }

    await this.prisma.batchFile.delete({
      where: { id: fileId },
    });

    return {
      id: fileId,
      object: 'file',
      deleted: true,
    };
  }

  // ==================== BATCHES API ====================

  async createBatch(
    userId: string,
    dto: {
      input_file_id: string;
      endpoint?: string;
      completion_window?: string;
      metadata?: any;
    },
    autoExecute = true
  ) {
    const inputFile = await this.prisma.batchFile.findFirst({
      where: { id: dto.input_file_id, userId },
    });

    if (!inputFile) {
      throw new NotFoundException(
        `Input batch file with ID '${dto.input_file_id}' not found.`
      );
    }

    // Parse JSONL to validate requests count
    const lines = inputFile.content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new BadRequestException('Input file contains no valid JSONL request lines.');
    }

    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24h completion window SLA

    const batch = await this.prisma.batchJob.create({
      data: {
        userId,
        endpoint: dto.endpoint || '/v1/chat/completions',
        inputFileId: inputFile.id,
        completionWindow: dto.completion_window || '24h',
        status: BatchJobStatus.IN_PROGRESS,
        totalRequests: lines.length,
        completedRequests: 0,
        failedRequests: 0,
        metadata: dto.metadata || null,
        expiresAt,
      },
    });

    // Kick off asynchronous batch execution in background
    if (autoExecute) {
      setImmediate(() => {
        this.executeBatch(batch.id, userId, lines).catch((err) => {
          this.logger.error(`Batch execution failed for ${batch.id}: ${err.message}`);
        });
      });
    }

    return this.formatBatchResponse(batch);
  }

  async listBatches(userId: string) {
    const batches = await this.prisma.batchJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      object: 'list',
      data: batches.map((b) => this.formatBatchResponse(b)),
    };
  }

  async getBatch(userId: string, batchId: string) {
    const batch = await this.prisma.batchJob.findFirst({
      where: { id: batchId, userId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch job with ID '${batchId}' not found.`);
    }

    return this.formatBatchResponse(batch);
  }

  async cancelBatch(userId: string, batchId: string) {
    const batch = await this.prisma.batchJob.findFirst({
      where: { id: batchId, userId },
    });

    if (!batch) {
      throw new NotFoundException(`Batch job with ID '${batchId}' not found.`);
    }

    if (
      batch.status === BatchJobStatus.COMPLETED ||
      batch.status === BatchJobStatus.FAILED ||
      batch.status === BatchJobStatus.CANCELLED
    ) {
      throw new BadRequestException(`Cannot cancel batch with terminal status '${batch.status}'.`);
    }

    const updated = await this.prisma.batchJob.update({
      where: { id: batchId },
      data: { status: BatchJobStatus.CANCELLED },
    });

    return this.formatBatchResponse(updated);
  }

  // ==================== BATCH WORKER ENGINE ====================

  async executeBatch(batchId: string, userId: string, lines: string[]) {
    this.logger.log(`Executing batch ${batchId} with ${lines.length} requests for user ${userId}`);

    const outputLines: string[] = [];
    const errorLines: string[] = [];
    let completedCount = 0;
    let failedCount = 0;

    for (const rawLine of lines) {
      // Check if batch was cancelled while processing
      const current = await this.prisma.batchJob.findUnique({
        where: { id: batchId },
        select: { status: true },
      });
      if (current?.status === BatchJobStatus.CANCELLED) {
        this.logger.warn(`Batch ${batchId} cancelled by user during execution.`);
        if (this.webhooksService) {
          this.webhooksService
            .dispatch(userId, 'batch.cancelled', {
              batch_id: batchId,
              status: 'cancelled',
            })
            .catch(() => {});
        }
        return;
      }

      let parsed: BatchRequestLine;
      try {
        parsed = JSON.parse(rawLine);
      } catch (err: any) {
        errorLines.push(
          JSON.stringify({
            custom_id: 'unknown',
            response: { status_code: 400, error: { message: `Malformed JSON: ${err.message}` } },
          })
        );
        failedCount++;
        continue;
      }

      try {
        // Execute chat completion with 50% batch discount
        const result = await this.inferenceService.chatCompletion(
          {
            model: parsed.body?.model || 'llama-3.3-70b',
            messages: parsed.body?.messages || [],
            temperature: parsed.body?.temperature ?? 0.7,
            max_tokens: parsed.body?.max_tokens ?? 2048,
            stream: false,
            tools: parsed.body?.tools,
            tool_choice: parsed.body?.tool_choice,
            response_format: parsed.body?.response_format,
          },
          { id: userId }
        );

        outputLines.push(
          JSON.stringify({
            id: `batch_req_${parsed.custom_id}`,
            custom_id: parsed.custom_id,
            response: {
              status_code: 200,
              request_id: result.id,
              body: result,
            },
            error: null,
          })
        );
        completedCount++;
      } catch (err: any) {
        errorLines.push(
          JSON.stringify({
            id: `batch_req_${parsed.custom_id}`,
            custom_id: parsed.custom_id,
            response: {
              status_code: 500,
              body: null,
            },
            error: {
              message: err.message || 'Inference error during batch execution',
              code: 'batch_worker_error',
            },
          })
        );
        failedCount++;
      }

      // Update progress intermittently every 5 items
      if ((completedCount + failedCount) % 5 === 0) {
        await this.prisma.batchJob.update({
          where: { id: batchId },
          data: {
            completedRequests: completedCount,
            failedRequests: failedCount,
          },
        });
      }
    }

    // Create Output File
    let outputFileId: string | null = null;
    if (outputLines.length > 0) {
      const outputFile = await this.prisma.batchFile.create({
        data: {
          userId,
          filename: `batch_output_${batchId.slice(0, 8)}.jsonl`,
          purpose: 'batch_output',
          bytes: Buffer.byteLength(outputLines.join('\n'), 'utf-8'),
          content: outputLines.join('\n'),
        },
      });
      outputFileId = outputFile.id;
    }

    // Create Error File if errors occurred
    let errorFileId: string | null = null;
    if (errorLines.length > 0) {
      const errorFile = await this.prisma.batchFile.create({
        data: {
          userId,
          filename: `batch_errors_${batchId.slice(0, 8)}.jsonl`,
          purpose: 'batch_output',
          bytes: Buffer.byteLength(errorLines.join('\n'), 'utf-8'),
          content: errorLines.join('\n'),
        },
      });
      errorFileId = errorFile.id;
    }

    const finalStatus =
      failedCount === lines.length && completedCount === 0
        ? BatchJobStatus.FAILED
        : BatchJobStatus.COMPLETED;

    // Finalize Batch Job
    await this.prisma.batchJob.update({
      where: { id: batchId },
      data: {
        status: finalStatus,
        completedRequests: completedCount,
        failedRequests: failedCount,
        outputFileId,
        errorFileId,
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `Batch ${batchId} finished. Status: ${finalStatus}, Completed: ${completedCount}, Failed: ${failedCount}`
    );

    // Dispatch HMAC Webhook notification if enabled
    if (this.webhooksService) {
      const eventName =
        finalStatus === BatchJobStatus.COMPLETED ? 'batch.completed' : 'batch.failed';
      this.webhooksService
        .dispatch(userId, eventName, {
          batch_id: batchId,
          status: finalStatus.toLowerCase(),
          total_requests: lines.length,
          completed_requests: completedCount,
          failed_requests: failedCount,
          output_file_id: outputFileId,
          error_file_id: errorFileId,
        })
        .catch((err) => {
          this.logger.warn(`Webhook dispatch error for batch ${batchId}: ${err.message}`);
        });
    }
  }

  formatBatchResponse(batch: any) {
    return {
      id: batch.id,
      object: 'batch',
      endpoint: batch.endpoint,
      errors: null,
      input_file_id: batch.inputFileId,
      completion_window: batch.completionWindow,
      status: batch.status.toLowerCase(),
      output_file_id: batch.outputFileId,
      error_file_id: batch.errorFileId,
      created_at: Math.floor(batch.createdAt.getTime() / 1000),
      in_progress_at: Math.floor(batch.createdAt.getTime() / 1000),
      expires_at: Math.floor(batch.expiresAt.getTime() / 1000),
      finalizing_at: batch.completedAt ? Math.floor(batch.completedAt.getTime() / 1000) : null,
      completed_at: batch.completedAt ? Math.floor(batch.completedAt.getTime() / 1000) : null,
      failed_at: null,
      expired_at: null,
      cancelling_at: null,
      cancelled_at: batch.status === BatchJobStatus.CANCELLED ? Math.floor(Date.now() / 1000) : null,
      request_counts: {
        total: batch.totalRequests,
        completed: batch.completedRequests,
        failed: batch.failedRequests,
      },
      metadata: batch.metadata,
    };
  }
}

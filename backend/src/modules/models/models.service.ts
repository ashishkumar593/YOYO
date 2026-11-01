import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ModelListResponse, ModelObject } from '../../common/types/openai.types';
import { ModelCategory } from '@prisma/client';

export interface CreateModelInput {
  apiIdentifier: string;
  name: string;
  providerFamily: string;
  category?: ModelCategory;
  description?: string;
  license?: string;
  defaultContextWindow?: number;
  inputCostPerMillion?: number;
  outputCostPerMillion?: number;
  quantizationLevel?: string;
  parameterSize?: number;
  vramRequiredBytes?: number;
}

export interface UpdateModelInput {
  name?: string;
  providerFamily?: string;
  category?: ModelCategory;
  description?: string;
  license?: string;
  defaultContextWindow?: number;
  isActive?: boolean;
  isPublic?: boolean;
  inputCostPerMillion?: number;
  outputCostPerMillion?: number;
}

@Injectable()
export class ModelsService {
  constructor(private prisma: PrismaService) {}

  async listOpenAiModels(): Promise<ModelListResponse> {
    const models = await this.prisma.model.findMany({
      where: { isActive: true, isPublic: true },
      select: {
        apiIdentifier: true,
        createdAt: true,
        providerFamily: true,
      },
    });

    const data: ModelObject[] = models.map((m) => ({
      id: m.apiIdentifier,
      object: 'model',
      created: Math.floor(m.createdAt.getTime() / 1000),
      owned_by: m.providerFamily.toLowerCase().replace(/\s+/g, '-'),
      permission: [],
      root: m.apiIdentifier,
      parent: null,
    }));

    return {
      object: 'list',
      data,
    };
  }

  async getOpenAiModel(modelId: string): Promise<ModelObject> {
    const model = await this.prisma.model.findUnique({
      where: { apiIdentifier: modelId },
    });

    if (!model || !model.isActive) {
      throw new NotFoundException(`Model '${modelId}' does not exist or is currently inactive.`);
    }

    return {
      id: model.apiIdentifier,
      object: 'model',
      created: Math.floor(model.createdAt.getTime() / 1000),
      owned_by: model.providerFamily.toLowerCase(),
      permission: [],
      root: model.apiIdentifier,
      parent: null,
    };
  }

  async listCatalog(includeInactive = false) {
    const whereClause = includeInactive ? {} : { isActive: true };

    const [models, pricings] = await Promise.all([
      this.prisma.model.findMany({
        where: whereClause,
        include: {
          versions: true,
          deployments: {
            include: { worker: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.modelPricing.findMany(),
    ]);

    const pricingMap = new Map<string, { input: number; output: number }>();
    for (const p of pricings) {
      pricingMap.set(p.modelIdentifier, {
        input: Number(p.inputCostPerMillion),
        output: Number(p.outputCostPerMillion),
      });
    }

    return models.map((m) => {
      const pricing = pricingMap.get(m.apiIdentifier) || { input: 0.2, output: 0.4 };
      return {
        id: m.id,
        apiIdentifier: m.apiIdentifier,
        name: m.name,
        providerFamily: m.providerFamily,
        category: m.category,
        description: m.description,
        license: m.license,
        isActive: m.isActive,
        isPublic: m.isPublic,
        defaultContextWindow: m.defaultContextWindow,
        pricing: {
          inputCostPerMillion: pricing.input,
          outputCostPerMillion: pricing.output,
        },
        versions: m.versions.map((v) => ({
          tag: v.tag,
          quantizationLevel: v.quantizationLevel,
          parameterSize: Number(v.parameterSize),
          vramRequiredBytes: Number(v.vramRequiredBytes),
        })),
        isLoaded: m.deployments.some((d) => d.state === 'LOADED'),
      };
    });
  }

  async createModel(dto: CreateModelInput) {
    const existing = await this.prisma.model.findUnique({
      where: { apiIdentifier: dto.apiIdentifier },
    });

    if (existing) {
      throw new BadRequestException(`Model with identifier '${dto.apiIdentifier}' already exists.`);
    }

    const defaultContextWindow = dto.defaultContextWindow || 131072;
    const category = dto.category || ModelCategory.GENERAL;

    return this.prisma.$transaction(async (tx) => {
      const model = await tx.model.create({
        data: {
          apiIdentifier: dto.apiIdentifier,
          name: dto.name,
          providerFamily: dto.providerFamily,
          category,
          description: dto.description || '',
          license: dto.license || 'Open Weights / Commercial Permissive',
          defaultContextWindow,
          isActive: true,
          isPublic: true,
          versions: {
            create: {
              tag: `${dto.apiIdentifier}-v1`,
              quantizationLevel: dto.quantizationLevel || 'FP16',
              parameterSize: dto.parameterSize ? BigInt(dto.parameterSize) : BigInt(8000000000),
              diskSizeBytes: BigInt(16000000000),
              vramRequiredBytes: dto.vramRequiredBytes
                ? BigInt(dto.vramRequiredBytes)
                : BigInt(18000000000),
            },
          },
        },
      });

      // Register or update pricing record
      await tx.modelPricing.upsert({
        where: { modelIdentifier: dto.apiIdentifier },
        update: {
          inputCostPerMillion: dto.inputCostPerMillion ?? 0.2,
          outputCostPerMillion: dto.outputCostPerMillion ?? 0.4,
        },
        create: {
          modelIdentifier: dto.apiIdentifier,
          inputCostPerMillion: dto.inputCostPerMillion ?? 0.2,
          outputCostPerMillion: dto.outputCostPerMillion ?? 0.4,
        },
      });

      return model;
    });
  }

  async updateModel(id: string, dto: UpdateModelInput) {
    const model = await this.prisma.model.findUnique({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Model with ID '${id}' not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.model.update({
        where: { id },
        data: {
          name: dto.name,
          providerFamily: dto.providerFamily,
          category: dto.category,
          description: dto.description,
          license: dto.license,
          defaultContextWindow: dto.defaultContextWindow,
          isActive: dto.isActive,
          isPublic: dto.isPublic,
        },
      });

      if (dto.inputCostPerMillion !== undefined || dto.outputCostPerMillion !== undefined) {
        await tx.modelPricing.upsert({
          where: { modelIdentifier: model.apiIdentifier },
          update: {
            inputCostPerMillion: dto.inputCostPerMillion ?? 0.2,
            outputCostPerMillion: dto.outputCostPerMillion ?? 0.4,
          },
          create: {
            modelIdentifier: model.apiIdentifier,
            inputCostPerMillion: dto.inputCostPerMillion ?? 0.2,
            outputCostPerMillion: dto.outputCostPerMillion ?? 0.4,
          },
        });
      }

      return updated;
    });
  }

  async deleteModel(id: string) {
    const model = await this.prisma.model.findUnique({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Model with ID '${id}' not found.`);
    }

    // Soft delete / deactivate to maintain audit and past inference references
    return this.prisma.model.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findActiveWorkerForModel(apiIdentifier: string) {
    const deployments = await this.findActiveWorkersForModel(apiIdentifier);
    return deployments.length > 0 ? deployments[0] : null;
  }

  async findActiveWorkersForModel(apiIdentifier: string) {
    return this.prisma.modelDeployment.findMany({
      where: {
        model: { apiIdentifier, isActive: true },
        state: 'LOADED',
        worker: { status: 'ONLINE' },
      },
      include: {
        worker: true,
        model: true,
      },
      orderBy: { activeConcurrency: 'asc' }, // Route to least busy worker (least-connections)
    });
  }

  async incrementConcurrency(deploymentId: string) {
    try {
      await this.prisma.modelDeployment.update({
        where: { id: deploymentId },
        data: { activeConcurrency: { increment: 1 } },
      });
    } catch {}
  }

  async decrementConcurrency(deploymentId: string) {
    try {
      const dep = await this.prisma.modelDeployment.findUnique({
        where: { id: deploymentId },
        select: { activeConcurrency: true },
      });
      if (dep && dep.activeConcurrency > 0) {
        await this.prisma.modelDeployment.update({
          where: { id: deploymentId },
          data: { activeConcurrency: { decrement: 1 } },
        });
      }
    } catch {}
  }
}




import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ModelListResponse, ModelObject } from '../../common/types/openai.types';

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

  async listCatalog() {
    const models = await this.prisma.model.findMany({
      where: { isActive: true },
      include: {
        versions: true,
        deployments: {
          include: { worker: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return models.map((m) => ({
      id: m.id,
      apiIdentifier: m.apiIdentifier,
      name: m.name,
      providerFamily: m.providerFamily,
      category: m.category,
      description: m.description,
      license: m.license,
      defaultContextWindow: m.defaultContextWindow,
      versions: m.versions.map((v) => ({
        tag: v.tag,
        quantizationLevel: v.quantizationLevel,
        parameterSize: Number(v.parameterSize),
        vramRequiredBytes: Number(v.vramRequiredBytes),
      })),
      isLoaded: m.deployments.some((d) => d.state === 'LOADED'),
    }));
  }

  async findActiveWorkerForModel(apiIdentifier: string) {
    const deployment = await this.prisma.modelDeployment.findFirst({
      where: {
        model: { apiIdentifier, isActive: true },
        state: 'LOADED',
        worker: { status: 'ONLINE' },
      },
      include: {
        worker: true,
        model: true,
      },
      orderBy: { activeConcurrency: 'asc' }, // Route to least busy worker
    });

    return deployment;
  }
}


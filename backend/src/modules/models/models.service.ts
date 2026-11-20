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
    const [models, adapters] = await Promise.all([
      this.prisma.model.findMany({
        where: { isActive: true, isPublic: true },
        select: {
          apiIdentifier: true,
          createdAt: true,
          providerFamily: true,
        },
      }),
      ((this.prisma as any).modelAdapter?.findMany?.({
        where: { isActive: true },
        include: { baseModel: true },
      }) as Promise<any[]>) || Promise.resolve([]),
    ]);

    const data: ModelObject[] = models.map((m) => ({
      id: m.apiIdentifier,
      object: 'model',
      created: Math.floor(m.createdAt.getTime() / 1000),
      owned_by: m.providerFamily.toLowerCase().replace(/\s+/g, '-'),
      permission: [],
      root: m.apiIdentifier,
      parent: null,
    }));

    if (adapters && Array.isArray(adapters)) {
      for (const a of adapters) {
        data.push({
          id: a.apiIdentifier,
          object: 'model',
          created: Math.floor(new Date(a.createdAt).getTime() / 1000),
          owned_by: 'custom-lora-adapter',
          permission: [],
          root: a.baseModel?.apiIdentifier || a.apiIdentifier,
          parent: a.baseModel?.apiIdentifier || null,
        });
      }
    }

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
      const adapter = await (this.prisma as any).modelAdapter?.findUnique?.({
        where: { apiIdentifier: modelId },
        include: { baseModel: true },
      });

      if (adapter && adapter.isActive) {
        return {
          id: adapter.apiIdentifier,
          object: 'model',
          created: Math.floor(new Date(adapter.createdAt).getTime() / 1000),
          owned_by: 'custom-lora-adapter',
          permission: [],
          root: adapter.baseModel?.apiIdentifier || adapter.apiIdentifier,
          parent: adapter.baseModel?.apiIdentifier || null,
        };
      }

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

  getOllamaUrl(): string {
    return process.env.OLLAMA_WORKER_0_URL || 'http://localhost:11434';
  }

  async getLocalOllamaStatus() {
    const baseUrl = this.getOllamaUrl().replace(/\/$/, '');
    try {
      const [tagsRes, psRes] = await Promise.all([
        fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) }),
        fetch(`${baseUrl}/api/ps`, { signal: AbortSignal.timeout(3000) }).catch(() => null),
      ]);

      if (!tagsRes.ok) {
        return {
          online: false,
          endpoint: baseUrl,
          error: `Ollama returned HTTP ${tagsRes.status}`,
          installedModels: [],
          runningModels: [],
        };
      }

      const tagsData: any = await tagsRes.json();
      const psData: any = psRes && psRes.ok ? await psRes.json() : { models: [] };

      const installedModels = (tagsData.models || []).map((m: any) => ({
        name: m.name,
        sizeBytes: m.size,
        sizeMb: Math.round((m.size || 0) / (1024 * 1024)),
        digest: m.digest ? m.digest.substring(0, 12) : null,
        modifiedAt: m.modified_at,
        family: m.details?.family,
        parameterSize: m.details?.parameter_size,
        quantizationLevel: m.details?.quantization_level,
      }));

      const runningModels = (psData.models || []).map((m: any) => ({
        name: m.name,
        sizeBytes: m.size,
        sizeMb: Math.round((m.size || 0) / (1024 * 1024)),
        sizeVramBytes: m.size_vram,
        expiresAt: m.expires_at,
        parameterSize: m.details?.parameter_size,
        contextLength: m.context_length,
      }));

      return {
        online: true,
        endpoint: baseUrl,
        totalModels: installedModels.length,
        installedModels,
        runningModels,
      };
    } catch (err: any) {
      return {
        online: false,
        endpoint: baseUrl,
        error: err.message || 'Connection refused',
        installedModels: [],
        runningModels: [],
      };
    }
  }

  async pullLocalModel(
    modelTag: string,
    onProgress: (progress: { status: string; percent?: number; total?: number; completed?: number }) => void
  ) {
    const baseUrl = this.getOllamaUrl().replace(/\/$/, '');
    const cleanTag = modelTag.trim();
    if (!cleanTag) throw new BadRequestException('Model tag cannot be empty');

    const res = await fetch(`${baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanTag, stream: true }),
    });

    if (!res.ok || !res.body) {
      throw new BadRequestException(`Failed to initiate pull for ${cleanTag}: HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed);
            const percent = data.total && data.completed ? Math.round((data.completed / data.total) * 100) : undefined;
            onProgress({
              status: data.status || 'downloading',
              percent,
              total: data.total,
              completed: data.completed,
            });
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Auto-upsert into platform catalog
    try {
      const family = cleanTag.includes('qwen') ? 'Alibaba Cloud' : cleanTag.includes('deepseek') ? 'DeepSeek' : 'Meta';
      const category: ModelCategory = cleanTag.includes('coder')
        ? ModelCategory.CODING
        : cleanTag.includes('r1')
        ? ModelCategory.REASONING
        : cleanTag.includes('embed')
        ? ModelCategory.EMBEDDING
        : ModelCategory.GENERAL;

      await this.prisma.model.upsert({
        where: { apiIdentifier: cleanTag },
        create: {
          apiIdentifier: cleanTag,
          name: cleanTag,
          providerFamily: family,
          category,
          isActive: true,
          isPublic: true,
          defaultContextWindow: 4096,
        },
        update: {
          isActive: true,
          isPublic: true,
        },
      });
    } catch (e) {
      // Non-fatal if DB catalog upsert already exists
    }

    return { success: true, model: cleanTag };
  }

  async deleteLocalModel(modelTag: string) {
    const baseUrl = this.getOllamaUrl().replace(/\/$/, '');
    const cleanTag = modelTag.trim();
    if (!cleanTag) throw new BadRequestException('Model tag cannot be empty');

    const res = await fetch(`${baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanTag }),
    });

    if (!res.ok) {
      throw new BadRequestException(`Failed to delete model ${cleanTag}: HTTP ${res.status}`);
    }

    // Mark as inactive in DB catalog if exists
    try {
      await this.prisma.model.updateMany({
        where: { apiIdentifier: cleanTag },
        data: { isActive: false },
      });
    } catch {}

    return { success: true, model: cleanTag };
  }
}




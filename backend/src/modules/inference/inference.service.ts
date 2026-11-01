import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ModelsService } from '../models/models.service';
import { OllamaProvider } from './providers/ollama.provider';
import { VllmProvider } from './providers/vllm.provider';
import { MockProvider } from './providers/mock.provider';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../../common/types/openai.types';
import { InferenceProviderInterface } from '../../common/types/provider.interface';
import { PrismaService } from '../../database/prisma.service';
import { estimateMessagesTokens } from '../../common/utils/token-estimator';
import { EngineType } from '@prisma/client';

export interface ExecutionCandidate {
  provider: InferenceProviderInterface;
  endpoint: string;
  deploymentId?: string;
  workerName: string;
}

@Injectable()
export class InferenceService {
  private readonly logger = new Logger(InferenceService.name);

  constructor(
    private modelsService: ModelsService,
    private ollamaProvider: OllamaProvider,
    private vllmProvider: VllmProvider,
    private mockProvider: MockProvider,
    private prisma: PrismaService
  ) {}

  async chatCompletion(
    request: ChatCompletionRequest,
    userContext?: { id: string; role?: string },
    apiKeyContext?: { keyId: string; allowedModels?: string[] }
  ): Promise<ChatCompletionResponse> {
    const { candidates, model } = await this.resolveCandidates(
      request.model,
      apiKeyContext?.allowedModels
    );

    const promptTokens = estimateMessagesTokens(request.messages);
    if (promptTokens > model.defaultContextWindow) {
      throw new BadRequestException(
        `Prompt tokens (${promptTokens}) exceed model max context window (${model.defaultContextWindow}).`
      );
    }

    let lastError: any = null;

    // Failover loop across available least-concurrency cloud workers
    for (const candidate of candidates) {
      if (candidate.deploymentId) {
        await this.modelsService.incrementConcurrency(candidate.deploymentId);
      }

      const startTime = Date.now();
      try {
        const result = await candidate.provider.chatCompletion(candidate.endpoint, request);
        const latencyMs = Date.now() - startTime;

        this.recordTelemetry({
          userId: userContext?.id,
          apiKeyId: apiKeyContext?.keyId,
          modelId: model.id,
          endpoint: '/v1/chat/completions',
          statusCode: 200,
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
          latencyMs,
        }).catch(() => {});

        return result;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(
          `Cloud worker ${candidate.workerName} failed for '${request.model}': ${err.message}. Routing to next node...`
        );
      } finally {
        if (candidate.deploymentId) {
          await this.modelsService.decrementConcurrency(candidate.deploymentId);
        }
      }
    }

    throw new ServiceUnavailableException(
      `Inference failed across all available workers for model '${request.model}': ${lastError?.message || 'Workers unreachable'}`
    );
  }

  async *chatCompletionStream(
    request: ChatCompletionRequest,
    abortSignal?: AbortSignal,
    userContext?: { id: string; role?: string },
    apiKeyContext?: { keyId: string; allowedModels?: string[] }
  ): AsyncIterable<ChatCompletionChunk> {
    const { candidates, model } = await this.resolveCandidates(
      request.model,
      apiKeyContext?.allowedModels
    );

    const candidate = candidates[0];
    if (!candidate) {
      throw new ServiceUnavailableException(
        `No available cloud workers found for '${request.model}'.`
      );
    }

    if (candidate.deploymentId) {
      await this.modelsService.incrementConcurrency(candidate.deploymentId);
    }

    const startTime = Date.now();
    let promptTokens = 0;
    let completionTokens = 0;
    let accumulatedContent = '';

    try {
      for await (const chunk of candidate.provider.chatCompletionStream(
        candidate.endpoint,
        request,
        abortSignal
      )) {
        if (chunk.choices?.[0]?.delta?.content) {
          accumulatedContent += chunk.choices[0].delta.content;
        }
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens;
          completionTokens = chunk.usage.completion_tokens;
        }
        yield chunk;
      }
    } finally {
      if (candidate.deploymentId) {
        await this.modelsService.decrementConcurrency(candidate.deploymentId);
      }

      if (promptTokens === 0) {
        promptTokens = estimateMessagesTokens(request.messages);
      }
      if (completionTokens === 0 && accumulatedContent.length > 0) {
        completionTokens = Math.max(1, Math.ceil(accumulatedContent.length / 4));
      }

      const latencyMs = Date.now() - startTime;
      this.recordTelemetry({
        userId: userContext?.id,
        apiKeyId: apiKeyContext?.keyId,
        modelId: model.id,
        endpoint: '/v1/chat/completions',
        statusCode: 200,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs,
      }).catch(() => {});
    }
  }

  async embeddings(
    request: EmbeddingRequest,
    userContext?: { id: string; role?: string },
    apiKeyContext?: { keyId: string; allowedModels?: string[] }
  ): Promise<EmbeddingResponse> {
    const { candidates, model } = await this.resolveCandidates(
      request.model,
      apiKeyContext?.allowedModels
    );

    let lastError: any = null;

    for (const candidate of candidates) {
      if (candidate.deploymentId) {
        await this.modelsService.incrementConcurrency(candidate.deploymentId);
      }

      const startTime = Date.now();
      try {
        const result = await candidate.provider.embeddings(candidate.endpoint, request);
        const latencyMs = Date.now() - startTime;

        this.recordTelemetry({
          userId: userContext?.id,
          apiKeyId: apiKeyContext?.keyId,
          modelId: model.id,
          endpoint: '/v1/embeddings',
          statusCode: 200,
          promptTokens: result.usage.prompt_tokens,
          completionTokens: 0,
          totalTokens: result.usage.total_tokens,
          latencyMs,
        }).catch(() => {});

        return result;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Embeddings failed on worker ${candidate.workerName}: ${err.message}`);
      } finally {
        if (candidate.deploymentId) {
          await this.modelsService.decrementConcurrency(candidate.deploymentId);
        }
      }
    }

    throw new ServiceUnavailableException(
      `Embedding generation failed across available nodes: ${lastError?.message || 'Workers unreachable'}`
    );
  }

  private async resolveCandidates(
    modelName: string,
    allowedModels?: string[]
  ): Promise<{ candidates: ExecutionCandidate[]; model: any }> {
    // 1. Check API Key model scoping
    if (allowedModels && !allowedModels.includes('*') && !allowedModels.includes(modelName)) {
      throw new ForbiddenException(`Your API key is not permitted to access model '${modelName}'.`);
    }

    // 2. Resolve model in DB
    const model = await this.prisma.model.findUnique({
      where: { apiIdentifier: modelName },
    });

    if (!model || !model.isActive) {
      throw new NotFoundException(`Model '${modelName}' is not available or has been disabled.`);
    }

    // 3. Fallback to mock provider if configured
    const useMock = process.env.FEATURE_MOCK_INFERENCE === 'true';
    if (useMock) {
      return {
        candidates: [
          {
            provider: this.mockProvider,
            endpoint: 'http://localhost:11434',
            workerName: 'mock-cluster-node',
          },
        ],
        model,
      };
    }

    // 4. Query all active workers hosting this model, sorted by active concurrency (least-connections)
    const deployments = await this.modelsService.findActiveWorkersForModel(modelName);

    if (deployments.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `No active GPU worker found for '${modelName}'. Using developer mock fallback.`
        );
        return {
          candidates: [
            {
              provider: this.mockProvider,
              endpoint: 'http://localhost:11434',
              workerName: 'dev-fallback-node',
            },
          ],
          model,
        };
      }
      throw new ServiceUnavailableException(
        `All inference workers hosting model '${modelName}' are currently offline or busy. Please retry shortly.`
      );
    }

    const candidates: ExecutionCandidate[] = deployments.map((d) => {
      let provider: InferenceProviderInterface;
      if (d.worker.engineType === EngineType.VLLM || d.worker.engineType === EngineType.SGLANG) {
        provider = this.vllmProvider;
      } else {
        provider = this.ollamaProvider;
      }

      return {
        provider,
        endpoint: d.worker.endpointUrl,
        deploymentId: d.id,
        workerName: d.worker.workerName,
      };
    });

    return { candidates, model };
  }

  private async recordTelemetry(data: {
    userId?: string;
    apiKeyId?: string;
    modelId?: string;
    endpoint: string;
    statusCode: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
  }) {
    if (!data.userId) return;

    try {
      await this.prisma.apiRequest.create({
        data: {
          userId: data.userId,
          apiKeyId: data.apiKeyId,
          modelId: data.modelId,
          endpoint: data.endpoint,
          statusCode: data.statusCode,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          totalTokens: data.totalTokens,
          latencyMs: data.latencyMs,
          usageRecord: {
            create: {
              userId: data.userId,
              apiKeyId: data.apiKeyId,
              modelId: data.modelId,
              promptTokens: data.promptTokens,
              completionTokens: data.completionTokens,
              totalTokens: data.totalTokens,
              periodDate: new Date(),
            },
          },
        },
      });

      // Update user monthly token usage
      await this.prisma.userQuota.updateMany({
        where: { userId: data.userId },
        data: {
          currentMonthTokensUsed: { increment: BigInt(data.totalTokens) },
          currentMonthRequestsUsed: { increment: 1 },
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record telemetry: ${err.message}`);
    }
  }
}

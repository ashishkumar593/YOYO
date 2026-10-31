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
import { MockProvider } from './providers/mock.provider';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../../common/types/openai.types';
import { PrismaService } from '../../database/prisma.service';
import { estimateMessagesTokens } from '../../common/utils/token-estimator';

@Injectable()
export class InferenceService {
  private readonly logger = new Logger(InferenceService.name);

  constructor(
    private modelsService: ModelsService,
    private ollamaProvider: OllamaProvider,
    private mockProvider: MockProvider,
    private prisma: PrismaService
  ) {}

  async chatCompletion(
    request: ChatCompletionRequest,
    userContext?: { id: string; role?: string },
    apiKeyContext?: { keyId: string; allowedModels?: string[] }
  ): Promise<ChatCompletionResponse> {
    const { provider, endpoint, model } = await this.resolveExecution(
      request.model,
      apiKeyContext?.allowedModels
    );

    const promptTokens = estimateMessagesTokens(request.messages);
    if (promptTokens > model.defaultContextWindow) {
      throw new BadRequestException(
        `Prompt tokens (${promptTokens}) exceed model max context window (${model.defaultContextWindow}).`
      );
    }

    const startTime = Date.now();
    const result = await provider.chatCompletion(endpoint, request);
    const latencyMs = Date.now() - startTime;

    // Async record telemetry (non-blocking)
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
  }

  async *chatCompletionStream(
    request: ChatCompletionRequest,
    abortSignal?: AbortSignal,
    userContext?: { id: string; role?: string },
    apiKeyContext?: { keyId: string; allowedModels?: string[] }
  ): AsyncIterable<ChatCompletionChunk> {
    const { provider, endpoint, model } = await this.resolveExecution(
      request.model,
      apiKeyContext?.allowedModels
    );

    const startTime = Date.now();
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of provider.chatCompletionStream(endpoint, request, abortSignal)) {
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens;
        completionTokens = chunk.usage.completion_tokens;
      }
      yield chunk;
    }

    const latencyMs = Date.now() - startTime;

    // Async record telemetry
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

  async embeddings(
    request: EmbeddingRequest,
    userContext?: { id: string; role?: string },
    apiKeyContext?: { keyId: string; allowedModels?: string[] }
  ): Promise<EmbeddingResponse> {
    const { provider, endpoint, model } = await this.resolveExecution(
      request.model,
      apiKeyContext?.allowedModels
    );

    const startTime = Date.now();
    const result = await provider.embeddings(endpoint, request);
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
  }

  private async resolveExecution(modelName: string, allowedModels?: string[]) {
    // 1. Check API Key model restrictions
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

    // 3. Fallback to mock provider if FEATURE_MOCK_INFERENCE is active or in test mode
    const useMock = process.env.FEATURE_MOCK_INFERENCE === 'true';
    if (useMock) {
      return {
        provider: this.mockProvider,
        endpoint: 'http://localhost:11434',
        model,
      };
    }

    // 4. Find active worker
    const deployment = await this.modelsService.findActiveWorkerForModel(modelName);
    if (!deployment) {
      // If no live worker found, fallback gracefully to mock provider in dev
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`No online GPU worker found for '${modelName}'. Using mock provider fallback.`);
        return {
          provider: this.mockProvider,
          endpoint: 'http://localhost:11434',
          model,
        };
      }
      throw new ServiceUnavailableException(
        `All inference workers hosting model '${modelName}' are currently offline or busy. Please retry shortly.`
      );
    }

    return {
      provider: this.ollamaProvider,
      endpoint: deployment.worker.endpointUrl,
      model,
    };
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


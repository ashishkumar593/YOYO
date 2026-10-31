import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  EmbeddingRequest,
  EmbeddingResponse,
} from './openai.types';
import { WorkerEngineType } from './models.types';

export interface WorkerHealthStatus {
  isHealthy: boolean;
  engine: WorkerEngineType;
  vramUsedBytes?: number;
  vramTotalBytes?: number;
  activeModels?: string[];
  latencyMs?: number;
}

export interface ModelPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percent?: number;
}

export interface InferenceProviderInterface {
  readonly engineType: WorkerEngineType;

  chatCompletion(
    workerEndpoint: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse>;

  chatCompletionStream(
    workerEndpoint: string,
    request: ChatCompletionRequest,
    abortSignal?: AbortSignal
  ): AsyncIterable<ChatCompletionChunk>;

  embeddings(
    workerEndpoint: string,
    request: EmbeddingRequest
  ): Promise<EmbeddingResponse>;

  checkHealth(workerEndpoint: string): Promise<WorkerHealthStatus>;

  pullModel(
    workerEndpoint: string,
    modelTag: string,
    abortSignal?: AbortSignal
  ): AsyncIterable<ModelPullProgress>;

  unloadModel(workerEndpoint: string, modelTag: string): Promise<void>;
}


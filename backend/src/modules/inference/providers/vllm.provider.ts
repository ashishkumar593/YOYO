import { Injectable, Logger } from '@nestjs/common';
import {
  InferenceProviderInterface,
  WorkerHealthStatus,
  ModelPullProgress,
} from '../../../common/types/provider.interface';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../../../common/types/openai.types';

@Injectable()
export class VllmProvider implements InferenceProviderInterface {
  readonly engineType = 'VLLM';
  private readonly logger = new Logger(VllmProvider.name);

  async chatCompletion(
    workerEndpoint: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const url = `${workerEndpoint.replace(/\/$/, '')}/v1/chat/completions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`vLLM worker responded with status ${res.status}: ${errText}`);
    }

    return (await res.json()) as ChatCompletionResponse;
  }

  async *chatCompletionStream(
    workerEndpoint: string,
    request: ChatCompletionRequest,
    abortSignal?: AbortSignal
  ): AsyncIterable<ChatCompletionChunk> {
    const url = `${workerEndpoint.replace(/\/$/, '')}/v1/chat/completions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
      signal: abortSignal,
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`vLLM stream error (${res.status}): ${errText}`);
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
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') return;

          try {
            const parsed = JSON.parse(dataStr);
            yield parsed as ChatCompletionChunk;
          } catch {
            continue;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embeddings(
    workerEndpoint: string,
    request: EmbeddingRequest
  ): Promise<EmbeddingResponse> {
    const url = `${workerEndpoint.replace(/\/$/, '')}/v1/embeddings`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`vLLM embeddings error (${res.status}): ${errText}`);
    }

    return (await res.json()) as EmbeddingResponse;
  }

  async checkHealth(workerEndpoint: string): Promise<WorkerHealthStatus> {
    const start = Date.now();
    const ep = workerEndpoint.replace(/\/$/, '');

    try {
      // 1. Try /health
      const healthRes = await fetch(`${ep}/health`, {
        signal: AbortSignal.timeout(3000),
      });

      if (healthRes.ok) {
        // Query loaded models
        let activeModels: string[] = [];
        try {
          const modelsRes = await fetch(`${ep}/v1/models`, {
            signal: AbortSignal.timeout(3000),
          });
          if (modelsRes.ok) {
            const data: any = await modelsRes.json();
            activeModels = (data.data || []).map((m: any) => m.id);
          }
        } catch {}

        return {
          isHealthy: true,
          engine: 'VLLM',
          latencyMs: Date.now() - start,
          activeModels,
        };
      }
    } catch {}

    // 2. Fallback to /v1/models
    try {
      const modelsRes = await fetch(`${ep}/v1/models`, {
        signal: AbortSignal.timeout(3000),
      });
      if (modelsRes.ok) {
        const data: any = await modelsRes.json();
        return {
          isHealthy: true,
          engine: 'VLLM',
          latencyMs: Date.now() - start,
          activeModels: (data.data || []).map((m: any) => m.id),
        };
      }
    } catch {}

    return {
      isHealthy: false,
      engine: 'VLLM',
      latencyMs: Date.now() - start,
    };
  }

  async *pullModel(
    _workerEndpoint: string,
    _modelTag: string,
    _abortSignal?: AbortSignal
  ): AsyncIterable<ModelPullProgress> {
    // In vLLM, weights are pre-loaded or mounted via S3 / shared NFS / HuggingFace cache
    yield { status: 'Pre-warming weights on cloud GPU tensor pool', percent: 100 };
  }

  async unloadModel(_workerEndpoint: string, _modelTag: string): Promise<void> {
    // No-op for persistent vLLM continuous batching processes
  }
}


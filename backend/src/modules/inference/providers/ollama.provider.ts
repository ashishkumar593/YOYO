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
import { estimateMessagesTokens, estimateTokens } from '../../../common/utils/token-estimator';

@Injectable()
export class OllamaProvider implements InferenceProviderInterface {
  readonly engineType = 'OLLAMA';
  private readonly logger = new Logger(OllamaProvider.name);

  async chatCompletion(
    workerEndpoint: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const url = `${workerEndpoint.replace(/\/$/, '')}/api/chat`;

    let format: any = undefined;
    if (request.response_format?.type === 'json_object') {
      format = 'json';
    } else if (request.response_format?.type === 'json_schema') {
      format = request.response_format.json_schema?.schema || 'json';
    }

    // Map OpenAI request to Ollama format
    const ollamaPayload: any = {
      model: request.model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      format,
      tools: request.tools,
      options: {
        temperature: request.temperature ?? 0.7,
        top_p: request.top_p ?? 0.9,
        num_predict: request.max_tokens ?? 2048,
        stop: request.stop ? (Array.isArray(request.stop) ? request.stop : [request.stop]) : undefined,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama worker responded with status ${res.status}: ${errText}`);
    }

    const data: any = await res.json();
    const promptTokens = data.prompt_eval_count || estimateMessagesTokens(request.messages);
    const completionTokens = data.eval_count || estimateTokens(data.message?.content || '');

    const hasToolCalls = Array.isArray(data.message?.tool_calls) && data.message.tool_calls.length > 0;
    const toolCalls = hasToolCalls
      ? data.message.tool_calls.map((tc: any, idx: number) => ({
          id: tc.id || `call_${Date.now()}_${idx}`,
          type: 'function',
          function: {
            name: tc.function?.name,
            arguments:
              typeof tc.function?.arguments === 'string'
                ? tc.function.arguments
                : JSON.stringify(tc.function?.arguments || {}),
          },
        }))
      : undefined;

    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: data.message?.content ?? null,
            tool_calls: toolCalls,
          },
          finish_reason: hasToolCalls ? 'tool_calls' : 'stop',
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }

  async *chatCompletionStream(
    workerEndpoint: string,
    request: ChatCompletionRequest,
    abortSignal?: AbortSignal
  ): AsyncIterable<ChatCompletionChunk> {
    const url = `${workerEndpoint.replace(/\/$/, '')}/api/chat`;
    const id = `chatcmpl-${Date.now()}`;

    let format: any = undefined;
    if (request.response_format?.type === 'json_object') {
      format = 'json';
    } else if (request.response_format?.type === 'json_schema') {
      format = request.response_format.json_schema?.schema || 'json';
    }

    const ollamaPayload: any = {
      model: request.model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      format,
      tools: request.tools,
      options: {
        temperature: request.temperature ?? 0.7,
        top_p: request.top_p ?? 0.9,
        num_predict: request.max_tokens ?? 2048,
        stop: request.stop ? (Array.isArray(request.stop) ? request.stop : [request.stop]) : undefined,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaPayload),
      signal: abortSignal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama worker stream failed: ${errText}`);
    }

    if (!res.body) {
      throw new Error('Ollama response body is empty');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let isFirstChunk = true;
    let hasToolCalls = false;
    let finalPromptTokens = 0;
    let finalCompletionTokens = 0;

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
            const parsed = JSON.parse(trimmed);

            if (parsed.message?.content) {
              yield {
                id,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: request.model,
                choices: [
                  {
                    index: 0,
                    delta: {
                      role: isFirstChunk ? 'assistant' : undefined,
                      content: parsed.message.content,
                    },
                    finish_reason: null,
                  },
                ],
              };
              isFirstChunk = false;
            }

            if (parsed.message?.tool_calls?.length) {
              hasToolCalls = true;
              yield {
                id,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: request.model,
                choices: [
                  {
                    index: 0,
                    delta: {
                      role: isFirstChunk ? 'assistant' : undefined,
                      tool_calls: parsed.message.tool_calls.map((tc: any, idx: number) => ({
                        index: idx,
                        id: tc.id || `call_${Date.now()}_${idx}`,
                        type: 'function',
                        function: {
                          name: tc.function?.name,
                          arguments:
                            typeof tc.function?.arguments === 'string'
                              ? tc.function.arguments
                              : JSON.stringify(tc.function?.arguments || {}),
                        },
                      })),
                    },
                    finish_reason: null,
                  },
                ],
              };
              isFirstChunk = false;
            }

            if (parsed.done) {
              finalPromptTokens = parsed.prompt_eval_count || 0;
              finalCompletionTokens = parsed.eval_count || 0;
            }
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Emit final finish chunk
    yield {
      id,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: hasToolCalls ? 'tool_calls' : 'stop',
        },
      ],
      usage: {
        prompt_tokens: finalPromptTokens || estimateMessagesTokens(request.messages),
        completion_tokens: finalCompletionTokens || 10,
        total_tokens: (finalPromptTokens || estimateMessagesTokens(request.messages)) + (finalCompletionTokens || 10),
      },
    };
  }

  async embeddings(
    workerEndpoint: string,
    request: EmbeddingRequest
  ): Promise<EmbeddingResponse> {
    const url = `${workerEndpoint.replace(/\/$/, '')}/api/embeddings`;
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    const data: any[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: request.model, prompt: inputs[i] }),
      });

      if (!res.ok) {
        throw new Error(`Ollama embedding error for input ${i}: ${await res.text()}`);
      }

      const resJson: any = await res.json();
      data.push({
        object: 'embedding',
        index: i,
        embedding: resJson.embedding,
      });
    }

    return {
      object: 'list',
      data,
      model: request.model,
      usage: {
        prompt_tokens: inputs.reduce((acc, t) => acc + estimateTokens(t), 0),
        total_tokens: inputs.reduce((acc, t) => acc + estimateTokens(t), 0),
      },
    };
  }

  async checkHealth(workerEndpoint: string): Promise<WorkerHealthStatus> {
    try {
      const res = await fetch(`${workerEndpoint.replace(/\/$/, '')}/api/version`, {
        signal: AbortSignal.timeout(3000),
      });
      return {
        isHealthy: res.ok,
        engine: 'OLLAMA',
      };
    } catch {
      return {
        isHealthy: false,
        engine: 'OLLAMA',
      };
    }
  }

  async *pullModel(
    workerEndpoint: string,
    modelTag: string,
    abortSignal?: AbortSignal
  ): AsyncIterable<ModelPullProgress> {
    const url = `${workerEndpoint.replace(/\/$/, '')}/api/pull`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelTag, stream: true }),
      signal: abortSignal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Failed to pull model ${modelTag} from Ollama: ${await res.text()}`);
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
            const parsed = JSON.parse(trimmed);
            yield {
              status: parsed.status,
              digest: parsed.digest,
              total: parsed.total,
              completed: parsed.completed,
              percent: parsed.total ? Math.round((parsed.completed / parsed.total) * 100) : undefined,
            };
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async unloadModel(workerEndpoint: string, modelTag: string): Promise<void> {
    const url = `${workerEndpoint.replace(/\/$/, '')}/api/generate`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelTag, keep_alive: 0 }),
    });
  }
}


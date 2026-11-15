import { Injectable } from '@nestjs/common';
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
export class MockProvider implements InferenceProviderInterface {
  readonly engineType = 'OLLAMA';

  async chatCompletion(
    workerEndpoint: string,
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const promptTokens = estimateMessagesTokens(request.messages);

    // 1. Simulate tool calls when tools parameter is provided
    if (request.tools && request.tools.length > 0 && request.tool_choice !== 'none') {
      const selectedTool = request.tools[0]?.function?.name || 'execute_tool';
      const toolCallId = `call_${Math.random().toString(36).substring(2, 10)}`;
      const sampleArgs = JSON.stringify({
        location: 'San Francisco, CA',
        query: 'YOYO Cloud AI',
        status: 'active',
      });

      const cachedTokens = promptTokens >= 10 ? Math.floor(promptTokens * 0.5) : 0;

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
              content: null,
              tool_calls: [
                {
                  id: toolCallId,
                  type: 'function',
                  function: {
                    name: selectedTool,
                    arguments: sampleArgs,
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: 32,
          total_tokens: promptTokens + 32,
          prompt_tokens_details: {
            cached_tokens: cachedTokens,
          },
        },
      };
    }

    // 2. Structured Outputs JSON Schema
    if (request.response_format?.type === 'json_schema') {
      const schemaName = request.response_format.json_schema?.name || 'StructuredOutput';
      const mockStructured = JSON.stringify(
        {
          schema_name: schemaName,
          status: 'success',
          result: 'Validated structured JSON conforming to specified schema',
          model: request.model,
        },
        null,
        2
      );
      const completionTokens = estimateTokens(mockStructured);

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
              content: mockStructured,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
          prompt_tokens_details: {
            cached_tokens: Math.floor(promptTokens * 0.5),
          },
        },
      };
    }

    // 3. Standard JSON object mode
    if (request.response_format?.type === 'json_object') {
      const mockJson = JSON.stringify(
        {
          status: 'success',
          model: request.model,
          message: 'Nominal JSON object response',
        },
        null,
        2
      );
      const completionTokens = estimateTokens(mockJson);

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
              content: mockJson,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
          prompt_tokens_details: {
            cached_tokens: Math.floor(promptTokens * 0.5),
          },
        },
      };
    }

    // 3b. Multi-modal vision image request detection
    const hasImage = request.messages?.some(
      (m) =>
        Array.isArray(m.content) &&
        m.content.some((p: any) => p.type === 'image_url' && p.image_url?.url)
    );

    if (hasImage) {
      const visionReply = `[YOYO Vision Multi-Modal Analysis via ${request.model}] I have processed the uploaded visual asset. The image displays a high-resolution visual context with clear structural demarcations, verified by YOYO edge inference pipeline.`;
      const completionTokens = estimateTokens(visionReply);

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
              content: visionReply,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
          prompt_tokens_details: {
            cached_tokens: Math.floor(promptTokens * 0.5),
          },
        },
      };
    }

    // 4. Standard text reply
    const mockReply = `[YOYO AI Mock Response from ${request.model}] I have successfully processed your request. Everything is functioning in nominal state.`;
    const completionTokens = estimateTokens(mockReply);

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
            content: mockReply,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        prompt_tokens_details: {
          cached_tokens: Math.floor(promptTokens * 0.5),
        },
      },
    };
  }

  async *chatCompletionStream(
    workerEndpoint: string,
    request: ChatCompletionRequest,
    abortSignal?: AbortSignal
  ): AsyncIterable<ChatCompletionChunk> {
    const id = `chatcmpl-${Date.now()}`;
    const hasImage = request.messages?.some(
      (m) =>
        Array.isArray(m.content) &&
        m.content.some((p: any) => p.type === 'image_url' && p.image_url?.url)
    );

    const words = hasImage
      ? [
          '[Vision',
          ' Analysis]',
          ' The',
          ' provided',
          ' visual',
          ' asset',
          ' has',
          ' been',
          ' parsed',
          ' by',
          ' YOYO',
          ' multi-modal',
          ' pipeline.',
        ]
      : [
          'This',
          ' is',
          ' a',
          ' streaming',
          ' response',
          ' from',
          ' YOYO',
          ' AI',
          ' platform.',
          ' Running',
          ' on',
          ' model: ',
          request.model,
          '.',
        ];

    for (let i = 0; i < words.length; i++) {
      if (abortSignal?.aborted) break;

      // Small delay between tokens to simulate realistic generation
      await new Promise((resolve) => setTimeout(resolve, 30));

      yield {
        id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            delta: {
              role: i === 0 ? 'assistant' : undefined,
              content: words[i],
            },
            finish_reason: null,
          },
        ],
      };
    }

    // Final finish reason chunk
    yield {
      id,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: estimateMessagesTokens(request.messages),
        completion_tokens: words.length,
        total_tokens: estimateMessagesTokens(request.messages) + words.length,
      },
    };
  }

  async embeddings(
    workerEndpoint: string,
    request: EmbeddingRequest
  ): Promise<EmbeddingResponse> {
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    const data = inputs.map((text, idx) => ({
      object: 'embedding' as const,
      index: idx,
      // 768-dimensional mock embedding vector
      embedding: Array.from({ length: 768 }, (_, i) => Math.sin(i + text.length) * 0.05),
    }));

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
    return {
      isHealthy: true,
      engine: 'OLLAMA',
      latencyMs: 5,
      activeModels: ['llama3.3:8b', 'qwen2.5-coder:7b'],
    };
  }

  async *pullModel(
    workerEndpoint: string,
    modelTag: string,
    abortSignal?: AbortSignal
  ): AsyncIterable<ModelPullProgress> {
    const steps = [
      { status: 'pulling manifest', percent: 10 },
      { status: 'downloading layer 1/3', percent: 45 },
      { status: 'downloading layer 2/3', percent: 80 },
      { status: 'verifying sha256 checksum', percent: 95 },
      { status: 'success', percent: 100 },
    ];

    for (const step of steps) {
      if (abortSignal?.aborted) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
      yield step;
    }
  }

  async unloadModel(workerEndpoint: string, modelTag: string): Promise<void> {}
}


export interface ClientOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ToolFunctionDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface ToolDefinition {
  type: 'function';
  function: ToolFunctionDefinition;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface JsonSchemaFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict?: boolean;
    schema: Record<string, any>;
  };
}

export type ResponseFormat =
  | { type: 'text' }
  | { type: 'json_object' }
  | JsonSchemaFormat;

export interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  response_format?: ResponseFormat;
  tools?: ToolDefinition[];
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  presence_penalty?: number;
  frequency_penalty?: number;
  seed?: number;
  [key: string]: any;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string | null;
      tool_calls?: {
        index?: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }[];
    };
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface RerankParams {
  model?: string;
  query: string;
  documents: (string | { text: string })[];
  top_n?: number;
  return_documents?: boolean;
}

export interface RerankResult {
  id: string;
  results: {
    index: number;
    relevance_score: number;
    document?: { text: string };
  }[];
  meta: {
    api_version: { version: string };
    billed_units: { search_units: number };
  };
}

export class YoyoError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'YoyoError';
  }
}

export class YoyoAuthenticationError extends YoyoError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'YoyoAuthenticationError';
  }
}

export class YoyoRateLimitError extends YoyoError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'YoyoRateLimitError';
  }
}

export class YoyoNotFoundError extends YoyoError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'YoyoNotFoundError';
  }
}

export function mapHttpError(status: number, body: string): YoyoError {
  if (status === 401) return new YoyoAuthenticationError(`HTTP 401 Unauthorized: ${body}`);
  if (status === 429) return new YoyoRateLimitError(`HTTP 429 Rate Limit Exceeded: ${body}`);
  if (status === 404) return new YoyoNotFoundError(`HTTP 404 Not Found: ${body}`);
  return new YoyoError(`HTTP ${status} API Error: ${body}`, status);
}

export class Yoyo {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: ClientOptions = {}) {
    const key = options.apiKey || (typeof process !== 'undefined' ? process.env?.YOYO_API_KEY : undefined);
    if (!key) {
      throw new Error('YOYO API Key is required. Set via options.apiKey or process.env.YOYO_API_KEY. Format: sk_live_...');
    }
    this.apiKey = key;
    this.baseUrl = (options.baseUrl || 'https://api.yoyo.ai/v1').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs || 60000;
  }

  public readonly chat = {
    completions: {
      create: async (
        params: ChatCompletionParams
      ): Promise<any> => {
        if (params.stream) {
          return this.createStream(params);
        }
        return this.createNonStream(params);
      },
      createStream: (params: ChatCompletionParams): AsyncIterable<ChatCompletionChunk> => {
        return this.createStream(params);
      },
    },
    create: async (params: ChatCompletionParams): Promise<any> => {
      if (params.stream) {
        return this.createStream(params);
      }
      return this.createNonStream(params);
    },
    createStream: (params: ChatCompletionParams): AsyncIterable<ChatCompletionChunk> => {
      return this.createStream(params);
    },
  };

  public readonly models = {
    list: async (): Promise<{ data: { id: string; owned_by: string }[] }> => {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      if (!res.ok) throw new Error(`YOYO API Error: ${await res.text()}`);
      return res.json() as any;
    },
  };

  public readonly embeddings = {
    create: async (params: {
      model: string;
      input: string | string[];
    }): Promise<{ data: { embedding: number[] }[]; usage: any }> => {
      const res = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`YOYO API Error: ${await res.text()}`);
      return res.json() as any;
    },
  };

  public readonly rerank = Object.assign(
    async (params: RerankParams): Promise<RerankResult> => {
      const res = await fetch(`${this.baseUrl}/rerank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: params.model || 'bge-reranker-large',
          query: params.query,
          documents: params.documents,
          top_n: params.top_n,
          return_documents: params.return_documents ?? true,
        }),
      });
      if (!res.ok) throw new Error(`YOYO Rerank API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    {
      create: async (params: RerankParams): Promise<RerankResult> => {
        const res = await fetch(`${this.baseUrl}/rerank`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: params.model || 'bge-reranker-large',
            query: params.query,
            documents: params.documents,
            top_n: params.top_n,
            return_documents: params.return_documents ?? true,
          }),
        });
        if (!res.ok) throw new Error(`YOYO Rerank API Error [${res.status}]: ${await res.text()}`);
        return res.json() as any;
      },
    }
  );

  public readonly files = {
    create: async (params: { filename?: string; content: string; purpose?: string }): Promise<any> => {
      const res = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`YOYO Files API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    list: async (): Promise<{ object: 'list'; data: any[] }> => {
      const res = await fetch(`${this.baseUrl}/files`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Files API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    retrieve: async (fileId: string): Promise<any> => {
      const res = await fetch(`${this.baseUrl}/files/${fileId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Files API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    content: async (fileId: string): Promise<string> => {
      const res = await fetch(`${this.baseUrl}/files/${fileId}/content`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Files API Error [${res.status}]: ${await res.text()}`);
      return res.text();
    },
    del: async (fileId: string): Promise<{ id: string; deleted: boolean }> => {
      const res = await fetch(`${this.baseUrl}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Files API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    delete: async (fileId: string): Promise<{ id: string; deleted: boolean }> => {
      return this.files.del(fileId);
    },
  };

  public readonly batches = {
    create: async (params: {
      input_file_id: string;
      endpoint?: string;
      completion_window?: string;
      metadata?: any;
    }): Promise<any> => {
      const res = await fetch(`${this.baseUrl}/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`YOYO Batches API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    list: async (): Promise<{ object: 'list'; data: any[] }> => {
      const res = await fetch(`${this.baseUrl}/batches`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Batches API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    retrieve: async (batchId: string): Promise<any> => {
      const res = await fetch(`${this.baseUrl}/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Batches API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    cancel: async (batchId: string): Promise<any> => {
      const res = await fetch(`${this.baseUrl}/batches/${batchId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: '{}',
      });
      if (!res.ok) throw new Error(`YOYO Batches API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
  };

  public fineTuning = {
    jobs: {
      create: async (params: {
        model: string;
        training_file: string;
        validation_file?: string;
        hyperparameters?: {
          n_epochs?: number;
          batch_size?: number;
          learning_rate_multiplier?: number;
        };
        suffix?: string;
      }): Promise<any> => {
        const res = await fetch(`${this.baseUrl}/fine_tuning/jobs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(params),
        });
        if (!res.ok) throw new Error(`YOYO FineTuning API Error [${res.status}]: ${await res.text()}`);
        return res.json() as any;
      },
      list: async (limit = 20): Promise<{ object: 'list'; data: any[] }> => {
        const res = await fetch(`${this.baseUrl}/fine_tuning/jobs?limit=${limit}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        if (!res.ok) throw new Error(`YOYO FineTuning API Error [${res.status}]: ${await res.text()}`);
        return res.json() as any;
      },
      retrieve: async (jobId: string): Promise<any> => {
        const res = await fetch(`${this.baseUrl}/fine_tuning/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        if (!res.ok) throw new Error(`YOYO FineTuning API Error [${res.status}]: ${await res.text()}`);
        return res.json() as any;
      },
      cancel: async (jobId: string): Promise<any> => {
        const res = await fetch(`${this.baseUrl}/fine_tuning/jobs/${jobId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: '{}',
        });
        if (!res.ok) throw new Error(`YOYO FineTuning API Error [${res.status}]: ${await res.text()}`);
        return res.json() as any;
      },
      listEvents: async (jobId: string): Promise<{ object: 'list'; data: any[] }> => {
        const res = await fetch(`${this.baseUrl}/fine_tuning/jobs/${jobId}/events`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        if (!res.ok) throw new Error(`YOYO FineTuning API Error [${res.status}]: ${await res.text()}`);
        return res.json() as any;
      },
    },
  };



  private async createNonStream(params: ChatCompletionParams): Promise<ChatCompletionResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...params, stream: false }),
    });

    if (!res.ok) {
      throw new Error(`YOYO Error [${res.status}]: ${await res.text()}`);
    }

    return res.json() as any;
  }

  private async *createStream(
    params: ChatCompletionParams
  ): AsyncIterable<ChatCompletionChunk> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...params, stream: true }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`YOYO Stream Error [${res.status}]: ${await res.text()}`);
    }

    const reader = (res.body as any).getReader();
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
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') return;

          try {
            const parsed = JSON.parse(payload);
            yield parsed as ChatCompletionChunk;
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export { Yoyo as YoyoClient };
export default Yoyo;


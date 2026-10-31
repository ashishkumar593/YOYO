export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
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
      content?: string;
    };
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class Yoyo {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: ClientOptions) {
    if (!options.apiKey) {
      throw new Error('YOYO API Key is required. Format: sk_live_...');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'http://localhost:4000/v1').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs || 60000;
  }

  public readonly chat = {
    completions: {
      create: async (
        params: ChatCompletionParams & { stream: true }
      ): Promise<AsyncIterable<ChatCompletionChunk>> => {
        return this.createStream(params);
      },
      createNonStreaming: async (
        params: ChatCompletionParams & { stream?: false }
      ): Promise<ChatCompletionResponse> => {
        return this.createNonStream(params);
      },
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

export default Yoyo;


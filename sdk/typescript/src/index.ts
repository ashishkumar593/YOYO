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

export interface EvaluationBenchmarkSample {
  id: string;
  title: string;
  prompt: string;
  expectedCriteria: string;
  category: 'coding' | 'reasoning' | 'safety' | 'general';
}

export interface EvaluationBenchmarkSuite {
  id: string;
  name: string;
  description: string;
  category: string;
  samples: EvaluationBenchmarkSample[];
}

export interface RunEvaluationParams {
  modelA: string;
  modelB: string;
  judgeModel?: string;
  benchmarkSuiteId: string;
  samples?: EvaluationBenchmarkSample[];
}

export interface EvaluationLeaderboardEntry {
  rank: number;
  model: string;
  elo: number;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  avgScore: number;
  avgLatencyMs: number;
}

export interface GenerateSuiteParams {
  domain: string;
  category?: 'coding' | 'reasoning' | 'safety' | 'general';
  testCount?: number;
  generatorModel?: string;
}

export interface QualityGateParams {
  candidateModel: string;
  baselineModel: string;
  benchmarkSuiteId: string;
  minWinRate?: number;
  minOverallScore?: number;
  minAccuracyScore?: number;
  maxLatencyMs?: number;
  failOnThreshold?: boolean;
}

export interface QualityGateViolation {
  metric: string;
  actual: number;
  threshold: number;
  message: string;
}

export interface QualityGateResult {
  passed: boolean;
  deploymentApproved: boolean;
  candidateModel: string;
  baselineModel: string;
  metrics: {
    candidateModel: string;
    baselineModel: string;
    candidateWinRate: number;
    candidateOverallScore: number;
    candidateAccuracyScore: number;
    candidateLatencyMs: number;
    baselineOverallScore: number;
    baselineLatencyMs: number;
  };
  thresholds: {
    minWinRate: number;
    minOverallScore: number;
    minAccuracyScore: number;
    maxLatencyMs: number;
  };
  violations: QualityGateViolation[];
  runId: string;
}

export interface ModelDriftReport {
  model: string;
  driftDetected: boolean;
  baselineScore: number;
  currentScore: number;
  scoreDelta: number;
  scoreDeltaPct: number;
  baselineLatencyMs: number;
  currentLatencyMs: number;
  latencyDeltaMs: number;
  status: 'STABLE' | 'DEGRADED' | 'ACCELERATED' | 'INSUFFICIENT_DATA';
  recommendation: string;
}

export interface AuditReportExport {
  runId: string;
  suiteId: string;
  suiteName: string;
  modelA: string;
  modelB: string;
  judgeModel: string;
  winner: string;
  exportFormat: 'json' | 'csv' | 'markdown';
  content: string;
  complianceHash: string;
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

  public moderations = {
    create: async (params: {
      input: string | string[];
      model?: string;
    }): Promise<{
      id: string;
      model: string;
      results: Array<{
        flagged: boolean;
        categories: Record<string, boolean>;
        category_scores: Record<string, number>;
      }>;
    }> => {
      const res = await fetch(`${this.baseUrl}/moderations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`YOYO Moderations API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
  };

  public evaluations = {
    listBenchmarks: async (): Promise<EvaluationBenchmarkSuite[]> => {
      const res = await fetch(`${this.baseUrl}/evaluations/benchmarks`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Evaluations API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    getBenchmark: async (suiteId: string): Promise<EvaluationBenchmarkSuite> => {
      const res = await fetch(`${this.baseUrl}/evaluations/benchmarks/${suiteId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Evaluations API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    run: async (params: RunEvaluationParams): Promise<any> => {
      const res = await fetch(`${this.baseUrl}/evaluations/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`YOYO Evaluations API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    getLeaderboard: async (): Promise<EvaluationLeaderboardEntry[]> => {
      const res = await fetch(`${this.baseUrl}/evaluations/leaderboard`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Evaluations API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    getHistory: async (limit?: number): Promise<any[]> => {
      const url = limit ? `${this.baseUrl}/evaluations/history?limit=${limit}` : `${this.baseUrl}/evaluations/history`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Evaluations API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    getHistoryById: async (id: string): Promise<any> => {
      const res = await fetch(`${this.baseUrl}/evaluations/history/${id}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Evaluations API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    generateSuite: async (params: GenerateSuiteParams): Promise<EvaluationBenchmarkSuite> => {
      const res = await fetch(`${this.baseUrl}/evaluations/generate-suite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`YOYO Evaluations API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    assertQualityGate: async (params: QualityGateParams): Promise<QualityGateResult> => {
      const res = await fetch(`${this.baseUrl}/evaluations/assert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`YOYO Evaluations Quality Gate API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    detectDrift: async (modelId: string): Promise<ModelDriftReport> => {
      const res = await fetch(`${this.baseUrl}/evaluations/drift/${encodeURIComponent(modelId)}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Evaluations Drift API Error [${res.status}]: ${await res.text()}`);
      return res.json() as any;
    },
    exportAuditReport: async (runId: string, format: 'json' | 'csv' | 'markdown' = 'markdown'): Promise<AuditReportExport> => {
      const res = await fetch(`${this.baseUrl}/evaluations/history/${encodeURIComponent(runId)}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`YOYO Evaluations Export API Error [${res.status}]: ${await res.text()}`);
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

export { Yoyo as YoyoClient };
export default Yoyo;


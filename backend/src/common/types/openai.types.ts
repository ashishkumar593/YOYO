export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
  response_format?: { type: 'json_object' | 'text' } | any;
  tools?: any[];
  tool_choice?: any;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionUsage;
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: {
    role?: ChatRole;
    content?: string;
  };
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
  usage?: ChatCompletionUsage;
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
}

export interface EmbeddingData {
  object: 'embedding';
  index: number;
  embedding: number[];
}

export interface EmbeddingResponse {
  object: 'list';
  data: EmbeddingData[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ModelObject {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
  permission?: any[];
  root?: string;
  parent?: string | null;
}

export interface ModelListResponse {
  object: 'list';
  data: ModelObject[];
}

export interface RerankRequest {
  model: string;
  query: string;
  documents: (string | { text: string })[];
  top_n?: number;
  return_documents?: boolean;
}

export interface RerankResultItem {
  index: number;
  relevance_score: number;
  document?: { text: string };
}

export interface RerankResponse {
  id: string;
  results: RerankResultItem[];
  meta: {
    api_version: { version: string };
    billed_units: { search_units: number };
  };
}


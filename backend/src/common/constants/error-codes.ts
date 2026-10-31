export const ERROR_CODES = {
  UNAUTHORIZED: 'unauthorized',
  INVALID_API_KEY: 'invalid_api_key',
  EXPIRED_API_KEY: 'expired_api_key',
  FORBIDDEN_MODEL_ACCESS: 'forbidden_model_access',
  FORBIDDEN_RESOURCE: 'forbidden_resource',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  TOKEN_LIMIT_EXCEEDED: 'token_limit_exceeded',
  INSUFFICIENT_QUOTA: 'insufficient_quota',
  MODEL_NOT_FOUND: 'model_not_found',
  MODEL_NOT_READY: 'model_not_ready',
  NO_AVAILABLE_WORKER: 'no_available_worker',
  WORKER_TIMEOUT: 'worker_timeout',
  CONTEXT_LENGTH_EXCEEDED: 'context_length_exceeded',
  INVALID_REQUEST: 'invalid_request',
  STREAMING_ABORTED: 'streaming_aborted',
  INTERNAL_ERROR: 'internal_server_error',
  INFERENCE_ENGINE_ERROR: 'inference_engine_error',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];


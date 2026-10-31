export type ModelCategory =
  | 'GENERAL'
  | 'CODING'
  | 'REASONING'
  | 'MATHEMATICS'
  | 'VISION'
  | 'EMBEDDING'
  | 'MULTILINGUAL'
  | 'LIGHTWEIGHT';

export type WorkerEngineType = 'OLLAMA' | 'VLLM' | 'SGLANG' | 'LLAMACPP';

export type WorkerStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'DRAINING';

export type DeploymentState = 'PENDING' | 'PULLING' | 'LOADED' | 'UNLOADED' | 'ERROR';


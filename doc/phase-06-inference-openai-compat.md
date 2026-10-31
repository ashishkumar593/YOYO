# Phase 06: Inference Engine Integration & OpenAI Parity

## 1. Objective
Build the core data-plane inference gateway. Implement full OpenAI compatibility for `/v1/chat/completions` (supporting standard JSON and Server-Sent Events SSE streaming), `/v1/embeddings`, and token usage estimation using the pluggable `InferenceProviderInterface`.

---

## 2. Deliverables Checklist
- [ ] Provider Abstraction Layer (`apps/api/src/modules/inference/providers/`):
  - `InferenceProviderInterface`: Common contract for chat completion, embeddings, and model management.
  - `OllamaProvider`: Implements mapping between OpenAI schemas and Ollama `/api/chat` / `/api/embeddings`.
- [ ] OpenAI-Compatible REST Endpoints:
  - `POST /v1/chat/completions`: Full support for `messages`, `temperature`, `max_tokens`, `stream`, `stop`.
  - `POST /v1/embeddings`: Batch embedding generation.
  - `GET /v1/models`: OpenAI model catalog.
- [ ] Server-Sent Events (SSE) Streaming Pipeline:
  - Converts Ollama newline-delimited JSON chunks into standard `data: {...}\n\n` SSE events.
  - Calculates token metrics upon completion and emits final `usage` metadata block followed by `data: [DONE]`.
  - Handles client abort signals cleanly, aborting upstream inference on the GPU worker.
- [ ] Token Pre-flight Guard:
  - Validates context length against model constraints prior to GPU dispatch.

---

## 3. Protocol Translation
```
OpenAI Request (Client)
  POST /v1/chat/completions
  { "model": "llama3.3:8b", "messages": [...], "temperature": 0.7, "stream": true }
        │
        ▼
YOYO Gateway (OllamaProvider)
  POST http://ollama-worker:11434/api/chat
  { "model": "llama3.3:8b", "messages": [...], "options": { "temperature": 0.7 }, "stream": true }
        │
        ▼
Ollama Stream Response (NDJSON)
  {"message":{"content":"Hello"},"done":false}
        │
        ▼
YOYO SSE Pipeline Transform
  data: {"id":"chatcmpl-xyz","choices":[{"delta":{"content":"Hello"}}]}\n\n
```

---

## 4. Acceptance Criteria
1. Standard OpenAI Python or TypeScript SDK client connects using `base_url="http://localhost:4000/v1"` and executes chat completions seamlessly.
2. Streaming mode outputs steady SSE tokens with accurate TTFT (Time To First Token) metrics.
3. Client disconnection immediately cancels the worker generation process.
4. Final completion chunks contain accurate `prompt_tokens` and `completion_tokens`.


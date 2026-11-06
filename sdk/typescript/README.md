# @yoyo-ai/sdk — Official TypeScript & Node.js Client

Official TypeScript client library for integrating the **YOYO AI Model API Platform** into Node.js, Next.js, and backend TypeScript applications.

---

## Installation

```bash
npm install @yoyo-ai/sdk
# or
pnpm add @yoyo-ai/sdk
```

---

## Quickstart

### 1. Initialize Client

The client automatically reads `process.env.YOYO_API_KEY` if omitted:

```typescript
import { Yoyo } from '@yoyo-ai/sdk';

// Reads YOYO_API_KEY from environment
const client = new Yoyo();

// Or explicit configuration:
const clientCustom = new Yoyo({
  apiKey: 'sk_live_your_actual_key_here',
  baseUrl: 'https://api.yoyo.ai/v1',
});
```

---

### 2. Live SSE Streaming Completion

```typescript
const stream = await client.chat.createStream({
  model: 'llama-3.3-70b',
  messages: [
    { role: 'system', content: 'You are an expert engineer.' },
    { role: 'user', content: 'Explain zero-downtime blue/green deployments.' },
  ],
  temperature: 0.7,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

---

### 3. High-Dimensional Vector Embeddings

```typescript
const response = await client.embeddings.create({
  model: 'nomic-embed-text',
  input: 'High-performance cloud AI inference on Kubernetes.',
});

console.log('Embedding dimensions:', response.data[0].embedding.length);
// Output: 768
```

---

### 4. Cross-Encoder Semantic Reranker (`/v1/rerank`)

```typescript
const ranked = await client.rerank.create({
  model: 'bge-reranker-large',
  query: 'What are the storage guarantees of Kubernetes StatefulSets?',
  documents: [
    'Fastify is an extremely low-overhead web framework for Node.js.',
    'Kubernetes StatefulSets provide persistent volume storage guarantees across pod rescheduling.',
    'Redis is an in-memory key-value data store used for fast caching.',
  ],
  top_n: 2,
  return_documents: true,
});

for (const res of ranked.results) {
  console.log(`Rank #${res.index} (Score: ${res.relevance_score.toFixed(4)}): ${res.document?.text}`);
}
```

---

### 5. Asynchronous Batch Inference (50% Off)

```typescript
// 1. Upload JSONL file
const file = await client.files.create({
  filename: 'eval_batch.jsonl',
  content: '{"custom_id": "req-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Explain quantum computing."}]}}',
});

// 2. Queue batch with 24-hour turnaround SLA
const batch = await client.batches.create({
  input_file_id: file.id,
  endpoint: '/v1/chat/completions',
  completion_window: '24h',
});

console.log(`Batch ${batch.id} submitted!`);
```


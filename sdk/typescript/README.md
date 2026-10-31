# @yoyo/sdk — Official TypeScript & Node.js Client

Official TypeScript client library for integrating **YOYO AI Model API Platform** into Node.js, Next.js, and backend TypeScript applications.

---

## Installation
```bash
npm install @yoyo/sdk
# or
pnpm add @yoyo/sdk
```

---

## Usage Example

### 1. Initialize Client
```typescript
import { Yoyo } from '@yoyo/sdk';

const yoyo = new Yoyo({
  apiKey: process.env.YOYO_API_KEY || 'sk_live_a7f9c2d1_...',
  baseUrl: 'http://localhost:4000/v1',
});
```

### 2. Streaming Chat Completion
```typescript
const stream = await yoyo.chat.completions.create({
  model: 'llama3.3:8b',
  messages: [
    { role: 'system', content: 'You are an expert engineer.' },
    { role: 'user', content: 'Write a quicksort in TypeScript.' },
  ],
  temperature: 0.7,
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### 3. Generate Embeddings
```typescript
const response = await yoyo.embeddings.create({
  model: 'nomic-embed-text:latest',
  input: ['Vector database search query'],
});

console.log(response.data[0].embedding);
```


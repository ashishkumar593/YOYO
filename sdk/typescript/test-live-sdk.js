const { Yoyo } = require('./dist/index.js');

async function testLiveTsSdk() {
  console.log('=== Testing TypeScript SDK Against Live Fastify Backend ===');

  // 1. Obtain a live key via Admin login
  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@yoyo.ai', password: 'Admin@Yoyo2026!' }),
  });
  const { accessToken } = await loginRes.json();

  // Prune old test keys if near limit
  const listKeysRes = await fetch('http://localhost:4000/api/keys', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const existingKeys = await listKeysRes.json();
  if (Array.isArray(existingKeys) && existingKeys.length >= 8) {
    for (const oldKey of existingKeys.slice(0, 5)) {
      await fetch(`http://localhost:4000/api/keys/${oldKey.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
  }

  const keyRes = await fetch('http://localhost:4000/api/keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name: 'TypeScript SDK Test Key' }),
  });
  const keyJson = await keyRes.json();
  const plaintextKey = keyJson.plaintextKey || keyJson.apiKey?.key || keyJson.key;
  if (!plaintextKey) {
    throw new Error(`Key generation failed (HTTP ${keyRes.status}): ${JSON.stringify(keyJson)}`);
  }
  console.log(`[OK] Generated TS Live Key: ${plaintextKey.substring(0, 16)}...`);

  // 2. Initialize Yoyo SDK
  const client = new Yoyo({
    apiKey: plaintextKey,
    baseUrl: 'http://localhost:4000/v1',
  });

  // 3. Models list
  const models = await client.models.list();
  console.log(`[OK] TS SDK client.models.list(): ${models.data.length} models retrieved.`);

  // 4. Chat Completion
  const chat = await client.chat.create({
    model: 'llama-3.3-70b',
    messages: [{ role: 'user', content: 'Testing TS SDK integration.' }],
  });
  console.log(`[OK] TS SDK client.chat.create(): Response from ${chat.model}`);

  // 4b. Embeddings & Rerank
  const embed = await client.embeddings.create({
    model: 'nomic-embed-text',
    input: 'Testing vector embeddings from TypeScript SDK',
  });
  console.log(`[OK] TS SDK client.embeddings.create(): ${embed.data[0].embedding.length} dims`);

  const rerank = await client.rerank.create({
    model: 'bge-reranker-large',
    query: 'What is YOYO?',
    documents: [
      'YOYO is an enterprise cloud AI model API platform.',
      'Node.js is an asynchronous event-driven JavaScript runtime.',
    ],
    top_n: 1,
    return_documents: true,
  });
  console.log(`[OK] TS SDK client.rerank.create(): Ranked top doc with score ${rerank.results[0].relevance_score}`);

  // 5. Files API
  const file = await client.files.create({
    filename: 'ts_sdk_batch.jsonl',
    content: '{"custom_id": "ts-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Hello TS"}]}}',
    purpose: 'batch',
  });
  console.log(`[OK] TS SDK client.files.create(): File ID = ${file.id}`);

  // 6. Batches API
  const batch = await client.batches.create({
    input_file_id: file.id,
    endpoint: '/v1/chat/completions',
    completion_window: '24h',
  });
  console.log(`[OK] TS SDK client.batches.create(): Batch ID = ${batch.id}, Status = ${batch.status}`);

  // Wait 1.5s for worker
  await new Promise((r) => setTimeout(r, 1500));
  const retrieved = await client.batches.retrieve(batch.id);
  console.log(`[OK] TS SDK client.batches.retrieve(): Status = ${retrieved.status}`);

  console.log('=== All TypeScript SDK Live End-to-End Checks Passed! ===');
}

testLiveTsSdk().catch((err) => {
  console.error('[FAIL] TS SDK Live Test Failed:', err);
  process.exit(1);
});


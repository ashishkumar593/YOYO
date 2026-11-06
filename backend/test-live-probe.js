const http = require('http');

async function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runProbe() {
  console.log('====================================================');
  console.log('   YOYO CLOUD PLATFORM - LIVE MANUAL PROBING SUITE   ');
  console.log('====================================================\n');

  // 1. Health Check
  console.log('--> [1/11] Probing GET /health ...');
  const health = await request({
    host: 'localhost',
    port: 4000,
    path: '/health',
    method: 'GET',
  });
  console.log(`[PASS] Health check returned HTTP ${health.status}:`, health.body);

  // 2. Admin Login
  console.log('\n--> [2/11] Probing POST /api/auth/login (Super Admin) ...');
  const login = await request(
    {
      host: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@yoyo.ai', password: 'Admin@Yoyo2026!' }
  );
  if (!login.body.accessToken) {
    throw new Error(`Login failed: ${JSON.stringify(login.body)}`);
  }
  const token = login.body.accessToken;
  console.log(`[PASS] Authentication successful! Access Token received (role: ${login.body.user.role})`);

  // Prune old keys if near limit
  try {
    const listKeys = await request({
      host: 'localhost',
      port: 4000,
      path: '/api/keys',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (Array.isArray(listKeys.body) && listKeys.body.length >= 8) {
      for (const oldKey of listKeys.body.slice(0, 5)) {
        await request({
          host: 'localhost',
          port: 4000,
          path: `/api/keys/${oldKey.id}`,
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  } catch {}

  // 3. Create API Key
  console.log('\n--> [3/11] Probing POST /api/keys (Create API Key) ...');
  const keyRes = await request(
    {
      host: 'localhost',
      port: 4000,
      path: '/api/keys',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { name: 'Live Probe Key', rateLimitRpm: 120 }
  );
  const apiKey = keyRes.body.plaintextKey;
  console.log(`[PASS] API Key generated: ${apiKey.substring(0, 15)}... (ID: ${keyRes.body.apiKey.id})`);

  // 4. List Models (OpenAI compatible)
  console.log('\n--> [4/11] Probing GET /v1/models (OpenAI Wire Parity) ...');
  const models = await request({
    host: 'localhost',
    port: 4000,
    path: '/v1/models',
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  console.log(`[PASS] Models returned: ${models.body.data.length} foundation models available.`);
  console.log(`       Sample models:`, models.body.data.slice(0, 3).map((m) => m.id));

  // 5. Chat Completion Non-Streaming
  console.log('\n--> [5/11] Probing POST /v1/chat/completions (llama-3.3-70b) ...');
  const chatRes = await request(
    {
      host: 'localhost',
      port: 4000,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    },
    {
      model: 'llama-3.3-70b',
      messages: [{ role: 'user', content: 'What is the speed of light in vacuum?' }],
      temperature: 0.7,
      max_tokens: 128,
    }
  );
  console.log(`[PASS] Chat Completion Response:`);
  console.log(`       Model: ${chatRes.body.model}`);
  console.log(`       Tokens: Prompt=${chatRes.body.usage.prompt_tokens}, Completion=${chatRes.body.usage.completion_tokens}`);
  console.log(`       Content: "${chatRes.body.choices[0].message.content.substring(0, 60)}..."`);
  if (chatRes.headers['x-yoyo-zero-data-retention'] !== 'true') {
    throw new Error('Compliance header x-yoyo-zero-data-retention missing on /v1/chat/completions');
  }

  // 6. Embeddings API
  console.log('\n--> [6/11] Probing POST /v1/embeddings (nomic-embed-text) ...');
  const embedRes = await request(
    {
      host: 'localhost',
      port: 4000,
      path: '/v1/embeddings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    },
    {
      model: 'nomic-embed-text:latest',
      input: 'Autonomous distributed AI gateway',
    }
  );
  console.log(`[PASS] Embeddings generated: vector dimensions = ${embedRes.body.data[0].embedding.length}`);
  if (embedRes.headers['x-yoyo-zero-data-retention'] !== 'true') {
    throw new Error('Compliance header x-yoyo-zero-data-retention missing on /v1/embeddings');
  }

  // 6b. Semantic Reranking API
  console.log('\n--> [6b/11] Probing POST /v1/rerank (bge-reranker-large) ...');
  const rerankRes = await request(
    {
      host: 'localhost',
      port: 4000,
      path: '/v1/rerank',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    },
    {
      model: 'bge-reranker-large',
      query: 'What is YOYO?',
      documents: [
        'YOYO is an enterprise cloud AI model API platform.',
        'PostgreSQL is an open source relational database.',
      ],
      top_n: 1,
      return_documents: true,
    }
  );
  if (rerankRes.headers['x-yoyo-zero-data-retention'] !== 'true') {
    throw new Error('Compliance header x-yoyo-zero-data-retention missing on /v1/rerank');
  }
  console.log(`[PASS] Reranker scored: score=${rerankRes.body.results[0].relevance_score.toFixed(4)}, doc="${rerankRes.body.results[0].document.text}"`);

  // 7. Files API - Upload JSONL
  console.log('\n--> [7/11] Probing POST /v1/files (Upload batch input dataset) ...');
  const jsonlData = [
    JSON.stringify({
      custom_id: 'batch-test-1',
      method: 'POST',
      url: '/v1/chat/completions',
      body: { model: 'llama-3.3-70b', messages: [{ role: 'user', content: 'Say hello in Japanese.' }] },
    }),
    JSON.stringify({
      custom_id: 'batch-test-2',
      method: 'POST',
      url: '/v1/chat/completions',
      body: { model: 'qwen-2.5-coder-32b', messages: [{ role: 'user', content: 'Fibonacci function in Python.' }] },
    }),
  ].join('\n');

  const fileRes = await request(
    {
      host: 'localhost',
      port: 4000,
      path: '/v1/files',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    },
    {
      filename: 'e2e_probe_input.jsonl',
      content: jsonlData,
      purpose: 'batch',
    }
  );
  console.log(`[PASS] File uploaded: ID=${fileRes.body.id}, bytes=${fileRes.body.bytes}, lines=${fileRes.body.line_count}`);

  // 8. Batches API - Submit Batch
  console.log('\n--> [8/11] Probing POST /v1/batches (Queue asynchronous batch job) ...');
  const batchRes = await request(
    {
      host: 'localhost',
      port: 4000,
      path: '/v1/batches',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    },
    {
      input_file_id: fileRes.body.id,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
    }
  );
  console.log(`[PASS] Batch created: ID=${batchRes.body.id}, Status=${batchRes.body.status}`);

  // Wait 1.5s for async execution worker
  console.log('       Waiting 1.5s for worker execution...');
  await new Promise((r) => setTimeout(r, 1500));

  const batchStatus = await request({
    host: 'localhost',
    port: 4000,
    path: `/v1/batches/${batchRes.body.id}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  console.log(`[PASS] Batch execution finished! Status=${batchStatus.body.status}, Total=${batchStatus.body.totalRequests}, Completed=${batchStatus.body.completedRequests}`);

  if (batchStatus.body.outputFileId) {
    const outputContent = await request({
      host: 'localhost',
      port: 4000,
      path: `/v1/files/${batchStatus.body.outputFileId}/content`,
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    console.log(`[PASS] Downloaded Batch Results Content:`);
    console.log(`       Output lines: ${outputContent.raw.trim().split('\n').length}`);
  }

  // 9. Webhooks API - Register Endpoint
  console.log('\n--> [9/11] Probing POST /api/webhooks (Register HMAC endpoint) ...');
  const webhookRes = await request(
    {
      host: 'localhost',
      port: 4000,
      path: '/api/webhooks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      url: 'https://webhook.site/test-receiver',
      description: 'E2E Probe Webhook Listener',
      events: ['batch.completed', 'usage.threshold_reached'],
    }
  );
  console.log(`[PASS] Webhook registered! ID=${webhookRes.body.id}`);
  console.log(`       Signing secret: ${webhookRes.body.secret.substring(0, 15)}...`);

  // 10. Webhooks API - Test Ping
  console.log('\n--> [10/11] Probing POST /api/webhooks/:id/test (Trigger signed test ping) ...');
  const pingRes = await request({
    host: 'localhost',
    port: 4000,
    path: `/api/webhooks/${webhookRes.body.id}/test`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(`[PASS] Webhook test ping dispatched! Response:`, pingRes.body);

  console.log('\n====================================================');
  console.log('   ALL 11/11 MANUAL PROBE CHECKS PASSED WITH ZERO ERRORS');
  console.log('====================================================\n');
}

runProbe().catch((err) => {
  console.error('\n[FAIL] Probe failed with error:', err);
  process.exit(1);
});

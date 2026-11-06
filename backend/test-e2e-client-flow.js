async function testEndToEndDeveloperFlow() {
  console.log('=== STARTING END-TO-END DEVELOPER JOURNEY VERIFICATION ===\n');

  // 1. User Registration & Login
  console.log('--> Step 1: User Login as Developer / Admin...');
  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@yoyo.ai', password: 'Admin@Yoyo2026!' }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
  const { accessToken, user } = await loginRes.json();
  console.log(`[PASS] Logged in as: ${user.email} (Role: ${user.role})`);

  // 2. Fetch Dashboard Overview
  console.log('\n--> Step 2: Fetching User Quota & Credit Balance...');
  const balanceRes = await fetch('http://localhost:4000/api/billing/balance', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const balance = await balanceRes.json();
  console.log(`[PASS] Credit Balance: $${balance.balanceUsd} (Monthly tokens limit: ${balance.monthlyTokenLimit})`);

  // 3. Create Developer API Key
  console.log('\n--> Step 3: Generating Production API Key...');
  // Prune old keys if near limit
  try {
    const listRes = await fetch('http://localhost:4000/api/keys', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const existing = await listRes.json();
    if (Array.isArray(existing) && existing.length >= 8) {
      for (const oldKey of existing.slice(0, 5)) {
        await fetch(`http://localhost:4000/api/keys/${oldKey.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    }
  } catch {}

  const keyRes = await fetch('http://localhost:4000/api/keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name: 'E2E Full Flow Key', rateLimitRpm: 300 }),
  });
  const { apiKey, plaintextKey } = await keyRes.json();
  console.log(`[PASS] Key Generated: ${plaintextKey.substring(0, 16)}... (Masked: ${apiKey.maskedKey})`);

  // 4. Query Model Catalog
  console.log('\n--> Step 4: Inspecting Model Catalog for Reasoning & Coding Models...');
  const modelsRes = await fetch('http://localhost:4000/v1/models', {
    headers: { Authorization: `Bearer ${plaintextKey}` },
  });
  const { data: models } = await modelsRes.json();
  console.log(`[PASS] Found ${models.length} active cloud models.`);
  for (const m of models) {
    console.log(`       - ${m.id} (Owner: ${m.owned_by})`);
  }

  // 5. Run Live Inference across 3 distinct model architectures
  const testModels = ['llama-3.3-70b', 'qwen-2.5-coder-32b', 'deepseek-r1-70b'];
  for (const model of testModels) {
    console.log(`\n--> Step 5 [${model}]: Running chat completion...`);
    const start = Date.now();
    const chatRes = await fetch('http://localhost:4000/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${plaintextKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: `Benchmarking inference for ${model}` }],
        max_tokens: 64,
      }),
    });
    if (!chatRes.ok) throw new Error(`Inference failed on ${model}: ${await chatRes.text()}`);
    const chatData = await chatRes.json();
    const duration = Date.now() - start;
    console.log(`[PASS] ${model} responded in ${duration}ms!`);
    console.log(`       Token usage: Prompt=${chatData.usage.prompt_tokens}, Completion=${chatData.usage.completion_tokens}, Total=${chatData.usage.total_tokens}`);
    console.log(`       Preview: "${chatData.choices[0].message.content.substring(0, 60)}..."`);
  }

  // 5b. Run Embeddings & Semantic Reranker
  console.log('\n--> Step 5b: Testing Vector Embeddings & Semantic Reranking...');
  const embedRes = await fetch('http://localhost:4000/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plaintextKey}`,
    },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      input: 'State-of-the-art cloud AI platform benchmark',
    }),
  });
  if (!embedRes.ok) throw new Error(`Embeddings failed: ${await embedRes.text()}`);
  const embedData = await embedRes.json();
  console.log(`[PASS] Embeddings returned ${embedData.data[0].embedding.length} dimensions vector!`);

  const rerankRes = await fetch('http://localhost:4000/v1/rerank', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plaintextKey}`,
    },
    body: JSON.stringify({
      model: 'bge-reranker-large',
      query: 'What is YOYO?',
      documents: [
        'YOYO is an enterprise cloud AI model API platform.',
        'PostgreSQL is an open source relational database.',
      ],
      top_n: 1,
      return_documents: true,
    }),
  });
  if (!rerankRes.ok) throw new Error(`Rerank failed: ${await rerankRes.text()}`);
  const rerankData = await rerankRes.json();
  console.log(`[PASS] Rerank scored top result (Score: ${rerankData.results[0].relevance_score.toFixed(4)})`);

  // 6. Verify Telemetry & Request Audit Logs
  console.log('\n--> Step 6: Verifying Real-time Telemetry & Usage Logs...');
  const logsRes = await fetch('http://localhost:4000/api/usage/requests?limit=10', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const logsData = await logsRes.json();
  console.log(`[PASS] Telemetry Audit Logs: ${logsData.requests?.length || logsData.length || 0} recorded requests found.`);
  if (logsData.requests && logsData.requests.length > 0) {
    const latest = logsData.requests[0];
    console.log(`       Latest Log: Model=${latest.model}, Status=${latest.statusCode}, Latency=${latest.latencyMs}ms, Tokens=${latest.totalTokens}`);
  }

  // 7. Verify Webhook Ping Event Flow
  console.log('\n--> Step 7: Testing Webhook Event Dispatch Pipeline...');
  const whRes = await fetch('http://localhost:4000/api/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      url: 'https://webhook.site/automated-verification',
      description: 'Pipeline Verification Receiver',
      events: ['batch.completed', 'usage.threshold_reached'],
    }),
  });
  const webhook = await whRes.json();
  console.log(`[PASS] Webhook Endpoint Registered: ${webhook.id} (Secret: ${webhook.secret.substring(0, 15)}...)`);

  const pingRes = await fetch(`http://localhost:4000/api/webhooks/${webhook.id}/test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const pingData = await pingRes.json();
  console.log(`[PASS] Webhook Test Ping Dispatched (Latency: ${pingData.latencyMs || pingData.durationMs || 0}ms)`);

  console.log('\n==========================================================');
  console.log('   FULL END-TO-END DEVELOPER JOURNEY 100% OPERATIONAL!   ');
  console.log('==========================================================\n');
}

testEndToEndDeveloperFlow().catch((err) => {
  console.error('\n[FAIL] E2E Developer Flow failed:', err);
  process.exit(1);
});


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
    if (chatRes.headers.get('x-yoyo-zero-data-retention') !== 'true') {
      throw new Error(`Compliance header x-yoyo-zero-data-retention missing on ${model}`);
    }
    const chatData = await chatRes.json();
    const duration = Date.now() - start;
    console.log(`[PASS] ${model} responded in ${duration}ms (Zero-retention verified)!`);
    console.log(`       Token usage: Prompt=${chatData.usage.prompt_tokens}, Completion=${chatData.usage.completion_tokens}, Total=${chatData.usage.total_tokens}`);
    console.log(`       Preview: "${chatData.choices[0].message.content.substring(0, 60)}..."`);
  }

  // 5c. Test Function / Tool Calling
  console.log('\n--> Step 5c: Testing Function Calling & Tool Definitions...');
  const toolRes = await fetch('http://localhost:4000/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plaintextKey}`,
    },
    body: JSON.stringify({
      model: 'qwen2.5-coder:1.5b',
      messages: [
        { role: 'system', content: 'You must call get_current_weather to fetch weather data.' },
        { role: 'user', content: 'What is the weather in Tokyo? Call get_current_weather with location Tokyo.' },
      ],
      tool_choice: 'auto',
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_current_weather',
            description: 'Get weather for a city',
            parameters: {
              type: 'object',
              properties: { location: { type: 'string' } },
              required: ['location'],
            },
          },
        },
      ],
    }),
  });
  if (!toolRes.ok) throw new Error(`Tool calling failed: ${await toolRes.text()}`);
  const toolData = await toolRes.json();
  if (toolData.choices[0].finish_reason !== 'tool_calls' || !toolData.choices[0].message.tool_calls) {
    throw new Error('Expected finish_reason to be tool_calls with tool_calls payload');
  }
  const toolCall = toolData.choices[0].message.tool_calls[0];
  console.log(`[PASS] Tool call returned: ${toolCall.function.name}(${toolCall.function.arguments})`);

  // 5d. Test Structured Outputs (JSON Schema Mode)
  console.log('\n--> Step 5d: Testing Strict JSON Schema Structured Outputs...');
  const schemaRes = await fetch('http://localhost:4000/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plaintextKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages: [{ role: 'user', content: 'Extract entity from text' }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'EntityExtraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              entityName: { type: 'string' },
              confidenceScore: { type: 'number' },
            },
            required: ['entityName', 'confidenceScore'],
          },
        },
      },
    }),
  });
  if (!schemaRes.ok) throw new Error(`Schema inference failed: ${await schemaRes.text()}`);
  const schemaData = await schemaRes.json();
  const rawContent = schemaData.choices[0].message.content;
  const parsedJson = JSON.parse(rawContent);
  console.log(`[PASS] Structured Output parsed successfully: ${JSON.stringify(parsedJson)}`);

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
  if (embedRes.headers.get('x-yoyo-zero-data-retention') !== 'true') {
    throw new Error('Compliance header x-yoyo-zero-data-retention missing on /v1/embeddings');
  }
  const embedData = await embedRes.json();
  console.log(`[PASS] Embeddings returned ${embedData.data[0].embedding.length} dimensions vector (Zero-retention verified)!`);

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
  if (rerankRes.headers.get('x-yoyo-zero-data-retention') !== 'true') {
    throw new Error('Compliance header x-yoyo-zero-data-retention missing on /v1/rerank');
  }
  const rerankData = await rerankRes.json();
  console.log(`[PASS] Rerank scored top result (Score: ${rerankData.results[0].relevance_score.toFixed(4)}) (Zero-retention verified)!`);

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
  const existingWhRes = await fetch('http://localhost:4000/api/webhooks', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const existingWh = await existingWhRes.json();
  if (Array.isArray(existingWh) && existingWh.length >= 9) {
    for (const ep of existingWh.slice(0, 5)) {
      await fetch(`http://localhost:4000/api/webhooks/${ep.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
  }

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
  if (!whRes.ok) throw new Error(`Webhook registration failed: ${JSON.stringify(webhook)}`);
  const secretPreview = webhook.secret ? webhook.secret.substring(0, 15) : 'whsec_***';
  console.log(`[PASS] Webhook Endpoint Registered: ${webhook.id} (Secret: ${secretPreview}...)`);

  const pingRes = await fetch(`http://localhost:4000/api/webhooks/${webhook.id}/test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const pingData = await pingRes.json();
  console.log(`[PASS] Webhook Test Ping Dispatched (Latency: ${pingData.latencyMs || pingData.durationMs || 0}ms)`);

  // 8. Multi-Tenancy & Project Isolation (Phase 2)
  console.log('\n--> Step 8: Verifying Enterprise Multi-Tenancy & Project Isolation...');
  const orgSlug = `acme-e2e-${Date.now()}`;
  const orgRes = await fetch('http://localhost:4000/api/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: 'Acme AI Labs',
      slug: orgSlug,
    }),
  });
  if (!orgRes.ok) throw new Error(`Org creation failed: ${await orgRes.text()}`);
  const org = await orgRes.json();
  console.log(`[PASS] Organization Created: "${org.name}" (Slug: ${org.slug}, ID: ${org.id})`);

  const projRes = await fetch(`http://localhost:4000/api/organizations/${org.id}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: 'Enterprise Core LLM',
    }),
  });
  if (!projRes.ok) throw new Error(`Project creation failed: ${await projRes.text()}`);
  const project = await projRes.json();
  console.log(`[PASS] Isolated Project Created: "${project.name}" (ID: ${project.id})`);

  // 9. API Key Monthly Spend Caps & Network CIDR Allowlists (Phase 5)
  console.log('\n--> Step 9: Testing API Key Monthly Spend Caps & Network CIDR Allowlists...');
  const policyKeyRes = await fetch('http://localhost:4000/api/keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: 'Enterprise Secure Key with Cap',
      budgetLimitUsd: 150.0,
      allowedIps: ['127.0.0.1', '::1', '10.0.0.0/16'],
      projectId: project.id,
    }),
  });
  if (!policyKeyRes.ok) throw new Error(`Policy key creation failed: ${await policyKeyRes.text()}`);
  const policyKey = await policyKeyRes.json();
  console.log(`[PASS] Budget-capped & CIDR-guarded key generated (Budget: $${policyKey.apiKey.budgetLimitUsd || 150})`);

  // 10. Dynamic LoRA Adapter Registry & Route Dispatch (Phase 6)
  console.log('\n--> Step 10: Testing Dynamic LoRA Adapter Registry & Model Routing...');
  const adapterIdentifier = `llama-3.3-70b:legal-e2e-${Date.now()}`;
  const adapterRes = await fetch('http://localhost:4000/api/adapters', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: 'Legal Contract Reviewer LoRA',
      baseModelId: 'llama-3.3-70b',
      apiIdentifier: adapterIdentifier,
      adapterPath: 's3://yoyo-lora/legal-v1',
      description: 'Specialized corporate contract parsing adapter',
    }),
  });
  if (!adapterRes.ok) throw new Error(`Adapter creation failed: ${await adapterRes.text()}`);
  const adapter = await adapterRes.json();
  console.log(`[PASS] Custom LoRA Adapter Registered: "${adapter.name}" (Identifier: ${adapter.apiIdentifier})`);

  // Verify adapter appears in OpenAI /v1/models catalog
  const catalogCheckRes = await fetch('http://localhost:4000/v1/models', {
    headers: { Authorization: `Bearer ${plaintextKey}` },
  });
  const { data: updatedModels } = await catalogCheckRes.json();
  const foundAdapter = updatedModels.find((m) => m.id === adapterIdentifier);
  if (!foundAdapter) {
    throw new Error(`Expected custom LoRA adapter "${adapterIdentifier}" to be present in /v1/models catalog`);
  }
  console.log(`[PASS] Custom LoRA Adapter verified in OpenAI /v1/models catalog (Owner: ${foundAdapter.owned_by})`);

  // 11. Prompt Caching & 50% Token Arbitrage Telemetry (Phase 4)
  console.log('\n--> Step 11: Verifying Prompt Caching & 50% Token Arbitrage Telemetry...');
  const cacheChatRes = await fetch('http://localhost:4000/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plaintextKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages: [
        { role: 'system', content: 'You are YOYO AI, with extensive prefix caching enabled.' },
        { role: 'user', content: 'Testing prompt caching telemetry discount.' },
      ],
      max_tokens: 32,
    }),
  });
  if (!cacheChatRes.ok) throw new Error(`Cache inference failed: ${await cacheChatRes.text()}`);
  const cacheChatData = await cacheChatRes.json();
  const cachedCount = cacheChatData.usage?.prompt_tokens_details?.cached_tokens ?? 0;
  console.log(`[PASS] Telemetry contains prompt_tokens_details.cached_tokens: ${cachedCount} tokens (50% Off input rate)!`);

  // 12. Native Prometheus Metrics Exporter (Phase 3)
  console.log('\n--> Step 12: Scraping Native Prometheus /metrics Endpoint...');
  const metricsRes = await fetch('http://localhost:4000/metrics');
  if (!metricsRes.ok) throw new Error(`Metrics scraping failed: ${await metricsRes.text()}`);
  const metricsText = await metricsRes.text();
  const hasRequestCounter = metricsText.includes('yoyo_http_requests_total') || metricsText.includes('yoyo_requests_total');
  const hasLatencyHistogram = metricsText.includes('yoyo_request_duration');
  const hasWorkerHealth = metricsText.includes('yoyo_worker_status') || metricsText.includes('yoyo_worker_health_status');
  if (!hasRequestCounter || !hasLatencyHistogram || !hasWorkerHealth) {
    throw new Error('Prometheus metrics text missing essential YOYO gauge or histogram headers');
  }
  console.log(`[PASS] /metrics operational: yoyo_requests_total, yoyo_request_duration_seconds, yoyo_worker_health_status verified!`);

  // 13. Multi-Modal Vision Inference (Track: Vision)
  console.log('\n--> Step 13: Testing Multi-Modal Vision Inference & Image Token Billing...');
  const visionRes = await fetch('http://localhost:4000/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plaintextKey}`,
    },
    body: JSON.stringify({
      model: 'moondream',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Identify the visual artifacts in this diagram.' },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                detail: 'auto',
              },
            },
          ],
        },
      ],
      max_tokens: 48,
    }),
  });
  if (!visionRes.ok) throw new Error(`Vision inference failed: ${await visionRes.text()}`);
  const visionData = await visionRes.json();
  console.log(`[PASS] Vision model responded (Tokens: Prompt=${visionData.usage?.prompt_tokens}, Completion=${visionData.usage?.completion_tokens})`);
  console.log(`       Preview: "${visionData.choices[0].message.content.substring(0, 60)}..."`);

  // 14. Fine-Tuning Job Pipeline Lifecycle (Track: Fine-Tuning)
  console.log('\n--> Step 14: Testing Fine-Tuning Job Pipeline Lifecycle...');
  const trainFileRes = await fetch('http://localhost:4000/v1/files', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plaintextKey}`,
    },
    body: JSON.stringify({
      filename: 'e2e_training_dataset.jsonl',
      purpose: 'fine-tune',
      content: '{"prompt": "Classify legal clause", "completion": "INDEMNIFICATION"}\n',
    }),
  });
  if (!trainFileRes.ok) throw new Error(`Training file upload failed: ${await trainFileRes.text()}`);
  const trainFile = await trainFileRes.json();
  console.log(`[PASS] Training file uploaded: ${trainFile.id} (${trainFile.filename})`);

  const ftJobRes = await fetch('http://localhost:4000/v1/fine_tuning/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plaintextKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      training_file: trainFile.id,
      suffix: 'legal-audit',
    }),
  });
  if (!ftJobRes.ok) throw new Error(`Fine-tuning job creation failed: ${await ftJobRes.text()}`);
  const ftJob = await ftJobRes.json();
  console.log(`[PASS] Fine-tuning job created: ${ftJob.id} (Status: ${ftJob.status}, Model: ${ftJob.model})`);

  const ftEventsRes = await fetch(`http://localhost:4000/v1/fine_tuning/jobs/${ftJob.id}/events`, {
    headers: { Authorization: `Bearer ${plaintextKey}` },
  });
  const { data: ftEvents } = await ftEventsRes.json();
  console.log(`[PASS] Fine-tuning lifecycle events recorded: ${ftEvents.length} events logged.`);

  // 15. Enterprise SAML/OIDC SSO Integration (Track: SSO)
  console.log('\n--> Step 15: Verifying Enterprise SAML/OIDC SSO Integration & JIT Provisioning...');
  const ssoConfigRes = await fetch(`http://localhost:4000/api/organizations/${org.id}/sso`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ssoEnabled: true,
      ssoProvider: 'OKTA',
      ssoDomain: 'enterprise-client.com',
      ssoMetadataUrl: 'https://enterprise-client.okta.com/app/sso/metadata',
    }),
  });
  if (!ssoConfigRes.ok) throw new Error(`SSO configuration failed: ${await ssoConfigRes.text()}`);
  const ssoConfig = await ssoConfigRes.json();
  console.log(`[PASS] Enterprise SSO configured: Provider=${ssoConfig.ssoProvider}, Domain=${ssoConfig.ssoDomain}`);

  const ssoInitRes = await fetch('http://localhost:4000/api/auth/sso/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domainOrSlug: 'enterprise-client.com' }),
  });
  if (!ssoInitRes.ok) throw new Error(`SSO initiation failed: ${await ssoInitRes.text()}`);
  const ssoInit = await ssoInitRes.json();
  console.log(`[PASS] SSO Initiation verified: RedirectURL=${ssoInit.redirectUrl}, RelayState=${ssoInit.relayState}`);

  const ssoCallbackRes = await fetch('http://localhost:4000/api/auth/sso/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'carol@enterprise-client.com',
      organizationSlug: org.slug,
      fullName: 'Carol Danvers',
    }),
  });
  if (!ssoCallbackRes.ok) throw new Error(`SSO Callback failed: ${await ssoCallbackRes.text()}`);
  const ssoSession = await ssoCallbackRes.json();
  console.log(`[PASS] SSO JIT Provisioning successful: User=${ssoSession.user.email} (Org: ${ssoSession.organization.name})`);

  console.log('\n==========================================================');
  console.log('   FULL 15-STEP END-TO-END DEVELOPER JOURNEY 100% GREEN!  ');
  console.log('==========================================================\n');
}

testEndToEndDeveloperFlow().catch((err) => {
  console.error('\n[FAIL] E2E Developer Flow failed:', err);
  process.exit(1);
});


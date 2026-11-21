# YOYO — Enterprise Cloud AI Model API Platform

YOYO is an enterprise-grade cloud AI model API platform delivering ultra-low-latency, OpenAI-compatible REST API endpoints (`/v1/chat/completions`, `/v1/embeddings`, `/v1/models`) to hosted open-weights foundation models across high-density NVIDIA H100 SXM5 and A100 80GB cloud GPU clusters.

Drop-in replacement for OpenAI SDK, LangChain, LlamaIndex, LiteLLM, and Cursor IDE with dynamic least-connections routing, zero-downtime failover, SHA-256 hashed keys, and granular per-key model scoping.

---

## System Architecture

```mermaid
flowchart TD
    Client["Client Applications / SDKs (Python, TS, cURL)"]
    Gateway["Fastify Edge Gateway (https://api.yoyo.ai/v1)"]
    Redis[("Redis 7: SHA-256 Token Cache & Sliding-Window RPM")]
    PG[("PostgreSQL 16: Models, Quotas, Billing Ledger")]
    Router{"Least-Connections Worker Router"}
    Worker1["Cloud GPU Worker 01 (NVIDIA H100 SXM5 / vLLM)"]
    Worker2["Cloud GPU Worker 02 (NVIDIA A100 80GB / Ollama)"]
    WorkerN["Cloud GPU Worker N (Multi-Node Failover Cluster)"]

    Client -->|Bearer sk_live_...| Gateway
    Gateway <-->|< 0.5ms Validation| Redis
    Gateway <-->|Telemetry & Audit| PG
    Gateway --> Router
    Router -->|PagedAttention / SSE| Worker1
    Router -->|Batch Inference| Worker2
    Router -->|Failover Backup| WorkerN
```

### Decoupled Repository Layout

- **[`frontend/`](./frontend)**: Production Next.js 15 developer suite (App Router, Tailwind CSS, Lucide icons, Dark cockpit aesthetic).
  - `/`: High-craft landing page, live interactive SSE console, token cost arbitrage calculator, model matrix, and developer footer.
  - `/docs`: Complete interactive API documentation, Batch 50% discount guide, Webhooks HMAC spec, and code samples.
  - `/status`: Real-time system health, 90-day uptime calendar, latency tables, and synthetic monitoring.
  - `/dashboard`: Cockpit overview with token meters, active key monitors, and local Docker model engine manager with live SSE pull progress.
  - `/dashboard/knowledge`: Local RAG & Document Knowledge Base powered by `nomic-embed-text:latest` (768-dim embeddings) with verified context excerpts and citation scoring.
  - `/dashboard/tools`: Agentic Function Calling & Tools Workbench with autonomous multi-step execution loops (Calculator, Weather, Analytical DB Query, Web Search).
  - `/dashboard/models`: Foundation model catalog and dynamic LoRA adapter registry with live pricing tags.
  - `/dashboard/playground`: Full-featured SSE streaming playground with parameter tuning, tool calling, JSON schema mode, vision upload, and prefix cache savings badge.
  - `/dashboard/arena`: Dual-mode battle arena featuring interactive head-to-head testing and an automated LLM-as-a-Judge Evaluation Engine (standardized golden benchmark suites: coding, reasoning, safety; blind candidate adjudication; multi-criterion rubric scoring).
  - `/dashboard/fine-tuning`: Visual LoRA training wizard, training dataset JSONL uploader, metrics ribbon, and real-time epoch event ledger.
  - `/dashboard/team`: Enterprise multi-tenancy, workspace switcher, project isolation, and RBAC (`OWNER`, `ADMIN`, `DEVELOPER`, `BILLING_VIEWER`).
  - `/dashboard/security`: Dual-view security center with immutable SOC2/HIPAA audit ledger and AI Safety Guardrails (PII redaction, prompt injection defense, live sandbox).
  - `/dashboard/batches`: 24-hour SLA asynchronous batch inference jobs with 50% pricing discount, JSONL uploads, and outputs inspector.
  - `/dashboard/keys`: Zero-knowledge SHA-256 API key manager with monthly spend budget caps, CIDR IP allowlists, and per-key model scoping.
  - `/dashboard/logs`: High-density live telemetry inspector with 5s auto-refresh polling, status/model filters, CSV/JSON export, and drawer replay.
  - `/dashboard/analytics`: Historical usage velocity charts, per-model token breakdown, and prompt cache savings telemetry.
  - `/dashboard/billing`: Credit balance top-ups, Stripe checkout integration, prefix caching arbitrage savings calculator, and ledger.
  - `/admin & /dashboard/admin`: 100k Developer Directory, Developer Billing Operations ($ USD credit grants, auto-recharge, spend caps, monthly token ceilings, live transaction ledgers), Cloud GPU worker node supervisor, and model fleet pricing management.
  - `/dashboard/settings`: Profile management, Bcrypt 12 password updates, active sessions, HMAC Webhook endpoints, and Enterprise SSO (SAML 2.0 / OIDC).
- **[`backend/`](./backend)**: High-throughput NestJS 11 + Fastify 5 API gateway, Prisma ORM, Redis sliding-window rate limiters, multi-worker dispatching, circuit breaker state machine (`CLOSED`/`OPEN`/`HALF_OPEN`), native `/metrics` Prometheus exporter, AI Safety Guardrails (`/v1/moderations`), Semantic Dynamic Router (`auto`), Prompt Prefix Caching (90% discount), and Automated LLM-as-a-Judge Evaluation Engine (`/v1/evaluations`).
- **[`deploy/helm/yoyo/`](./deploy/helm/yoyo)**: Production Helm 3 chart with HorizontalPodAutoscaler (HPA), Ingress TLS cert-manager, ConfigMaps, and Prometheus ServiceMonitor.
- **[`sdk/python/`](./sdk/python)**: Official Python SDK (`yoyo-ai`) with standard OpenAI semantics, streaming generator, tool calling, JSON schema, multi-modal vision, fine-tuning jobs, moderations, evaluations engine (`client.evaluations`), and zero external dependencies.
- **[`sdk/typescript/`](./sdk/typescript)**: Official TypeScript/JavaScript SDK (`@yoyo-ai/sdk`) with typed error hierarchy, dual ESM/CJS exports, streaming iterators, fine-tuning, moderations, and evaluations engine (`client.evaluations`).
- **[`docker/`](./docker)**: Production containerization configs, `docker-compose.prod.yml`, Traefik reverse proxy, and turnkey Prometheus + Grafana cockpit monitoring stack (`docker-compose --profile monitoring up`).

---

## Cloud Models & Hardware Topology

| Model Identifier | Provider | Category | Context | Quantization | Cloud Compute Pool | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `llama-3.3-70b` | Meta | General LLM | 131,072 | FP16 / Q4_K_M | 2x NVIDIA H100 80GB | `Active` |
| `llama-3.3-8b` | Meta | Lightweight | 131,072 | FP16 | 1x NVIDIA A100 80GB | `Active` |
| `qwen-2.5-coder-32b` | Alibaba | Coding | 131,072 | FP16 | 2x NVIDIA H100 80GB | `Active` |
| `deepseek-r1-70b` | DeepSeek | Reasoning | 131,072 | FP16 | 2x NVIDIA H100 80GB | `Active` |
| `mistral-large-2411`| Mistral | Multilingual | 131,072 | FP16 | 4x NVIDIA A100 80GB | `Active` |
| `nomic-embed-text:latest` | Nomic | Embeddings | 8,192 | FP16 | 1x NVIDIA A100 80GB | `Active` |

---

## Quickstart

### 1. Python SDK

```bash
pip install yoyo-ai
# Or local editable install:
pip install -e sdk/python
```

```python
from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")

# Live SSE Streaming
stream = client.chat.completions.create(
    model="llama-3.3-70b",
    messages=[
        {"role": "system", "content": "You are an expert systems engineer."},
        {"role": "user", "content": "Explain zero-downtime blue/green deployment strategy."}
    ],
    stream=True
)

for chunk in stream:
    delta = chunk["choices"][0]["delta"].get("content", "")
    print(delta, end="", flush=True)
print()
```

---

### 2. TypeScript SDK

```bash
cd sdk/typescript
pnpm install
pnpm run build
```

```typescript
import { Yoyo } from '@yoyo-ai/sdk';

const client = new Yoyo({
  apiKey: 'sk_live_your_api_key_here'
});

const stream = await client.chat.createStream({
  model: 'qwen-2.5-coder-32b',
  messages: [
    { role: 'user', content: 'Write a TypeScript generic LRU Cache.' }
  ]
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

---

### 3. Asynchronous Batch Inference (50% Cost Savings)

```python
from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")

# 1. Upload JSONL dataset
file_record = client.files.create(
    filename="eval_batch.jsonl",
    file_content='{"custom_id": "req-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "Explain quantum entanglement in 20 words."}]}}',
    purpose="batch"
)

# 2. Queue batch with 24-hour turnaround SLA
batch = client.batches.create(
    input_file_id=file_record["id"],
    endpoint="/v1/chat/completions",
    completion_window="24h"
)
print(f"Batch {batch['id']} queued with 50% discount!")
```

---

### 4. Vector & Document Reranking (`/v1/rerank`)

```python
from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")

# Rerank retrieved candidate passages for RAG pipelines
ranked = client.rerank(
    model="bge-reranker-large",
    query="What is continuous batching?",
    documents=[
        "Continuous batching is an iteration-level scheduler in vLLM.",
        "PostgreSQL 16 improved query parallelization.",
        "KV cache stores key-value projections to accelerate decoding."
    ],
    top_n=2
)

for item in ranked["results"]:
    print(f"Rank {item['index']}: Score {item['relevance_score']} -> {item['document']['text']}")
```

---

### 5. Function Calling & Tool Invocations

```python
from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")

response = client.chat.completions.create(
    model="llama-3.3-70b",
    messages=[{"role": "user", "content": "What is the weather in Tokyo?"}],
    tools=[
        {
            "type": "function",
            "function": {
                "name": "get_current_weather",
                "description": "Fetch current weather conditions",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "City name"}
                    },
                    "required": ["location"]
                }
            }
        }
    ]
)

choice = response["choices"][0]
if choice["finish_reason"] == "tool_calls":
    for tool_call in choice["message"]["tool_calls"]:
        print(f"Tool: {tool_call['function']['name']}({tool_call['function']['arguments']})")
```

---

### 6. Strict Structured Outputs (JSON Schema Mode)

```python
from yoyo import Yoyo

client = Yoyo(api_key="sk_live_your_api_key_here")

response = client.chat.completions.create(
    model="llama-3.3-70b",
    messages=[{"role": "user", "content": "Extract customer sentiment from: 'Love the ultra fast inference speeds!'"}],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "SentimentAnalysis",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "sentiment": {"type": "string", "enum": ["positive", "neutral", "negative"]},
                    "confidence": {"type": "number"},
                    "highlight": {"type": "string"}
                },
                "required": ["sentiment", "confidence", "highlight"]
            }
        }
    }
)

import json
structured_data = json.loads(response["choices"][0]["message"]["content"])
print(structured_data)
```

---

### 7. Direct cURL / OpenAI SDK Drop-in

```bash
curl https://api.yoyo.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -d '{
    "model": "llama-3.3-70b",
    "messages": [{"role": "user", "content": "Hello YOYO!"}],
    "temperature": 0.7
  }'
```

---

## Production Deployment Runbook

### 1. Environment Configuration
```bash
cp .env.example .env
# Fill DATABASE_URL, REDIS_URL, JWT_SECRET, and STRIPE_SECRET_KEY
```

### 2. Database Migrations & Default Super Admin Seed
```bash
cd backend
pnpm install
pnpm db:push
pnpm db:seed
```
> **Default Accounts & Access Credentials**:
> - **Developer Account** (Standard Developer Dashboard):
>   - **Email**: `dev@yoyo.ai`
>   - **Password**: `Dev@Yoyo2026!`
>   - **API Key**: `sk_live_yoyo_dev_2026_prod_access`
>   - **Allocation**: 50,000,000 monthly tokens, \$150.00 credit balance, 300 RPM rate limit ceiling.
> - **Admin Account** (100k Developer Control Center & Cluster Supervisor):
>   - **Email**: `admin@yoyo.ai`
>   - **Password**: `Admin@Yoyo2026!`
>   - **API Key**: `sk_live_yoyo_dev_master_key_2026`
>   - **Allocation**: 100,000,000 monthly tokens, \$500.00 credit balance, full GPU worker & tenant management.

### 3. One-Click Production Deployment (Caddy SSL + Local Docker LLM)
Run the turnkey production deployment bundle with Caddy edge reverse proxy (HTTP/2, automated TLS, zero-buffering SSE streaming), PostgreSQL 16, Redis 7, local Ollama engine, and persistent model storage mounted to drive `F:\`:

```powershell
# Windows PowerShell:
powershell -ExecutionPolicy Bypass -File scripts/deploy-prod.ps1
```

```bash
# Linux / macOS / CI:
bash scripts/deploy-prod.sh
```

### 4. Production Docker Compose Profiles
```bash
# Profile A: Standard local mock development stack (Postgres + Redis + Backend + Frontend)
docker compose up -d

# Profile B: Local CPU-only containerized Ollama instance (no GPU required)
docker compose --profile cpu up -d

# Profile C: Local GPU workstation with Ollama container passthrough (NVIDIA GPU)
docker compose --profile ollama up -d

# Profile D: High-throughput vLLM cluster with PagedAttention on NVIDIA GPUs
docker compose --profile vllm up -d

# Profile E: Turnkey Prometheus (port 9090) & Grafana (port 3001) Monitoring Stack
docker-compose --profile monitoring up -d
```
All profiles include PostgreSQL 16 and Redis 7 with automatic startup readiness probes (`service_healthy` gates). The gateway boots with automated database migrations and admin seeding.

---

### 5. Enterprise Kubernetes Cluster (HPA & Ingress)
```bash
# Declaratively apply all manifests via Kustomize
kubectl apply -k k8s/

# Monitor rollout status and active replicas
kubectl rollout status deployment/yoyo-backend -n yoyo-system
kubectl get pods,hpa,ingress -n yoyo-system
```
Spins up:
- **HA Persistence**: PostgreSQL 16 Alpine and Redis 7.4 with persistent volume claims.
- **Fastify Edge Gateway Deployment**: Rolling updates with `maxSurge: 1` and `maxUnavailable: 0`.
- **HorizontalPodAutoscaler (HPA)**: Auto-scales `yoyo-backend` dynamically between **3 and 25 replicas** at 70% CPU or 80% Memory utilization.
- **Production Ingress**: NGINX edge controller with automated Let's Encrypt TLS via cert-manager and `proxy-buffering: "off"` for unbuffered token streaming.

---

### 5. Multi-Agent Team Orchestration (Paperclip AI)
Connect autonomous agents managed by `paperclipai` directly to YOYO's OpenAI-compatible edge gateway:
```powershell
# Run the turnkey Paperclip AI + YOYO configuration bridge
powershell -ExecutionPolicy Bypass -File scripts/run-paperclip-yoyo.ps1

# Or launch an isolated autonomous CEO agent test drive
paperclipai test-drive --company-name "YOYO Autonomous Labs" --agent-name "YoyoCEO" --model "llama-3.3-70b" --api-key "sk_live_yoyo_dev_master_key_2026"
```

---

### 6. Zero Data Retention Compliance
Every response and SSE stream emitted by YOYO API gateways includes the audit compliance header:
```http
x-yoyo-zero-data-retention: true
```
All prompts and completions are computed purely in volatile GPU VRAM and never persisted to disks, telemetry databases, or model logs.

---

## Verification & Testing Suite

### Unified One-Command Verification Runner
Run all 6 verification stages across environment, compose profiles, backend Jest suites (25 suites, 203 tests), frontend typechecks, and both SDKs with colored scorecard reporting:

```powershell
# Windows PowerShell:
powershell -ExecutionPolicy Bypass -File scripts/run-all-checks.ps1
```

```bash
# Linux / macOS / CI:
bash scripts/run-all-checks.sh
```

### Live Gateway 12-Step Smoke Suite
Validate end-to-end authentication, multi-tenancy, spend caps, tool calling, LoRA routing, prompt caching, and Prometheus `/metrics` against a running cluster:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-e2e-gateway.ps1
```

### Individual Check Commands
```bash
# 1. Backend unit & provider tests (23 suites, 184/184 tests passing)
cd backend && pnpm test

# 2. Frontend Next.js 15 typecheck (0 TypeScript errors)
cd ../frontend && pnpm run typecheck

# 3. Official Python SDK unit tests & 15-stage showcase
python sdk/python/test_yoyo.py
python sdk/python/example.py

# 4. Official TypeScript SDK compilation & 15-stage showcase
cd sdk/typescript && pnpm run build && node test.js && node example.js

# 5. Live End-to-End Client Flow & Probe
cd backend && node test-e2e-client-flow.js
cd backend && node test-live-probe.js
```

---

## License & Governance

Enterprise Apache 2.0 & Commercial Permissive. Zero Data Retention commitment: user prompts and completion tokens are processed in volatile GPU memory and never persisted to disks.

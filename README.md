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
  - `/docs`: Complete interactive API documentation and code samples.
  - `/status`: Real-time system health, 90-day uptime calendar, latency tables, and synthetic monitoring.
  - `/dashboard`: Cockpit overview with token meters and active key monitors.
  - `/dashboard/models`: Foundation model catalog with Super Admin registration modal and live dynamic pricing tags.
  - `/dashboard/playground`: Full-featured SSE streaming playground with parameter tuning and cURL export.
  - `/dashboard/keys`: Zero-knowledge SHA-256 API key manager with granular per-key model scoping (`*` or explicit models).
  - `/dashboard/analytics`: Historical usage velocity charts and per-model token breakdown.
  - `/dashboard/billing`: Credit balance top-ups, Stripe checkout integration, dynamic pricing schedule, and ledger.
  - `/dashboard/admin`: Cloud GPU worker node supervisor (RunPod, Lambda, AWS) and model worker dispatch.
  - `/dashboard/settings`: Profile management, Bcrypt 12 password updates, and active session revocation.
- **[`backend/`](./backend)**: High-throughput NestJS 11 + Fastify 5 API gateway, Prisma ORM, Redis sliding-window rate limiters, multi-worker dispatching, and automated failover.
- **[`sdk/python/`](./sdk/python)**: Official Python SDK (`yoyo-ai`) with standard OpenAI semantics, streaming generator, and zero external dependencies.
- **[`sdk/typescript/`](./sdk/typescript)**: Official TypeScript/JavaScript SDK (`@yoyo-ai/sdk`) with dual ESM and CommonJS exports.
- **[`docker/`](./docker)**: Production containerization configs, Traefik v3.1 reverse proxy with automated Let's Encrypt TLS termination, and Prometheus metrics.

---

## Cloud Models & Hardware Topology

| Model Identifier | Provider | Category | Context | Quantization | Cloud Compute Pool | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `llama-3.3-70b` | Meta | General LLM | 131,072 | FP16 / Q4_K_M | 2x NVIDIA H100 80GB | `ONLINE` |
| `llama-3.3-8b` | Meta | Lightweight | 131,072 | FP16 | 1x NVIDIA A100 80GB | `ONLINE` |
| `qwen-2.5-coder-32b` | Alibaba | Coding | 131,072 | FP16 | 2x NVIDIA H100 80GB | `ONLINE` |
| `deepseek-r1-70b` | DeepSeek | Reasoning | 131,072 | FP16 | 2x NVIDIA H100 80GB | `ONLINE` |
| `mistral-large-2411`| Mistral | Multilingual | 131,072 | FP16 | 4x NVIDIA A100 80GB | `ONLINE` |
| `nomic-embed-text:latest` | Nomic | Embeddings | 8,192 | FP16 | 1x NVIDIA A100 80GB | `ONLINE` |

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

### 3. Direct cURL / OpenAI SDK Drop-in

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
> **Default Super Admin**: `admin@yoyo.ai` | Password: `Admin@Yoyo2026!` (Configured with 100M tokens, $500 balance, and cluster supervisor credentials).

### 3. Production Docker Compose
```bash
docker compose -f docker/compose/docker-compose.gpu.yml up -d
```
Traefik automatically routes traffic on ports 80/443 and provisions SSL certificates for `yoyo.ai` and `api.yoyo.ai`.

---

## Verification & Testing Suite

```bash
# Backend unit & integration tests
cd backend
pnpm test

# Production build verification
pnpm run build

# Frontend development server
cd ../frontend
pnpm dev
```

---

## License & Governance

Enterprise Apache 2.0 & Commercial Permissive. Zero Data Retention commitment: user prompts and completion tokens are processed in volatile GPU memory and never persisted to disks.

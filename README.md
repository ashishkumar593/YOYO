# YOYO — Production-Grade AI Model API Platform

YOYO is an enterprise-grade, self-hosted AI Model API SaaS platform engineered to deliver low-latency, OpenAI-compatible REST API access (`/v1/chat/completions`, `/v1/embeddings`, `/v1/models`) to open-source foundation models (Llama 3.3, Qwen 2.5, DeepSeek R1, Mistral, and specialized coding models).

---

## Architecture Overview

The repository is partitioned into distinct, decoupled tiers:

- **[`backend/`](./backend)**: High-throughput API gateway, authentication, model registry, inference provider abstraction layer (Ollama runtime), BullMQ background worker queue, and PostgreSQL database schema via Prisma ORM.
- **[`frontend/`](./frontend)**: Modern developer web portal built with Next.js 15, Tailwind CSS, and Shadcn UI. Features an interactive model playground, API key manager, token usage analytics, and Super Admin control center.
- **[`docker/`](./docker)**: Containerized deployment configurations, Docker Compose recipes for CPU development and multi-GPU production with NVIDIA Container Toolkit, and Traefik reverse proxy.
- **[`doc/`](./doc)**: Master phase-wise implementation plans and architectural blueprints.

---

## Quick Start (Development)

### 1. Prerequisites
- Node.js >= 20.x
- pnpm >= 9.x
- Docker & Docker Compose
- (Optional) NVIDIA GPU with drivers >= 550 for local model acceleration

### 2. Backend Setup
```bash
cd backend
pnpm install
cp .env.example .env
pnpm db:generate
pnpm start:dev
```

### 3. Frontend Setup
```bash
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```


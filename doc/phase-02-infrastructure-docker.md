# Phase 02: Infrastructure & Docker Setup

## 1. Objective
Design and implement the Docker containerization infrastructure. Set up segregated networks, persistent volume mappings for model storage and database state, and environment-driven configurations that seamlessly toggle between CPU-only development and production GPU acceleration via NVIDIA Container Toolkit.

---

## 2. Deliverables Checklist
- [ ] Network topology with 3 segregated Docker networks:
  - `yoyo-public-net`: External access (Traefik reverse proxy).
  - `yoyo-internal-net`: Secure application network (Web, API, Worker, DB, Redis).
  - `yoyo-inference-net`: Dedicated high-throughput inference worker network.
- [ ] Service configurations:
  - Traefik v3 reverse proxy with Let's Encrypt SSL automation.
  - PostgreSQL 16 container with persistent volume and healthcheck probes.
  - Redis 7 container with AOF/RDB persistence and password authentication.
  - Ollama inference worker containers with GPU passthrough (`deploy.resources.reservations.devices`).
- [ ] Docker Compose variants:
  - `docker/compose/docker-compose.dev.yml`: Local dev with mock/CPU workers.
  - `docker/compose/docker-compose.gpu.yml`: Staging/production multi-worker GPU stack.
- [ ] Dockerfiles:
  - `apps/api/Dockerfile` (Multi-stage build).
  - `apps/web/Dockerfile` (Next.js standalone multi-stage build).
  - `apps/worker/Dockerfile` (Lightweight Node.js background runner).
- [ ] Host setup automation script: `scripts/setup-host.sh` verifying NVIDIA drivers and Docker runtime.

---

## 3. Key Environment Variables
```env
# Application Ports
API_PORT=4000
WEB_PORT=3000
REDIS_PORT=6379
POSTGRES_PORT=5432

# Database & Cache
DATABASE_URL=postgresql://yoyo_user:yoyo_secure_pass@postgres:5432/yoyo_db?schema=public
REDIS_URL=redis://:yoyo_redis_pass@redis:6379/0

# Model Worker Endpoints
OLLAMA_WORKER_0_URL=http://ollama-worker-gpu0:11434
OLLAMA_WORKER_1_URL=http://ollama-worker-gpu1:11434
MODEL_STORAGE_PATH=/var/lib/yoyo/models
```

---

## 4. Acceptance Criteria
1. `docker compose -f docker/compose/docker-compose.dev.yml up -d` boots all baseline services.
2. PostgreSQL and Redis pass automated container health checks.
3. Ollama container responds with HTTP 200 on `/api/version`.
4. Inference containers cannot be reached directly from external public ports (only via API gateway network).


# Phase 12: Production Deployment & Scalability

## 1. Objective
Prepare and execute the production release of YOYO. Configure host-level performance tuning, automated SSL certificates via Traefik, Prometheus and Grafana observability dashboards, automated database backup pipelines, and disaster recovery procedures.

---

## 2. Deliverables Checklist
- [ ] Production Server Hardening (`scripts/setup-host.sh`):
  - Ubuntu 22.04 LTS host configuration.
  - Install NVIDIA Driver 550+, CUDA 12+, Docker, and NVIDIA Container Toolkit.
  - Increase system file descriptor limits (`fs.file-max = 2097152`, `nofile = 65536`).
- [ ] Observability & Monitoring:
  - Prometheus configuration scraping:
    - API Gateway metrics (`/metrics`: request duration, status codes, active SSE connections).
    - Host GPU metrics via `dcgm-exporter` (VRAM utilization, temperature, wattage).
  - Grafana dashboard JSON templates with pre-configured alerting thresholds.
- [ ] Automated Backup Pipeline (`scripts/backup-db.sh`):
  - Daily pg_dump with Gzip compression and encrypted upload to S3/Cloud Storage.
  - 30-day retention policy and automated restoration test script.
- [ ] Disaster Recovery Runbook (`doc/disaster-recovery.md`):
  - Step-by-step instructions to rebuild full platform on a brand-new bare-metal GPU server within 60 minutes.

---

## 3. Production Deployment Architecture
```
Public Internet
      │
      ▼
Traefik Reverse Proxy (Ports 80/443 - Automated ACME TLS)
      │
      ├───────────────────────┬────────────────────────┐
      ▼                       ▼                        ▼
Next.js (Web:3000)      NestJS (API:4000)      Grafana (Port 3001)
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       Postgres 16 / Redis 7        Ollama GPU Workers (GPU 0 / GPU 1)
```

---

## 4. Acceptance Criteria
1. Web and API resolve cleanly over HTTPS with valid SSL certificates.
2. Prometheus and Grafana visualize active GPU memory and API request rates.
3. Automated backup script successfully executes and produces a verified PostgreSQL dump.


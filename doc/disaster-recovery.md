# YOYO — Disaster Recovery & Cold-Boot Runbook

## 1. Overview
This runbook describes the procedure to rebuild and recover the complete **YOYO** platform from scratch on a brand-new bare-metal GPU server or cloud instance within 60 minutes.

---

## 2. Recovery Objective & SLAs
- **Recovery Time Objective (RTO)**: $\le 60\text{ minutes}$ (includes model weight downloads)
- **Recovery Point Objective (RPO)**: $\le 24\text{ hours}$ (backed up daily via `scripts/backup-db.sh`)

---

## 3. Step-by-Step Restoration Procedure

### Step 1: Provision Host & Execute Setup Script
On a fresh Ubuntu 22.04 LTS server with NVIDIA GPUs:
```bash
git clone <your-repo-url> /opt/yoyo
cd /opt/yoyo
chmod +x scripts/*.sh
sudo ./scripts/setup-host.sh
```

### Step 2: Restore Database from S3 / Encrypted Backup
```bash
# Start only postgres to accept restoration
docker compose -f docker/compose/docker-compose.gpu.yml up -d postgres

# Decompress and restore database
gunzip -c /var/backups/yoyo/yoyo_db_latest.sql.gz | docker exec -i yoyo-postgres-prod psql -U yoyo_user -d yoyo_db
```

### Step 3: Launch Cluster Services
```bash
docker compose -f docker/compose/docker-compose.gpu.yml up -d
```

### Step 4: Warm Inference Models
Trigger the background pull process for foundation models:
```bash
docker exec -it yoyo-ollama-gpu0 ollama pull llama3.3:8b
docker exec -it yoyo-ollama-gpu0 ollama pull qwen2.5-coder:7b
docker exec -it yoyo-ollama-gpu1 ollama pull deepseek-r1:8b
```

### Step 5: Verification & Health Checks
```bash
curl -I https://api.yoyo.ai/v1/health
curl -I https://yoyo.ai
```
Expected response: `HTTP/2 200 OK`.


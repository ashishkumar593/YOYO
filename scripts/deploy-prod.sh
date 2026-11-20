#!/usr/bin/env bash
# ==============================================================================
# YOYO Cloud AI Platform — One-Click Production Deployment Script (Bash / Linux)
# ==============================================================================
set -e

echo "======================================================================"
echo "  YOYO Cloud AI Platform — Production Cluster Deployment"
echo "======================================================================"

# 1. Verify Docker
echo ""
echo "[1/4] Verifying Docker daemon..."
if ! docker info >/dev/null 2>&1; then
    echo "[ERROR] Docker is not running. Please start Docker."
    exit 1
fi
echo "[OK] Docker daemon is running."

# 2. Storage check
echo ""
echo "[2/4] Verifying model storage volume directory..."
mkdir -p ./data/ollama
echo "[OK] Model storage directory verified at ./data/ollama"

# 3. Pull base images
echo ""
echo "[3/4] Pulling verified infrastructure images..."
docker compose -f docker-compose.prod.yml pull postgres redis ollama proxy

# 4. Deploy production stack
echo ""
echo "[4/4] Starting production stack with Caddy Reverse Proxy & SSL..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "======================================================================"
echo "  YOYO PRODUCTION CLUSTER DEPLOYED SUCCESSFULLY!"
echo "======================================================================"
echo "  Edge Gateway & API: https://localhost/v1 or http://localhost/v1"
echo "  Developer Dashboard: http://localhost"
echo "  Direct Backend Port: http://localhost:4000"
echo "  Direct Frontend Port: http://localhost:3000"
echo "  Local Ollama Engine: http://localhost:11434"
echo "======================================================================"

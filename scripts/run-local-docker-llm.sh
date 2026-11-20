#!/usr/bin/env bash
# ==============================================================================
# YOYO Cloud AI Platform — Local Docker LLM Runner & Model Provisioner
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
MODEL_DATA_DIR="$ROOT_DIR/data/ollama"

echo -e "\n========================================================"
echo -e " 🚀 YOYO Local Docker LLM Provisioner"
echo -e "========================================================\n"

# 1. Create model data directory
mkdir -p "$MODEL_DATA_DIR"
echo -e "[1/4] Local model directory ready: $MODEL_DATA_DIR"

# 2. Check Docker
echo -e "\n[2/4] Verifying Docker status..."
if ! docker info >/dev/null 2>&1; then
    echo -e "[ERROR] Docker is not running. Please start Docker first."
    exit 1
fi
echo -e "[OK] Docker is running."

# 3. Start Ollama container
echo -e "\n[3/4] Launching yoyo-ollama Docker container on port 11434..."
cd "$ROOT_DIR"
docker compose up -d ollama

# Wait for Ollama
echo "Waiting for Ollama to accept connections..."
until curl -s http://localhost:11434/api/version >/dev/null 2>&1; do
    sleep 2
done
echo -e "[OK] Ollama Docker container active."

# 4. Pull models
echo -e "\n[4/4] Installing local open-weights LLMs inside Docker..."
docker exec yoyo-ollama ollama pull llama3.2:1b
docker exec yoyo-ollama ollama pull qwen2.5-coder:1.5b

echo -e "\n========================================================"
echo -e " ✅ LOCAL DOCKER LLM MODELS SUCCESSFULLY INSTALLED!"
echo -e "========================================================"
docker exec yoyo-ollama ollama list

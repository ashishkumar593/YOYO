#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "    YOYO AI Platform - Host Setup & NVIDIA Verification   "
echo "=========================================================="

# 1. Verify NVIDIA Driver
if command -v nvidia-smi &> /dev/null; then
    echo "✔ NVIDIA Driver detected:"
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
else
    echo "⚠ Warning: nvidia-smi not found. If this is a GPU server, install NVIDIA driver 550+."
fi

# 2. Check Docker installation
if command -v docker &> /dev/null; then
    echo "✔ Docker version: $(docker --version)"
else
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
fi

# 3. Setup Persistent Storage Paths
echo "Configuring model and database volume directories..."
sudo mkdir -p /var/lib/yoyo/models
sudo mkdir -p /var/lib/yoyo/postgres_data
sudo mkdir -p /var/lib/yoyo/redis_data
sudo chmod -R 775 /var/lib/yoyo

# 4. Kernel Performance Tuning for High-Concurrency SSE Streams
echo "Applying Linux kernel socket parameters..."
sudo sysctl -w fs.file-max=2097152
sudo sysctl -w net.core.somaxconn=65535
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535

echo "✔ Host setup complete. Ready to deploy YOYO with Docker Compose."


#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "    Starting YOYO AI Model API Platform (Local Dev)       "
echo "=========================================================="

# 1. Start Docker services (PostgreSQL & Redis)
echo -e "\n[1/3] Starting PostgreSQL and Redis containers..."
docker compose -f docker/compose/docker-compose.dev.yml up -d postgres redis

# 2. Wait for database
echo -e "\n[2/3] Waiting for database to be ready..."
sleep 3

# 3. Generate Prisma client, sync schema & seed default models
echo -e "\n[3/3] Generating Prisma client and seeding foundation models..."
cd backend
pnpm db:generate
pnpm db:push
pnpm db:seed
cd ..

echo -e "\n✔ Database & Cache are ready!"
echo "=========================================================="
echo "To launch YOYO services:"
echo "  Terminal 1 (Backend):  cd backend && pnpm start:dev"
echo "  Terminal 2 (Frontend): cd frontend && pnpm dev"
echo "=========================================================="


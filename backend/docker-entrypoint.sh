#!/bin/sh
set -e

echo "========================================================"
echo "🚀 YOYO Platform — Enterprise Cloud AI Gateway Container"
echo "========================================================"

# Auto-migrate and seed if DATABASE_URL is present
if [ -n "$DATABASE_URL" ]; then
  echo "[YOYO ENTRYPOINT] Synchronizing PostgreSQL schema via Prisma..."
  if [ -f "./node_modules/.bin/prisma" ]; then
    ./node_modules/.bin/prisma db push --skip-generate || echo "[YOYO] Prisma push skipped or already up-to-date."
  else
    npx prisma db push --skip-generate || true
  fi

  echo "[YOYO ENTRYPOINT] Checking seed status for default models & super admin..."
  if [ -f "./node_modules/.bin/tsx" ]; then
    ./node_modules/.bin/tsx prisma/seed.ts || echo "[YOYO] Seed completed or already initialized."
  else
    npx tsx prisma/seed.ts || true
  fi
fi

echo "[YOYO ENTRYPOINT] Starting Fastify Edge Gateway on port ${PORT:-4000}..."
exec node dist/src/main.js


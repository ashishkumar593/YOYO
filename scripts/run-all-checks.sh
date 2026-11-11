#!/usr/bin/env bash
# ==============================================================================
# YOYO Cloud AI Platform — Unified Health & Verification Suite (Bash)
# ==============================================================================

set -eo pipefail

START_TIME=$(date +%s)
PASSED=0
FAILED=0
STEP_NUM=1

echo -e "\033[1;36m======================================================================\033[0m"
echo -e "\033[1;36m   YOYO CLOUD AI MODEL API PLATFORM — UNIFIED VERIFICATION SUITE       \033[0m"
echo -e "\033[1;36m======================================================================\033[0m"

run_step() {
  local name="$1"
  shift
  echo -e "\n\033[1;33m[$STEP_NUM] Checking: $name ...\033[0m"
  local step_start=$(date +%s)
  if "$@"; then
    local step_end=$(date +%s)
    local duration=$((step_end - step_start))
    echo -e "  \033[1;32m✔ PASS: $name (${duration}s)\033[0m"
    PASSED=$((PASSED + 1))
  else
    echo -e "  \033[1;31m✘ FAIL: $name\033[0m"
    FAILED=$((FAILED + 1))
  fi
  STEP_NUM=$((STEP_NUM + 1))
}

# 1. Environment & Tools
run_step "Node.js & pnpm runtime environment" bash -c 'node --version && pnpm --version'

# 2. Docker Compose Profiles
run_step "Docker Compose Profiles (Default, Ollama, vLLM)" bash -c '
  docker compose config > /dev/null && \
  docker compose --profile ollama config > /dev/null && \
  docker compose --profile vllm config > /dev/null
'

# 3. Backend Unit Test Suite (14 Suites, 100 Tests)
run_step "Backend NestJS 11 + Fastify 5 Test Suite" pnpm --dir backend test

# 4. Frontend TypeScript Typecheck
run_step "Frontend Next.js 15 Platform Typecheck (tsc --noEmit)" pnpm --dir frontend run typecheck

# 5. Official Python SDK Unit Tests
run_step "Official Python SDK Unit Tests (yoyo-ai)" python3 sdk/python/test_yoyo.py

# 6. Official TypeScript SDK Build & In-Memory Test
run_step "Official TypeScript SDK Build & Export Suite (@yoyo-ai/sdk)" bash -c '
  pnpm --dir sdk/typescript run build && \
  node sdk/typescript/test.js
'

END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

echo -e "\n\033[1;36m======================================================================\033[0m"
echo -e "\033[1;36m                        VERIFICATION SCORECARD                         \033[0m"
echo -e "\033[1;36m======================================================================\033[0m"
echo -e "  Total Checks: $((PASSED + FAILED))"
echo -e "  \033[1;32mPassed:       $PASSED\033[0m"
if [ "$FAILED" -gt 0 ]; then
  echo -e "  \033[1;31mFailed:       $FAILED\033[0m"
  exit 1
else
  echo -e "  \033[1;32mFailed:       0\033[0m"
fi
echo -e "  Elapsed Time: ${TOTAL_TIME}s"
echo -e "\033[1;36m======================================================================\033[0m"


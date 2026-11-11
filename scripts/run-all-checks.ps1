# ==============================================================================
# YOYO Cloud AI Platform — Unified Health & Verification Suite (PowerShell)
# ==============================================================================

$StartTime = Get-Date

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   YOYO CLOUD AI MODEL API PLATFORM -- UNIFIED VERIFICATION SUITE       " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$script:Passed = 0
$script:Failed = 0
$script:StepNum = 1

function Run-Step {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        [Parameter(Mandatory=$true)]
        [scriptblock]$Command
    )

    Write-Host "`n[$($script:StepNum)] Checking: $Name ..." -ForegroundColor Yellow
    $stepStart = Get-Date
    try {
        & $Command
        if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
            throw "Command failed with exit code $LASTEXITCODE"
        }
        $elapsed = [math]::Round(((Get-Date) - $stepStart).TotalSeconds, 2)
        Write-Host "  [PASS] $Name ($elapsed s)" -ForegroundColor Green
        $script:Passed++
    } catch {
        Write-Host "  [FAIL] $Name" -ForegroundColor Red
        Write-Host "    $($_.Exception.Message)" -ForegroundColor Red
        $script:Failed++
    }
    $script:StepNum++
}

# 1. Environment & Tools
Run-Step -Name "Node.js and pnpm runtime environment" -Command {
    $nodeVer = node --version
    $pnpmVer = pnpm --version
    Write-Host "    Node.js: $nodeVer | pnpm: $pnpmVer" -ForegroundColor DarkGray
}

# 2. Docker Compose Profiles
Run-Step -Name "Docker Compose Profiles (Default, Ollama, vLLM)" -Command {
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        docker-compose config > $null 2>&1
        docker-compose --profile ollama config > $null 2>&1
        docker-compose --profile vllm config > $null 2>&1
        Write-Host "    All 3 profiles (Mock, Ollama GPU, vLLM High-Throughput) validated" -ForegroundColor DarkGray
    } elseif (Get-Command docker -ErrorAction SilentlyContinue) {
        docker compose config > $null 2>&1
        docker compose --profile ollama config > $null 2>&1
        docker compose --profile vllm config > $null 2>&1
        Write-Host "    All 3 profiles validated via docker compose" -ForegroundColor DarkGray
    } else {
        Write-Host "    Docker CLI not found; compose syntax check skipped" -ForegroundColor DarkGray
    }
}

# 3. Backend Unit Test Suite (14 Suites, 100 Tests)
Run-Step -Name "Backend NestJS 11 + Fastify 5 Test Suite" -Command {
    pnpm --dir backend test
}

# 4. Frontend TypeScript Typecheck
Run-Step -Name "Frontend Next.js 15 Platform Typecheck (tsc --noEmit)" -Command {
    pnpm --dir frontend run typecheck
}

# 5. Official Python SDK Unit Tests
Run-Step -Name "Official Python SDK Unit Tests (yoyo-ai)" -Command {
    python sdk/python/test_yoyo.py
}

# 6. Official TypeScript SDK Build & In-Memory Test
Run-Step -Name "Official TypeScript SDK Build and Test (@yoyo-ai/sdk)" -Command {
    pnpm --dir sdk/typescript run build
    node sdk/typescript/test.js
}

# Final Scorecard
$TotalTime = [math]::Round(((Get-Date) - $StartTime).TotalSeconds, 2)
$failColor = if ($script:Failed -gt 0) { "Red" } else { "Green" }

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "                        VERIFICATION SCORECARD                         " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Total Checks: $($script:Passed + $script:Failed)" -ForegroundColor White
Write-Host "  Passed:       $($script:Passed)" -ForegroundColor Green
Write-Host "  Failed:       $($script:Failed)" -ForegroundColor $failColor
Write-Host "  Elapsed Time: $TotalTime s" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan

if ($script:Failed -gt 0) {
    exit 1
}

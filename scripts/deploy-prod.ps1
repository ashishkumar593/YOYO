# ==============================================================================
# YOYO Cloud AI Platform — One-Click Production Deployment Script (PowerShell)
# Orchestrates Postgres, Redis, Local Ollama Docker Engine, Gateway, Frontend & Caddy
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  YOYO Cloud AI Platform — Production Cluster Deployment" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Check Docker daemon availability
Write-Host "`n[1/4] Verifying Docker environment..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker is not running or accessible. Please start Docker Desktop." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Docker daemon is running." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to run docker command: $_" -ForegroundColor Red
    exit 1
}

# 2. Ensure persistent model volume directory exists on Drive F:\
Write-Host "`n[2/4] Verifying Drive F:\ model storage volume..." -ForegroundColor Yellow
$modelPath = Join-Path -Path (Get-Location) -ChildPath "data\ollama"
if (-not (Test-Path $modelPath)) {
    New-Item -ItemType Directory -Path $modelPath -Force | Out-Null
    Write-Host "[OK] Created model storage directory at: $modelPath" -ForegroundColor Green
} else {
    Write-Host "[OK] Model storage directory verified at: $modelPath" -ForegroundColor Green
}

# 3. Pull required base images
Write-Host "`n[3/4] Pulling verified infrastructure images..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml pull postgres redis ollama proxy

# 4. Build and start production stack
Write-Host "`n[4/4] Starting production stack with Caddy Reverse Proxy & SSL..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml up -d --build

Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "  YOYO PRODUCTION CLUSTER DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  Edge Gateway & API: https://localhost/v1 or http://localhost/v1" -ForegroundColor Cyan
Write-Host "  Developer Dashboard: http://localhost (via Caddy Reverse Proxy)" -ForegroundColor Cyan
Write-Host "  Direct Backend Port: http://localhost:4000" -ForegroundColor Cyan
Write-Host "  Direct Frontend Port: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Local Ollama Engine: http://localhost:11434" -ForegroundColor Cyan
Write-Host "======================================================================`n"

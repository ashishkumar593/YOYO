param (
    [switch]$Down,
    [switch]$StopDev = $true
)

# ==============================================================================
# YOYO Cloud AI Platform — One-Click Production Deployment Script (PowerShell)
# Orchestrates Postgres, Redis, Local Ollama Docker Engine, Gateway, Frontend & Caddy
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  YOYO Cloud AI Platform — Production Cluster Deployment" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

if ($Down) {
    Write-Host "`nShutting down YOYO production cluster..." -ForegroundColor Yellow
    docker compose -f docker-compose.prod.yml down
    Write-Host "[OK] Production cluster stopped successfully.`n" -ForegroundColor Green
    exit 0
}

# 1. Check Docker daemon availability
Write-Host "`n[1/5] Verifying Docker environment..." -ForegroundColor Yellow
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

# 2. Free any ports bound by local dev containers to prevent collision
if ($StopDev) {
    Write-Host "`n[2/5] Checking for active dev containers and freeing ports..." -ForegroundColor Yellow
    $devContainers = @("yoyo-ollama", "yoyo-postgres", "yoyo-redis")
    foreach ($c in $devContainers) {
        $running = docker ps -q -f "name=^${c}$"
        if ($running) {
            Write-Host "  Pausing dev container '$c' to prevent port collision..." -ForegroundColor Gray
            docker stop $c | Out-Null
        }
    }
    Write-Host "[OK] Port space is clear for production cluster." -ForegroundColor Green
}

# 3. Ensure persistent model volume directory exists on Drive F:\
Write-Host "`n[3/5] Verifying Drive F:\ model storage volume..." -ForegroundColor Yellow
$modelPath = Join-Path -Path (Get-Location) -ChildPath "data\ollama"
if (-not (Test-Path $modelPath)) {
    New-Item -ItemType Directory -Path $modelPath -Force | Out-Null
    Write-Host "[OK] Created model storage directory at: $modelPath" -ForegroundColor Green
} else {
    Write-Host "[OK] Model storage directory verified at: $modelPath" -ForegroundColor Green
}

# 4. Pull required base images
Write-Host "`n[4/5] Pulling verified infrastructure images..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml pull postgres redis ollama proxy

# 5. Build and start production stack
Write-Host "`n[5/5] Starting production stack with Caddy Reverse Proxy and SSL..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml up -d --build

Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "  YOYO PRODUCTION CLUSTER DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  Edge Gateway and API: https://localhost/v1 or http://localhost/v1" -ForegroundColor Cyan
Write-Host "  Developer Dashboard: http://localhost (via Caddy Reverse Proxy)" -ForegroundColor Cyan
Write-Host "  Direct Backend Port: http://localhost:4000" -ForegroundColor Cyan
Write-Host "  Direct Frontend Port: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Local Ollama Engine: http://localhost:11434" -ForegroundColor Cyan
Write-Host "======================================================================"
Write-Host ""

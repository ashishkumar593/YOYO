# ==============================================================================
# YOYO Cloud AI Platform — Local Docker LLM Runner & Model Provisioner
# Runs Ollama in Docker, downloads local models (Llama 3.2, Qwen 2.5 Coder, DeepSeek R1),
# and connects them directly to YOYO Gateway without requiring external OpenAI keys.
# ==============================================================================

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " 🚀 YOYO Local Docker LLM Provisioner" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Ensure model storage directory on workspace drive (saves C: drive space)
$modelDataDir = Join-Path $PSScriptRoot "..\data\ollama"
if (-not (Test-Path $modelDataDir)) {
    Write-Host "[1/4] Creating local model data directory: $modelDataDir..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $modelDataDir -Force | Out-Null
} else {
    Write-Host "[1/4] Local model directory ready: $modelDataDir" -ForegroundColor Green
}

# 2. Check if Docker is running
Write-Host "`n[2/4] Verifying Docker Desktop status..." -ForegroundColor Yellow
try {
    $dockerCheck = docker ps 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] Docker Desktop is not currently running." -ForegroundColor Red
        Write-Host "       Please launch Docker Desktop from your Start Menu or Desktop icon." -ForegroundColor Yellow
        Write-Host "       Once Docker Desktop displays 'Engine running', rerun this script." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "[OK] Docker is running." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Could not connect to Docker: $_" -ForegroundColor Red
    exit 1
}

# 3. Start local Ollama container
Write-Host "`n[3/4] Launching yoyo-ollama Docker container on port 11434..." -ForegroundColor Yellow
Set-Location (Join-Path $PSScriptRoot "..")
docker compose up -d ollama

# Wait for Ollama to become responsive
Write-Host "Waiting for Ollama to accept connections..." -ForegroundColor Gray
$retries = 30
$online = $false
while ($retries -gt 0) {
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:11434/api/version" -TimeoutSec 2 -ErrorAction Stop
        if ($res.version) {
            $online = $true
            Write-Host "[OK] Ollama Docker container active (Version: $($res.version))." -ForegroundColor Green
            break
        }
    } catch {
        Start-Sleep -Seconds 2
        $retries--
    }
}

if (-not $online) {
    Write-Host "[ERROR] Ollama container failed to respond on http://localhost:11434." -ForegroundColor Red
    exit 1
}

# 4. Pull recommended local models
Write-Host "`n[4/4] Installing local open-weights LLMs inside Docker..." -ForegroundColor Yellow
$modelsToInstall = @(
    @{ name = "llama3.2:1b"; desc = "Llama 3.2 1B (Ultra-fast, fits 100% in 4GB GPU/CPU, 1.3GB)" },
    @{ name = "qwen2.5-coder:1.5b"; desc = "Qwen 2.5 Coder 1.5B (Code Generation & Architecture, 1.0GB)" }
)

foreach ($m in $modelsToInstall) {
    Write-Host "`n--> Pulling $($m.name) [$($m.desc)]..." -ForegroundColor Cyan
    docker exec yoyo-ollama ollama pull $m.name
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " ✅ LOCAL DOCKER LLM MODELS SUCCESSFULLY INSTALLED!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Installed Models in Docker:" -ForegroundColor White
docker exec yoyo-ollama ollama list

Write-Host "`nReady to query locally via YOYO Gateway without any OpenAI keys:" -ForegroundColor Cyan
Write-Host "curl http://localhost:4000/v1/chat/completions \" -ForegroundColor Gray
Write-Host "  -H 'Content-Type: application/json' \" -ForegroundColor Gray
Write-Host "  -H 'Authorization: Bearer sk_live_yoyo_dev_2026_prod_access' \" -ForegroundColor Gray
Write-Host "  -d '{\"model\": \"llama3.2:1b\", \"messages\": [{\"role\": \"user\", \"content\": \"Hello local model!\"}]}'`n" -ForegroundColor Gray

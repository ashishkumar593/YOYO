# ==============================================================================
# YOYO Cloud AI Platform — Paperclip AI Multi-Agent Team Orchestration Runner
# Connects Paperclip (paperclipai) Autonomous Agents to YOYO Edge Gateway
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   YOYO CLOUD AI PLATFORM -- PAPERCLIP AI MULTI-AGENT ORCHESTRATION   " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Check Paperclip installation
if (-not (Get-Command paperclipai -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] paperclipai CLI is not installed globally." -ForegroundColor Red
    Write-Host "        Install via: npm install -g paperclipai" -ForegroundColor Yellow
    exit 1
}

$paperclipVer = paperclipai --version
Write-Host "`n[1/3] Paperclip CLI detected: v$paperclipVer" -ForegroundColor Green

# 2. Configure YOYO Edge Gateway Environment
Write-Host "`n[2/3] Configuring YOYO Edge Gateway (OpenAI-compatible) endpoint..." -ForegroundColor Yellow
$YoyoGateway = "http://localhost:4000/v1"
$YoyoApiKey = "sk_live_yoyo_dev_master_key_2026"

$env:OPENAI_BASE_URL = $YoyoGateway
$env:OPENAI_API_KEY = $YoyoApiKey
$env:YOYO_BASE_URL = $YoyoGateway
$env:YOYO_API_KEY = $YoyoApiKey

Write-Host "  Target Gateway: $YoyoGateway" -ForegroundColor DarkGray
Write-Host "  Primary Model:  llama-3.3-70b (with automatic fallback to llama-3.3-8b)" -ForegroundColor DarkGray

# 3. Test-Drive or Run Paperclip Instance
Write-Host "`n[3/3] Ready to orchestrate autonomous agents." -ForegroundColor Yellow
Write-Host "Available launch modes:" -ForegroundColor White
Write-Host "  Option A (Isolated Test Drive):" -ForegroundColor Cyan
Write-Host "    paperclipai test-drive --company-name 'YOYO Autonomous Labs' --agent-name 'YoyoCEO' --model 'llama-3.3-70b' --api-key '$YoyoApiKey'" -ForegroundColor DarkGray
Write-Host "  Option B (Production Service):" -ForegroundColor Cyan
Write-Host "    paperclipai run --bind loopback" -ForegroundColor DarkGray

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "           PAPERCLIP AI + YOYO PLATFORM BRIDGE: CONFIGURED            " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# YOYO Local Startup Script for Windows PowerShell
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    Starting YOYO AI Model API Platform (Local Dev)       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Docker services (PostgreSQL & Redis)
Write-Host "`n[1/3] Starting PostgreSQL and Redis containers..." -ForegroundColor Yellow
docker compose -f docker/compose/docker-compose.dev.yml up -d postgres redis

# 2. Wait for database
Write-Host "`n[2/3] Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 3. Generate Prisma client & seed default models
Write-Host "`n[3/3] Generating Prisma client and seeding foundation models..." -ForegroundColor Yellow
Set-Location backend
pnpm db:generate
pnpm db:seed
Set-Location ..

Write-Host "`n✔ Database & Cache are ready!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "To launch YOYO services:" -ForegroundColor White
Write-Host "  Terminal 1 (Backend):  cd backend; pnpm start:dev" -ForegroundColor Green
Write-Host "  Terminal 2 (Frontend): cd frontend; pnpm dev" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan


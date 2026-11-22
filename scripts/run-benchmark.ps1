param (
    [int]$Concurrency = 4,
    [int]$Requests = 16,
    [string]$Model = "llama3.2:1b",
    [string]$Url = "http://localhost:4000/v1",
    [switch]$NonStreaming
)

$streamFlag = if ($NonStreaming) { "false" } else { "true" }

Write-Host "Starting YOYO Platform Throughput & TTFT Benchmark..." -ForegroundColor Cyan
node scripts/benchmark.js --concurrency $Concurrency --requests $Requests --model $Model --url $Url --stream $streamFlag

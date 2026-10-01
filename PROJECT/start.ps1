Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Starting AlgoFlow Online Judge System (PS)       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. MongoDB
$dataDir = Join-Path $env:LOCALAPPDATA 'MongoDB\data'
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue)) {
    Start-Process 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe' -ArgumentList @('--dbpath', $dataDir, '--port', '27017') -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Write-Host "[Database] MongoDB started on port 27017." -ForegroundColor Green
} else {
    Write-Host "[Database] MongoDB is active on port 27017." -ForegroundColor Cyan
}

# 2. Redis / Memurai
if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue)) {
    Get-Service *memurai* -ErrorAction SilentlyContinue | Start-Service -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}
if (Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue) {
    Write-Host "[Cache/Queue] Redis/Memurai is active on port 6379." -ForegroundColor Green
} else {
    Write-Host "[Cache/Queue] Notice: Port 6379 inactive. Services will operate in fallback mode." -ForegroundColor Yellow
}

$root = $PSScriptRoot

Write-Host "`n[1/5] Starting API Gateway on port 4000..." -ForegroundColor White
Start-Process cmd.exe -ArgumentList '/k', 'npm run dev' -WorkingDirectory "$root\backend\api-gateway"
Start-Sleep -Milliseconds 500

Write-Host "[2/5] Starting Contest Service on port 4001..." -ForegroundColor White
Start-Process cmd.exe -ArgumentList '/k', 'npm run dev' -WorkingDirectory "$root\backend\contest-service"
Start-Sleep -Milliseconds 500

Write-Host "[3/5] Starting Judge Worker..." -ForegroundColor White
Start-Process cmd.exe -ArgumentList '/k', 'npm run dev' -WorkingDirectory "$root\backend\judge-worker"
Start-Sleep -Milliseconds 500

Write-Host "[4/5] Starting Plagiarism Service on port 4002..." -ForegroundColor White
Start-Process cmd.exe -ArgumentList '/k', 'npm run dev' -WorkingDirectory "$root\backend\plagiarism-service"
Start-Sleep -Milliseconds 500

Write-Host "[5/5] Starting React Frontend on port 5173..." -ForegroundColor White
Start-Process cmd.exe -ArgumentList '/k', 'npm run dev' -WorkingDirectory "$root"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  All services launched! " -ForegroundColor Green
Write-Host "  Access UI at: http://localhost:5173" -ForegroundColor White
Write-Host "  API Gateway : http://localhost:4000/api" -ForegroundColor White
Write-Host "  WebSocket   : http://localhost:4001" -ForegroundColor White
Write-Host "========================================================`n" -ForegroundColor Cyan

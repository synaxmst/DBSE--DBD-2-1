Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Stopping AlgoFlow Online Judge System (PS)       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "[1/3] Stopping Node microservices and Frontend..." -ForegroundColor Yellow
Get-Process -Name 'node' -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; Write-Host "  Stopped Node (PID: $($_.Id))" }

Write-Host "[2/3] Stopping MongoDB Database Daemon..." -ForegroundColor Yellow
Get-Process -Name 'mongod' -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; Write-Host "  Stopped MongoDB (PID: $($_.Id))" }

Write-Host "[3/3] Releasing ports 4000, 4001, 4002, 4003, 5173..." -ForegroundColor Yellow
$ports = @(4000, 4001, 4002, 4003, 5173)
foreach ($p in $ports) {
    $procs = (Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue).OwningProcess
    if ($procs) {
        foreach ($pidNum in $procs) {
            Stop-Process -Id $pidNum -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  All AlgoFlow services stopped successfully!" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Cyan

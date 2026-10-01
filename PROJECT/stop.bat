@echo off
echo ========================================================
echo        Stopping AlgoFlow Online Judge System
echo ========================================================

echo [1/3] Stopping Node microservices and Frontend...
powershell -Command "Get-Process -Name 'node' -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; Write-Host \"[Node] Stopped Node process (PID: $($_.Id))\" -ForegroundColor Yellow }"

echo [2/3] Stopping MongoDB Database Daemon...
powershell -Command "Get-Process -Name 'mongod' -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; Write-Host \"[Database] Stopped MongoDB Server (PID: $($_.Id))\" -ForegroundColor Yellow }"

echo [3/3] Final port cleanup...
powershell -Command "$ports = @(4000, 4001, 4002, 4003, 5173); foreach ($p in $ports) { $procs = (Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue).OwningProcess; if ($procs) { foreach ($pidNum in $procs) { Stop-Process -Id $pidNum -Force -ErrorAction SilentlyContinue } } }"

echo.
echo ========================================================
echo   All AlgoFlow services have been stopped successfully!
echo ========================================================
echo.
pause


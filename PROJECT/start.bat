@echo off
setlocal
set "PATH=%APPDATA%\npm;C:\Program Files\MongoDB\Server\8.3\bin;C:\Program Files\Memurai;%PATH%"

echo ========================================================
echo        Starting AlgoFlow Online Judge System
echo ========================================================

:: 1. Ensure MongoDB data folder and mongod process
set "MONGO_DATA=%LOCALAPPDATA%\MongoDB\data"
if not exist "%MONGO_DATA%" mkdir "%MONGO_DATA%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue)) { Start-Process 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe' -ArgumentList @('--dbpath', (Join-Path $env:LOCALAPPDATA 'MongoDB\data'), '--port', '27017') -WindowStyle Hidden; Start-Sleep -Seconds 2; Write-Host '[Database] MongoDB started on port 27017.' -ForegroundColor Green } else { Write-Host '[Database] MongoDB is active on port 27017.' -ForegroundColor Cyan }"

:: 2. Ensure Redis / Memurai is running
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue)) { Get-Service *memurai* -ErrorAction SilentlyContinue | Start-Service -ErrorAction SilentlyContinue; Start-Sleep -Seconds 1 }; if (Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue) { Write-Host '[Cache/Queue] Redis/Memurai is active on port 6379.' -ForegroundColor Green } else { Write-Host '[Cache/Queue] Notice: Port 6379 inactive. Services will operate in in-memory fallback mode.' -ForegroundColor Yellow }"

echo.
echo [1/5] Starting API Gateway on port 4000...
start "AlgoFlow API Gateway" /D "%~dp0backend\api-gateway" cmd /k "npm run dev"
ping 127.0.0.1 -n 2 >nul

echo [2/5] Starting Contest Service on port 4001...
start "AlgoFlow Contest Service" /D "%~dp0backend\contest-service" cmd /k "npm run dev"
ping 127.0.0.1 -n 2 >nul

echo [3/5] Starting Judge Worker...
start "AlgoFlow Judge Worker" /D "%~dp0backend\judge-worker" cmd /k "npm run dev"
ping 127.0.0.1 -n 2 >nul

echo [4/5] Starting Plagiarism Service on port 4002...
start "AlgoFlow Plagiarism Service" /D "%~dp0backend\plagiarism-service" cmd /k "npm run dev"
ping 127.0.0.1 -n 2 >nul

echo [5/5] Starting React Frontend on port 5173...
start "AlgoFlow Frontend" /D "%~dp0" cmd /k "npm run dev"

echo.
echo ========================================================
echo   All services launched! 
echo   Access UI at: http://localhost:5173
echo   API Gateway : http://localhost:4000/api
echo   WebSocket   : http://localhost:4001
echo ========================================================
echo.
pause

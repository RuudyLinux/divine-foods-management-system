@echo off
setlocal enabledelayedexpansion
title Divine Foods Stopper

cd /d "%~dp0"

echo ============================================================
echo   Divine Foods Management System - Stopping Server
echo ============================================================

set "WAS_STOPPED=0"

for /f %%A in ('powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$count = 0;" ^
  "$wins = Get-Process | Where-Object { $_.MainWindowTitle -like 'Divine Foods Server*' };" ^
  "if ($wins) { $wins | Stop-Process -Force -ErrorAction SilentlyContinue; $count += $wins.Count };" ^
  "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*divine-foods-management-system*' };" ^
  "if ($procs) { foreach ($p in $procs) { try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue; Write-Host ('[OK] Terminated node PID: ' + $p.ProcessId); $count++ } catch {} } };" ^
  "Write-Output $count"') do (
    if "%%A" NEQ "0" set "WAS_STOPPED=1"
)

:: Clean up .server.port file
if exist ".server.port" del /f /q ".server.port" >nul 2>&1

echo.
echo ============================================================
if "!WAS_STOPPED!"=="1" (
    echo   [OK] Divine Foods Management System has been STOPPED.
) else (
    echo   [INFO] No active Divine Foods server processes found.
)
echo ============================================================
echo.

endlocal

@echo off
setlocal enabledelayedexpansion
title Divine Foods Launcher

cd /d "%~dp0"

echo ============================================================
echo   Divine Foods Management System - Starting Up
echo ============================================================

:: 1. Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js v18 or higher from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check and install dependencies if missing
if not exist "node_modules\" (
    echo [INFO] Dependencies not found. Installing node_modules...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies. Please check npm logs.
        echo.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully.
    echo.
)

:: 3. Determine Port
set "PORT=%~1"
if "%PORT%"=="" (
    for /f %%P in ('powershell -NoProfile -Command "foreach ($p in 3000, 3030, 3031, 5173) { if (-not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)) { [Console]::WriteLine($p); break } }"') do (
        set "PORT=%%P"
    )
)
if "%PORT%"=="" set "PORT=3000"

:: 4. Check if already running
if exist ".server.port" (
    for /f "usebackq delims=" %%A in (".server.port") do set "EXISTING_PORT=%%A"
    for /f %%C in ('powershell -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*divine-foods-management-system*' } | Measure-Object).Count"') do set "RUNNING_COUNT=%%C"
    if "!RUNNING_COUNT!" NEQ "0" (
        echo [INFO] Divine Foods Server is already running on http://localhost:!EXISTING_PORT!/
        echo Opening browser...
        start http://localhost:!EXISTING_PORT!/
        goto :SERVER_DONE
    )
)

:: Save active port
echo %PORT%>".server.port"

echo [INFO] Selected Port: %PORT%
if "%PORT%" NEQ "3000" (
    echo [NOTICE] Port 3000 is occupied by another application.
    echo [NOTICE] Running Divine Foods on Port %PORT% to avoid port conflict.
)
echo.
echo [INFO] Starting Vite development server in a separate window...

:: 5. Start dev server in dedicated window
start "Divine Foods Server" cmd /k "title Divine Foods Server && npm run dev -- --port %PORT% --host 0.0.0.0"

:: 6. Wait for server to spin up
echo [INFO] Waiting for server to initialize...
powershell -NoProfile -Command "Start-Sleep -Seconds 3"

:: 7. Launch browser
echo [INFO] Launching default web browser...
start http://localhost:%PORT%/

echo.
echo ============================================================
echo   Divine Foods Management System - Ready!
echo ============================================================
echo   Local Address : http://localhost:%PORT%/
echo   To Stop       : Run stop.bat or close the server terminal
echo ============================================================
echo.

:SERVER_DONE
endlocal

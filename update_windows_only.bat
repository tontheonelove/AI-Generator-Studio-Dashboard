@echo off
chcp 65001 >nul 2>&1
title AI-Generation Studio v4.0 - Launcher
color 0B

cd /d "%~dp0"

REM === Set Python paths from venv ===
set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
set "PIP_EXE=%~dp0venv\Scripts\pip.exe"
set "UVICORN_EXE=%~dp0venv\Scripts\uvicorn.exe"

echo.
echo ========================================================
echo    AI-Generation Studio v4.0 - Auto Launcher
echo ========================================================
echo [DEBUG] Working directory: %CD%
echo.

echo [1/6] Checking Python...
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)
echo [OK] Python:
python --version
echo.

echo [2/6] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js:
node --version
call npm --version
echo.

echo [3/6] Checking required folders...
if not exist "backend" (
    echo [ERROR] backend folder not found!
    pause
    exit /b 1
)
echo [OK] backend/ exists

if not exist "frontend-next" (
    echo [ERROR] frontend-next folder not found!
    pause
    exit /b 1
)
echo [OK] frontend-next/ exists

REM === Create venv if not exists ===
if not exist "venv" (
    echo [WARNING] venv not found, creating...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create venv!
        pause
        exit /b 1
    )
)

REM === Verify venv python exists ===
if not exist "%PYTHON_EXE%" (
    echo [ERROR] venv python.exe not found at: %PYTHON_EXE%
    echo [INFO] Deleting broken venv and recreating...
    rmdir /s /q venv
    python -m venv venv
)
echo [OK] venv/ ready
echo.

echo [4/6] Installing Python dependencies...
call "%PIP_EXE%" install -r requirements.txt -q
if errorlevel 1 (
    echo [ERROR] pip install failed!
    pause
    exit /b 1
)
echo [OK] Python dependencies ready
echo.

echo [5/6] Setting up Next.js...
cd /d "%~dp0frontend-next"
echo [DEBUG] Now in: %CD%

if exist "node_modules" goto :skip_npm

echo Installing npm packages (first time only, may take 2-5 minutes)...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)

:skip_npm
cd /d "%~dp0"
echo [DEBUG] Back to: %CD%
echo [OK] Next.js ready
echo.

REM === Get Local IP Address ===
echo [INFO] Detecting local IP address...
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r /c:"IPv4.*Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        if not defined LOCAL_IP (
            set "LOCAL_IP=%%b"
        )
    )
)
if not defined LOCAL_IP set "LOCAL_IP=YOUR_IP_ADDRESS"
echo [OK] Local IP: %LOCAL_IP%
echo.

echo [6/6] Starting servers...
echo.

echo Starting Backend Server on port 8000...
start "Backend Server (Port 8000)" cmd /k "cd /d "%~dp0" && echo. && echo ======================================================== && echo  Backend Server (FastAPI) && echo  Local:   http://localhost:8000 && echo  Network: http://%LOCAL_IP%:8000 && echo  API Docs: http://localhost:8000/docs && echo ======================================================== && echo. && "%UVICORN_EXE%" backend.app:app --host 0.0.0.0 --port 8000"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend Server on port 3000 (LAN Access Enabled)...
start "Frontend Server (Port 3000 - LAN)" cmd /k "cd /d "%~dp0frontend-next" && echo. && echo ======================================================== && echo  Frontend Server (Next.js) - LAN Access Enabled && echo  Local:   http://localhost:3000 && echo  Network: http://%LOCAL_IP%:3000 && echo ======================================================== && echo. && echo  To access from other devices on the same network: && echo  Open browser and go to: http://%LOCAL_IP%:3000 && echo ======================================================== && echo. && npm run dev -- --hostname 0.0.0.0"

echo Waiting 10 seconds for frontend to compile...
timeout /t 10 /nobreak >nul

echo Opening browser (local access)...
start "" "http://localhost:3000"

echo.
echo ========================================================
echo.
echo    [OK] SUCCESS! AI-Generation Studio v4.0 is ready!
echo.
echo    [LOCAL ACCESS - This Computer]
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo    [NETWORK ACCESS - Other Devices on Same LAN]
echo    Frontend: http://%LOCAL_IP%:3000
echo    Backend:  http://%LOCAL_IP%:8000
echo.
echo    [HOW TO ACCESS FROM OTHER DEVICES]
echo    1. Make sure all devices are on the same WiFi/network
echo    2. Open browser on other device
echo    3. Go to: http://%LOCAL_IP%:3000
echo    4. Start generating!
echo.
echo    [IMPORTANT NOTES]
echo    - Keep this window and both server windows open
echo    - To stop: close all server windows or press Ctrl+C
echo    - First access may take 30-60 seconds to compile
echo.
echo ========================================================
echo.
pause
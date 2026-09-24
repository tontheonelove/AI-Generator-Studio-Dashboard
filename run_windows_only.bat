@echo off
chcp 65001 >nul 2>&1
title AI-Generation Studio v4.2 - Launcher (Production)
color 0B

cd /d "%~dp0"

echo.
echo ========================================================
echo    AI-Generation Studio v4.2 - Auto Launcher
echo ========================================================
echo [DEBUG] Working directory: %CD%
echo.

echo [1/7] Checking Python...
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

echo [2/7] Checking Node.js...
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

echo [3/7] Checking required folders...
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

if not exist "venv" (
    echo [WARNING] venv not found, creating...
    python -m venv venv
)
echo [OK] venv/ exists
echo.

echo [4/7] Installing Python dependencies...
call venv\Scripts\activate.bat
call pip install -r requirements.txt -q
echo [OK] Python dependencies ready
echo.

echo [5/7] Setting up Next.js...
cd /d "%~dp0frontend-next"
echo [DEBUG] Now in: %CD%

if exist "node_modules" goto :skip_npm

echo Installing npm packages, first time only, may take 2-5 minutes...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)

:skip_npm
cd /d "%~dp0"
echo [DEBUG] Back to: %CD%
echo [OK] Next.js dependencies ready
echo.

REM === Step 6: Smart Build Detection - goto flow - no parentheses bug ===
echo [6/7] Checking Next.js build status...

if not exist "frontend-next\.next" goto :no_build
if not exist "frontend-next\.next\BUILD_ID" goto :incomplete_build

echo [OK] Production build found
echo.
echo ========================================================
echo    Build Options:
echo ========================================================
echo    [1] Use existing build   - Fast, Recommended
echo    [2] Rebuild from scratch - Slow, use after code changes
echo ========================================================
echo.
choice /c 12 /n /m "Select option 1 or 2: "
if errorlevel 2 goto :set_rebuild
goto :skip_build

:no_build
echo [INFO] No build found, building for production...
goto :set_rebuild

:incomplete_build
echo [WARNING] Build folder exists but is incomplete, rebuilding...
goto :set_rebuild

:set_rebuild
echo.
echo [INFO] Building Next.js for production, this may take 2-5 minutes...
cd /d "%~dp0frontend-next"
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed! Please fix errors and try again.
    cd /d "%~dp0"
    pause
    exit /b 1
)
cd /d "%~dp0"
echo [OK] Build completed successfully!
goto :after_build

:skip_build
echo [OK] Using existing build, skipping build step

:after_build
echo.

REM === Get Local IP Address ===
echo [INFO] Detecting local IP address...
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r /c:"IPv4.*Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        if not defined LOCAL_IP set "LOCAL_IP=%%b"
    )
)
if not defined LOCAL_IP set "LOCAL_IP=YOUR_IP_ADDRESS"
echo [OK] Local IP: %LOCAL_IP%
echo.

echo [7/7] Starting production servers...
echo.

echo Starting Backend Server on port 8000...
start "Backend Server Port 8000" cmd /k "cd /d "%~dp0" && call venv\Scripts\activate.bat && echo. && echo ======================================================== && echo  Backend Server FastAPI - Production && echo  Local:   http://localhost:8000 && echo  Network: http://%LOCAL_IP%:8000 && echo  API Docs: http://localhost:8000/docs && echo ======================================================== && echo. && uvicorn backend.app:app --host 0.0.0.0 --port 8000"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend Server on port 3000 - Production Mode with LAN Access...
start "Frontend Server Port 3000 Production" cmd /k "cd /d "%~dp0frontend-next" && echo. && echo ======================================================== && echo  Frontend Server Next.js - PRODUCTION MODE && echo  Local:   http://localhost:3000 && echo  Network: http://%LOCAL_IP%:3000 && echo ======================================================== && echo. && echo  To access from other devices on the same network: && echo  Open browser and go to: http://%LOCAL_IP%:3000 && echo ======================================================== && echo. && npm start -- --hostname 0.0.0.0 --port 3000"

echo Waiting 8 seconds for frontend to start...
timeout /t 8 /nobreak >nul

echo Opening browser, local access...
start "" "http://localhost:3000"

echo.
echo ========================================================
echo.
echo    [OK] SUCCESS! AI-Generation Studio v4.2 is ready!
echo.
echo    [MODE] Production - Optimized Build
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
echo    [IMPORTANT NOTES - PRODUCTION MODE]
echo    - Keep this window and both server windows open
echo    - To stop: close all server windows or press Ctrl+C
echo    - No hot reload: re-run launcher to apply code changes
echo    - Faster and more stable than development mode
echo.
echo ========================================================
echo.
pause
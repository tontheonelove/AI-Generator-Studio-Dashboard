@echo off
title AI-Image-Generator-Studio - Setup
color 0B

echo.
echo ==========================================
echo    AI-Image-Generator-Studio - Auto Launcher
echo ==========================================
echo.

REM 1. Check Python
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Notfound Python
    echo Please Install Python 3.10+ from https://python.org
    echo Check on "Add Python to PATH" 
    echo.
    pause
    exit /b 1
)

echo [1/4] detected Python: 
python --version
echo.

REM 2. create venv if not available
if not exist "venv" (
    echo [2/4] creating.. Virtual Environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] create venv fail !!!
        pause
        exit /b 1
    )
) else (
    echo [2/4] detected Virtual Environment
)
echo.

REM 3. Install Library
echo [3/4] Installing/update Library (wait)...
call venv\Scripts\activate.bat
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] install Library fail !!
    pause
    exit /b 1
)
echo [INFO] Library Ready to use 
echo.

REM 4. run app
echo [4/4] starting Backend Server...
echo.
echo ==========================================
echo  starting Server...
echo ==========================================
echo.

start "AI-Generate-Server" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && uvicorn backend.app:app --host 0.0.0.0 --port 8000"

echo.
echo [LAUNCH] wait 5 sec open browser...
timeout /t 5 /nobreak

echo [LAUNCH] openbrowser...
start "" "http://localhost:8000"

echo.
echo ==========================================
echo    SUCCESS! ready to use
echo    The Server window is already open separately.
echo    To close it, close the Server window.
echo ==========================================
echo.
pause
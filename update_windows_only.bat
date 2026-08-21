@echo off
chcp 65001 >nul 2>&1
title AI-Generation Studio v4.0 - Updater
color 0B

cd /d "%~dp0"

REM === Set Python paths from venv ===
set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
set "PIP_EXE=%~dp0venv\Scripts\pip.exe"

echo.
echo ========================================================
echo    AI-Generation Studio v4.0 - Auto Updater
echo ========================================================
echo [DEBUG] Working directory: %CD%
echo.

REM ==========================================
REM 1. Check Git
REM ==========================================
echo [1/5] Checking Git...
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git not found!
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)
echo [OK] Git detected
echo.

REM ==========================================
REM 2. Check / Create venv
REM ==========================================
echo [2/5] Checking Virtual Environment...
if not exist "venv" (
    echo [WARNING] venv not found, creating new...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create venv!
        pause
        exit /b 1
    )
)

REM Verify venv python exists
if not exist "%PYTHON_EXE%" (
    echo [ERROR] venv python.exe not found at: %PYTHON_EXE%
    echo [INFO] Deleting broken venv and recreating...
    rmdir /s /q venv
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to recreate venv!
        pause
        exit /b 1
    )
)
echo [OK] venv ready
echo.

REM ==========================================
REM 3. Pull latest code from GitHub
REM ==========================================
echo [3/5] Pulling latest code from GitHub...
echo.
git pull
if errorlevel 1 (
    echo.
    echo [ERROR] git pull failed!
    echo Possible causes:
    echo   - No internet connection
    echo   - Uncommitted local changes (run 'git stash' first)
    echo   - Merge conflict (resolve manually then retry)
    echo.
    pause
    exit /b 1
)
echo.
echo [OK] Source code updated successfully
echo.

REM ==========================================
REM 4. Update Python dependencies
REM ==========================================
echo [4/5] Updating Python dependencies...
call "%PIP_EXE%" install -r requirements.txt --upgrade -q
if errorlevel 1 (
    echo [ERROR] pip install failed!
    pause
    exit /b 1
)
echo [OK] Python dependencies updated
echo.

REM ==========================================
REM 5. Update Next.js dependencies
REM ==========================================
echo [5/5] Updating Next.js dependencies...
if exist "frontend-next\package.json" (
    cd /d "%~dp0frontend-next"
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        cd ..
        pause
        exit /b 1
    )
    cd /d "%~dp0"
    echo [OK] Next.js dependencies updated
) else (
    echo [SKIP] frontend-next/package.json not found
)
echo.

echo ========================================================
echo.
echo    [OK] Update complete!
echo.
echo    Close this window and run run_windows_only.bat
echo    to start the application.
echo.
echo ========================================================
echo.
pause
@echo off
title AI-Generation Studio - Updater
color 0B

echo.
echo ==========================================
echo    AI-Generation Studio - Auto Updater
echo ==========================================
echo.

REM 1. ตรวจสอบ Git
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] notfound Git 
    echo please install Git from https://git-scm.com/
    pause
    exit /b 1
)
echo [INFO] detected Git !

REM 2. ตรวจสอบ/สร้าง venv
if not exist "venv" (
    echo [INFO] notfound venv creating new.. Virtual Environment ...
    python -m venv venv
)
call venv\Scripts\activate.bat

REM 3. ดึงโค้ดล่าสุด
echo.
echo [1/2] pull sourcecode from GitHub...
git pull
if errorlevel 1 (
    echo [ERROR] pull fail (check internet Or there are some unfinished editing files on the computer.)
    pause
    exit /b 1
)
echo [SUCCESS] The latest code has been successfully retrieved.

REM 4. อัปเดต Library
echo.
echo [2/2] checking and updating Library...
pip install -r requirements.txt --upgrade
echo [SUCCESS] Library ready to use

echo.
echo ==========================================
echo    ✅ Update complete!
echo    Close this window and run run.bat to run the application.
echo ==========================================
echo.
pause
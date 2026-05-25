@echo off
title AI-Image-Generator-Studio - Setup
color 0B

echo.
echo ==========================================
echo    AI-Image-Generator-Studio - Auto Launcher
echo ==========================================
echo.

REM 1. ตรวจสอบ Python
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] ไม่พบ Python ในเครื่อง
    echo กรุณาติดตั้ง Python 3.10+ จาก https://python.org
    echo อย่าลืมติ๊กถูก "Add Python to PATH" ตอนติดตั้ง
    echo.
    pause
    exit /b 1
)

echo [1/4] ตรวจพบ Python: 
python --version
echo.

REM 2. สร้าง venv ถ้ายังไม่มี
if not exist "venv" (
    echo [2/4] กาลังสร้าง Virtual Environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] สร้าง venv ไม่สําเร็จ
        pause
        exit /b 1
    )
) else (
    echo [2/4] พบ Virtual Environment แล้ว
)
echo.

REM 3. ติดตั้ง Library
echo [3/4] กาลังติดตั้ง/อัปเดต Library (รอสักครู่)...
call venv\Scripts\activate.bat
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] ติดตั้ง Library ไม่สําเร็จ
    pause
    exit /b 1
)
echo [INFO] Library พร้อมใช้งาน
echo.

REM 4. รันแอป
echo [4/4] กาลังเปิด Backend Server...
echo.
echo ==========================================
echo  กาลังเปิดหน้าต่าง Server...
echo ==========================================
echo.

start "AI-Generate-Server" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && uvicorn backend.app:app --host 0.0.0.0 --port 8000"

echo.
echo [LAUNCH] รอ 5 วินาทีก่อนเปิดหน้าเว็บ...
timeout /t 5 /nobreak

echo [LAUNCH] เปิดหน้าเว็บ...
start "" "http://localhost:8000"

echo.
echo ==========================================
echo    SUCCESS! แอปพร้อมใช้งาน
echo    หน้าต่าง Server ถูกเปิดแยกไว้แล้ว
echo    หากต้องการปิด ให้ปิดหน้าต่าง Server
echo ==========================================
echo.
pause
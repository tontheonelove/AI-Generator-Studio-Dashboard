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
    echo [ERROR] ไม่พบ Git ในเครื่อง
    echo กรุณาติดตั้ง Git จาก https://git-scm.com/
    pause
    exit /b 1
)
echo [INFO] ตรวจพบ Git แล้ว

REM 2. ตรวจสอบ/สร้าง venv
if not exist "venv" (
    echo [INFO] ไม่พบ venv กาลังสร้าง Virtual Environment ใหม่...
    python -m venv venv
)
call venv\Scripts\activate.bat

REM 3. ดึงโค้ดล่าสุด
echo.
echo [1/2] กาลังดึงโค้ดล่าสุดจาก GitHub...
git pull
if errorlevel 1 (
    echo [ERROR] ดึงข้อมูลไม่สําเร็จ (ตรวจสอบเน็ต หรือมีไฟล์แก้ไขค้างในเครื่อง)
    pause
    exit /b 1
)
echo [SUCCESS] ดึงโค้ดล่าสุดเรียบร้อย

REM 4. อัปเดต Library
echo.
echo [2/2] กาลังตรวจสอบและอัปเดต Library...
pip install -r requirements.txt --upgrade
echo [SUCCESS] Library พร้อมใช้งาน

echo.
echo ==========================================
echo    ✅ อัปเดตเสร็จสิ้น!
echo    ปิดหน้าต่างนี้ แล้วรัน run.bat เพื่อใช้งาน
echo ==========================================
echo.
pause
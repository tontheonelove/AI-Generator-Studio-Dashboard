#!/bin/bash

# ==========================================
#    AI-Generation Studio - Auto Updater (Linux)
# ==========================================
echo ""
echo "=========================================="
echo "   AI-Generation Studio - Auto Updater"
echo "=========================================="
echo ""

# 1. ตรวจสอบ Git
if ! command -v git &> /dev/null; then
    echo "[ERROR] Not found Git"
    echo "Please install Git with:"
    echo "  sudo apt update && sudo apt install git"
    exit 1
fi
echo "[INFO] Detected Git!"

# 2. ตรวจสอบ/สร้าง venv
if [ ! -d "venv" ]; then
    echo "[INFO] Not found venv, creating new Virtual Environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create venv!"
        echo "Try: sudo apt install python3-venv"
        exit 1
    fi
fi
source venv/bin/activate

# 3. ดึงโค้ดล่าสุด
echo ""
echo "[1/2] Pulling source code from GitHub..."
git pull
if [ $? -ne 0 ]; then
    echo "[ERROR] Pull failed (check internet or resolve local file conflicts)"
    exit 1
fi
echo "[SUCCESS] The latest code has been successfully retrieved."

# 4. อัปเดต Library
echo ""
echo "[2/2] Checking and updating libraries..."
pip install -r requirements.txt --upgrade
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to update libraries!"
    exit 1
fi
echo "[SUCCESS] Libraries ready to use"

echo ""
echo "=========================================="
echo "   ✅ Update complete!"
echo "   Run ./run.sh to start the application."
echo "=========================================="
echo ""
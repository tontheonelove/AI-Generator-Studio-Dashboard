#!/bin/bash

# ==========================================
#    AI-Generation Studio v4.0 - Auto Updater (Linux)
# ==========================================

# บังคับเปลี่ยน working directory ไปที่ตำแหน่งของ script
cd "$(dirname "$0")" || exit 1

# กำหนด path ของ Python/pip ใน venv โดยตรง (ไม่พึ่ง activate)
PYTHON_EXE="./venv/bin/python3"
PIP_EXE="./venv/bin/pip"

echo ""
echo "========================================================"
echo "   AI-Generation Studio v4.0 - Auto Updater (Linux)"
echo "========================================================"
echo "[DEBUG] Working directory: $(pwd)"
echo ""

# ==========================================
# 1. Check Git
# ==========================================
echo "[1/5] Checking Git..."
if ! command -v git &> /dev/null; then
    echo "[ERROR] Git not found!"
    echo "Please install Git with:"
    echo "  sudo apt update && sudo apt install git"
    exit 1
fi
echo "[OK] Git detected"
echo ""

# ==========================================
# 2. Check / Create venv
# ==========================================
echo "[2/5] Checking Virtual Environment..."
if [ ! -d "venv" ]; then
    echo "[WARNING] venv not found, creating new..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create venv!"
        echo "Try: sudo apt install python3-venv"
        exit 1
    fi
fi

# ตรวจสอบว่า python3 ใน venv มีอยู่จริง (auto-repair)
if [ ! -f "$PYTHON_EXE" ]; then
    echo "[ERROR] venv python3 not found at: $PYTHON_EXE"
    echo "[INFO] Deleting broken venv and recreating..."
    rm -rf venv
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to recreate venv!"
        exit 1
    fi
fi
echo "[OK] venv ready"
echo ""

# ==========================================
# 3. Pull latest code from GitHub
# ==========================================
echo "[3/5] Pulling latest code from GitHub..."
echo ""
git pull
if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] git pull failed!"
    echo "Possible causes:"
    echo "  - No internet connection"
    echo "  - Uncommitted local changes (run 'git stash' first)"
    echo "  - Merge conflict (resolve manually then retry)"
    echo ""
    exit 1
fi
echo ""
echo "[OK] Source code updated successfully"
echo ""

# ==========================================
# 4. Update Python dependencies
# ==========================================
echo "[4/5] Updating Python dependencies..."
"$PIP_EXE" install -r requirements.txt --upgrade -q
if [ $? -ne 0 ]; then
    echo "[ERROR] pip install failed!"
    exit 1
fi
echo "[OK] Python dependencies updated"
echo ""

# ==========================================
# 5. Update Next.js dependencies
# ==========================================
echo "[5/5] Updating Next.js dependencies..."
if [ -f "frontend-next/package.json" ]; then
    cd frontend-next || exit 1
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] npm install failed!"
        cd ..
        exit 1
    fi
    cd .. || exit 1
    echo "[OK] Next.js dependencies updated"
else
    echo "[SKIP] frontend-next/package.json not found"
fi
echo ""

echo "========================================================"
echo ""
echo "   [OK] Update complete!"
echo ""
echo "   Run ./run_linux.sh to start the application."
echo ""
echo "========================================================"
echo ""
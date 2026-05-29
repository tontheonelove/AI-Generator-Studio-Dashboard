#!/bin/bash

# ==========================================
#    AI-Image-Generator-Studio - Auto Launcher (Linux)
# ==========================================
echo ""
echo "=========================================="
echo "   AI-Image-Generator-Studio - Auto Launcher"
echo "=========================================="
echo ""

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Not found Python3"
    echo "Please install Python 3.10+ with:"
    echo "  sudo apt update && sudo apt install python3 python3-pip python3-venv"
    echo ""
    exit 1
fi

echo "[1/4] Detected Python:"
python3 --version
echo ""

# 2. Create venv if not available
if [ ! -d "venv" ]; then
    echo "[2/4] Creating Virtual Environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create venv!"
        echo "Try: sudo apt install python3-venv"
        exit 1
    fi
else
    echo "[2/4] Virtual Environment already exists"
fi
echo ""

# 3. Install/Update Libraries
echo "[3/4] Installing/updating libraries (please wait)..."
source venv/bin/activate
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install libraries!"
    exit 1
fi
echo "[INFO] Libraries ready to use"
echo ""

# 4. Run App
echo "[4/4] Starting Backend Server..."
echo ""
echo "=========================================="
echo "  Starting Server on http://0.0.0.0:8000"
echo "=========================================="
echo ""

# เปิด Browser อัตโนมัติ (ถ้ามี GUI / Desktop Environment)
if command -v xdg-open &> /dev/null; then
    sleep 5 && xdg-open "http://localhost:8000" &
elif command -v open &> /dev/null; then
    sleep 5 && open "http://localhost:8000" &
else
    echo "[INFO] No browser detected. Open manually: http://<SERVER_IP>:8000"
fi

# รัน uvicorn โดยตรง (ไม่เปิดหน้าต่างแยกเหมือน Windows)
uvicorn backend.app:app --host 0.0.0.0 --port 8000
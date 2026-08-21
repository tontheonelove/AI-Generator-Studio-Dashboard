#!/bin/bash

# ==========================================
#    AI-Generation Studio v4.0 - Auto Launcher (Linux)
# ==========================================

# เปลี่ยน working directory ไปที่ตำแหน่งของ script นี้
cd "$(dirname "$0")" || exit 1

# กำหนด path ของ Python/pip/uvicorn ใน venv
PYTHON_EXE="./venv/bin/python3"
PIP_EXE="./venv/bin/pip"
UVICORN_EXE="./venv/bin/uvicorn"

echo ""
echo "========================================================"
echo "   AI-Generation Studio v4.0 - Auto Launcher (Linux)"
echo "========================================================"
echo "[DEBUG] Working directory: $(pwd)"
echo ""

# ==========================================
# 1. Check Python3
# ==========================================
echo "[1/6] Checking Python3..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 not found!"
    echo "Please install Python 3.10+ with:"
    echo "  sudo apt update && sudo apt install python3 python3-pip python3-venv"
    echo ""
    exit 1
fi
echo "[OK] Python detected:"
python3 --version
echo ""

# ==========================================
# 2. Check Node.js
# ==========================================
echo "[2/6] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found!"
    echo "Please install Node.js 20+ with:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt install -y nodejs"
    echo ""
    exit 1
fi
echo "[OK] Node.js detected:"
node --version
npm --version
echo ""

# ==========================================
# 3. Check required folders
# ==========================================
echo "[3/6] Checking required folders..."
if [ ! -d "backend" ]; then
    echo "[ERROR] backend/ folder not found!"
    exit 1
fi
echo "[OK] backend/ exists"

if [ ! -d "frontend-next" ]; then
    echo "[ERROR] frontend-next/ folder not found!"
    exit 1
fi
echo "[OK] frontend-next/ exists"

# สร้าง venv ถ้ายังไม่มี
if [ ! -d "venv" ]; then
    echo "[WARNING] venv not found, creating..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create venv!"
        echo "Try: sudo apt install python3-venv"
        exit 1
    fi
fi

# ตรวจสอบว่า python3 ใน venv มีอยู่จริง
if [ ! -f "$PYTHON_EXE" ]; then
    echo "[ERROR] venv python3 not found at: $PYTHON_EXE"
    echo "[INFO] Deleting broken venv and recreating..."
    rm -rf venv
    python3 -m venv venv
fi
echo "[OK] venv/ ready"
echo ""

# ==========================================
# 4. Install Python dependencies
# ==========================================
echo "[4/6] Installing Python dependencies..."
"$PIP_EXE" install -r requirements.txt -q
if [ $? -ne 0 ]; then
    echo "[ERROR] pip install failed!"
    exit 1
fi
echo "[OK] Python dependencies ready"
echo ""

# ==========================================
# 5. Setup Next.js Frontend
# ==========================================
echo "[5/6] Setting up Next.js frontend..."
cd frontend-next || exit 1
echo "[DEBUG] Now in: $(pwd)"

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages (first time only, may take 2-5 minutes)..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] npm install failed!"
        cd ..
        exit 1
    fi
else
    echo "[OK] node_modules already exists"
fi

cd .. || exit 1
echo "[DEBUG] Back to: $(pwd)"
echo "[OK] Next.js frontend ready"
echo ""

# ==========================================
# 6. Detect Local IP Address
# ==========================================
echo "[INFO] Detecting local IP address..."
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')
fi
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="YOUR_IP_ADDRESS"
fi
echo "[OK] Local IP: $LOCAL_IP"
echo ""

# ==========================================
# 7. Start Servers
# ==========================================
echo "[6/6] Starting servers..."
echo ""

# --- Cleanup function สำหรับหยุด process ทั้งหมดเมื่อ Ctrl+C ---
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "========================================================"
    echo "  Shutting down servers..."
    echo "========================================================"
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
    wait 2>/dev/null
    echo "[OK] All servers stopped. Goodbye!"
    exit 0
}

trap cleanup SIGINT SIGTERM

# --- Start Backend Server ---
echo "Starting Backend Server on port 8000..."
"$UVICORN_EXE" backend.app:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "[OK] Backend PID: $BACKEND_PID"

echo "Waiting 5 seconds for backend to start..."
sleep 5

# --- Start Frontend Server (LAN Access Enabled) ---
echo "Starting Frontend Server on port 3000 (LAN Access Enabled)..."
(cd frontend-next && npm run dev -- --hostname 0.0.0.0) &
FRONTEND_PID=$!
echo "[OK] Frontend PID: $FRONTEND_PID"

echo "Waiting 10 seconds for frontend to compile..."
sleep 10

# --- Open Browser ---
if command -v xdg-open &> /dev/null; then
    echo "Opening browser..."
    xdg-open "http://localhost:3000" &
elif command -v open &> /dev/null; then
    echo "Opening browser..."
    open "http://localhost:3000" &
else
    echo "[INFO] No browser detected. Open manually."
fi

echo ""
echo "========================================================"
echo ""
echo "   [OK] SUCCESS! AI-Generation Studio v4.0 is ready!"
echo ""
echo "   [LOCAL ACCESS - This Computer]"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "   [NETWORK ACCESS - Other Devices on Same LAN]"
echo "   Frontend: http://${LOCAL_IP}:3000"
echo "   Backend:  http://${LOCAL_IP}:8000"
echo ""
echo "   [HOW TO ACCESS FROM OTHER DEVICES]"
echo "   1. Make sure all devices are on the same network"
echo "   2. Open browser on other device"
echo "   3. Go to: http://${LOCAL_IP}:3000"
echo "   4. Start generating!"
echo ""
echo "   [IMPORTANT NOTES]"
echo "   - Press Ctrl+C to stop all servers"
echo "   - First access may take 30-60 seconds to compile"
echo ""
echo "========================================================"
echo ""

# รอจนกว่าจะกด Ctrl+C
wait
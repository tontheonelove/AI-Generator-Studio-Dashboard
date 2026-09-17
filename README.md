# AI-Generator-Studio-Dashboard

<img src=ex.png/>

---

## 🚀 Version 4.1 (17-9-26) MUSIC MODEL UPDATE ***  
  - YUE 2 Text to Music
  - YUE 2 Music Cover
  - Fix Some BUG
  
---

## New Instalation (First time) แนะนำ ** เพื่อความ Clean

### Requirements (สิ่งที่ต้องมี)
- Python 3.10+ (Add to PATH)  | สำหรับ Linux ดูวิธีิตดตั้งได้ตามเน็ตได้เลย
- Node.js 20+ LTS | สำหรับ Linux ดูวิธีิตดตั้งได้ตามเน็ตได้เลย
- NVIDIA GPU + Driver  | สำหรับ Linux ดูวิธีิตดตั้งได้ตามเน็ตได้เลย
- ComfyUI (running on port 8188) ต้องเปิดตลอด เพราะใช้เป็น backend server

## How to Installation (วิธีติดตั้งใหม่) 👉 Windows

1. git clone https://github.com/tontheonelove/AI-Generator-Studio-Dashboard.git
2. Double-click `run_windows_only.bat`
3. Wait for setup (first time: 5-10 minutes)
4. Browser opens automatically

## Access
- **Local:** http://localhost:3000
- **LAN:** See IP in launcher window example http://192.168.1.100:3000

---

## How to Installation (วิธีติดตั้งใหม่) 👉 Linux

1. git clone https://github.com/tontheonelove/AI-Generator-Studio-Dashboard.git
2. cd AI-Generator-Studio-Dashboard
3. ./run_linux_only.sh
4. Browser opens automatically

## Access
- **Local:** http://localhost:3000
- **LAN:** See IP in launcher window example http://192.168.1.100:3000

---

## How to Update (วิธีอัพเดต) 👉 Windows
1. Double-click `update_windows_only.bat`
2. Double-click `run_windows_only.bat`
3. Browser opens automatically

---

## How to Update (วิธีอัพเดต) 👉 Linux
1. ./update_linux_only.sh
2. ./run_linux_only.sh
3. Browser opens automatically

---


📢 For ImageEdit / Video Change path on config.json (edit your comfyui path)

```
{
    "comfyui_input_dir": "D:/ComfyUI_windows_portable/ComfyUI/input",
    "comfyui_output_dir": "D:/ComfyUI_windows_portable/ComfyUI/output"
}
```

## ✨ Key Features

✅Intuitive Dashboard UI: A clean, two-column layout designed for a distraction-free creative process.

✅Real-time Progress Tracking: Live WebSocket integration to monitor generation progress step-by-step.

✅Dynamic Aspect Ratio Selector: Easily switch between Square (1:1), Portrait (9:16), Landscape (16:9), and FHD (1080p).

✅Advanced Parameter Control: Fine-tune Seeds and prompts with a persistent session state that remembers your last masterpiece.

✅One-Click Download: Instantly save your generated high-resolution images.

✅Support Computer / Ipad / Mobile UI
 
🔥 Require  Python3.10 +

---


### License
MIT License © 2026 TonLikeIT










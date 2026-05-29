# AI-Generator-Studio-Dashboard

<img src=ex.png/>

## 🔥🔥 Update (29-5-26) 

💻 New Feature Image & Image Edit Added 
   - Qwen image edit 2511 (GGUF) (Image Edit)
   - Flux Klein 9B Face Swap (GGUF) (Image Edit)
   - Qwen image 2512 (with Loras 4 Step ) (Image)
   - Meinamix Anime (Image)
   - Wan2.2 (Image)

📱 Upgrade Frontend & Backend

✅ Link Model Update!!

🌍 Support Windows & Linux Production

---

## 🚀🚀 Update (27-5-26)

<img src=lora.png/>

🚀 Support Loras template added 4 loras

🔥 Add more prompt template random

✅ Add more resolution max 4K

---

## Update 🔥🔥 (25-5-26)


🖼️ Gallery / History (Databases)

✅ Automatic image saving: Generated images will be saved to the backend/outputs/ folder and the data will be saved to the history.db database.

✅ Gallery button: In the upper right corner of the website, there is a button to view the history of all images that have been generated.

✅ One-Click Re-run: Click on an image in the gallery → The system will immediately retrieve the Prompt, Seed, and Model and fill them into the fields → You can regenerate or continue editing without having to type them again.

🔥Support localnetwork & public production use your ip example 192.168.1.1:8000  and share ..

---

## Update 🚀🚀 (21-5-26)

✅ Migrate New UI

✅ Support Model  Z-Image Turbo , Flux2. Klein9B

✅ Support N8N API CALL

✅ Queue process

✅ Sound & popup notification when done !

❌ Remove RunPOD  (will comback check security)

---

## Update 🚀🚀 (27-4-26)

🚀 Support Multiplatform (You can select between Comfyui locally and Comfyui Runpod)  🔥

---

## Update 🚀🚀 (26-4-26)

🚀 Support Model  Z-Image Turbo , Flux2. Klein9B  

---

## ✨ Key Features

✅Intuitive Dashboard UI: A clean, two-column layout designed for a distraction-free creative process.

✅Real-time Progress Tracking: Live WebSocket integration to monitor generation progress step-by-step.

✅Dynamic Aspect Ratio Selector: Easily switch between Square (1:1), Portrait (9:16), Landscape (16:9), and FHD (1080p).

✅Advanced Parameter Control: Fine-tune Seeds and prompts with a persistent session state that remembers your last masterpiece.

✅One-Click Download: Instantly save your generated high-resolution images.

✅Support Computer / Ipad / Mobile UI
 
🔥 Require  Python3.10 +

---

## 🛠️ Local Installation (Windows)

```
git clone https://github.com/tontheonelove/AI-Generator-Studio-Dashboard.git
cd AI-Generator-Studio-Dashboard
start with run_windows_only.bat
```

## 🛠️ Server Installation (Linux) Recommend Ubuntu

```
git clone https://github.com/tontheonelove/AI-Generator-Studio-Dashboard.git
cd AI-Generator-Studio-Dashboard
chmod +x run_linux_only.sh
run ./run_linux_only.sh
```

✅ Prepare ComfyUI:

    - Ensure ComfyUI is running locally (default: 127.0.0.1:8188).

    - Load the provided yourworkflow.json  workflow into your ComfyUI to ensure all custom nodes are present.
  
✅ [Important!!] Check Workflow with Your Comfyui Host is Complitable ( there are two options )

✅  Use the workflow from the code. The first thing to do is import the workflow from the /backend/workflow/ folder into your Comfyui and download
 
the model that matches that workflow. Once done, test generating it on your Comfyui. If it works, you can 

use it directly through this Studio.
 


### Let s try....   

---
  
##  🛠️ How to update when available🔥

🚀 just run update_windows_only.bat   for Linux just run update_linux_only.sh

---

### License
MIT License © 2026 TonLikeIT










# AI-Generator-Studio-Dashboard


## Update 🔥🔥 (25-5-26)

---

🥇 1. 🖼️ Gallery / History (Databases)

✅ Automatic image saving: Generated images will be saved to the backend/outputs/ folder and the data will be saved to the history.db database.

✅ Gallery button: In the upper right corner of the website, there is a button to view the history of all images that have been generated.

✅ One-Click Re-run: Click on an image in the gallery → The system will immediately retrieve the Prompt, Seed, and Model and fill them into the fields → You can regenerate or continue editing without having to type them again.

---

🥈 2. 📊 Real-time Progress Bar 

✅ See the actual steps: The progress bar will move according to the progress value sent by ComfyUI (e.g., 10/20 steps).

✅ See the Node name: The message below will indicate what is currently being done (e.g., Loading Model, Sampling, VAE Decode).

✅ New technology: Uses Server-Sent Events (SSE) instead of regular HTTP, allowing data to flow from the backend to the webpage in real-time without waiting for completion.

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

## 🛠️ Local Installation (Virtual Environment [VENV])
1. Clone the Repository:

```
git clone https://github.com/tontheonelove/AI-Generator-Studio-Dashboard-API.git
cd AI-Generator-Studio-Dashboard-API
start with run.bat
```

2. Prepare ComfyUI:

    - Ensure ComfyUI is running locally (default: 127.0.0.1:8188).

    - Load the provided yourworkflow.json  workflow into your ComfyUI to ensure all custom nodes are present.
  
3. [Important!!] Check Workflow with Your Comfyui Host is Complitable ( there are two options )


 ✅ 3.1 Use the workflow from the code. The first thing to do is import the workflow from the /backend/workflow/ folder into your Comfyui and download
 
   the model that matches that workflow. Once done, test generating it on your Comfyui. If it works, you can use it directly through this Studio.
 
 ✅ 3.2 Use your own workflow by exporting via API and placing the workflow.json file in /backend/workflow/. If the workflow name changes, edit the
 
   app.py file in this section.
 
    ```
      WORKFLOW_SETTINGS = {
     "Z-Image Turbo": {
         "file": "workflow/image_z_image_turbo.json",   ## Name your file exactly as it is.
         "prompt_id": "57:27",  ### Check that the ID matches your workflow section.
         "seed_id": "57:3",  ### Check that the ID matches your workflow section.
         "latent_id": "57:13"   ### Check that the ID matches your workflow section.
 
     "Flux 2 Klein": {
         "file": "workflow/image_flux2_text_to_image_9b.json",   ## Name your file exactly as it is.
         "prompt_id": "75:74",    ### Check that the ID matches your workflow section.             
         "seed_id": "75:73",      ### Check that the ID matches your workflow section.            
         "width_id": "75:68",     ### Check that the ID matches your workflow section.          
         "height_id": "75:69",    ### Check that the ID matches your workflow section.          
         "seed_key": "noise_seed"   ### Check that the ID matches your workflow section.  ```


### Let s try....   

---
  
##  🛠️ How to update when available🔥

🚀 just run update.bat 

---

### License
MIT License © 2026 TonLikeIT










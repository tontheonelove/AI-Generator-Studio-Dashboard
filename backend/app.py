from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import base64
import os
import traceback
import time
import json
from .comfy_client import generate_image
from .database import init_db, save_history, get_history

app = FastAPI(title="AI-Image-Generator-API")

# 🔒 Queue Flag
is_processing = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ BASE_DIR
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LORA_CONFIG_PATH = os.path.join(BASE_DIR, "lora_config.json")

def load_lora_config():
    """โหลดรายชื่อ LoRA จาก config file"""
    try:
        if os.path.exists(LORA_CONFIG_PATH):
            with open(LORA_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"[LoRA] Error loading config: {e}")
        return {}

init_db()

# Config Paths
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

WORKFLOW_SETTINGS = {
    "Z-Image Turbo": {
        "file": "workflow/image_z_image_turbo.json",
        "prompt_id": "57:27",
        "seed_id": "57:3",
        "latent_id": "57:13",
        "lora_id": "57:62" 
    },
    "Z-Image Turbo-GGUF": {
        "file": "workflow/image_z_image_turbo_gguf.json",
        "prompt_id": "57:27",
        "seed_id": "57:3",
        "latent_id": "57:13",
        "lora_id": "57:62"  
    },
    "Flux 2 Klein-GGUF": {
        "file": "workflow/image_flux2_text_to_image_9b.json",
        "prompt_id": "75:74",               
        "seed_id": "75:73",                
        "width_id": "75:68",               
        "height_id": "75:69",               
        "seed_key": "noise_seed",
        "lora_id": "10" 
    }
}

class GenerationRequest(BaseModel):
    prompt: str
    model: str
    seed: int = -1
    width: int = 1024
    height: int = 1024
    lora_filename: str = ""
    lora_strength: float = 0.0

@app.get("/api/status")
def get_status():
    return {"is_processing": is_processing}

@app.get("/api/history")
def api_history():
    return get_history()

@app.get("/api/outputs/{filename}")
def serve_output(filename: str):
    filepath = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)

@app.get("/api/loras/{model_name}")
def get_loras(model_name: str):
    """ดึงรายชื่อ LoRA สำหรับ Model ที่ระบุ"""
    config = load_lora_config()
    loras = config.get(model_name, [])
    return {"loras": loras}

@app.post("/api/generate")
def generate_image_endpoint(req: GenerationRequest):
    global is_processing
    
    if is_processing:
        raise HTTPException(status_code=429, detail="ระบบกำลังประมวลผลอยู่ กรุณารอสักครู่...")
    
    if req.model not in WORKFLOW_SETTINGS:
        raise HTTPException(status_code=404, detail=f"Model '{req.model}' not found")
    
    config = WORKFLOW_SETTINGS[req.model]
    workflow_path = os.path.join(BASE_DIR, config["file"])
    
    if not os.path.exists(workflow_path):
        raise HTTPException(status_code=500, detail=f"Workflow file missing")

    is_processing = True
    print(f"[Queue] 🔒 Locked - {req.model}")
    
    try:
        print(f"[App] Starting generation: {req.model}")
        
        # ✅ ส่งค่า lora เข้าไปด้วย
        result = generate_image(
            req.prompt, req.seed, req.width, req.height, 
            req.lora_filename, req.lora_strength, config
        )
        
        if not result.get('images'):
            raise HTTPException(status_code=500, detail="No images generated")
        
        img_data = result['images'][0]['data']
        filename = f"{int(time.time())}_{result['seed']}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(img_data)
        
        save_history(req.prompt, req.model, result['seed'], req.width, req.height, filename)
        
        b64_img = base64.b64encode(img_data).decode('utf-8')
        
        print("[App] Generation Success!")
        return {
            "success": True,
            "seed": result['seed'],
            "filename": filename,
            "url": f"/api/outputs/{filename}",
            "base64": f"data:image/png;base64,{b64_img}"
        }

    except HTTPException:
        raise
    except Exception as e:
        error_trace = traceback.format_exc()
        print("--- ERROR ---")
        print(error_trace)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        is_processing = False
        print("[Queue] 🔓 Unlocked")

@app.get("/api/version")
def get_version():
    version_path = os.path.join(BASE_DIR, "..", "version.json")
    try:
        if os.path.exists(version_path):
            with open(version_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"version": "1.0.0", "features": [], "release_date": ""}
    except Exception as e:
        print(f"[Version] Error reading version.json: {e}")
        return {"version": "unknown", "features": [], "release_date": ""}

# Mount Frontend
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
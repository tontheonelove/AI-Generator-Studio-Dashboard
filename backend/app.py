from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import base64
import os
import traceback
import time
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

init_db()

# Config Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

WORKFLOW_SETTINGS = {
    "Z-Image Turbo": {
        "file": "workflow/image_z_image_turbo.json",
        "prompt_id": "57:27",
        "seed_id": "57:3",
        "latent_id": "57:13"
    },
    "Z-Image Turbo-GGUF": {
        "file": "workflow/image_z_image_turbo_gguf.json",
        "prompt_id": "57:27",
        "seed_id": "57:3",
        "latent_id": "57:13"
    },
    "Flux 2 Klein-GGUF": {
        "file": "workflow/image_flux2_text_to_image_9b.json",
        "prompt_id": "75:74",               
        "seed_id": "75:73",                
        "width_id": "75:68",               
        "height_id": "75:69",               
        "seed_key": "noise_seed"         
    }
}

class GenerationRequest(BaseModel):
    prompt: str
    model: str
    seed: int = -1
    width: int = 1024
    height: int = 1024

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
        
        result = generate_image(req.prompt, req.seed, req.width, req.height, config)
        
        if not result.get('images'):
            raise HTTPException(status_code=500, detail="No images generated")
        
        # Save image to file
        img_data = result['images'][0]['data']
        filename = f"{int(time.time())}_{result['seed']}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(img_data)
        
        # Save to DB
        save_history(req.prompt, req.model, result['seed'], req.width, req.height, filename)
        
        # Convert to base64 for response
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

# Mount Frontend
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
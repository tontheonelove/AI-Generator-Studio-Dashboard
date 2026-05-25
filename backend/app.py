from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
import os
import traceback
import json
import time
from .comfy_client import generate_image_stream
from .database import init_db, save_history, get_history

app = FastAPI(title="AI-Image-Generator-API")

# 🔒 Global Queue Flag
is_processing = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init Database
init_db()

# --- Config Paths ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

WORKFLOW_SETTINGS = {
    "Z-Image Turbo": {
        "file": "workflow/image_z_image_turbo.json",
        "prompt_id": "57:27",
        "seed_id": "57:3",
        "latent_id": "57:13",
        # ⚠️ ต้องเช็ค ID ใน JSON ของคุณให้ตรงกับ Node ที่ใช้ CFG/Sampler/Negative
        "neg_id": "57:28", 
        "cfg_id": "57:30",
        "steps_id": "57:31",
        "sampler_id": "57:32"
    },
    "Flux 2 Klein": {
        "file": "workflow/image_flux2_text_to_image_9b.json",
        "prompt_id": "75:74",               
        "seed_id": "75:73",                
        "width_id": "75:68",               
        "height_id": "75:69",               
        "seed_key": "noise_seed",
        "neg_id": "75:75",
        "cfg_id": "75:76",
        "steps_id": "75:77",
        "sampler_id": "75:78"
    }
}

class GenerationRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    model: str
    seed: int = -1
    width: int = 1024
    height: int = 1024

# --- Routes ---

@app.get("/api/status")
def get_status():
    return {"is_processing": is_processing}

@app.get("/api/history")
def api_history():
    return get_history()

@app.get("/api/outputs/{filename}")
def serve_output(filename: str):
    return FileResponse(os.path.join(OUTPUT_DIR, filename))

@app.post("/api/generate")
async def generate_image(req: GenerationRequest):
    global is_processing
    if is_processing:
        raise HTTPException(status_code=429, detail="ระบบกำลังประมวลผลอยู่")
    
    if req.model not in WORKFLOW_SETTINGS:
        raise HTTPException(status_code=404, detail="Model not found")

    config = WORKFLOW_SETTINGS[req.model]
    is_processing = True

    # ฟังก์ชันสำหรับ Streaming ข้อมูลกลับทีละส่วน (Real-time)
    async def event_stream():
        try:
            for update in generate_image_stream(
                req.prompt, req.seed, req.width, req.height, 
                req.negative_prompt, config  # ✅ ลบ cfg, steps, sampler ออกแล้ว
            ):
                # ✅ เฉพาะ progress/status เท่านั้นที่ส่งเป็น JSON
                if update['type'] in ['progress', 'status']:
                    yield f"data: {json.dumps(update)}\n\n"
                
                elif update['type'] == 'done':
                    # บันทึกรูปลงโฟลเดอร์
                    img_data = update['images'][0]['data']
                    filename = f"{int(time.time())}_{req.seed}.png"
                    filepath = os.path.join(OUTPUT_DIR, filename)
                    with open(filepath, "wb") as f:
                        f.write(img_data)
                    
                    # บันทึกลง DB
                    save_history({
                        'prompt': req.prompt, 
                        'neg': req.negative_prompt,
                        'model': req.model, 
                        'seed': req.seed,
                        'w': req.width, 
                        'h': req.height,
                        'cfg': 7.0,      # ✅ ใส่ค่า default ไปก่อน (หรือลบออกถ้าไม่ใช้)
                        'steps': 20,     # ✅ ใส่ค่า default ไปก่อน
                        'sampler': 'euler', # ✅ ใส่ค่า default ไปก่อน
                        'filename': filename
                    })
                    
                    # ✅ ส่งแค่ URL (ไม่ใช่ bytes!)
                    done_msg = {
                        "type": "complete", 
                        "url": f"/api/outputs/{filename}", 
                        "seed": req.seed
                    }
                    yield f"data: {json.dumps(done_msg)}\n\n"
                    break
        except Exception as e:
            error_msg = {"type": "error", "detail": str(e)}
            yield f"data: {json.dumps(error_msg)}\n\n"
        finally:
            is_processing = False

    return StreamingResponse(event_stream(), media_type="text/event-stream")

# Mount Frontend
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
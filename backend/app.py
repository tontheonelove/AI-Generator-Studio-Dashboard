from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
import os
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

# ตั้งค่า Workflow
WORKFLOW_SETTINGS = {
    "Z-Image Turbo": {
        "file": "workflow/image_z_image_turbo.json",
        "prompt_id": "57:27",
        "seed_id": "57:3",
        "latent_id": "57:13",
        "neg_id": "57:28" 
    },
    "Flux 2 Klein": {
        "file": "workflow/image_flux2_text_to_image_9b.json",
        "prompt_id": "75:74",               
        "seed_id": "75:73",                
        "width_id": "75:68",               
        "height_id": "75:69",               
        "seed_key": "noise_seed",
        "neg_id": "75:75"
    }
}

# Model Request
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
        # ✅ ✅ สำคัญ: ต้องประกาศ global ที่นี่ด้วย ไม่งั้น is_processing จะไม่เปลี่ยนค่าจริง!
        global is_processing 
        try:
            for update in generate_image_stream(
                req.prompt, req.seed, req.width, req.height, 
                req.negative_prompt, config 
            ):
                if update['type'] in ['progress', 'status']:
                    yield f"data: {json.dumps(update)}\n\n"
                
                elif update['type'] == 'done':
                    # บันทึกรูปลงโฟลเดอร์
                    img_data = update['images'][0]['data']
                    filename = f"{int(time.time())}_{req.seed}.png"
                    filepath = os.path.join(OUTPUT_DIR, filename)
                    with open(filepath, "wb") as f:
                        f.write(img_data)
                    
                    # ✅ ✅ ใช้ update['seed'] (Seed จริง) แทน req.seed (-1)
                    actual_seed = update['seed']

                    # บันทึกลง DB
                    save_history({
                        'prompt': req.prompt, 
                        'neg': req.negative_prompt,
                        'model': req.model, 
                        'seed': actual_seed,  # ✅ แก้ไขตรงนี้
                        'w': req.width, 
                        'h': req.height,
                        'filename': filename
                    })
                    
                    # ส่งแค่ URL พร้อม Seed จริง
                    done_msg = {
                        "type": "complete", 
                        "url": f"/api/outputs/{filename}", 
                        "seed": actual_seed  # ✅ แก้ไขตรงนี้
                    }
                    yield f"data: {json.dumps(done_msg)}\n\n"
                    
                    # ปลดล็อกทันทีหลังส่งข้อมูลเสร็จ
                    is_processing = False
                    break
        except Exception as e:
            error_msg = {"type": "error", "detail": str(e)}
            yield f"data: {json.dumps(error_msg)}\n\n"
        finally:
            # รับประกันว่าปลดล็อกเสมอแม้เกิด Error
            is_processing = False

    return StreamingResponse(event_stream(), media_type="text/event-stream")

# Mount Frontend
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
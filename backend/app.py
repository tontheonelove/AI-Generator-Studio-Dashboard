from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import base64
import os
import traceback
import time
import json
import shutil
import re
import requests
from .comfy_client import generate_image, generate_edit, generate_image_stream, generate_edit_stream
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

# ✅ Config Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

CONFIG_PATH = os.path.join(BASE_DIR, "config.json")

def load_config():
    """โหลด Path Configuration จากไฟล์ config.json"""
    config_path = os.path.join(BASE_DIR, "config.json")
    
    print(f"\n{'='*60}")
    print(f"[Config Debug] BASE_DIR = {BASE_DIR}")
    print(f"[Config Debug] CONFIG_PATH = {config_path}")
    print(f"[Config Debug] File exists = {os.path.exists(config_path)}")
    
    default_input = os.path.join(BASE_DIR, "inputs")
    
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                raw_content = f.read()
                print(f"[Config Debug] Raw content = {raw_content[:200]}")
                cfg = json.loads(raw_content)
                input_dir = cfg.get("comfyui_input_dir", default_input)
                print(f"[Config Debug] ✅ Loaded value = {input_dir}")
                print(f"{'='*60}\n")
                return input_dir
        except Exception as e:
            print(f"[Config Debug] ❌ JSON parse error: {e}")
            print(f"{'='*60}\n")
            return default_input
    else:
        print(f"[Config Debug] ❌ File not found, using default = {default_input}")
        print(f"{'='*60}\n")
        return default_input

COMFYUI_INPUT_DIR = load_config()
os.makedirs(COMFYUI_INPUT_DIR, exist_ok=True)

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

WORKFLOW_SETTINGS = {
    # === Generate Models ===
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
    },
    "Qwen Image 2512": {
        "file": "workflow/image_qwen_image_2512.json",
        "prompt_id": "238:227",
        "seed_id": "238:230",
        "latent_id": "238:232",
        "seed_key": "seed",
        "lora_id": "238:221"
    },
    "Wan2.2 Image": {
        "file": "workflow/wan22_image.json",
        "prompt_id": "29",
        "seed_id": "41",
        "latent_id": "26",
        "seed_key": "seed",
        "lora_id": "81"  
    },
    "MeinaMix Anime": {
        "file": "workflow/MeinaMix_Anime.json",
        "prompt_id": "6",
        "seed_id": "3",
        "latent_id": "5",
        "seed_key": "seed"
    },
    # === Edit Models ===
    "Flux Face Swap": {
        "file": "workflow/flux_faceswap.json",
        "prompt_id": "64",
        "seed_id": "111",
        "seed_key": "noise_seed",
        "image1_id": "116",
        "image2_id": "124",
        "require_both_images": True
    },
    "Qwen Image Edit": {
        "file": "workflow/qwen_image_edit.json",
        "prompt_id": "68",
        "seed_id": "65",
        "image1_id": "41",
        "image2_id": "83",
        "disable_nodes_if_no_img2": ["83"],
        "require_both_images": False
    },
}

class GenerationRequest(BaseModel):
    prompt: str
    model: str
    seed: int = -1
    width: int = 1024
    height: int = 1024
    lora_filename: str = ""
    lora_strength: float = 0.0
    mode: str = "generate"
    image1_filename: str = ""
    image2_filename: str = ""

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
    config = load_lora_config()
    loras = config.get(model_name, [])
    return {"loras": loras}

@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...)):
    try:
        timestamp = int(time.time())
        clean_name = re.sub(r'[^\w\-.]', '_', file.filename)
        safe_filename = f"web_{timestamp}_{clean_name}"
        filepath = os.path.join(COMFYUI_INPUT_DIR, safe_filename)

        print(f"\n{'='*60}")
        print(f"[Upload Debug] COMFYUI_INPUT_DIR = {COMFYUI_INPUT_DIR}")
        print(f"[Upload Debug] Filename = {safe_filename}")
        print(f"[Upload Debug] Full path = {filepath}")
        print(f"[Upload Debug] Dir exists = {os.path.exists(COMFYUI_INPUT_DIR)}")
        print(f"[Upload Debug] Dir is writable = {os.access(COMFYUI_INPUT_DIR, os.W_OK)}")

        if not os.path.exists(COMFYUI_INPUT_DIR):
            raise HTTPException(status_code=500, detail=f"ComfyUI input folder not found: {COMFYUI_INPUT_DIR}")

        content = await file.read()
        print(f"[Upload Debug] File content size = {len(content)} bytes")

        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        with open(filepath, "wb") as f:
            f.write(content)

        file_exists = os.path.exists(filepath)
        file_size = os.path.getsize(filepath) if file_exists else 0
        print(f"[Upload Debug] File created = {file_exists}")
        print(f"[Upload Debug] File size on disk = {file_size} bytes")
        print(f"[Upload Debug] Size match = {file_size == len(content)}")

        all_files = sorted(os.listdir(COMFYUI_INPUT_DIR))
        recent_files = [f for f in all_files if f.startswith("web_")]
        print(f"[Upload Debug] Recent web_ files ({len(recent_files)}): {recent_files[-5:]}")
        print(f"{'='*60}\n")

        return {"filename": safe_filename}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Upload ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ✅ SSE Endpoint สำหรับ Real-time Progress + Cancel
@app.post("/api/generate-stream")
async def generate_stream_endpoint(req: GenerationRequest):
    global is_processing

    if is_processing:
        async def error_stream():
            yield f"data: {json.dumps({'type': 'error', 'message': 'System busy'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    if req.model not in WORKFLOW_SETTINGS:
        async def error_stream():
            yield f"data: {json.dumps({'type': 'error', 'message': f'Model {req.model} not found'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    config = WORKFLOW_SETTINGS[req.model]
    workflow_path = os.path.join(BASE_DIR, config["file"])

    if not os.path.exists(workflow_path):
        # ✅ แก้ไข SyntaxError: แยกตัวแปรออกจาก f-string
        missing_file = config["file"]
        async def error_stream():
            yield f"data: {json.dumps({'type': 'error', 'message': f'Workflow file missing: {missing_file}'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    is_edit_mode = req.mode == "edit"

    if is_edit_mode:
        if not req.image1_filename:
            async def error_stream():
                yield f"data: {json.dumps({'type': 'error', 'message': 'Image 1 required'})}\n\n"
            return StreamingResponse(error_stream(), media_type="text/event-stream")
        if config.get("require_both_images", False) and not req.image2_filename:
            async def error_stream():
                msg = f"{req.model} requires both images"
                yield f"data: {json.dumps({'type': 'error', 'message': msg})}\n\n"
            return StreamingResponse(error_stream(), media_type="text/event-stream")

    is_processing = True
    print(f"[Queue-SSE] 🔒 Locked - {req.model} ({req.mode})")

    async def event_generator():
        global is_processing
        try:
            if is_edit_mode:
                stream_fn = generate_edit_stream(req.prompt, req.image1_filename, req.image2_filename, config)
            else:
                stream_fn = generate_image_stream(
                    req.prompt, req.seed, req.width, req.height,
                    req.lora_filename, req.lora_strength, config
                )

            final_result = None
            for event in stream_fn:
                if event["type"] == "final_result":
                    final_result = event["data"]
                elif event["type"] == "complete":
                    # ✅ ข้าม event complete เพราะมี binary data (ไม่จำเป็นสำหรับ Frontend)
                    # final_result จะถูกจับจาก event ถัดไปแทน
                    pass
                else:
                    yield f"data: {json.dumps(event)}\n\n"

            # ✅ DEBUG: เช็คก่อน save
            print(f"[SSE Debug] After loop - final_result is None? {final_result is None}")

            if final_result and final_result.get("images"):
                img_data = final_result['images'][0]['data']
                filename = f"{int(time.time())}_{final_result['seed']}.png"
                filepath = os.path.join(OUTPUT_DIR, filename)
                
                with open(filepath, "wb") as f:
                    f.write(img_data)
                print(f"[SSE Debug] ✅ File saved: {filename}")

                save_history(
                    req.prompt, req.model, final_result['seed'],
                    req.width if not is_edit_mode else 0,
                    req.height if not is_edit_mode else 0,
                    filename
                )

                b64_img = base64.b64encode(img_data).decode('utf-8')
                save_event = {
                    "type": "saved",
                    "filename": filename,
                    "url": f"/api/outputs/{filename}",
                    "base64": f"data:image/png;base64,{b64_img}",
                    "seed": final_result['seed']
                }
                print(f"[SSE Debug] ✅ Yielding saved event (base64 length: {len(b64_img)})")
                yield f"data: {json.dumps(save_event)}\n\n"
            else:
                print(f"[SSE Debug] ❌ No images in final_result!")
                yield f"data: {json.dumps({'type': 'error', 'message': 'No images generated'})}\n\n"

        except Exception as e:
            error_trace = traceback.format_exc()
            print("--- SSE ERROR ---")
            print(error_trace)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            is_processing = False
            print("[Queue-SSE] 🔓 Unlocked")

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ✅ Endpoint เดิม (Backward Compatible)
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
        raise HTTPException(status_code=500, detail=f"Workflow file missing: {config['file']}")

    is_edit_mode = req.mode == "edit"

    if is_edit_mode:
        if not req.image1_filename:
            raise HTTPException(status_code=400, detail="Image 1 is required for edit mode")
        if config.get("require_both_images", False) and not req.image2_filename:
            raise HTTPException(status_code=400, detail=f"Model '{req.model}' requires both images")

    is_processing = True
    print(f"[Queue] 🔒 Locked - {req.model} ({req.mode})")

    try:
        print(f"[App] Starting {req.mode}: {req.model}")

        if is_edit_mode:
            result = generate_edit(req.prompt, req.image1_filename, req.image2_filename, config)
        else:
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

        save_history(
            req.prompt, req.model, result['seed'],
            req.width if not is_edit_mode else 0,
            req.height if not is_edit_mode else 0,
            filename
        )

        b64_img = base64.b64encode(img_data).decode('utf-8')

        print(f"[App] {req.mode.capitalize()} Success!")
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


# ✅ Cancel Endpoint
@app.post("/api/cancel")
async def cancel_generation():
    server_address = os.environ.get("COMFYUI_SERVER", "127.0.0.1:8188")
    try:
        res = requests.post(f"http://{server_address}/interrupt", timeout=3)
        res.raise_for_status()
        print("[Cancel] ✅ Sent interrupt to ComfyUI")
        return {"success": True, "message": "Generation cancelled"}
    except Exception as e:
        print(f"[Cancel] ❌ Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Cancel failed: {str(e)}")


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
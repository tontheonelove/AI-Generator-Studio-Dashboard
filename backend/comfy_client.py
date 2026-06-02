import json
import requests
import websocket
import uuid
import random
import os
import time

def get_client_id():
    return str(uuid.uuid4())


# ==========================================
# 🔥 NEW: Streaming Generators for SSE
# ==========================================

def _stream_comfy_execution(workflow, client_id, server_address="127.0.0.1:8188"):
    """Helper function สำหรับ Stream ข้อมูลจาก ComfyUI WebSocket"""
    # Queue Prompt
    try:
        response = requests.post(
            f"http://{server_address}/prompt",
            json={"prompt": workflow, "client_id": client_id}
        )
        response.raise_for_status()
        prompt_id = response.json()['prompt_id']
        yield {"type": "status", "message": "Queued", "prompt_id": prompt_id}
    except Exception as e:
        yield {"type": "error", "message": f"Failed to queue: {str(e)}"}
        return

    # Listen via WebSocket
    try:
        ws = websocket.WebSocket()
        ws.connect(f"ws://{server_address}/ws?clientId={client_id}", timeout=5)
        
        while True:
            out = ws.recv()
            if isinstance(out, str):
                message = json.loads(out)
                
                if message['type'] == 'progress':
                    data = message['data']
                    yield {
                        "type": "progress",
                        "value": data.get('value', 0),
                        "max": data.get('max', 1),
                        "prompt_id": data.get('prompt_id')
                    }
                elif message['type'] == 'executing':
                    node = message['data'].get('node')
                    pid = message['data'].get('prompt_id')
                    if node is None and pid == prompt_id:
                        break  # Execution finished
                    yield {"type": "executing", "node": node}
        
        ws.close()
    except Exception as e:
        yield {"type": "error", "message": f"WebSocket error: {str(e)}"}
        return

    # Fetch Result (รองรับ Image, Video, และ Audio)
    time.sleep(0.5)
    try:
        history = requests.get(f"http://{server_address}/history/{prompt_id}").json()
        
        if prompt_id not in history:
            yield {"type": "error", "message": "Prompt ID not found in history"}
            return
            
        outputs = history[prompt_id].get('outputs', {})
        
        images = []
        videos = []
        audios = []  # 🆕 รองรับ Audio Output
        
        for node_id, node_output in outputs.items():
            if not isinstance(node_output, dict):
                continue
                
            # 1. ตรวจสอบ key 'images' (บาง Node เช่น SaveVideo ยัด .mp4 มาในนี้)
            images_list = node_output.get('images', [])
            if isinstance(images_list, list):
                for item in images_list:
                    if isinstance(item, dict) and 'filename' in item:
                        filename = item['filename']
                        subfolder = item.get('subfolder', '')
                        item_type = item.get('type', 'output')
                        file_url = f"http://{server_address}/view?filename={filename}&subfolder={subfolder}&type={item_type}"
                        
                        # 🕵️‍♂️ เช็คนามสกุลไฟล์ว่าเป็น Video หรือไม่
                        if filename.lower().endswith(('.mp4', '.webm', '.mov', '.avi', '.mkv')):
                            print(f"[DEBUG] 🎬 Found video disguised as image: {filename}")
                            try:
                                file_data = requests.get(file_url).content
                                print(f"[DEBUG] ✅ Video fetched: {len(file_data)} bytes")
                                videos.append({
                                    "filename": filename,
                                    "data": file_data,
                                    "format": "video/mp4"
                                })
                            except Exception as fetch_err:
                                print(f"[DEBUG] ❌ Failed to fetch video: {fetch_err}")
                        else:
                            # เป็นรูปภาพปกติ
                            try:
                                file_data = requests.get(file_url).content
                                images.append({"filename": filename, "data": file_data})
                            except Exception as fetch_err:
                                print(f"[DEBUG] ❌ Failed to fetch image: {fetch_err}")
            
            # 2. ตรวจสอบ key สำหรับ Video โดยเฉพาะ (gifs, video, videos, animated)
            video_keys = ['gifs', 'video', 'videos', 'animated']
            for vkey in video_keys:
                if vkey in node_output:
                    videos_list = node_output[vkey]
                    if isinstance(videos_list, list):
                        for video in videos_list:
                            if isinstance(video, dict) and 'filename' in video:
                                video_url = f"http://{server_address}/view?filename={video['filename']}&subfolder={video.get('subfolder', '')}&type={video.get('type', 'output')}"
                                print(f"[DEBUG] 🎬 Fetching video from '{vkey}' key: {video_url}")
                                try:
                                    video_data = requests.get(video_url).content
                                    print(f"[DEBUG] ✅ Video fetched: {len(video_data)} bytes")
                                    videos.append({
                                        "filename": video['filename'],
                                        "data": video_data,
                                        "format": video.get('format', 'video/mp4')
                                    })
                                except Exception as fetch_err:
                                    print(f"[DEBUG] ❌ Failed to fetch video: {fetch_err}")
            
            # 🆕 3. ตรวจสอบ key สำหรับ Audio (audio, audios)
            audio_keys = ['audio', 'audios']
            for akey in audio_keys:
                if akey in node_output:
                    audios_list = node_output[akey]
                    if isinstance(audios_list, list):
                        for audio in audios_list:
                            if isinstance(audio, dict) and 'filename' in audio:
                                audio_url = f"http://{server_address}/view?filename={audio['filename']}&subfolder={audio.get('subfolder', '')}&type={audio.get('type', 'output')}"
                                print(f"[DEBUG] 🎵 Fetching audio from '{akey}' key: {audio_url}")
                                try:
                                    audio_data = requests.get(audio_url).content
                                    print(f"[DEBUG] ✅ Audio fetched: {len(audio_data)} bytes")
                                    audios.append({
                                        "filename": audio['filename'],
                                        "data": audio_data,
                                        "format": audio.get('format', 'audio/mpeg')
                                    })
                                except Exception as fetch_err:
                                    print(f"[DEBUG] ❌ Failed to fetch audio: {fetch_err}")
        
        print(f"[DEBUG] Final result - Images: {len(images)}, Videos: {len(videos)}, Audios: {len(audios)}")
        yield {"type": "complete", "images": images, "videos": videos, "audios": audios}
        
    except Exception as e:
        import traceback
        print(f"[ERROR] Failed to fetch result: {str(e)}")
        traceback.print_exc()
        yield {"type": "error", "message": f"Failed to fetch result: {str(e)}"}


def generate_image_stream(prompt_text, seed, width, height, lora_filename, lora_strength, config):
    """Generator สำหรับ Generate Mode แบบ Streaming"""
    client_id = get_client_id()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    workflow_path = os.path.join(base_dir, config["file"])
    
    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # Inject Parameters (เหมือนเดิมทุกประการ)
    if config["prompt_id"] in workflow:
        workflow[config["prompt_id"]]["inputs"]["text"] = prompt_text
    
    seed_key = config.get("seed_key", "seed")
    actual_seed = seed if seed != -1 else random.randint(1, 10**14)
    if config["seed_id"] in workflow:
        workflow[config["seed_id"]]["inputs"][seed_key] = actual_seed

    if "latent_id" in config and config["latent_id"] in workflow:
        workflow[config["latent_id"]]["inputs"]["width"] = width
        workflow[config["latent_id"]]["inputs"]["height"] = height
    elif "width_id" in config and "height_id" in config:
        if config["width_id"] in workflow:
            workflow[config["width_id"]]["inputs"]["value"] = width
        if config["height_id"] in workflow:
            workflow[config["height_id"]]["inputs"]["value"] = height

    lora_node_id = config.get("lora_id")
    if lora_node_id and lora_node_id in workflow:
        if lora_filename and lora_strength > 0:
            workflow[lora_node_id]["inputs"]["lora_name"] = lora_filename
            workflow[lora_node_id]["inputs"]["strength_model"] = lora_strength
        else:
            workflow[lora_node_id]["inputs"]["strength_model"] = 0.0

    # Stream execution
    final_result = None
    for event in _stream_comfy_execution(workflow, client_id):
        if event["type"] == "complete":
            final_result = {"images": event["images"], "seed": actual_seed}
        yield event
    
    if final_result:
        yield {"type": "final_result", "data": final_result}


def generate_edit_stream(prompt_text, image1_filename, image2_filename, config):
    """Generator สำหรับ Edit Mode แบบ Streaming"""
    client_id = get_client_id()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    workflow_path = os.path.join(base_dir, config["file"])
    
    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # Inject Prompt
    if config.get("prompt_id") and config["prompt_id"] in workflow:
        node_inputs = workflow[config["prompt_id"]]["inputs"]
        if "prompt" in node_inputs:
            node_inputs["prompt"] = prompt_text
        elif "text" in node_inputs:
            node_inputs["text"] = prompt_text

    # Inject Seed
    actual_seed = random.randint(1, 10**14)
    seed_key = config.get("seed_key", "seed")
    if config.get("seed_id") and config["seed_id"] in workflow:
        workflow[config["seed_id"]]["inputs"][seed_key] = actual_seed

    # Inject Image 1
    if config.get("image1_id") and config["image1_id"] in workflow:
        workflow[config["image1_id"]]["inputs"]["image"] = image1_filename
        workflow[config["image1_id"]]["inputs"]["subfolder"] = ""
        workflow[config["image1_id"]]["inputs"]["type"] = "input"

    # Inject Image 2 / Disable Logic
    has_image2 = bool(image2_filename and image2_filename.strip())
    image2_node_id = config.get("image2_id")

    if config.get("single_image_only"):
        pass
    elif has_image2 and image2_node_id and image2_node_id in workflow:
        workflow[image2_node_id]["inputs"]["image"] = image2_filename
        workflow[image2_node_id]["inputs"]["subfolder"] = ""
        workflow[image2_node_id]["inputs"]["type"] = "input"
    elif not has_image2 and config.get("disable_nodes_if_no_img2"):
        disabled_node_ids = set(str(nid) for nid in config["disable_nodes_if_no_img2"])
        for node_id in disabled_node_ids:
            if node_id in workflow:
                workflow[node_id]["mode"] = 4
        for nid, node_data in workflow.items():
            inputs = node_data.get("inputs", {})
            keys_to_remove = [
                k for k, v in inputs.items()
                if isinstance(v, list) and len(v) >= 2 and str(v[0]) in disabled_node_ids
            ]
            for k in keys_to_remove:
                del inputs[k]
    elif not has_image2 and config.get("require_both_images"):
        yield {"type": "error", "message": "This model requires both images"}
        return

    # Stream execution
    final_result = None
    for event in _stream_comfy_execution(workflow, client_id):
        if event["type"] == "complete":
            final_result = {"images": event["images"], "seed": actual_seed}
        yield event

    if final_result:
        yield {"type": "final_result", "data": final_result}


# ✅ Video Generator for Streaming (รองรับ Audio สำหรับ Lipsync)
def generate_video_stream(prompt_text, image1_filename, audio_filename, width, height, length, fps, config):
    """Generator สำหรับ Video Mode แบบ Streaming (รองรับ Audio Input สำหรับ Lipsync)"""
    client_id = get_client_id()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    workflow_path = os.path.join(base_dir, config["file"])
    
    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # ✅ Inject Prompt (รองรับทั้ง key "text" และ "value" สำหรับ PrimitiveStringMultiline)
    if config.get("prompt_id") and config["prompt_id"] in workflow:
        prompt_key = config.get("prompt_key", "text")  # default "text", Lipsync ใช้ "value"
        workflow[config["prompt_id"]]["inputs"][prompt_key] = prompt_text

    # Inject Seed
    actual_seed = random.randint(1, 10**14)
    seed_key = config.get("seed_key", "seed")
    if config.get("seed_id") and config["seed_id"] in workflow:
        workflow[config["seed_id"]]["inputs"][seed_key] = actual_seed

    # Inject Image
    if config.get("image1_id") and config["image1_id"] in workflow:
        workflow[config["image1_id"]]["inputs"]["image"] = image1_filename
        workflow[config["image1_id"]]["inputs"]["subfolder"] = ""
        workflow[config["image1_id"]]["inputs"]["type"] = "input"

    # ✅ Inject Audio (สำหรับ Lipsync)
    if config.get("is_lipsync") and config.get("audio_id") and config["audio_id"] in workflow:
        if audio_filename:
            workflow[config["audio_id"]]["inputs"]["audio"] = audio_filename
            print(f"[Video] 🎵 Audio injected: {audio_filename}")
            
            # เปิด Audio Switch ให้ใช้ Custom Audio
            if config.get("audio_switch_id") and config["audio_switch_id"] in workflow:
                workflow[config["audio_switch_id"]]["inputs"]["switch"] = True
                print("[Video] ✅ Audio switch enabled (using custom audio)")
        else:
            yield {"type": "error", "message": "Lipsync model requires audio file"}
            return

    # Inject Video Parameters
    if config.get("width_id") and config["width_id"] in workflow:
        workflow[config["width_id"]]["inputs"]["value"] = width
    if config.get("height_id") and config["height_id"] in workflow:
        workflow[config["height_id"]]["inputs"]["value"] = height
    if config.get("length_id") and config["length_id"] in workflow:
        workflow[config["length_id"]]["inputs"]["value"] = length
    if config.get("fps_id") and config["fps_id"] in workflow:
        workflow[config["fps_id"]]["inputs"]["value"] = fps

    # Stream execution
    final_result = None
    for event in _stream_comfy_execution(workflow, client_id):
        if event["type"] == "complete":
            # สำหรับ Video เราจะมองหา video output แทน image
            final_result = {"videos": event.get("videos", []), "seed": actual_seed}
        yield event
    
    if final_result:
        yield {"type": "final_result", "data": final_result}


# ✅ NEW: Tools Generator for Streaming (RTX Upscale)
def tools_stream(filename, scale, quality, config):
    """Generator สำหรับ Tools Mode (Upscale) แบบ Streaming"""
    client_id = get_client_id()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    workflow_path = os.path.join(base_dir, config["file"])
    
    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # ✅ Inject Input (Image หรือ Video)
    if config.get("is_image_tool") and config.get("image_id") in workflow:
        workflow[config["image_id"]]["inputs"]["image"] = filename
        workflow[config["image_id"]]["inputs"]["subfolder"] = ""
        workflow[config["image_id"]]["inputs"]["type"] = "input"
        print(f"[Tools] 🖼️ Image injected: {filename}")
        
    elif config.get("is_video_tool") and config.get("video_id") in workflow:
        video_key = config.get("video_key", "file")
        workflow[config["video_id"]]["inputs"][video_key] = filename
        print(f"[Tools] 🎬 Video injected: {filename}")

    # ✅ Inject Scale
    if config.get("scale_id") and config["scale_id"] in workflow:
        scale_key = config.get("scale_key", "resize_type.scale")
        workflow[config["scale_id"]]["inputs"][scale_key] = scale
        print(f"[Tools] Scale: {scale}x")

    # ✅ Inject Quality
    if config.get("quality_id") and config["quality_id"] in workflow:
        quality_key = config.get("quality_key", "quality")
        workflow[config["quality_id"]]["inputs"][quality_key] = quality
        print(f"[Tools] Quality: {quality}")

    # Stream execution
    final_result = None
    for event in _stream_comfy_execution(workflow, client_id):
        if event["type"] == "complete":
            if config.get("is_video_tool"):
                final_result = {"videos": event.get("videos", [])}
            else:
                final_result = {"images": event.get("images", [])}
        yield event
    
    if final_result:
        yield {"type": "final_result", "data": final_result}


# 🆕 Audio Generator for Streaming (AceStep 1.5)
def generate_audio_stream(tags, lyrics, duration, bpm, seed, config):
    """Generator สำหรับ Audio Generation แบบ Streaming (AceStep 1.5)"""
    client_id = get_client_id()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    workflow_path = os.path.join(base_dir, config["file"])
    
    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # ✅ Inject Tags (Style)
    if config.get("tags_id") and config["tags_id"] in workflow:
        workflow[config["tags_id"]]["inputs"]["tags"] = tags
        print(f"[Audio] 🎵 Tags injected: {tags}")

    # ✅ Inject Lyrics
    if config.get("lyrics_id") and config["lyrics_id"] in workflow:
        workflow[config["lyrics_id"]]["inputs"]["lyrics"] = lyrics
        print(f"[Audio] 📝 Lyrics injected: {lyrics[:50]}...")

    # ✅ Inject Seed
    actual_seed = seed if seed != -1 else random.randint(1, 10**14)
    seed_key = config.get("seed_key", "value")
    if config.get("seed_id") and config["seed_id"] in workflow:
        workflow[config["seed_id"]]["inputs"][seed_key] = actual_seed
        print(f"[Audio] 🎲 Seed: {actual_seed}")

    # ✅ Inject Duration
    if config.get("duration_id") and config["duration_id"] in workflow:
        duration_key = config.get("duration_key", "seconds")
        workflow[config["duration_id"]]["inputs"][duration_key] = duration
        # บาง workflow มี duration ใน node เดียวกับ tags ด้วย
        if config.get("tags_id") and config["tags_id"] in workflow:
            if "duration" in workflow[config["tags_id"]]["inputs"]:
                workflow[config["tags_id"]]["inputs"]["duration"] = duration
        print(f"[Audio] ⏱️ Duration: {duration}s")

    # ✅ Inject BPM
    if config.get("bpm_id") and config["bpm_id"] in workflow:
        bpm_key = config.get("bpm_key", "bpm")
        workflow[config["bpm_id"]]["inputs"][bpm_key] = bpm
        print(f"[Audio] 🎼 BPM: {bpm}")

    # Stream execution
    final_result = None
    for event in _stream_comfy_execution(workflow, client_id):
        if event["type"] == "complete":
            final_result = {"audios": event.get("audios", []), "seed": actual_seed}
        yield event
    
    if final_result:
        yield {"type": "final_result", "data": final_result}


# 🆕 Stable Audio 3 Generator for Streaming
def generate_stable_audio3_stream(prompt, duration, category, seed, enable_reprompt, config):
    """Generator สำหรับ Stable Audio 3 แบบ Streaming"""
    client_id = get_client_id()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    workflow_path = os.path.join(base_dir, config["file"])
    
    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # Inject Prompt (Node 52:31 - PrimitiveStringMultiline)
    if config.get("prompt_id") and config["prompt_id"] in workflow:
        prompt_key = config.get("prompt_key", "value")
        workflow[config["prompt_id"]]["inputs"][prompt_key] = prompt
        print(f"[StableAudio3] 📝 Prompt injected: {prompt[:50]}...")

    # Inject Duration (Node 52:36 - PrimitiveFloat)
    if config.get("duration_id") and config["duration_id"] in workflow:
        duration_key = config.get("duration_key", "value")
        workflow[config["duration_id"]]["inputs"][duration_key] = float(duration)
        print(f"[StableAudio3] ⏱️ Duration: {duration}s")

    # Inject Category (Node 52:43 - CustomCombo)
    if config.get("category_id") and config["category_id"] in workflow:
        category_key = config.get("category_key", "index")
        workflow[config["category_id"]]["inputs"][category_key] = int(category)
        print(f"[StableAudio3] 🏷️ Category Index: {category}")

    # Inject Seed (Node 52:3 - KSampler)
    actual_seed = seed if seed != -1 else random.randint(1, 10**14)
    if config.get("seed_id") and config["seed_id"] in workflow:
        seed_key = config.get("seed_key", "seed")
        workflow[config["seed_id"]]["inputs"][seed_key] = actual_seed
        print(f"[StableAudio3] 🎲 Seed: {actual_seed}")

    # Inject Reprompt Boolean (Node 52:35 - PrimitiveBoolean)
    if config.get("reprompt_id") and config["reprompt_id"] in workflow:
        reprompt_key = config.get("reprompt_key", "value")
        workflow[config["reprompt_id"]]["inputs"][reprompt_key] = bool(enable_reprompt)
        print(f"[StableAudio3] 🤖 Auto-Reprompt: {enable_reprompt}")

    # Stream execution
    final_result = None
    for event in _stream_comfy_execution(workflow, client_id):
        if event["type"] == "complete":
            final_result = {"audios": event.get("audios", []), "seed": actual_seed}
        yield event
    
    if final_result:
        yield {"type": "final_result", "data": final_result}


# ==========================================
# 🔧 ORIGINAL FUNCTIONS (BACKWARD COMPATIBLE)
# ==========================================

def generate_image(prompt_text, seed, width, height, lora_filename, lora_strength, config):
    """
    Generate image แบบ Simple (ไม่ใช้ streaming)
    คืนค่าเป็น dict: {"images": [...], "seed": ...}
    """
    client_id = get_client_id()
    server_address = "127.0.0.1:8188"
    http_proto = "http"
    ws_proto = "ws"
    
    print(f"[ComfyClient] Connecting to: {server_address}")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    workflow_path = os.path.join(base_dir, config["file"])
    
    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # Inject Prompt
    if config["prompt_id"] in workflow:
        workflow[config["prompt_id"]]["inputs"]["text"] = prompt_text
    
    # Inject Seed
    seed_key = config.get("seed_key", "seed")
    actual_seed = seed if seed != -1 else random.randint(1, 10**14)
    
    if config["seed_id"] in workflow:
        workflow[config["seed_id"]]["inputs"][seed_key] = actual_seed

    # Inject Resolution
    if "latent_id" in config and config["latent_id"] in workflow:
        workflow[config["latent_id"]]["inputs"]["width"] = width
        workflow[config["latent_id"]]["inputs"]["height"] = height
    elif "width_id" in config and "height_id" in config:
        if config["width_id"] in workflow:
            workflow[config["width_id"]]["inputs"]["value"] = width
        if config["height_id"] in workflow:
            workflow[config["height_id"]]["inputs"]["value"] = height

    # 🔥 Inject LoRA
    lora_node_id = config.get("lora_id")
    if lora_node_id and lora_node_id in workflow:
        if lora_filename and lora_strength > 0:
            workflow[lora_node_id]["inputs"]["lora_name"] = lora_filename
            workflow[lora_node_id]["inputs"]["strength_model"] = lora_strength
            print(f"[ComfyClient] LoRA injected: {lora_filename} (strength: {lora_strength})")
        else:
            workflow[lora_node_id]["inputs"]["strength_model"] = 0.0
            print("[ComfyClient] LoRA disabled (strength=0)")
    else:
        if lora_filename:
            print(f"[ComfyClient] ⚠️ lora_id not found in config for this model")

    # Connect WebSocket
    try:
        ws = websocket.WebSocket()
        ws.connect(f"{ws_proto}://{server_address}/ws?clientId={client_id}", timeout=5)
    except Exception as e:
        raise Exception(f"WebSocket Failed: {str(e)}. Make sure ComfyUI is running.")

    # Queue Prompt
    p = {"prompt": workflow, "client_id": client_id}
    try:
        response = requests.post(f"{http_proto}://{server_address}/prompt", json=p)
        response.raise_for_status()
        prompt_id = response.json()['prompt_id']
    except Exception as e:
        ws.close()
        raise Exception(f"Failed to queue: {str(e)}")

    # Listen for completion
    while True:
        out = ws.recv()
        if isinstance(out, str):
            message = json.loads(out)
            if message['type'] == 'executing':
                if message['data']['node'] is None and message['data']['prompt_id'] == prompt_id:
                    break
    
    ws.close()
    time.sleep(0.5)
    
    # Fetch Images
    history_url = f"{http_proto}://{server_address}/history/{prompt_id}"
    history = requests.get(history_url).json()
    
    output_images = []
    outputs = history[prompt_id].get('outputs', {})
    
    for node_id, node_output in outputs.items():
        for img in node_output.get('images', []):
            img_url = f"{http_proto}://{server_address}/view?filename={img['filename']}&subfolder={img['subfolder']}&type={img['type']}"
            img_data = requests.get(img_url).content
            output_images.append({
                "filename": img['filename'],
                "data": img_data
            })
    
    return {
        "images": output_images,
        "seed": actual_seed
    }


def generate_edit(prompt_text, image1_filename, image2_filename, config):
    """
    Generate image สำหรับ Edit Mode
    รองรับ single_image_only และ Conditional Disable Node
    """
    client_id = get_client_id()
    server_address = "127.0.0.1:8188"
    http_proto = "http"
    ws_proto = "ws"
    
    print(f"[ComfyClient-Edit] Connecting to: {server_address}")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    workflow_path = os.path.join(base_dir, config["file"])
    
    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # ✅ Inject Prompt (รองรับทั้ง Qwen และ Flux)
    if config.get("prompt_id") and config["prompt_id"] in workflow:
        node_inputs = workflow[config["prompt_id"]]["inputs"]
        if "prompt" in node_inputs:
            node_inputs["prompt"] = prompt_text
        elif "text" in node_inputs:
            node_inputs["text"] = prompt_text
        print(f"[ComfyClient-Edit] Prompt injected into node {config['prompt_id']}")

    # ✅ Inject Seed (สุ่มอัตโนมัติเสมอ)
    actual_seed = random.randint(1, 10**14)
    seed_key = config.get("seed_key", "seed")
    if config.get("seed_id") and config["seed_id"] in workflow:
        workflow[config["seed_id"]]["inputs"][seed_key] = actual_seed

    # ✅ Inject Image 1 (บังคับ) + subfolder/type
    if config.get("image1_id") and config["image1_id"] in workflow:
        workflow[config["image1_id"]]["inputs"]["image"] = image1_filename
        workflow[config["image1_id"]]["inputs"]["subfolder"] = ""
        workflow[config["image1_id"]]["inputs"]["type"] = "input"
        print(f"[ComfyClient-Edit] Image1 injected: {image1_filename}")
    else:
        raise Exception(f"image1_id '{config.get('image1_id')}' not found in workflow")

    # ✅ Image 2 Handling
    has_image2 = bool(image2_filename and image2_filename.strip())
    image2_node_id = config.get("image2_id")
    
    if config.get("single_image_only"):
        # ✅ Single Image Mode: ข้าม image2 ทั้งหมด
        print("[ComfyClient-Edit] Single image mode - skipping image2")
    
    elif has_image2 and image2_node_id and image2_node_id in workflow:
        workflow[image2_node_id]["inputs"]["image"] = image2_filename
        workflow[image2_node_id]["inputs"]["subfolder"] = ""
        workflow[image2_node_id]["inputs"]["type"] = "input"
        print(f"[ComfyClient-Edit] Image2 injected: {image2_filename}")
    
    elif not has_image2 and config.get("disable_nodes_if_no_img2"):
        # Disable nodes + ลบ Link ที่ชี้ไปหา disabled node
        disabled_node_ids = set(str(nid) for nid in config["disable_nodes_if_no_img2"])
        
        for node_id in disabled_node_ids:
            if node_id in workflow:
                workflow[node_id]["mode"] = 4
                print(f"[ComfyClient-Edit] Node {node_id} DISABLED (no image2)")
        
        for nid, node_data in workflow.items():
            inputs = node_data.get("inputs", {})
            keys_to_remove = [
                k for k, v in inputs.items()
                if isinstance(v, list) and len(v) >= 2 and str(v[0]) in disabled_node_ids
            ]
            for k in keys_to_remove:
                del inputs[k]
                print(f"[ComfyClient-Edit] Removed link '{k}' -> disabled node from node {nid}")
    
    elif not has_image2 and config.get("require_both_images"):
        raise Exception("This model requires both images but image2 was not provided")

    # Connect WebSocket
    try:
        ws = websocket.WebSocket()
        ws.connect(f"{ws_proto}://{server_address}/ws?clientId={client_id}", timeout=5)
    except Exception as e:
        raise Exception(f"WebSocket Failed: {str(e)}. Make sure ComfyUI is running.")

    # Queue Prompt
    p = {"prompt": workflow, "client_id": client_id}
    try:
        response = requests.post(f"{http_proto}://{server_address}/prompt", json=p)
        response.raise_for_status()
        prompt_id = response.json()['prompt_id']
        print(f"[ComfyClient-Edit] Queued. ID: {prompt_id}")
    except Exception as e:
        ws.close()
        error_detail = ""
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.text[:500]
            except:
                pass
        raise Exception(f"Failed to queue: {str(e)} | Detail: {error_detail}")

    # Listen for completion
    while True:
        out = ws.recv()
        if isinstance(out, str):
            message = json.loads(out)
            if message['type'] == 'executing':
                if message['data']['node'] is None and message['data']['prompt_id'] == prompt_id:
                    break
    
    ws.close()
    time.sleep(0.5)
    
    # Fetch Images
    history_url = f"{http_proto}://{server_address}/history/{prompt_id}"
    history = requests.get(history_url).json()
    
    output_images = []
    outputs = history[prompt_id].get('outputs', {})
    
    for node_id, node_output in outputs.items():
        for img in node_output.get('images', []):
            img_url = f"{http_proto}://{server_address}/view?filename={img['filename']}&subfolder={img['subfolder']}&type={img['type']}"
            img_data = requests.get(img_url).content
            output_images.append({
                "filename": img['filename'],
                "data": img_data
            })
    
    print(f"[ComfyClient-Edit] Done! Found {len(output_images)} image(s)")
    return {
        "images": output_images,
        "seed": actual_seed
    }
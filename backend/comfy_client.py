import json
import requests
import websocket
import uuid
import random
import os
import time

def get_client_id():
    return str(uuid.uuid4())

def generate_image(prompt_text, seed, width, height, config):
    """
    Generate image แบบ Simple (ไม่ใช้ streaming)
    คืนค่าเป็น dict: {"images": [...], "seed": ...}
    """
    client_id = get_client_id()
    server_address = "127.0.0.1:8188"
    http_proto = "http"
    ws_proto = "ws"
    
    print(f"[ComfyClient] Connecting to: {server_address}")
    
    # Load Workflow
    base_dir = os.path.dirname(os.path.abspath(__file__))
    workflow_path = os.path.join(base_dir, config["file"])
    
    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # Inject Parameters
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
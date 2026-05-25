import json
import requests
import websocket
import uuid
import random
import os
import time

def get_client_id():
    return str(uuid.uuid4())

def generate_image_stream(prompt_text, seed, width, height, config):
    """
    Generate image using Local ComfyUI only.
    Server address is hardcoded to 127.0.0.1:8188 for local usage.
    """
    client_id = get_client_id()
    
    # Hardcode Local Address
    server_address = "127.0.0.1:8188"
    http_proto = "http"
    ws_proto = "ws"
    
    print(f"[ComfyClient] Connecting to Local ComfyUI: {server_address}")
    
    # 2. Load Workflow
    base_dir = os.path.dirname(os.path.abspath(__file__))
    workflow_path = os.path.join(base_dir, config["file"])
    
    if not os.path.exists(workflow_path):
        raise FileNotFoundError(f"Workflow file not found at: {workflow_path}")

    with open(workflow_path, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    # 3. Inject Parameters
    # Handle Prompt
    if config["prompt_id"] in workflow:
        workflow[config["prompt_id"]]["inputs"]["text"] = prompt_text
    
    # Handle Seed
    seed_key = config.get("seed_key", "seed")
    actual_seed = seed if seed != -1 else random.randint(1, 10**14)
    
    if config["seed_id"] in workflow:
        workflow[config["seed_id"]]["inputs"][seed_key] = actual_seed

    # Handle Resolution
    if "latent_id" in config and config["latent_id"] in workflow:
        workflow[config["latent_id"]]["inputs"]["width"] = width
        workflow[config["latent_id"]]["inputs"]["height"] = height
    elif "width_id" in config and "height_id" in config:
        if config["width_id"] in workflow:
            workflow[config["width_id"]]["inputs"]["value"] = width
        if config["height_id"] in workflow:
            workflow[config["height_id"]]["inputs"]["value"] = height


    # 4. Connect WebSocket (Local)
    try:
        ws = websocket.WebSocket()
        ws.connect(f"{ws_proto}://{server_address}/ws?clientId={client_id}", timeout=5)
        print("[ComfyClient] WebSocket Connected")
    except Exception as e:
        raise Exception(f"WebSocket Connection Failed: {str(e)}. Make sure ComfyUI is running on port 8188.")

    # 5. Queue Prompt
    p = {"prompt": workflow, "client_id": client_id}
    try:
        response = requests.post(f"{http_proto}://{server_address}/prompt", json=p)
        response.raise_for_status()
        prompt_id = response.json()['prompt_id']
        print(f"[ComfyClient] Prompt Queued. ID: {prompt_id}")
    except Exception as e:
        ws.close()
        raise Exception(f"Failed to queue prompt: {str(e)}")

    # 6. Listen for Progress
    current_node_name = "Initializing..."
    while True:
        out = ws.recv()
        if isinstance(out, str):
            message = json.loads(out)
            
            if message['type'] == 'progress':
                data = message['data']
                yield {
                    "type": "progress", 
                    "value": data['value'], 
                    "max": data['max'],
                    "node": current_node_name
                }
            
            if message['type'] == 'executing':
                node_id = message['data']['node']
                if node_id is not None:
                    node_data = workflow.get(node_id, {})
                    meta = node_data.get('_meta', {})
                    current_node_name = meta.get('title', f"Node {node_id}")
                    
                    yield {
                        "type": "status", 
                        "node": current_node_name,
                        "node_id": node_id
                    }
                
                if node_id is None and message['data']['prompt_id'] == prompt_id:
                    print("[ComfyClient] Execution Finished via WebSocket")
                    break
    
    ws.close()

    # 7. Fetch Images
    try:
        time.sleep(0.5) 
        
        history_url = f"{http_proto}://{server_address}/history/{prompt_id}"
        history_resp = requests.get(history_url)
        history_resp.raise_for_status()
        history = history_resp.json()
        
        output_images = []
        
        if prompt_id not in history:
            raise Exception(f"Prompt ID {prompt_id} not found in History.")

        outputs = history[prompt_id].get('outputs', {})
        
        if not outputs:
             raise Exception("No outputs found. Check your Workflow JSON.")

        found_any_image = False
        for node_id, node_output in outputs.items():
            images_list = node_output.get('images', [])
            if images_list:
                found_any_image = True
                for img in images_list:
                    img_url = f"{http_proto}://{server_address}/view?filename={img['filename']}&subfolder={img['subfolder']}&type={img['type']}"
                    
                    img_data = requests.get(img_url).content
                    output_images.append({
                        "filename": img['filename'],
                        "data": img_data
                    })
        
        if not found_any_image:
            raise Exception("Workflow completed but no images found.")

        print(f"[ComfyClient] Success! Found {len(output_images)} image(s).")
        
        # Yield done signal with images and seed
        yield {
            "type": "done",
            "images": output_images,
            "seed": actual_seed
        }
    except Exception as e:
        raise Exception(f"Failed to fetch images: {str(e)}")
from fastapi import FastAPI
from pydantic import BaseModel
import httpx, json
import uuid
from datetime import datetime
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
import pyautogui
pyautogui.PAUSE = 0
import pyperclip
import time
import socket
import os
import asyncio
import platform

# Detect OS
IS_MAC = platform.system() == "Darwin"
CMD_KEY = "command" if IS_MAC else "ctrl"

# Simple queue to store the last paste for the browser listener
pending_paste = {"text": "", "id": 0}
stop_typing = False

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

# Session management as per PRD
SESSION_TOKEN = str(uuid.uuid4())[:8] # Simple temporary token for pairing
active_connections = []

from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager
import requests

OTA_URL_BASE = "https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/templates/"
OTA_DIR = os.path.expanduser("~/.glidepass/templates")

def fetch_ota_templates():
    os.makedirs(OTA_DIR, exist_ok=True)
    config_path = os.path.expanduser("~/.glidepass/config.json")
    custom_url = None
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                custom_url = cfg.get("website_url")
        except:
            pass

    for tmpl in ["index.html", "center.html"]:
        success = False
        # 1. Try custom_url if configured in ~/.glidepass/config.json
        if custom_url:
            try:
                base = custom_url.rstrip("/")
                r = requests.get(f"{base}/api/ota?file={tmpl}", timeout=5)
                if r.status_code == 200 and ("<!DOCTYPE" in r.text or "<html" in r.text):
                    with open(os.path.join(OTA_DIR, tmpl), "w", encoding="utf-8") as f:
                        f.write(r.text)
                    success = True
                    print(f"[OTA] Successfully fetched {tmpl} from custom website: {custom_url}")
            except Exception as e:
                print(f"[OTA] Failed to fetch {tmpl} from custom website: {e}")

        # 2. Try local dev website (localhost:3000)
        if not success:
            try:
                r = requests.get(f"http://localhost:3000/api/ota?file={tmpl}", timeout=2)
                if r.status_code == 200 and ("<!DOCTYPE" in r.text or "<html" in r.text):
                    with open(os.path.join(OTA_DIR, tmpl), "w", encoding="utf-8") as f:
                        f.write(r.text)
                    success = True
                    print(f"[OTA] Successfully fetched {tmpl} from local website dev server")
            except Exception:
                pass

        # 3. Fallback to GitHub raw repository
        if not success:
            try:
                r = requests.get(OTA_URL_BASE + tmpl, timeout=5)
                if r.status_code == 200 and ("<!DOCTYPE" in r.text or "<html" in r.text):
                    with open(os.path.join(OTA_DIR, tmpl), "w", encoding="utf-8") as f:
                        f.write(r.text)
                    success = True
                    print(f"[OTA] Successfully fetched {tmpl} from GitHub fallback")
            except Exception as e:
                print(f"[OTA] Failed to fetch {tmpl} from GitHub fallback: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fetch latest templates in the background on startup
    import threading
    threading.Thread(target=fetch_ota_templates, daemon=True).start()
    yield

app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Extension origins are chrome-extension://...
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"\n--- NEARBY AI RUNNING ---")
print(f"Local Access: http://localhost:8000")
print(f"Mobile Access: http://{get_local_ip()}:8000\n")

import sys

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def get_template_path(filename):
    ota_path = os.path.join(OTA_DIR, filename)
    if os.path.exists(ota_path):
        return ota_path
    return resource_path(f"templates/{filename}")

@app.get("/")
async def index():
    response = FileResponse(get_template_path("index.html"))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/center")
async def center():
    response = FileResponse(get_template_path("center.html"))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/vitcodes")
async def vitcodes_page():
    response = FileResponse(get_template_path("vitcodes.html"))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/logo.png")
async def get_logo():
    # Attempt to serve from bundled resource
    logo_path = resource_path("logo.png")
    if os.path.exists(logo_path):
        return FileResponse(logo_path)
    return {"status": "error", "message": "Logo not found"}

# PRD: /server/terminate (Secure POST version)
@app.post("/server/terminate")
async def terminate_server(data: dict):
    token = data.get("session_id")
    if token != SESSION_TOKEN:
        return {"status": "error", "message": "Invalid session token"}
    
    def kill_server():
        time.sleep(0.5)
        os._exit(0)
    
    import threading
    threading.Thread(target=kill_server).start()
    return {"status": "success", "message": "Server terminating..."}

# PRD: /session/create (POST version)
@app.post("/session/create")
async def create_session():
    return await get_config()

# PRD: /get_config (Aliased for compatibility)
@app.get("/session/create")
@app.get("/get_config")
async def get_config():
    ip = get_local_ip()
    return {
        "status": "success",
        "local_ip": ip,
        "mobile_url": f"http://{ip}:8000",
        "session_id": SESSION_TOKEN,
        "pairing_qr": f"http://{ip}:8000?sid={SESSION_TOKEN}"
    }

SHUTDOWN_REQUESTED = False

@app.get("/shutdown")
async def shutdown():
    global SHUTDOWN_REQUESTED
    SHUTDOWN_REQUESTED = True
    return {"status": "success", "message": "Shutting down..."}

@app.get("/open_terminal")
async def open_terminal():
    try:
        path = os.getcwd()
        if IS_MAC:
            cmd = f"osascript -e 'tell application \"Terminal\"' -e 'do script \"cd {path}\"' -e 'activate' -e 'end tell'"
            os.system(cmd)
        else:
            # Windows: Open CMD in current path
            os.system(f'start cmd /K "cd /d {path}"')
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/copy")
async def copy_from_laptop():
    global last_synced_text
    try:
        # Clear clipboard first to ensure we get NEW content
        pyperclip.copy("")
        time.sleep(0.1)
        
        # Trigger system copy
        pyautogui.hotkey(CMD_KEY, 'c')
        time.sleep(0.4) # Wait a bit longer for clipboard
        
        text = pyperclip.paste()
        if text:
            # Sync internal state so live typing doesn't get confused
            last_synced_text = text
            return {"status": "success", "text": text}
        else:
            return {"status": "error", "message": "Clipboard empty"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/get_clipboard")
async def get_clipboard():
    try:
        text = pyperclip.paste()
        return {"status": "success", "text": text}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# PRD: /clipboard/get
@app.get("/clipboard/get")
async def prd_get_clipboard():
    return await get_clipboard()

@app.get("/poll_paste")
async def poll_paste(last_id: int = 0):
    # Wait up to 30 seconds for a new paste (Long Polling)
    for _ in range(60):
        if pending_paste["id"] > last_id:
            return {"status": "success", "text": pending_paste["text"], "id": pending_paste["id"]}
        await asyncio.sleep(0.5)
    return {"status": "timeout"}

# State to track last synced text for live typing
last_synced_text = ""

@app.get("/stop")
async def stop():
    global stop_typing
    stop_typing = True
    print("!!! Stop Signal Received !!!")
    return {"status": "success"}

def perform_typing(text, wpm, is_coding=False):
    global stop_typing
    import time
    
    # Release any potentially stuck keys immediately before starting
    modifiers = ['command', 'shift', 'ctrl', 'option', 'alt']
    for mod in modifiers:
        pyautogui.keyUp(mod)

    # Realistic Human Typing
    time.sleep(0.5)
    cpm = max(wpm, 1) * 5
    typing_interval = 60.0 / cpm
    
    lines = text.split('\n')
    try:
        for i, line in enumerate(lines):
            if stop_typing: break
            
            if i > 0:
                pyautogui.press('enter')
                time.sleep(0.05) # Small wait for IDE to auto-indent
                
                # Clear auto-indent cleanly (Delete to Beginning of Line)
                if IS_MAC:
                    pyautogui.keyDown('command')
                    pyautogui.press('backspace')
                    pyautogui.keyUp('command')
                else:
                    pyautogui.keyDown('shift')
                    pyautogui.press('home')
                    pyautogui.keyUp('shift')
                    pyautogui.press('backspace')

            if line and not stop_typing:
                for char in line:
                    if stop_typing: break
                    char_start = time.time()
                    pyautogui.write(char)
                    
                    if is_coding and char in {'{', '(', '[', '"', "'"}:
                        # Immediately delete the IDE's auto-inserted closing character
                        if IS_MAC:
                            # Forward delete on Mac
                            pyautogui.press('delete')
                        else:
                            pyautogui.press('delete')

                    elapsed = time.time() - char_start
                    sleep_time = max(0, typing_interval - elapsed)
                    time.sleep(sleep_time)
    finally:
        # Failsafe: Ensure modifiers are NEVER left stuck if interrupted
        for mod in modifiers:
            pyautogui.keyUp(mod)
        print("Typing task finished/stopped")

# PRD: /ws/connect (WebSocket Support)
@app.websocket("/ws/connect")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket data if needed
    except WebSocketDisconnect:
        active_connections.remove(websocket)

def check_mac_accessibility_and_prompt():
    import sys
    if sys.platform != 'darwin':
        return True
    try:
        import ctypes
        app_services = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices')
        app_services.AXIsProcessTrusted.restype = ctypes.c_bool
        if not app_services.AXIsProcessTrusted():
            import os
            script = """
            display alert "GlidePass Needs Permissions" message "To auto-type or paste text from your phone, macOS requires you to grant Accessibility permissions to GlidePass.\\n\\n1. Open System Settings -> Privacy & Security -> Accessibility.\\n2. IMPORTANT: If GlidePass is already listed, you MUST remove it first (select it and click the '-' button).\\n3. Click the '+' button and add GlidePass.app again.\\n4. Restart GlidePass." buttons {"Open Settings", "Later"} default button "Open Settings"
            if button returned of result is "Open Settings" then
                open location "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
            end if
            """
            os.system(f"osascript -e '{script}' &")
            return False
        return True
    except Exception:
        return True

# PRD: /input/send (Aliased for compatibility)
@app.post("/input/send")
@app.post("/paste")
async def paste(data: dict):
    global pending_paste, last_synced_text, stop_typing
    stop_typing = False 
    try:
        # PRD uses "content" for the text payload
        text = data.get("content") or data.get("text", "")
        mode = data.get("mode", "flash")
        try:
            wpm = int(data.get("wpm", 40))
        except (ValueError, TypeError):
            wpm = 40
        is_coding = bool(data.get("is_coding", False))
    except Exception as e:
        return {"status": "error", "message": f"Data parsing error: {str(e)}"}
    
    if text is not None:
        print(f"[PASTE] Triggering {mode} mode | Content: {text[:20]}...")
        if not text:
            if last_synced_text and mode == "sync":
                pyautogui.press('backspace')
            last_synced_text = ""
            pending_paste["text"] = ""
            pending_paste["id"] += 1
            return {"status": "success"}

        pending_paste["text"] = text
        pending_paste["id"] += 1
    
    if mode == "inject":
        text = " ".join(text.split())
        
        # Guarantee clipboard copy
        if IS_MAC:
            import subprocess
            p = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
            p.communicate(text.encode('utf-8'))
        else:
            pyperclip.copy(text)
            
        time.sleep(0.1)
        
        if IS_MAC:
            check_mac_accessibility_and_prompt()
            pyautogui.hotkey('command', 'v')
        else:
            pyautogui.hotkey('ctrl', 'v')
        return {"status": "success"}

    elif mode == "type":
        # Run typing in a separate thread to keep server responsive to /stop
        import threading
        threading.Thread(target=perform_typing, args=(text, wpm, is_coding)).start()
        return {"status": "success", "message": "Typing started"}
    
    elif mode == "sync":
        # Better diffing for Live Sync
        if text.startswith(last_synced_text):
            new_chars = text[len(last_synced_text):]
            if new_chars:
                pyautogui.write(new_chars)
        elif last_synced_text.startswith(text):
            backspaces = len(last_synced_text) - len(text)
            for _ in range(backspaces):
                pyautogui.press('backspace')
        else:
            # Total change (paste or middle edit)
            pass
        
        last_synced_text = text
        return {"status": "success"}
        
    else: # Default: Flash
        pyperclip.copy(text)
        # CRITICAL: Wait for clipboard to actually take the text
        # Some apps are slow to register the new clipboard content
        time.sleep(0.5) 
        if IS_MAC:
            import subprocess
            p = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
            p.communicate(text.encode('utf-8'))
            time.sleep(0.1)
            check_mac_accessibility_and_prompt()
            pyautogui.hotkey('command', 'v')
        else:
            pyautogui.hotkey('ctrl', 'v')
        return {"status": "success"}
    
    return {"status": "error", "message": "No text provided"}

if __name__ == "__main__":
    import uvicorn
    
    if IS_MAC:
        # Quick check for Accessibility permissions
        print("\n--- MAC PERMISSION CHECK ---")
        check_cmd = 'osascript -e "tell application \"System Events\" to get name of first process whose frontmost is true" > /dev/null 2>&1'
        if os.system(check_cmd) != 0:
            print("⚠️ WARNING: Accessibility permissions might be missing.")
            print("To fix: System Settings > Privacy & Security > Accessibility")
            print("Ensure your Terminal/IDE/Python is allowed to control your computer.\n")
        else:
            print("✅ Accessibility permissions confirmed.\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)
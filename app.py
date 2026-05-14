from fastapi import FastAPI
from pydantic import BaseModel
import httpx, json
from datetime import datetime
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
import pyautogui
import pyperclip
import time
import socket
import os
import asyncio

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

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

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

@app.get("/")
async def index():
    return FileResponse("templates/index.html")

@app.get("/get_config")
async def get_config():
    ip = get_local_ip()
    return {
        "status": "success",
        "local_ip": ip,
        "mobile_url": f"http://{ip}:8000"
    }

@app.get("/shutdown")
async def shutdown():
    def kill_server():
        time.sleep(0.5)
        # Force exit the process
        os._exit(0)
    
    import threading
    threading.Thread(target=kill_server).start()
    return {"status": "success", "message": "Shutting down..."}

@app.get("/open_terminal")
async def open_terminal():
    try:
        # Powerful AppleScript to open Terminal and CD into current folder
        path = os.getcwd()
        cmd = f"osascript -e 'tell application \"Terminal\"' -e 'do script \"cd {path}\"' -e 'activate' -e 'end tell'"
        os.system(cmd)
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
        pyautogui.hotkey('command', 'c')
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

def perform_typing(text, wpm):
    global stop_typing
    # Realistic Human Typing
    time.sleep(0.5)
    cpm = max(wpm, 1) * 5
    typing_interval = 60.0 / cpm
    
    import random
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if stop_typing: break
        
        # If not the first line, we just pressed Enter.
        # Many IDEs auto-indent. We need to clear that to avoid "staircase" effect.
        if i > 0:
            # Command+Left moves to the very start of the line
            pyautogui.hotkey('command', 'left')
            # Shift+Command+Right selects the auto-indentation
            pyautogui.hotkey('shift', 'command', 'right')
            # Backspace clears it
            pyautogui.press('backspace')

        for char in line:
            if stop_typing: break
            pyautogui.write(char)
            time.sleep(typing_interval * random.uniform(0.8, 1.2))
            
        if i < len(lines) - 1 and not stop_typing:
            pyautogui.press('enter')
            time.sleep(0.05) # Small wait for IDE to auto-indent
    print("Typing task finished/stopped")

@app.post("/paste")
async def paste(data: dict):
    global pending_paste, last_synced_text, stop_typing
    stop_typing = False 
    text = data.get("text", "")
    mode = data.get("mode", "flash")
    
    try:
        wpm = int(data.get("wpm", 40))
    except:
        wpm = 40
    
    if text is not None:
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
            pyperclip.copy(text)
            time.sleep(0.1)
            os.system("osascript -e 'tell application \"System Events\" to keystroke \"v\" using {command down}'")
            return {"status": "success"}

        elif mode == "type":
            # Run typing in a separate thread to keep server responsive to /stop
            import threading
            threading.Thread(target=perform_typing, args=(text, wpm)).start()
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
                # For safety in sync mode, we just update state without typing 
                # to avoid massive messy typing if user pastes something big
                pass
            
            last_synced_text = text
            return {"status": "success"}
            
        else: # Default: Flash
            pyperclip.copy(text)
            time.sleep(0.1)
            os.system("osascript -e 'tell application \"System Events\" to keystroke \"v\" using {command down}'")
            return {"status": "success"}
            
    return {"status": "error", "message": "No text provided"}
            
    return {"status": "error", "message": "No text provided"}
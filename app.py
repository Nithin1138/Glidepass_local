"""LANpad FastAPI backend.

This is the single source of truth for the LANpad HTTP API.  It runs
on both macOS and Windows; the only OS-specific code paths are guarded
by ``IS_MAC`` / ``IS_WINDOWS`` flags coming from ``platform_utils``.

NOTE: ``pyautogui`` is imported *lazily* inside the endpoints that need
it.  That way the backend can be packaged as a headless "server only"
build for users who only want to expose the API.
"""
# ---------------------------------------------------------------------------
# Windows / PyInstaller "NoneType has no attribute isatty" workaround.
#
# When LANpad is built with ``console=False`` (the standard
# windowed-GUI mode) the Windows C runtime replaces ``sys.stdout`` and
# ``sys.stderr`` with ``None``.  A few libraries (notably uvicorn's
# logger) call ``.isatty()`` on these streams and crash at import time.
# We replace them with safe dummy streams *before* importing anything
# that may set up logging.
# ---------------------------------------------------------------------------
import io as _io
import sys as _sys

class _SafeStream(_io.TextIOBase):
    def __init__(self, name):
        self._name = name
    def write(self, s):
        return len(s) if s else 0
    def flush(self):
        pass
    def isatty(self):
        return False
    def readable(self):
        return False
    def writable(self):
        return True
    def __getattr__(self, _):
        return None

if _sys.stdout is None:
    _sys.stdout = _SafeStream("stdout")
if _sys.stderr is None:
    _sys.stderr = _SafeStream("stderr")
if _sys.stdin is None:
    _sys.stdin = _SafeStream("stdin")

from fastapi import FastAPI
from fastapi.responses import FileResponse

import httpx
import json
import uuid
import pyperclip
import time
import socket
import os
import sys
import asyncio
import platform
import subprocess as _sp

# Cross-platform utility layer (single source of truth for OS detection)
try:
    from platform_utils import is_mac, is_windows, is_linux, cmd_key, user_data_dir
except ImportError:  # pragma: no cover - allows direct execution during dev
    def is_mac():     return sys.platform == "darwin"
    def is_windows(): return sys.platform.startswith("win")
    def is_linux():   return sys.platform.startswith("linux")
    def cmd_key():    return "command" if is_mac() else "ctrl"
    def user_data_dir(): return os.path.expanduser("~/.lanpad")

# Detect OS (single source of truth)
IS_MAC     = is_mac()
IS_WINDOWS = is_windows()
IS_LINUX   = is_linux()
CMD_KEY    = cmd_key()

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
    except Exception:
        return "127.0.0.1"


# Session management as per PRD
SESSION_TOKEN = str(uuid.uuid4())[:8]  # Simple temporary token for pairing
active_connections = []

from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager
import requests

OTA_DIR = os.path.join(user_data_dir(), "templates")
OTA_URL_BASE = "https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/templates/"


def _config_path():
    return os.path.join(user_data_dir(), "config.json")


def _read_custom_website_url():
    """Read `website_url` from the user config file, if any."""
    path = _config_path()
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                return cfg.get("website_url")
        except Exception:
            return None
    return None


def fetch_ota_templates():
    os.makedirs(OTA_DIR, exist_ok=True)
    custom_url = _read_custom_website_url()

    for tmpl in ["index.html", "center.html", "vitcodes.html"]:
        success = False
        # 1. Try custom_url if configured in user config
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

print("\n--- LANPAD BACKEND RUNNING ---")
print(f"Local Access:  http://localhost:8000")
print(f"Mobile Access: http://{get_local_ip()}:8000")
print(f"Platform:      {platform.system()}\n")


def resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller."""
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


# ── Template / static endpoints ────────────────────────────────────────────────

@app.get("/")
async def index():
    response = _cached_file_response("index.html")
    return response


@app.get("/center")
async def center():
    return _cached_file_response("center.html")


@app.get("/vitcodes")
async def vitcodes_page():
    return _cached_file_response("vitcodes.html")


@app.get("/api/vitcodes")
async def get_api_vitcodes():
    config_path = os.path.expanduser("~/.lanpad/config.json")
    custom_url = None
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                custom_url = cfg.get("website_url")
        except:
            pass

    urls = []
    if custom_url:
        urls.append(custom_url.rstrip("/") + "/api/vitcodes")
    urls.append("http://localhost:3000/api/vitcodes")
    urls.append("https://lanpad.vercel.app/api/vitcodes")

    async def fetch_one(client, url):
        try:
            r = await client.get(url, timeout=2.0)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
        return None

    async with httpx.AsyncClient() as client:
        tasks = [fetch_one(client, url) for url in urls]
        for task in asyncio.as_completed(tasks):
            res = await task
            if res is not None:
                return res
    return []


def _cached_file_response(filename: str):
    response = FileResponse(get_template_path(filename))
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.get("/logo.png")
async def get_logo():
    logo_path = resource_path("logo.png")
    if os.path.exists(logo_path):
        return FileResponse(logo_path)
    return {"status": "error", "message": "Logo not found"}


# ── Session / config ─────────────────────────────────────────────────────────

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


@app.post("/session/create")
async def create_session():
    return await get_config()


@app.get("/session/create")
@app.get("/get_config")
async def get_config():
    ip = get_local_ip()
    return {
        "status": "success",
        "local_ip": ip,
        "mobile_url": f"http://{ip}:8000",
        "session_id": SESSION_TOKEN,
        "pairing_qr": f"http://{ip}:8000?sid={SESSION_TOKEN}",
        "platform": platform.system().lower(),
        "is_windows": IS_WINDOWS,
    }


# ── Lifecycle helpers ────────────────────────────────────────────────────────

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
            cmd = (
                f"osascript -e 'tell application \"Terminal\"' "
                f"-e 'do script \"cd {path}\"' "
                f"-e 'activate' -e 'end tell'"
            )
            os.system(cmd)
        elif IS_WINDOWS:
            # ``start`` spawns a new console window without blocking.
            os.system(f'start "" cmd /K "cd /d {path}"')
        else:
            # Linux – try a few common terminal emulators
            for term in ("x-terminal-emulator", "gnome-terminal", "konsole", "xterm"):
                if _sp.call(["which", term], stdout=_sp.DEVNULL, stderr=_sp.DEVNULL) == 0:
                    os.system(f"{term} --working-directory={path} &")
                    break
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ── Clipboard helpers (cross-platform) ────────────────────────────────────────

def _set_clipboard(text: str):
    """Cross-platform clipboard write.

    On macOS, ``pbcopy`` is the most reliable path – the Tk-based
    ``pyperclip`` can fail in sandboxed environments.  On Windows
    we use the standard ``pyperclip`` (which shells out to the
    Windows ``clip`` command).
    """
    if IS_MAC:
        p = _sp.Popen(["pbcopy"], stdin=_sp.PIPE)
        p.communicate(text.encode("utf-8"))
    else:
        pyperclip.copy(text)


def _check_mac_accessibility_and_prompt():
    """No-op on non-macOS.  On macOS, prompt the user to grant the
    Accessibility permission if it is not already granted.
    """
    if not IS_MAC:
        return True
    try:
        import ctypes
        app_services = ctypes.cdll.LoadLibrary(
            "/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices"
        )
        app_services.AXIsProcessTrusted.restype = ctypes.c_bool
        if not app_services.AXIsProcessTrusted():
            script = (
                'display alert "LANpad Needs Permissions" '
                'message "To auto-type or paste text from your phone, '
                'macOS requires you to grant Accessibility permissions '
                'to LANpad.\\n\\n1. Open System Settings -> Privacy & Security -> Accessibility.\\n'
                '2. If LANpad is listed, remove it first (select it and click the \'-\' button).\\n'
                '3. Click the \'+\' button and add LANpad.app again.\\n'
                '4. Restart LANpad." '
                'buttons {"Open Settings", "Later"} default button "Open Settings"\n'
                'if button returned of result is "Open Settings" then\n'
                '  open location "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"\n'
                'end if'
            )
            os.system(f"osascript -e '{script}' &")
            return False
        return True
    except Exception:
        return True


# ── Clipboard / paste endpoints ───────────────────────────────────────────────

@app.get("/copy")
async def copy_from_laptop():
    global last_synced_text
    try:
        import pyautogui  # Lazy import – backend may run headless
        pyautogui.PAUSE = 0
    except Exception as e:
        return {"status": "error", "message": f"pyautogui not available: {e}"}

    try:
        # Clear clipboard first to ensure we get NEW content
        pyperclip.copy("")
        time.sleep(0.1)

        # Trigger system copy
        pyautogui.hotkey(CMD_KEY, 'c', interval=0.05)
        time.sleep(0.4)  # Wait a bit longer for clipboard

        text = pyperclip.paste()
        if text:
            last_synced_text = text
            return {"status": "success", "text": text}
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


@app.get("/clipboard/get")
async def prd_get_clipboard():
    return await get_clipboard()


@app.get("/poll_paste")
async def poll_paste(last_id: int = 0):
    """Long-polling endpoint used by the mobile UI."""
    for _ in range(60):
        if pending_paste["id"] > last_id:
            return {
                "status": "success",
                "text": pending_paste["text"],
                "id": pending_paste["id"],
            }
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


# ── Typing engine ─────────────────────────────────────────────────────────────

def perform_typing(text, wpm, is_coding=False):
    global stop_typing

    try:
        import pyautogui  # Lazy import – backend may run headless
        pyautogui.FAILSAFE = False  # Prevent FailSafeException when mouse hits screen corner
        pyautogui.PAUSE = 0
    except Exception as e:
        print(f"[typing] pyautogui not available: {e}")
        return

    # Helper to release any stuck modifier keys at the END of a typing session.
    # IMPORTANT: This must ONLY be called once, at the very end.
    # Calling it per-character posts Quartz modifier-key-up events system-wide,
    # which corrupts the keyboard state of other apps (e.g. releases Cmd while
    # the user holds it in Chrome, causing phantom Cmd+Tab / Cmd+W events).
    def safe_release():
        for mod in ('command', 'shift', 'ctrl', 'option', 'alt'):
            try:
                pyautogui.keyUp(mod)
            except Exception:
                pass

    def write_char_native(char):
        """Type a single Unicode character.

        Uses Quartz CGEventCreateKeyboardEvent with kCGHIDEventTap (NOT
        kCGSessionEventTap) so the event targets only the foreground app
        and does not bleed into the global session event stream.
        """
        if IS_MAC:
            try:
                import Quartz
                # kCGHIDEventTap = 0 — targets the current foreground app only.
                # kCGSessionEventTap = 1 — injects into the global session
                # (affects ALL running apps) and must NOT be used here.
                tap = Quartz.kCGHIDEventTap
                event_down = Quartz.CGEventCreateKeyboardEvent(None, 0, True)
                Quartz.CGEventKeyboardSetUnicodeString(event_down, len(char), char)
                Quartz.CGEventPost(tap, event_down)
                time.sleep(0.001)
                event_up = Quartz.CGEventCreateKeyboardEvent(None, 0, False)
                Quartz.CGEventKeyboardSetUnicodeString(event_up, len(char), char)
                Quartz.CGEventPost(tap, event_up)
                return
            except Exception as e:
                print(f"[typing] Native Quartz write failed: {e}")
        pyautogui.write(char)

    def press_key_native(keycode):
        if IS_MAC:
            try:
                import Quartz
                tap = Quartz.kCGHIDEventTap  # target foreground app only
                event_down = Quartz.CGEventCreateKeyboardEvent(None, keycode, True)
                Quartz.CGEventPost(tap, event_down)
                time.sleep(0.001)
                event_up = Quartz.CGEventCreateKeyboardEvent(None, keycode, False)
                Quartz.CGEventPost(tap, event_up)
                return True
            except Exception as e:
                print(f"[typing] Native Quartz key press failed: {e}")
        return False

    # Release any potentially stuck keys once before starting
    safe_release()
    time.sleep(0.1)

    cpm = max(wpm, 1) * 5
    typing_interval = 60.0 / cpm

    # Normalize all line endings first
    normalized_text = text.replace('\r\n', '\n').replace('\r', '\n')
    lines = normalized_text.split('\n')

    try:
        for i, line in enumerate(lines):
            if stop_typing:
                break

            if i > 0:
                pyautogui.press('enter')
                time.sleep(0.08)  # Give the IDE a moment to auto-indent

            # Process line content
            if not stop_typing:
                line_to_type = line
                if is_coding:
                    # Strip leading whitespace so we rely on the IDE's
                    # native auto-indentation instead of literal spaces/tabs.
                    line_to_type = line.lstrip(' \t')

                for char in line_to_type:
                    if stop_typing:
                        break
                    char_start = time.time()

                    if char == '\t':
                        if not press_key_native(48):
                            pyautogui.press('tab')
                    else:
                        write_char_native(char)

                    # NOTE: Do NOT call safe_release() here per character.
                    # Posting Quartz modifier-key-up events inside the loop
                    # was releasing modifiers held by the user in OTHER apps
                    # (e.g. releasing Cmd while user holds Cmd+Tab in Chrome).

                    # NOTE: The previous 'is_coding bracket delete' hack that
                    # pressed the Forward Delete key (keycode 117) after [({ has
                    # been removed. It sent a global delete event that interfered
                    # with whatever the user was doing in the foreground app.

                    elapsed = time.time() - char_start
                    sleep_time = max(0, typing_interval - elapsed)
                    time.sleep(sleep_time)
    finally:
        # Failsafe: release modifiers ONCE at the very end only
        safe_release()
        print("Typing task finished/stopped")


# ── WebSocket (PRD) ───────────────────────────────────────────────────────────

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


# ── Paste / input endpoints ───────────────────────────────────────────────────

@app.post("/input/send")
@app.post("/paste")
async def paste(data: dict):
    global pending_paste, last_synced_text, stop_typing
    stop_typing = False
    try:
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
                pyautogui_module = _safe_pyautogui()
                if pyautogui_module:
                    pyautogui_module.press('backspace')
            last_synced_text = ""
            pending_paste["text"] = ""
            pending_paste["id"] += 1
            return {"status": "success"}

        pending_paste["text"] = text
        pending_paste["id"] += 1

    if mode == "inject":
        text = " ".join(text.split())
        # Cross-platform clipboard copy
        _set_clipboard(text)
        time.sleep(0.1)

        pyautogui_module = _safe_pyautogui()
        if not pyautogui_module:
            return {"status": "error", "message": "pyautogui not available"}

        if IS_MAC:
            _check_mac_accessibility_and_prompt()
            pyautogui_module.hotkey('command', 'v', interval=0.05)
        else:
            pyautogui_module.hotkey('ctrl', 'v', interval=0.05)
        return {"status": "success"}

    elif mode == "type":
        # Run typing in a separate thread to keep server responsive to /stop
        import threading
        threading.Thread(
            target=perform_typing, args=(text, wpm, is_coding), daemon=True
        ).start()
        return {"status": "success", "message": "Typing started"}

    elif mode == "sync":
        pyautogui_module = _safe_pyautogui()
        if not pyautogui_module:
            return {"status": "error", "message": "pyautogui not available"}
        # Better diffing for Live Sync
        if text.startswith(last_synced_text):
            new_chars = text[len(last_synced_text):]
            if new_chars:
                pyautogui_module.write(new_chars)
        elif last_synced_text.startswith(text):
            backspaces = len(last_synced_text) - len(text)
            for _ in range(backspaces):
                pyautogui_module.press('backspace')
        # else: total change in the middle – bail out to avoid
        # massive destructive backspacing.
        last_synced_text = text
        return {"status": "success"}

    else:  # Default: Flash
        pyautogui_module = _safe_pyautogui()
        if not pyautogui_module:
            return {"status": "error", "message": "pyautogui not available"}

        _set_clipboard(text)
        # CRITICAL: Wait for clipboard to actually take the text
        # Some apps are slow to register the new clipboard content
        time.sleep(0.5)
        if IS_MAC:
            _check_mac_accessibility_and_prompt()
            pyautogui_module.hotkey('command', 'v', interval=0.05)
        else:
            pyautogui_module.hotkey('ctrl', 'v', interval=0.05)
        return {"status": "success"}

    return {"status": "error", "message": "No text provided"}


def _safe_pyautogui():
    """Return the imported pyautogui module, or None if not installed.

    Centralised so that every endpoint that needs keystroke / clipboard
    injection can degrade gracefully when running the headless
    "server only" Windows build (no GUI libraries).
    """
    try:
        import pyautogui
        pyautogui.FAILSAFE = False  # Never let a corner-mouse-move crash an endpoint
        pyautogui.PAUSE = 0
        return pyautogui
    except Exception as e:
        print(f"[lanpad] pyautogui unavailable: {e}")
        return None


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    if IS_MAC:
        # Quick check for Accessibility permissions
        print("\n--- MAC PERMISSION CHECK ---")
        check_cmd = (
            'osascript -e "tell application \\"System Events\\" '
            'to get name of first process whose frontmost is true" '
            '> /dev/null 2>&1'
        )
        if os.system(check_cmd) != 0:
            print("\u26a0\ufe0f  WARNING: Accessibility permissions might be missing.")
            print("To fix: System Settings > Privacy & Security > Accessibility")
            print("Ensure your Terminal/IDE/Python is allowed to control your computer.\n")
        else:
            print("\u2705 Accessibility permissions confirmed.\n")
    elif IS_WINDOWS:
        print("\u27a4 LANpad is running on Windows.")
        print("  - Make sure your firewall allows inbound TCP/8000.")
        print("  - Phone and laptop must be on the same Wi-Fi network.\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)
       
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

from fastapi import FastAPI, UploadFile, File, Request
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
is_currently_typing = False


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
active_devices = {}

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

_license_tier_cache = {"tier": None, "ts": 0}

def get_license_tier():
    import time
    global _license_tier_cache
    # Return cached value for 60 seconds — avoids a blocking network call on every request
    if _license_tier_cache["tier"] is not None and time.time() - _license_tier_cache["ts"] < 60:
        return _license_tier_cache["tier"]

    # If monetization is disabled, we default to DEVELOPER (all features unlocked)
    free_enabled = False
    try:
        import urllib.request
        import json
        req = urllib.request.Request("https://lanpad.vercel.app/api/monetization/status", headers={"User-Agent": "LANpad App"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if not data.get("monetization_enabled", False):
                _license_tier_cache = {"tier": "DEVELOPER", "ts": time.time()}
                return "DEVELOPER"
            free_enabled = data.get("free_enabled", False)
    except Exception:
        pass

    license_path = os.path.expanduser("~/.lanpad_license.json")
    if os.path.exists(license_path):
        try:
            with open(license_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Expiry check
                expires_at = data.get("expires_at")
                is_valid = True
                
                # HWID verification
                cached_hwid = data.get("hwid")
                if cached_hwid:
                    try:
                        from platform_utils import get_hardware_id
                        current_hwid = get_hardware_id()
                        if current_hwid and cached_hwid.strip().upper() != current_hwid.strip().upper():
                            is_valid = False
                    except Exception:
                        pass

                if expires_at:
                    from datetime import datetime, timezone
                    s = expires_at.replace("Z", "+00:00")
                    if "." in s:
                        base, tz = s.split("+") if "+" in s else (s, "00:00")
                        base_parts = base.split(".")
                        sec = base_parts[0]
                        ms = base_parts[1][:6]
                        s = f"{sec}.{ms}+{tz}"
                    expiry_dt = datetime.fromisoformat(s)
                    now_dt = datetime.now(timezone.utc)
                    if expiry_dt <= now_dt:
                        is_valid = False

                if is_valid:
                    tier = data.get("tier", "Basic")
                    _license_tier_cache = {"tier": tier, "ts": time.time()}
                    return tier
        except Exception:
            pass

    result = "Free" if free_enabled else "Basic"
    _license_tier_cache = {"tier": result, "ts": time.time()}
    return result


CLOUD_LIMITS_CACHE = None

def get_cloud_limits(tier):
    global CLOUD_LIMITS_CACHE
    import time
    
    # Refresh cache every 60 seconds
    if CLOUD_LIMITS_CACHE is None or time.time() - CLOUD_LIMITS_CACHE.get("timestamp", 0) > 60:
        try:
            import urllib.request
            import json
            req = urllib.request.Request("https://lanpad.vercel.app/api/monetization/status", headers={"User-Agent": "LANpad App"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                CLOUD_LIMITS_CACHE = {
                    "timestamp": time.time(),
                    "monetization_enabled": data.get("monetization_enabled", False),
                    "plans": data.get("plans", [])
                }
        except Exception:
            pass

    # Base limits (default to 0=unlimited, Admin can restrict via cloud)
    limits = {
        "max_sessions": 999,
        "max_vitcodes": 999,
        "allow_live_sync": 0,
        "allow_typing": 0,
        "allow_typing_mode": 0,
        "allow_inject": 0,
        "allow_raw": 0,
        "allow_select_copy": 0,
        "allow_fetch": 0,
        "allow_refill": 0,
        "allow_vitcode": 0,
        "allow_tunnel": 0,
        "allow_file_share": 0
    }

    # Unlock everything for DEVELOPER or if monetization is completely disabled
    if tier == "DEVELOPER" or not CLOUD_LIMITS_CACHE or not CLOUD_LIMITS_CACHE.get("monetization_enabled", False):
        for key in limits:
            if key in ["max_sessions", "max_vitcodes"]:
                limits[key] = 999
            else:
                limits[key] = 0 # 0 means unlimited
        return limits

    # Find the tier in the cloud plans
    for plan in CLOUD_LIMITS_CACHE.get("plans", []):
        if plan.get("tier") == tier:
            # Overwrite defaults with cloud config
            for key in limits:
                if key in plan:
                    limits[key] = plan[key]
            
            # If 0 is set for max_sessions, treat as unlimited (999)
            if limits["max_sessions"] == 0:
                limits["max_sessions"] = 999
                
            break

    return limits


def check_feature_usage(feature_key, feature_name):
    """
    Checks if a feature is allowed based on limit bounds.
    If limited, increments usage and returns True if under limit.
    Returns (True, None) if allowed, (False, error_msg) if blocked.
    """
    tier = get_license_tier()
    limits = get_cloud_limits(tier)
    
    val = limits.get(feature_key, 0)
    
    # Backwards compatibility if cloud returns True/False
    if isinstance(val, bool):
        if not val:
            return False, f"{feature_name} is disabled on your plan. Please upgrade."
        val = 0
        
    if val == -1:
        return False, f"{feature_name} is completely disabled on your current plan. Please upgrade to unlock."
        
    if val > 0:
        # Check usage
        path = _config_path()
        config = {}
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    config = json.load(f)
            except Exception:
                pass
                
        usages = config.get("feature_usages", {})
        used = usages.get(feature_key, 0)
        
        if used >= val:
            return False, f"You have reached the usage limit ({val}) for {feature_name} on your current plan. Please upgrade to continue."
            
        # Increment usage
        usages[feature_key] = used + 1
        config["feature_usages"] = usages
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=4)
        except Exception:
            pass
            
    return True, None


def fetch_ota_templates():
    os.makedirs(OTA_DIR, exist_ok=True)
    custom_url = _read_custom_website_url()

    for tmpl in ["index.html", "center.html", "vitcodes.html", "files.html"]:
        success = False
        
        # 0. Try local templates directory (works in source runs and PyInstaller bundles)
        local_path = resource_path(os.path.join("templates", tmpl))
        if os.path.exists(local_path):
            try:
                import shutil
                shutil.copy2(local_path, os.path.join(OTA_DIR, tmpl))
                success = True
                print(f"[OTA] Successfully copied {tmpl} from local repository/bundled templates")
            except Exception as e:
                print(f"[OTA] Failed to copy {tmpl} from local repository: {e}")

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


import threading

# Initialize global keyboard listener to stop pasting via ESC key
# This MUST be initialized in the main thread, otherwise HIToolbox will crash on macOS 14+
try:
    if IS_WINDOWS:
        from pynput import keyboard
        def on_press(key):
            global stop_typing
            if key == keyboard.Key.esc:
                if not stop_typing:
                    stop_typing = True
                    print("\n!!! Paste Stopped via Laptop Keyboard (ESC) !!!")
        
        _global_listener = keyboard.Listener(on_press=on_press)
        _global_listener.start()
    elif IS_MAC:
        import AppKit
        def mac_handler(event):
            global stop_typing
            if event.keyCode() == 53:
                if not stop_typing:
                    stop_typing = True
                    print("\n!!! Paste Stopped via Laptop Keyboard (ESC) (macOS Monitor) !!!")

        _global_mac_monitor = AppKit.NSEvent.addGlobalMonitorForEventsMatchingMask_handler_(
            AppKit.NSEventMaskKeyDown,
            mac_handler
        )
        print("[keyboard] Successfully registered global AppKit ESC monitor on macOS")
except Exception as e:
    print(f"[keyboard] Failed to start ESC listener: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Copy local templates synchronously on startup to guarantee the latest templates (with switcher banner) are served
    os.makedirs(OTA_DIR, exist_ok=True)
    for tmpl in ["index.html", "center.html", "vitcodes.html", "files.html"]:
        local_path = resource_path(os.path.join("templates", tmpl))
        if os.path.exists(local_path):
            try:
                import shutil
                shutil.copy2(local_path, os.path.join(OTA_DIR, tmpl))
                print(f"[Lifespan] Synchronously copied local template: {tmpl}")
            except Exception as e:
                print(f"[Lifespan] Failed to copy local template {tmpl}: {e}")
                
    # Fetch latest remote templates in the background on startup
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


@app.get("/files")
async def files_page():
    return _cached_file_response("files.html")


@app.get("/vitcodes")
async def vitcodes_page():
    return _cached_file_response("vitcodes.html")


@app.get("/api/vitcodes")
async def get_api_vitcodes():
    limits = get_cloud_limits(get_license_tier())
    allow_val = limits.get("allow_vitcode", 0)
    # Block only if explicitly disabled (-1 or False)
    if allow_val == -1 or (isinstance(allow_val, bool) and not allow_val):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"error": "Your plan does not allow VITCodes access."})

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
    urls.append("https://lanpad.vercel.app/api/vitcodes")
    urls.append("http://localhost:3000/api/vitcodes")

    async def fetch_one(client, url):
        try:
            r = await client.get(url, timeout=2.0)
            if r.status_code == 200:
                data = r.json()
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception:
            pass
        return None

    async with httpx.AsyncClient(verify=False) as client:
        tasks = [fetch_one(client, url) for url in urls]
        for task in asyncio.as_completed(tasks):
            res = await task
            if res is not None:
                return res

    # Fallback: if all lists were empty, try to return any successful response (even if empty)
    try:
        async with httpx.AsyncClient(verify=False) as client:
            for url in urls:
                try:
                    r = await client.get(url, timeout=2.0)
                    if r.status_code == 200:
                        return r.json()
                except Exception:
                    pass
    except Exception:
        pass
    return []


def _cached_file_response(filename: str):
    from fastapi.responses import HTMLResponse
    path = get_template_path(filename)
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        # Inject the active LAN IP of the computer
        lan_ip = get_local_ip()
        content = content.replace("{{LAN_IP}}", lan_ip)
        response = HTMLResponse(content=content)
    except Exception:
        # Fallback to standard FileResponse on errors
        response = FileResponse(path)
        
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

@app.get("/limits")
async def get_my_limits():
    """Endpoint for mobile UI to fetch its current feature limits."""
    tier = get_license_tier()
    limits = get_cloud_limits(tier)
    
    # Read usages to compute effective boolean values
    path = _config_path()
    config = {}
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                config = json.load(f)
        except Exception:
            pass
    usages = config.get("feature_usages", {})
    
    # Translate numeric limits to boolean values for older UI code, while providing usage data
    frontend_limits = {}
    for k, v in limits.items():
        if k.startswith("allow_"):
            # Ensure boolean fallback for backwards compatibility
            if isinstance(v, bool):
                frontend_limits[k] = v
                frontend_limits[k + "_limit"] = 0
            else:
                # -1 = disabled
                # 0 = unlimited
                # >0 = limited (check if used < v)
                frontend_limits[k] = (v != -1) and (v == 0 or usages.get(k, 0) < v)
                frontend_limits[k + "_limit"] = v
                
            frontend_limits[k + "_used"] = usages.get(k, 0)
        else:
            frontend_limits[k] = v
            
    return {"status": "success", "tier": tier, "limits": frontend_limits}

@app.post("/use_feature")
async def api_use_feature(data: dict):
    """Endpoint for frontend to increment usage of UI-only features."""
    feature = data.get("feature")
    name = data.get("name", feature)
    if not feature:
        return {"status": "error", "message": "Missing feature parameter"}
        
    allowed, err = check_feature_usage(feature, name)
    if not allowed:
        return {"status": "error", "message": err}
    return {"status": "success"}

@app.get("/copy")
async def copy_from_laptop():
    tier = get_license_tier()
    allowed, err = check_feature_usage("allow_select_copy", "Select Copy")
    if not allowed:
        return {"status": "error", "message": err}       
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
    # Security Check
    allowed, err = check_feature_usage("allow_vitcode", "VITCodes Access")
    if not allowed:
        return {"status": "error", "message": err}       
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

@app.get("/typing_status")
async def typing_status():
    global is_currently_typing
    return {"is_typing": is_currently_typing}


# ── Typing engine ─────────────────────────────────────────────────────────────

def perform_typing(text, wpm, is_coding=False):
    global stop_typing, is_currently_typing
    is_currently_typing = True

    try:
        import pyautogui  # Lazy import – backend may run headless
        pyautogui.FAILSAFE = False  # Prevent FailSafeException when mouse hits screen corner
        pyautogui.PAUSE = 0
    except Exception as e:
        print(f"[typing] pyautogui not available: {e}")
        is_currently_typing = False
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

                    elapsed = time.time() - char_start
                    sleep_time = max(0, typing_interval - elapsed)
                    time.sleep(sleep_time)

        # Trigger cleanup if coding mode is active
        if is_coding and not stop_typing:
            extra_braces = text.count('{')
            if extra_braces > 0:
                print(f"[typing] Typing finished. Cleaning up {extra_braces} extra brackets below cursor...")
                time.sleep(0.4)
                try:
                    # Save old clipboard
                    old_clipboard = pyperclip.paste()
                except Exception:
                    old_clipboard = ""

                try:
                    if IS_MAC:
                        pyautogui.hotkey('shift', 'command', 'down', interval=0.05)
                    else:
                        pyautogui.hotkey('shift', 'ctrl', 'end', interval=0.05)
                    
                    time.sleep(0.15)
                    
                    # The user explicitly requested to simply press backspace 
                    # to delete the selected extra brackets.
                    pyautogui.press('backspace')
                    time.sleep(0.1)
                except Exception as ex:
                    print(f"[typing] Cleanup failed: {ex}")

    finally:
        # Failsafe: release modifiers ONCE at the very end only
        is_currently_typing = False
        safe_release()
        print("Typing task finished/stopped")


# ── WebSocket (PRD) ───────────────────────────────────────────────────────────

@app.websocket("/ws/connect")
async def websocket_endpoint(websocket: WebSocket):
    sid = websocket.query_params.get("sid")
    if sid != SESSION_TOKEN:
        await websocket.accept()
        await websocket.send_text(json.dumps({"error": "Unauthorized session"}))
        await websocket.close()
        return

    tier = get_license_tier()
    limits = get_cloud_limits(tier)
    max_sessions = limits.get("max_sessions", 1)
        
    if len(active_connections) >= max_sessions:
        await websocket.accept()
        await websocket.send_text(json.dumps({"error": f"Session limit exceeded. {tier} tier allows max {max_sessions} active session(s). Please upgrade."}))
        await websocket.close()
        return

    await websocket.accept()
    active_connections.append(websocket)
    
    # Identify device name
    user_agent = websocket.headers.get("user-agent", "").lower()
    if "iphone" in user_agent:
        dev = "iPhone"
    elif "ipad" in user_agent:
        dev = "iPad"
    elif "android" in user_agent:
        dev = "Android"
    elif "macintosh" in user_agent:
        dev = "Mac"
    elif "windows" in user_agent:
        dev = "Windows"
    else:
        dev = "Device"
        
    active_devices[websocket] = dev
    
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket data if needed
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        active_devices.pop(websocket, None)


@app.get("/api/connections")
async def get_connections():
    return {
        "count": len(active_connections),
        "devices": list(active_devices.values())
    }


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
        
        # Enforce basic WPM cap
        if mode == "sync":
            allowed, err = check_feature_usage("allow_live_sync", "Live Sync")
            if not allowed:
                return {"status": "error", "message": err}
        if mode == "inject":
            allowed, err = check_feature_usage("allow_inject", "Inject Mode")
            if not allowed:
                return {"status": "error", "message": err}
        if mode == "flash":
            allowed, err = check_feature_usage("allow_raw", "Flash (Raw) Mode")
            if not allowed:
                return {"status": "error", "message": err}
        if mode == "typing":
            is_coding = bool(data.get("is_coding", False))
            if is_coding:
                allowed, err = check_feature_usage("allow_typing_mode", "Coding Typing Mode")
            else:
                allowed, err = check_feature_usage("allow_typing", "Normal Typing Mode")
            if not allowed:
                return {"status": "error", "message": err}
            
        is_coding = bool(data.get("is_coding", False))
        
        # Guard checking completed via check_feature_usage above
                
    except Exception as e:
        return {"status": "error", "message": f"Data parsing error: {str(e)}"}

    if text is not None:
        print(f"[PASTE] Triggering {mode} mode | Content: {text[:20]}...")
        if not text:
            if mode != "sync":
                last_synced_text = ""
                pending_paste["text"] = ""
                pending_paste["id"] += 1
                return {"status": "success"}

        pending_paste["text"] = text
        pending_paste["id"] += 1

    if mode == "inject":
        def run_inject():
            cleaned_text = " ".join(text.split())
            _set_clipboard(cleaned_text)
            time.sleep(0.1)

            pyautogui_module = _safe_pyautogui()
            if not pyautogui_module:
                raise Exception("pyautogui not available")

            if IS_MAC:
                _check_mac_accessibility_and_prompt()
                pyautogui_module.hotkey('command', 'v', interval=0.05)
            else:
                pyautogui_module.hotkey('ctrl', 'v', interval=0.05)

        import asyncio
        try:
            await asyncio.to_thread(run_inject)
        except Exception as e:
            return {"status": "error", "message": str(e)}
        return {"status": "success"}

    elif mode == "type":
        # Note: Permission check already done at top of function
        
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
        
        old_text = last_synced_text
        last_synced_text = text
        
        def run_sync():
            if text == old_text:
                return

            if text.startswith(old_text) and len(text) - len(old_text) <= 3:
                new_chars = text[len(old_text):]
                if new_chars:
                    pyautogui_module.write(new_chars)
            elif old_text.startswith(text) and len(old_text) - len(text) <= 3:
                backspaces = len(old_text) - len(text)
                for _ in range(backspaces):
                    pyautogui_module.press('backspace')
            else:
                _set_clipboard(text)
                time.sleep(0.03)
                if IS_MAC:
                    pyautogui_module.hotkey('command', 'a')
                    pyautogui_module.hotkey('command', 'v')
                else:
                    pyautogui_module.hotkey('ctrl', 'a')
                    pyautogui_module.hotkey('ctrl', 'v')

        import asyncio
        await asyncio.to_thread(run_sync)
        return {"status": "success"}

    else:  # Default: Flash
        pyautogui_module = _safe_pyautogui()
        if not pyautogui_module:
            return {"status": "error", "message": "pyautogui not available"}

        def run_flash():
            _set_clipboard(text)
            # CRITICAL: Wait for clipboard to actually take the text
            # Some apps are slow to register the new clipboard content
            time.sleep(0.5)
            if IS_MAC:
                _check_mac_accessibility_and_prompt()
                pyautogui_module.hotkey('command', 'v', interval=0.05)
            else:
                pyautogui_module.hotkey('ctrl', 'v', interval=0.05)

        import asyncio
        await asyncio.to_thread(run_flash)
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


# ── File Sharing Operations ───────────────────────────────────────────────────

SHARED_DIR = os.path.expanduser("~/Downloads/LANpad")
if not os.path.exists(SHARED_DIR):
    os.makedirs(SHARED_DIR, exist_ok=True)


@app.get("/api/files/list")
async def list_files(sid: str = None):
    if sid != SESSION_TOKEN:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
    try:
        files = []
        if os.path.exists(SHARED_DIR):
            for name in os.listdir(SHARED_DIR):
                full_path = os.path.join(SHARED_DIR, name)
                if os.path.isfile(full_path) and not name.startswith("."):
                    stat = os.stat(full_path)
                    files.append({
                        "name": name,
                        "size": stat.st_size,
                        "modified": stat.st_mtime
                    })
        files.sort(key=lambda x: x["modified"], reverse=True)
        return {"status": "success", "files": files}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/files/upload")
async def upload_file(file: UploadFile = File(...), sid: str = None):
    if sid != SESSION_TOKEN:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
    try:
        filename = os.path.basename(file.filename)
        dest_path = os.path.join(SHARED_DIR, filename)
        
        from fastapi.concurrency import run_in_threadpool
        import shutil

        def save_file():
            file.file.seek(0)
            with open(dest_path, "wb") as f:
                shutil.copyfileobj(file.file, f, length=1024 * 1024)

        await run_in_threadpool(save_file)
        return {"status": "success", "filename": filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Shared file descriptor cache: filename -> (fd, expected_size, bytes_written_counter)
# Avoids repeated open()/close() syscalls across 12+ concurrent chunk requests
_upload_fd_cache = {}  # key: dest_path, value: {fd, size, lock}


@app.post("/api/files/upload_raw")
async def upload_file_raw(request: Request, filename: str, sid: str = None):
    if sid != SESSION_TOKEN:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
    try:
        safe_filename = os.path.basename(filename)
        dest_path = os.path.join(SHARED_DIR, safe_filename)
        
        import asyncio
        loop = asyncio.get_running_loop()
        
        # Open with 4MB OS write buffer — keeps syscalls large and infrequent
        fd = await loop.run_in_executor(None, lambda: open(dest_path, "wb", buffering=4 * 1024 * 1024))
        
        try:
            async for chunk in request.stream():
                await loop.run_in_executor(None, fd.write, chunk)
            await loop.run_in_executor(None, fd.flush)
        finally:
            await loop.run_in_executor(None, fd.close)
                
        return {"status": "success", "filename": safe_filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/files/preallocate")
async def preallocate_file(filename: str, size: int, sid: str = None):
    """Pre-allocate the destination file so parallel chunk writers can seek to their offsets."""
    if sid != SESSION_TOKEN:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
    try:
        safe_filename = os.path.basename(filename)
        dest_path = os.path.join(SHARED_DIR, safe_filename)
        with open(dest_path, "wb") as f:
            f.truncate(size)  # Instant — just sets file size, no disk I/O
        # Open and cache fd so upload_direct reuses it without open()/close() per chunk
        import threading
        _upload_fd_cache[dest_path] = {
            "fd": os.open(dest_path, os.O_WRONLY),
            "size": size,
            "written": 0,
            "lock": threading.Lock(),
        }
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/files/upload_direct")
async def upload_file_direct(request: Request, filename: str, offset: int, sid: str = None):
    """Write streamed data directly to the final file at the given byte offset.
    Uses os.pwrite() for atomic positional writes — safe for parallel non-overlapping regions.
    PERFORMANCE: Skips license check for chunks after preallocate (permission already verified)."""
    if sid != SESSION_TOKEN:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    try:
        safe_filename = os.path.basename(filename)
        dest_path = os.path.join(SHARED_DIR, safe_filename)

        import asyncio
        loop = asyncio.get_running_loop()

        # Get cached fd (created during preallocate) to skip open()/close() overhead.
        # CRITICAL: also skips check_feature_usage() which makes a blocking network call!
        # Permission was already verified during preallocate — no need to re-check per chunk.
        cache = _upload_fd_cache.get(dest_path)
        if cache:
            fd = cache["fd"]
            body = await request.body()
            os.pwrite(fd, body, offset)
            cache["written"] += len(body)
            if cache["written"] >= cache["size"]:
                try:
                    os.close(fd)
                except OSError:
                    pass
                _upload_fd_cache.pop(dest_path, None)
        else:
            # Fallback: fd not in cache (preallocate was not called) — check permission then write
            allowed, err = check_feature_usage("allow_file_share", "File Sharing")
            if not allowed:
                return {"status": "error", "message": err}
            fd = os.open(dest_path, os.O_WRONLY)
            try:
                body = await request.body()
                os.pwrite(fd, body, offset)
            finally:
                os.close(fd)

        return {"status": "success", "offset": offset}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.websocket("/ws/upload")
async def upload_via_websocket(websocket: WebSocket, sid: str = None, filename: str = None, size: int = 0):
    """WebSocket-based file upload — single TCP connection, binary frames, zero HTTP overhead.
    Pipelining: next receive starts while current write completes for maximum throughput."""
    await websocket.accept()

    if sid != SESSION_TOKEN:
        await websocket.send_json({"status": "error", "message": "Unauthorized"})
        await websocket.close(code=1008)
        return

    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        await websocket.send_json({"status": "error", "message": err})
        await websocket.close()
        return

    if not filename or size <= 0:
        await websocket.send_json({"status": "error", "message": "Missing filename or size"})
        await websocket.close()
        return

    safe_filename = os.path.basename(filename)
    dest_path = os.path.join(SHARED_DIR, safe_filename)

    # Pre-allocate the full file instantly (no actual I/O, just sets file size)
    with open(dest_path, "wb") as f:
        f.truncate(size)

    import asyncio
    import concurrent.futures
    loop = asyncio.get_running_loop()

    # Dedicated thread pool for disk writes — keeps event loop free for new receives
    write_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

    fd = os.open(dest_path, os.O_WRONLY)
    received = 0
    last_ack = 0
    ACK_EVERY = 8 * 1024 * 1024   # ACK every 8MB — less JSON overhead vs 4MB
    pending_write = None           # Current in-flight pwrite future

    try:
        while received < size:
            data = await websocket.receive_bytes()
            write_offset = received
            received += len(data)

            # Await the PREVIOUS write before starting the next receive+write cycle.
            # This prevents unbounded memory growth while still pipelining effectively.
            if pending_write is not None:
                await pending_write

            # Kick off the write without awaiting — receive next chunk while this writes
            pending_write = loop.run_in_executor(
                write_executor,
                lambda d=data, o=write_offset: os.pwrite(fd, d, o)
            )

            # Send lightweight progress ACK
            if received - last_ack >= ACK_EVERY or received >= size:
                await websocket.send_json({"received": received, "total": size})
                last_ack = received

        # Ensure the last write completes before signalling success
        if pending_write is not None:
            await pending_write

        await websocket.send_json({"status": "success", "filename": safe_filename})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"status": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        os.close(fd)
        write_executor.shutdown(wait=False)



@app.post("/api/files/upload_chunk")
async def upload_file_chunk(request: Request, upload_id: str, chunk_index: int, sid: str = None):
    """Legacy chunked upload — kept for backward compatibility."""
    if sid != SESSION_TOKEN:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
    
    import re
    if not re.match(r"^[a-zA-Z0-9_\-]+$", upload_id):
        return {"status": "error", "message": "Invalid upload_id"}
        
    try:
        temp_filename = f".tmp_{upload_id}_{chunk_index}"
        dest_path = os.path.join(SHARED_DIR, temp_filename)
        
        chunks = []
        chunks_size = 0
        with open(dest_path, "wb") as f:
            async for chunk in request.stream():
                chunks.append(chunk)
                chunks_size += len(chunk)
                if chunks_size >= 4 * 1024 * 1024:
                    f.write(b''.join(chunks))
                    chunks = []
                    chunks_size = 0
            if chunks:
                f.write(b''.join(chunks))
                
        return {"status": "success", "chunk_index": chunk_index}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/files/merge_chunks")
async def merge_file_chunks(upload_id: str, filename: str, total_chunks: int, sid: str = None):
    """Legacy merge — kept for backward compatibility."""
    if sid != SESSION_TOKEN:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
        
    import re
    if not re.match(r"^[a-zA-Z0-9_\-]+$", upload_id):
        return {"status": "error", "message": "Invalid upload_id"}
        
    try:
        safe_filename = os.path.basename(filename)
        dest_path = os.path.join(SHARED_DIR, safe_filename)
        
        from fastapi.concurrency import run_in_threadpool
        
        def do_merge():
            with open(dest_path, "wb") as outfile:
                for idx in range(total_chunks):
                    chunk_path = os.path.join(SHARED_DIR, f".tmp_{upload_id}_{idx}")
                    if not os.path.exists(chunk_path):
                        raise Exception(f"Missing chunk {idx}")
                    with open(chunk_path, "rb") as infile:
                        while True:
                            data = infile.read(4 * 1024 * 1024)
                            if not data:
                                break
                            outfile.write(data)
            
            for idx in range(total_chunks):
                chunk_path = os.path.join(SHARED_DIR, f".tmp_{upload_id}_{idx}")
                try:
                    os.remove(chunk_path)
                except Exception:
                    pass
                    
        await run_in_threadpool(do_merge)
        return {"status": "success", "filename": safe_filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}



@app.get("/api/files/download/{filename}")
async def download_file(filename: str, sid: str = None):
    if sid != SESSION_TOKEN:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Unauthorized session")
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail=err)
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(SHARED_DIR, safe_filename)
    if not os.path.exists(file_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    
    from fastapi.responses import StreamingResponse
    from fastapi.concurrency import run_in_threadpool
    import urllib.parse
    import shutil
    import tempfile
    
    # If the target is a directory (like a Keynote .key package or folder), zip it on the fly
    if os.path.isdir(file_path):
        temp_dir = tempfile.gettempdir()
        zip_filename = safe_filename + ".zip"
        zip_path = os.path.join(temp_dir, zip_filename)
        
        def zip_dir():
            if os.path.exists(zip_path):
                try:
                    os.remove(zip_path)
                except Exception:
                    pass
            import zipfile
            # Use ZIP_STORED (no compression) for instantaneous zipping at full disk I/O speeds
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_STORED) as zf:
                for root, dirs, files in os.walk(file_path):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, file_path)
                        zf.write(full_path, rel_path)
            
        await run_in_threadpool(zip_dir)
        file_path = zip_path
        safe_filename = zip_filename

    import asyncio
    from fastapi.responses import StreamingResponse
    import urllib.parse
    
    file_size = os.path.getsize(file_path)
    
    async def iterfile():
        loop = asyncio.get_running_loop()
        with open(file_path, mode="rb", buffering=4 * 1024 * 1024) as f:
            chunk_size = 4 * 1024 * 1024  # 4MB chunks for high-throughput LAN
            while True:
                chunk = await loop.run_in_executor(None, f.read, chunk_size)
                if not chunk:
                    break
                yield chunk

    encoded_filename = urllib.parse.quote(safe_filename)
    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
        "Content-Length": str(file_size),
    }
    return StreamingResponse(iterfile(), media_type="application/octet-stream", headers=headers)


@app.delete("/api/files/delete/{filename}")
async def delete_file(filename: str, sid: str = None):
    if sid != SESSION_TOKEN:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(SHARED_DIR, safe_filename)
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return {"status": "success"}
        return {"status": "error", "message": "File not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/speedtest/upload")
async def speedtest_upload(request: Request, sid: str = None):
    if sid != SESSION_TOKEN:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    # Consume request stream without writing to disk
    async for _ in request.stream():
        pass
    return {"status": "success"}


@app.get("/api/speedtest/download")
async def speedtest_download(size: int = 10 * 1024 * 1024, sid: str = None):
    if sid != SESSION_TOKEN:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Unauthorized session")
    # Stream dummy bytes directly from memory (20MB default)
    chunk = b"\0" * (1024 * 1024)  # 1MB chunk of zeros — saturates LAN bandwidth
    def iter_dummy():
        total_sent = 0
        while total_sent < size:
            to_send = min(len(chunk), size - total_sent)
            yield chunk[:to_send]
            total_sent += to_send
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        iter_dummy(),
        media_type="application/octet-stream",
        headers={"Content-Length": str(size)}
    )


@app.get("/api/benchmark/token")
async def get_benchmark_token(request: Request):
    if request.client.host in ("127.0.0.1", "localhost", "::1"):
        return {"session_token": SESSION_TOKEN}
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=403, content={"error": "Access denied"})


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

    # Boost throughput: uvloop = 2-4x faster event loop (C-based, replaces Python asyncio)
    # httptools = llhttp-based HTTP parser (same as Node.js, much faster than h11)
    # Thread pool sized to handle 6+ concurrent pwrite() calls without queuing
    import concurrent.futures
    import asyncio
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=24)  # 12 streams × 2 headroom
    loop_instance = None
    try:
        import uvloop
        loop_instance = uvloop.new_event_loop()
        asyncio.set_event_loop(loop_instance)
    except ImportError:
        pass

    uvicorn_kwargs = dict(
        host="0.0.0.0",
        port=8000,
        http="httptools",      # Fast llhttp-based HTTP/1.1 parser
        loop="uvloop",         # Fast C-based event loop
        timeout_keep_alive=30,
        limit_concurrency=200,
        ws_max_size=8 * 1024 * 1024,  # 8 MB max WS message — allows 4 MB client chunks with headroom
        ws_ping_interval=30,          # Keep WS alive during long uploads
        ws_ping_timeout=60,           # Generous timeout for slow connections
    )

    # Gracefully fall back if uvloop/httptools not installed in this environment
    try:
        import uvloop  # noqa
        import httptools  # noqa
    except ImportError:
        uvicorn_kwargs.pop("http", None)
        uvicorn_kwargs.pop("loop", None)

    uvicorn.run(app, **uvicorn_kwargs)
   
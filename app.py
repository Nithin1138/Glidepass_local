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

def encrypt_xor(plaintext: str, key: str) -> str:
    if not key:
        return plaintext
    plaintext_bytes = plaintext.encode('utf-8')
    key_bytes = key.encode('utf-8')
    cipher_bytes = bytes(p ^ key_bytes[i % len(key_bytes)] for i, p in enumerate(plaintext_bytes))
    import base64
    return base64.b64encode(cipher_bytes).decode('utf-8')

def decrypt_xor(ciphertext: str, key: str) -> str:
    if not key or not ciphertext:
        return ciphertext
    try:
        import base64
        cipher_bytes = base64.b64decode(ciphertext.encode('utf-8'))
        key_bytes = key.encode('utf-8')
        plaintext_bytes = bytes(c ^ key_bytes[i % len(key_bytes)] for i, c in enumerate(cipher_bytes))
        return plaintext_bytes.decode('utf-8')
    except Exception:
        return ciphertext

# Simple queue to store the last paste for the browser listener
pending_paste = {"text": "", "id": 0, "mode": ""}
stop_typing = False
is_currently_typing = False
history_stack = []

def add_to_history(text: str, mode: str, title: str = None):
    global history_stack
    if not text or not text.strip():
        return
    if history_stack and history_stack[0]["content"] == text:
        return
    import uuid
    from datetime import datetime
    item = {
        "id": str(uuid.uuid4()),
        "content": text,
        "mode": mode,
        "title": title or (text[:30] + "..." if len(text) > 30 else text),
        "timestamp": datetime.now().strftime("%H:%M:%S")
    }
    history_stack.insert(0, item)
    if len(history_stack) > 50:
        history_stack.pop()



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
import secrets
import time
import random
SESSION_TOKEN = secrets.token_hex(13) + "".join(str(random.randint(0, 9)) for _ in range(6))  # 32 chars: 26 hex + 6 digits
SERVER_START_TIME = time.time()
TUNNEL_URL = ""
_ws_connect_attempts = {}  # {ip: [(timestamp, count), ...]}
_http_rate_limits = {}  # {ip: [(timestamp, endpoint), ...]}
active_connections = []
active_devices = {}
_registered_clients = {}  # {client_device_name: last_seen_timestamp}

def is_valid_sid(sid: str) -> bool:
    """Accept both the full 32-char session token and its last 6 digits.
    This allows both mobile QR scan (full token) and manual entry (short code)."""
    if not sid or not SESSION_TOKEN:
        return False
    sid = sid.strip()
    return sid == SESSION_TOKEN or sid == SESSION_TOKEN[-6:]


async def broadcast_files_changed():
    """Notify all connected WebSocket clients that the file list has changed."""
    dead = []
    for ws in list(active_connections):
        try:
            import json as _json
            await ws.send_text(_json.dumps({"event": "files_changed"}))
        except Exception:
            dead.append(ws)
    for ws in dead:
        try:
            active_connections.remove(ws)
        except ValueError:
            pass

from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager
import requests

OTA_DIR = os.path.join(user_data_dir(), "templates")
OTA_URL_BASE = "https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/templates/"

def is_rate_limited(client_ip: str, endpoint: str, limit: int = 60, window: int = 60) -> bool:
    global _http_rate_limits
    now = time.time()
    if client_ip not in _http_rate_limits:
        _http_rate_limits[client_ip] = [(now, endpoint)]
        return False
    recent = [t for t, ep in _http_rate_limits[client_ip] if now - t < window and ep == endpoint]
    if len(recent) >= limit:
        return True
    _http_rate_limits[client_ip] = [(t, ep) for t, ep in _http_rate_limits[client_ip] if now - t < window] + [(now, endpoint)]
    return False


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
        req = urllib.request.Request("https://lanpad.app/api/monetization/status", headers={"User-Agent": "LANpad App"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if not data.get("monetization_enabled", False):
                _license_tier_cache = {"tier": "DEVELOPER", "ts": time.time()}
                return "DEVELOPER"
            free_enabled = data.get("free_enabled", False)
    except Exception:
        # Cache the failure / offline status for 10 minutes (600s) to avoid repeated blocking timeouts
        _license_tier_cache = {"tier": "DEVELOPER", "ts": time.time() + 540}

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

    result = "Free" if free_enabled else "UNLICENSED"
    _license_tier_cache = {"tier": result, "ts": time.time()}
    return result


CLOUD_LIMITS_CACHE = None

def get_cloud_limits(tier, force=False):
    global CLOUD_LIMITS_CACHE
    import time
    
    # Refresh cache every 60 seconds (or immediately if force=True)
    if force or CLOUD_LIMITS_CACHE is None or time.time() - CLOUD_LIMITS_CACHE.get("timestamp", 0) > 60:
        try:
            import urllib.request
            import json
            import ssl
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            req = urllib.request.Request("https://lanpad.app/api/monetization/status", headers={"User-Agent": "LANpad App"})
            with urllib.request.urlopen(req, context=ctx, timeout=2) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                CLOUD_LIMITS_CACHE = {
                    "timestamp": time.time(),
                    "monetization_enabled": data.get("monetization_enabled", False),
                    "free_enabled": data.get("free_enabled", False),
                    "plans": data.get("plans", [])
                }
        except Exception:
            # Cache failure / offline status for 10 minutes (600s) to avoid repeated blocking timeouts
            CLOUD_LIMITS_CACHE = {
                "timestamp": time.time() + 540,
                "monetization_enabled": False,
                "free_enabled": True,
                "plans": []
            }

    # Base limits (default to 0=unlimited, Admin can restrict via cloud)
    limits = {
        "max_sessions": 999,
        "max_resources_per_month": 999,
        "allow_live_sync": 0,
        "allow_typing": 0,
        "allow_typing_mode": 0,
        "allow_inject": 0,
        "allow_raw": 0,
        "allow_select_copy": 0,
        "allow_fetch": 0,
        "allow_refill": 0,
        "allow_resource_access": 0,
        "allow_resource_analytics": 0,
        "allow_tunnel": 0,
        "allow_vitcode": 0,
        "allow_file_share": 0
    }

    # Unlock everything for DEVELOPER or if monetization is completely disabled
    if tier == "DEVELOPER" or not CLOUD_LIMITS_CACHE or not CLOUD_LIMITS_CACHE.get("monetization_enabled", False):
        for key in limits:
            if key in ["max_sessions", "max_resources_per_month"]:
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


def load_and_sync_usages(config_path, limits, now=None):
    if now is None:
        import datetime
        now = datetime.datetime.now()
        
    config = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
        except Exception:
            pass
            
    usages = config.get("feature_usages", {})
    usage_metadata = config.get("feature_usage_metadata", {})
    
    modified = False
    for k, val in limits.items():
        if k.startswith("allow_") and not isinstance(val, bool) and val > 0:
            limit_period = limits.get("limit_period", "lifetime").lower()
            meta = usage_metadata.get(k, {})
            last_updated_str = meta.get("last_updated", "")
            
            should_reset = False
            today_str = now.strftime("%Y-%m-%d")
            
            if last_updated_str:
                try:
                    import datetime as dt_mod
                    last_updated = dt_mod.datetime.strptime(last_updated_str, "%Y-%m-%d")
                    if limit_period == "day":
                        if last_updated.date() != now.date():
                            should_reset = True
                    elif limit_period == "month":
                        if last_updated.year != now.year or last_updated.month != now.month:
                            should_reset = True
                except Exception:
                    should_reset = True
            else:
                should_reset = True
                
            if should_reset:
                usages[k] = 0
                meta = {"last_updated": today_str}
                usage_metadata[k] = meta
                modified = True
                
    if modified:
        config["feature_usages"] = usages
        config["feature_usage_metadata"] = usage_metadata
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=4)
        except Exception:
            pass
            
    return config, usages

def check_feature_usage(feature_key, feature_name):
    """
    Checks if a feature is allowed based on limit bounds, including hour-of-day,
    day-of-week, and daily/monthly reset periods configured by the administrator.
    """
    tier = get_license_tier()
    limits = get_cloud_limits(tier)
    
    # 1. Check allowed days (0=Monday, 6=Sunday)
    import datetime
    now = datetime.datetime.now()
    allowed_days_str = limits.get("allowed_days", "")
    if allowed_days_str:
        allowed_days = [int(x.strip()) for x in allowed_days_str.split(",") if x.strip().isdigit()]
        if len(allowed_days) > 0 and now.weekday() not in allowed_days:
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            allowed_names = ", ".join([day_names[d] for d in allowed_days])
            return False, f"{feature_name} is only allowed on: {allowed_names}."

    # 2. Check allowed hours (format e.g., "9-17")
    allowed_hours_str = limits.get("allowed_hours", "")
    if allowed_hours_str:
        try:
            start_hour, end_hour = [int(x.strip()) for x in allowed_hours_str.split("-")]
            if not (start_hour <= now.hour < end_hour):
                return False, f"{feature_name} is only allowed between {start_hour}:00 and {end_hour}:00."
        except Exception:
            pass

    val = limits.get(feature_key, 0)
    
    # Backwards compatibility if cloud returns True/False
    if isinstance(val, bool):
        if not val:
            return False, f"{feature_name} is disabled on your plan. Please upgrade."
        val = 0
        
    if val == -1:
        return False, f"{feature_name} is completely disabled on your current plan. Please upgrade to unlock."
        
    if val > 0:
        path = _config_path()
        config, usages = load_and_sync_usages(path, limits, now)
        used = usages.get(feature_key, 0)
        
        limit_period = limits.get("limit_period", "lifetime").lower()
        if used >= val:
            period_name = "today" if limit_period == "day" else ("this month" if limit_period == "month" else "lifetime")
            return False, f"You have reached the usage limit ({val}) {period_name} for {feature_name} on your current plan. Please upgrade to continue."
            
        # Increment usage
        usages[feature_key] = used + 1
        
        # Keep last updated metadata in sync
        usage_metadata = config.get("feature_usage_metadata", {})
        meta = usage_metadata.get(feature_key, {})
        meta["last_updated"] = now.strftime("%Y-%m-%d")
        usage_metadata[feature_key] = meta
        
        config["feature_usages"] = usages
        config["feature_usage_metadata"] = usage_metadata
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=4)
        except Exception:
            pass
            
    return True, None


def fetch_ota_templates():
    os.makedirs(OTA_DIR, exist_ok=True)
    custom_url = _read_custom_website_url()

    for tmpl in ["index.html", "center.html", "exam.html", "terms_of_service.html", "privacy_policy.html", "content_policy.html", "copyright_takedown.html", "refund_policy.html", "resources.html", "files.html", "files_preview.html"]:
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
    # Copy local templates synchronously on startup to guarantee the latest templates are served
    os.makedirs(OTA_DIR, exist_ok=True)
    for tmpl in ["index.html", "center.html", "exam.html", "files.html", "files_preview.html", "lucide.min.js"]:
        local_path = resource_path(os.path.join("templates", tmpl))
        if os.path.exists(local_path):
            try:
                import shutil
                shutil.copy2(local_path, os.path.join(OTA_DIR, tmpl))
                print(f"[Lifespan] Synchronously copied local template/resource: {tmpl}")
            except Exception as e:
                print(f"[Lifespan] Failed to copy local template {tmpl}: {e}")

    # Fetch latest OTA templates in the background on startup
    def fetch_ota_templates_safe():
        try:
            fetch_ota_templates()
        except Exception as e:
            print(f"[ota] Template fetch failed: {e}")
            import traceback
            traceback.print_exc()
    threading.Thread(target=fetch_ota_templates_safe, daemon=True).start()

    # Telemetry Heartbeat Loop to track Daily Active Users (DAU)
    def start_heartbeat_loop():
        import time
        import urllib.request
        import json
        import os
        from platform_utils import get_hardware_id, VERSION
        
        # Give network/startup a few seconds to settle
        time.sleep(5)
        
        while True:
            try:
                is_accepted = False
                for path_str in ["~/.lanpad/legal.json", "~/.lanpad_legal.json"]:
                    try:
                        p = os.path.expanduser(path_str)
                        if os.path.exists(p):
                            with open(p, "r", encoding="utf-8") as f:
                                legal_data = json.load(f)
                            if legal_data.get("accepted", False):
                                is_accepted = True
                                break
                    except Exception:
                        pass
                if is_accepted:
                    if os.environ.get("LANPAD_TELEMETRY_DISABLE") == "1":
                        is_accepted = False
                    else:
                        try:
                            cfg_path = _config_path()
                            if os.path.exists(cfg_path):
                                with open(cfg_path, "r", encoding="utf-8") as f:
                                    cfg = json.load(f)
                                if cfg.get("telemetry_opt_in") is False:
                                    is_accepted = False
                        except Exception:
                            pass
                if is_accepted:
                    hwid = get_hardware_id()
                    platform_str = "macOS" if IS_MAC else "Windows"
                    version = VERSION
                    
                    payload = json.dumps({
                        "type": "heartbeat",
                        "uuid": hwid,
                        "platform": platform_str,
                        "app_version": version
                    }).encode("utf-8")
                    
                    if getattr(sys, 'frozen', False):
                        urls = ["https://lanpad.app/api/telemetry"]
                    else:
                        urls = ["http://127.0.0.1:3000/api/telemetry", "https://lanpad.app/api/telemetry"]
                        
                    for url in urls:
                        try:
                            req = urllib.request.Request(
                                url,
                                data=payload,
                                headers={"Content-Type": "application/json", "User-Agent": "LANpad App"},
                                method="POST"
                            )
                            with urllib.request.urlopen(req, timeout=5) as resp:
                                res = json.loads(resp.read().decode("utf-8"))
                                if res.get("success", False):
                                    print(f"[telemetry] Heartbeat logged successfully to {url}")
                                    break
                        except Exception as e:
                            print(f"[telemetry] Failed to log heartbeat on {url}: {e}")
            except Exception as e:
                print(f"[telemetry] Error in heartbeat loop: {e}")
            
            # Send heartbeat every 5 minutes (300 seconds)
            time.sleep(300)

    threading.Thread(target=start_heartbeat_loop, daemon=True).start()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://lanpad.app", "https://www.lanpad.app", "https://lanpad.vercel.app"],
    allow_origin_regex=r"https?://.*\.trycloudflare\.com|https?://.*\.localhost\.run|https?://.*\.lhr\.life|https?://.*\.lhr\.rocks|https?://.*\.bore\.pub|chrome-extension://.*|http://192\.168\..*|http://10\..*|http://172\..*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response

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


def get_active_site():
    """Detects the current active website/application to categorize telemetry logs."""
    try:
        url = "Other"
        if IS_MAC:
            # Check the active application on macOS
            cmd = "osascript -e 'tell application \"System Events\" to get name of first process whose frontmost is true'"
            app_name = _sp.check_output(cmd, shell=True).decode("utf-8").strip().lower()
            if "chrome" in app_name:
                cmd_url = "osascript -e 'tell application \"Google Chrome\" to get URL of active tab of first window'"
                url = _sp.check_output(cmd_url, shell=True).decode("utf-8").strip().lower()
            elif "safari" in app_name:
                cmd_url = "osascript -e 'tell application \"Safari\" to get URL of current tab of first window'"
                url = _sp.check_output(cmd_url, shell=True).decode("utf-8").strip().lower()
            else:
                url = app_name
        elif IS_WINDOWS:
            # Check active window title on Windows
            import win32gui
            window = win32gui.GetForegroundWindow()
            url = win32gui.GetWindowText(window).lower()

        if "hackerrank" in url:
            return "HackerRank"
        elif "codechef" in url:
            return "CodeChef"
        elif "leetcode" in url:
            return "LeetCode"
        elif "moodle" in url:
            return "Moodle"
    except Exception:
        pass
    return "Other"


def log_telemetry_event_async(event):
    """Logs a telemetry event to the production Vercel database in a background thread."""
    def run():
        try:
            if os.environ.get("LANPAD_TELEMETRY_DISABLE") == "1":
                return
            try:
                cfg_path = _config_path()
                if os.path.exists(cfg_path):
                    with open(cfg_path, "r", encoding="utf-8") as f:
                        cfg = json.load(f)
                    if cfg.get("telemetry_opt_in") is False:
                        return
            except Exception:
                pass

            from platform_utils import get_hardware_id
            hwid = get_hardware_id()
            payload = json.dumps({
                "type": "event",
                "uuid": hwid,
                "event": event
            }).encode("utf-8")
            
            if getattr(sys, 'frozen', False):
                urls = ["https://lanpad.app/api/telemetry"]
            else:
                urls = ["http://127.0.0.1:3000/api/telemetry", "https://lanpad.app/api/telemetry"]
                
            for url in urls:
                try:
                    import urllib.request
                    req = urllib.request.Request(
                        url,
                        data=payload,
                        headers={"Content-Type": "application/json", "User-Agent": "LANpad App"},
                        method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        res = json.loads(resp.read().decode("utf-8"))
                        if res.get("success", False):
                            print(f"[telemetry] Event '{event}' logged successfully to {url}")
                            break
                except Exception as e:
                    print(f"[telemetry] Failed to log event on {url}: {e}")
        except Exception as e:
            print(f"[telemetry] Error in logging event: {e}")

    threading.Thread(target=run, daemon=True).start()



# ── Template / static endpoints ────────────────────────────────────────────────

@app.get("/")
async def index():
    response = _cached_file_response("index.html")
    return response


@app.get("/center")
async def center():
    return _cached_file_response("center.html")


@app.get("/exam")
async def exam_page():
    return _cached_file_response("exam.html")


@app.get("/files")
async def files_page():
    return _cached_file_response("files.html")


@app.get("/files_preview")
async def files_preview_page():
    return _cached_file_response("files_preview.html")


@app.get("/terms")
async def terms_page():
    return _cached_file_response("terms_of_service.html")


@app.get("/privacy")
async def privacy_page():
    return _cached_file_response("privacy_policy.html")


@app.get("/content-policy")
async def content_policy_page():
    return _cached_file_response("content_policy.html")


@app.get("/copyright-takedown")
async def copyright_takedown_page():
    return _cached_file_response("copyright_takedown.html")


@app.get("/refund-policy")
async def refund_policy_page():
    return _cached_file_response("refund_policy.html")


@app.get("/resources")
async def resources_page():
    return _cached_file_response("resources.html")


@app.get("/lucide.min.js")
async def get_lucide():
    path = os.path.join(OTA_DIR, "lucide.min.js")
    if os.path.exists(path):
        return FileResponse(path, media_type="application/javascript")
    fallback_path = resource_path(os.path.join("templates", "lucide.min.js"))
    return FileResponse(fallback_path, media_type="application/javascript")


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


_cached_device_name = None

def get_server_device_name():
    global _cached_device_name
    if _cached_device_name:
        return _cached_device_name
    import hashlib
    try:
        from platform_utils import get_hardware_id
        hwid = get_hardware_id()
    except Exception:
        hwid = "UNKNOWN-HWID"
    
    adjectives = [
        "Active", "Alert", "Aero", "Amber", "Aqua", "Azure", "Bold", "Brave", "Bright", "Calm",
        "Clever", "Cool", "Cozy", "Cute", "Daring", "Dashing", "Eager", "Easy", "Elite", "Fair",
        "Fancy", "Fast", "Fine", "Flying", "Free", "Fresh", "Friendly", "Funny", "Gentle", "Giant",
        "Glad", "Golden", "Grand", "Great", "Green", "Happy", "Hardy", "Honest", "Humble", "Jolly",
        "Keen", "Kind", "Light", "Lively", "Loyal", "Lucky", "Lunar", "Merry", "Mild", "Neat",
        "Nimble", "Noble", "Orange", "Polite", "Prime", "Proud", "Purple", "Quick", "Quiet", "Rapid",
        "Ready", "Red", "Safe", "Shadow", "Sharp", "Shiny", "Silly", "Silver", "Smart", "Soft",
        "Solar", "Strong", "Sunny", "Sweet", "Swift", "Tiny", "Vibrant", "Warm", "Wild", "Wise",
        "Young"
    ]
    animals = [
        "Ant", "Badger", "Bear", "Beaver", "Bee", "Bird", "Buffalo", "Bunny", "Butterfly", "Camel",
        "Cat", "Cheetah", "Crab", "Crane", "Deer", "Dog", "Dolphin", "Dove", "Duck", "Eagle",
        "Elephant", "Falcon", "Finch", "Fish", "Flamingo", "Fox", "Frog", "Gecko", "Giraffe", "Goat",
        "Goose", "Hawk", "Hedgehog", "Hippo", "Horse", "Jaguar", "Kangaroo", "Kitten", "Koala", "Lemur",
        "Leopard", "Lion", "Lobster", "Lynx", "Macaw", "Monkey", "Moose", "Octopus", "Otter", "Owl",
        "Panda", "Panther", "Parrot", "Penguin", "Puma", "Puppy", "Rabbit", "Raven", "Rhino", "Robin",
        "Rooster", "Seal", "Shark", "Sheep", "Sloth", "Sparrow", "Squirrel", "Starfish", "Swan", "Tiger",
        "Turtle", "Walrus", "Whale", "Wolf", "Zebra"
    ]
    
    h = int(hashlib.sha256(hwid.encode("utf-8")).hexdigest()[:8], 16)
    adj = adjectives[h % len(adjectives)]
    animal = animals[(h // len(adjectives)) % len(animals)]
    _cached_device_name = f"{adj}{animal}"
    return _cached_device_name


@app.get("/api/connection/info")
async def connection_info():
    unique_name = get_server_device_name()
    return {
        "status": "success",
        "lan_ip": get_local_ip(),
        "tunnel_url": TUNNEL_URL,
        "device_name": unique_name,
        "session_code": SESSION_TOKEN[-6:] if len(SESSION_TOKEN) >= 6 else SESSION_TOKEN
    }



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
    if not is_valid_sid(token):
        return {"status": "error", "message": "Invalid session token"}

    def kill_server():
        time.sleep(0.5)
        os._exit(0)

    import threading
    threading.Thread(target=kill_server).start()
    return {"status": "success", "message": "Server terminating..."}


@app.post("/session/create")
async def create_session(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if is_rate_limited(client_ip, "/session/create", limit=10, window=60):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=429, content={"status": "error", "message": "Rate limited. Max 10 requests per minute."})
    return await get_config()


@app.get("/session/create")
@app.get("/get_config")
async def get_config(request: Request = None):
    if request:
        client_ip = request.client.host if request.client else "unknown"
        if is_rate_limited(client_ip, "/session/create", limit=10, window=60):
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=429, content={"status": "error", "message": "Rate limited. Max 10 requests per minute."})
            
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


@app.post("/api/tunnel/set")
async def set_tunnel_url(url: str = None):
    global TUNNEL_URL
    if url:
        TUNNEL_URL = url
    return {"status": "success"}


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
    """No-op on non-macOS. The Flutter frontend handles permission prompts natively,
    so this backend function now simply returns True to avoid duplicate dialogs.
    """
    return True


# ── Clipboard / paste endpoints ───────────────────────────────────────────────

@app.get("/limits")
async def get_my_limits():
    """Endpoint for mobile UI to fetch its current feature limits."""
    tier = get_license_tier()
    limits = get_cloud_limits(tier)
    
    # Read usages to compute effective boolean values
    path = _config_path()
    config, usages = load_and_sync_usages(path, limits)
    
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
async def copy_from_laptop(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if is_rate_limited(client_ip, "/copy", limit=60, window=60):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=429, content={"status": "error", "message": "Rate limited. Max 60 requests per minute."})
        
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
            log_telemetry_event_async(f"copy:{get_active_site()}")
            return {"status": "success", "text": text}
        return {"status": "error", "message": "Clipboard empty"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/license/status")
async def license_status(force: bool = False):
    import json
    from datetime import datetime
    
    # If force is requested, clear the cache to ensure fresh monetization check
    if force:
        global CLOUD_LIMITS_CACHE
        CLOUD_LIMITS_CACHE = None
        
    license_path = os.path.expanduser("~/.lanpad_license.json")
    tier = "FREE"
    key = ""
    expires_at = ""
    days_left = 0
    if os.path.exists(license_path):
        try:
            with open(license_path, "r", encoding="utf-8") as f:
                lic = json.load(f)
            key = lic.get("key", "")
            tier = lic.get("tier", "Basic").upper()
            expires_at = lic.get("expires_at", "")
            if expires_at:
                try:
                    exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                    days_left = max(0, (exp.replace(tzinfo=None) - datetime.utcnow()).days)
                except Exception:
                    days_left = 365
        except Exception:
            pass
    else:
        tier = get_license_tier() or "FREE"
        
    return {
        "status": "success",
        "tier": tier,
        "key": key,
        "expires_at": expires_at,
        "days_left": days_left
    }

@app.post("/api/license/activate")
async def license_activate(data: dict):
    key = data.get("key", "").strip()
    if not key:
        return {"status": "error", "message": "Key cannot be empty"}
    
    import httpx
    from platform_utils import get_hardware_id
    hwid = get_hardware_id()
    
    urls = [
        "https://lanpad.app/api/monetization/verify",
        "http://127.0.0.1:3000/api/monetization/verify"
    ]
    
    success = False
    tier = "Basic"
    expires_at = "2099-12-31T23:59:59Z"
    error_msg = "Invalid activation key"
    
    for url in urls:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json={"key": key, "hwid": hwid}, timeout=5.0)
                if resp.status_code == 200:
                    res = resp.json()
                    if res.get("valid", False):
                        success = True
                        tier = res.get("tier", "Basic")
                        expires_at = res.get("expires_at", "2099-12-31T23:59:59Z")
                        break
                    else:
                        error_msg = res.get("error", error_msg)
        except Exception as e:
            print(f"[monetization] Verify error on {url}: {e}")
            
    if success:
        license_path = os.path.expanduser("~/.lanpad_license.json")
        try:
            with open(license_path, "w", encoding="utf-8") as f:
                json.dump({
                    "key": key,
                    "tier": tier,
                    "expires_at": expires_at,
                    "last_checked": time.time(),
                    "hwid": hwid
                }, f)
            global _license_tier_cache
            _license_tier_cache = {"tier": tier.upper(), "ts": time.time()}
            
            from datetime import datetime
            days_left = 365
            try:
                exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                days_left = max(0, (exp.replace(tzinfo=None) - datetime.utcnow()).days)
            except Exception:
                pass
            return {"status": "success", "tier": tier, "expires_at": expires_at, "days_left": days_left}
        except Exception as e:
            return {"status": "error", "message": f"Failed to save license: {str(e)}"}
    else:
        return {"status": "error", "message": error_msg}



@app.get("/api/admin/status")
async def admin_status(force: bool = False):
    """Returns a bundled status including tier, monetization state, feature limits, and version."""
    import json
    from datetime import datetime
    
    tier = get_license_tier() or "FREE"
    
    # Get cloud limits
    limits = get_cloud_limits(tier, force=force)
    
    # Check monetization status from cache
    monetization_enabled = bool(CLOUD_LIMITS_CACHE and CLOUD_LIMITS_CACHE.get("monetization_enabled", False))
    
    free_enabled = True
    if CLOUD_LIMITS_CACHE and monetization_enabled:
        free_enabled = CLOUD_LIMITS_CACHE.get("free_enabled", True)
    
    # Get version
    try:
        from platform_utils import VERSION as app_version
    except Exception:
        app_version = "1.0.0"
    
    return {
        "status": "success",
        "tier": tier,
        "monetization_enabled": monetization_enabled,
        "free_enabled": free_enabled,
        "feature_limits": limits,
        "version": app_version
    }


@app.get("/api/update/check")
async def update_check():
    """Compares local version with latest published version.json."""
    import urllib.request
    import json
    
    try:
        from platform_utils import VERSION as local_version
    except Exception:
        local_version = "0.0.0"
    
    try:
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        req = urllib.request.Request(
            "https://lanpad.app/downloads/version.json",
            headers={"User-Agent": "LANpad Flutter App"}
        )
        with urllib.request.urlopen(req, context=ctx, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        
        online_version = data.get("version", local_version)
        
        def v_tuple(v):
            clean = v.lower().lstrip("v")
            return tuple(map(int, clean.split(".")))
        
        try:
            update_available = v_tuple(online_version) > v_tuple(local_version)
        except Exception:
            update_available = False
        
        return {
            "status": "success",
            "update_available": update_available,
            "latest_version": online_version,
            "local_version": local_version,
            "force_update": data.get("force_update", False),
            "mac_url": data.get("mac_url", ""),
            "windows_url": data.get("windows_url", ""),
            "release_notes": data.get("release_notes", "")
        }
    except Exception as e:
        return {
            "status": "error",
            "update_available": False,
            "message": str(e)
        }


@app.post("/api/telemetry/event")
async def telemetry_event(data: dict):
    """Accepts a telemetry event and fires it asynchronously to the cloud."""
    event = data.get("event", "").strip()
    if not event:
        return {"status": "error", "message": "Event name required"}
    log_telemetry_event_async(event)
    return {"status": "success"}


@app.get("/get_clipboard")
async def get_clipboard(request: Request):
    # Rate limit check
    client_ip = request.client.host if request.client else "unknown"
    if is_rate_limited(client_ip, "/get_clipboard", limit=20):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=429, content={"status": "error", "message": "Rate limit exceeded"})

    # Security Check
    allowed, err = check_feature_usage("allow_fetch", "Fetch Clipboard")
    if not allowed:
        return {"status": "error", "message": err}       
    try:
        text = pyperclip.paste()
        if text and len(text) > 10 * 1024 * 1024:
            return {"status": "error", "message": "Clipboard exceeds 10MB limit"}
        
        is_encrypted = request.query_params.get("encrypted") == "true"
        if is_encrypted:
            sid = request.query_params.get("sid", "")
            if sid and text:
                text = encrypt_xor(text, sid)
                
        return {"status": "success", "text": text, "encrypted": is_encrypted}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/clipboard/get")
async def prd_get_clipboard(request: Request):
    return await get_clipboard(request)


_latest_screen_jpeg = None

def capture_screen_image():
    """Captures the primary monitor screen silently and returns PIL Image or None.
    Zero sound, zero window defocus, zero cursor flicker, completely undetectable
    by background processes or proctoring watchdogs.
    """
    if IS_MAC:
        # 1. Method A: Native silent screencapture CLI with -x (guaranteed to capture active windows/browsers/IDEs on modern macOS)
        try:
            import subprocess, tempfile, os
            from PIL import Image
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tf:
                temp_path = tf.name
            res = subprocess.run(['screencapture', '-x', '-m', temp_path], capture_output=True, timeout=3)
            if res.returncode == 0 and os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
                img = Image.open(temp_path).convert('RGB')
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
                return img
        except Exception as e:
            print(f"[screen] screencapture CLI fallback: {e}")

        # 2. Method B: WindowServer WindowList
        try:
            import Quartz
            import Quartz.CoreGraphics as CG
            from PIL import Image

            image = CG.CGWindowListCreateImage(
                CG.CGRectInfinite,
                CG.kCGWindowListOptionOnScreenOnly,
                CG.kCGNullWindowID,
                CG.kCGWindowImageDefault
            )
            if image is not None:
                width = CG.CGImageGetWidth(image)
                height = CG.CGImageGetHeight(image)
                bytes_per_row = CG.CGImageGetBytesPerRow(image)
                data_provider = CG.CGImageGetDataProvider(image)
                data = CG.CGDataProviderCopyData(data_provider)
                pil_img = Image.frombuffer('RGBA', (width, height), data, 'raw', 'BGRA', bytes_per_row, 1)
                return pil_img.convert('RGB')
        except Exception as e:
            print(f"[screen] Quartz capture fallback: {e}")

        # 3. Method C: Hardware Display Framebuffer
        try:
            import Quartz
            import Quartz.CoreGraphics as CG
            from PIL import Image

            display_id = CG.CGMainDisplayID()
            image = CG.CGDisplayCreateImage(display_id)
            if image is not None:
                width = CG.CGImageGetWidth(image)
                height = CG.CGImageGetHeight(image)
                bytes_per_row = CG.CGImageGetBytesPerRow(image)
                data_provider = CG.CGImageGetDataProvider(image)
                data = CG.CGDataProviderCopyData(data_provider)
                pil_img = Image.frombuffer('RGBA', (width, height), data, 'raw', 'BGRA', bytes_per_row, 1)
                return pil_img.convert('RGB')
        except Exception as e:
            print(f"[screen] CGDisplayCreateImage fallback: {e}")

    # Cross-platform fallbacks (Windows & Linux)
    try:
        from PIL import ImageGrab
        img = ImageGrab.grab()
        if img:
            return img.convert('RGB')
    except Exception as e:
        print(f"[screen] ImageGrab fallback: {e}")

    try:
        import pyautogui
        img = pyautogui.screenshot()
        if img:
            return img.convert('RGB')
    except Exception as e:
        print(f"[screen] pyautogui fallback: {e}")

    return None


@app.get("/api/device/screenshot")
@app.head("/api/device/screenshot")
async def get_device_screenshot():
    global _latest_screen_jpeg
    if not _latest_screen_jpeg:
        img = capture_screen_image()
        if img:
            import io
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            _latest_screen_jpeg = buf.getvalue()
    
    if _latest_screen_jpeg:
        from fastapi.responses import Response
        return Response(content=_latest_screen_jpeg, media_type="image/jpeg", headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Content-Disposition": "attachment; filename=laptop_screen.jpg"
        })
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=404, content={"status": "error", "message": "Screenshot not available"})


@app.get("/api/device/capture")
async def capture_device_state(request: Request, screen: bool = False):
    global _latest_screen_jpeg

    # 1. Capture clipboard (100% silent & stealth, NEVER triggers macOS menu bar icon)
    clip_text = ""
    try:
        clip_text = pyperclip.paste() or ""
        if clip_text and len(clip_text) > 5 * 1024 * 1024:
            clip_text = clip_text[: 5 * 1024 * 1024]
    except Exception as e:
        print(f"[device_capture] Clipboard error: {e}")

    has_screen = False
    screen_url = None

    # 2. Screen capture (Only if explicitly requested)
    # WARNING: On macOS Sequoia, calling screen capture causes macOS WindowServer
    # to display a purple recording pill in the menu bar. We only call it when requested.
    if screen:
        try:
            import asyncio
            img = await asyncio.to_thread(capture_screen_image)
            if img:
                import io
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=85)
                _latest_screen_jpeg = buf.getvalue()
                has_screen = True
                screen_url = f"/api/device/screenshot?t={int(time.time()*1000)}"
        except Exception as e:
            print(f"[device_capture] Screen capture error: {e}")
    elif _latest_screen_jpeg:
        has_screen = True
        screen_url = f"/api/device/screenshot?t={int(time.time()*1000)}"

    return {
        "status": "success",
        "has_screen": has_screen,
        "screen_url": screen_url,
        "has_clipboard": bool(clip_text),
        "clipboard_text": clip_text,
        "is_mac": IS_MAC
    }


@app.get("/api/device/open_permission")
async def open_device_screen_permission():
    """Opens macOS Screen Recording settings pane if requested."""
    if IS_MAC:
        try:
            _sp.Popen(["open", "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"])
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    return {"status": "success"}


def clean_ocr_text(text: str) -> str:
    """Post-processes extracted OCR text to repair common neural OCR confusions
    in programming code, math symbols, and exam questions."""
    if not text:
        return ""

    import re

    # 1. Normalize typographic quotes, dashes, and arrows
    text = text.replace("“", "\"").replace("”", "\"").replace("„", "\"")
    text = text.replace("‘", "'").replace("’", "'").replace("`", "'").replace("´", "'")
    text = text.replace("—", "-").replace("–", "-").replace("…", "...")
    text = text.replace("‹", "<").replace("›", ">")
    text = text.replace("→>", "->").replace("→", "->").replace("⇒", "=>")

    # 2. Big-O complexity notation (e.g. 0(1) -> O(1), 0(N) -> O(N))
    text = re.sub(r"\b0\(([0-9a-zA-Z\s\+\-\*\/\^\_\.]+)\)", r"O(\1)", text)

    lines = text.split("\n")
    cleaned_lines = []

    for line in lines:
        l = line

        # 3. De-merge keywords glued to identifiers (e.g. deftwo_sum -> def two_sum)
        l = re.sub(r"\b(def|class|for|while|if|elif|else|return|import|from|const|let|var|function|public|private|static|void)\b([a-zA-Z_])", r"\1 \2", l)

        # 4. Spacing around comparison and assignment operators
        l = re.sub(r"<\s*=", "<=", l)
        l = re.sub(r">\s*=", ">=", l)
        l = re.sub(r"!\s*=", "!=", l)
        l = re.sub(r"=\s*=", "==", l)
        l = re.sub(r"\+\s*=", "+=", l)
        l = re.sub(r"-\s*=", "-=", l)
        l = re.sub(r"\*\s*=", "*=", l)
        l = re.sub(r"/\s*=", "/=", l)
        l = re.sub(r"-\s*>", "->", l)
        l = re.sub(r"=\s*>", "=>", l)

        # 5. C++ increment / decrement operator confusions
        l = re.sub(r"\btti\b|\b\+ti\b|\bt\+i\b", "++i", l)
        l = re.sub(r"\btt([a-zA-Z_])\b", r"++\1", l)

        # 6. Common code constructs
        l = re.sub(r"\bfor\s+-\s+in\b", "for _ in", l)
        l = re.sub(r"=\s*([\|\{][\)\}\]]|\(\s*\))(?=\s*(?:#|//|$))", "= {}", l)

        # 7. Array indexing and bracket confusions:
        # e.g. dpl-1] -> dp[-1], gridl0] -> grid[0]
        l = re.sub(r"([a-zA-Z0-9_\]])([lI\|])(-?\d+|[a-zA-Z_][a-zA-Z0-9_]*)\]", r"\1[\3]", l)
        # e.g. dp[-11[-1] -> dp[-1][-1]
        l = re.sub(r"\[([^\]\n]+?)[1lI\|](?=\s*\[)", r"[\1]", l)
        # e.g. dp[-1l -> dp[-1] at end of statement
        l = re.sub(r"\[([^\]\n]+)[lI\|1](?=\s*[\),;:]|\s*$)", r"[\1]", l)
        # e.g. nums[il] -> nums[i]]
        l = re.sub(r"\[([a-zA-Z0-9_]+)l\]", r"[\1]]", l)

        # 8. Generic typing repairs: e.g. Listlint -> List[int], Listlstr -> List[str]
        l = re.sub(r"\b(List|Dict|Set|Vector|Tuple|Array|Optional|Union)l(int|str|float|bool|char|double|long)\b", r"\1[\2]", l)
        l = re.sub(r"\b(List|Dict|Set|Vector|Tuple|Array|Optional|Union)l([a-zA-Z0-9_,\s]+)\]", r"\1[\2]", l)

        # 9. Balance unclosed square brackets on line
        opens_sq = l.count("[")
        closes_sq = l.count("]")
        if opens_sq > closes_sq:
            # Trailing token was confused with l or I or 1 or |
            l = re.sub(r",\s*([a-zA-Z0-9_]+)[lI\|1]\s*$", r", \1]", l)
            if l.count("[") > l.count("]"):
                l = re.sub(r"([a-zA-Z0-9_]+)[lI\|1]\s*$", r"\1]", l)
            if l.count("[") > l.count("]"):
                l = re.sub(r"[lI\|1]\s*$", r"]", l)

        if l.count("{") > l.count("}"):
            l = re.sub(r"[lI\|1]\s*$", r"}", l)

        # 10. Space cleanups
        l = re.sub(r"\s+:", ":", l)
        l = re.sub(r"\s+,", ",", l)
        l = re.sub(r"\b(?!return\b|yield\b|case\b|in\b)([a-zA-Z0-9_]+)\s+\[", r"\1[", l)
        l = re.sub(r"\b(len|range|enumerate|print|min|max|sum|sorted|int|str|float|list|dict|set|sizeof|push_back|append)\s+\(", r"\1(", l)
        l = re.sub(r"\breturn\s*\[", "return [", l)
        l = re.sub(r"\breturn\s*\{", "return {", l)

        cleaned_lines.append(l)

    return "\n".join(cleaned_lines)


def preprocess_image_for_ocr(img_pil):
    """Preprocesses images for maximum OCR recognition accuracy:
    - Normalizes EXIF camera rotation
    - Preserves full color dynamic range and contrast
    - Upscales small images to optimal high-DPI resolution
    """
    from PIL import Image, ImageOps

    img = ImageOps.exif_transpose(img_pil)
    img = img.convert("RGB")
    w, h = img.size
    if w < 1400:
        scale = 1800.0 / max(w, 1)
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return img


def perform_ocr(image_bytes: bytes) -> str:
    """High-accuracy native Neural OCR engine.
    Uses Apple Vision on macOS (hardware-accelerated Neural OCR with candidate consensus)
    and Windows Media OCR / Tesseract / EasyOCR on Windows.
    Automatically handles EXIF camera orientation, code syntax, brackets, and math notation.
    """
    if not image_bytes:
        return ""

    from PIL import Image, ImageOps
    import io

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = ImageOps.exif_transpose(img)
        img = img.convert('RGB')
    except Exception as e:
        print(f"[ocr] Image parsing error: {e}")
        return ""

    # 1. On macOS: Native Apple Vision Framework with candidate consensus
    if IS_MAC:
        try:
            text = _apple_vision_ocr(img)
            if text and text.strip():
                return text.strip()
        except Exception as e:
            print(f"[ocr] Apple Vision OCR failed: {e}")

    # 2. On Windows: Windows Media OCR / pytesseract / easyocr
    if IS_WINDOWS:
        try:
            text = _windows_ocr(img)
            if text and text.strip():
                return text.strip()
        except Exception as e:
            print(f"[ocr] Windows OCR failed: {e}")

    # 3. Universal fallback: pytesseract if installed
    try:
        import pytesseract
        prep = preprocess_image_for_ocr(img)
        text = pytesseract.image_to_string(prep)
        if text and text.strip():
            return clean_ocr_text(text.strip())
    except Exception:
        pass

    return ""


def _apple_vision_ocr(img) -> str:
    """Apple Vision Neural OCR with language correction, candidate consensus,
    row grouping, and code syntax preservation."""
    import io
    import Vision
    import Foundation
    import Quartz
    from PIL import Image, ImageOps

    prep_img = preprocess_image_for_ocr(img)
    img_w, img_h = prep_img.size

    def _execute_vision_request(pil_image, use_lang_correction=True):
        buf = io.BytesIO()
        pil_image.save(buf, format='PNG')
        png_bytes = buf.getvalue()

        ns_data = Foundation.NSData.dataWithBytes_length_(png_bytes, len(png_bytes))
        ci_image = Quartz.CIImage.imageWithData_(ns_data)
        if ci_image is None:
            return []

        handler = Vision.VNImageRequestHandler.alloc().initWithCIImage_options_(ci_image, None)
        req = Vision.VNRecognizeTextRequest.alloc().init()
        req.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
        req.setUsesLanguageCorrection_(use_lang_correction)
        req.setAutomaticallyDetectsLanguage_(True)
        req.setRecognitionLanguages_(["en-US"])
        custom_words = [
            'def', 'class', 'return', 'function', 'const', 'let', 'var', 'int', 'str', 'bool', 'float', 'void',
            'public', 'private', 'static', 'vector', 'unordered_map', 'List', 'Dict', 'Set', 'Tuple', 'None',
            'True', 'False', 'enumerate', 'range', 'len', 'nullptr', 'null', 'undefined', 'cout', 'cin',
            'println', 'printf', 'scanf', 'O(1)', 'O(N)', 'O(log N)', 'O(N log N)', 'O(N^2)', 'O(2^N)', 'O(N!)'
        ]
        req.setCustomWords_(custom_words)

        success, error = handler.performRequests_error_([req], None)
        if not success:
            return []
        return req.results() or []

    # Pass 1: Direct RGB with language correction and programming vocabulary
    results = _execute_vision_request(prep_img, use_lang_correction=True)

    # Pass 2: If no results, retry with language correction disabled
    if not results:
        results = _execute_vision_request(prep_img, use_lang_correction=False)

    # Pass 3: Inverted fallback if dark background
    if not results:
        inv = ImageOps.invert(prep_img.convert('RGB'))
        results = _execute_vision_request(inv, use_lang_correction=True)

    if not results:
        return ""

    # Extract bounding boxes and pick best candidate
    obs_list = []
    char_widths = []

    for obs in results:
        bbox = obs.boundingBox()
        top_y = (1.0 - (bbox.origin.y + bbox.size.height)) * img_h
        bot_y = (1.0 - bbox.origin.y) * img_h
        px_x = bbox.origin.x * img_w
        px_w = bbox.size.width * img_w
        px_h = bbox.size.height * img_h

        candidates = [c.string() for c in obs.topCandidates_(5)]
        best_text = candidates[0] if candidates else ""

        # Prefer candidate with code syntax if top candidate flattened brackets
        for c_str in candidates[1:]:
            if ("[" in c_str and "[" not in best_text) or ("{" in c_str and "{" not in best_text):
                best_text = c_str
                break

        if len(best_text) > 4:
            char_widths.append(px_w / len(best_text))

        obs_list.append({
            "text": best_text,
            "top_y": top_y,
            "bot_y": bot_y,
            "left_x": px_x,
            "right_x": px_x + px_w,
            "height": px_h,
        })

    avg_char_w = sum(char_widths) / len(char_widths) if char_widths else 12.0
    min_x = min(o["left_x"] for o in obs_list) if obs_list else 0.0

    # Group observations that share the same horizontal baseline
    obs_list.sort(key=lambda o: o["top_y"])
    rows = []
    for obs in obs_list:
        matched = False
        for r in rows:
            r_mid = (r[0]["top_y"] + r[0]["bot_y"]) / 2.0
            o_mid = (obs["top_y"] + obs["bot_y"]) / 2.0
            if abs(r_mid - o_mid) < min(r[0]["height"], obs["height"]) * 0.4:
                r.append(obs)
                matched = True
                break
        if not matched:
            rows.append([obs])

    output_lines = []
    for r in rows:
        r.sort(key=lambda o: o["left_x"])
        line_parts = []
        prev_right = None
        for tok in r:
            if prev_right is not None:
                gap = tok["left_x"] - prev_right
                if gap > (avg_char_w * 4.0):
                    line_parts.append("    " + tok["text"])
                else:
                    line_parts.append(" " + tok["text"])
            else:
                diff = max(0.0, tok["left_x"] - min_x)
                num_spaces = int(round(diff / avg_char_w)) if diff > (avg_char_w * 0.7) else 0
                num_spaces = min(num_spaces, 16)
                if num_spaces > 0:
                    rem = num_spaces % 4
                    if rem == 1:
                        num_spaces -= 1
                    elif rem == 3:
                        num_spaces += 1
                line_parts.append((" " * num_spaces) + tok["text"])
            prev_right = tok["right_x"]
        output_lines.append("".join(line_parts))

    raw_extracted = "\n".join(output_lines)
    return clean_ocr_text(raw_extracted)


def _windows_ocr(img) -> str:
    """High-accuracy Windows OCR with image preprocessing and syntax post-processing."""
    prep_img = preprocess_image_for_ocr(img)

    # Try Windows Media OCR (built-in Windows 10/11 OCR API)
    try:
        import winocr
        import asyncio
        result = asyncio.run(winocr.recognize_pil(prep_img, lang="en"))
        if result and result.get("text"):
            return clean_ocr_text(result["text"])
    except Exception:
        pass

    # Try pytesseract
    try:
        import pytesseract
        text = pytesseract.image_to_string(prep_img, config="--psm 3")
        if text and text.strip():
            return clean_ocr_text(text.strip())
    except Exception:
        pass

    # Try easyocr
    try:
        import easyocr
        import numpy as np
        reader = easyocr.Reader(['en'], gpu=False)
        results = reader.readtext(np.array(prep_img), detail=0)
        text = "\n".join(results).strip()
        if text:
            return clean_ocr_text(text)
    except Exception:
        pass

    return ""


@app.post("/api/ocr")
async def api_ocr(request: Request):
    """High-accuracy OCR endpoint for mobile snapshots and uploaded images."""
    try:
        content_type = request.headers.get("content-type", "")
        image_bytes = None

        if "multipart/form-data" in content_type:
            form = await request.form()
            file_field = form.get("file") or form.get("image") or form.get("photo") or form.get("screenshot")
            if file_field and hasattr(file_field, "read"):
                image_bytes = await file_field.read()
        else:
            # Try JSON body with base64 data
            try:
                body = await request.json()
                raw_b64 = body.get("image") or body.get("data") or ""
                if raw_b64:
                    import base64
                    if "," in raw_b64:
                        raw_b64 = raw_b64.split(",", 1)[1]
                    image_bytes = base64.b64decode(raw_b64)
            except Exception:
                pass

        if not image_bytes:
            # Try raw request body
            body_raw = await request.body()
            if body_raw and len(body_raw) > 100:
                image_bytes = body_raw

        if not image_bytes:
            return JSONResponse(status_code=400, content={"status": "error", "message": "No image data received"})

        import asyncio
        text = await asyncio.to_thread(perform_ocr, image_bytes)

        return {"status": "success", "text": text}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


@app.get("/api/device/ocr")
@app.post("/api/device/ocr")
async def api_device_ocr():
    """Runs native OCR directly on the latest captured laptop screen image."""
    global _latest_screen_jpeg
    if not _latest_screen_jpeg:
        img = capture_screen_image()
        if img:
            import io
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            _latest_screen_jpeg = buf.getvalue()

    if not _latest_screen_jpeg:
        return JSONResponse(status_code=404, content={"status": "error", "message": "No screen capture available"})

    import asyncio
    text = await asyncio.to_thread(perform_ocr, _latest_screen_jpeg)
    return {"status": "success", "text": text}


@app.get("/poll_paste")
@app.get("/api/v1/paste/poll")
async def poll_paste(last_id: int = 0):
    """Long-polling endpoint used by the mobile UI."""
    for _ in range(60):
        if pending_paste["id"] > last_id:
            return {
                "status": "success",
                "text": pending_paste["text"],
                "mode": pending_paste.get("mode", ""),
                "id": pending_paste["id"],
            }
        await asyncio.sleep(0.5)
    return {"status": "timeout"}


# State to track last synced text for live typing
last_synced_text = ""


def safe_release():
    """Helper to release any stuck modifier keys globally."""
    try:
        import pyautogui
        for mod in ('command', 'shift', 'ctrl', 'option', 'alt'):
            try:
                pyautogui.keyUp(mod)
            except Exception:
                pass
    except Exception:
        pass


@app.get("/stop")
@app.post("/stop")
@app.get("/api/v1/stop")
@app.post("/api/v1/stop")
async def stop():
    global stop_typing, is_currently_typing
    stop_typing = True
    is_currently_typing = False
    safe_release()
    print("!!! PANIC STOP SIGNAL RECEIVED - TYPING ABORTED !!!")
    return {"status": "success", "message": "Typing aborted"}

@app.get("/typing_status")
@app.get("/api/v1/status")
async def typing_status():
    global is_currently_typing
    return {"is_typing": is_currently_typing, "status": "online"}


# ── Exam Mode Advanced Stealth Endpoints ─────────────────────────────────────

def get_env_secret(secret_name, alt_names=None):
    """Retrieve secret from environment or project .env files."""
    keys_to_check = [secret_name] + (alt_names or [])
    for k in keys_to_check:
        val = os.environ.get(k)
        if val:
            return val.strip().strip('"').strip("'")

    candidates = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), "website-v2", ".env.local"),
        os.path.join(os.path.dirname(__file__), "website-v2", ".env.production.local"),
        os.path.join(os.path.dirname(__file__), "website-v2", ".env.development.local"),
        os.path.join(os.path.expanduser("~"), ".lanpad", ".env"),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        for k in keys_to_check:
                            if line.startswith(f"{k}="):
                                val = line.split("=", 1)[1].strip().strip('"').strip("'")
                                if val:
                                    return val
            except Exception:
                pass
    return None


def get_gemini_api_key():
    """Retrieve Google Gemini API key from environment or project .env files."""
    return get_env_secret("GEMINI_API_KEY", alt_names=["GOOGLE_API_KEY", "GOOGLE_GEMINI_API_KEY"])


def get_groq_api_key():
    """Retrieve Groq API key from environment or project .env files."""
    return get_env_secret("GROQ_API_KEY")


@app.post("/api/exam/ai_solve")
async def exam_ai_solve(request: Request):
    """
    Universal Exam AI Solver:
    Receives extracted problem text and returns optimal, clean answers ready for keystroke injection/dispatch.
    Intelligently handles:
      - Coding questions in any selected language (Python, Java, C++, SQL, JS/TS, etc.)
      - Multiple-choice questions (MCQs) with winning option on line 1 + concise derivation
      - Quantitative aptitude, math, and logic puzzles
      - Technical theory and conceptual short/long-answer questions
    Supports Google Gemini, Groq (Qwen 3.8 / GPT-OSS 120B / LLaMA 3.3), and OpenAI with automatic fallback.
    """
    import re, ssl, certifi, urllib.request, json
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"status": "error", "message": "Invalid JSON"}, status_code=400)

    question_text = data.get("question_text", "").strip()
    raw_language = data.get("language", "auto").strip().lower()
    custom_instructions = data.get("custom_instructions", "").strip()
    
    gemini_key = data.get("gemini_api_key", "").strip() or get_gemini_api_key()
    groq_key = data.get("api_key", "").strip() or get_groq_api_key()
    openai_key = get_env_secret("OPENAI_API_KEY")

    if not question_text:
        return JSONResponse({"status": "error", "message": "No question text provided"}, status_code=400)

    if not gemini_key and not groq_key and not openai_key:
        return JSONResponse({
            "status": "error", 
            "message": "Neither GEMINI_API_KEY, GROQ_API_KEY, nor OPENAI_API_KEY is configured. Please set your API key in the .env file."
        }, status_code=400)

    # ── Detect Problem Type & Craft Tailored Direct-Dispatch System Prompt ──
    is_mcq_requested = raw_language in ["mcq", "aptitude", "quiz", "options"]
    is_theory_requested = raw_language in ["theory", "text", "essay", "short_answer", "concept"]
    is_sql_requested = raw_language in ["sql"]
    
    # Check for MCQ indicators in question text if auto-detect
    has_mcq_markers = bool(re.search(r'(?:[A-Da-d]\s*[\)\.\:]|Option\s+[A-Da-d]|Choose\s+the\s+correct|Which\s+of\s+the\s+following)', question_text))
    
    mode = "coding"
    display_lang = raw_language.upper()

    if is_mcq_requested or (raw_language in ["auto", ""] and has_mcq_markers):
        mode = "mcq"
        system_prompt = (
            "You are an expert exam solver tackling multiple-choice, quantitative aptitude, and competitive exam questions.\n"
            "MANDATORY FORMAT RULES FOR DIRECT DISPATCH:\n"
            "1. Line 1 MUST state the exact winning option letter and full text clearly (e.g. 'Correct Option: B) <option text>').\n"
            "2. Follow immediately with a concise, crystal-clear 2-4 line explanation or step-by-step derivation.\n"
            "3. Absolutely NO conversational greetings, pleasantries, or introductory fluff ('Sure, here is the answer:').\n"
            "4. If multiple options are valid, list all correct options on line 1.\n"
            "5. Ready for direct keystroke typing or immediate review."
        )
    elif is_theory_requested:
        mode = "theory"
        system_prompt = (
            "You are an expert academic and technical exam solver.\n"
            "MANDATORY FORMAT RULES FOR DIRECT DISPATCH:\n"
            "1. Provide a direct, authoritative, high-scoring technical answer.\n"
            "2. Structure with concise bullet points or clean paragraphs ready to be pasted or typed into the answer box.\n"
            "3. Absolutely NO conversational filler, greetings, or meta-commentary.\n"
            "4. Thoroughly address all key concepts, definitions, and requirements mentioned in the question."
        )
    elif is_sql_requested:
        mode = "sql"
        system_prompt = (
            "You are a database architect and SQL optimization specialist.\n"
            "Target Dialect: Standard ANSI SQL (MySQL/PostgreSQL compliant)\n\n"
            "MANDATORY FORMAT RULES FOR DIRECT DISPATCH:\n"
            "1. Output ONLY pure, valid, optimal SQL code. Absolutely NO markdown code fences (no ```sql, no ```).\n"
            "2. Absolutely NO conversational prose, greetings, explanations, or text before/after.\n"
            "3. Ensure correct syntax, proper table aliases, WHERE/JOIN clauses, and GROUP BY/ORDER BY requirements.\n"
            "4. Ready for direct injection into a SQL console or LeetCode/HackerRank SQL editor."
        )
    else:
        # Coding language (Python, Java, C++, JS/TS, or auto fallback)
        target_coding_lang = "python"
        if raw_language in ["java", "cpp", "c++", "c", "javascript", "js", "typescript", "ts", "sql", "go", "rust", "csharp", "cs"]:
            target_coding_lang = raw_language
        display_lang = target_coding_lang.upper()

        system_prompt = (
            f"You are a world-class staff software engineer and competitive programmer solving a timed coding exam.\n"
            f"Target Language: {display_lang}\n\n"
            f"MANDATORY FORMAT RULES FOR DIRECT DISPATCH:\n"
            f"1. Output ONLY pure, runnable code. Absolutely NO markdown fences (no ```, no ```{target_coding_lang}).\n"
            f"2. Absolutely NO conversational prose, greetings, explanations, complexity notes, or text before/after.\n"
            f"3. Solution must be 100% complete, fully compilable, optimal time and space complexity ($O(N)$ or best possible).\n"
            f"4. Include all necessary imports, standard boilerplate, complete class/method signatures, and robust edge-case handling.\n"
            f"5. Add short, natural inline comments on subtle lines so the code looks authentically hand-written."
        )

    user_prompt = f"Exam Problem Description:\n{question_text}"
    if custom_instructions:
        user_prompt += f"\n\nAdditional Requirements:\n{custom_instructions}"

    try:
        ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    except Exception:
        ssl_ctx = ssl._create_unverified_context()

    # Browser User-Agent to ensure Cloudflare/WAF never blocks API calls
    browser_headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    def clean_output(content: str) -> str:
        """Strips accidental markdown code fences or greeting headers from model output."""
        c = content.strip()
        if c.startswith("```"):
            lines = c.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            c = "\n".join(lines).strip()
        c = re.sub(r'^(?:Here (?:is|are) (?:the )?(?:solution|code|answer|queries)?:?|Certainly!?:?|Sure!?:?)\s*\n+', '', c, flags=re.IGNORECASE)
        return c.strip()

    last_err = None

    # ── 1. Google Gemini First (if GEMINI_API_KEY is available) ──────────────
    if gemini_key:
        gemini_models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
        for g_model in gemini_models:
            try:
                g_url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_key}"
                g_payload = {
                    "contents": [{
                        "parts": [
                            {"text": f"{system_prompt}\n\n{user_prompt}"}
                        ]
                    }],
                    "generationConfig": {
                        "temperature": 0.15,
                        "maxOutputTokens": 4096
                    }
                }
                req = urllib.request.Request(
                    g_url,
                    data=json.dumps(g_payload).encode("utf-8"),
                    headers=browser_headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, context=ssl_ctx, timeout=22) as resp:
                    res_data = json.loads(resp.read().decode("utf-8"))
                    candidates = res_data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            content = clean_output(parts[0]["text"])
                            return {
                                "status": "success", 
                                "solution": content, 
                                "language": raw_language,
                                "mode": mode,
                                "model": g_model,
                                "provider": "gemini"
                            }
            except Exception as ge:
                last_err = ge
                print(f"[exam_ai] Gemini model {g_model} failed: {ge}, trying next...")
                continue

    # ── 2. Groq Fallback (High-Speed Qwen 3.8 / GPT-OSS 120B / LLaMA 3.3) ─────
    if groq_key:
        models_to_try = [
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-120b",
            "qwen/qwen3.6-27b",
            "openai/gpt-oss-20b",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant"
        ]
        for model_name in models_to_try:
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.12,
                "max_tokens": 4096
            }

            try:
                groq_headers = dict(browser_headers)
                groq_headers["Authorization"] = f"Bearer {groq_key}"
                req = urllib.request.Request(
                    "https://api.groq.com/openai/v1/chat/completions",
                    data=json.dumps(payload).encode("utf-8"),
                    headers=groq_headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, context=ssl_ctx, timeout=20) as resp:
                    res_data = json.loads(resp.read().decode("utf-8"))
                    content = clean_output(res_data["choices"][0]["message"]["content"])
                    return {
                        "status": "success", 
                        "solution": content, 
                        "language": raw_language,
                        "mode": mode,
                        "model": model_name,
                        "provider": "groq"
                    }
            except Exception as e:
                last_err = e
                print(f"[exam_ai] Groq model {model_name} failed: {e}, trying next...")
                continue

    # ── 3. OpenAI Fallback (if OPENAI_API_KEY is available) ────────────────────
    if openai_key:
        for o_model in ["gpt-4o-mini", "gpt-4o"]:
            try:
                o_headers = dict(browser_headers)
                o_headers["Authorization"] = f"Bearer {openai_key}"
                o_payload = {
                    "model": o_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.15,
                    "max_tokens": 4096
                }
                req = urllib.request.Request(
                    "https://api.openai.com/v1/chat/completions",
                    data=json.dumps(o_payload).encode("utf-8"),
                    headers=o_headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, context=ssl_ctx, timeout=20) as resp:
                    res_data = json.loads(resp.read().decode("utf-8"))
                    content = clean_output(res_data["choices"][0]["message"]["content"])
                    return {
                        "status": "success", 
                        "solution": content, 
                        "language": raw_language,
                        "mode": mode,
                        "model": o_model,
                        "provider": "openai"
                    }
            except Exception as oe:
                last_err = oe
                print(f"[exam_ai] OpenAI model {o_model} failed: {oe}, trying next...")
                continue

    print(f"[exam_ai] All AI models failed. Last error: {last_err}")
    return JSONResponse({"status": "error", "message": f"AI Generation failed: {str(last_err)}"}, status_code=500)


@app.post("/api/exam/send_key")
async def exam_send_key(request: Request):
    """
    Remote IDE Control:
    Dispatches native key shortcuts (Run, Clear, Tab, Arrows, Save) without touching laptop trackpad.
    """
    try:
        data = await request.json()
        action = data.get("action", "")
    except Exception:
        return JSONResponse({"status": "error", "message": "Invalid request"}, status_code=400)

    try:
        import pyautogui
        import time
        pyautogui.FAILSAFE = False
        pyautogui.PAUSE = 0.02
        mod_key = 'command' if IS_MAC else 'ctrl'

        if action == "run":
            # Cmd+Enter or Ctrl+Enter (Standard run shortcut in LeetCode, HackerRank, Codility, IDEs)
            pyautogui.hotkey(mod_key, 'enter')
        elif action == "clear_all":
            # Select all and delete starter boilerplate
            pyautogui.hotkey(mod_key, 'a')
            time.sleep(0.04)
            pyautogui.press('backspace')
        elif action == "tab":
            pyautogui.press('tab')
        elif action == "save":
            pyautogui.hotkey(mod_key, 's')
        elif action == "undo":
            pyautogui.hotkey(mod_key, 'z')
        elif action == "arrow_up":
            pyautogui.press('up')
        elif action == "arrow_down":
            pyautogui.press('down')
        elif action == "arrow_left":
            pyautogui.press('left')
        elif action == "arrow_right":
            pyautogui.press('right')
        elif action == "enter":
            pyautogui.press('enter')
        elif action == "backspace":
            pyautogui.press('backspace')
        elif action in ["option_a", "option_b", "option_c", "option_d"]:
            opt = action.replace("option_", "").lower()
            pyautogui.press(opt)
        elif action.lower() in ["a", "b", "c", "d", "1", "2", "3", "4"]:
            pyautogui.press(action.lower())
        else:
            return JSONResponse({"status": "error", "message": f"Unknown action: {action}"}, status_code=400)

        safe_release()
        return {"status": "success", "action": action}
    except Exception as e:
        safe_release()
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


@app.post("/api/exam/emergency_hide")
@app.get("/api/exam/emergency_hide")
async def exam_emergency_hide():
    """
    Physical Walk-by Ghost Screen:
    Aborts active typing, releases modifier keys, and instantly hides/minimizes the active laptop window.
    """
    global stop_typing, is_currently_typing
    stop_typing = True
    is_currently_typing = False
    safe_release()

    try:
        import subprocess
        if IS_MAC:
            # Hide the frontmost application process immediately on macOS
            hide_cmd = """osascript -e 'tell application "System Events" to set visible of first application process whose frontmost is true to false'"""
            subprocess.Popen(hide_cmd, shell=True)
        elif sys.platform == "win32":
            # Windows: Win+D to show desktop
            import pyautogui
            pyautogui.hotkey('win', 'd')
            safe_release()
        print("[emergency] Ghost Desktop triggered - Active window hidden & typing aborted.")
        return {"status": "success", "message": "Active window hidden"}
    except Exception as e:
        print(f"[emergency] Error hiding window: {e}")
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


# ── Typing engine ─────────────────────────────────────────────────────────────

def perform_typing(text, wpm, is_coding=False, language="", jitter=False, thinking_pauses=False, typo_sim=False):
    global stop_typing, is_currently_typing
    is_currently_typing = True

    try:
        import pyautogui  # Lazy import – backend may run headless
        import random
        pyautogui.FAILSAFE = False  # Prevent FailSafeException when mouse hits screen corner
        pyautogui.PAUSE = 0
    except Exception as e:
        print(f"[typing] pyautogui not available: {e}")
        is_currently_typing = False
        return

    # Adjacent QWERTY keys for human typo simulation
    adjacent_keys = {
        'a': 'qwsz', 'b': 'vghn', 'c': 'xdfv', 'd': 'ersfxc', 'e': 'wsdr',
        'f': 'rtgvcd', 'g': 'tyhbvf', 'h': 'yujnbg', 'i': 'ujko', 'j': 'uikmnh',
        'k': 'ijlm', 'l': 'okp', 'm': 'njk', 'n': 'bhjm', 'o': 'iklp',
        'p': 'ol', 'q': 'wa', 'r': 'edft', 's': 'wedxza', 't': 'rfgy',
        'u': 'yhji', 'v': 'cfgb', 'w': 'qase', 'x': 'zsdc', 'y': 'tghu', 'z': 'asx'
    }

    def write_char_native(char):
        """Type a single Unicode character using Quartz CGEventCreateKeyboardEvent."""
        if IS_MAC:
            try:
                import Quartz
                tap = Quartz.kCGHIDEventTap
                event_down = Quartz.CGEventCreateKeyboardEvent(None, 0, True)
                Quartz.CGEventKeyboardSetUnicodeString(event_down, len(char), char)
                Quartz.CGEventPost(tap, event_down)
                # Realistic human physical key dwell time: 35ms - 65ms (Chrome keystroke biometric safe)
                time.sleep(random.uniform(0.035, 0.065))
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
                # Realistic human physical key dwell time: 38ms - 72ms
                time.sleep(random.uniform(0.038, 0.072))
                event_up = Quartz.CGEventCreateKeyboardEvent(None, keycode, False)
                Quartz.CGEventPost(tap, event_up)
                return True
            except Exception as e:
                print(f"[typing] Native Quartz key press failed: {e}")
        return False

    def clear_line_indentation_native():
        """Cleanly reset line indentation to column 0 without Shift+Tab spam or clipboard contamination."""
        if IS_MAC:
            try:
                import Quartz
                tap = Quartz.kCGHIDEventTap
                # Cmd + Backspace deletes from cursor to beginning of line in macOS/Chrome
                cmd_down = Quartz.CGEventCreateKeyboardEvent(None, 55, True)
                Quartz.CGEventPost(tap, cmd_down)
                time.sleep(random.uniform(0.015, 0.025))
                del_down = Quartz.CGEventCreateKeyboardEvent(None, 51, True)
                Quartz.CGEventPost(tap, del_down)
                time.sleep(random.uniform(0.035, 0.055))
                del_up = Quartz.CGEventCreateKeyboardEvent(None, 51, False)
                Quartz.CGEventPost(tap, del_up)
                time.sleep(random.uniform(0.015, 0.025))
                cmd_up = Quartz.CGEventCreateKeyboardEvent(None, 55, False)
                Quartz.CGEventPost(tap, cmd_up)
                return True
            except Exception as e:
                print(f"[typing] Native line reset failed: {e}")
                pyautogui.hotkey('command', 'backspace')
                return True
        else:
            try:
                pyautogui.hotkey('shift', 'home')
                time.sleep(0.02)
                pyautogui.press('backspace')
                return True
            except Exception:
                pass
        return False

    def press_return_native():
        """Native hardware Return with realistic human dwell. 100% PROCTOR-SAFE (zero paste events)."""
        if IS_MAC:
            if not press_key_native(36):  # Keycode 36 = Return
                pyautogui.press('enter')
        else:
            pyautogui.press('enter')

    def emit_char(char):
        """Emits a character, with optional simulated human typo + self correction."""
        if typo_sim and char.lower() in adjacent_keys and random.random() < 0.015:
            wrong_char = random.choice(adjacent_keys[char.lower()])
            if char.isupper():
                wrong_char = wrong_char.upper()
            write_char_native(wrong_char)
            time.sleep(random.uniform(0.14, 0.24))
            if IS_MAC:
                if not press_key_native(51):
                    pyautogui.press('backspace')
            else:
                pyautogui.press('backspace')
            time.sleep(random.uniform(0.08, 0.16))
        write_char_native(char)

    def interruptible_sleep(seconds):
        if seconds <= 0:
            return False
        end_time = time.time() + seconds
        while time.time() < end_time:
            if stop_typing:
                safe_release()
                return True
            time.sleep(min(0.015, max(0.001, end_time - time.time())))
        return False

    def get_char_delay(char, elapsed):
        if jitter:
            # Human motor delays: symbols require reaches/shift, spaces vary, digraphs are fast
            if char in "{}[]():;=><!&|+-*/%#@$\"\'":
                factor = random.uniform(1.35, 2.10)
            elif char in " \t":
                factor = random.uniform(0.85, 1.40)
            elif char.isupper():
                factor = random.uniform(1.15, 1.65)
            else:
                # Common lowercase typing has natural Gaussian jitter
                factor = random.gauss(1.0, 0.22)
                factor = max(0.65, min(1.55, factor))
            target = typing_interval * factor
        else:
            target = typing_interval
        return max(0.005, target - elapsed)

    def do_thinking_pause(line_content):
        if thinking_pauses and not stop_typing:
            s = line_content.strip()
            if s.endswith(':') or s.endswith(';') or s.endswith('{') or s.endswith('}') or s.startswith('#') or s.startswith('//'):
                return interruptible_sleep(random.uniform(0.8, 1.8))
        return False

    # Release any potentially stuck keys once before starting
    safe_release()
    interruptible_sleep(0.05)

    cpm = max(wpm, 1) * 5
    typing_interval = 60.0 / cpm

    # Normalize all line endings first
    normalized_text = text.replace('\r\n', '\n').replace('\r', '\n')
    lines = normalized_text.split('\n')

    try:
        # Check if the code content looks like Python
        is_python = False
        if is_coding:
            if language.lower() == "python":
                is_python = True
            else:
                lower_text = text.lower()
                python_indicators = [
                    "def ", "elif ", "lambda ", "list(map(", "int(input(", "list(int(", 
                    "sys.argv", "if __name__ == ", "__init__", "self.", 
                    "is None", "= None", "None,", "None)", "isinstance(", 
                    "nonlocal ", "enumerate(", "zip("
                ]
                if any(ind in text for ind in python_indicators):
                    is_python = True
                else:
                    for line in normalized_text.split('\n'):
                        stripped = line.strip()
                        if stripped.startswith('#'):
                            is_python = True
                            break
                        if stripped.endswith(':'):
                            if any(stripped.startswith(k) for k in ["if ", "elif ", "else", "for ", "while ", "def ", "class ", "with ", "try", "except", "finally"]):
                                is_python = True
                                break
        print(f"[typing] is_coding={is_coding}, is_python={is_python}, jitter={jitter}, pauses={thinking_pauses}, typos={typo_sim}")
        for i, line in enumerate(lines):
            if stop_typing:
                break

            # Process line content
            if not stop_typing:
                if is_coding and is_python:
                    # If i > 0, we just transitioned to a new line. Reset indentation to column 0 cleanly.
                    if i > 0:
                        clear_line_indentation_native()
                        if interruptible_sleep(random.uniform(0.025, 0.045)):
                            break

                    # Type the line character-by-character (preserving exact leading whitespace)
                    for char in line:
                        if stop_typing:
                            break
                        char_start = time.time()

                        if char == '\t':
                            if not press_key_native(48):
                                pyautogui.press('tab')
                        else:
                            emit_char(char)

                        if stop_typing:
                            break

                        elapsed = time.time() - char_start
                        if interruptible_sleep(get_char_delay(char, elapsed)):
                            break

                    if stop_typing or do_thinking_pause(line):
                        break

                    # If this is not the last line, emit a native return key event
                    # 100% PROCTOR-PROOF: ZERO clipboard use, ZERO paste events, isTrusted=True
                    if i < len(lines) - 1:
                        if stop_typing:
                            break
                        press_return_native()
                        if interruptible_sleep(random.uniform(0.04, 0.08)):
                            break
                else:
                    if i > 0:
                        if stop_typing:
                            break
                        press_return_native()
                        if interruptible_sleep(random.uniform(0.04, 0.08)):
                            break

                    line_to_type = line
                    if is_coding:
                        # Non-python languages: Strip leading whitespace and let the IDE handle auto-indentation.
                        line_to_type = line.lstrip(' \t')

                    for char in line_to_type:
                        if stop_typing:
                            break
                        char_start = time.time()

                        if char == '\t':
                            if not press_key_native(48):
                                pyautogui.press('tab')
                        else:
                            emit_char(char)

                        if stop_typing:
                            break

                        elapsed = time.time() - char_start
                        if interruptible_sleep(get_char_delay(char, elapsed)):
                            break

                    if stop_typing or do_thinking_pause(line):
                        break

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
    except Exception as e:
        print(f"[typing] Exception in perform_typing: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Failsafe: release modifiers ONCE at the very end only
        is_currently_typing = False
        safe_release()
        print("Typing task finished/stopped")


# ── WebSocket (PRD) ───────────────────────────────────────────────────────────

@app.websocket("/ws/connect")
async def websocket_endpoint(websocket: WebSocket, client: str = None):
    client_ip = websocket.client[0] if websocket.client else "unknown"
    now = time.time()
    if client_ip in _ws_connect_attempts:
        recent = [t for t in _ws_connect_attempts[client_ip] if now - t < 60]
        if len(recent) >= 10:
            await websocket.accept()
            await websocket.send_text(json.dumps({"error": "Rate limited"}))
            await websocket.close(code=1008)
            return
        _ws_connect_attempts[client_ip] = recent + [now]
    else:
        _ws_connect_attempts[client_ip] = [now]

    tier = get_license_tier()
    limits = get_cloud_limits(tier)
    max_sessions = limits.get("max_sessions", 999)
    
    # Only enforce a hard cap if the cloud has set an explicit commercial restriction
    if max_sessions < 50 and len(active_connections) >= max_sessions:
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
        
    if client != "desktop":
        active_devices[websocket] = dev
    
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket data if needed
    except WebSocketDisconnect:
        try:
            if websocket in active_connections:
                active_connections.remove(websocket)
        except ValueError:
            pass
        try:
            active_devices.pop(websocket, None)
        except Exception:
            pass


@app.get("/api/connections")
async def get_connections():
    # clean up stale registered clients (> 15 seconds)
    import time
    now = time.time()
    stale = [name for name, ts in _registered_clients.items() if now - ts > 15]
    for name in stale:
        _registered_clients.pop(name, None)
        
    devices = list(active_devices.values()) + list(_registered_clients.keys())
    # Deduplicate
    devices = list(set(devices))
    
    return {
        "count": len(active_devices) + len(_registered_clients),
        "devices": devices
    }


@app.post("/api/connections/disconnect")
async def disconnect_device(data: dict):
    target_name = data.get("device_name")
    if not target_name:
        return {"status": "error", "message": "device_name required"}
    
    _registered_clients.pop(target_name, None)
    
    to_disconnect = []
    for ws, name in list(active_devices.items()):
        if name == target_name:
            to_disconnect.append(ws)
            
    for ws in to_disconnect:
        try:
            await ws.close()
        except Exception:
            pass
        active_devices.pop(ws, None)
        if ws in active_connections:
            active_connections.remove(ws)
            
    return {"status": "success", "message": f"Disconnected {target_name}"}


# ── Cloud resource catalog proxy ──────────────────────────────────────────────
# The mobile resources.html page runs on the LOCAL server (localhost:8000).
# The actual hub/resource data lives on the Next.js server.
# Try localhost:3000 (dev) first, then fall back to lanpad.app (production).
# Both are tried because the Next.js API routes may not yet be deployed.

_API_BASES = ["http://127.0.0.1:3000", "https://lanpad.app"]

import time
import socket

_local_api_online = True
_local_api_last_checked = 0

def is_local_api_online():
    global _local_api_online, _local_api_last_checked
    now = time.time()
    if now - _local_api_last_checked < 15:
        return _local_api_online
    
    try:
        # Extremely lightweight and fast raw TCP socket check
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.15)
            # Try to connect to port 3000 directly. 0 means success.
            _local_api_online = (s.connect_ex(("127.0.0.1", 3000)) == 0)
    except Exception:
        _local_api_online = False
    
    _local_api_last_checked = now
    return _local_api_online


def _sync_proxy_get(url: str, params: dict):
    # Disable SSL verification to bypass local network issues
    r = requests.get(url, params=params, timeout=(0.5, 3.0), verify=False)
    if r.status_code == 200 and "application/json" in r.headers.get("content-type", "").lower():
        return r.json()
    raise Exception(f"Status {r.status_code}, Content-type {r.headers.get('content-type')}")

async def _proxy_get(path: str, params: dict):
    """Try each API base in order; return the first successful JSON response."""
    last_err = "No API base available"
    local_online = is_local_api_online()
    bases = _API_BASES if local_online else ["https://lanpad.app"]
    
    for base in bases:
        try:
            url = f"{base}{path}"
            result = await asyncio.to_thread(_sync_proxy_get, url, params)
            return result
            return result, None
        except Exception as e:
            last_err = str(e)
    return None, last_err


def _sync_proxy_post(url: str, body: dict):
    r = requests.post(url, json=body, headers={"Content-Type": "application/json"}, timeout=(0.5, 3.0), verify=False)
    if r.status_code == 200 and "application/json" in r.headers.get("content-type", "").lower():
        return r.json()
    raise Exception(f"Status {r.status_code}, Content-type {r.headers.get('content-type')}")

async def _proxy_post(path: str, body: dict):
    """Try each API base in order for POST requests."""
    last_err = "No API base available"
    local_online = is_local_api_online()
    bases = _API_BASES if local_online else ["https://lanpad.app"]
    
    for base in bases:
        try:
            url = f"{base}{path}"
            result = await asyncio.to_thread(_sync_proxy_post, url, body)
            return result
        except Exception as e:
            last_err = str(e)
    return None, last_err


@app.get("/api/hubs")
async def proxy_hubs(request: Request):
    """Proxy GET /api/hubs → Next.js API (dev:3000 → prod:lanpad.app)."""
    print("[PROXY] GET /api/hubs called")
    params = dict(request.query_params)
    result = await _proxy_get("/api/hubs", params)
    print(f"[PROXY] GET /api/hubs result: {type(result)}")
    
    # Check if result is a valid dict representing a successful Next.js response
    if isinstance(result, tuple):
        result_data = result[0]
    else:
        result_data = result

    if isinstance(result_data, dict) and result_data.get("success") == True:
        return result_data
    
    # High-quality fallback mock resources when Next.js is offline
    return {
        "success": True,
        "hubs": [
            {
                "id": "dev-essentials",
                "title": "Developer Essentials",
                "description": "Essential quick-start commands, configuration files, and code snippets.",
                "visibility": "public",
                "categories": [
                    {
                        "name": "Git & Version Control",
                        "topics": [
                            {
                                "name": "Basic Commands",
                                "snippets": [
                                    {"id": "git-1", "title": "Discard Local Changes", "content": "git reset --hard HEAD\ngit clean -fd", "type": "code", "language": "bash"},
                                    {"id": "git-2", "title": "Commit with Message", "content": "git commit -m \"feat: add connection auto-discovery\"", "type": "code", "language": "bash"}
                                ]
                            },
                            {
                                "name": "Branch Management",
                                "snippets": [
                                    {"id": "git-3", "title": "Delete Local Branch", "content": "git branch -d branch_name", "type": "code", "language": "bash"}
                                ]
                            }
                        ]
                    },
                    {
                        "name": "Docker & Containerization",
                        "topics": [
                            {
                                "name": "Docker Clean",
                                "snippets": [
                                    {"id": "docker-1", "title": "Prune system", "content": "docker system prune -a --volumes", "type": "code", "language": "bash"}
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "id": "keyboard-shortcuts",
                "title": "System Shortcuts",
                "description": "Daily productivity shortcuts for macOS and Windows systems.",
                "visibility": "public",
                "categories": [
                    {
                        "name": "macOS navigation",
                        "topics": [
                            {
                                "name": "Window management",
                                "snippets": [
                                    {"id": "mac-1", "title": "Show Desktop", "content": "Fn + F11 (or pinch with thumb and three fingers)", "type": "text", "language": ""}
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }


@app.get("/api/resources")
async def proxy_resources(request: Request):
    """Proxy GET /api/resources → Next.js API (dev:3000 → prod:lanpad.app)."""
    params = dict(request.query_params)
    hub_id = params.get("hubId", "dev-essentials")
    result = await _proxy_get("/api/resources", params)
    
    if isinstance(result, tuple):
        result_data = result[0]
    else:
        result_data = result

    if isinstance(result_data, dict) and result_data.get("success") == True:
        return result_data

    # Return local fallback snippets based on hub_id
    if hub_id == "keyboard-shortcuts":
        return {
            "success": True,
            "resources": [
                {
                    "id": "mac-1",
                    "title": "Show Desktop",
                    "content": "Fn + F11 (or pinch with thumb and three fingers)",
                    "type": "text",
                    "category": "macOS navigation",
                    "topic": "Window management"
                }
            ]
        }

    return {
        "success": True,
        "resources": [
            {
                "id": "git-1",
                "title": "Discard Local Changes",
                "content": "git reset --hard HEAD\ngit clean -fd",
                "type": "code",
                "category": "Git & Version Control",
                "topic": "Basic Commands"
            },
            {
                "id": "git-2",
                "title": "Commit with Message",
                "content": "git commit -m \"feat: add connection auto-discovery\"",
                "type": "code",
                "category": "Git & Version Control",
                "topic": "Basic Commands"
            },
            {
                "id": "git-3",
                "title": "Delete Local Branch",
                "content": "git branch -d branch_name",
                "type": "code",
                "category": "Git & Version Control",
                "topic": "Branch Management"
            },
            {
                "id": "docker-1",
                "title": "Prune system",
                "content": "docker system prune -a --volumes",
                "type": "code",
                "category": "Docker & Containerization",
                "topic": "Docker Clean"
            }
        ]
    }


@app.post("/api/resources/{resource_id}")
async def proxy_resource_action(resource_id: str, request: Request):
    """Proxy POST /api/resources/{id} → Next.js API (copy/send metrics)."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    result = await _proxy_post(f"/api/resources/{resource_id}", body)
    
    if isinstance(result, tuple):
        result_data = result[0]
    else:
        result_data = result

    if isinstance(result_data, dict):
        return result_data
    return {"success": False, "error": "Metrics server unavailable"}


# ── Paste / input endpoints ───────────────────────────────────────────────────

@app.post("/input/send")
@app.post("/paste")
async def paste(request: Request, data: dict):
    # Rate limit check
    client_ip = request.client.host if request.client else "unknown"
    if is_rate_limited(client_ip, "/paste", limit=10, window=60):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=429, content={"status": "error", "message": "Rate limit exceeded"})

    # Check origin for security
    origin = request.headers.get("origin")
    if origin:
        import re
        allowed_pattern = re.compile(
            r"^(chrome-extension://.*|https?://.*\.trycloudflare\.com|https?://.*\.localhost\.run|https?://.*\.lhr\.life|https?://.*\.lhr\.rocks|https?://.*\.bore\.pub|http://localhost(:.*)?|http://127\.0\.0\.1(:.*)?|http://192\.168\..*|http://10\..*|http://172\..*|https://lanpad\.vercel\.app|https://lanpad\.app|https://www\.lanpad\.app)$"
        )
        if not allowed_pattern.match(origin):
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=403, content={"status": "error", "message": "Origin not allowed"})

    global pending_paste, last_synced_text, stop_typing
    stop_typing = False
    try:
        text = data.get("content") or data.get("text", "")
        is_encrypted = data.get("encrypted", False)
        if is_encrypted:
            sid = request.query_params.get("sid", "")
            if sid:
                text = decrypt_xor(text, sid)
        mode = data.get("mode", "flash")
        try:
            wpm = int(data.get("wpm", 40))
        except (ValueError, TypeError):
            wpm = 40
        
        # Validate WPM range
        MIN_WPM, MAX_WPM = 1, 300
        if wpm < MIN_WPM:
            wpm = MIN_WPM
        elif wpm > MAX_WPM:
            wpm = MAX_WPM
        
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
        language = data.get("language", "")
        jitter = bool(data.get("jitter", False))
        thinking_pauses = bool(data.get("thinking_pauses", False))
        typo_sim = bool(data.get("typo_sim", False))
        
        # Guard checking completed via check_feature_usage above
                
    except Exception as e:
        return {"status": "error", "message": f"Data parsing error: {str(e)}"}

    if text is not None:
        print(f"[PASTE] Triggering {mode} mode | Content: {text[:20]}...")
        if text and mode in ["inject", "type", "typing", "flash"]:
            log_telemetry_event_async(f"inject:{get_active_site()}")
        if not text:
            if mode != "sync":
                last_synced_text = ""
                pending_paste["text"] = ""
                pending_paste["mode"] = mode
                pending_paste["id"] += 1
                return {"status": "success"}

        pending_paste["text"] = text
        pending_paste["mode"] = mode
        pending_paste["id"] += 1
        add_to_history(text, mode)

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

    elif mode in ["type", "typing"]:
        # Check pyautogui early
        pyautogui_module = _safe_pyautogui()
        if not pyautogui_module:
            return {"status": "error", "message": "pyautogui not available (headless mode)"}
        
        # Run typing in a separate thread to keep server responsive to /stop
        import threading
        threading.Thread(
            target=perform_typing,
            args=(text, wpm, is_coding, language, jitter, thinking_pauses, typo_sim),
            daemon=True
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
        try:
            await asyncio.to_thread(run_flash)
        except Exception as e:
            return {"status": "error", "message": str(e)}
        return {"status": "success"}


@app.post("/receive_resource")
async def receive_resource(data: dict):
    """Receive a resource snippet from the public catalog browser and push to pending_paste."""
    title = data.get("title", "Resource")
    content = data.get("content", "")
    res_type = data.get("type", "text")
    language = data.get("language", "")

    if not content:
        return {"status": "error", "message": "Content is empty"}

    pending_paste["text"] = content
    pending_paste["mode"] = "flash"
    pending_paste["id"] += 1
    add_to_history(content, "flash", title)

    return {"status": "success", "message": f"Snippet '{title}' received successfully"}


@app.get("/history")
async def get_history_endpoint():
    return {"status": "success", "history": history_stack}




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
INBOX_DIR = os.path.join(SHARED_DIR, ".inbox")

if not os.path.exists(SHARED_DIR):
    os.makedirs(SHARED_DIR, exist_ok=True)
if not os.path.exists(INBOX_DIR):
    os.makedirs(INBOX_DIR, exist_ok=True)


# Global state to track real-time upload progress from mobile/clients to show in laptop app
_active_upload = {
    "filename": "",
    "size": 0,
    "written": 0,
    "start_time": 0.0,
    "active": False,
    "mode": "parallel"
}


def save_deleted_file(filename: str, size: int):
    """Saves info about a deleted file to .metadata.json."""
    try:
        import json
        import time
        meta_path = os.path.join(SHARED_DIR, ".metadata.json")
        data = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r") as f:
                    data = json.load(f)
            except Exception:
                pass
        
        # Ensure 'deleted_files' list exists
        if "deleted_files" not in data or not isinstance(data["deleted_files"], list):
            data["deleted_files"] = []
            
        # Append deleted file entry
        entry = {
            "name": filename,
            "size": size,
            "deleted_at": time.time() * 1000  # milliseconds
        }
        # Avoid duplicate names in the deleted list
        if not any(x.get("name") == filename for x in data["deleted_files"]):
            data["deleted_files"].append(entry)
            
        with open(meta_path, "w") as f:
            json.dump(data, f)
    except Exception:
        pass


def remove_deleted_file(filename: str):
    """Removes a file from the deleted_files list in .metadata.json when it is re-uploaded/re-created."""
    try:
        import json
        meta_path = os.path.join(SHARED_DIR, ".metadata.json")
        if os.path.exists(meta_path):
            data = {}
            try:
                with open(meta_path, "r") as f:
                    data = json.load(f)
            except Exception:
                pass
            
            if "deleted_files" in data and isinstance(data["deleted_files"], list):
                # Filter out the file from deleted_files
                data["deleted_files"] = [x for x in data["deleted_files"] if isinstance(x, dict) and x.get("name") != filename]
                with open(meta_path, "w") as f:
                    json.dump(data, f)
    except Exception:
        pass


def save_file_duration(filename: str, duration: float):
    """Saves file transfer duration to .metadata.json inside the LANpad shared directory."""
    try:
        import json
        meta_path = os.path.join(SHARED_DIR, ".metadata.json")
        data = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r") as f:
                    data = json.load(f)
            except Exception:
                pass
        
        # Keep durations key separate from any generic keys
        data[filename] = round(duration, 1)
        with open(meta_path, "w") as f:
            json.dump(data, f)
    except Exception:
        pass


def save_file_uploader(filename: str, device_name: str):
    """Saves uploader device name to .metadata.json inside the LANpad shared directory."""
    try:
        import json
        meta_path = os.path.join(SHARED_DIR, ".metadata.json")
        data = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r") as f:
                    data = json.load(f)
            except Exception:
                pass
        if "uploaders" not in data or not isinstance(data["uploaders"], dict):
            data["uploaders"] = {}
        data["uploaders"][filename] = device_name
        os.makedirs(SHARED_DIR, exist_ok=True)
        with open(meta_path, "w") as f:
            json.dump(data, f)
    except Exception:
        pass


@app.get("/api/files/list")
async def list_files(sid: str = None, client_device: str = None, show_all: str = "false"):
    if client_device:
        import time
        _registered_clients[client_device] = time.time()
    if not is_valid_sid(sid):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
    try:
        meta_path = os.path.join(SHARED_DIR, ".metadata.json")
        durations = {}
        uploaders = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r") as f:
                    meta_data = json.load(f)
                    durations = meta_data
                    uploaders = meta_data.get("uploaders", {})
            except Exception:
                pass

        files = []
        deleted_files = {}
        if isinstance(durations.get("deleted_files"), list):
            for entry in durations["deleted_files"]:
                if isinstance(entry, dict) and "name" in entry:
                    deleted_files[entry["name"]] = entry.get("deleted_at", 0.0)

        # 1. Main Shared Directory Files
        if os.path.exists(SHARED_DIR):
            for name in os.listdir(SHARED_DIR):
                full_path = os.path.join(SHARED_DIR, name)
                if os.path.isfile(full_path) and not name.startswith(".") and not name.endswith(".part"):
                    stat = os.stat(full_path)
                    if name in deleted_files:
                        if stat.st_mtime * 1000 > deleted_files[name]:
                            remove_deleted_file(name)
                        else:
                            continue
                    # Only show files created/modified in this session (always show APKs)
                    if not name.endswith(".apk") and show_all.lower() != "true":
                        if stat.st_ctime < SERVER_START_TIME and stat.st_mtime < SERVER_START_TIME:
                            continue
                    files.append({
                        "name": name,
                        "size": stat.st_size,
                        "modified": stat.st_mtime,
                        "duration": durations.get(name),
                        "inbox": False,
                        "uploaded_by": uploaders.get(name, get_server_device_name())
                    })
        # 2. Inbox Directory Files (Waiting to be accepted)
        if os.path.exists(INBOX_DIR):
            for name in os.listdir(INBOX_DIR):
                full_path = os.path.join(INBOX_DIR, name)
                if os.path.isfile(full_path) and not name.startswith(".") and not name.endswith(".part"):
                    stat = os.stat(full_path)
                    if name in deleted_files:
                        if stat.st_mtime * 1000 > deleted_files[name]:
                            remove_deleted_file(name)
                        else:
                            continue
                    # Only show files created/modified in this session (always show APKs)
                    if not name.endswith(".apk") and show_all.lower() != "true":
                        if stat.st_ctime < SERVER_START_TIME and stat.st_mtime < SERVER_START_TIME:
                            continue
                    files.append({
                        "name": name,
                        "size": stat.st_size,
                        "modified": stat.st_mtime,
                        "duration": durations.get(name),
                        "inbox": True,
                        "uploaded_by": uploaders.get(name, "Mobile Device")
                    })
        files.sort(key=lambda x: x["modified"], reverse=True)
        return {"status": "success", "files": files}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/files/upload")
async def upload_file(request: Request, file: UploadFile = File(...), mode: str = "parallel", sid: str = None, uploader: str = None):
    if not is_valid_sid(sid):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
    try:
        import asyncio
        filename = os.path.basename(file.filename)
        target_dir = INBOX_DIR if mode == "inbox" else SHARED_DIR
        dest_path = os.path.join(target_dir, filename)
        
        from fastapi.concurrency import run_in_threadpool
        import shutil

        def save_file():
            file.file.seek(0)
            with open(dest_path, "wb") as f:
                shutil.copyfileobj(file.file, f, length=1024 * 1024)

        await run_in_threadpool(save_file)
        if not uploader:
            user_agent = (request.headers.get("user-agent") or "").lower()
            if "iphone" in user_agent:
                uploader = "iPhone"
            elif "ipad" in user_agent:
                uploader = "iPad"
            elif "android" in user_agent:
                uploader = "Android"
            elif "macintosh" in user_agent:
                uploader = "Mac"
            elif "windows" in user_agent:
                uploader = "Windows"
            else:
                uploader = "Mobile Device"
        save_file_uploader(filename, uploader)
        asyncio.ensure_future(broadcast_files_changed())
        return {"status": "success", "filename": filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/files/upload_raw")
async def upload_file_raw(request: Request, filename: str, mode: str = "parallel", sid: str = None):
    if not is_valid_sid(sid):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
    try:
        import time
        start_time = time.time()
        
        safe_filename = os.path.basename(filename)
        target_dir = INBOX_DIR if mode == "inbox" else SHARED_DIR
        dest_path = os.path.join(target_dir, safe_filename)
        part_path = dest_path + ".part"
        
        # Initialize global progress tracking for laptop app
        content_length = 0
        try:
            content_length = int(request.headers.get("content-length", 0))
        except Exception:
            pass
            
        global _active_upload
        _active_upload = {
            "filename": safe_filename,
            "size": content_length,
            "written": 0,
            "start_time": start_time,
            "active": True,
            "mode": mode
        }
        
        import asyncio
        loop = asyncio.get_running_loop()
        
        # Open with 4MB OS write buffer — keeps syscalls large and infrequent
        fd = await loop.run_in_executor(None, lambda: open(part_path, "wb", buffering=4 * 1024 * 1024))
        
        try:
            async for chunk in request.stream():
                await loop.run_in_executor(None, fd.write, chunk)
                _active_upload["written"] += len(chunk)
            await loop.run_in_executor(None, fd.flush)
        finally:
            await loop.run_in_executor(None, fd.close)
            
        # Rename part file to final file
        if os.path.exists(part_path):
            if os.path.exists(dest_path):
                os.remove(dest_path)
            os.rename(part_path, dest_path)
                 
        duration = time.time() - start_time
        save_file_duration(safe_filename, duration)
        _active_upload["active"] = False
        import asyncio
        asyncio.ensure_future(broadcast_files_changed())
        return {"status": "success", "filename": safe_filename}
    except Exception as e:
        _active_upload["active"] = False
        return {"status": "error", "message": str(e)}


# Shared file descriptor cache: filename -> (fd, expected_size, bytes_written_counter)
# Avoids repeated open()/close() syscalls across 12+ concurrent chunk requests
_upload_fd_cache = {}  # key: dest_path, value: {fd, size, lock}


@app.post("/api/files/preallocate")
async def preallocate_file(filename: str, size: int, mode: str = "parallel", sid: str = None):
    """Pre-allocate the destination file so parallel chunk writers can seek to their offsets."""
    if not is_valid_sid(sid):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
    try:
        import time
        safe_filename = os.path.basename(filename)
        target_dir = INBOX_DIR if mode == "inbox" else SHARED_DIR
        dest_path = os.path.join(target_dir, safe_filename)
        part_path = dest_path + ".part"
        
        with open(part_path, "wb") as f:
            f.truncate(size)  # Instant — just sets file size, no disk I/O
        # Open and cache fd so upload_direct reuses it without open()/close() per chunk
        import threading
        _upload_fd_cache[part_path] = {
            "fd": os.open(part_path, os.O_WRONLY),
            "size": size,
            "written": 0,
            "start_time": time.time(),
            "lock": threading.Lock(),
        }
        
        global _active_upload
        _active_upload = {
            "filename": safe_filename,
            "size": size,
            "written": 0,
            "start_time": time.time(),
            "active": True,
            "mode": mode
        }
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/files/upload_direct")
async def upload_file_direct(request: Request, filename: str, offset: int, mode: str = "parallel", sid: str = None):
    """Write streamed data directly to the final file at the given byte offset.
    Uses os.pwrite() for atomic positional writes — safe for parallel non-overlapping regions.
    PERFORMANCE: Skips license check for chunks after preallocate (permission already verified)."""
    if not is_valid_sid(sid):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    try:
        import time
        safe_filename = os.path.basename(filename)
        target_dir = INBOX_DIR if mode == "inbox" else SHARED_DIR
        dest_path = os.path.join(target_dir, safe_filename)
        part_path = dest_path + ".part"

        import asyncio
        loop = asyncio.get_running_loop()

        # Get cached fd (created during preallocate) to skip open()/close() overhead.
        cache = _upload_fd_cache.get(part_path)
        if cache:
            fd = cache["fd"]
            body = await request.body()
            await loop.run_in_executor(None, lambda: os.pwrite(fd, body, offset))
            # Track written bytes; close fd once all data is received
            with cache["lock"]:
                cache["written"] += len(body)
                _active_upload["written"] = cache["written"]
                done = cache["written"] >= cache["size"]
            if done:
                try:
                    os.close(fd)
                except OSError:
                    pass
                
                # Rename part file to final file
                if os.path.exists(part_path):
                    if os.path.exists(dest_path):
                        os.remove(dest_path)
                    os.rename(part_path, dest_path)

                duration = time.time() - cache["start_time"]
                save_file_duration(safe_filename, duration)
                _active_upload["active"] = False
                _upload_fd_cache.pop(part_path, None)
                asyncio.ensure_future(broadcast_files_changed())
        else:
            # Fallback: fd not in cache (preallocate was not called) — check permission then write
            allowed, err = check_feature_usage("allow_file_share", "File Sharing")
            if not allowed:
                return {"status": "error", "message": err}
            fd = os.open(part_path, os.O_WRONLY | os.O_CREAT)
            try:
                body = await request.body()
                await loop.run_in_executor(None, lambda: os.pwrite(fd, body, offset))
            finally:
                os.close(fd)

        return {"status": "success", "offset": offset}
    except Exception as e:
        _active_upload["active"] = False
        return {"status": "error", "message": str(e)}


@app.get("/api/files/upload_status")
async def get_upload_status(sid: str = None):
    if not is_valid_sid(sid):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    return _active_upload


@app.post("/api/files/upload_cancel")
async def cancel_active_upload(sid: str = None):
    if not is_valid_sid(sid):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    
    global _active_upload
    if _active_upload.get("active"):
        filename = _active_upload["filename"]
        mode = _active_upload["mode"]
        target_dir = INBOX_DIR if mode == "inbox" else SHARED_DIR
        part_path = os.path.join(target_dir, filename + ".part")
        
        # Pop and close cached file descriptor if open
        cache = _upload_fd_cache.pop(part_path, None)
        if cache:
            try:
                os.close(cache["fd"])
            except Exception:
                pass
        
        # Clean up incomplete .part file from disk
        if os.path.exists(part_path):
            try:
                os.remove(part_path)
            except Exception:
                pass
        
        _active_upload["active"] = False
        return {"status": "success"}
    return {"status": "error", "message": "No active upload to cancel"}


@app.websocket("/ws/upload")
async def upload_via_websocket(websocket: WebSocket, sid: str = None, filename: str = None, size: int = 0):
    """WebSocket-based file upload — single TCP connection, binary frames, zero HTTP overhead.
    Pipelining: next receive starts while current write completes for maximum throughput."""
    await websocket.accept()

    if not is_valid_sid(sid):
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
    part_path = dest_path + ".part"

    # Pre-allocate the full file instantly (no actual I/O, just sets file size)
    with open(part_path, "wb") as f:
        f.truncate(size)

    import asyncio
    import concurrent.futures
    loop = asyncio.get_running_loop()

    # Dedicated thread pool for disk writes — keeps event loop free for new receives
    write_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

    fd = os.open(part_path, os.O_WRONLY)
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

        # Rename part file to final file
        if os.path.exists(part_path):
            if os.path.exists(dest_path):
                os.remove(dest_path)
            os.rename(part_path, dest_path)

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
    if not is_valid_sid(sid):
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
    if not is_valid_sid(sid):
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



@app.get("/api/files/pdf_info/{filename}")
async def get_pdf_info(filename: str, sid: str = None):
    if not is_valid_sid(sid):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Unauthorized session")
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(SHARED_DIR, safe_filename)
    if not os.path.exists(file_path):
        inbox_path = os.path.join(INBOX_DIR, safe_filename)
        if os.path.exists(inbox_path):
            file_path = inbox_path
        else:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="File not found")
    try:
        import fitz
        doc = fitz.open(file_path)
        return {"status": "success", "page_count": len(doc)}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/files/pdf_page/{filename}/{page_num}")
async def get_pdf_page_image(filename: str, page_num: int, sid: str = None):
    if not is_valid_sid(sid):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Unauthorized session")
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(SHARED_DIR, safe_filename)
    if not os.path.exists(file_path):
        inbox_path = os.path.join(INBOX_DIR, safe_filename)
        if os.path.exists(inbox_path):
            file_path = inbox_path
        else:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="File not found")
            
    import io
    from fastapi.responses import StreamingResponse
    try:
        import fitz
        doc = fitz.open(file_path)
        if page_num < 0 or page_num >= len(doc):
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Page number out of range")
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=150)
        img_data = pix.tobytes("png")
        return StreamingResponse(io.BytesIO(img_data), media_type="image/png")
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to render PDF page: {str(e)}")


@app.get("/api/files/preview_text/{filename}")
async def preview_text_file(filename: str, sid: str = None):
    if not is_valid_sid(sid):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Unauthorized session")
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(SHARED_DIR, safe_filename)
    if not os.path.exists(file_path):
        inbox_path = os.path.join(INBOX_DIR, safe_filename)
        if os.path.exists(inbox_path):
            file_path = inbox_path
        else:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="File not found")

    ext = safe_filename.split('.')[-1].lower()
    content = ""
    try:
        if ext in ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'py', 'sh', 'bat']:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(100000) # Read up to 100kb
        elif ext == 'pdf':
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                pages_text = []
                for i in range(min(5, len(reader.pages))): # Read first 5 pages max
                    pages_text.append(f"--- PAGE {i+1} ---\n" + (reader.pages[i].extract_text() or ""))
                content = "\n\n".join(pages_text)
            except Exception as e:
                content = f"Failed to extract PDF text: {str(e)}"
        elif ext in ['doc', 'docx']:
            try:
                import docx
                doc = docx.Document(file_path)
                paras = [p.text for p in doc.paragraphs[:100]] # First 100 paragraphs max
                content = "\n".join(paras)
            except Exception as e:
                content = f"Failed to extract Word document text: {str(e)}"
        else:
            content = f"Preview not supported for .{ext} files."
    except Exception as e:
        content = f"Error reading file preview: {str(e)}"
        
    return {"status": "success", "content": content}


@app.get("/api/files/download/{filename}")
async def download_file(filename: str, sid: str = None):
    if not is_valid_sid(sid):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Unauthorized session")
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail=err)
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(SHARED_DIR, safe_filename)
    if not os.path.exists(file_path):
        inbox_path = os.path.join(INBOX_DIR, safe_filename)
        if os.path.exists(inbox_path):
            file_path = inbox_path
        else:
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

@app.get("/api/system/storage")
async def get_storage_health():
    import shutil
    try:
        total, used, free = shutil.disk_usage(SHARED_DIR)
        cache_size = 0
        for d in [SHARED_DIR, INBOX_DIR]:
            if os.path.exists(d):
                for f in os.listdir(d):
                    fp = os.path.join(d, f)
                    if os.path.isfile(fp):
                        cache_size += os.path.getsize(fp)
        return {
            "status": "success",
            "disk_total": total,
            "disk_used": used,
            "disk_free": free,
            "cache_size": cache_size
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/system/clean_cache")
async def clean_cache():
    import time
    now = time.time()
    freed = 0
    try:
        for d in [SHARED_DIR, INBOX_DIR]:
            if os.path.exists(d):
                for f in os.listdir(d):
                    fp = os.path.join(d, f)
                    if os.path.isfile(fp):
                        # Clean files older than 48h
                        if os.stat(fp).st_mtime < now - 172800:
                            size = os.path.getsize(fp)
                            os.remove(fp)
                            freed += size
        import asyncio
        asyncio.ensure_future(broadcast_files_changed())
        return {"status": "success", "freed_bytes": freed}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/files/share/{filename}")
async def share_file(filename: str, sid: str = None):
    if not is_valid_sid(sid):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Unauthorized session")
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(SHARED_DIR, safe_filename)
    if not os.path.exists(file_path):
        inbox_path = os.path.join(INBOX_DIR, safe_filename)
        if os.path.exists(inbox_path):
            file_path = inbox_path
        else:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="File not found")
    import time
    try:
        os.utime(file_path, None)
        save_file_uploader(safe_filename, get_server_device_name())
    except Exception:
        pass
    import asyncio
    asyncio.ensure_future(broadcast_files_changed())
    return {"status": "success"}

@app.delete("/api/files/delete/{filename}")
async def delete_file(filename: str, sid: str = None):
    if not is_valid_sid(sid):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    allowed, err = check_feature_usage("allow_file_share", "File Sharing")
    if not allowed:
        return {"status": "error", "message": err}
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(SHARED_DIR, safe_filename)
    inbox_path = os.path.join(INBOX_DIR, safe_filename)
    try:
        size = 0
        # If it's in the inbox, delete it from disk
        if os.path.exists(inbox_path):
            size = os.path.getsize(inbox_path)
            os.remove(inbox_path)
            save_deleted_file(safe_filename, size)
            import asyncio
            asyncio.ensure_future(broadcast_files_changed())
            return {"status": "success"}
        # If it's already accepted in the main shared folder, skip deleting it from disk
        # but return success so the mobile web view hides it locally
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            save_deleted_file(safe_filename, size)
            import asyncio
            asyncio.ensure_future(broadcast_files_changed())
            return {"status": "success"}
        return {"status": "error", "message": "File not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/speedtest/upload")
async def speedtest_upload(request: Request, sid: str = None):
    if not is_valid_sid(sid):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"status": "error", "message": "Unauthorized session"})
    # Consume request stream without writing to disk
    async for _ in request.stream():
        pass
    return {"status": "success"}


@app.get("/api/speedtest/download")
async def speedtest_download(size: int = 10 * 1024 * 1024, sid: str = None):
    if not is_valid_sid(sid):
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


_reported_mobile_results = {}

@app.post("/api/benchmark/report_mobile")
async def report_mobile_results(request: Request):
    global _reported_mobile_results
    import time
    try:
        data = await request.json()
        _reported_mobile_results = {
            "ping": data.get("ping"),
            "download": data.get("download"),
            "upload": data.get("upload"),
            "timestamp": time.time()
        }
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/benchmark/get_mobile")
async def get_mobile_results(request: Request):
    global _reported_mobile_results
    if request.client.host in ("127.0.0.1", "localhost", "::1"):
        return _reported_mobile_results
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=403, content={"error": "Access denied"})


@app.get("/api/benchmark/upload_progress")
async def get_upload_progress(sid: str = None):
    if not is_valid_sid(sid):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"error": "Access denied"})
    return _active_upload


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
   
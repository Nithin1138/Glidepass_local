import os
import sys
import io
import threading
import traceback
import subprocess
import ssl
try:
    import certifi
    ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Heavy imports (tkinter, rumps/menubar_handler, uvicorn, launcher) are
# loaded LAZILY below, inside the appropriate code path:
#
#   --gui mode  : imports tkinter + launcher  (NO rumps / menubar_handler)
#   menubar mode: imports rumps + menubar_handler + uvicorn  (NO tkinter)
#
# Mixing the two in the same process crashes Tkinter on macOS with:
#   NSInvalidArgumentException: [NSApplication macOSVersion] unrecognized selector
# because rumps' import of NSApplication conflicts with Tkinter's own
# NSApplication setup inside tk.Tk().
# ---------------------------------------------------------------------------

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
def _ensure_safe_stdio():
    class _SafeStream(io.TextIOBase):
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
    if sys.stdout is None:
        sys.stdout = _SafeStream("stdout")
    if sys.stderr is None:
        sys.stderr = _SafeStream("stderr")
    if sys.stdin is None:
        sys.stdin = _SafeStream("stdin")

_ensure_safe_stdio()

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)


import json
import urllib.request

def is_currently_licensed() -> bool:
    import json
    import urllib.request
    import time
    import os
    
    try:
        req = urllib.request.Request("https://lanpad.app/api/monetization/status", headers={"User-Agent": "LANpad App"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read().decode())
            monetization_enabled = data.get("monetization_enabled", False)
            free_enabled = data.get("free_enabled", False)
    except Exception:
        monetization_enabled = True
        free_enabled = False

    if not monetization_enabled:
        return True

    if monetization_enabled and free_enabled:
        return True

    # 2. Check local license file
    license_path = os.path.expanduser("~/.lanpad_license.json")
    if os.path.exists(license_path):
        try:
            with open(license_path, "r", encoding="utf-8") as f:
                lic = json.load(f)
            
            # Check HWID
            cached_hwid = lic.get("hwid")
            if cached_hwid:
                try:
                    from platform_utils import get_hardware_id
                    if cached_hwid.strip().upper() != get_hardware_id().strip().upper():
                        return False
                except Exception:
                    pass

            # Check Expiry
            expires_at = lic.get("expires_at")
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
                    return False

            return True
        except Exception:
            pass
    return False

def license_enforcer_loop(controller):
    import time
    unlicensed_since = None
    while True:
        try:
            licensed = is_currently_licensed()
            if licensed:
                unlicensed_since = None
                if not controller.server_manager.should_be_running:
                    print("[security] Licensed state detected. Starting backend server...")
                    controller.server_manager.start()
            else:
                if controller.server_manager.should_be_running:
                    if unlicensed_since is None:
                        unlicensed_since = time.time()
                        print("[security] Unlicensed state detected. Grace period started (60s)...")
                    elif time.time() - unlicensed_since >= 60:
                        print("[security] Unlicensed state detected for 60s. Stopping backend server...")
                        controller.stop_backend()
                        unlicensed_since = None
                else:
                    unlicensed_since = None
        except Exception as e:
            print(f"[security] Enforcer error: {e}")
        time.sleep(2.0)

class ServerManager:
    def __init__(self):
        self.server_instance = None
        self.thread = None
        self.should_be_running = False
        
        # Poll for shutdown requests from the GUI (via /shutdown endpoint)
        import time
        import app as fastapi_app_module
        def poll_shutdown():
            while True:
                if getattr(fastapi_app_module, "SHUTDOWN_REQUESTED", False):
                    self.stop()
                    fastapi_app_module.SHUTDOWN_REQUESTED = False
                time.sleep(0.5)
        threading.Thread(target=poll_shutdown, daemon=True).start()

    def start(self):
        if self.thread and self.thread.is_alive():
            return
        
        # Ensure port 8000 is free before starting uvicorn
        try:
            import urllib.request
            # 1. Attempt clean shutdown of previous LANpad instances
            req = urllib.request.Request("http://127.0.0.1:8000/shutdown", method="GET")
            with urllib.request.urlopen(req, timeout=1) as resp:
                pass
            import time
            time.sleep(1.0) # Wait for clean shutdown completion
        except Exception:
            pass

        # 2. Force kill any remaining process holding port 8000
        try:
            import subprocess
            if sys.platform == 'win32':
                out = subprocess.check_output("netstat -ano | findstr :8000", shell=True).decode()
                for line in out.splitlines():
                    if "LISTENING" in line:
                        pid = line.strip().split()[-1]
                        subprocess.run(f"taskkill /F /PID {pid}", shell=True)
            else:
                out = subprocess.check_output("lsof -t -i :8000", shell=True).decode()
                for pid in out.splitlines():
                    if pid.strip():
                        subprocess.run(f"kill -9 {pid}", shell=True)
            import time
            time.sleep(0.5)
        except Exception:
            pass

        from app import app as fastapi_app
        import uvicorn
        import socket as _socket
        
        class CustomServer(uvicorn.Server):
            """Uvicorn server with enlarged TCP buffers for high-throughput LAN transfers."""
            def install_signal_handlers(self):
                pass
            async def startup(self, sockets=None):
                await super().startup(sockets)
                for server in getattr(self, "servers", []):
                    if hasattr(server, "sockets"):
                        for sock in server.sockets:
                            try:
                                sock.setsockopt(_socket.SOL_SOCKET, _socket.SO_RCVBUF, 4 * 1024 * 1024)
                                sock.setsockopt(_socket.SOL_SOCKET, _socket.SO_SNDBUF, 4 * 1024 * 1024)
                            except Exception:
                                pass
        
        config = uvicorn.Config(app=fastapi_app, host="0.0.0.0", port=8000, log_level="error")
        self.server_instance = CustomServer(config)
        
        def run_server():
            try:
                self.server_instance.run()
            except Exception:
                with open("backend_error.txt", "w") as f:
                    f.write(traceback.format_exc())
        
        self.thread = threading.Thread(target=run_server, daemon=True)
        self.thread.start()
        self.should_be_running = True

    def stop(self):
        if self.server_instance:
            self.server_instance.should_exit = True
            self.server_instance.force_exit = True
        self.should_be_running = False


class AppController:
    def __init__(self):
        self.server_manager = ServerManager()

    def start_backend(self):
        if is_currently_licensed():
            self.server_manager.start()
        else:
            print("[security] Blocked start_backend() call: App is unlicensed.")

    def stop_backend(self):
        self.server_manager.stop()

    def toggle_dashboard(self):
        """Show the Tkinter Dashboard: wake the existing instance via IPC
        or spawn a new one if none is running.

        We MUST NOT call subprocess.Popen unconditionally here – doing so
        creates a new dashboard process every time the handler fires
        (e.g. on every macOS app-activation event), which leads to dozens
        of stacked windows and random Dock interactions.
        """
        # 1. Try to wake an already-running dashboard via the IPC socket.
        import socket as _socket
        try:
            s = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
            s.settimeout(0.3)
            s.connect(("127.0.0.1", 8001))
            s.sendall(b"SHOW")
            s.close()
            return  # existing instance woken up – done
        except Exception:
            pass  # no listener – fall through to spawn a new one

        # 2. No running dashboard found – launch a fresh one.
        try:
            kwargs = {}
            if sys.platform.startswith("win"):
                kwargs["creationflags"] = 0x08000000  # CREATE_NO_WINDOW (suppress console flash)
            if getattr(sys, 'frozen', False):
                subprocess.Popen([sys.executable, "--gui"], **kwargs)
            else:
                subprocess.Popen([sys.executable, sys.argv[0], "--gui"], **kwargs)
        except Exception as e:
            with open("gui_launch_error.txt", "a") as f:
                f.write(f"Launch error: {str(e)}\n")

def main():
    # Import menubar/server deps ONLY in the non-gui (menubar) process.
    # Importing rumps here (rather than at module level) is essential:
    # it must NOT be imported when running with --gui because rumps
    # initialises NSApplication before tk.Tk() gets a chance to, causing
    # a hard crash (macOSVersion unrecognised selector).
    import uvicorn  # noqa: F401 – imported for side effects in ServerManager
    from menubar_handler import LANpadMenuApp

    # 1. Setup Controller
    controller = AppController()

    # 2. Start Backend enforcer thread to monitor license changes dynamically
    t = threading.Thread(target=license_enforcer_loop, args=(controller,), daemon=True)
    t.start()

    # 3. Launch Menubar (Main Thread)
    menu_app = LANpadMenuApp(
        launcher_callback=controller.toggle_dashboard,
        start_callback=controller.start_backend,
        stop_callback=controller.stop_backend
    )

    # 4. Start backend & Show Dashboard on startup
    controller.start_backend()
    controller.toggle_dashboard()

    print("\U0001F680 LANpad Menubar Active")
    menu_app.run()

if __name__ == "__main__":
    if getattr(sys, 'frozen', False):
        import multiprocessing
        multiprocessing.freeze_support()

def check_mac_accessibility():
    import sys
    if sys.platform != 'darwin':
        return
    try:
        import ctypes
        app_services = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices')
        app_services.AXIsProcessTrusted.restype = ctypes.c_bool
        if not app_services.AXIsProcessTrusted():
            import os
            script = """
            display alert "LANpad Needs Permissions" message "To auto-type text from your phone, macOS requires you to grant Accessibility permissions to LANpad.\\n\\n1. Open System Settings -> Privacy & Security -> Accessibility.\\n2. IMPORTANT: If LANpad is already listed, you MUST remove it first (select it and click the '-' button).\\n3. Click the '+' button and add LANpad.app again.\\n4. Restart LANpad." buttons {"Open Settings", "Later"} default button "Open Settings"
            if button returned of result is "Open Settings" then
                open location "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
            end if
            """
            os.system(f"osascript -e '{script}' &")
    except Exception as e:
        pass

if __name__ == "__main__":
    if "--gui" not in sys.argv:
        # Check accessibility when starting the main menubar app
        check_mac_accessibility()

    # Freeze support is already handled above
    
    # Aggressive macOS Dock Icon Management
    if sys.platform == "darwin" and "--gui" not in sys.argv:
        try:
            from AppKit import NSApplication, NSApplicationActivationPolicyProhibited, \
                               NSApplicationActivationPolicyRegular, NSApplicationActivationPolicyAccessory
            
            # Determine role based on arguments
            if any(x in sys.argv for x in ["uvicorn", "app:app", "-m"]):
                NSApplication.sharedApplication().setActivationPolicy_(NSApplicationActivationPolicyProhibited)
            else:
                # The menubar app runs as an Accessory (no Dock icon) to avoid duplicate Dock icons.
                # Only the --gui process (the Dashboard) runs as Regular and displays in the Dock.
                NSApplication.sharedApplication().setActivationPolicy_(NSApplicationActivationPolicyAccessory)
        except Exception:
            pass

    # Handle GUI mode vs Native Host vs Anchor mode
    is_chrome_host = False
    for arg in sys.argv:
        if arg.startswith("chrome-extension://"):
            is_chrome_host = True
            break

    if is_chrome_host:
        try:
            import native_host
            native_host.main()
        except Exception as e:
            with open("native_host_crash.txt", "w") as f:
                f.write(traceback.format_exc())
            sys.exit(1)
    elif "--gui" in sys.argv:
        try:
            from launcher import run_launcher
            run_launcher()
        except Exception:
            with open("gui_crash.txt", "w") as f:
                f.write(traceback.format_exc())
    elif "--server-only" in sys.argv:
        # Check accessibility
        check_mac_accessibility()
        
        # Setup controller and run backend enforcer
        controller = AppController()
        t = threading.Thread(target=license_enforcer_loop, args=(controller,), daemon=True)
        t.start()
        
        # Start backend
        controller.start_backend()
        
        # Sleep main thread forever (since we don't run the menubar AppKit loop)
        import time
        print("🚀 LANpad Server-Only Active")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            controller.stop_backend()
    else:
        main()

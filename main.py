import os
import sys
import io
import threading
import traceback
import subprocess

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
        
        from app import app as fastapi_app
        import uvicorn
        config = uvicorn.Config(app=fastapi_app, host="0.0.0.0", port=8000, log_level="error")
        self.server_instance = uvicorn.Server(config)
        
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
        self.server_manager.start()

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
            if getattr(sys, 'frozen', False):
                subprocess.Popen([sys.executable, "--gui"])
            else:
                subprocess.Popen([sys.executable, sys.argv[0], "--gui"])
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

    # 2. Start Backend initially
    controller.start_backend()

    # 3. Launch Menubar (Main Thread)
    menu_app = LANpadMenuApp(
        launcher_callback=controller.toggle_dashboard,
        start_callback=controller.start_backend,
        stop_callback=controller.stop_backend
    )

    # 4. Show Dashboard on startup
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

    # Handle GUI mode vs Anchor mode
    if "--gui" in sys.argv:
        try:
            from launcher import run_launcher
            run_launcher()
        except Exception:
            with open("gui_crash.txt", "w") as f:
                f.write(traceback.format_exc())
    else:
        main()

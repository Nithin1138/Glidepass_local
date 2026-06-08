import os
import sys
import threading
import uvicorn
import tkinter as tk
import traceback
import subprocess
from launcher import GlidePassLauncher
from app import app as fastapi_app
from menubar_handler import GlidePassMenuApp

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
        """Creates or shows the Tkinter Dashboard in a separate process."""
        try:
            if getattr(sys, 'frozen', False):
                subprocess.Popen([sys.executable, "--gui"])
            else:
                subprocess.Popen([sys.executable, sys.argv[0], "--gui"])
            
            # Use AppleScript to bring it to front if it's already running
            if sys.platform == "darwin":
                script = 'tell application "System Events" to set frontmost of every process whose name contains "GlidePass" to true'
                subprocess.run(["osascript", "-e", script], capture_output=True)
        except Exception as e:
            with open("gui_launch_error.txt", "a") as f:
                f.write(f"Launch error: {str(e)}\n")

def main():
    # 1. Setup Controller
    controller = AppController()

    # 2. Start Backend initially
    controller.start_backend()

    # 3. Launch Menubar (Main Thread)
    menu_app = GlidePassMenuApp(
        launcher_callback=controller.toggle_dashboard,
        start_callback=controller.start_backend,
        stop_callback=controller.stop_backend
    )
    
    # 4. Show Dashboard on startup
    controller.toggle_dashboard()
    
    print("🚀 GlidePass Menubar Active")
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
            display alert "GlidePass Needs Permissions" message "To auto-type text from your phone, macOS requires you to grant Accessibility permissions to GlidePass.\\n\\n1. Open System Settings -> Privacy & Security -> Accessibility.\\n2. IMPORTANT: If GlidePass is already listed, you MUST remove it first (select it and click the '-' button).\\n3. Click the '+' button and add GlidePass.app again.\\n4. Restart GlidePass." buttons {"Open Settings", "Later"} default button "Open Settings"
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
                               NSApplicationActivationPolicyAccessory
            
            # Determine role based on arguments
            if any(x in sys.argv for x in ["uvicorn", "app:app", "-m"]):
                NSApplication.sharedApplication().setActivationPolicy_(NSApplicationActivationPolicyProhibited)
            else:
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

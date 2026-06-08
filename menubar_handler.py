try:
    import rumps
    HAS_RUMPS = True
except ImportError:
    HAS_RUMPS = False

import subprocess
import os
import sys
from PIL import Image
if HAS_RUMPS:
    from AppKit import NSNotificationCenter, NSApplicationDidBecomeActiveNotification
    import objc

    class GlidePassMenuApp(rumps.App):
        def __init__(self, launcher_callback, start_callback=None, stop_callback=None):
            super(GlidePassMenuApp, self).__init__("GlidePass", quit_button=None)
            self.launcher_callback = launcher_callback
            self.start_callback = start_callback
            self.stop_callback = stop_callback
            icon_path = self.resource_path("menubar_icon.png")
            if os.path.exists(icon_path):
                self.icon = icon_path
            else:
                self.title = "🛰️"
            self.menu = ["Server Status: Unknown", "Toggle Server", None, "Show Dashboard", None, "About GlidePass", None, "Quit GlidePass"]
            
            # Disable the status item so it acts as a label
            self.menu["Server Status: Unknown"].set_callback(None)
            
            # Register for activation notification (handles Dock click)
            nc = NSNotificationCenter.defaultCenter()
            nc.addObserver_selector_name_object_(
                self,
                objc.selector(self.handle_activation_, signature=b"v@:@"),
                NSApplicationDidBecomeActiveNotification,
                None
            )

        def handle_activation_(self, notification):
            """Called when the app becomes active, e.g., by clicking the Dock icon."""
            self.launcher_callback()

        def applicationShouldHandleReopen_hasVisibleWindows_(self, application, has_visible_windows):
            """Specifically handles Dock icon clicks for already running apps."""
            self.launcher_callback()
            return True

        def resource_path(self, relative_path):
            try:
                base_path = sys._MEIPASS
            except Exception:
                base_path = os.path.abspath(".")
            return os.path.join(base_path, relative_path)

        @rumps.clicked("Show Dashboard")
        def show_dashboard(self, _):
            self.launcher_callback()

        @rumps.clicked("Toggle Server")
        def toggle_server(self, sender):
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            is_running = (s.connect_ex(("127.0.0.1", 8000)) == 0)
            s.close()
            
            if is_running:
                if self.stop_callback:
                    self.stop_callback()
                    rumps.notification("GlidePass", "Backend Stopped", "Sync services have been paused.")
            else:
                if self.start_callback:
                    self.start_callback()
                    rumps.notification("GlidePass", "Backend Started", "Your laptop is now ready to sync.")

        @rumps.timer(2)
        def sync_state(self, _):
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            is_running = (s.connect_ex(("127.0.0.1", 8000)) == 0)
            s.close()
            
            if is_running:
                self.menu["Server Status: Unknown"].title = "Server Status: Running 🟢"
                self.menu["Toggle Server"].title = "Stop Server"
            else:
                self.menu["Server Status: Unknown"].title = "Server Status: Stopped 🔴"
                self.menu["Toggle Server"].title = "Start Server"

        @rumps.clicked("Quit GlidePass")
        def custom_quit(self, _):
            if self.stop_callback:
                self.stop_callback()
            # Send kill signal to dashboard
            import socket
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.connect(("127.0.0.1", 8001))
                s.sendall(b"QUIT")
                s.close()
            except Exception:
                pass
            rumps.quit_application()

        @rumps.clicked("About GlidePass")
        def about(self, _):
            rumps.alert("GlidePass v1.5.0", "Fast, Private, Cross-Device Sync.\nCreated by Nithin.")

else:
    # Windows/Linux Fallback using pystray
    try:
        import pystray
        from pystray import MenuItem as item
        HAS_PYSTRAY = True
    except ImportError:
        HAS_PYSTRAY = False

    class GlidePassMenuApp:
        def __init__(self, launcher_callback):
            self.launcher_callback = launcher_callback
            self.icon_path = self.resource_path("menubar_icon.png")
            
        def resource_path(self, relative_path):
            try:
                base_path = sys._MEIPASS
            except Exception:
                base_path = os.path.abspath(".")
            return os.path.join(base_path, relative_path)

        def run(self):
            if not HAS_PYSTRAY:
                print("❌ pystray not installed. Tray icon unavailable.")
                return

            image = Image.open(self.icon_path) if os.path.exists(self.icon_path) else Image.new('RGB', (64, 64), color=(73, 109, 137))
            menu = pystray.Menu(
                item('Show Dashboard', lambda: self.launcher_callback()),
                item('About GlidePass', lambda: print("GlidePass v1.5.0")),
                item('Exit', lambda icon, item: icon.stop())
            )
            self.tray = pystray.Icon("GlidePass", image, "GlidePass", menu)
            self.tray.run()

def start_menubar(launcher_callback, start_callback=None, stop_callback=None):
    app = GlidePassMenuApp(launcher_callback, start_callback, stop_callback)
    app.run()

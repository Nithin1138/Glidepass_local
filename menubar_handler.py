"""Cross-platform menubar / system-tray handler for GlidePass.

On macOS we use the ``rumps`` library (which wraps Cocoa/NSStatusItem).
On Windows we fall back to ``pystray`` (which wraps the Win32
notification area).  The two backends expose the **same** public
``GlidePassMenuApp`` class so the rest of the codebase can be
platform-agnostic.

Importing this module is safe on both platforms – the macOS-only
``rumps`` import is wrapped in a runtime check, so on Windows we
never even *import* rumps.
"""
import os
import sys
import subprocess

# Cross-platform helpers (with local fallback if platform_utils is missing)
try:
    from platform_utils import is_mac, is_windows, resource_path
except ImportError:  # pragma: no cover
    def is_mac():     return sys.platform == "darwin"
    def is_windows(): return sys.platform.startswith("win")
    def resource_path(p):
        try:
            base = sys._MEIPASS
        except Exception:
            base = os.path.abspath(".")
        return os.path.join(base, p)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_server_alive(host: str = "127.0.0.1", port: int = 8000) -> bool:
    """Return True if the FastAPI backend is reachable on TCP port 8000."""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        alive = s.connect_ex((host, port)) == 0
        s.close()
        return alive
    except Exception:
        return False


# ── macOS implementation (rumps) ──────────────────────────────────────────────

def _make_macos_app(launcher_callback, start_callback, stop_callback):
    """Build the rumps-based GlidePassMenuApp for macOS.

    The class is built lazily so that ``import rumps`` is **never
    executed on a Windows machine**.
    """
    import rumps

    class GlidePassMenuApp(rumps.App):
        def __init__(self):
            super().__init__("GlidePass", quit_button=None)
            self.launcher_callback = launcher_callback
            self.start_callback = start_callback
            self.stop_callback = stop_callback

            icon_path = resource_path("menubar_icon.png")
            if os.path.exists(icon_path):
                self.icon = icon_path
            else:
                self.title = "\U0001F6F0\ufe0f"  # 🛰️
            self.menu = [
                "Server Status: Unknown",
                "Toggle Server",
                None,
                "Show Dashboard",
                None,
                "About GlidePass",
                None,
                "Quit GlidePass",
            ]
            self.menu["Server Status: Unknown"].set_callback(None)

        # NOTE: handle_activation_ was removed — NSApplicationDidBecomeActiveNotification
        # fires for ANY app activation (e.g. bracket input in an IDE) causing random
        # Dock clicks. applicationShouldHandleReopen_hasVisibleWindows_ below handles
        # real Dock icon clicks correctly without false positives.

        def applicationShouldHandleReopen_hasVisibleWindows_(
            self, application, has_visible_windows
        ):
            self.launcher_callback()
            return True

        @rumps.clicked("Show Dashboard")
        def show_dashboard(self, _):
            self.launcher_callback()

        @rumps.clicked("Toggle Server")
        def toggle_server(self, _):
            if _is_server_alive():
                if self.stop_callback:
                    self.stop_callback()
                    rumps.notification(
                        "GlidePass",
                        "Backend Stopped",
                        "Sync services have been paused.",
                    )
            else:
                if self.start_callback:
                    self.start_callback()
                    rumps.notification(
                        "GlidePass",
                        "Backend Started",
                        "Your laptop is now ready to sync.",
                    )

        @rumps.timer(2)
        def sync_state(self, _):
            if _is_server_alive():
                self.menu["Server Status: Unknown"].title = "Server Status: Running \U0001F7E2"
                self.menu["Toggle Server"].title = "Stop Server"
            else:
                self.menu["Server Status: Unknown"].title = "Server Status: Stopped \U0001F534"
                self.menu["Toggle Server"].title = "Start Server"

        @rumps.clicked("Quit GlidePass")
        def custom_quit(self, _):
            if self.stop_callback:
                self.stop_callback()
            try:
                import socket
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.connect(("127.0.0.1", 8001))
                s.sendall(b"QUIT")
                s.close()
            except Exception:
                pass
            rumps.quit_application()

        @rumps.clicked("About GlidePass")
        def about(self, _):
            import subprocess
            msg = "Fast, Private, Cross-Device Sync.\\nCreated by Nithin."
            cmd = f'display dialog "{msg}" with title "GlidePass v1.5.0" buttons {{"OK"}} default button "OK" with icon note'
            subprocess.run(["osascript", "-e", cmd], capture_output=True)

    return GlidePassMenuApp()


# ── Windows / Linux implementation (pystray) ─────────────────────────────────

def _make_pystray_app(launcher_callback, start_callback, stop_callback):
    """Build the pystray-based GlidePassMenuApp for Windows / Linux.

    NOTE: ``pystray.MenuItem`` does NOT expose a settable ``text``
    attribute (it is a read-only property in every pystray backend).
    Calling ``menu_item.text = "..."`` raises::

        AttributeError: property 'text' of 'MenuItem' object has no setter

    To work around this we pass a *callable* as the first argument of
    ``MenuItem``; pystray will re-evaluate the callable on every menu
    render.  We then call ``icon.update_menu()`` from the background
    refresh loop to force the OS shell to re-render the menu.
    """
    import pystray
    from pystray import MenuItem as item
    from PIL import Image

    class GlidePassMenuApp:
        POLL_INTERVAL_SECONDS = 2

        def __init__(self):
            self.launcher_callback = launcher_callback
            self.start_callback = start_callback
            self.stop_callback = stop_callback
            # Live state read by the dynamic text callables below.
            self._server_alive = False

            icon_path = resource_path("menubar_icon.png")
            if os.path.exists(icon_path):
                image = Image.open(icon_path)
            else:
                image = Image.new("RGB", (64, 64), color=(73, 109, 137))

            # Build the menu items (saved as attributes so the
            # background refresh loop can update their text).
            def on_show(icon, item):
                self.launcher_callback()

            def on_toggle(icon, item):
                if _is_server_alive():
                    if self.stop_callback:
                        self.stop_callback()
                else:
                    if self.start_callback:
                        self.start_callback()
                self._refresh_menu()

            def on_about(icon, item):
                try:
                    from tkinter import messagebox
                    messagebox.showinfo(
                        "GlidePass v1.5.0",
                        "Fast, Private, Cross-Device Sync.\nCreated by Nithin.",
                    )
                except Exception:
                    print("GlidePass v1.5.0 \u2013 Fast, Private, Cross-Device Sync.")

            def on_quit(icon, item):
                if self.stop_callback:
                    self.stop_callback()
                try:
                    icon.stop()
                except Exception:
                    pass

            def on_open(icon, item):
                try:
                    cwd = os.getcwd()
                    if is_windows():
                        os.startfile(cwd)  # noqa: S606
                    else:
                        subprocess.Popen(["xdg-open", cwd])
                except Exception:
                    pass

            # Dynamic text callables.  These re-evaluate on every
            # render, so the menu always shows the current state.
            def _status_text(_item=None):
                if self._server_alive:
                    return "Server Status: Running \U0001F7E2"
                return "Server Status: Stopped \U0001F534"

            def _toggle_text(_item=None):
                return "Stop Server" if self._server_alive else "Start Server"

            self._status_item = item(
                _status_text, None, visible=True, enabled=False
            )
            self._toggle_item = item(_toggle_text, on_toggle)
            self._show_item = item("Show Dashboard", on_show)
            self._open_item = item("Open Project Folder", on_open)
            self._about_item = item("About GlidePass", on_about)
            self._quit_item = item("Quit GlidePass", on_quit)

            menu = pystray.Menu(
                self._status_item,
                self._toggle_item,
                pystray.Menu.SEPARATOR,
                self._show_item,
                self._open_item,
                pystray.Menu.SEPARATOR,
                self._about_item,
                pystray.Menu.SEPARATOR,
                self._quit_item,
            )

            self._tray = pystray.Icon("GlidePass", image, "GlidePass", menu)
            self._pystray = pystray

        def _refresh_menu(self):
            """Update the status / toggle labels on the live tray icon.

            ``MenuItem.text`` is read-only in pystray, so we store the
            current state in ``self._server_alive`` (read by the
            callables above) and call ``update_menu()`` so the OS shell
            re-evaluates the callables immediately.
            """
            self._server_alive = _is_server_alive()
            try:
                self._tray.update_menu()
            except Exception:
                # On some backends update_menu may be unavailable; the
                # next click will still pick up the new text.
                pass

        def run(self):
            import threading
            import time

            def _refresh_loop():
                while True:
                    try:
                        self._refresh_menu()
                    except Exception:
                        pass
                    time.sleep(self.POLL_INTERVAL_SECONDS)

            threading.Thread(target=_refresh_loop, daemon=True).start()
            self._refresh_menu()
            self._tray.run()

        # Convenience shims so callers can use the same methods
        # as the macOS class (show_dashboard, toggle_server, about, custom_quit).
        def show_dashboard(self, *args):
            self.launcher_callback()

        def toggle_server(self, *args):
            if _is_server_alive() and self.stop_callback:
                self.stop_callback()
            elif self.start_callback:
                self.start_callback()
            self._refresh_menu()

        def about(self, *args):
            try:
                from tkinter import messagebox
                messagebox.showinfo(
                    "GlidePass v1.5.0",
                    "Fast, Private, Cross-Device Sync.\nCreated by Nithin.",
                )
            except Exception:
                print("GlidePass v1.5.0 \u2013 Fast, Private, Cross-Device Sync.")

        def custom_quit(self, *args):
            if self.stop_callback:
                self.stop_callback()
            try:
                self._tray.stop()
            except Exception:
                pass

    return GlidePassMenuApp()


# ── Public factory (used by main.py) ─────────────────────────────────────────

def start_menubar(launcher_callback, start_callback=None, stop_callback=None):
    """Pick the right backend for the current OS and start the tray icon."""
    if is_mac():
        app = _make_macos_app(launcher_callback, start_callback, stop_callback)
    else:
        app = _make_pystray_app(launcher_callback, start_callback, stop_callback)
    app.run()


# ── Public class alias (used by main.py: ``from menubar_handler import
#     GlidePassMenuApp``) ───────────────────────────────────────────────────────

if is_mac():
    # macOS – re-export the rumps-based class
    _AppClass = _make_macos_app  # this is a *function*, not the class
    # We re-create the class eagerly so the import works as expected.
    import rumps as _rumps

    # Build a *real* class with the right base.  We do this once at
    # import-time on a Mac.
    class _GlidePassMenuAppBase(_rumps.App):
        def __init__(self, launcher_callback, start_callback=None, stop_callback=None):
            super().__init__("GlidePass", quit_button=None)
            self.launcher_callback = launcher_callback
            self.start_callback = start_callback
            self.stop_callback = stop_callback

            icon_path = resource_path("menubar_icon.png")
            if os.path.exists(icon_path):
                self.icon = icon_path
            else:
                self.title = "\U0001F6F0\ufe0f"
            self.menu = [
                "Server Status: Unknown", "Toggle Server", None,
                "Show Dashboard", None, "About GlidePass", None,
                "Quit GlidePass",
            ]
            self.menu["Server Status: Unknown"].set_callback(None)
            # NOTE: We intentionally do NOT subscribe to
            # NSApplicationDidBecomeActiveNotification here.  That notification
            # fires for every app-activation event (including spurious ones
            # triggered by typing brackets/parens in an IDE), which caused the
            # dashboard to pop open and random Dock items to be clicked.
            # applicationShouldHandleReopen_hasVisibleWindows_ (below) is the
            # correct and sole handler for real Dock icon clicks.

        def applicationShouldHandleReopen_hasVisibleWindows_(
            self, application, has_visible_windows
        ):
            self.launcher_callback()
            return True

        @_rumps.clicked("Show Dashboard")
        def show_dashboard(self, _):
            self.launcher_callback()

        @_rumps.clicked("Toggle Server")
        def toggle_server(self, _):
            if _is_server_alive():
                if self.stop_callback:
                    self.stop_callback()
                    _rumps.notification(
                        "GlidePass", "Backend Stopped",
                        "Sync services have been paused.",
                    )
            else:
                if self.start_callback:
                    self.start_callback()
                    _rumps.notification(
                        "GlidePass", "Backend Started",
                        "Your laptop is now ready to sync.",
                    )

        @_rumps.timer(2)
        def sync_state(self, _):
            if _is_server_alive():
                self.menu["Server Status: Unknown"].title = "Server Status: Running \U0001F7E2"
                self.menu["Toggle Server"].title = "Stop Server"
            else:
                self.menu["Server Status: Unknown"].title = "Server Status: Stopped \U0001F534"
                self.menu["Toggle Server"].title = "Start Server"

        @_rumps.clicked("Quit GlidePass")
        def custom_quit(self, _):
            if self.stop_callback:
                self.stop_callback()
            try:
                import socket
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.connect(("127.0.0.1", 8001))
                s.sendall(b"QUIT")
                s.close()
            except Exception:
                pass
            _rumps.quit_application()

        @_rumps.clicked("About GlidePass")
        def about(self, _):
            import subprocess
            msg = "Fast, Private, Cross-Device Sync.\\nCreated by Nithin."
            cmd = f'display dialog "{msg}" with title "GlidePass v1.5.0" buttons {{"OK"}} default button "OK" with icon note'
            subprocess.run(["osascript", "-e", cmd], capture_output=True)

    GlidePassMenuApp = _GlidePassMenuAppBase  # type: ignore[assignment,misc]

else:
    # Windows / Linux – re-export the pystray-based class
    class GlidePassMenuApp:  # noqa: F811 – intentional redefinition
        def __init__(self, launcher_callback, start_callback=None, stop_callback=None):
            self._inner = _make_pystray_app(launcher_callback, start_callback, stop_callback)
            self.launcher_callback = launcher_callback
            self.start_callback = start_callback
            self.stop_callback = stop_callback

        def run(self):
            self._inner.run()

        def show_dashboard(self, *args):
            self._inner.show_dashboard(*args)

        def toggle_server(self, *args):
            self._inner.toggle_server(*args)

        def about(self, *args):
            self._inner.about(*args)

        def custom_quit(self, *args):
            self._inner.custom_quit(*args)

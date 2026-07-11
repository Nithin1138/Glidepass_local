import tkinter as tk
from tkinter import messagebox
import os
import signal
import socket
import sys
import math
import re
import threading
from PIL import Image, ImageTk, ImageOps
import urllib.request
import urllib.parse
import io
import ssl
import json
import time
import queue

try:
    import certifi
    ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Windows High-DPI awareness.
#
# On Windows hosts (including the VM the user is testing in) the system
# DPI scale is typically 125% / 150% / 200%.  If the process does NOT
# declare DPI awareness *before* tk.Tk() is created, Tk calculates
# geometry in physical pixels while the OS window manager scales the
# window using the system scale factor, so a "400x760" window renders
# *much* larger than expected (and the contents look blurry).
#
# We configure DPI settings so that Windows handles scaling uniformly, 
# preventing overlaps of fonts and layout boxes on high-DPI monitors.
# We prefer ``DPI_AWARENESS_CONTEXT_UNAWARE_GDISCALED`` (crisp text + unaware scaling) 
# and fall back to standard DPI unawareness for perfect layout preservation.
# ---------------------------------------------------------------------------
def _enable_windows_dpi_awareness():
    if not sys.platform.startswith("win"):
        return
    try:
        import ctypes
        try:
            # GDI-scaled unaware mode (crisp text, OS-managed layout scaling, Win10 1809+)
            ctypes.windll.user32.SetProcessDpiAwarenessContext(
                ctypes.c_void_p(-5)  # DPI_AWARENESS_CONTEXT_UNAWARE_GDISCALED
            )
            return
        except Exception:
            pass
        try:
            # Fall back to standard DPI unawareness (bitmap stretched scaling, perfect layout)
            ctypes.windll.shcore.SetProcessDpiAwareness(0)  # PROCESS_DPI_UNAWARE
            return
        except Exception:
            pass
    except Exception:
        pass


_enable_windows_dpi_awareness()

# Cross-platform helpers (lazy import so the launcher works on Windows too)
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



# ── Canvas drawing helpers ────────────────────────────────────────────────────

def rounded_rect(canvas, x1, y1, x2, y2, r=16, **kw):
    """Draw a smooth rounded rectangle on a Canvas."""
    pts = []
    # Top Left
    for i in range(180, 270, 5):
        pts.extend([x1 + r + r * math.cos(math.radians(i)), y1 + r + r * math.sin(math.radians(i))])
    # Top Right
    for i in range(270, 360, 5):
        pts.extend([x2 - r + r * math.cos(math.radians(i)), y1 + r + r * math.sin(math.radians(i))])
    # Bottom Right
    for i in range(0, 90, 5):
        pts.extend([x2 - r + r * math.cos(math.radians(i)), y2 - r + r * math.sin(math.radians(i))])
    # Bottom Left
    for i in range(90, 180, 5):
        pts.extend([x1 + r + r * math.cos(math.radians(i)), y2 - r + r * math.sin(math.radians(i))])
    return canvas.create_polygon(pts, smooth=False, **kw)


def blend_hex(c1: str, c2: str, t: float) -> str:
    """Linearly blend two hex colours; t=1 → c1, t=0 → c2."""
    r1, g1, b1 = int(c1[1:3], 16), int(c1[3:5], 16), int(c1[5:7], 16)
    r2, g2, b2 = int(c2[1:3], 16), int(c2[3:5], 16), int(c2[5:7], 16)
    return (f"#{int(r1*t + r2*(1-t)):02x}"
            f"{int(g1*t + g2*(1-t)):02x}"
            f"{int(b1*t + b2*(1-t)):02x}")


def safe_urlopen(url_or_req, timeout=4):
    import urllib.request
    import ssl
    import urllib.error
    try:
        ctx = ssl._create_unverified_context()
        return urllib.request.urlopen(url_or_req, timeout=timeout, context=ctx)
    except urllib.error.URLError as e:
        if "CERTIFICATE_VERIFY_FAILED" in str(e):
            return urllib.request.urlopen(url_or_req, timeout=timeout)
        raise


def calculate_days_left(expires_at_str):
    try:
        from datetime import datetime, timezone
        s = expires_at_str.replace("Z", "+00:00")
        if "." in s:
            base, tz = s.split("+") if "+" in s else (s, "00:00")
            base_parts = base.split(".")
            sec = base_parts[0]
            ms = base_parts[1][:6]
            s = f"{sec}.{ms}+{tz}"
        expiry_dt = datetime.fromisoformat(s)
        now_dt = datetime.now(timezone.utc)
        delta = expiry_dt - now_dt
        days = delta.days
        if delta.total_seconds() > 0 and days == 0:
            return 1
        return max(0, days)
    except Exception as e:
        print(f"Error calculating days left: {e}")
        return 30


def format_time_left(expires_at_str):
    try:
        from datetime import datetime, timezone
        s = expires_at_str.replace("Z", "+00:00")
        if "." in s:
            base, tz = s.split("+") if "+" in s else (s, "00:00")
            base_parts = base.split(".")
            sec = base_parts[0]
            ms = base_parts[1][:6]
            s = f"{sec}.{ms}+{tz}"
        expiry_dt = datetime.fromisoformat(s)
        now_dt = datetime.now(timezone.utc)
        delta = expiry_dt - now_dt
        total_seconds = delta.total_seconds()
        
        if total_seconds <= 0:
            return None
            
        days = int(total_seconds // 86400)
        hours = int((total_seconds % 86400) // 3600)
        mins = int((total_seconds % 3600) // 60)
        
        if days > 0:
            return f"{days}d {hours}h left"
        elif hours > 0:
            return f"{hours}h {mins}m left"
        else:
            return f"{mins}m left"
    except Exception as e:
        print(f"Error calculating time left: {e}")
        return None


# ── QR code generation ───────────────────────────────────────────────────────

def _generate_qr_image(data: str, size: int = 200):
    """Return a PIL.Image QR code for ``data`` at the given pixel size.

    Strategy:
      1. Try the local ``qrcode`` library (preferred – works offline,
         so the VM never needs internet access to render the code).
      2. Fall back to the public ``api.qrserver.com`` service.
      3. Final fallback: render a simple placeholder image so the
         layout never breaks even if both paths fail.
    """
    # 1. Local library (works in VM, no internet needed)
    try:
        import qrcode  # type: ignore
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=2,
        )
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        return img
    except Exception:
        pass

    # 2. Remote service (requires internet access)
    try:
        url = (
            "https://api.qrserver.com/v1/create-qr-code/"
            f"?size={size}x{size}&data={urllib.parse.quote(data, safe='')}"
        )
        with urllib.request.urlopen(url, timeout=4) as resp:
            img = Image.open(io.BytesIO(resp.read())).convert("RGB")
            img = img.resize((size, size), Image.Resampling.LANCZOS)
            return img
    except Exception:
        pass

    # 3. Placeholder fallback (e.g. when the qrcode lib isn't installed
    # and the user is offline).  A simple hatched grid is rendered so
    # the user can still see that "something" appeared in the slot.
    img = Image.new("RGB", (size, size), color="#121212")
    try:
        from PIL import ImageDraw
        d = ImageDraw.Draw(img)
        d.rectangle((0, 0, size - 1, size - 1), outline="#A0AEC0", width=4)
        d.text((size // 2 - 60, size // 2 - 8),
               "QR offline", fill="#A0AEC0")
    except Exception:
        pass
    return img


# ── App ───────────────────────────────────────────────────────────────────────

class LANpadLauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("LANpad")
        # The fixed logical size of the dashboard.  With DPI awareness
        # enabled above, this is the *actual* pixel size of the window
        # on Windows, so a 400x760 window really is 400x760 in
        # screen-real-estate terms.
        self.root.geometry("400x760")
        self.root.configure(bg="#060606")
        self.root.resizable(False, False)
        self.process = None
        self._tunnel_process = None
        self._tunnel_url = None
        self._active_tab = "local"

        # On Windows, automatically register a Start Menu shortcut on first launch
        if is_windows():
            try:
                self._register_windows_start_menu_shortcut()
            except Exception:
                pass

        # Set proper app icon (title bar + Dock) so the window no
        # longer shows the default Tkinter feather.
        self._set_app_icon()

        # macOS: apply native titlebar styling ONLY (no activation/focus stealing)
        if sys.platform == "darwin":
            try:
                from AppKit import NSApp, NSWindowStyleMaskFullSizeContentView
                # Do NOT call activateIgnoringOtherApps_ here — it would
                # forcibly steal keyboard focus away from whatever the user
                # is currently typing in (e.g. Chrome, Xcode, an IDE).
                self.root.update_idletasks()
                for win in NSApp.windows():
                    if win.title() == "LANpad":
                        win.setTitlebarAppearsTransparent_(True)
                        win.setTitleVisibility_(1)
                        win.setStyleMask_(
                            win.styleMask() | NSWindowStyleMaskFullSizeContentView
                        )
            except Exception as e:
                print(f"Native styling: {e}")

        self.root.lift()
        # Do NOT call focus_force() here — it steals keyboard focus from
        # other apps (e.g. a browser-based code editor) every time the
        # launcher window opens.

        self.root.createcommand("::tk::mac::ReopenApplication", self.show_window)
        self.root.createcommand("::tk::mac::Quit", self.on_quit)

        # ── Design tokens ────────────────────────────────────────────────────
        self.BG     = "#000000" # Pure Black
        self.BG2    = "#121212" # Blackish grey
        self.AMBER  = "#48BB78" # Green
        self.ORANGE = "#48BB78" # Green
        self.RED    = "#ff453a"
        self.GREEN  = "#48BB78" # Green
        self.WHITE  = "#F5F5F5" # Off-White
        self.DIM    = "#A0AEC0" # Cool grey for muted text
        self.BORDER = "#121212" # Blackish grey

        # Fonts (SF Pro on macOS, Segoe UI / Consolas on Windows)
        _mac = sys.platform == "darwin"
        self.FD = "SF Pro Display" if _mac else "Segoe UI"   # display
        self.FU = "SF Pro Text"    if _mac else "Segoe UI"   # UI
        self.FM = "SF Mono"        if _mac else "Consolas"   # mono

        # Animation state
        self._dot_tick  = 0
        self._server_on = False

        # Thread-safe GUI queue
        self.gui_queue = queue.Queue()
        self.process_gui_queue()
        self.update_in_progress = False
        self.monetization_enabled = False
        self.free_enabled = False
        self.connected_hubs = []
        self.session_deleted_files = []

        # ── View containers ───────────────────────────────────────────────────
        self.main_view   = tk.Frame(root, bg=self.BG)
        self.lock_view   = tk.Frame(root, bg=self.BG)
        self.splash_view = tk.Frame(root, bg=self.BG)
        self.legal_view  = tk.Frame(root, bg=self.BG)
        self.files_view  = tk.Frame(root, bg=self.BG)
        self.remote_view = tk.Frame(root, bg=self.BG)
        self.main_view.place(x=0, y=0, relwidth=1, relheight=1)
        self.lock_view.place(x=0, y=0, relwidth=1, relheight=1)
        self.splash_view.place(x=0, y=0, relwidth=1, relheight=1)
        self.legal_view.place(x=0, y=0, relwidth=1, relheight=1)
        self.files_view.place(x=0, y=0, relwidth=1, relheight=1)
        self.remote_view.place(x=0, y=0, relwidth=1, relheight=1)

        self._build_main()
        self._build_lock()
        self._build_splash()
        self._build_legal()
        self._build_files()
        self._build_remote()

        self._tick_dot()
        self.check_process_status()
        
        # Check if we have a valid cached license to skip splash
        has_valid_cache = False
        try:
            license_path = os.path.expanduser("~/.lanpad_license.json")
            if os.path.exists(license_path):
                import json
                with open(license_path, "r", encoding="utf-8") as f:
                    lic = json.load(f)
                if time.time() - lic.get("last_checked", 0) < 86400:
                    has_valid_cache = True
        except Exception:
            pass

        if has_valid_cache:
            self.show_view("main")
        else:
            self.show_view("splash")
            
        self.root.after(200, self.check_monetization_status)
        self.start_license_loop()
        
        self.root.after(2000, self.check_for_updates)
        self._poll_tunnel()
        self.root.after(200, self.start_mobile_progress_polling)

    def process_gui_queue(self):
        try:
            while True:
                fn = self.gui_queue.get_nowait()
                try:
                    fn()
                except Exception as e:
                    print(f"[gui] Queue execution error: {e}")
        except queue.Empty:
            pass
        self.root.after(50, self.process_gui_queue)

    # ── Shared drawing utilities ──────────────────────────────────────────────

    def _paint_orbs(self, canvas, w, h):
        """Paint ambient light orbs on the given canvas."""
        # Warm amber orb — top-left
        for r in range(160, 0, -8):
            c = blend_hex("#f59e0b", self.BG, r / 160 * 0.20)
            canvas.create_oval(-70, -90, -70 + r * 2, -90 + r * 2, fill=c, outline="")
        # Soft orange orb — bottom-right
        for r in range(110, 0, -6):
            c = blend_hex("#d97757", self.BG, r / 110 * 0.13)
            canvas.create_oval(w - 55 - r, h - 160 - r,
                               w - 55 + r, h - 160 + r, fill=c, outline="")


    def _register_windows_start_menu_shortcut(self):
        """Automatically create a Start Menu shortcut on Windows first run."""
        try:
            exe_path = sys.executable if getattr(sys, 'frozen', False) else os.path.abspath(sys.argv[0])
            appdata = os.environ.get("APPDATA")
            if not appdata:
                return
            
            shortcut_path = os.path.join(appdata, "Microsoft", "Windows", "Start Menu", "Programs", "LANpad.lnk")
            
            # Check if shortcut already exists
            if not os.path.exists(shortcut_path):
                import subprocess
                ps_cmd = (
                    f'$wshell = New-Object -ComObject WScript.Shell; '
                    f'$shortcut = $wshell.CreateShortcut("{shortcut_path}"); '
                    f'$shortcut.TargetPath = "{exe_path}"; '
                    f'$shortcut.WorkingDirectory = "{os.path.dirname(exe_path)}"; '
                    f'$shortcut.Save()'
                )
                subprocess.Popen(
                    ["powershell", "-Command", ps_cmd],
                    creationflags=0x08000000, # CREATE_NO_WINDOW
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                print("[win] Automatically registered Start Menu shortcut.")
        except Exception as e:
            print(f"[win] Failed to register Start Menu shortcut: {e}")

    # ── App icon (title bar + Dock) ──────────────────────────────────────
    def _set_app_icon(self):
        """Apply the LANpad logo as the window + Dock icon.

        On macOS we also set the NSApplication's ``applicationIconImage``
        so the Dock shows the proper icon (Tk on macOS only changes
        the title bar, not the Dock).  On Windows we call
        ``iconbitmap`` which uses the embedded ``.ico`` so the taskbar
        shows the right icon at all DPI levels.
        """
        try:
            png_path = resource_path("logo_final_square.png") if os.path.exists(resource_path("logo_final_square.png")) else resource_path("logo.png")
            ico_path = resource_path("LANpad.ico")
            icns_path = resource_path("LANpad.icns")

            # Cross-platform: keep a PhotoImage alive so Tk does not
            # garbage-collect it and revert to the default icon.
            # On macOS, we do NOT call root.iconphoto because:
            # 1. Tkinter's internal macOS implementation overrides the Dock icon and causes it to become a sharp square.
            # 2. macOS windows do not display title bar icons.
            # 3. The Dock icon is managed natively by the OS (via Info.plist when frozen) or by AppKit (in development).
            if not is_mac():
                self._app_icon_png = ImageTk.PhotoImage(
                    Image.open(png_path).resize((128, 128), Image.Resampling.LANCZOS)
                    if os.path.exists(png_path)
                    else Image.new("RGB", (128, 128), "#000000")
                )
                try:
                    self.root.iconphoto(True, self._app_icon_png)
                except Exception:
                    pass

            # Windows: ``iconbitmap`` is the only way to set the taskbar
            # icon correctly.  It MUST be a real .ico file – png won't
            # work on Windows.
            if is_windows() and os.path.exists(ico_path):
                try:
                    self.root.iconbitmap(default=ico_path)
                except Exception:
                    pass

            # macOS: only set the Dock icon in development mode.
            # In a bundled app (frozen), the OS handles the dock icon automatically from Info.plist.
            # Overwriting it dynamically causes macOS to draw a flat image wrapper (often with white margins).
            if is_mac():
                try:
                    import sys
                    if not getattr(sys, 'frozen', False):
                        from AppKit import NSApplication, NSImage
                        src_path = icns_path if os.path.exists(icns_path) else png_path
                        if os.path.exists(src_path):
                            img = NSImage.alloc().initWithContentsOfFile_(src_path)
                            NSApplication.sharedApplication().setApplicationIconImage_(img)
                except Exception:
                    pass
        except Exception as e:
            # Never let an icon failure crash the app.
            pass

    def _pill_button(self, parent, text, fg, fill, cmd=None, side="right"):
        """Draw a pill-shaped label button on a Canvas widget."""
        _mac = sys.platform == "darwin"
        tw = len(text) * (7 if _mac else 10) + (30 if _mac else 40)
        cv = tk.Canvas(parent, width=tw, height=28, bg=self.BG, highlightthickness=0)
        cv.pack(side=side, padx=18, pady=(24, 0))
        rounded_rect(cv, 2, 2, tw - 2, 26, r=12, fill=fill, outline="")
        cv.create_text(tw // 2, 14, text=text, fill=fg,
                       font=(self.FU, 11, "bold"))
        if cmd:
            def handler(e): cmd()
            cv.bind("<Button-1>", handler)
            cv.tag_bind("all", "<Button-1>", handler)
            cv.config(cursor="hand2")
        return cv

    # ── MAIN VIEW ────────────────────────────────────────────────────────────

    def _build_main(self):
        v  = self.main_view
        W  = 400
        _mac = sys.platform == "darwin"
        yo = 0 if _mac else 12  # Y-offset for Windows spacing

        # Flat background
        bg_cv = tk.Canvas(v, width=W, height=760, bg=self.BG, highlightthickness=0)
        bg_cv.place(x=0, y=0)

        # ── Titlebar (Native Layout) ─────────────────────────────────────────
        tb = tk.Frame(v, bg=self.BG, height=60)
        tb.place(x=0, y=0, relwidth=1)

        # ── Status row ───────────────────────────────────────────────────────
        sr = tk.Frame(v, bg=self.BG)
        sr.place(x=24, y=68 + (0 if _mac else 4))
        self._dot_cv = tk.Canvas(sr, width=8, height=8, bg=self.BG, highlightthickness=0)
        self._dot_cv.pack(side="left")
        self._dot_id = self._dot_cv.create_oval(1, 1, 7, 7, fill=self.DIM, outline="")
        self._status_lbl = tk.Label(sr, text="Awaiting Sync",
                                    font=(self.FU, 10, "bold"),
                                    bg=self.BG, fg=self.DIM, bd=0, highlightthickness=0)
        self._status_lbl.pack(side="left", padx=(8, 0))

        # Connected Devices Status Label (placed on the right side)
        self._conn_lbl = tk.Label(v, text="0 Connected",
                                  font=(self.FU, 10, "bold"),
                                  bg=self.BG, fg=self.DIM, anchor="e", bd=0, highlightthickness=0)
        self._conn_lbl.place(x=376, y=68 + (0 if _mac else 4), anchor="ne")

        self._plan_lbl = tk.Label(v, text="Plan: BASIC  •  Upgrade",
                                  font=(self.FU, 9, "bold"),
                                  bg=self.BG, fg="#0077C0", anchor="e", bd=0, highlightthickness=0, cursor="hand2")
        self._plan_lbl.bind("<Button-1>", lambda e: self.show_view("lock"))
        self.load_cached_monetization()

        # ── Hero text ────────────────────────────────────────────────────────
        title_frame = tk.Frame(v, bg=self.BG)
        title_frame.place(x=24, y=96 + yo)

        try:
            self._main_logo_img = Image.open(resource_path("logo.png"))
            # Original aspect ratio: 596 x 419 (~1.42)
            # Desired height: 36 -> Width: 51
            self._main_logo_img = self._main_logo_img.resize((51, 36), Image.Resampling.LANCZOS)
            self._main_logo_tk = ImageTk.PhotoImage(self._main_logo_img)
            logo_lbl = tk.Label(title_frame, image=self._main_logo_tk, bg=self.BG, bd=0, highlightthickness=0)
            logo_lbl.pack(side="left", anchor="center")
            padx_text = 10 if _mac else 18
        except Exception as e:
            padx_text = 0

        tk.Label(title_frame, text="LANpad", font=(self.FD, 28, "bold"),
                 bg=self.BG, fg=self.WHITE, anchor="w", bd=0, highlightthickness=0).pack(side="left", padx=(padx_text, 0), anchor="center")
        tk.Label(v,
                 text="Bridge your devices locally.",
                 font=(self.FU, 14), bg=self.BG, fg=self.DIM,
                 anchor="w", justify="left", bd=0, highlightthickness=0).place(x=24, y=136 + yo * 1.5)

        # Tab selector frame
        tab_h = 40 if _mac else 46
        self._tab_frame = tk.Frame(v, bg=self.BG)
        self._tab_frame.place(x=24, y=184 + yo * 2, width=W - 48, height=tab_h + 2)
        
        # Local Tab
        self._tab_local = tk.Canvas(self._tab_frame, width=(W - 48)//2 - 4, height=tab_h, bg=self.BG, highlightthickness=0)
        self._tab_local.pack(side="left", padx=(0, 4))
        
        # Tunnel Tab
        self._tab_tunnel = tk.Canvas(self._tab_frame, width=(W - 48)//2 - 4, height=tab_h, bg=self.BG, highlightthickness=0)
        self._tab_tunnel.pack(side="left")

        def click_local(e):
            if self._active_tab != "local":
                self._active_tab = "local"
                self._draw_tabs()
                self._update_display()
                
        def click_tunnel(e):
            # Enforce Basic plan restrictions
            license_path = os.path.expanduser("~/.lanpad_license.json")
            tier = "Basic"
            if os.path.exists(license_path):
                try:
                    import json
                    with open(license_path, "r", encoding="utf-8") as f:
                        lic_data = json.load(f)
                        tier = lic_data.get("tier", "Basic")
                except Exception:
                    pass
            try:
                import urllib.request
                import json
                req = urllib.request.Request("https://lanpad.app/api/monetization/status", headers={"User-Agent": "LANpad App"})
                with urllib.request.urlopen(req, timeout=2) as resp:
                    status_data = json.loads(resp.read().decode("utf-8"))
                    if not status_data.get("monetization_enabled", False):
                        tier = "DEVELOPER"
            except Exception:
                pass

            # Check if plan allows Hybrid Relay (Tunnel Mode)
            allow_tunnel = True
            plans = []
            try:
                mon_path = os.path.expanduser("~/.lanpad_monetization.json")
                if os.path.exists(mon_path):
                    import json
                    with open(mon_path, "r", encoding="utf-8") as f:
                        mon_data = json.load(f)
                    if mon_data.get("monetization_enabled", False):
                        allow_tunnel = False
                        plans = mon_data.get("plans", [])
                        for plan in plans:
                            if plan.get("tier", "").lower() == tier.lower():
                                if plan.get("allow_tunnel") != -1:
                                    allow_tunnel = True
                                break
            except Exception as e:
                print(f"[monetization] Error checking tunnel permission: {e}")

            if not allow_tunnel:
                try:
                    allowed_plans = [p.get("title", p.get("tier")) for p in plans if p.get("allow_tunnel") != -1]
                    plans_str = ", ".join(allowed_plans)
                except Exception:
                    plans_str = "Pro and Creator plans"
                
                messagebox.showwarning("Upgrade Required", f"Hybrid Relay (Tunnel Mode) is only available on {plans_str}. Please upgrade your package.")
                return

            if self._active_tab != "tunnel":
                self._active_tab = "tunnel"
                self._draw_tabs()
                self._update_display()
                
        self._tab_local.bind("<Button-1>", click_local)
        self._tab_tunnel.bind("<Button-1>", click_tunnel)
        self._tab_local.config(cursor="hand2")
        self._tab_tunnel.config(cursor="hand2")

        # ── QR card ──────────────────────────────────────────────────────────
        self._qr_cv = tk.Canvas(v, width=W - 48, height=240,
                                 bg=self.BG, highlightthickness=0)
        self._qr_cv.place(x=24, y=234 + yo * 2.2)
        self._draw_qr_empty()
        self._draw_tabs()

        # ── IP pill ──────────────────────────────────────────────────────────
        self._ip_cv = tk.Canvas(v, width=W - 48, height=50,
                                 bg=self.BG, highlightthickness=0)
        self._ip_cv.place(x=24, y=482 + yo * 2.2)
        self._ip_text = "http://0.0.0.0:8000"
        
        def copy_ip_to_clipboard(e=None):
            self.root.clipboard_clear()
            self.root.clipboard_append(self._ip_text)
            # visual feedback
            c = self._ip_cv
            c.delete("all")
            W_val = int(c["width"])
            H_val = int(c["height"])
            rounded_rect(c, 0, 2, W_val, H_val - 2, r=10, fill="#0077C0", outline="#0077C0")
            c.create_text(W_val // 2, H_val // 2, text="Link Copied to Clipboard!", font=(self.FU, 10, "bold"), fill=self.WHITE, anchor="center")
            self.root.after(1200, lambda: self._draw_ip(self._server_on))

        self._ip_cv.bind("<Button-1>", copy_ip_to_clipboard)
        self._ip_cv.config(cursor="hand2")
        self._draw_ip(False)

        # ── Session Token Label ──────────────────────────────────────────────
        self._sid_lbl = tk.Label(v, text="Session Token: Off", font=(self.FU, 8, "bold"), bg=self.BG, fg=self.DIM, cursor="hand2")
        self._sid_lbl.place(x=0, y=536 + yo * 2.2, relwidth=1, anchor="nw")
        
        def update_sid_display():
            try:
                from app import SESSION_TOKEN
            except ImportError:
                SESSION_TOKEN = None
            if self._server_on and SESSION_TOKEN:
                self._sid_lbl.config(text=f"Session Token: {SESSION_TOKEN}  (Click to Copy)", fg="#0077C0")
            else:
                self._sid_lbl.config(text="Session Token: Off", fg=self.DIM)
                
        def copy_sid_to_clipboard(e=None):
            try:
                from app import SESSION_TOKEN
            except ImportError:
                SESSION_TOKEN = None
            if SESSION_TOKEN and self._server_on:
                self.root.clipboard_clear()
                self.root.clipboard_append(SESSION_TOKEN)
                self._sid_lbl.config(text="Token Copied to Clipboard!", fg="#00C853")
                self.root.after(1200, update_sid_display)
                
        self._sid_lbl.bind("<Button-1>", copy_sid_to_clipboard)
        self._update_sid_display = update_sid_display

        # ── Info row (Port / Protocol / State) ───────────────────────────────
        cw = (W - 48 - 12) // 3
        info_y = 554 + yo * 2.5
        info_specs = [("Port", "8000"), ("Protocol", "HTTP"), ("State", "Off")]
        self._info_cards = {}
        for i, (lbl, default) in enumerate(info_specs):
            cv = tk.Canvas(v, width=cw, height=64, bg=self.BG, highlightthickness=0)
            cv.place(x=24 + i * (cw + 6), y=info_y)
            rounded_rect(cv, 0, 0, cw, 64, r=12, fill=self.BG2, outline=self.BORDER)
            cv.create_text(cw // 2, 18, text=lbl.upper(),
                           font=(self.FU, 8, "bold"), fill=self.DIM)
            tid = cv.create_text(cw // 2, 44, text=default,
                                 font=(self.FM, 14, "bold"), fill=self.DIM)
            self._info_cards[lbl] = (cv, tid)

        # ── Action button ────────────────────────────────────────────────────
        self._btn_cv = tk.Canvas(v, width=W - 48, height=58,
                                  bg=self.BG, highlightthickness=0)
        self._btn_cv.place(x=24, y=626 + yo * 2.5)
        self._draw_main_btn(active=False)

        # Open Received Files / Send/Receive Buttons
        def open_shared_folder():
            import os
            import subprocess
            import platform
            path = os.path.expanduser("~/Downloads/LANpad")
            if not os.path.exists(path):
                os.makedirs(path, exist_ok=True)
            if platform.system() == "Darwin":
                subprocess.Popen(["open", path])
            elif platform.system() == "Windows":
                os.startfile(path)
            else:
                subprocess.Popen(["xdg-open", path])

        def open_send_receive():
            self.show_view("files")

        self._send_receive_btn = tk.Label(v, text="Send/Receive", fg=self.WHITE,
                                          bg=self.BG2, font=(self.FU, 10, "bold"),
                                          highlightthickness=1, highlightbackground="#2A2A30",
                                          cursor="hand2")
        self._send_receive_btn.place(x=24, y=690 + yo * 2.4, width=(W - 48) // 2 - 6, height=36)
        self._send_receive_btn.bind("<Button-1>", lambda e: open_send_receive())
        self._send_receive_btn.bind("<Enter>", lambda e: self._send_receive_btn.config(highlightbackground=self.WHITE))
        self._send_receive_btn.bind("<Leave>", lambda e: self._send_receive_btn.config(highlightbackground="#2A2A30"))

        self._files_btn = tk.Label(v, text="Open Files", fg=self.WHITE,
                                   bg=self.BG2, font=(self.FU, 10, "bold"),
                                   highlightthickness=1, highlightbackground="#2A2A30",
                                   cursor="hand2")
        self._files_btn.place(x=24 + (W - 48) // 2 + 6, y=690 + yo * 2.4, width=(W - 48) // 2 - 6, height=36)
        self._files_btn.bind("<Button-1>", lambda e: open_shared_folder())
        self._files_btn.bind("<Enter>", lambda e: self._files_btn.config(highlightbackground=self.WHITE))
        self._files_btn.bind("<Leave>", lambda e: self._files_btn.config(highlightbackground="#2A2A30"))

        # ── Footer ───────────────────────────────────────────────────────────
        tk.Label(v, text="Ensure server is running on your laptop.",
                 font=(self.FU, 9), bg=self.BG, fg=self.DIM, bd=0, highlightthickness=0).place(
                 x=0, y=726 + yo * 2.2, relwidth=1, anchor="nw")

    def _draw_tabs(self):
        # Local tab
        c_local = self._tab_local
        c_local.delete("all")
        w_l = int(c_local["width"])
        h_l = int(c_local["height"])
        _mac = sys.platform == "darwin"
        text_y_offset = 0 if _mac else 1
        
        if self._active_tab == "local":
            rounded_rect(c_local, 2, 2, w_l - 2, h_l - 2, r=8, fill=self.BG2, outline=self.GREEN)
            c_local.create_text(w_l // 2, h_l // 2 + text_y_offset, text="Direct LAN", fill=self.WHITE, font=(self.FU, 12, "bold"))
        else:
            rounded_rect(c_local, 2, 2, w_l - 2, h_l - 2, r=8, fill=self.BG, outline="#222222")
            c_local.create_text(w_l // 2, h_l // 2 + text_y_offset, text="Direct LAN", fill=self.DIM, font=(self.FU, 12))
            
        # Tunnel tab
        c_tunnel = self._tab_tunnel
        c_tunnel.delete("all")
        w_t = int(c_tunnel["width"])
        h_t = int(c_tunnel["height"])
        
        if self._active_tab == "tunnel":
            rounded_rect(c_tunnel, 2, 2, w_t - 2, h_t - 2, r=8, fill=self.BG2, outline=self.GREEN)
            c_tunnel.create_text(w_t // 2, h_t // 2 + text_y_offset, text="Hybrid Relay", fill=self.WHITE, font=(self.FU, 12, "bold"))
        else:
            rounded_rect(c_tunnel, 2, 2, w_t - 2, h_t - 2, r=8, fill=self.BG, outline="#222222")
            c_tunnel.create_text(w_t // 2, h_t // 2 + text_y_offset, text="Hybrid Relay", fill=self.DIM, font=(self.FU, 12))

    def _draw_qr_loading(self):
        c = self._qr_cv
        c.delete("all")
        W, H = int(c["width"]), int(c["height"])
        rounded_rect(c, 0, 0, W, H, r=16, fill=self.BG2, outline=self.BORDER)
        cx, cy = W // 2, H // 2
        c.create_text(cx, cy - 14, text="Establishing Tunnel...", font=(self.FU, 16, "bold"), fill=self.ORANGE)
        c.create_text(cx, cy + 14, text="Fetching public secure link over Port 443",
                      font=(self.FU, 11), fill=self.DIM)

    def _show_tunnel_status(self, text):
        c = self._qr_cv
        c.delete("all")
        W, H = int(c["width"]), int(c["height"])
        rounded_rect(c, 0, 0, W, H, r=16, fill=self.BG2, outline=self.BORDER)
        c.create_text(W//2, H//2, text=text, font=(self.FU, 12), fill=self.DIM)

    def _poll_tunnel(self):
        """Called every second — refreshes the tunnel tab if a URL just became available."""
        if self._server_on and self._active_tab == "tunnel" and self._tunnel_url:
            self._update_display()
        self.root.after(1000, self._poll_tunnel)

    def _update_display(self):
        if hasattr(self, "_update_sid_display"):
            self._update_sid_display()
        if not self._server_on:
            self._ip_text = "http://0.0.0.0:8000"
            self._draw_ip(False)
            self._draw_qr_empty()
            pcard, ptid = self._info_cards.get("Protocol", (None, None))
            if ptid is not None:
                pcard.itemconfig(ptid, text="HTTP", fill=self.DIM)
            return

        if self._active_tab == "local":
            ip = self.get_local_ip()
            self._ip_text = f"http://{ip}:8000"
            self._draw_ip(True)
            try:
                from app import SESSION_TOKEN
            except ImportError:
                SESSION_TOKEN = ""
            url = f"http://{ip}:8000"
            if SESSION_TOKEN:
                url = f"{url}?sid={SESSION_TOKEN}"
            self.update_qr_code(url)
            
            pcard, ptid = self._info_cards.get("Protocol", (None, None))
            if ptid is not None:
                pcard.itemconfig(ptid, text="HTTP", fill=self.GREEN)
        else:  # tunnel
            if self._tunnel_url:
                self._ip_text = self._tunnel_url
                self._draw_ip(True)
                try:
                    from app import SESSION_TOKEN
                except ImportError:
                    SESSION_TOKEN = ""
                url = self._tunnel_url
                if SESSION_TOKEN:
                    url = f"{url}?sid={SESSION_TOKEN}"
                self.update_qr_code(url)
                
                pcard, ptid = self._info_cards.get("Protocol", (None, None))
                if ptid is not None:
                    pcard.itemconfig(ptid, text="HTTPS", fill=self.GREEN)
            else:
                self._ip_text = "Connecting to tunnel..."
                self._draw_ip(True)
                self._draw_qr_loading()
                
                pcard, ptid = self._info_cards.get("Protocol", (None, None))
                if ptid is not None:
                    pcard.itemconfig(ptid, text="HTTPS", fill=self.ORANGE)

    def start_tunnel(self):
        """Starts the tunnel fallback in a background thread."""
        if self._tunnel_process is not None:
            return  # already running

        self._tunnel_url = None
        self.root.after(0, self._update_display)

        def set_app_tunnel_url(url):
            try:
                import app
                app.TUNNEL_URL = url
            except Exception:
                pass

        def shorten_url(url):
            # Return original URL directly for instant display
            return url

        def _get_cloudflared_bin():
            """Return path to cloudflared binary, downloading it if needed."""
            import shutil, platform, os, stat, tarfile, io, sys

            # 1. Already on PATH?
            system_bin = shutil.which("cloudflared")
            if system_bin:
                return system_bin

            # 2. Cached copy?
            cache_dir = os.path.expanduser("~/.lanpad")
            os.makedirs(cache_dir, exist_ok=True)
            cached = os.path.join(cache_dir, "cloudflared")
            if os.path.isfile(cached) and os.access(cached, os.X_OK):
                return cached

            # 3. Download from GitHub releases
            print("[lanpad] Downloading cloudflared binary (one-time setup)...")
            self.root.after(0, lambda: self._show_tunnel_status("Downloading tunnel binary…"))

            machine = platform.machine().lower()
            arch = "arm64" if ("arm" in machine or "aarch" in machine) else "amd64"
            if sys.platform.startswith("win"):
                bin_url = f"https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-{arch}.exe"
                dest = cached + ".exe"
            else:
                bin_url = f"https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-{arch}.tgz"
                if sys.platform.startswith("linux"):
                    bin_url = f"https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-{arch}.tgz"
                dest = cached

            try:
                import urllib.request
                req = urllib.request.Request(bin_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = resp.read()

                if bin_url.endswith(".tgz"):
                    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
                        member = next((m for m in tar.getmembers() if "cloudflared" in m.name and not m.isdir()), None)
                        if member is None: raise Exception("binary not found")
                        with tar.extractfile(member) as src, open(dest, "wb") as out:
                            out.write(src.read())
                else:
                    with open(dest, "wb") as out:
                        out.write(data)

                os.chmod(dest, os.stat(dest).st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
                return dest
            except Exception as dl_err:
                print(f"[lanpad] cloudflared download failed: {dl_err}")
                if os.path.exists(dest):
                    try:
                        os.remove(dest)
                    except Exception:
                        pass
                return None

        def _run():
            import subprocess
            import re
            import sys
            import threading
            print("[lanpad] Starting tunnel fallback...")

            # Check CLI arguments for forced tunnel selection
            forced_tunnel = None
            if "--tunnel" in sys.argv:
                try:
                    idx = sys.argv.index("--tunnel")
                    if idx + 1 < len(sys.argv):
                        forced_tunnel = sys.argv[idx + 1].lower()
                except ValueError:
                    pass

            cloudflared_bin = _get_cloudflared_bin()

            kwargs = {}
            if sys.platform == "win32":
                kwargs["creationflags"] = 0x08000000  # CREATE_NO_WINDOW


            # ── Cloudflare Quick Tunnel ──────────────────────────────────────────
            if cloudflared_bin and (forced_tunnel is None or forced_tunnel == "cloudflare"):
                try:
                    cmd = [cloudflared_bin, "tunnel", "--protocol", "http2", "--url", "http://127.0.0.1:8000"]
                    proc = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        stdin=subprocess.DEVNULL,
                        text=True,
                        bufsize=1,
                        **kwargs
                    )
                    self._tunnel_process = proc
                    url_found = False

                    def _read_lines():
                        nonlocal url_found
                        try:
                            for line in proc.stdout:
                                if not self._tunnel_process: break
                                sys.stdout.write(line)
                                sys.stdout.flush()
                                match = re.search(r"https://[a-zA-Z0-9\-]+\.trycloudflare\.com", line)
                                if match:
                                    raw_url = match.group(0)
                                    print(f"\n[lanpad] Cloudflare URL: {raw_url}")
                                    self._tunnel_url = shorten_url(raw_url)
                                    set_app_tunnel_url(raw_url)
                                    print(f"[lanpad] Tunnel ready: {self._tunnel_url}")
                                    self.gui_queue.put(self._update_display)
                                    url_found = True
                        except Exception as _e:
                            print(f"[lanpad] _read_lines error: {_e}")

                    import threading as _thr
                    reader = _thr.Thread(target=_read_lines, daemon=True)
                    reader.start()
                    reader.join(timeout=20)

                    if not url_found:
                        raise Exception("Cloudflare Tunnel timed out")
                except Exception as e:
                    print(f"\n[lanpad] Cloudflare Tunnel failed: {e}. Falling back to localtunnel...")
                    self.stop_tunnel()
            else:
                print("[lanpad] cloudflared unavailable — falling back to localtunnel...")

            # ── localhost.run fallback ──
            if not self._tunnel_url and (forced_tunnel is None or forced_tunnel == "localtunnel"):
                try:
                    # Silently generate SSH keys if they do not exist to prevent connection prompts
                    ssh_dir = os.path.expanduser("~/.ssh")
                    private_key = os.path.join(ssh_dir, "id_rsa")
                    if not os.path.exists(private_key):
                        os.makedirs(ssh_dir, exist_ok=True)
                        try:
                            key_cmd = ["ssh-keygen", "-t", "rsa", "-b", "2048", "-N", "", "-f", private_key]
                            # Run silently without windows popping up
                            cf = 0x08000000 if sys.platform == "win32" else 0
                            subprocess.run(key_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=cf)
                        except Exception:
                            pass

                    ssh_cmd = [
                        "ssh", "-C",
                        "-o", "StrictHostKeyChecking=no",
                        "-o", "ConnectTimeout=10",
                        "-o", "ServerAliveInterval=10",
                        "-o", "ServerAliveCountMax=3",
                        "-o", "GSSAPIAuthentication=no",
                        "-o", "AddressFamily=inet",
                        "-R", "80:127.0.0.1:8000",
                        "nokey@localhost.run"
                    ]
                    
                    proc = subprocess.Popen(
                        ssh_cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        stdin=subprocess.DEVNULL,
                        text=True,
                        bufsize=1,
                        **kwargs
                    )
                    self._tunnel_process = proc
                    url_found = False
                    
                    import threading
                    def _read_lhr():
                        nonlocal url_found
                        try:
                            for line in proc.stdout:
                                if not self._tunnel_process: break
                                sys.stdout.write(line)
                                sys.stdout.flush()
                                # Match http/https *.lhr.life or *.localhost.run (excluding admin link)
                                match = re.search(r"https?://[a-zA-Z0-9\-]+\.lhr\.life", line)
                                if not match:
                                    match = re.search(r"https?://[a-zA-Z0-9\-]+\.localhost\.run", line)
                                    if match and "admin.localhost.run" in match.group(0):
                                        match = None
                                    
                                if match:
                                    raw_url = match.group(0)
                                    print(f"\n[lanpad] localhost.run URL: {raw_url}")
                                    self._tunnel_url = raw_url
                                    set_app_tunnel_url(raw_url)
                                    self.gui_queue.put(self._update_display)
                                    url_found = True
                                    break
                        except Exception as _e:
                            print(f"[lanpad] localhost.run read error: {_e}")
                            
                    lhr_reader = threading.Thread(target=_read_lhr, daemon=True)
                    lhr_reader.start()
                    lhr_reader.join(timeout=30)
                    
                    if not url_found:
                        raise Exception("localhost.run timed out")
                except Exception as lhr_err:
                    print(f"[lanpad] localhost.run failed: {lhr_err}. Falling back to bore...")
                    self.stop_tunnel()

            # ── bore fallback ──
            if not self._tunnel_url and (forced_tunnel is None or forced_tunnel == "bore"):
                dest_zip = None
                bore_bin = None
                try:
                    # Check if bore is on system path
                    import shutil
                    import platform
                    bore_bin = shutil.which("bore")
                    if not bore_bin:
                        # Fallback to local ~/.lanpad/bore binary location
                        cache_dir = os.path.expanduser("~/.lanpad")
                        bore_bin = os.path.join(cache_dir, "bore.exe" if sys.platform.startswith('win') else "bore")
                        
                        if not (os.path.isfile(bore_bin) and os.access(bore_bin, os.X_OK)):
                            # Need to download bore binary dynamically
                            print("[lanpad] Downloading bore binary (one-time setup)...")
                            self.root.after(0, lambda: self._show_tunnel_status("Downloading bore binary…"))
                            machine = platform.machine().lower()
                            is_win = sys.platform.startswith('win')
                            is_mac = sys.platform.startswith('darwin')
                            
                            # Determine correct release binary URL from ekzhang/bore GitHub releases
                            # URL format: https://github.com/ekzhang/bore/releases/download/v0.5.2/bore-v0.5.2-x86_64-pc-windows-msvc.zip
                            version = "0.5.2"
                            if is_win:
                                arch = "x86_64"
                                url = f"https://github.com/ekzhang/bore/releases/download/v{version}/bore-v{version}-{arch}-pc-windows-msvc.zip"
                                dest_zip = os.path.join(cache_dir, "bore.zip")
                            elif is_mac:
                                arch = "aarch64" if "arm" in machine else "x86_64"
                                url = f"https://github.com/ekzhang/bore/releases/download/v{version}/bore-v{version}-{arch}-apple-darwin.tar.gz"
                                dest_zip = os.path.join(cache_dir, "bore.tar.gz")
                            else:
                                arch = "x86_64"
                                url = f"https://github.com/ekzhang/bore/releases/download/v{version}/bore-v{version}-{arch}-unknown-linux-musl.tar.gz"
                                dest_zip = os.path.join(cache_dir, "bore.tar.gz")
                                
                            import urllib.request
                            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                            with urllib.request.urlopen(req, timeout=30) as resp:
                                data = resp.read()
                            with open(dest_zip, "wb") as f:
                                f.write(data)
                                
                            if dest_zip.endswith(".zip"):
                                import zipfile
                                with zipfile.ZipFile(dest_zip, 'r') as zip_ref:
                                    # extract bore.exe to cache_dir
                                    for member in zip_ref.namelist():
                                        if member.endswith("bore.exe"):
                                            with zip_ref.open(member) as source, open(bore_bin, "wb") as target:
                                                shutil.copyfileobj(source, target)
                            else:
                                import tarfile
                                with tarfile.open(dest_zip, "r:gz") as tar:
                                    member = next((m for m in tar.getmembers() if "bore" in m.name and not m.isdir()), None)
                                    if member:
                                        with tar.extractfile(member) as source, open(bore_bin, "wb") as target:
                                            target.write(source.read())
                            
                            import stat
                            os.chmod(bore_bin, os.stat(bore_bin).st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
                            # Clean up zip archive
                            try: os.remove(dest_zip)
                            except Exception: pass
 
                    if not bore_bin or not os.path.exists(bore_bin):
                        raise Exception("bore binary missing or failed to download")

                    cmd = [bore_bin, "local", "8000", "--to", "bore.pub"]
                    proc = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        stdin=subprocess.DEVNULL,
                        text=True,
                        bufsize=1,
                        **kwargs
                    )
                    self._tunnel_process = proc
                    
                    def _read_bore():
                        try:
                            for line in proc.stdout:
                                if not self._tunnel_process: break
                                sys.stdout.write(line)
                                sys.stdout.flush()
                                # Match console output like "listening at bore.pub:12345"
                                match = re.search(r"listening at (bore\.pub:\d+)", line)
                                if match:
                                    raw_url = "http://" + match.group(1)
                                    print(f"\n[lanpad] bore URL: {raw_url}")
                                    self._tunnel_url = raw_url
                                    set_app_tunnel_url(raw_url)
                                    self.gui_queue.put(self._update_display)
                                    break
                        except Exception as _e:
                            print(f"[lanpad] bore read error: {_e}")
                            
                    threading.Thread(target=_read_bore, daemon=True).start()
                except Exception as bore_err:
                    print(f"[lanpad] bore failed: {bore_err}")
                    if dest_zip and os.path.exists(dest_zip):
                        try: os.remove(dest_zip)
                        except Exception: pass
                    if bore_bin and os.path.exists(bore_bin) and not os.access(bore_bin, os.X_OK):
                        try: os.remove(bore_bin)
                        except Exception: pass
                    self.stop_tunnel()

        threading.Thread(target=_run, daemon=True).start()

    def stop_tunnel(self):
        """Terminates the active SSH tunnel fallback."""
        if self._tunnel_process is not None:
            try:
                self._tunnel_process.terminate()
                self._tunnel_process.wait(timeout=1)
            except Exception:
                try:
                    self._tunnel_process.kill()
                except Exception:
                    pass
            self._tunnel_process = None
        self._tunnel_url = None
        self.gui_queue.put(self._update_display)

    # ── Main-view canvas draw helpers ─────────────────────────────────────────

    def _draw_qr_empty(self):
        c = self._qr_cv
        c.delete("all")
        W, H = int(c["width"]), int(c["height"])
        rounded_rect(c, 0, 0, W, H, r=16, fill=self.BG2, outline=self.BORDER)
        cx, cy = W // 2, H // 2
        c.create_text(cx, cy - 14, text="QR Code", font=(self.FU, 18, "bold"), fill=self.DIM)
        c.create_text(cx, cy + 14, text="Start the server to generate",
                      font=(self.FU, 13), fill=self.DIM)

    def _draw_qr_active(self, img: Image.Image):
        c = self._qr_cv
        c.delete("all")
        W, H = int(c["width"]), int(c["height"])
        rounded_rect(c, 0, 0, W, H, r=16, fill=self.BG2, outline=self.BORDER)
        self._qr_photo = ImageTk.PhotoImage(img)
        c.create_image(W // 2, H // 2, image=self._qr_photo)

    def _draw_ip(self, active: bool):
        c = self._ip_cv
        c.delete("all")
        W = int(c["width"])
        H = int(c["height"])
        rounded_rect(c, 0, 2, W, H - 2, r=10, fill=self.BG2, outline=self.BORDER)

        text = self._ip_text
        color = self.WHITE if active else self.DIM

        # For very long URLs (tunnel links), show on two lines
        if len(text) > 38:
            # Split at the natural domain/path boundary for readability
            mid = len(text) // 2
            # Find a good split point around the middle (prefer split after '/')
            best = mid
            for i in range(mid - 8, mid + 12):
                if 0 < i < len(text) and text[i] in ('/', '-', '.'):
                    best = i + 1
                    break
            line1 = text[:best]
            line2 = text[best:]
            c.create_text(W // 2, 16, text=line1,
                          font=(self.FM, 11), fill=color, anchor="center")
            c.create_text(W // 2, 34, text=line2,
                          font=(self.FM, 11), fill=color, anchor="center")
        else:
            c.create_text(W // 2, H // 2, text=text,
                          font=(self.FM, 13), fill=color, anchor="center")

    def _draw_main_btn(self, active: bool):
        c = self._btn_cv
        c.delete("all")
        W = int(c["width"])
        if active:
            rounded_rect(c, 0, 1, W, 55, r=12, fill=self.RED, outline="")
            c.create_text(W // 2, 28, text="Stop Server",
                          fill=self.WHITE, font=(self.FU, 17, "bold"))
        else:
            rounded_rect(c, 0, 1, W, 55, r=12, fill=self.GREEN, outline="")
            c.create_text(W // 2, 28, text="Start Server",
                          fill=self.WHITE, font=(self.FU, 17, "bold"))
        c.bind("<Button-1>", lambda e: self.toggle_server())
        c.config(cursor="hand2")

    # ── Status-dot pulse animation ────────────────────────────────────────────

    def _tick_dot(self):
        # Animation removed for clean UI
        pass

    # ── BYPASS VIEW REMOVED ───────────────────────────────────────────────────

    def load_cached_monetization(self):
        import json
        self.monetization_enabled = False
        self.free_enabled = False
        mon_path = os.path.expanduser("~/.lanpad_monetization.json")
        if os.path.exists(mon_path):
            try:
                with open(mon_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.monetization_enabled = data.get("monetization_enabled", False)
                self.free_enabled = data.get("free_enabled", False)
            except Exception:
                pass
        if self.monetization_enabled:
            _mac = sys.platform == "darwin"
            self._plan_lbl.place(x=376, y=88 + (0 if _mac else 4), anchor="ne")
            try:
                license_path = os.path.expanduser("~/.lanpad_license.json")
                if os.path.exists(license_path):
                    with open(license_path, "r", encoding="utf-8") as f:
                        lic = json.load(f)
                    expires_at = lic.get("expires_at")
                    is_expired = False
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
                            is_expired = True

                    if not is_expired:
                        tier = lic.get("tier", "Basic").upper()
                        self._plan_lbl.config(text=f"Plan: {tier}  •  Upgrade")
                    else:
                        if self.free_enabled:
                            self._plan_lbl.config(text="Plan: FREE  •  Upgrade")
                        else:
                            self._plan_lbl.config(text="Plan: BASIC  •  Upgrade")
                else:
                    if self.free_enabled:
                        self._plan_lbl.config(text="Plan: FREE  •  Upgrade")
                    else:
                        self._plan_lbl.config(text="Plan: BASIC  •  Upgrade")
            except Exception:
                self._plan_lbl.config(text="Plan: FREE  •  Upgrade")

    # ── Navigation ────────────────────────────────────────────────────────────

    def update_plan_label(self):
        def _task():
            monetization_enabled = False
            free_enabled = False
            import sys
            if getattr(sys, 'frozen', False):
                urls = ["https://lanpad.app"]
            else:
                urls = ["http://127.0.0.1:3000", "https://lanpad.app"]
            for base_url in urls:
                try:
                    req = urllib.request.Request(f"{base_url}/api/monetization/status", headers={"User-Agent": "LANpad App"})
                    with safe_urlopen(req, timeout=3) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        monetization_enabled = data.get("monetization_enabled", False)
                        free_enabled = data.get("free_enabled", False)
                        try:
                            mon_path = os.path.expanduser("~/.lanpad_monetization.json")
                            with open(mon_path, "w", encoding="utf-8") as f:
                                json.dump({
                                    "monetization_enabled": monetization_enabled,
                                    "free_enabled": free_enabled,
                                    "plans": data.get("plans", []),
                                    "last_checked": time.time()
                                }, f)
                        except Exception:
                            pass
                        break
                except Exception:
                    pass

            def _update_ui():
                self.monetization_enabled = monetization_enabled
                self.free_enabled = free_enabled
                if not monetization_enabled:
                    self._plan_lbl.place_forget()
                    return
                else:
                    _mac = sys.platform == "darwin"
                    self._plan_lbl.place(x=376, y=88 + (0 if _mac else 4), anchor="ne")

                try:
                    license_path = os.path.expanduser("~/.lanpad_license.json")
                    if os.path.exists(license_path):
                        with open(license_path, "r", encoding="utf-8") as f:
                            lic = json.load(f)
                        expires_at = lic.get("expires_at")
                        is_expired = False
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
                                is_expired = True

                        if not is_expired:
                            tier = lic.get("tier", "Basic").upper()
                            self._plan_lbl.config(text=f"Plan: {tier}  •  Upgrade")
                        else:
                            if free_enabled:
                                self._plan_lbl.config(text="Plan: FREE  •  Upgrade")
                            else:
                                self._plan_lbl.config(text="Plan: BASIC  •  Upgrade")
                    else:
                        if free_enabled:
                            self._plan_lbl.config(text="Plan: FREE  •  Upgrade")
                        else:
                            self._plan_lbl.config(text="Plan: BASIC  •  Upgrade")
                except Exception:
                    self._plan_lbl.config(text="Plan: FREE  •  Upgrade")

            self.gui_queue.put(_update_ui)
            
        import threading
        threading.Thread(target=_task, daemon=True).start()

    def _is_legal_accepted(self):
        for path_str in ["~/.lanpad/legal.json", "~/.lanpad_legal.json"]:
            try:
                path = os.path.expanduser(path_str)
                if os.path.exists(path):
                    import json
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if data.get("accepted", False):
                        return True
            except Exception:
                pass
        return False

    def show_view(self, name: str):
        if not self._is_legal_accepted() and name != "splash":
            name = "legal"

        if name == "main":
            self.main_view.tkraise()
            if hasattr(self, "update_plan_label"):
                self.update_plan_label()
            # Start backend server only after successful license/monetization validation
            self.start_server()
        elif name == "lock":
            self.lock_view.tkraise()
            if hasattr(self, "update_lock_time_left"):
                self.update_lock_time_left()
            if hasattr(self, "load_active_key_if_present"):
                self.load_active_key_if_present()
        elif name == "splash":
            self.splash_view.tkraise()
        elif name == "legal":
            self.legal_view.tkraise()
        elif name == "files":
            self.files_view.tkraise()
            if hasattr(self, "_refresh_files_list"):
                self._refresh_files_list()
            if hasattr(self, "_connect_hub_btn"):
                if self.connected_hubs:
                    self._connect_hub_btn.config(text=f"Connected Hubs ({len(self.connected_hubs)})", fg="#00C853")
                else:
                    self._connect_hub_btn.config(text="Connect Hub", fg="#0077C0")
        elif name == "remote":
            self.remote_view.tkraise()
            if hasattr(self, "_refresh_remote_view"):
                self._refresh_remote_view()
        else:
            self.bypass_view.tkraise()
            self.copy_bookmarklet(silent=True)

    def update_lock_time_left(self):
        try:
            license_path = os.path.expanduser("~/.lanpad_license.json")
            if os.path.exists(license_path):
                import json
                with open(license_path, "r", encoding="utf-8") as f:
                    lic = json.load(f)
                expires_at = lic.get("expires_at")
                if expires_at:
                    time_left_str = format_time_left(expires_at)
                    if time_left_str:
                        self.lock_time_left_lbl.config(text=time_left_str)
                        return
            self.lock_time_left_lbl.config(text="")
        except Exception as e:
            print(f"Error in update_lock_time_left: {e}")
            self.lock_time_left_lbl.config(text="")

    def load_active_key_if_present(self):
        try:
            license_path = os.path.expanduser("~/.lanpad_license.json")
            if os.path.exists(license_path):
                import json
                with open(license_path, "r", encoding="utf-8") as f:
                    lic = json.load(f)
                key = lic.get("key")
                expires_at = lic.get("expires_at")
                if key and expires_at:
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
                    if expiry_dt > now_dt:
                        self.key_entry.delete(0, "end")
                        self.key_entry.insert(0, key)
                        self.key_entry.config(show="*")
                        self.show_hide_btn.place(x=244, y=10, width=48, height=24)
                        self.show_hide_btn.config(text="Show")
                        return
            self.key_entry.delete(0, "end")
            self.key_entry.config(show="")
            self.show_hide_btn.place_forget()
        except Exception as e:
            print(f"Error in load_active_key_if_present: {e}")

    def start_toggle_key_visibility_thread(self):
        import threading
        threading.Thread(target=self.toggle_key_visibility, daemon=True).start()

    def toggle_key_visibility(self):
        try:
            current_show = self.key_entry.cget("show")
            if current_show == "*":
                if self.authenticate_user():
                    self.gui_queue.put(lambda: self._set_key_show_state(visible=True))
            else:
                self.gui_queue.put(lambda: self._set_key_show_state(visible=False))
        except Exception as e:
            print(f"Error in toggle_key_visibility: {e}")

    def _set_key_show_state(self, visible):
        try:
            if visible:
                self.key_entry.config(show="")
                self.show_hide_btn.config(text="Hide")
            else:
                self.key_entry.config(show="*")
                self.show_hide_btn.config(text="Show")
        except Exception as e:
            print(f"Error in _set_key_show_state: {e}")

    def authenticate_user(self):
        if sys.platform == "darwin":
            try:
                import objc
                import queue
                
                # Load LocalAuthentication framework dynamically
                objc.loadBundle("LocalAuthentication", bundle_path="/System/Library/Frameworks/LocalAuthentication.framework", module_globals=globals())
                
                # Register metadata for LAContext evaluatePolicy:localizedReason:reply:
                objc.registerMetaDataForSelector(
                    b"LAContext",
                    b"evaluatePolicy:localizedReason:reply:",
                    {
                        "arguments": {
                            4: {
                                "callable": {
                                    "retval": {"type": b"v"},
                                    "arguments": {
                                        0: {"type": b"^v"},  # block ptr
                                        1: {"type": b"B"},   # success BOOL
                                        2: {"type": b"@"},   # error id
                                    }
                                }
                            }
                        }
                    }
                )
                
                context = LAContext.alloc().init()
                
                possible = context.canEvaluatePolicy_error_(2, None)
                if not possible:
                    print("[auth] canEvaluatePolicy failed")
                    return self._authenticate_applescript_fallback()
                
                q = queue.Queue()
                def reply_callback(success, error):
                    q.put(success)
                    
                context.evaluatePolicy_localizedReason_reply_(2, "show your activation key", reply_callback)
                
                # Wait for authentication result (blocks cleanly until OS prompt returns)
                success = q.get()
                return bool(success)
            except Exception as e:
                print(f"[auth] LocalAuthentication failed: {e}")
                return self._authenticate_applescript_fallback()
        elif sys.platform.startswith("win"):
            try:
                import subprocess
                ps_cmd = '$cred = $host.ui.PromptForCredential("LANpad Authentication", "Please authenticate to view your activation key.", "", ""); if ($cred) { exit 0 } else { exit 1 }'
                res = subprocess.run(["powershell", "-Command", ps_cmd], capture_output=True)
                return res.returncode == 0
            except Exception:
                return False
        else:
            return True

    def _authenticate_applescript_fallback(self):
        try:
            import subprocess
            cmd = ["osascript", "-e", 'do shell script "true" with administrator privileges with prompt "LANpad wants to show your activation key."']
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except Exception as e:
            print(f"[auth] AppleScript fallback failed: {e}")
            return False

    def _build_files(self):
        v = self.files_view
        W = 400
        _mac = sys.platform == "darwin"
        yo = 0 if _mac else 12  # Y-offset for Windows spacing

        # Flat background
        bg_cv = tk.Canvas(v, width=W, height=760, bg=self.BG, highlightthickness=0)
        bg_cv.place(x=0, y=0)

        # ── Titlebar (Native Layout) ─────────────────────────────────────────
        tb = tk.Frame(v, bg=self.BG, height=60)
        tb.place(x=0, y=0, relwidth=1)
        self._pill_button(tb, "← Back", self.WHITE, self.BG2,
                          cmd=lambda: self.show_view("main"), side="right")

        # ── Header ───────────────────────────────────────────────────────────
        hdr = tk.Frame(v, bg=self.BG)
        hdr.place(x=18, y=58 + yo, width=W - 36)
        
        # Folder icon tile (custom vector folder drawing)
        ic = tk.Canvas(hdr, width=32, height=32, bg=self.BG, highlightthickness=0)
        ic.pack(side="left")
        rounded_rect(ic, 0, 0, 32, 32, r=8, fill=self.BG2, outline="")
        ic.create_polygon(8, 10, 14, 10, 16, 12, 24, 12, 24, 22, 8, 22, fill="#0077C0", outline="")

        # Title
        tk.Label(hdr, text="Files Center", font=(self.FD, 14, "bold"), bg=self.BG, fg=self.WHITE).pack(side="left", padx=8)

        # Connect Hub Action Button (styled to fit theme)
        self._connect_hub_btn = tk.Label(hdr, text="Connect Hub", font=(self.FU, 8, "bold"), bg=self.BG2, fg="#0077C0", padx=12, pady=5, cursor="hand2")
        self._connect_hub_btn.pack(side="right", padx=(0, 4))
        self._connect_hub_btn.bind("<Button-1>", lambda e: self.show_view("remote"))

        # ── Dropzone Card & Drag-and-Drop Setup ──────────────────────────────
        shared_path = os.path.expanduser("~/Downloads/LANpad")

        def parse_dropped_paths(text):
            import re
            paths = []
            pattern = r'\{([^}]+)\}|(\S+)'
            for match in re.finditer(pattern, text):
                path = match.group(1) or match.group(2)
                if path:
                    paths.append(path.strip())
            return paths

        dropzone = tk.Canvas(v, width=W - 36, height=130, bg=self.BG, highlightthickness=0)
        dropzone.place(x=18, y=105 + yo)

        # Styled DnD entry inside dropzone
        dnd_var = tk.StringVar()
        dnd_entry = tk.Entry(dropzone, textvariable=dnd_var, bg=self.BG2, fg=self.DIM,
                             font=(self.FU, 8), bd=0, highlightthickness=0, justify="center", insertontime=0)
        dnd_entry.place(x=10, y=90, width=W - 36 - 20, height=26)

        placeholder = "Supports large files (5-10 GB+) cross-device over Local LAN"
        dnd_entry.insert(0, placeholder)

        def draw_dropzone(hover=False):
            dropzone.delete("all")
            fill_color = "#16161D" if hover else self.BG2
            outline_color = "#0077C0" if hover else "#2A2A30"
            # Draw rounded dashed rect
            rounded_rect(dropzone, 2, 2, W - 38, 128, r=16, fill=fill_color, outline=outline_color, width=1)
            
            # Custom Vector Cloud Icon with Arrow
            cx = (W - 36) // 2
            cy = 38
            dropzone.create_oval(cx - 24, cy - 8, cx - 4, cy + 12, fill="#0077C0", outline="")
            dropzone.create_oval(cx - 8, cy - 22, cx + 18, cy + 12, fill="#0077C0", outline="")
            dropzone.create_oval(cx + 8, cy - 8, cx + 24, cy + 12, fill="#0077C0", outline="")
            dropzone.create_rectangle(cx - 16, cy, cx + 16, cy + 12, fill="#0077C0", outline="")
            
            # White Arrow inside Cloud
            dropzone.create_line(cx + 1, cy + 6, cx + 1, cy - 8, fill=self.WHITE, width=2)
            dropzone.create_line(cx + 1, cy - 8, cx - 3, cy - 4, fill=self.WHITE, width=2)
            dropzone.create_line(cx + 1, cy - 8, cx + 5, cy - 4, fill=self.WHITE, width=2)
            
            # Text
            dropzone.create_text((W - 36) // 2, 70, text="Choose Files / Drag & Drop", font=(self.FU, 12, "bold"), fill=self.WHITE)
            
            # Keep entry visual style updated
            dnd_entry.config(bg=fill_color)

        draw_dropzone()

        # ── Section Title & Refresh ──────────────────────────────────────────
        sec_frame = tk.Frame(v, bg=self.BG)
        sec_frame.place(x=18, y=250 + yo, width=W - 36, height=24)
        
        sec_title_lbl = tk.Label(sec_frame, text="SHARED FILES ON LAPTOP", font=(self.FU, 9, "bold"), bg=self.BG, fg=self.DIM)
        sec_title_lbl.pack(side="left", anchor="center")
        
        # ── Refresh Button (Vector Icon & Text) ──────────────────────────────
        refresh_btn_frame = tk.Frame(sec_frame, bg=self.BG, cursor="hand2")
        refresh_btn_frame.pack(side="right", anchor="center")
        
        refresh_cv = tk.Canvas(refresh_btn_frame, width=16, height=16, bg=self.BG, highlightthickness=0)
        refresh_cv.pack(side="left")
        
        refresh_lbl = tk.Label(refresh_btn_frame, text="Refresh", font=(self.FU, 10, "bold"), bg=self.BG, fg="#0077C0", cursor="hand2")
        refresh_lbl.pack(side="left", padx=(4, 0))

        def draw_refresh_icon():
            refresh_cv.delete("all")
            # Scaled down circular arrow (fits 3x3 to 13x13 bounding box)
            refresh_cv.create_arc(3, 3, 13, 13, start=60, extent=260, style="arc", outline="#0077C0", width=2)
            refresh_cv.create_polygon(8, 1, 13, 2.5, 9.5, 6, fill="#0077C0", outline="")

        draw_refresh_icon()

        show_deleted_mode = [False]

        # ── Toggle Button (Vector Icon & Text) ───────────────────────────────
        toggle_btn_frame = tk.Frame(sec_frame, bg=self.BG, cursor="hand2")
        toggle_btn_frame.pack(side="right", padx=(0, 20), anchor="center")

        toggle_cv = tk.Canvas(toggle_btn_frame, width=16, height=16, bg=self.BG, highlightthickness=0)
        toggle_cv.pack(side="left")

        toggle_text_lbl = tk.Label(toggle_btn_frame, text="Deleted Logs", font=(self.FU, 9, "bold"), bg=self.BG, fg="#FF4D4D", cursor="hand2")
        toggle_text_lbl.pack(side="left", padx=(4, 0))

        def draw_toggle_icon(deleted_mode):
            toggle_cv.delete("all")
            if deleted_mode:
                # Scaled down Vector Folder Icon
                toggle_cv.create_polygon(3, 4, 7, 4, 8.5, 5.5, 13, 5.5, 13, 12, 3, 12, fill="#0077C0", outline="")
            else:
                # Scaled down Vector Trash Can Icon
                toggle_cv.create_rectangle(7, 2, 9, 4, fill="#FF4D4D", outline="")
                toggle_cv.create_rectangle(3.5, 4, 12.5, 5.5, fill="#FF4D4D", outline="")
                toggle_cv.create_polygon(5, 5.5, 11, 5.5, 10, 14, 6, 14, fill="#FF4D4D", outline="")

        draw_toggle_icon(False)

        def toggle_view_mode(e=None):
            show_deleted_mode[0] = not show_deleted_mode[0]
            draw_toggle_icon(show_deleted_mode[0])
            if show_deleted_mode[0]:
                sec_title_lbl.config(text="DELETED FILES LOG", fg="#FF4D4D")
                toggle_text_lbl.config(text="Active Files", fg="#0077C0")
            else:
                sec_title_lbl.config(text="SHARED FILES ON LAPTOP", fg=self.DIM)
                toggle_text_lbl.config(text="Deleted Logs", fg="#FF4D4D")
            refresh_files()

        # Bind events to the whole button containers (icon canvas + label)
        refresh_cv.bind("<Button-1>", lambda e: refresh_files())
        refresh_lbl.bind("<Button-1>", lambda e: refresh_files())
        refresh_btn_frame.bind("<Button-1>", lambda e: refresh_files())

        toggle_cv.bind("<Button-1>", toggle_view_mode)
        toggle_text_lbl.bind("<Button-1>", toggle_view_mode)
        toggle_btn_frame.bind("<Button-1>", toggle_view_mode)

        # ── Scrollable list container ────────────────────────────────────────
        list_canvas = tk.Canvas(v, bg=self.BG, highlightthickness=0)
        list_canvas.place(x=18, y=285 + yo, width=W - 36, height=430)
        
        scrollable_frame = tk.Frame(list_canvas, bg=self.BG)
        scrollable_frame.bind(
            "<Configure>",
            lambda e: list_canvas.configure(
                scrollregion=list_canvas.bbox("all")
            )
        )
        
        list_canvas.create_window((0, 0), window=scrollable_frame, anchor="nw", width=W - 36)

        def _on_files_mousewheel(event):
            if sys.platform == "darwin":
                list_canvas.yview_scroll(int(-1 * event.delta), "units")
            else:
                list_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
                
        list_canvas.bind("<MouseWheel>", _on_files_mousewheel)
        scrollable_frame.bind("<MouseWheel>", _on_files_mousewheel)
        
        # ── Progress Bar Card (Hidden by default) ─────────────────────────────
        progress_card = tk.Frame(v, bg="#0D0D10", highlightthickness=1, highlightbackground="#1F1F24")
        
        # Row 1: Title & Speed
        r1 = tk.Frame(progress_card, bg="#0D0D10")
        r1.pack(fill="x", padx=12, pady=(8, 2))
        progress_title_lbl = tk.Label(r1, text="Sending File...", font=(self.FU, 9, "bold"), fg=self.WHITE, bg="#0D0D10")
        progress_title_lbl.pack(side="left")
        progress_speed_lbl = tk.Label(r1, text="0.00 MB/s", font=(self.FU, 8, "bold"), fg="#0077C0", bg="#0D0D10")
        progress_speed_lbl.pack(side="right")
        
        # Row 2: Progress Canvas
        progress_bar_canvas = tk.Canvas(progress_card, height=6, bg="#1A1A1F", highlightthickness=0)
        progress_bar_canvas.pack(fill="x", padx=12, pady=4)
        
        # Row 3: Percent & Bytes
        r3 = tk.Frame(progress_card, bg="#0D0D10")
        r3.pack(fill="x", padx=12, pady=(2, 8))
        progress_percent_lbl = tk.Label(r3, text="0%", font=(self.FU, 8), fg=self.WHITE, bg="#0D0D10")
        progress_percent_lbl.pack(side="left")
        
        progress_bytes_lbl = tk.Label(r3, text="0.00 / 0.00 MB", font=(self.FU, 8), fg=self.DIM, bg="#0D0D10")
        progress_bytes_lbl.pack(side="right")

        progress_cancel_btn = tk.Label(r3, text="Cancel", font=(self.FU, 8, "bold"), fg="#FF4D4D", bg="#0D0D10", cursor="hand2")
        progress_cancel_btn.pack(side="right", padx=(0, 10))

        def desktop_cancel_upload(e=None):
            from tkinter import messagebox
            if messagebox.askyesno("Cancel Transfer", "Are you sure you want to cancel the current transfer?"):
                import urllib.request
                try:
                    url = f"http://127.0.0.1:8000/api/files/upload_cancel?sid={self.SESSION_TOKEN}"
                    req = urllib.request.Request(url, method="POST")
                    with urllib.request.urlopen(req) as resp:
                        pass
                except Exception as ex:
                    print(f"[launcher] Failed to cancel upload via API: {ex}")
                progress_card.place_forget()
                progress_data["active"] = False

        progress_cancel_btn.bind("<Button-1>", desktop_cancel_upload)

        import time
        progress_data = {"copied": 0, "total": 0, "active": False, "speed": 0.0, "start_time": 0.0}
        
        self._progress_card = progress_card
        self._progress_title_lbl = progress_title_lbl
        self._progress_speed_lbl = progress_speed_lbl
        self._progress_bar_canvas = progress_bar_canvas
        self._progress_percent_lbl = progress_percent_lbl
        self._progress_bytes_lbl = progress_bytes_lbl
        self._progress_data = progress_data
        self._sec_frame = sec_frame
        self._list_canvas = list_canvas
        self._yo = yo
        self._W = W

        def copy_batch_with_progress(paths, dst, progress_cb, finish_cb):
            import threading
            import shutil
            def run_copy():
                try:
                    total_bytes = 0
                    files_to_copy = []
                    for fp in paths:
                        if not os.path.exists(fp):
                            continue
                        if os.path.isdir(fp):
                            dir_size = 0
                            for root, dirs, files in os.walk(fp):
                                for file in files:
                                    dir_size += os.path.getsize(os.path.join(root, file))
                            total_bytes += dir_size
                            files_to_copy.append((fp, True))
                        else:
                            total_bytes += os.path.getsize(fp)
                            files_to_copy.append((fp, False))
                    
                    if total_bytes == 0:
                        finish_cb(None)
                        return

                    copied_bytes = 0
                    for src, is_dir in files_to_copy:
                        if is_dir:
                            dest_dir = os.path.join(dst, os.path.basename(src))
                            if os.path.abspath(src) == os.path.abspath(dest_dir):
                                continue # Skip copying directory to itself
                            if os.path.exists(dest_dir):
                                if os.path.isdir(dest_dir):
                                    shutil.rmtree(dest_dir)
                                else:
                                    os.remove(dest_dir)
                            os.makedirs(dest_dir, exist_ok=True)
                            for root, dirs, files in os.walk(src):
                                rel_dir = os.path.relpath(root, src)
                                cur_dest_dir = os.path.join(dest_dir, rel_dir) if rel_dir != "." else dest_dir
                                os.makedirs(cur_dest_dir, exist_ok=True)
                                for file in files:
                                    file_src = os.path.join(root, file)
                                    file_dst = os.path.join(cur_dest_dir, file)
                                    with open(file_src, "rb") as fsrc:
                                        with open(file_dst, "wb") as fdst:
                                            while True:
                                                chunk = fsrc.read(4 * 1024 * 1024)
                                                if not chunk:
                                                    break
                                                fdst.write(chunk)
                                                copied_bytes += len(chunk)
                                                progress_cb(copied_bytes, total_bytes)
                        else:
                            dest_file = os.path.join(dst, os.path.basename(src))
                            if os.path.abspath(src) == os.path.abspath(dest_file):
                                continue # Skip copying file to itself
                            if os.path.exists(dest_file):
                                os.remove(dest_file)
                            with open(src, "rb") as fsrc:
                                with open(dest_file, "wb") as fdst:
                                    while True:
                                        chunk = fsrc.read(4 * 1024 * 1024)
                                        if not chunk:
                                            break
                                        fdst.write(chunk)
                                        copied_bytes += len(chunk)
                                        progress_cb(copied_bytes, total_bytes)
                    finish_cb(None)
                except Exception as ex:
                    finish_cb(ex)
            threading.Thread(target=run_copy, daemon=True).start()

        def start_async_copy(paths):
            from tkinter import messagebox
            progress_data["copied"] = 0
            progress_data["total"] = 0
            progress_data["active"] = True
            progress_data["start_time"] = time.time()

            # Build a display name from the selected paths
            if len(paths) == 1:
                display_name = os.path.basename(paths[0])
                if len(display_name) > 28:
                    display_name = display_name[:14] + "..." + display_name[-10:]
            else:
                display_name = f"{len(paths)} files"
            progress_data["display_name"] = display_name
            progress_title_lbl.config(text=display_name)

            # Shift list view down and show progress card
            progress_card.place(x=18, y=242 + yo, width=W - 36, height=75)
            sec_frame.place(x=18, y=322 + yo, width=W - 36, height=24)
            list_canvas.place(x=18, y=352 + yo, width=W - 36, height=365)
            
            # Redraw progress bar
            progress_bar_canvas.delete("bar")
            
            def progress_cb(copied, total):
                progress_data["copied"] = copied
                progress_data["total"] = total
                
            def finish_cb(err):
                progress_data["active"] = False
                if err:
                    self.root.after(0, lambda: messagebox.showerror("Error", f"Copy failed: {err}"))
                self.root.after(0, refresh_files)

            copy_batch_with_progress(paths, shared_path, progress_cb, finish_cb)
            
            def poll_progress():
                if not progress_data["active"]:
                    progress_card.place_forget()
                    sec_frame.place(x=18, y=250 + yo, width=W - 36, height=24)
                    list_canvas.place(x=18, y=285 + yo, width=W - 36, height=430)
                    return
                
                copied = progress_data["copied"]
                total = progress_data["total"]
                if total > 0:
                    percent = int(copied / total * 100)
                    elapsed = time.time() - progress_data["start_time"]
                    speed = (copied / (1024 * 1024)) / elapsed if elapsed > 0 else 0.0
                    
                    bar_width = int((W - 36 - 24) * (copied / total))
                    progress_bar_canvas.delete("bar")
                    progress_bar_canvas.create_rectangle(0, 0, bar_width, 6, fill="#0077C0", outline="", tags="bar")
                    
                    progress_title_lbl.config(text=progress_data.get("display_name", "Copying...") if percent < 100 else "✓ Done")
                    progress_speed_lbl.config(text=f"{speed:.2f} MB/s")
                    progress_percent_lbl.config(text=f"{percent}%")
                    
                    copied_mb = copied / (1024 * 1024)
                    total_mb = total / (1024 * 1024)
                    if total_mb >= 1024:
                        progress_bytes_lbl.config(text=f"{copied_mb/1024:.2f} / {total_mb/1024:.2f} GB")
                    else:
                        progress_bytes_lbl.config(text=f"{copied_mb:.2f} / {total_mb:.2f} MB")
                
                v.after(100, poll_progress)
                
            poll_progress()

        scrollable_frame = tk.Frame(list_canvas, bg=self.BG)
        scrollable_frame.bind(
            "<Configure>",
            lambda e: list_canvas.configure(
                scrollregion=list_canvas.bbox("all")
            )
        )
        
        list_canvas.create_window((0, 0), window=scrollable_frame, anchor="nw", width=W - 36)

        def process_dropped_files(paths_str):
            if not paths_str:
                return
            # Filter out the placeholder text if present
            paths_str = paths_str.replace(placeholder, "").strip()
            if not paths_str:
                return
            
            paths = parse_dropped_paths(paths_str)
            dnd_entry.delete(0, tk.END)
            dnd_entry.insert(0, placeholder)
            dnd_entry.config(fg=self.DIM)
            v.focus_set()
            
            start_async_copy(paths)

        def on_dnd_change(*args):
            val = dnd_var.get().strip()
            if val and val != placeholder:
                v.after(100, lambda: process_dropped_files(dnd_var.get().strip()))

        dnd_var.trace_add("write", on_dnd_change)

        def on_enter_dropzone(e):
            draw_dropzone(True)
            dnd_entry.focus_set()

        def on_leave_dropzone(e):
            draw_dropzone(False)

        dropzone.bind("<Enter>", on_enter_dropzone)
        dropzone.bind("<Leave>", on_leave_dropzone)
        dnd_entry.bind("<Enter>", on_enter_dropzone)
        dnd_entry.bind("<Leave>", on_leave_dropzone)

        # Track which files have been opened/downloaded this session
        opened_files = set()

        def refresh_files():
            # Clear previous items
            for widget in scrollable_frame.winfo_children():
                widget.destroy()
                
            if not os.path.exists(shared_path):
                os.makedirs(shared_path, exist_ok=True)
            
            try:
                import json
                meta_path = os.path.join(shared_path, ".metadata.json")
                meta_data = {}
                durations = {}
                deleted_files = []
                if os.path.exists(meta_path):
                    try:
                        with open(meta_path, "r") as fmeta:
                            meta_data = json.load(fmeta)
                            # Durations are non-list entries
                            durations = {k: v for k, v in meta_data.items() if k != "deleted_files"}
                            deleted_files = meta_data.get("deleted_files", [])
                    except Exception:
                        pass

                # Always define inbox_path so it's available in all branches
                inbox_path = os.path.join(shared_path, ".inbox")
                files_list = []
                if show_deleted_mode[0]:
                    # Render deleted files from this session only
                    for df in reversed(self.session_deleted_files):
                        files_list.append((df["name"], False, df["size"], df.get("deleted_at")))
                else:
                    # Main shared folder files
                    if os.path.exists(shared_path):
                        for f in sorted(os.listdir(shared_path)):
                            if not f.startswith('.') and not f.endswith('.part') and os.path.isfile(os.path.join(shared_path, f)):
                                files_list.append((f, False, os.path.getsize(os.path.join(shared_path, f)), None))
                    # Inbox folder files
                    if os.path.exists(inbox_path):
                        for f in sorted(os.listdir(inbox_path)):
                            if not f.startswith('.') and not f.endswith('.part') and os.path.isfile(os.path.join(inbox_path, f)):
                                files_list.append((f, True, os.path.getsize(os.path.join(inbox_path, f)), None))

                if not files_list:
                    msg = "No files deleted this session." if show_deleted_mode[0] else "No files shared yet. Choose a file above to start!"
                    lbl = tk.Label(scrollable_frame, text=msg, font=(self.FU, 10), bg=self.BG, fg=self.DIM, pady=40)
                    lbl.pack(fill="x")
                else:

                    for item in files_list:
                        if show_deleted_mode[0]:
                            f, is_inbox_file, size_bytes, deleted_at = item
                        else:
                            f, is_inbox_file, size_bytes, _ = item

                        cur_dir = inbox_path if is_inbox_file else shared_path
                        f_path = os.path.join(cur_dir, f)
                        
                        # format size
                        if size_bytes < 1024:
                            size_str = f"{size_bytes} B"
                        elif size_bytes < 1024 * 1024:
                            size_str = f"{size_bytes / 1024:.1f} KB"
                        elif size_bytes < 1024 * 1024 * 1024:
                            size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
                        else:
                            size_str = f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"
                        
                        if show_deleted_mode[0]:
                            if deleted_at:
                                import datetime
                                dt = datetime.datetime.fromtimestamp(deleted_at / 1000.0)
                                time_str = dt.strftime("%H:%M")
                                size_str += f" · Removed at {time_str}"
                        else:
                            # Add transfer duration next to size if available
                            duration = durations.get(f)
                            if duration is not None:
                                if duration < 60:
                                    size_str += f" (took {int(duration)}s)"
                                else:
                                    size_str += f" (took {int(duration//60)}m {int(duration%60)}s)"
                            
                            if is_inbox_file:
                                size_str += " [INBOX]"

                        disp_name = f
                        if len(disp_name) > 30:
                            disp_name = disp_name[:18] + "..." + disp_name[-9:]
                        
                        is_opened = f in opened_files
                        is_received_completed = (durations.get(f) is not None) and (not is_inbox_file)
                        show_tick = is_opened or is_received_completed

                        if show_deleted_mode[0]:
                            border_color = "#3B1C1C"
                            card_bg = "#0D0500"
                        elif is_inbox_file:
                            border_color = "#0077C0"
                            card_bg = self.BG2
                        else:
                            border_color = "#00C853" if show_tick else "#1A1A1F"
                            card_bg = self.BG2
                        
                        card = tk.Frame(scrollable_frame, bg=card_bg, bd=0, padx=12, pady=10, highlightthickness=1, highlightbackground=border_color)
                        card.pack(fill="x", pady=(0, 8))
                        
                        # Double click card to open (only if it's already in main shared folder and not deleted mode)
                        def make_open_handler(path_to_open, fname):
                            def handler(e=None):
                                opened_files.add(fname)
                                open_path(path_to_open)
                                self.root.after(300, refresh_files)
                            return handler
                        
                        def make_accept_handler(fname):
                            def handler(e=None):
                                try:
                                    src_inbox = os.path.join(shared_path, ".inbox", fname)
                                    dst_main = os.path.join(shared_path, fname)
                                    if os.path.exists(dst_main):
                                        os.remove(dst_main)
                                    os.rename(src_inbox, dst_main)
                                    refresh_files()
                                except Exception as ex:
                                    messagebox.showerror("Error", f"Failed to accept file: {ex}")
                            return handler

                        if not is_inbox_file and not show_deleted_mode[0]:
                            card.bind("<Double-1>", lambda e, p=f_path, fn=f: make_open_handler(p, fn)())
                        
                        text_col = tk.Frame(card, bg=card_bg)
                        text_col.pack(side="left", fill="both", expand=True)
                        
                        # Name row with optional check icon
                        name_frame = tk.Frame(text_col, bg=card_bg)
                        name_frame.pack(fill="x")
                        
                        name_lbl = tk.Label(name_frame, text=disp_name, font=(self.FU, 10, "bold"), fg=self.WHITE if not show_deleted_mode[0] else self.DIM, bg=card_bg, anchor="w")
                        name_lbl.pack(side="left")
                        if not is_inbox_file and not show_deleted_mode[0]:
                            name_lbl.bind("<Double-1>", lambda e, p=f_path, fn=f: make_open_handler(p, fn)())
                        
                        if show_tick and not is_inbox_file and not show_deleted_mode[0]:
                            check_lbl = tk.Label(name_frame, text="✓", font=(self.FU, 10, "bold"), fg="#00C853", bg=card_bg)
                            check_lbl.pack(side="left", padx=(4, 0))
                        
                        size_lbl = tk.Label(text_col, text=size_str, font=(self.FU, 8), fg=self.DIM, bg=card_bg, anchor="w")
                        size_lbl.pack(fill="x")
                        if not is_inbox_file and not show_deleted_mode[0]:
                            size_lbl.bind("<Double-1>", lambda e, p=f_path, fn=f: make_open_handler(p, fn)())
                        
                        btn_col = tk.Frame(card, bg=card_bg)
                        btn_col.pack(side="right", fill="y")
                        
                        if show_deleted_mode[0]:
                            lbl = tk.Label(btn_col, text="Removed", font=(self.FU, 8, "bold"), fg="#FF4D4D", bg=card_bg, padx=10, pady=4)
                            lbl.pack(side="left")
                        else:
                            if is_inbox_file:
                                # Accept/Download button for inbox files
                                accept_btn = tk.Label(btn_col, text="↓ Download", font=(self.FU, 9, "bold"), bg="#0077C0", fg="#FFFFFF", padx=10, pady=4, relief="flat", cursor="hand2")
                                accept_btn.pack(side="left", padx=4)
                                accept_btn.bind("<Button-1>", lambda e, fn=f: make_accept_handler(fn)())
                            else:
                                # Open button — green if already opened/completed, blue if not
                                btn_bg = "#1B4332" if show_tick else "#0077C0"
                                btn_fg = "#00C853" if show_tick else "#FFFFFF"
                                btn_text = "✓" if show_tick else "↓"
                                open_btn = tk.Label(btn_col, text=btn_text, font=(self.FU, 11, "bold"), bg=btn_bg, fg=btn_fg, padx=12, pady=4, relief="flat", cursor="hand2")
                                open_btn.pack(side="left", padx=4)
                                open_btn.bind("<Button-1>", lambda e, p=f_path, fn=f: make_open_handler(p, fn)())
                            
                            # Delete button
                            def make_delete_handler(fname, is_inb):
                                def handler(e=None):
                                    import time
                                    if messagebox.askyesno("Delete File", f"Are you sure you want to delete {fname}?"):
                                        try:
                                            p = os.path.join(shared_path, ".inbox" if is_inb else "", fname)
                                            if os.path.exists(p):
                                                size = os.path.getsize(p)
                                                os.remove(p)
                                                
                                                # Track in session deleted files
                                                self.session_deleted_files.append({
                                                    "name": fname,
                                                    "size": size,
                                                    "deleted_at": time.time() * 1000
                                                })
                                                
                                                # Log in .metadata.json
                                                try:
                                                    m_path = os.path.join(shared_path, ".metadata.json")
                                                    m_data = {}
                                                    if os.path.exists(m_path):
                                                        try:
                                                            with open(m_path, "r") as fm:
                                                                m_data = json.load(fm)
                                                        except Exception:
                                                            pass
                                                    if "deleted_files" not in m_data or not isinstance(m_data["deleted_files"], list):
                                                        m_data["deleted_files"] = []
                                                    entry = {
                                                        "name": fname,
                                                        "size": size,
                                                        "deleted_at": time.time() * 1000
                                                    }
                                                    if not any(x.get("name") == fname for x in m_data["deleted_files"]):
                                                        m_data["deleted_files"].append(entry)
                                                    with open(m_path, "w") as fm:
                                                        json.dump(m_data, fm)
                                                except Exception:
                                                    pass
                                            refresh_files()
                                        except Exception as ex:
                                            messagebox.showerror("Error", f"Could not delete: {ex}")
                                return handler
                            del_btn = tk.Label(btn_col, text="✕", font=(self.FU, 11, "bold"), bg="#3B1C1C", fg="#FF4D4D", padx=12, pady=4, relief="flat", cursor="hand2")
                            del_btn.pack(side="left", padx=4)
                            del_btn.bind("<Button-1>", lambda e, fn=f, ib=is_inbox_file: make_delete_handler(fn, ib)())
                            
                    # ── Render Connected Hubs Section ────────────────────────
                    if self.connected_hubs and not show_deleted_mode[0]:
                        for hub in self.connected_hubs:
                            hub_url = hub["url"]
                            hub_token = hub["token"]
                            hub_files = hub["files"]
                            
                            disp_host = hub_url.replace('http://','').replace('https://','')
                            
                            sec_card = tk.Frame(scrollable_frame, bg=self.BG, pady=10)
                            sec_card.pack(fill="x")
                            tk.Label(sec_card, text=f"FILES ON REMOTE DEVICE ({disp_host})", font=(self.FU, 8, "bold"), bg=self.BG, fg="#0077C0").pack(side="left")
                            
                            if not hub_files:
                                none_lbl = tk.Label(scrollable_frame, text="No shared files on this remote device.", font=(self.FU, 9, "italic"), bg=self.BG, fg=self.DIM, pady=15)
                                none_lbl.pack(fill="x")
                            else:
                                for rf in hub_files:
                                    rfname = rf.get("name")
                                    rfsize = rf.get("size", 0)
                                    
                                    if rfsize < 1024:
                                        rfsize_str = f"{rfsize} B"
                                    elif rfsize < 1024 * 1024:
                                        rfsize_str = f"{rfsize / 1024:.1f} KB"
                                    elif rfsize < 1024 * 1024 * 1024:
                                        rfsize_str = f"{rfsize / (1024 * 1024):.1f} MB"
                                    else:
                                        rfsize_str = f"{rfsize / (1024 * 1024 * 1024):.1f} GB"
                                        
                                    card = tk.Frame(scrollable_frame, bg=self.BG2, bd=0, padx=12, pady=10, highlightthickness=1, highlightbackground=self.BORDER)
                                    card.pack(fill="x", pady=(0, 8))
                                    
                                    text_col = tk.Frame(card, bg=self.BG2)
                                    text_col.pack(side="left", fill="both", expand=True)
                                    
                                    name_lbl = tk.Label(text_col, text=rfname, font=(self.FU, 10, "bold"), fg=self.WHITE, bg=self.BG2, anchor="w")
                                    name_lbl.pack(fill="x")
                                    
                                    size_lbl = tk.Label(text_col, text=rfsize_str, font=(self.FU, 8), fg=self.DIM, bg=self.BG2, anchor="w")
                                    size_lbl.pack(fill="x")
                                    
                                    btn_col = tk.Frame(card, bg=self.BG2)
                                    btn_col.pack(side="right", fill="y")
                                    
                                    def make_download_handler(filename, size, target_url, target_token):
                                        def handler(e=None):
                                            dest_dir = os.path.expanduser("~/Downloads/LANpad")
                                            os.makedirs(dest_dir, exist_ok=True)
                                            dest_path = os.path.join(dest_dir, filename)
                                            
                                            def download_worker():
                                                try:
                                                    down_url = f"{target_url}/api/files/download/{urllib.parse.quote(filename)}?sid={urllib.parse.quote(target_token)}"
                                                    req = urllib.request.Request(down_url)
                                                    with urllib.request.urlopen(req) as resp:
                                                        with open(dest_path, "wb") as local_file:
                                                            buffer_size = 1024*1024
                                                            while True:
                                                                buf = resp.read(buffer_size)
                                                                if not buf:
                                                                    break
                                                                local_file.write(buf)
                                                    self.root.after(0, lambda fn=filename: messagebox.showinfo("Downloaded", f"Finished downloading:\n{fn}\nSaved to LANpad Downloads folder."))
                                                    self.root.after(100, refresh_files)
                                                except Exception as err:
                                                    self.root.after(0, lambda fn=filename, ex=err: messagebox.showerror("Download Failed", f"Could not download {fn}:\n{ex}"))
                                            threading.Thread(target=download_worker, daemon=True).start()
                                        return handler
                                    
                                    dl_btn = tk.Label(btn_col, text="↓ Download", font=(self.FU, 9, "bold"), bg="#0077C0", fg="#FFFFFF", padx=10, pady=4, relief="flat", cursor="hand2")
                                    dl_btn.pack(side="left", padx=4)
                                    dl_btn.bind("<Button-1>", make_download_handler(rfname, rfsize, hub_url, hub_token))
            except Exception as e:
                lbl = tk.Label(scrollable_frame, text=f"Error: {e}", font=(self.FU, 10), bg=self.BG, fg=self.RED, pady=20)
                lbl.pack(fill="x")

        def open_path(path):
            try:
                import platform
                import subprocess
                if platform.system() == "Darwin":
                    subprocess.Popen(["open", path])
                elif platform.system() == "Windows":
                    os.startfile(path)
                else:
                    subprocess.Popen(["xdg-open", path])
            except Exception as e:
                from tkinter import messagebox
                messagebox.showerror("Error", f"Could not open file: {e}")

        def delete_file(filename):
            from tkinter import messagebox
            try:
                if messagebox.askyesno("Delete File", f"Are you sure you want to delete {filename}?"):
                    os.remove(os.path.join(shared_path, filename))
                    refresh_files()
            except Exception as e:
                messagebox.showerror("Error", f"Could not delete file: {e}")

        def add_file():
            from tkinter import filedialog
            file_paths = filedialog.askopenfilenames(title="Select Files to Share")
            if file_paths:
                start_async_copy(file_paths)

        # Bind Dropzone clicks
        dropzone.bind("<Button-1>", lambda e: add_file())
        dropzone.bind("<Enter>", lambda e: draw_dropzone(True))
        dropzone.bind("<Leave>", lambda e: draw_dropzone(False))
        dropzone.config(cursor="hand2")
        
        # Bind Refresh label clicks
        refresh_lbl.bind("<Button-1>", lambda e: refresh_files())
        
        # Save reference for external updates
        self._refresh_files_list = refresh_files

    def _build_remote(self):
        v = self.remote_view
        W = 400
        _mac = sys.platform == "darwin"
        yo = 0 if _mac else 12  # Y-offset for Windows spacing
        
        # Flat background
        bg_cv = tk.Canvas(v, width=W, height=760, bg=self.BG, highlightthickness=0)
        bg_cv.place(x=0, y=0)
        
        # ── Titlebar (Native Layout) ─────────────────────────────────────────
        tb = tk.Frame(v, bg=self.BG, height=60)
        tb.place(x=0, y=0, relwidth=1)
        self._pill_button(tb, "← Back", self.WHITE, self.BG2,
                          cmd=lambda: self.show_view("files"), side="right")
                          
        # ── Header ───────────────────────────────────────────────────────────
        hdr = tk.Frame(v, bg=self.BG)
        hdr.place(x=18, y=58 + yo, width=W - 36)
        
        # Link icon tile (custom vector link drawing)
        ic = tk.Canvas(hdr, width=32, height=32, bg=self.BG, highlightthickness=0)
        ic.pack(side="left")
        rounded_rect(ic, 0, 0, 32, 32, r=8, fill=self.BG2, outline="")
        ic.create_line(10, 22, 22, 10, fill="#0077C0", width=2)
        ic.create_oval(7, 18, 15, 26, outline="#0077C0", width=2)
        ic.create_oval(17, 6, 25, 14, outline="#0077C0", width=2)
        
        # Title
        hdr_title = tk.Label(hdr, text="Connected Hubs", font=(self.FD, 14, "bold"), bg=self.BG, fg=self.WHITE)
        hdr_title.pack(side="left", padx=8)
        
        FU = self.FU
        FD = self.FD
        
        main_container = tk.Frame(v, bg=self.BG)
        main_container.place(x=18, y=105 + yo, width=W - 36, height=620)
        
        remote_url = tk.StringVar()
        session_token = tk.StringVar()
        
        def refresh_remote_ui():
            for widget in main_container.winfo_children():
                widget.destroy()
                
            if not self.connected_hubs:
                hdr_title.config(text="Connect to Remote Hub")
                show_connection_screen()
            else:
                hdr_title.config(text="Connected Hubs")
                show_hubs_list_screen()
                
        def show_connection_screen():
            lbl_desc = tk.Label(main_container, text="Enter the IP address or URL and Session Token of the other laptop's LANpad app.", font=(FU, 9), bg=self.BG, fg=self.DIM, wraplength=360, justify="left")
            lbl_desc.pack(anchor="w", pady=(0, 20))
            
            tk.Label(main_container, text="REMOTE IP / HOST URL", font=(FU, 8, "bold"), bg=self.BG, fg=self.DIM).pack(anchor="w", pady=(0, 4))
            host_frame = tk.Frame(main_container, bg="#1E1E26", highlightthickness=1, highlightbackground="#3A3A45", highlightcolor="#3A3A45")
            host_frame.pack(fill="x", pady=(0, 15))
            host_ent = tk.Entry(host_frame, textvariable=remote_url, bg="#1E1E26", fg=self.WHITE, font=(FU, 10), bd=0, highlightthickness=0, insertbackground=self.WHITE)
            host_ent.pack(fill="x", ipady=8, padx=8)
            
            tk.Label(main_container, text="SESSION TOKEN (SID)", font=(FU, 8, "bold"), bg=self.BG, fg=self.DIM).pack(anchor="w", pady=(0, 4))
            token_frame = tk.Frame(main_container, bg="#1E1E26", highlightthickness=1, highlightbackground="#3A3A45", highlightcolor="#3A3A45")
            token_frame.pack(fill="x", pady=(0, 20))
            token_ent = tk.Entry(token_frame, textvariable=session_token, bg="#1E1E26", fg=self.WHITE, font=(FU, 10), bd=0, highlightthickness=0, insertbackground=self.WHITE)
            token_ent.pack(fill="x", ipady=8, padx=8)
            
            btn_connect = tk.Label(main_container, text="CONNECT", font=(FU, 10, "bold"), bg="#0077C0", fg=self.WHITE, pady=10, relief="flat", cursor="hand2")
            btn_connect.pack(fill="x", pady=(0, 5))
            btn_connect.bind("<Button-1>", lambda e: connect_to_hub())
            
            if self.connected_hubs:
                btn_cancel = tk.Label(main_container, text="Cancel", font=(FU, 9, "bold"), bg=self.BG, fg=self.DIM, cursor="hand2", pady=8)
                btn_cancel.pack(fill="x", pady=(5, 0))
                btn_cancel.bind("<Button-1>", lambda e: refresh_remote_ui())
            
            info_card = tk.Frame(main_container, bg=self.BG2, bd=0, padx=12, pady=12, highlightthickness=1, highlightbackground=self.BORDER)
            info_card.pack(fill="x", pady=(20, 0))
            
            tk.Label(info_card, text="💡 Where to find these on Laptop B:", font=(FU, 9, "bold"), bg=self.BG2, fg="#0077C0", anchor="w").pack(fill="x", pady=(0, 8))
            
            p1 = "1. REMOTE IP / HOST URL:\nOn Laptop B's LANpad app, look at the top section under 'Local Access' (e.g. 10.237.234.162:8000)."
            p2 = "2. SESSION TOKEN:\nOn Laptop B's LANpad app, copy the alphanumeric key shown in the 'Session Token' label."
            
            tk.Label(info_card, text=p1, font=(FU, 8), bg=self.BG2, fg=self.DIM, justify="left", wraplength=340, anchor="w").pack(fill="x", pady=(0, 8))
            tk.Label(info_card, text=p2, font=(FU, 8), bg=self.BG2, fg=self.DIM, justify="left", wraplength=340, anchor="w").pack(fill="x")
            
        def connect_to_hub():
            url_str = remote_url.get().strip()
            sid_str = session_token.get().strip()
            if not url_str or not sid_str:
                messagebox.showerror("Error", "Please enter both IP/URL and Session Token")
                return
                
            if not url_str.startswith("http://") and not url_str.startswith("https://"):
                url_str = "http://" + url_str
                
            for hub in self.connected_hubs:
                if hub["url"] == url_str:
                    messagebox.showinfo("Already Connected", f"Already connected to {url_str}")
                    refresh_remote_ui()
                    return
            
            try:
                import urllib.request
                import json
                list_url = f"{url_str}/api/files/list?sid={urllib.parse.quote(sid_str)}"
                req = urllib.request.Request(list_url, method="GET")
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode())
                    if data.get("status") == "success":
                        self.connected_hubs.append({
                            "url": url_str,
                            "token": sid_str,
                            "files": data.get("files", [])
                        })
                        remote_url.set("")
                        session_token.set("")
                        self.show_view("files")
                    else:
                        messagebox.showerror("Error", f"Failed: {data.get('message', 'Unknown error')}")
            except Exception as e:
                messagebox.showerror("Connection Failed", f"Could not connect to remote hub:\n{e}")

        def show_hubs_list_screen():
            btn_add = tk.Label(main_container, text="+ Connect Another Device", font=(FU, 9, "bold"), bg=self.BG2, fg="#0077C0", pady=8, highlightthickness=1, highlightbackground="#0077C0", cursor="hand2")
            btn_add.pack(fill="x", pady=(0, 15))
            btn_add.bind("<Button-1>", lambda e: show_connection_screen())
            
            list_frame = tk.Frame(main_container, bg=self.BG)
            list_frame.pack(fill="both", expand=True)
            
            list_canvas = tk.Canvas(list_frame, bg=self.BG, highlightthickness=0)
            list_canvas.pack(fill="both", expand=True)
            
            scrollable_frame = tk.Frame(list_canvas, bg=self.BG)
            scrollable_frame.bind("<Configure>", lambda e: list_canvas.configure(scrollregion=list_canvas.bbox("all")))
            list_canvas.create_window((0, 0), window=scrollable_frame, anchor="nw", width=364)
            
            def _on_mousewheel(event):
                if sys.platform == "darwin":
                    list_canvas.yview_scroll(int(-1 * event.delta), "units")
                else:
                    list_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
            
            list_canvas.bind("<MouseWheel>", _on_mousewheel)
            scrollable_frame.bind("<MouseWheel>", _on_mousewheel)
            
            for hub in self.connected_hubs:
                url_str = hub["url"]
                sid_str = hub["token"]
                files = hub["files"]
                
                disp_host = url_str.replace('http://','').replace('https://','')
                
                dev_card = tk.Frame(scrollable_frame, bg=self.BG2, bd=0, padx=12, pady=10, highlightthickness=1, highlightbackground=self.BORDER)
                dev_card.pack(fill="x", pady=(0, 15))
                
                title_row = tk.Frame(dev_card, bg=self.BG2)
                title_row.pack(fill="x", pady=(0, 6))
                
                lbl_connected = tk.Label(title_row, text=f"🟢 {disp_host}", font=(FU, 9, "bold"), bg=self.BG2, fg="#00C853", anchor="w")
                lbl_connected.pack(side="left")
                
                def make_disconnect_handler(target_url):
                    def handler(e=None):
                        self.connected_hubs = [h for h in self.connected_hubs if h["url"] != target_url]
                        refresh_remote_ui()
                    return handler
                
                btn_disc = tk.Label(title_row, text="Disconnect", font=(FU, 9, "bold"), bg=self.BG2, fg="#FF4D4D", cursor="hand2")
                btn_disc.pack(side="right")
                btn_disc.bind("<Button-1>", make_disconnect_handler(url_str))
                
                action_row = tk.Frame(dev_card, bg=self.BG2)
                action_row.pack(fill="x", pady=(4, 8))
                
                def make_upload_handler(target_url, target_token, target_hub):
                    def upload_files(e=None):
                        from tkinter import filedialog
                        file_paths = filedialog.askopenfilenames(title=f"Send Files to {target_url.replace('http://','').replace('https://','')}")
                        if not file_paths:
                            return
                            
                        def worker():
                            for path in file_paths:
                                if not os.path.exists(path):
                                    continue
                                filename = os.path.basename(path)
                                size = os.path.getsize(path)
                                
                                try:
                                    pre_url = f"{target_url}/api/files/preallocate?filename={urllib.parse.quote(filename)}&size={size}&mode=parallel&sid={urllib.parse.quote(target_token)}"
                                    pre_req = urllib.request.Request(pre_url, method="POST")
                                    with urllib.request.urlopen(pre_req) as resp:
                                        pass
                                        
                                    chunk_size = 4 * 1024 * 1024
                                    with open(path, "rb") as f:
                                        offset = 0
                                        while offset < size:
                                            chunk_data = f.read(chunk_size)
                                            if not chunk_data:
                                                break
                                            
                                            up_url = f"{target_url}/api/files/upload_direct?filename={urllib.parse.quote(filename)}&offset={offset}&mode=parallel&sid={urllib.parse.quote(target_token)}"
                                            up_req = urllib.request.Request(up_url, data=chunk_data, method="POST")
                                            up_req.add_header("Content-Type", "application/octet-stream")
                                            with urllib.request.urlopen(up_req) as resp:
                                                pass
                                            offset += len(chunk_data)
                                            
                                    v.after(0, lambda fn=filename: messagebox.showinfo("Success", f"Successfully uploaded {fn}!"))
                                except Exception as ex:
                                    v.after(0, lambda fn=filename, err=ex: messagebox.showerror("Upload Failed", f"Failed to upload {fn}:\n{err}"))
                            
                            v.after(100, lambda: make_refresh_handler(target_url, target_token, target_hub)())
                            
                        threading.Thread(target=worker, daemon=True).start()
                    return upload_files
                
                def make_refresh_handler(target_url, target_token, target_hub):
                    def refresh_files(e=None):
                        try:
                            import urllib.request
                            import json
                            list_url = f"{target_url}/api/files/list?sid={urllib.parse.quote(target_token)}"
                            req = urllib.request.Request(list_url, method="GET")
                            with urllib.request.urlopen(req, timeout=5) as response:
                                data = json.loads(response.read().decode())
                                if data.get("status") == "success":
                                    target_hub["files"] = data.get("files", [])
                                    v.after(0, refresh_remote_ui)
                        except Exception as e:
                            print(f"Failed to refresh remote files: {e}")
                    return refresh_files
                
                btn_send = tk.Label(action_row, text="↑ Send File", font=(FU, 8, "bold"), bg="#0077C0", fg=self.WHITE, padx=8, pady=4, cursor="hand2")
                btn_send.pack(side="left", padx=(0, 6))
                btn_send.bind("<Button-1>", make_upload_handler(url_str, sid_str, hub))
                
                btn_refresh = tk.Label(action_row, text="⟳ Refresh Files", font=(FU, 8, "bold"), bg=self.BG, fg="#0077C0", padx=8, pady=4, cursor="hand2", highlightthickness=1, highlightbackground=self.BORDER)
                btn_refresh.pack(side="left")
                btn_refresh.bind("<Button-1>", make_refresh_handler(url_str, sid_str, hub))
                
                tk.Label(dev_card, text="Shared Files:", font=(FU, 8, "bold"), bg=self.BG2, fg=self.DIM, anchor="w").pack(fill="x", pady=(6, 4))
                
                if not files:
                    tk.Label(dev_card, text="No shared files on this remote hub.", font=(FU, 8, "italic"), bg=self.BG2, fg=self.DIM, anchor="w").pack(fill="x", pady=2)
                else:
                    for f in files:
                        fname = f.get("name")
                        fsize = f.get("size", 0)
                        
                        if fsize < 1024:
                            size_str = f"{fsize} B"
                        elif fsize < 1024 * 1024:
                            size_str = f"{fsize / 1024:.1f} KB"
                        elif fsize < 1024 * 1024 * 1024:
                            size_str = f"{fsize / (1024 * 1024):.1f} MB"
                        else:
                            size_str = f"{fsize / (1024 * 1024 * 1024):.1f} GB"
                            
                        file_row = tk.Frame(dev_card, bg=self.BG2)
                        file_row.pack(fill="x", pady=2)
                        
                        lbl_file = tk.Label(file_row, text=fname, font=(FU, 8), fg=self.WHITE, bg=self.BG2, anchor="w", justify="left")
                        lbl_file.pack(side="left", fill="x", expand=True)
                        
                        def make_download_handler(filename, size, target_url, target_token):
                            def handler(e=None):
                                dest_dir = os.path.expanduser("~/Downloads/LANpad")
                                os.makedirs(dest_dir, exist_ok=True)
                                dest_path = os.path.join(dest_dir, filename)
                                
                                def download_worker():
                                    try:
                                        down_url = f"{target_url}/api/files/download/{urllib.parse.quote(filename)}?sid={urllib.parse.quote(target_token)}"
                                        req = urllib.request.Request(down_url)
                                        with urllib.request.urlopen(req) as resp:
                                            with open(dest_path, "wb") as local_file:
                                                shutil_copy(resp, local_file)
                                        v.after(0, lambda fn=filename: messagebox.showinfo("Downloaded", f"Finished downloading:\n{fn}\nSaved to LANpad Downloads folder."))
                                    except Exception as err:
                                        v.after(0, lambda fn=filename, ex=err: messagebox.showerror("Download Failed", f"Could not download {fn}:\n{ex}"))
                                threading.Thread(target=download_worker, daemon=True).start()
                            return handler
                        
                        btn_dl = tk.Label(file_row, text="Get", font=(FU, 7, "bold"), bg="#0077C0", fg=self.WHITE, padx=6, pady=2, cursor="hand2")
                        btn_dl.pack(side="right", padx=(4, 0))
                        btn_dl.bind("<Button-1>", make_download_handler(fname, fsize, url_str, sid_str))
                        
                        lbl_fsize = tk.Label(file_row, text=size_str, font=(FU, 7), fg=self.DIM, bg=self.BG2)
                        lbl_fsize.pack(side="right")
                        
            def shutil_copy(src, dst):
                buffer_size = 1024*1024
                while True:
                    buf = src.read(buffer_size)
                    if not buf:
                        break
                    dst.write(buf)
        
        self._refresh_remote_view = refresh_remote_ui
        refresh_remote_ui()

    # ── MONETIZATION & ACTIVATION LOCK SCREEN ────────────────────────────────

    def _build_lock(self):
        v = self.lock_view
        W, H = 400, 760
        _mac = sys.platform == "darwin"
        
        # 1. Base Canvas for background gradient & card drawing
        self.lock_cv = tk.Canvas(v, width=W, height=H, bg="#050505", highlightthickness=0)
        self.lock_cv.place(x=0, y=0)
        
        # Top Ambient glow (concentric semi-circles)
        for r in range(160, 0, -20):
            c = blend_hex("#0077C0", "#050505", r / 160 * 0.15)
            self.lock_cv.create_oval(200 - r, -100 - r, 200 + r, -100 + r, fill=c, outline="")
            
        # Draw glassmorphic card container
        card_x1, card_y1, card_x2, card_y2 = 24, 70, 376, 680
        rounded_rect(self.lock_cv, card_x1, card_y1, card_x2, card_y2, r=24, fill="#0D0D10", outline="#1F1F24")

        def close_lock():
            license_path = os.path.expanduser("~/.lanpad_license.json")
            if not getattr(self, "monetization_enabled", False) or getattr(self, "free_enabled", False):
                self.show_view("main")
            elif os.path.exists(license_path):
                self.show_view("main")
            else:
                self.lock_status_lbl.config(text="Valid activation required to use LANpad", fg=self.RED)

        close_btn = tk.Button(v, text="✕", fg="#8A8A93", activeforeground=self.WHITE, bg="#0D0D10", activebackground="#0D0D10", font=(self.FD, 14, "bold"), bd=0, highlightthickness=0, command=close_lock, cursor="hand2")
        close_btn.place(x=340, y=86, width=24, height=24)
        
        self.lock_time_left_lbl = tk.Label(v, text="", fg="#A0AEC0", bg="#0D0D10", font=(self.FU, 8, "bold"), anchor="e")
        self.lock_time_left_lbl.place(x=364, y=114, anchor="ne")
        
        # Logo placeholder inside card
        logo_y = 120
        self._lock_logo_cv = tk.Canvas(v, width=80, height=80, bg="#0D0D10", highlightthickness=0)
        self._lock_logo_cv.place(x=160, y=logo_y)
        
        try:
            from PIL import Image, ImageTk
            logo_img = Image.open(resource_path("logo.png")).resize((80, 80), Image.Resampling.LANCZOS)
            self._lock_logo_tk = ImageTk.PhotoImage(logo_img)
            self._lock_logo_cv.create_image(40, 40, image=self._lock_logo_tk)
        except Exception:
            self._lock_logo_cv.create_text(40, 40, text="🔒", fill=self.WHITE, font=(self.FD, 36, "bold"))
            
        # Title
        title_lbl = tk.Label(v, text="LANpad Activation", fg=self.WHITE, bg="#0D0D10", font=(self.FD, 22, "bold"))
        title_lbl.place(x=24, y=logo_y + 110, width=W - 48)
        
        # Subtitle
        sub_lbl = tk.Label(v, text="Direct local connection and\nsecure device communication.", fg="#8A8A93", bg="#0D0D10", font=(self.FU, 12))
        sub_lbl.place(x=24, y=logo_y + 155, width=W - 48)
        
        # Key Input Label
        key_lbl = tk.Label(v, text="ACTIVATION KEY", fg="#8A8A93", bg="#0D0D10", font=(self.FU, 9, "bold"))
        key_lbl.place(x=48, y=logo_y + 230)
        
        # Input Entry Background wrapper
        entry_frame = tk.Frame(v, bg="#16161A", bd=0, highlightthickness=1, highlightbackground="#2A2A30", highlightcolor="#0077C0")
        entry_frame.place(x=48, y=logo_y + 255, width=W - 96, height=44)
        
        self.key_entry = tk.Entry(entry_frame, bg="#16161A", fg=self.WHITE, insertbackground=self.WHITE, font=(self.FM, 11), bd=0, highlightthickness=0)
        self.key_entry.place(x=12, y=10, width=W - 176, height=24)
        
        self.show_hide_btn = tk.Label(entry_frame, text="Show", fg=self.DIM, bg="#16161A", font=(self.FU, 10, "bold"), cursor="hand2")
        self.show_hide_btn.bind("<Button-1>", lambda e: self.start_toggle_key_visibility_thread())
        self.show_hide_btn.bind("<Enter>", lambda e: self.show_hide_btn.config(fg=self.WHITE))
        self.show_hide_btn.bind("<Leave>", lambda e: self.show_hide_btn.config(fg=self.DIM))
        
        # Status Label
        self.lock_status_lbl = tk.Label(v, text="", fg=self.RED, bg="#0D0D10", font=(self.FU, 10))
        self.lock_status_lbl.place(x=24, y=logo_y + 310, width=W - 48)
        
        # Action Handler
        def do_activation():
            key = self.key_entry.get().strip()
            if not key:
                self.lock_status_lbl.config(text="Please enter an activation key", fg=self.RED)
                return
            self.lock_status_lbl.config(text="Verifying activation key...", fg=self.DIM)
            self.key_entry.config(state="disabled")
            btn_cv.unbind("<ButtonRelease-1>")
            self.root.update()
            
            log_dir = os.path.expanduser("~/.lanpad")
            os.makedirs(log_dir, exist_ok=True)
            log_path = os.path.join(log_dir, "activation_debug.log")

            def _verify_task():
                try:
                    success, tier, expires_at, error = self.verify_key_online(key)
                    self.gui_queue.put(lambda: _handle_result(success, tier, expires_at, error))
                except Exception as e:
                    import traceback
                    with open(log_path, "a") as f:
                        f.write(f"Exception in _verify_task: {e}\n")
                        traceback.print_exc(file=f)
                    self.gui_queue.put(lambda: _handle_result(False, "Basic", None, "Internal verification error"))

            def _handle_result(success, tier, expires_at, error):
                try:
                    self.key_entry.config(state="normal")
                    btn_cv.bind("<ButtonRelease-1>", lambda e: (draw_btn_state("normal"), do_activation()))
                    if success:
                        days_left = calculate_days_left(expires_at)
                        license_path = os.path.expanduser("~/.lanpad_license.json")
                        
                        # Check for downgrade
                        try:
                            if os.path.exists(license_path):
                                import json
                                with open(license_path, "r", encoding="utf-8") as f:
                                    old_lic = json.load(f)
                                old_tier = old_lic.get("tier", "Basic").upper()
                                old_expires = old_lic.get("expires_at", "")
                                if calculate_days_left(old_expires) > 0:
                                    ranks = {"BASIC": 1, "PRO": 2, "MAX": 3, "ULTRA": 4}
                                    if ranks.get(tier.upper(), 0) < ranks.get(old_tier, 0):
                                        self.lock_status_lbl.config(text=f"Cannot downgrade active {old_tier} plan to {tier.upper()}", fg=self.RED)
                                        return
                        except Exception as e:
                            print(f"[monetization] Downgrade check error: {e}")

                        try:
                            import json
                            from platform_utils import get_hardware_id
                            with open(license_path, "w", encoding="utf-8") as f:
                                json.dump({"key": key, "tier": tier, "expires_at": expires_at, "last_checked": time.time(), "hwid": get_hardware_id()}, f)

                        except Exception as e:
                            print(f"[monetization] Error saving license: {e}")
                        
                        self.show_success_overlay(tier, days_left)
                    else:
                        self.lock_status_lbl.config(text=error or "Invalid or expired activation key", fg=self.RED)
                        entry_frame.config(highlightbackground=self.RED)
                        self.root.after(1000, lambda: entry_frame.config(highlightbackground="#2A2A30"))

                except Exception as e:
                    import traceback
                    with open(log_path, "a") as f:
                        f.write(f"Exception in _handle_result: {e}\n")
                        traceback.print_exc(file=f)
                    # Attempt to recover UI interaction
                    try:
                        self.key_entry.config(state="normal")
                        btn_cv.bind("<ButtonRelease-1>", lambda e: (draw_btn_state("normal"), do_activation()))
                        self.lock_status_lbl.config(text=f"Error verifying key: {e}", fg=self.RED)
                    except Exception:
                        pass

            import threading
            threading.Thread(target=_verify_task, daemon=True).start()

        # Activate Button on Canvas (styled custom button)
        btn_cv = tk.Canvas(v, width=W - 96, height=48, bg="#0D0D10", highlightthickness=0)
        btn_cv.place(x=48, y=logo_y + 350)
        
        def draw_btn_state(state="normal"):
            btn_cv.delete("all")
            if state == "hover":
                rounded_rect(btn_cv, 0, 0, W - 96, 48, r=24, fill="#0088DD", outline="")
            elif state == "press":
                rounded_rect(btn_cv, 0, 0, W - 96, 48, r=24, fill="#0066AA", outline="")
            else:
                rounded_rect(btn_cv, 0, 0, W - 96, 48, r=24, fill="#0077C0", outline="")
            btn_cv.create_text((W - 96) // 2, 24, text="ACTIVATE LANPAD", fill="white", font=(self.FU, 11, "bold"))

        draw_btn_state()
        btn_cv.bind("<Enter>", lambda e: draw_btn_state("hover"))
        btn_cv.bind("<Leave>", lambda e: draw_btn_state("normal"))
        btn_cv.bind("<Button-1>", lambda e: draw_btn_state("press"))
        btn_cv.bind("<ButtonRelease-1>", lambda e: (draw_btn_state("normal"), do_activation()))
        btn_cv.config(cursor="hand2")
        
        # Web Link
        def open_pricing():
            import webbrowser
            webbrowser.open("https://lanpad.app/pricing")
            
        get_btn = tk.Button(v, text="Get Activation Key", fg="#8A8A93", activeforeground=self.WHITE, bg="#0D0D10", activebackground="#0D0D10", font=(self.FU, 11, "underline"), bd=0, highlightthickness=0, command=open_pricing, cursor="hand2")
        get_btn.place(x=48, y=logo_y + 415, width=W - 96, height=30)

    def show_success_overlay(self, tier, days_left):
        self.key_entry.config(state="disabled")
        W, H = 400, 760
        overlay = tk.Canvas(self.lock_view, width=W - 48, height=600, bg="#0D0D10", highlightthickness=0)
        overlay.place(x=24, y=75)
        
        for r in range(100, 0, -20):
            c = blend_hex("#10B981", "#0D0D10", r / 100 * 0.12)
            overlay.create_oval(176 - r, 180 - r, 176 + r, 180 + r, fill=c, outline="")
            
        overlay.create_text(176, 180, text="✓", fill="#10B981", font=(self.FD, 48, "bold"))
        overlay.create_text(176, 280, text="Activation Successful!", fill=self.WHITE, font=(self.FD, 20, "bold"))
        
        tier_label = f"License Tier: {tier.upper()}"
        days_label = f"Pass Validity: {days_left} Days Remaining" if days_left > 0 else "Pass Validity: Expiring Today"
        
        overlay.create_text(176, 330, text=tier_label, fill="#0077C0", font=(self.FU, 12, "bold"))
        overlay.create_text(176, 360, text=days_label, fill="#8A8A93", font=(self.FU, 12))
        overlay.create_text(176, 420, text="Launching LANpad...", fill=self.DIM, font=(self.FU, 10, "italic"))
        
        progress_bar = overlay.create_rectangle(48, 460, 48, 464, fill="#10B981", outline="")
        overlay.create_rectangle(48, 460, 304, 464, outline="#1F1F24", width=1)
        
        steps = 50
        duration = 1500
        step_time = duration // steps
        
        def update_progress(step):
            if step <= steps:
                x_end = 48 + int((304 - 48) * (step / steps))
                overlay.coords(progress_bar, 48, 460, x_end, 464)
                self.root.after(step_time, lambda: update_progress(step + 1))
            else:
                self.show_view("main")
                overlay.destroy()
                self.key_entry.config(state="normal")
                
        update_progress(0)

    def _build_legal(self):
        v = self.legal_view
        W, H = 400, 760
        
        self.legal_cv = tk.Canvas(v, width=W, height=H, bg="#050505", highlightthickness=0)
        self.legal_cv.place(x=0, y=0)
        
        for r in range(160, 0, -20):
            c = blend_hex("#0077C0", "#050505", r / 160 * 0.15)
            self.legal_cv.create_oval(200 - r, -80 - r, 200 + r, -80 + r, fill=c, outline="")
            
        card_x1, card_y1, card_x2, card_y2 = 24, 60, 376, 700
        rounded_rect(self.legal_cv, card_x1, card_y1, card_x2, card_y2, r=24, fill="#0D0D10", outline="#1F1F24")
        
        title_lbl = tk.Label(v, text="Legal Agreement", fg=self.WHITE, bg="#0D0D10", font=(self.FD, 22, "bold"))
        title_lbl.place(x=24, y=90, width=W - 48)
        
        desc_lbl = tk.Label(v, text="To use LANpad, you must read and accept the terms and privacy conditions.", fg="#8A8A93", bg="#0D0D10", font=(self.FU, 11), justify="center", wraplength=320)
        desc_lbl.place(x=24, y=135, width=W - 48)
        
        y_offset = 200
        highlights = [
            ("No Academic Malpractice", "You agree NOT to bypass exam security or proctoring platforms (CFAA & ITA compliance)."),
            ("Local Data Syncing", "No clipboard or typing data leaves your local network. Zero external cloud storage."),
            ("AS-IS Disclaimers", "Provided with no warranty. Users assume 100% liability for system setup and security.")
        ]
        
        for title, text in highlights:
            lbl_title = tk.Label(v, text=f"• {title}", fg="#C7EEFF", bg="#0D0D10", font=(self.FD, 12, "bold"), anchor="w")
            lbl_title.place(x=45, y=y_offset, width=310)
            
            lbl_text = tk.Label(v, text=text, fg="#A0AEC0", bg="#0D0D10", font=(self.FU, 10), justify="left", anchor="w", wraplength=300)
            lbl_text.place(x=55, y=y_offset + 22, width=300)
            y_offset += 75
            
        def open_tos():
            import webbrowser
            webbrowser.open("http://127.0.0.1:8000/terms")
            
        def open_privacy():
            import webbrowser
            webbrowser.open("http://127.0.0.1:8000/privacy")

        # Position terms and privacy links side-by-side on a single centered row
        links_frame = tk.Frame(v, bg="#0D0D10")
        links_frame.place(x=24, y=470, width=W - 48, height=30)
        
        tos_btn = tk.Label(links_frame, text="Read Terms of Service", fg="#0077C0", bg="#0D0D10", font=(self.FU, 10, "underline"), cursor="hand2")
        tos_btn.pack(side="left", expand=True)
        tos_btn.bind("<Button-1>", lambda e: open_tos())
        
        divider_lbl = tk.Label(links_frame, text="•", fg="#4A5568", bg="#0D0D10", font=(self.FU, 10))
        divider_lbl.pack(side="left")
        
        privacy_btn = tk.Label(links_frame, text="Read Privacy Policy", fg="#0077C0", bg="#0D0D10", font=(self.FU, 10, "underline"), cursor="hand2")
        privacy_btn.pack(side="left", expand=True)
        privacy_btn.bind("<Button-1>", lambda e: open_privacy())
        
        agree_var = tk.BooleanVar(value=False)
        agree_chk = tk.Checkbutton(
            v,
            text="I agree to the Terms of Service and Privacy Policy",
            variable=agree_var,
            fg=self.WHITE,
            bg="#0D0D10",
            selectcolor="#0D0D10",
            activebackground="#0D0D10",
            activeforeground=self.WHITE,
            font=(self.FU, 10),
            highlightthickness=0,
            bd=0,
            anchor="w"
        )
        agree_chk.place(x=45, y=515, width=310)

        def send_consent_telemetry():
            try:
                import os
                if os.environ.get("LANPAD_TELEMETRY_DISABLE") == "1":
                    return
                # Check user settings
                try:
                    cfg_path = os.path.expanduser("~/.lanpad/config.json")
                    if os.path.exists(cfg_path):
                        import json
                        with open(cfg_path, "r", encoding="utf-8") as f:
                            cfg = json.load(f)
                        if cfg.get("telemetry_opt_in") is False:
                            return
                except Exception:
                    pass

                import urllib.request
                import json
                import sys
                from platform_utils import get_hardware_id, VERSION, is_mac
                
                hwid = get_hardware_id()
                platform_str = "macOS" if is_mac() else "Windows"
                event_name = f"terms_acceptance:{VERSION}:{platform_str}"
                
                payload = json.dumps({
                    "type": "event",
                    "uuid": hwid,
                    "event": event_name
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
                        with safe_urlopen(req, timeout=3) as resp:
                            res = json.loads(resp.read().decode("utf-8"))
                            if res.get("success", False):
                                print(f"[telemetry] Consent logged successfully to {url}")
                                break
                    except Exception as e:
                        print(f"[telemetry] Failed to log consent on {url}: {e}")
            except Exception as e:
                print(f"[telemetry] Error preparing consent telemetry: {e}")

        def on_accept():
            if not agree_var.get():
                import tkinter.messagebox
                tkinter.messagebox.showwarning(
                    "Agreement Required",
                    "You must check the box to agree to the Terms of Service and Privacy Policy before continuing."
                )
                return

            for path_str in ["~/.lanpad/legal.json", "~/.lanpad_legal.json"]:
                try:
                    path = os.path.expanduser(path_str)
                    os.makedirs(os.path.dirname(path), exist_ok=True)
                    import json
                    with open(path, "w", encoding="utf-8") as f:
                        json.dump({"accepted": True, "timestamp": time.time()}, f)
                except Exception as e:
                    print(f"Error saving legal acceptance to {path_str}: {e}")
            
            # Send consent telemetry asynchronously in the background
            import threading
            threading.Thread(target=send_consent_telemetry, daemon=True).start()

            if hasattr(self, "monetization_enabled") and self.monetization_enabled:
                if hasattr(self, "free_enabled") and self.free_enabled:
                    self.show_view("main")
                else:
                    self.show_view("lock")
            else:
                self.show_view("main")
                
        btn_tw = 200
        btn_cv = tk.Canvas(v, width=btn_tw, height=36, bg="#0D0D10", highlightthickness=0)
        btn_cv.place(x=(W - btn_tw) // 2, y=565)
        
        rounded_rect(btn_cv, 0, 2, btn_tw, 34, r=16, fill="#0077C0", outline="")
        btn_cv.create_text(btn_tw // 2, 18, text="ACCEPT & CONTINUE", fill=self.WHITE, font=(self.FU, 11, "bold"))
        
        def handler(e): on_accept()
        btn_cv.bind("<Button-1>", handler)
        btn_cv.config(cursor="hand2")

    def _build_splash(self):
        v = self.splash_view
        W, H = 400, 760
        
        self.splash_cv = tk.Canvas(v, width=W, height=H, bg="#050505", highlightthickness=0)
        self.splash_cv.place(x=0, y=0)
        
        # Top Ambient glow (concentric semi-circles)
        for r in range(160, 0, -20):
            c = blend_hex("#0077C0", "#050505", r / 160 * 0.15)
            self.splash_cv.create_oval(200 - r, -100 - r, 200 + r, -100 + r, fill=c, outline="")
            
        # Draw glassmorphic card container
        card_x1, card_y1, card_x2, card_y2 = 24, 70, 376, 680
        rounded_rect(self.splash_cv, card_x1, card_y1, card_x2, card_y2, r=24, fill="#0D0D10", outline="#1F1F24")
        
        # Logo placeholder inside card (vertically centered)
        logo_y = 220
        self._splash_logo_cv = tk.Canvas(v, width=80, height=80, bg="#0D0D10", highlightthickness=0)
        self._splash_logo_cv.place(x=160, y=logo_y)
        
        try:
            from PIL import Image, ImageTk
            logo_img = Image.open(resource_path("logo.png")).resize((80, 80), Image.Resampling.LANCZOS)
            self._splash_logo_tk = ImageTk.PhotoImage(logo_img)
            self._splash_logo_cv.create_image(40, 40, image=self._splash_logo_tk)
        except Exception:
            self._splash_logo_cv.create_text(40, 40, text="⚡", fill=self.WHITE, font=(self.FD, 36, "bold"))
            
        # Title
        title_lbl = tk.Label(v, text="LANpad", fg=self.WHITE, bg="#0D0D10", font=(self.FD, 26, "bold"))
        title_lbl.place(x=24, y=logo_y + 100, width=W - 48)
        
        # Subtitle / loading text
        self.splash_status_lbl = tk.Label(v, text="Synchronizing status", fg="#8A8A93", bg="#0D0D10", font=(self.FU, 12))
        self.splash_status_lbl.place(x=24, y=logo_y + 145, width=W - 48)

        # loader line bg
        rounded_rect(self.splash_cv, 100, logo_y + 200, 300, logo_y + 204, r=2, fill="#1F1F24", outline="")
        
        # We create a progress block shape on the canvas
        self._loader_bar = self.splash_cv.create_rectangle(100, logo_y + 200, 140, logo_y + 204, fill="#0077C0", outline="")
        
        self._loader_x = 100
        self._loader_dir = 1
        
        def animate_loader():
            try:
                if not self.splash_view.winfo_exists():
                    return
                if self.splash_view.winfo_viewable():
                    # Move loader block back and forth
                    self._loader_x += 4 * self._loader_dir
                    if self._loader_x >= 260:
                        self._loader_dir = -1
                    elif self._loader_x <= 100:
                        self._loader_dir = 1
                    
                    self.splash_cv.coords(self._loader_bar, self._loader_x, logo_y + 200, self._loader_x + 40, logo_y + 204)
                self.root.after(30, animate_loader)
            except Exception:
                pass
                
        self.root.after(30, animate_loader)

        self._splash_dots = 0
        def animate_dots():
            try:
                if not self.splash_view.winfo_exists():
                    return
                if self.splash_view.winfo_viewable():
                    self._splash_dots = (self._splash_dots + 1) % 4
                    dots = "." * self._splash_dots
                    self.splash_status_lbl.config(text=f"Synchronizing status{dots}")
                self.root.after(500, animate_dots)
            except Exception:
                pass
                
        self.root.after(500, animate_dots)

    def check_monetization_status(self):
        import threading
        
        def _thread_task():
            try:
                monetization_enabled = False
                free_enabled = False
                import sys
                if getattr(sys, 'frozen', False):
                    urls = ["https://lanpad.app"]
                else:
                    urls = ["http://127.0.0.1:3000", "https://lanpad.app"]
                
                for base_url in urls:
                    try:
                        req = urllib.request.Request(f"{base_url}/api/monetization/status", headers={"User-Agent": "LANpad App"})
                        with safe_urlopen(req, timeout=3) as resp:
                            data = json.loads(resp.read().decode("utf-8"))
                            monetization_enabled = data.get("monetization_enabled", False)
                            free_enabled = data.get("free_enabled", False)
                            try:
                                mon_path = os.path.expanduser("~/.lanpad_monetization.json")
                                with open(mon_path, "w", encoding="utf-8") as f:
                                    json.dump({
                                        "monetization_enabled": monetization_enabled, 
                                        "free_enabled": free_enabled, 
                                        "plans": data.get("plans", []),
                                        "last_checked": time.time()
                                    }, f)
                            except Exception:
                                pass
                            break
                    except Exception as e:
                        print(f"[monetization] Status fetch failed on {base_url}: {e}")
                    
                def _update_vars():
                    self.monetization_enabled = monetization_enabled
                    self.free_enabled = free_enabled
                self.gui_queue.put(_update_vars)

                if not monetization_enabled:
                    self.gui_queue.put(lambda: self.show_view("main"))
                    return
                    
                license_path = os.path.expanduser("~/.lanpad_license.json")
                if os.path.exists(license_path):
                    try:
                        from platform_utils import get_hardware_id
                        with open(license_path, "r", encoding="utf-8") as f:
                            lic = json.load(f)
                        key = lic.get("key")
                        tier = lic.get("tier")
                        last_checked = lic.get("last_checked", 0)
                        
                        expires_at = lic.get("expires_at")
                        is_expired = False
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
                                is_expired = True

                        if is_expired:
                            print("[monetization] License expired. Removing cached file.")
                            try: os.remove(license_path)
                            except Exception: pass
                        else:
                            # Trust key offline if checked within 24 hours and has a valid cached HWID
                            if time.time() - last_checked < 86400 and lic.get("hwid"):
                                print(f"[monetization] Cached key '{key}' is valid offline ({tier}).")
                                self.gui_queue.put(lambda: self.show_view("main"))
                                return
                                
                            success, new_tier, expires_at, _ = self.verify_key_online(key)
                            if success:
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
                                if expiry_dt > now_dt:
                                    print(f"[monetization] Key verified online ({new_tier}).")
                                    with open(license_path, "w", encoding="utf-8") as f:
                                        json.dump({"key": key, "tier": new_tier, "expires_at": expires_at, "last_checked": time.time(), "hwid": get_hardware_id()}, f)
                                    self.gui_queue.put(lambda: self.show_view("main"))
                                    return
                                else:
                                    print("[monetization] Online verification shows key is expired.")
                                    try: os.remove(license_path)
                                    except Exception: pass
                    except Exception as e:
                        print(f"[monetization] License check error: {e}")
                        
                if free_enabled:
                    self.gui_queue.put(lambda: self.show_view("main"))
                else:
                    self.gui_queue.put(lambda: self.show_view("lock"))
            except Exception as e:
                print(f"[monetization] Error in status thread: {e}")
                self.gui_queue.put(lambda: self.show_view("lock"))

        threading.Thread(target=_thread_task, daemon=True).start()

    def verify_key_online(self, key):
        import urllib.request
        import json
        import sys
        from platform_utils import get_hardware_id

        hwid = get_hardware_id()
        payload = json.dumps({"key": key, "hwid": hwid}).encode("utf-8")
        if getattr(sys, 'frozen', False):
            urls = ["https://lanpad.app/api/monetization/verify"]
        else:
            urls = ["http://127.0.0.1:3000/api/monetization/verify", "https://lanpad.app/api/monetization/verify"]
        
        last_error = "Invalid or expired activation key"
        for url in urls:
            try:
                req = urllib.request.Request(
                    url,
                    data=payload,
                    headers={"Content-Type": "application/json", "User-Agent": "LANpad App"},
                    method="POST"
                )
                with safe_urlopen(req, timeout=3) as resp:
                    res = json.loads(resp.read().decode("utf-8"))
                    if res.get("valid", False):
                        return True, res.get("tier", "Basic"), res.get("expires_at", "2099-12-31T23:59:59Z"), None
                    else:
                        last_error = res.get("error", last_error)
            except Exception as e:
                print(f"[monetization] Verify online error on {url}: {e}")
                
        return False, "Basic", None, last_error


    def start_license_loop(self):
        self.root.after(3600000, self.periodic_license_check)
        
    def periodic_license_check(self):
        import threading
        
        def _thread_task():
            try:
                import sys
                monetization_enabled = False
                free_enabled = False
                if getattr(sys, 'frozen', False):
                    urls = ["https://lanpad.app"]
                else:
                    urls = ["http://127.0.0.1:3000", "https://lanpad.app"]
                
                for base_url in urls:
                    try:
                        req = urllib.request.Request(f"{base_url}/api/monetization/status", headers={"User-Agent": "LANpad App"})
                        with safe_urlopen(req, timeout=3) as resp:
                            data = json.loads(resp.read().decode("utf-8"))
                            monetization_enabled = data.get("monetization_enabled", False)
                            free_enabled = data.get("free_enabled", False)
                            try:
                                mon_path = os.path.expanduser("~/.lanpad_monetization.json")
                                with open(mon_path, "w", encoding="utf-8") as f:
                                    json.dump({
                                        "monetization_enabled": monetization_enabled,
                                        "free_enabled": free_enabled,
                                        "plans": data.get("plans", []),
                                        "last_checked": time.time()
                                    }, f)
                            except Exception:
                                pass
                            break
                    except Exception as e:
                        pass
                    
                if monetization_enabled:
                    license_path = os.path.expanduser("~/.lanpad_license.json")
                    if os.path.exists(license_path):
                        try:
                            import json
                            with open(license_path, "r", encoding="utf-8") as f:
                                lic = json.load(f)
                            key = lic.get("key")
                            
                            success, tier, expires_at, _ = self.verify_key_online(key)
                            if success:
                                # Double check expiry
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
                                if expiry_dt > now_dt:
                                    with open(license_path, "w", encoding="utf-8") as f:
                                        from platform_utils import get_hardware_id
                                        json.dump({"key": key, "tier": tier, "expires_at": expires_at, "last_checked": time.time(), "hwid": get_hardware_id()}, f)
                                else:
                                    print("[monetization] Key expired. Locking app.")
                                    try: os.remove(license_path)
                                    except Exception: pass
                                    if not free_enabled:
                                        self.gui_queue.put(lambda: self.show_view("lock"))
                            else:
                                print("[monetization] Key expired or invalid. Locking app.")
                                try:
                                    os.remove(license_path)
                                except Exception as e:
                                    print(f"[monetization] Error locking app: {e}")
                                if not free_enabled:
                                    self.gui_queue.put(lambda: self.show_view("lock"))
                        except Exception as e:
                            pass
                    else:
                        if not free_enabled:
                            self.gui_queue.put(lambda: self.show_view("lock"))
            except Exception as e:
                print(f"[monetization] Error in periodic check thread: {e}")
            
            # Re-schedule next periodic check on main thread
            self.gui_queue.put(lambda: self.root.after(3600000, self.periodic_license_check))

        threading.Thread(target=_thread_task, daemon=True).start()

    # ── Network helpers ───────────────────────────────────────────────────────

    # Common "virtual / loopback" prefixes that are useless for a
    # mobile phone on the user's Wi-Fi.  Detected and deprioritised
    # by ``get_local_ip()``.
    _VIRTUAL_PREFIXES = (
        "127.",          # loopback
        "169.254.",      # link-local (often VirtualBox host-only)
        "192.168.56.",   # VirtualBox host-only
        "192.168.64.",   # Parallels / VMware NAT
        "192.168.65.",
        "192.168.1.",    # sometimes used by VM nets too
    )

    def _all_ipv4_addresses(self):
        """Enumerate every non-loopback IPv4 bound to this machine."""
        import subprocess
        addrs = []
        try:
            if is_mac() or is_windows():
                if is_windows():
                    cmd = ["ipconfig"]
                else:
                    cmd = ["ifconfig"]
                cf = 0x08000000 if is_windows() else 0
                out = subprocess.run(
                    cmd, capture_output=True, text=True, timeout=2,
                    creationflags=cf
                ).stdout
                for m in re.finditer(
                    r"(?:inet|IPv4)[^0-9]*((?:\d+\.){3}\d+)", out
                ):
                    ip = m.group(1)
                    if not ip.startswith("127."):
                        addrs.append(ip)
            else:
                # Linux / other Unix – use the ``ip`` command if present
                try:
                    cf = 0x08000000 if is_windows() else 0
                    out = subprocess.run(
                        ["ip", "-4", "-o", "addr", "show"],
                        capture_output=True, text=True, timeout=2,
                        creationflags=cf
                    ).stdout
                    for m in re.finditer(
                        r"inet\s+((?:\d+\.){3}\d+)", out
                    ):
                        ip = m.group(1)
                        if not ip.startswith("127."):
                            addrs.append(ip)
                except Exception:
                    pass
        except Exception:
            pass
        return addrs

    def get_local_ip(self) -> str:
        """Return the best LAN IPv4 for the user's phone to connect to.

        Preference order:
          1. The address the OS routing table picks for an outbound
             UDP packet (8.8.8.8) – this is what the original code did
             and it works on most home networks.
          2. Any Wi-Fi / Ethernet address NOT starting with a virtual
             prefix (so a VM's NAT address is skipped).
          3. Fallback to whatever ``socket.gethostbyname`` returns.
        """
        # 1. Outbound-route trick (skips VM-only interfaces in most cases)
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            if ip and not ip.startswith("127."):
                return ip
        except Exception:
            pass

        # 2. Walk every interface and prefer a "real" LAN address
        for ip in self._all_ipv4_addresses():
            if not any(ip.startswith(p) for p in self._VIRTUAL_PREFIXES):
                return ip

        # 3. Last-resort: hostname lookup
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

    def get_all_ips(self):
        """Public helper – returns every usable LAN IP we found."""
        ips = []
        seen = set()
        for ip in [self.get_local_ip()] + self._all_ipv4_addresses():
            if ip and ip not in seen and not ip.startswith("127."):
                seen.add(ip)
                ips.append(ip)
        return ips

    def update_qr_code(self, url: str):
        def _fetch():
            try:
                # Build the QR locally (offline-friendly) – the local
                # ``qrcode`` library is bundled with the Windows build.
                img = _generate_qr_image(url, size=220)
                img = ImageOps.expand(img, border=10, fill="white")
                img = img.resize((210, 210), Image.Resampling.LANCZOS)
                self.root.after(0, self._draw_qr_active, img)
            except Exception as qr_err:
                print(f"[lanpad] QR generation failed: {qr_err}")
        import threading
        threading.Thread(target=_fetch, daemon=True).start()

    # ── Server control ────────────────────────────────────────────────────────

    def toggle_server(self):
        if self.process is None:
            self.start_server()
        else:
            self.stop_server()
        # Force the window to stay visible in case macOS attempts to hide it
        if self.root.state() != "withdrawn":
            self.root.after(100, self.show_window)

    def start_server(self):
        # Check if already running (external process)
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1)
            if s.connect_ex(("127.0.0.1", 8000)) == 0:
                self.process = "EXTERNAL"
                self._ui_active()
                s.close()
                return
            s.close()
        except Exception:
            pass

        # Start embedded uvicorn server
        try:
            import uvicorn
            from app import app
            import socket
            class CustomServer(uvicorn.Server):
                def install_signal_handlers(self):
                    pass
                async def startup(self, sockets=None):
                    await super().startup(sockets)
                    for server in getattr(self, "servers", []):
                        if hasattr(server, "sockets"):
                            for sock in server.sockets:
                                try:
                                    sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4 * 1024 * 1024)
                                    sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 4 * 1024 * 1024)
                                except Exception:
                                    pass
            config = uvicorn.Config(app=app, host="0.0.0.0", port=8000, log_level="error")
            self.server_instance = CustomServer(config)
            t = threading.Thread(target=self.server_instance.run, daemon=True)
            t.start()
            self.process = "THREADED"
            self._ui_active()
        except Exception as e:
            messagebox.showerror("Error", f"Could not start server:\n{e}")

    def _ui_active(self):
        """Update all UI elements to reflect a running server."""
        self._server_on = True
        self._draw_main_btn(active=True)
        self._dot_cv.itemconfig(self._dot_id, fill=self.GREEN)
        self._status_lbl.config(text="Server Live", fg=self.GREEN)

        cv, tid = self._info_cards["State"]
        cv.itemconfig(tid, text="Live", fill=self.GREEN)

        # Delay Hybrid Relay tunnel execution by 500ms
        self.root.after(500, self._start_relay_if_needed)

        ip = self.get_local_ip()
        # If we detected more than one LAN IP, show the primary one
        # in the pill but log all candidates so the user can debug
        # from the terminal / console.
        all_ips = self.get_all_ips()
        if len(all_ips) > 1:
            print(f"[lanpad] Detected LAN IPs: {all_ips}")
            print(f"[lanpad] Using primary: {ip}")
        
        self._draw_tabs()
        self._update_display()
        if self.root.state() != "withdrawn":
            self.root.after(100, self.show_window)

    def _start_relay_if_needed(self):
        if not self._server_on:
            return
        try:
            import urllib.request
            import json
            req = urllib.request.Request("http://127.0.0.1:8000/api/connections")
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                count = data.get("count", 0)
                if count == 0:
                    print("[lanpad] No local connections detected after 500ms delay, starting Hybrid Relay tunnel...")
                    self.start_tunnel()
                else:
                    print(f"[lanpad] {count} local connection(s) active, skipping Hybrid Relay tunnel startup.")
        except Exception as e:
            print(f"[lanpad] Error checking connection count: {e}. Starting tunnel as fallback.")
            self.start_tunnel()

    def stop_server(self):
        self.stop_tunnel()
        if self.process == "EXTERNAL":
            try:
                urllib.request.urlopen("http://127.0.0.1:8000/shutdown", timeout=1)
            except Exception:
                pass
        elif self.process == "THREADED" and hasattr(self, "server_instance"):
            self.server_instance.should_exit = True
        elif (self.process and
              self.process not in ("EXTERNAL", "THREADED") and
              hasattr(self.process, "pid")):
            try:
                os.kill(self.process.pid, signal.SIGTERM)
            except Exception:
                pass

        self.process = None
        self._ui_reset()

    def _ui_reset(self):
        """Restore all UI elements to idle / stopped state."""
        self._server_on = False
        self._dot_tick  = 0
        self._draw_main_btn(active=False)
        self._dot_cv.itemconfig(self._dot_id, fill=self.DIM)
        self._status_lbl.config(text="Awaiting Sync", fg=self.DIM)

        cv, tid = self._info_cards["State"]
        cv.itemconfig(tid, text="Off", fill=self.DIM)

        pcard, ptid = self._info_cards.get("Protocol", (None, None))
        if ptid is not None:
            pcard.itemconfig(ptid, text="HTTP", fill=self.DIM)

        self._ip_text = "http://0.0.0.0:8000"
        self._draw_ip(False)
        self._draw_qr_empty()
        self._draw_tabs()
        if self.root.state() != "withdrawn":
            self.root.after(100, self.show_window)

    def check_process_status(self):
        is_running = False
        s = None
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            is_running = (s.connect_ex(("127.0.0.1", 8000)) == 0)
        except Exception:
            is_running = False
        finally:
            if s is not None:
                try:
                    s.close()
                except Exception:
                    pass

        if is_running and not self._server_on:
            self.process = "EXTERNAL"
            self._ui_active()
        elif not is_running and self._server_on:
            self._ui_reset()
            self.process = None

        # Update connections count in background
        def update_connections():
            if not is_running:
                if self.root.winfo_exists():
                    self.root.after(0, lambda: self._update_conn_lbl(0, []))
                return
            try:
                import urllib.request
                import json
                with urllib.request.urlopen("http://127.0.0.1:8000/api/connections", timeout=2.0) as response:
                    data = json.loads(response.read().decode())
                    count = data.get("count", 0)
                    if not isinstance(count, int) or count < 0:
                        count = 0
                    devices = data.get("devices", [])
                    if not isinstance(devices, list):
                        devices = []
                    devices = [d for d in devices if isinstance(d, str)]
                    if self.root.winfo_exists():
                        self.root.after(0, lambda: self._update_conn_lbl(count, devices))
            except (json.JSONDecodeError, ValueError, TypeError) as e:
                print(f"[connections] Parse error: {e}")
                if self.root.winfo_exists():
                    self.root.after(0, lambda: self._update_conn_lbl(0, []))
            except Exception:
                if self.root.winfo_exists():
                    self.root.after(0, lambda: self._update_conn_lbl(0, []))

        threading.Thread(target=update_connections, daemon=True).start()

        if self.root.winfo_exists():
            self.root.after(2000, self.check_process_status)

    def _update_conn_lbl(self, count, devices):
        if not hasattr(self, "_conn_lbl"):
            return
        if count > 0:
            dev_str = ", ".join(devices)
            text = f"{count} Connected ({dev_str})" if dev_str else f"{count} Connected"
            self._conn_lbl.config(text=text, fg=self.GREEN)
        else:
            self._conn_lbl.config(text="0 Connected", fg=self.DIM)



    def show_window(self, *args):
        """Bring the dashboard to front without stealing focus from other apps
        unless LANpad is truly meant to be the frontmost app."""
        self.root.deiconify()
        self.root.lift()
        # Only grab focus if LANpad was explicitly invoked by the user
        # (menu bar click, IPC SHOW message). Do NOT use focus_force() or
        # activateIgnoringOtherApps_ as they steal keyboard input from
        # whatever the user is currently typing in.
        if sys.platform == "darwin":
            try:
                from AppKit import NSApp
                NSApp.activateIgnoringOtherApps_(True)
            except Exception:
                pass

    def check_for_updates(self):
        """Check for updates in a background thread."""
        if getattr(self, "update_in_progress", False):
            return
        def _thread():
            try:
                import json
                url = "https://lanpad.app/downloads/version.json"
                req = urllib.request.Request(
                    url, 
                    headers={'User-Agent': 'Mozilla/5.0'}
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode('utf-8'))
                
                online_version = data.get("version")
                if not online_version:
                    return

                from platform_utils import VERSION as local_version
                
                def v_tuple(v):
                    clean = v.lower().lstrip('v')
                    return tuple(map(int, clean.split('.')))

                try:
                    if v_tuple(online_version) > v_tuple(local_version):
                        self.gui_queue.put(lambda: self.prompt_update(online_version, data))
                except Exception:
                    pass
            except Exception as e:
                print(f"[auto-updater] check failed: {e}")

        threading.Thread(target=_thread, daemon=True).start()

    def prompt_update(self, version, data):
        """Prompt user to update. Force updates cannot be cancelled."""
        if getattr(self, "update_in_progress", False):
            return
        
        # Don't re-prompt for the same version if user already declined this session
        if hasattr(self, '_declined_version') and self._declined_version == version:
            return
        
        self.update_in_progress = True
        is_force = data.get("force_update", False)
        
        if is_force:
            # Force update — non-cancellable, user MUST update
            messagebox.showwarning(
                "Critical Update Required",
                f"LANpad v{version} is a required update.\n\n"
                "The app will now download and install the update.\n"
                "This cannot be skipped.",
                parent=self.root
            )
            self.apply_update(version, data)
        else:
            # Optional update — user can decline
            ans = messagebox.askyesno(
                "Update Available",
                f"A new version of LANpad (v{version}) is available.\n\n"
                "Would you like to download and install it automatically now?\n"
                "This will restart the application.",
                parent=self.root
            )
            if ans:
                self.apply_update(version, data)
            else:
                self._declined_version = version
                self.update_in_progress = False

    def apply_update(self, version, data):
        """Download and install the update."""
        from tkinter import ttk
        status_win = tk.Toplevel(self.root)
        status_win.title("Updating LANpad")
        status_win.geometry("350x150")
        status_win.resizable(False, False)
        status_win.configure(bg=self.BG)
        status_win.transient(self.root)
        status_win.grab_set()
        status_win.protocol("WM_DELETE_WINDOW", lambda: None)  # Prevent closing via X button

        lbl = tk.Label(
            status_win, 
            text="Downloading update...", 
            font=(self.FU, 11, "bold"), 
            bg=self.BG, 
            fg=self.WHITE
        )
        lbl.pack(pady=(20, 5))

        # Progress bar
        progress = ttk.Progressbar(status_win, orient="horizontal", length=280, mode="determinate")
        progress.pack(pady=5)

        # Percentage label
        pct_lbl = tk.Label(
            status_win, 
            text="0%", 
            font=(self.FU, 10), 
            bg=self.BG, 
            fg=self.WHITE
        )
        pct_lbl.pack(pady=2)

        try:
            self.root.update_idletasks()
            x = self.root.winfo_x() + (self.root.winfo_width() - 350) // 2
            y = self.root.winfo_y() + (self.root.winfo_height() - 150) // 2
            status_win.geometry(f"+{x}+{y}")
        except Exception:
            pass

        def _download_and_install():
            try:
                import tempfile
                import shutil
                import subprocess
                from platform_utils import is_windows, is_mac

                if is_windows():
                    url = data.get("windows_url")
                elif is_mac():
                    url = data.get("mac_url")
                else:
                    return

                if not url:
                    self.root.after(0, lambda: messagebox.showerror("Update Error", "No download link available for your OS.", parent=self.root))
                    status_win.destroy()
                    return

                temp_dir = tempfile.gettempdir()
                filename = url.split("/")[-1]
                download_path = os.path.join(temp_dir, filename)

                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=30) as response:
                    content_length = response.getheader('Content-Length')
                    total_size = int(content_length) if content_length else 0
                    
                    downloaded = 0
                    with open(download_path, 'wb') as out_file:
                        while True:
                            chunk = response.read(16384)
                            if not chunk:
                                break
                            out_file.write(chunk)
                            downloaded += len(chunk)
                            if total_size > 0:
                                percent = int((downloaded / total_size) * 100)
                                self.root.after(0, lambda p=percent: [
                                    progress.configure(value=p),
                                    pct_lbl.configure(text=f"{p}%")
                                ])

                self.root.after(0, lambda: [lbl.config(text="Applying update..."), pct_lbl.config(text="")])


                # Clean up tunnel process before quitting
                try:
                    self.stop_tunnel()
                except Exception:
                    pass

                mypid = os.getpid()
                if is_windows():
                    # Terminate parent menu bar helper process if any
                    try:
                        import signal
                        os.kill(os.getppid(), signal.SIGTERM)
                    except Exception:
                        pass
                    install_dir = os.path.join(os.environ.get("LOCALAPPDATA", ""), "LANpad")
                    if getattr(sys, 'frozen', False):
                        target_exe = sys.executable
                    else:
                        target_exe = os.path.join(install_dir, "LANpad.exe")

                    bat_content = f"""@echo off
taskkill /F /IM LANpad.exe >nul 2>&1
timeout /t 2 /nobreak >nul
copy /Y "{download_path}" "{target_exe}" >nul 2>&1
if errorlevel 1 (
    if not exist "{install_dir}" mkdir "{install_dir}"
    copy /Y "{download_path}" "{install_dir}\\LANpad.exe" >nul 2>&1
    start "" "{install_dir}\\LANpad.exe"
) else (
    start "" "{target_exe}"
)
del "%~f0"
"""
                    bat_path = os.path.join(temp_dir, "lanpad_update.bat")
                    with open(bat_path, "w") as f:
                        f.write(bat_content)

                    subprocess.Popen([bat_path], shell=True, creationflags=0x08000000)
                    os._exit(0)

                elif is_mac():
                    # Terminate parent menu bar helper process if any
                    try:
                        import signal
                        os.kill(os.getppid(), signal.SIGTERM)
                    except Exception:
                        pass
                    sh_content = f"""#!/bin/bash
exec > /tmp/lanpad_update.log 2>&1
while kill -0 {mypid} 2>/dev/null; do
    sleep 0.5
done
mkdir -p /tmp/LANpad_Mount_Update
hdiutil attach "{download_path}" -mountpoint /tmp/LANpad_Mount_Update -nobrowse -quiet
if [ -d "/tmp/LANpad_Mount_Update/LANpad.app" ]; then
    rm -rf /Applications/LANpad.app
    cp -R /tmp/LANpad_Mount_Update/LANpad.app /Applications/
    hdiutil detach /tmp/LANpad_Mount_Update -quiet
    xattr -cr /Applications/LANpad.app 2>/dev/null
    open /Applications/LANpad.app
fi
rm -rf /tmp/LANpad_Mount_Update
rm -f "{download_path}"
"""
                    sh_path = os.path.join(temp_dir, "lanpad_update.sh")
                    with open(sh_path, "w") as f:
                        f.write(sh_content)
                    
                    os.chmod(sh_path, 0o755)
                    subprocess.Popen([sh_path], close_fds=True)
                    os._exit(0)

            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Update Error", f"Failed to download/install update:\n{str(e)}", parent=self.root))
                status_win.destroy()

        threading.Thread(target=_download_and_install, daemon=True).start()

    def start_mobile_progress_polling(self):
        self._last_mobile_upload_active = False
        self.poll_mobile_upload_progress()

    def poll_mobile_upload_progress(self):
        self.root.after(200, self.poll_mobile_upload_progress)
        
        # Don't poll if server is off or the main GUI dashboard hasn't been built yet
        if not getattr(self, "_server_on", False) or not hasattr(self, "_progress_card"):
            return

        # If a laptop local copy operation is currently running, don't overwrite its progress bar!
        if self._progress_data.get("active", False):
            return

        # Fetch progress details
        active_data = None
        # Try direct import first (shares thread memory)
        try:
            from app import _active_upload
            if _active_upload and _active_upload.get("active"):
                active_data = _active_upload.copy()
        except Exception:
            pass

        # Fallback to HTTP API
        if not active_data:
            try:
                import urllib.request
                import json
                from app import SESSION_TOKEN
                token_query = f"?sid={SESSION_TOKEN}" if SESSION_TOKEN else ""
                url = f"http://127.0.0.1:8000/api/benchmark/upload_progress{token_query}"
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=0.1) as response:
                    res = json.loads(response.read().decode())
                    if res and res.get("active"):
                        active_data = res
            except Exception:
                pass

        if active_data and active_data.get("active"):
            self._last_mobile_upload_active = True
            
            # Show progress bar
            self._progress_card.place(x=18, y=242 + self._yo, width=self._W - 36, height=75)
            self._sec_frame.place(x=18, y=322 + self._yo, width=self._W - 36, height=24)
            self._list_canvas.place(x=18, y=352 + self._yo, width=self._W - 36, height=365)

            # Update labels
            mode_prefix = "Receiving to Inbox" if active_data.get("mode") == "inbox" else "Receiving"
            self._progress_title_lbl.config(text=f"{mode_prefix}: {active_data['filename']}")
            
            copied = active_data['written']
            total = active_data['size']
            elapsed = time.time() - active_data['start_time']
            speed = (copied / (1024 * 1024)) / elapsed if elapsed > 0 else 0.0

            eta_str = "00:00"
            if speed > 0.05 and total > copied:
                remaining_bytes = total - copied
                remaining_seconds = int(remaining_bytes / (speed * 1024 * 1024))
                m, s = divmod(remaining_seconds, 60)
                eta_str = f"{m:02d}:{s:02d}"

            el_m, el_s = divmod(int(elapsed), 60)
            elapsed_str = f"{el_m:02d}:{el_s:02d}"

            self._progress_speed_lbl.config(text=f"{elapsed_str} / {eta_str} | {speed:.2f} MB/s", fg="#00C853")
            
            percent = int(copied / total * 100) if total > 0 else 0
            self._progress_percent_lbl.config(text=f"{percent}%")
            self._progress_bytes_lbl.config(text=f"{copied / 1048576:.2f} / {total / 1048576:.2f} MB")

            # Redraw progress bar in green
            self._progress_bar_canvas.delete("bar")
            bar_width = int((self._W - 36 - 24) * (copied / total)) if total > 0 else 0
            self._progress_bar_canvas.create_rectangle(0, 0, bar_width, 6, fill="#00C853", width=0, tags="bar")
        else:
            if self._last_mobile_upload_active:
                self._last_mobile_upload_active = False
                
                # Hide progress bar
                self._progress_card.place_forget()
                self._sec_frame.place(x=18, y=250 + self._yo, width=self._W - 36, height=24)
                self._list_canvas.place(x=18, y=285 + self._yo, width=self._W - 36, height=430)
                
                # Instantly refresh list to show newly uploaded file
                if hasattr(self, "_refresh_files_list"):
                    self._refresh_files_list()

    def on_quit(self, *args):
        self.stop_tunnel()
        # Handle Command+Q by killing the entire app (parent menubar + self)
        try:
            import os, signal
            os.kill(os.getppid(), signal.SIGTERM)
        except Exception:
            pass
        self.root.destroy()

    def on_closing(self):
        if is_windows():
            self.on_quit()
        else:
            # On macOS, clicking the cross ('X') hides the dashboard and lets the app run in the background.
            self.root.withdraw()





# ── Entry point ───────────────────────────────────────────────────────────────

def run_launcher():
    import socket
    import sys
    import threading

    is_exiting = [False]

    # Single-instance lock & IPC MUST happen before tk.Tk()
    try:
        lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        lock_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        lock_socket.bind(("127.0.0.1", 8001))
        lock_socket.listen(1)
        import atexit
        def cleanup_ipc():
            is_exiting[0] = True
            try:
                lock_socket.close()
            except Exception:
                pass
        atexit.register(cleanup_ipc)
    except socket.error:
        # Already running, just wake it up
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect(("127.0.0.1", 8001))
            s.sendall(b"SHOW")
            s.close()
        except Exception:
            pass
        sys.exit(0)

    root = tk.Tk()
    app  = LANpadLauncher(root)

    # ── Allow Dock icon: run as a regular process on macOS ──────────────
    # MUST be called AFTER tk.Tk() — calling NSApplication.sharedApplication()
    # before Tk initializes crashes Tkinter with NSInvalidArgumentException in
    # TkSetMacColor (macOSVersion unrecognized selector).
    if sys.platform == "darwin":
        try:
            from AppKit import NSApplication, NSApplicationActivationPolicyRegular
            NSApplication.sharedApplication().setActivationPolicy_(
                NSApplicationActivationPolicyRegular
            )
        except Exception:
            pass

    # Listen for reopen or quit requests
    def listen_for_show():
        max_consecutive_errors = 0
        while not is_exiting[0]:
            try:
                conn, _ = lock_socket.accept()
                if is_exiting[0]:
                    break
                data = conn.recv(1024)
                conn.close()
                max_consecutive_errors = 0  # Reset on success
                if data == b"QUIT":
                    root.after(0, app.root.destroy)
                else:
                    root.after(0, app.show_window)
            except (OSError, socket.error) as e:
                if is_exiting[0]:
                    break
                try:
                    print(f"[ipc] Listener socket error: {e}")
                except Exception:
                    pass
                max_consecutive_errors += 1
                if max_consecutive_errors > 3:
                    break
            except Exception as e:
                if is_exiting[0]:
                    break
                try:
                    print(f"[ipc] Unexpected error in listener: {e}")
                except Exception:
                    pass
                max_consecutive_errors += 1
                if max_consecutive_errors > 3:
                    break
                import time
                time.sleep(0.1)
    threading.Thread(target=listen_for_show, daemon=True).start()

    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    if sys.platform == "darwin":
        root.createcommand("::tk::mac::ReopenApplication", app.show_window)
        
    root.mainloop()

if __name__ == "__main__":
    run_launcher()

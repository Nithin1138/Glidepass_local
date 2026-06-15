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
# We call ``SetProcessDpiAwarenessContext`` (Win10 1607+) and fall back
# to the older ``SetProcessDPIAware`` for compatibility.  This MUST run
# before any Tk window is created.
# ---------------------------------------------------------------------------
def _enable_windows_dpi_awareness():
    if not sys.platform.startswith("win"):
        return
    try:
        import ctypes
        try:
            # Per-monitor V2 DPI awareness (best, Win10 1703+).
            ctypes.windll.shcore.SetProcessDpiAwarenessContext(
                ctypes.c_void_p(-4)  # DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2
            )
            return
        except Exception:
            pass
        try:
            # System DPI awareness (Win8.1+).
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
            return
        except Exception:
            pass
        try:
            # Legacy fallback (Vista+).
            ctypes.windll.user32.SetProcessDPIAware()
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

        # ── View containers ───────────────────────────────────────────────────
        self.main_view   = tk.Frame(root, bg=self.BG)
        self.bypass_view = tk.Frame(root, bg=self.BG)
        self.lock_view   = tk.Frame(root, bg=self.BG)
        self.splash_view = tk.Frame(root, bg=self.BG)
        self.main_view.place(x=0, y=0, relwidth=1, relheight=1)
        self.bypass_view.place(x=0, y=0, relwidth=1, relheight=1)
        self.lock_view.place(x=0, y=0, relwidth=1, relheight=1)
        self.splash_view.place(x=0, y=0, relwidth=1, relheight=1)

        self._build_main()
        self._build_bypass()
        self._build_lock()
        self._build_splash()

        self.root.after(500, self.start_server)
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
        rounded_rect(cv, 0, 2, tw, 26, r=12, fill=fill, outline="")
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

        self._pill_button(tb, "Blocked in site?", self.WHITE, self.BG2,
                          cmd=lambda: self.show_view("bypass"))

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
        self._plan_lbl.place(x=376, y=88 + (0 if _mac else 4), anchor="ne")
        self._plan_lbl.bind("<Button-1>", lambda e: self.show_view("lock"))

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
                req = urllib.request.Request("https://lanpad.vercel.app/api/monetization/status", headers={"User-Agent": "LANpad App"})
                with urllib.request.urlopen(req, timeout=2) as resp:
                    status_data = json.loads(resp.read().decode("utf-8"))
                    if not status_data.get("monetization_enabled", False):
                        tier = "DEVELOPER"
            except Exception:
                pass

            if tier == "Basic":
                messagebox.showwarning("Upgrade Required", "AP Isolation Bypass (College Wi-Fi Tunnel Mode) is only available on Pro, Max, and Ultra plans. Please upgrade your package.")
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
        self._draw_ip(False)

        # ── Info row (Port / Protocol / State) ───────────────────────────────
        cw = (W - 48 - 12) // 3
        info_y = 542 + yo * 2.5
        info_specs = [("Port", "8000"), ("Protocol", "HTTP"), ("State", "Off")]
        self._info_cards = {}
        for i, (lbl, default) in enumerate(info_specs):
            cv = tk.Canvas(v, width=cw, height=70, bg=self.BG, highlightthickness=0)
            cv.place(x=24 + i * (cw + 6), y=info_y)
            rounded_rect(cv, 0, 0, cw, 70, r=12, fill=self.BG2, outline=self.BORDER)
            cv.create_text(cw // 2, 20, text=lbl.upper(),
                           font=(self.FU, 9, "bold"), fill=self.DIM)
            tid = cv.create_text(cw // 2, 48, text=default,
                                 font=(self.FM, 16, "bold"), fill=self.DIM)
            self._info_cards[lbl] = (cv, tid)

        # ── Action button ────────────────────────────────────────────────────
        self._btn_cv = tk.Canvas(v, width=W - 48, height=58,
                                  bg=self.BG, highlightthickness=0)
        self._btn_cv.place(x=24, y=626 + yo * 2.5)
        self._draw_main_btn(active=False)

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
            c_local.create_text(w_l // 2, h_l // 2 + text_y_offset, text="Local (Home Wi-Fi)", fill=self.WHITE, font=(self.FU, 12, "bold"))
        else:
            rounded_rect(c_local, 2, 2, w_l - 2, h_l - 2, r=8, fill=self.BG, outline="#222222")
            c_local.create_text(w_l // 2, h_l // 2 + text_y_offset, text="Local (Home Wi-Fi)", fill=self.DIM, font=(self.FU, 12))
            
        # Tunnel tab
        c_tunnel = self._tab_tunnel
        c_tunnel.delete("all")
        w_t = int(c_tunnel["width"])
        h_t = int(c_tunnel["height"])
        
        if self._active_tab == "tunnel":
            rounded_rect(c_tunnel, 2, 2, w_t - 2, h_t - 2, r=8, fill=self.BG2, outline=self.GREEN)
            c_tunnel.create_text(w_t // 2, h_t // 2 + text_y_offset, text="College (Tunnel)", fill=self.WHITE, font=(self.FU, 12, "bold"))
        else:
            rounded_rect(c_tunnel, 2, 2, w_t - 2, h_t - 2, r=8, fill=self.BG, outline="#222222")
            c_tunnel.create_text(w_t // 2, h_t // 2 + text_y_offset, text="College (Tunnel)", fill=self.DIM, font=(self.FU, 12))

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
                return None

        def _run():
            import subprocess
            import re
            import sys
            print("[lanpad] Starting tunnel fallback...")

            cloudflared_bin = _get_cloudflared_bin()

            kwargs = {}
            if sys.platform == "win32":
                kwargs["creationflags"] = 0x08000000  # CREATE_NO_WINDOW


            # ── Cloudflare Quick Tunnel ──────────────────────────────────────────
            if cloudflared_bin:
                try:
                    cmd = [cloudflared_bin, "tunnel", "--url", "http://localhost:8000"]
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
                                    print(f"[lanpad] Tunnel ready: {self._tunnel_url}")
                                    self.gui_queue.put(self._update_display)
                                    url_found = True
                        except Exception as _e:
                            print(f"[lanpad] _read_lines error: {_e}")

                    import threading as _thr
                    reader = _thr.Thread(target=_read_lines, daemon=True)
                    reader.start()
                    reader.join(timeout=45)

                    if not url_found:
                        print("[lanpad] Cloudflare Tunnel initial connection timed out, keeping process running for automatic retry...")
                except Exception as e:
                    print(f"\n[lanpad] Cloudflare Tunnel process failed to start: {e}")
                    self.stop_tunnel()
            else:
                print("[lanpad] cloudflared unavailable")
                self.stop_tunnel()



        import threading
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

    # ── BYPASS VIEW ───────────────────────────────────────────────────────────

    def _build_bypass(self):
        v = self.bypass_view
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

        # ── Header: shield icon + title + badge ──────────────────────────────
        hdr = tk.Frame(v, bg=self.BG)
        hdr.place(x=18, y=58 + yo, width=W - 36)

        # Shield icon tile
        ic = tk.Canvas(hdr, width=48, height=48, bg=self.BG, highlightthickness=0)
        ic.pack(side="left")
        rounded_rect(ic, 0, 0, 48, 48, r=12, fill=self.BG2, outline="")
        ic.create_text(24, 24, text="🛡", font=(self.FU, 20), anchor="center")

        # Title block
        ti = tk.Frame(hdr, bg=self.BG)
        ti.pack(side="left", padx=12)
        tk.Label(ti, text="LANpad Master",
                 font=(self.FD, 16, "bold"), bg=self.BG, fg=self.WHITE, bd=0, highlightthickness=0).pack(anchor="w")
        tk.Label(ti, text="Neutralize restrictions in seconds",
                 font=(self.FU, 10), bg=self.BG, fg=self.DIM, bd=0, highlightthickness=0).pack(anchor="w", pady=(2, 0))


        # ── Step cards  2 × 2 grid ───────────────────────────────────────────
        steps = [
            ("01", "↬", "Open Site",     "Navigate to the\nrestricted page"),
            ("02", "⌘",  "Show Bar",      "Win: Ctrl+Shift+B\nMac: ⌘+Shift+B"),
            ("03", "★", "Bookmark",      "Right-click bar → Add Page,\nname it 'LANpad'"),
            ("04", "⎘",  "Paste Script",  "(Copied!) Paste script into\nthe bookmark URL field"),
        ]
        cw = (W - 44) // 2
        ch = 125 if _mac else 135
        grid_top = 135 + yo
        for i, (num, icon, title, desc) in enumerate(steps):
            col, row = i % 2, i // 2
            x = 18 + col * (cw + 8)
            y = grid_top + row * (ch + 8)
            cv = tk.Canvas(v, width=cw, height=ch, bg=self.BG, highlightthickness=0)
            cv.place(x=x, y=y)
            rounded_rect(cv, 0, 0, cw, ch, r=14, fill=self.BG2, outline=self.BORDER)
            # Step number (top-right)
            cv.create_text(cw - 12, 14, text=num,
                           font=(self.FM, 9, "bold"), fill=self.DIM, anchor="e")
            # Icon
            cv.create_text(15, 26, text=icon, font=(self.FU, 18), anchor="w")
            # Title
            cv.create_text(15, 48, text=title,
                           font=(self.FU, 11, "bold"), fill=self.WHITE, anchor="w")
            # Description (wrapping)
            if i == 3:
                # Highlight "Copied!"
                cv.create_text(15, 66, text="(Copied!)", font=(self.FU, 9, "bold"), fill="#EAB308", anchor="nw")
                padx_copied = 55 if _mac else 66
                cv.create_text(15 + padx_copied, 66, text="Paste script into", font=(self.FU, 9), fill=self.DIM, anchor="nw")
                cv.create_text(15, 82, text="the bookmark URL field", font=(self.FU, 9), fill=self.DIM, anchor="nw", width=cw - 22)
            else:
                cv.create_text(15, 66, text=desc,
                               font=(self.FU, 9), fill=self.DIM,
                               anchor="nw", width=cw - 22)

        # ── CTA banner ───────────────────────────────────────────────────────
        cta_y  = grid_top + 2 * (ch + 8) + 15
        cta_h  = 120
        cta_cv = tk.Canvas(v, width=W - 36, height=cta_h, bg=self.BG, highlightthickness=0)
        cta_cv.place(x=18, y=cta_y)
        rounded_rect(cta_cv, 0, 0, W - 36, cta_h, r=16,
                     fill=self.BG2, outline=self.BORDER)
        mid = (W - 36) // 2
        cta_cv.create_text(mid, 30, text="🖱", font=(self.FU, 24))
        cta_cv.create_text(mid, 65, text="Click the Bookmark",
                           font=(self.FD, 16, "bold"), fill=self.WHITE)
        cta_cv.create_text(mid, 88, text="Instantly enable remote injection.",
                           font=(self.FU, 10), fill=self.DIM)
        cta_cv.create_text(mid, 104, text="You only need to do this once per site!",
                           font=(self.FU, 9), fill=self.DIM)

        # ── Got It button ────────────────────────────────────────────────────
        got_y  = cta_y + cta_h + 14
        got_cv = tk.Canvas(v, width=W - 36, height=52, bg=self.BG, highlightthickness=0)
        got_cv.place(x=18, y=got_y)
        rounded_rect(got_cv, 0, 0, W - 36, 52, r=12, fill=self.GREEN, outline="")
        got_cv.create_text((W - 36) // 2, 26, text="Got it! Close",
                           font=(self.FU, 14, "bold"), fill=self.WHITE)
        def got_handler(e): self.show_view("main")
        got_cv.bind("<Button-1>", got_handler)
        got_cv.tag_bind("all", "<Button-1>", got_handler)
        got_cv.config(cursor="hand2")

        # Hidden bookmarklet store (never displayed)
        self.code_text = tk.Text(v)
        bookmarklet = (
            "javascript:(function()%7B      if(window.__lanpad_active) %7B"
            "showN(\"ALREADY ACTIVE\", \"%23f59e0b\");        return;      %7D"
            "window.__lanpad_active=true;      window.__gp_abort=false;"
            "const op=Event.prototype.preventDefault;"
            "Event.prototype.preventDefault=function()%7B"
            "if(%5B\"copy\",\"paste\",\"cut\",\"beforeinput\",\"selectstart\"%5D.includes(this.type))return;"
            "return op.apply(this,arguments)%7D;"
            "function ul(r)%7Bconst ev=%5B\"copy\",\"paste\",\"cut\",\"contextmenu\","
            "\"selectstart\",\"beforeinput\"%5D;"
            "ev.forEach(t=>r.addEventListener(t,e=>e.stopImmediatePropagation(),true));"
            "const al=r.querySelectorAll?r.querySelectorAll(\"*\"):%5B%5D;"
            "al.forEach(el=>%7Bif(el.shadowRoot)ul(el.shadowRoot)%7D)%7D;"
            "ul(document);"
            "const ob=new MutationObserver(()=>ul(document));"
            "ob.observe(document.documentElement,%7BchildList:true,subtree:true%7D);"
            "const s=document.createElement(\"style\");"
            "s.innerHTML=\"*%7B-webkit-user-select:text!important;"
            "user-select:text!important;pointer-events:auto!important;%7D\";"
            "document.head.appendChild(s);"
            "const n=document.createElement(\"div\");n.id=\"__gp_container\";"
            "n.innerHTML='<div id=\"__gp_note\" style=\"position:fixed;top:24px;"
            "left:50%25;transform:translateX(-50%25);background:%230a0a0a;color:%23fff;"
            "padding:14px 24px;border-radius:16px;border:1px solid %23d97757;"
            "font-family:sans-serif;font-weight:900;font-size:14px;z-index:2147483647;"
            "display:flex;align-items:center;gap:10px;box-shadow:0 20px 40px rgba(0,0,0,0.5);"
            "transition:all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);opacity:0;"
            "transform:translate(-50%25, -40px);\"><span style=\"color:%23d97757;"
            "font-size:18px;\">🛰️</span> BYPASS ACTIVATED</div>';"
            "document.body.appendChild(n);"
            "function showN(t,c=\"%23d97757\")%7Bconst e=document.getElementById(\"__gp_note\");"
            "if(!e)return;e.innerHTML=`<span style=\"color:${c};font-size:18px;\">🛰️</span> ${t}`;"
            "e.style.opacity=\"1\";e.style.transform=\"translate(-50%25, 0)\";"
            "setTimeout(()=>%7Be.style.opacity=\"0\";"
            "e.style.transform=\"translate(-50%25, -40px)\"%7D,3000)%7D"
            "setTimeout(()=>showN(\"BYPASS ACTIVATED\"),10);"
            "let lastId=localStorage.getItem(\"__gp_last_id\")||\"\";"
            "let seenIds=new Set();let seenTxt=new Map();let queue=%5B%5D;"
            "const wait=(ms)=>new Promise(res=>setTimeout(res,ms));"
            "async function poller()%7Bwhile(true)%7B"
            "if(window.__gp_abort_poller)break;"
            "try%7Bconst res=await fetch("
            "\"https://bypass-backend-nms1.onrender.com/api/v1/paste/poll?last_id=\""
            "+lastId+\"&t=\"+Date.now(),%7Bheaders:%7B\"x-device-id\":"
            "\"b8b989d6-dca0-4d98-a0e4-2556c5fbc4a1\"%7D,cache:\"no-store\","
            "mode:\"cors\",credentials:\"omit\"%7D);"
            "const data=await res.json();"
            "if(data.status===\"success\")%7BlastId=data.id;"
            "localStorage.setItem(\"__gp_last_id\",lastId);"
            "const txt=data.text||\"\";const mode=data.mode||\"\";"
            "if(mode===\"system\"||txt.indexOf(\"STOP_PASTE\")!==-1)%7B"
            "window.__gp_abort=true;queue=%5B%5D;"
            "showN(\"PASTING STOPPED\",\"%23ef4444\");continue;%7D"
            "const now=Date.now();"
            "const txtHash=btoa(txt.substring(0,100)).replace(/=/g,\"\");"
            "if(seenIds.has(data.id)||(seenTxt.has(txtHash)&&now-seenTxt.get(txtHash)<2000))continue;"
            "seenIds.add(data.id);seenTxt.set(txtHash,now);queue.push(data);"
            "%7Delse%7Bawait wait(500)%7D%7Dcatch(e)%7B"
            "console.log(\"GP Poll Error:\",e);await wait(2000);%7D%7D%7D"
            "async function executor()%7Bwhile(true)%7B"
            "if(window.__gp_abort)%7Bqueue=%5B%5D;window.__gp_abort=false;"
            "await wait(100);continue;%7D"
            "if(queue.length>0)%7Bconst data=queue.shift();if(!data)continue;"
            "let wpm=data.wpm||40;let txt=data.text;let isRealistic=data.realistic||false;"
            "const el=document.activeElement;"
            "if(el&&(\"value\" in el||el.isContentEditable))%7B"
            "const inject=(c)=>%7Bif(\"value\" in el)%7B"
            "const start=el.selectionStart;const end=el.selectionEnd;"
            "if(start!==undefined&&start!==null)%7B"
            "el.value=el.value.substring(0,start)+c+el.value.substring(end);"
            "el.selectionStart=el.selectionEnd=start+c.length;%7D"
            "else%7Bel.value+=c;%7D%7D"
            "else%7Bconst sel=window.getSelection();if(sel.rangeCount)%7B"
            "const range=sel.getRangeAt(0);range.deleteContents();"
            "range.insertNode(document.createTextNode(c));range.collapse(false);"
            "sel.removeAllRanges();sel.addRange(range);%7D%7D"
            "el.dispatchEvent(new Event(\"input\",%7Bbubbles:true%7D));"
            "el.dispatchEvent(new Event(\"change\",%7Bbubbles:true%7D))%7D;"
            "if(isRealistic)%7Bfor(let i=0;i<txt.length;i++)%7B"
            "if(window.__gp_abort)break;inject(txt[i]);"
            "let d=60000/(wpm*5);if(txt[i]===' ')d*=1.2;"
            "await wait(d*(0.8+Math.random()*0.4));%7D%7D"
            "else%7Bif(!window.__gp_abort)inject(txt);%7D%7D%7D"
            "await wait(100);%7D%7D poller();executor();%7D)();"
        )
        self.code_text.insert("1.0", bookmarklet)

    # ── Navigation ────────────────────────────────────────────────────────────

    def update_plan_label(self):
        def _task():
            monetization_enabled = False
            import urllib.request
            import json
            urls = ["http://127.0.0.1:3000", "https://lanpad.vercel.app"]
            for base_url in urls:
                try:
                    req = urllib.request.Request(f"{base_url}/api/monetization/status", headers={"User-Agent": "LANpad App"})
                    with safe_urlopen(req, timeout=3) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        monetization_enabled = data.get("monetization_enabled", False)
                        break
                except Exception:
                    pass

            def _update_ui():
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
                        tier = lic.get("tier", "Basic").upper()
                        self._plan_lbl.config(text=f"Plan: {tier}  •  Upgrade")
                    else:
                        self._plan_lbl.config(text="Plan: FREE  •  Upgrade")
                except Exception:
                    self._plan_lbl.config(text="Plan: FREE  •  Upgrade")

            self.gui_queue.put(_update_ui)
            
        import threading
        threading.Thread(target=_task, daemon=True).start()

    def show_view(self, name: str):
        if name == "main":
            self.main_view.tkraise()
            if hasattr(self, "update_plan_label"):
                self.update_plan_label()
        elif name == "lock":
            self.lock_view.tkraise()
            if hasattr(self, "update_lock_time_left"):
                self.update_lock_time_left()
            if hasattr(self, "load_active_key_if_present"):
                self.load_active_key_if_present()
        elif name == "splash":
            self.splash_view.tkraise()
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
            if os.path.exists(license_path):
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
        sub_lbl = tk.Label(v, text="Bypass campus peer-to-peer restrictions and\nAP Isolation instantly.", fg="#8A8A93", bg="#0D0D10", font=(self.FU, 12))
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
                    success, tier, expires_at = self.verify_key_online(key)
                    self.gui_queue.put(lambda: _handle_result(success, tier, expires_at))
                except Exception as e:
                    import traceback
                    with open(log_path, "a") as f:
                        f.write(f"Exception in _verify_task: {e}\n")
                        traceback.print_exc(file=f)
                    self.gui_queue.put(lambda: _handle_result(False, "Basic", None))

            def _handle_result(success, tier, expires_at):
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
                            with open(license_path, "w", encoding="utf-8") as f:
                                json.dump({"key": key, "tier": tier, "expires_at": expires_at, "last_checked": time.time()}, f)
                        except Exception as e:
                            print(f"[monetization] Error saving license: {e}")
                        
                        self.show_success_overlay(tier, days_left)
                    else:
                        self.lock_status_lbl.config(text="Invalid or expired activation key", fg=self.RED)
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
            webbrowser.open("https://lanpad.vercel.app/pricing")
            
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
                import urllib.request
                import json
                
                urls = ["http://127.0.0.1:3000", "https://lanpad.vercel.app"]
                
                for base_url in urls:
                    try:
                        req = urllib.request.Request(f"{base_url}/api/monetization/status", headers={"User-Agent": "LANpad App"})
                        with safe_urlopen(req, timeout=3) as resp:
                            data = json.loads(resp.read().decode("utf-8"))
                            monetization_enabled = data.get("monetization_enabled", False)
                            break
                    except Exception as e:
                        print(f"[monetization] Status fetch failed on {base_url}: {e}")
                    
                if not monetization_enabled:
                    self.gui_queue.put(lambda: self.show_view("main"))
                    return
                    
                license_path = os.path.expanduser("~/.lanpad_license.json")
                if os.path.exists(license_path):
                    try:
                        import json
                        with open(license_path, "r", encoding="utf-8") as f:
                            lic = json.load(f)
                        key = lic.get("key")
                        tier = lic.get("tier")
                        last_checked = lic.get("last_checked", 0)
                        
                        # Trust key offline if checked within 24 hours
                        if time.time() - last_checked < 86400:
                            print(f"[monetization] Cached key '{key}' is valid offline ({tier}).")
                            self.gui_queue.put(lambda: self.show_view("main"))
                            return
                            
                        success, new_tier, expires_at = self.verify_key_online(key)
                        if success:
                            print(f"[monetization] Key verified online ({new_tier}).")
                            with open(license_path, "w", encoding="utf-8") as f:
                                json.dump({"key": key, "tier": new_tier, "expires_at": expires_at, "last_checked": time.time()}, f)
                            self.gui_queue.put(lambda: self.show_view("main"))
                            return
                    except Exception as e:
                        print(f"[monetization] License check error: {e}")
                        
                self.gui_queue.put(lambda: self.show_view("lock"))
            except Exception as e:
                print(f"[monetization] Error in status thread: {e}")
                self.gui_queue.put(lambda: self.show_view("lock"))

        threading.Thread(target=_thread_task, daemon=True).start()

    def verify_key_online(self, key):
        import urllib.request
        import json

        payload = json.dumps({"key": key}).encode("utf-8")
        urls = ["http://127.0.0.1:3000/api/monetization/verify", "https://lanpad.vercel.app/api/monetization/verify"]
        
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
                        return True, res.get("tier", "Basic"), res.get("expires_at", "2099-12-31T23:59:59Z")
            except Exception as e:
                print(f"[monetization] Verify online error on {url}: {e}")
                
        return False, "Basic", None

    def start_license_loop(self):
        self.root.after(3600000, self.periodic_license_check)
        
    def periodic_license_check(self):
        import threading
        
        def _thread_task():
            try:
                import urllib.request
                import json

                monetization_enabled = False
                urls = ["http://127.0.0.1:3000", "https://lanpad.vercel.app"]
                
                for base_url in urls:
                    try:
                        req = urllib.request.Request(f"{base_url}/api/monetization/status", headers={"User-Agent": "LANpad App"})
                        with safe_urlopen(req, timeout=3) as resp:
                            data = json.loads(resp.read().decode("utf-8"))
                            monetization_enabled = data.get("monetization_enabled", False)
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
                            
                            success, tier, expires_at = self.verify_key_online(key)
                            if success:
                                with open(license_path, "w", encoding="utf-8") as f:
                                    json.dump({"key": key, "tier": tier, "expires_at": expires_at, "last_checked": time.time()}, f)
                            else:
                                print("[monetization] Key expired or invalid. Locking app.")
                                try:
                                    os.remove(license_path)
                                except Exception as e:
                                    print(f"[monetization] Error locking app: {e}")
                                self.gui_queue.put(lambda: self.show_view("lock"))
                        except Exception as e:
                            pass
                    else:
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
                out = subprocess.run(
                    cmd, capture_output=True, text=True, timeout=2
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
                    out = subprocess.run(
                        ["ip", "-4", "-o", "addr", "show"],
                        capture_output=True, text=True, timeout=2,
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
            config = uvicorn.Config(app=app, host="0.0.0.0", port=8000, log_level="error")
            self.server_instance = uvicorn.Server(config)
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

        # Start background SSH tunnel fallback
        self.start_tunnel()

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
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            is_running = (s.connect_ex(("127.0.0.1", 8000)) == 0)
            s.close()
        except Exception:
            is_running = False

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
                with urllib.request.urlopen("http://127.0.0.1:8000/api/connections", timeout=0.5) as response:
                    data = json.loads(response.read().decode())
                    count = data.get("count", 0)
                    devices = data.get("devices", [])
                    if self.root.winfo_exists():
                        self.root.after(0, lambda: self._update_conn_lbl(count, devices))
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

    def copy_bookmarklet(self, event=None, silent=False):
        code = self.code_text.get("1.0", "end-1c")
        self.root.clipboard_clear()
        self.root.clipboard_append(code)
        if not silent:
            messagebox.showinfo("Bypass Copied", "Bookmarklet copied to clipboard!")

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
                url = "https://lanpad.vercel.app/downloads/version.json"
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
        """Prompt user to update."""
        if getattr(self, "update_in_progress", False):
            return
        self.update_in_progress = True
        
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
            self.update_in_progress = False

    def apply_update(self, version, data):
        """Download and install the update."""
        status_win = tk.Toplevel(self.root)
        status_win.title("Updating LANpad")
        status_win.geometry("300x120")
        status_win.resizable(False, False)
        status_win.configure(bg=self.BG)
        status_win.transient(self.root)
        status_win.grab_set()

        lbl = tk.Label(
            status_win, 
            text="Downloading update...", 
            font=(self.FU, 12, "bold"), 
            bg=self.BG, 
            fg=self.WHITE
        )
        lbl.pack(pady=25)

        try:
            self.root.update_idletasks()
            x = self.root.winfo_x() + (self.root.winfo_width() - 300) // 2
            y = self.root.winfo_y() + (self.root.winfo_height() - 120) // 2
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
                with urllib.request.urlopen(req, timeout=30) as response, open(download_path, 'wb') as out_file:
                    shutil.copyfileobj(response, out_file)

                self.root.after(0, lambda: lbl.config(text="Applying update..."))

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
                    bat_content = f"""@echo off
taskkill /F /PID {mypid} >nul 2>&1
timeout /t 2 /nobreak >nul
if not exist "{install_dir}" mkdir "{install_dir}"
copy /Y "{download_path}" "{install_dir}\\LANpad.exe" >nul 2>&1
start "" "{install_dir}\\LANpad.exe"
del "%~f0"
"""
                    bat_path = os.path.join(temp_dir, "lanpad_update.bat")
                    with open(bat_path, "w") as f:
                        f.write(bat_content)

                    subprocess.Popen([bat_path], shell=True, creationflags=0x00000010)
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
        # The user requested that clicking the cross ('X') should hide the dashboard and let the app run in the background.
        self.root.withdraw()





# ── Entry point ───────────────────────────────────────────────────────────────

def run_launcher():
    import socket
    import sys
    import threading

    # Single-instance lock & IPC MUST happen before tk.Tk()
    try:
        lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        lock_socket.bind(("127.0.0.1", 8001))
        lock_socket.listen(1)
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
        while True:
            try:
                conn, _ = lock_socket.accept()
                data = conn.recv(1024)
                conn.close()
                if data == b"QUIT":
                    root.after(0, app.root.destroy)
                else:
                    root.after(0, app.show_window)
            except Exception:
                pass
    threading.Thread(target=listen_for_show, daemon=True).start()

    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    if sys.platform == "darwin":
        root.createcommand("::tk::mac::ReopenApplication", app.show_window)
        
    root.mainloop()

if __name__ == "__main__":
    run_launcher()

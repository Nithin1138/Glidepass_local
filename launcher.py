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

        # Fonts (SF Pro on macOS, Helvetica Neue elsewhere)
        _mac = sys.platform == "darwin"
        self.FD = "SF Pro Display" if _mac else "Helvetica Neue"   # display
        self.FU = "SF Pro Text"    if _mac else "Helvetica Neue"   # UI
        self.FM = "SF Mono"        if _mac else "Courier New"      # mono

        # Animation state
        self._dot_tick  = 0
        self._server_on = False

        # ── View containers ───────────────────────────────────────────────────
        self.main_view   = tk.Frame(root, bg=self.BG)
        self.bypass_view = tk.Frame(root, bg=self.BG)
        self.main_view.place(x=0, y=0, relwidth=1, relheight=1)
        self.bypass_view.place(x=0, y=0, relwidth=1, relheight=1)

        self._build_main()
        self._build_bypass()

        self.root.after(500, self.start_server)
        self._tick_dot()
        self.check_process_status()
        self.show_view("main")
        self.root.after(2000, self.check_for_updates)

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
            print(f"[lanpad] icon setup: {e}")

    def _pill_button(self, parent, text, fg, fill, cmd=None, side="right"):
        """Draw a pill-shaped label button on a Canvas widget."""
        tw = len(text) * 7 + 30
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
        sr.place(x=24, y=68)
        self._dot_cv = tk.Canvas(sr, width=8, height=8, bg=self.BG, highlightthickness=0)
        self._dot_cv.pack(side="left")
        self._dot_id = self._dot_cv.create_oval(1, 1, 7, 7, fill=self.DIM, outline="")
        self._status_lbl = tk.Label(sr, text="Awaiting Sync",
                                    font=(self.FU, 10, "bold"),
                                    bg=self.BG, fg=self.DIM)
        self._status_lbl.pack(side="left", padx=(8, 0))

        # Connected Devices Status Label (placed on the right side)
        self._conn_lbl = tk.Label(v, text="0 Connected",
                                  font=(self.FU, 10, "bold"),
                                  bg=self.BG, fg=self.DIM, anchor="e")
        self._conn_lbl.place(x=376, y=68, anchor="ne")

        # ── Hero text ────────────────────────────────────────────────────────
        try:
            self._main_logo_img = Image.open(resource_path("logo.png"))
            # Original aspect ratio: 596 x 419 (~1.42)
            # Desired height: 36 -> Width: 51
            self._main_logo_img = self._main_logo_img.resize((51, 36), Image.Resampling.LANCZOS)
            self._main_logo_tk = ImageTk.PhotoImage(self._main_logo_img)
            tk.Label(v, image=self._main_logo_tk, bg=self.BG).place(x=24, y=96)
            title_x = 84
        except Exception as e:
            title_x = 24

        tk.Label(v, text="LANpad", font=(self.FD, 28, "bold"),
                 bg=self.BG, fg=self.WHITE, anchor="w").place(x=title_x, y=98)
        tk.Label(v,
                 text="Bridge your devices locally.",
                 font=(self.FU, 14), bg=self.BG, fg=self.DIM,
                 anchor="w", justify="left").place(x=24, y=136)

        tk.Label(v,
                 text="Scan in mobile:",
                 font=(self.FU, 10, "bold"), bg=self.BG, fg=self.WHITE,
                 anchor="w").place(x=24, y=192)

        # ── QR card ──────────────────────────────────────────────────────────
        self._qr_cv = tk.Canvas(v, width=W - 48, height=210,
                                 bg=self.BG, highlightthickness=0)
        self._qr_cv.place(x=24, y=228)
        self._draw_qr_empty()

        # ── IP pill ──────────────────────────────────────────────────────────
        self._ip_cv = tk.Canvas(v, width=W - 48, height=34,
                                 bg=self.BG, highlightthickness=0)
        self._ip_cv.place(x=24, y=448)
        self._ip_text = "http://0.0.0.0:8000"
        self._draw_ip(False)

        # ── Info row (Port / Protocol / State) ───────────────────────────────
        cw = (W - 48 - 12) // 3
        info_y = 505
        info_specs = [("Port", "8000"), ("Protocol", "HTTP"), ("State", "Off")]
        self._info_cards = {}
        for i, (lbl, default) in enumerate(info_specs):
            cv = tk.Canvas(v, width=cw, height=64, bg=self.BG, highlightthickness=0)
            cv.place(x=24 + i * (cw + 6), y=info_y)
            rounded_rect(cv, 0, 0, cw, 64, r=12, fill=self.BG2, outline=self.BORDER)
            cv.create_text(cw // 2, 20, text=lbl.upper(),
                           font=(self.FU, 8, "bold"), fill=self.DIM)
            tid = cv.create_text(cw // 2, 44, text=default,
                                 font=(self.FM, 14, "bold"), fill=self.DIM)
            self._info_cards[lbl] = (cv, tid)

        # ── Action button ────────────────────────────────────────────────────
        self._btn_cv = tk.Canvas(v, width=W - 48, height=54,
                                  bg=self.BG, highlightthickness=0)
        self._btn_cv.place(x=24, y=590)
        self._draw_main_btn(active=False)

        # ── Footer ───────────────────────────────────────────────────────────
        tk.Label(v, text="Ensure server is running on your laptop.",
                 font=(self.FU, 9), bg=self.BG, fg=self.DIM).place(
                 x=0, y=726, relwidth=1, anchor="nw")

    # ── Main-view canvas draw helpers ─────────────────────────────────────────

    def _draw_qr_empty(self):
        c = self._qr_cv
        c.delete("all")
        W, H = int(c["width"]), int(c["height"])
        rounded_rect(c, 0, 0, W, H, r=16, fill=self.BG2, outline=self.BORDER)
        cx, cy = W // 2, H // 2
        c.create_text(cx, cy - 10, text="QR Code", font=(self.FU, 16, "bold"), fill=self.DIM)
        c.create_text(cx, cy + 15, text="Start the server to generate",
                      font=(self.FU, 12), fill=self.DIM)

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
        rounded_rect(c, 0, 2, W, 32, r=10, fill=self.BG2, outline=self.BORDER)
        c.create_text(W // 2, 17, text=self._ip_text,
                      font=(self.FM, 12), fill=self.WHITE if active else self.DIM)

    def _draw_main_btn(self, active: bool):
        c = self._btn_cv
        c.delete("all")
        W = int(c["width"])
        if active:
            rounded_rect(c, 0, 1, W, 51, r=12, fill=self.RED, outline="")
            c.create_text(W // 2, 26, text="Stop Server",
                          fill=self.WHITE, font=(self.FU, 16, "bold"))
        else:
            rounded_rect(c, 0, 1, W, 51, r=12, fill=self.GREEN, outline="")
            c.create_text(W // 2, 26, text="Start Server",
                          fill=self.WHITE, font=(self.FU, 16, "bold"))
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
        hdr.place(x=18, y=58, width=W - 36)

        # Shield icon tile
        ic = tk.Canvas(hdr, width=48, height=48, bg=self.BG, highlightthickness=0)
        ic.pack(side="left")
        rounded_rect(ic, 0, 0, 48, 48, r=12, fill=self.BG2, outline="")
        ic.create_text(24, 27, text="🛡", font=(self.FU, 20))

        # Title block
        ti = tk.Frame(hdr, bg=self.BG)
        ti.pack(side="left", padx=12)
        tk.Label(ti, text="LANpad Master",
                 font=(self.FD, 16, "bold"), bg=self.BG, fg=self.WHITE).pack(anchor="w")
        tk.Label(ti, text="Neutralize restrictions in seconds",
                 font=(self.FU, 10), bg=self.BG, fg=self.DIM).pack(anchor="w", pady=(2, 0))


        # ── Step cards  2 × 2 grid ───────────────────────────────────────────
        steps = [
            ("01", "↬", "Open Site",     "Navigate to the\nrestricted page"),
            ("02", "⌘",  "Show Bar",      "Win: Ctrl+Shift+B\nMac: ⌘+Shift+B"),
            ("03", "★", "Bookmark",      "Right-click bar → Add Page,\nname it 'LANpad'"),
            ("04", "⎘",  "Paste Script",  "(Copied!) Paste script into\nthe bookmark URL field"),
        ]
        cw, ch = (W - 44) // 2, 115
        grid_top = 135
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
            cv.create_text(15, 32, text=icon, font=(self.FU, 18), anchor="w")
            # Title
            cv.create_text(15, 60, text=title,
                           font=(self.FU, 11, "bold"), fill=self.WHITE, anchor="w")
            # Description (wrapping)
            if i == 3:
                # Highlight "Copied!"
                cv.create_text(15, 76, text="(Copied!)", font=(self.FU, 9, "bold"), fill="#EAB308", anchor="nw")
                cv.create_text(68, 76, text="Paste script into", font=(self.FU, 9), fill=self.DIM, anchor="nw")
                cv.create_text(15, 92, text="the bookmark URL field", font=(self.FU, 9), fill=self.DIM, anchor="nw", width=cw - 22)
            else:
                cv.create_text(15, 76, text=desc,
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

    def show_view(self, name: str):
        if name == "main":
            self.main_view.tkraise()
        else:
            self.bypass_view.tkraise()
            self.copy_bookmarklet(silent=True)

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

    def update_qr_code(self, ip: str):
        def _fetch():
            try:
                # Build the QR locally (offline-friendly) – the local
                # ``qrcode`` library is bundled with the Windows build.
                img = _generate_qr_image(f"http://{ip}:8000", size=200)
                img = ImageOps.expand(img, border=10, fill="white")
                img = img.resize((186, 186), Image.Resampling.LANCZOS)
                self.root.after(0, self._draw_qr_active, img)
            except Exception:
                pass
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

        ip = self.get_local_ip()
        # If we detected more than one LAN IP, show the primary one
        # in the pill but log all candidates so the user can debug
        # from the terminal / console.
        all_ips = self.get_all_ips()
        if len(all_ips) > 1:
            print(f"[lanpad] Detected LAN IPs: {all_ips}")
            print(f"[lanpad] Using primary: {ip}")
        self._ip_text = f"http://{ip}:8000"
        self._draw_ip(True)
        self.root.after(200, lambda: self.update_qr_code(ip))
        if self.root.state() != "withdrawn":
            self.root.after(100, self.show_window)
        # If the user has multiple network interfaces, draw a small
        # hint under the URL pill so they know which one to use.
        if len(all_ips) > 1:
            try:
                from tkinter import font as _font
                # The hint replaces the footer for a moment so the
                # user can see all candidates without scrolling.
                hint = ("Other LAN IPs: " +
                        "  ".join(all_ips[1:3]) +
                        ("  …" if len(all_ips) > 3 else ""))
                # We piggy-back on the existing "Protocol" info card
                # value slot – cheap and avoids more layout work.
                pcard, ptid = self._info_cards.get("Protocol", (None, None))
                if ptid is not None:
                    pcard.itemconfig(ptid, text=hint, fill=self.ORANGE)
            except Exception:
                pass

    def stop_server(self):
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

        self._ip_text = "http://0.0.0.0:8000"
        self._draw_ip(False)
        self._draw_qr_empty()
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
                        self.root.after(0, lambda: self.prompt_update(online_version, data))
                except Exception:
                    pass
            except Exception as e:
                print(f"[auto-updater] check failed: {e}")

        threading.Thread(target=_thread, daemon=True).start()

    def prompt_update(self, version, data):
        """Prompt user to update."""
        ans = messagebox.askyesno(
            "Update Available",
            f"A new version of LANpad (v{version}) is available.\n\n"
            "Would you like to download and install it automatically now?\n"
            "This will restart the application.",
            parent=self.root
        )
        if ans:
            self.apply_update(version, data)

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

                mypid = os.getpid()
                if is_windows():
                    install_dir = os.path.join(os.environ.get("LOCALAPPDATA", ""), "LANpad")
                    bat_content = f"""@echo off
taskkill /F /PID {mypid} >nul 2>&1
timeout /t 2 /nobreak >nul
powershell -Command "Expand-Archive -Path '{download_path}' -DestinationPath '{install_dir}' -Force"
start "" "{install_dir}\\LANpad\\LANpad.exe"
del "%~f0"
"""
                    bat_path = os.path.join(temp_dir, "lanpad_update.bat")
                    with open(bat_path, "w") as f:
                        f.write(bat_content)

                    subprocess.Popen([bat_path], shell=True, creationflags=0x00000010)
                    os._exit(0)

                elif is_mac():
                    sh_content = f"""#!/bin/bash
while kill -0 {mypid} 2>/dev/null; do
    sleep 0.5
done
mkdir -p /tmp/LANpad_Mount_Update
hdiutil attach "{download_path}" -mountpoint /tmp/LANpad_Mount_Update -nobrowse -quiet
if [ -d "/tmp/LANpad_Mount_Update/LANpad.app" ]; then
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

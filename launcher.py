import tkinter as tk
from tkinter import messagebox
import os
import signal
import socket
import sys
import math
import threading
from PIL import Image, ImageTk, ImageOps
import urllib.request
import io


def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)


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


# ── App ───────────────────────────────────────────────────────────────────────

class GlidePassLauncher:
    def __init__(self, root):
        # Single-instance lock
        try:
            self.lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.lock_socket.bind(("127.0.0.1", 8001))
        except socket.error:
            sys.exit(0)

        self.root = root
        self.root.title("GlidePass")
        self.root.geometry("400x760")
        self.root.configure(bg="#060606")
        self.root.resizable(False, False)
        self.process = None

        # macOS native titlebar transparency
        if sys.platform == "darwin":
            try:
                from AppKit import NSApp, NSWindowStyleMaskFullSizeContentView
                NSApp.activateIgnoringOtherApps_(True)
                self.root.update_idletasks()
                for win in NSApp.windows():
                    if win.title() == "GlidePass":
                        win.setTitlebarAppearsTransparent_(True)
                        win.setTitleVisibility_(1)
                        win.setStyleMask_(
                            win.styleMask() | NSWindowStyleMaskFullSizeContentView
                        )
            except Exception as e:
                print(f"Native styling: {e}")

        self.root.lift()
        self.root.focus_force()

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
        
        self._pill_button(tb, "Bypass Siteblock →", self.WHITE, self.BG2,
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

        # ── Hero text ────────────────────────────────────────────────────────
        tk.Label(v, text="GlidePass", font=(self.FD, 28, "bold"),
                 bg=self.BG, fg=self.WHITE, anchor="w").place(x=24, y=100)
        tk.Label(v,
                 text="Bridge your devices locally.",
                 font=(self.FU, 14), bg=self.BG, fg=self.DIM,
                 anchor="w", justify="left").place(x=24, y=136)

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
        tk.Label(ti, text="GlidePad Master",
                 font=(self.FD, 16, "bold"), bg=self.BG, fg=self.WHITE).pack(anchor="w")
        tk.Label(ti, text="Neutralize restrictions in seconds",
                 font=(self.FU, 10), bg=self.BG, fg=self.DIM).pack(anchor="w", pady=(2, 0))


        # ── Step cards  2 × 2 grid ───────────────────────────────────────────
        steps = [
            ("01", "🔗", "Open Site",     "Navigate to the\nrestricted page"),
            ("02", "⌘",  "Show Bar",      "Win: Ctrl+Shift+B\nMac: ⌘+Shift+B"),
            ("03", "📖", "Bookmark",      "Right-click bar → Add Page,\nname it 'GlidePad'"),
            ("04", "⌨",  "Paste Script",  "Paste script into the\nbookmark URL field"),
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
            "javascript:(function()%7B      if(window.__glidepad_active) %7B"
            "showN(\"ALREADY ACTIVE\", \"%23f59e0b\");        return;      %7D"
            "window.__glidepad_active=true;      window.__gp_abort=false;"
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

    def get_local_ip(self) -> str:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"

    def update_qr_code(self, ip: str):
        try:
            url = (f"https://api.qrserver.com/v1/create-qr-code/"
                   f"?size=180x180&data=http://{ip}:8000")
            with urllib.request.urlopen(url) as resp:
                img = Image.open(io.BytesIO(resp.read()))
                img = ImageOps.expand(img, border=10, fill="white")
                img = img.resize((186, 186), Image.Resampling.LANCZOS)
                self._draw_qr_active(img)
        except Exception:
            pass

    # ── Server control ────────────────────────────────────────────────────────

    def toggle_server(self):
        if self.process is None:
            self.start_server()
        else:
            self.stop_server()

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
        self._ip_text = f"http://{ip}:8000"
        self._draw_ip(True)
        self.root.after(200, lambda: self.update_qr_code(ip))

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

    def check_process_status(self):
        if (self.process and
                self.process not in ("EXTERNAL", "THREADED") and
                hasattr(self.process, "poll")):
            if self.process.poll() is not None:
                self.process = None
                if "--auto-start" in sys.argv:
                    self.root.destroy()
                    return
                self._ui_reset()
        if self.root.winfo_exists():
            self.root.after(1000, self.check_process_status)

    def copy_bookmarklet(self, event=None, silent=False):
        code = self.code_text.get("1.0", "end-1c")
        self.root.clipboard_clear()
        self.root.clipboard_append(code)
        if not silent:
            messagebox.showinfo("Bypass Copied", "Bookmarklet copied to clipboard!")

    def on_closing(self):
        # Server is managed by the Anchor/menubar — keep it alive on window close.
        self.root.destroy()


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    root = tk.Tk()
    app  = GlidePassLauncher(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()
import os
import re

file_path = "/Users/nithin/Projects/GlidePass/launcher.py"

with open(file_path, "r") as f:
    content = f.read()

# 1. Update design tokens
tokens_old = """        # ── Design tokens ────────────────────────────────────────────────────
        self.BG     = "#060606"
        self.BG2    = "#0a0a0a"
        self.AMBER  = "#f59e0b"
        self.ORANGE = "#d97757"
        self.RED    = "#ff3b30"
        self.GREEN  = "#22c55e"
        self.WHITE  = "#ffffff"
        self.DIM    = "#333333"
        self.BORDER = "#1a1a1a" """

tokens_new = """        # ── Design tokens ────────────────────────────────────────────────────
        self.BG     = "#1c1c1e" # standard macOS dark background
        self.BG2    = "#2c2c2e" # elevated background
        self.AMBER  = "#0a84ff" # Use Apple Blue for accents instead of amber
        self.ORANGE = "#0a84ff"
        self.RED    = "#ff453a" # Apple Red
        self.GREEN  = "#32d74b" # Apple Green
        self.WHITE  = "#ffffff"
        self.DIM    = "#8e8e93"
        self.BORDER = "#3a3a3c" """

content = content.replace(tokens_old, tokens_new)

# 2. Remove paint_orbs from _build_main
build_main_old = """        # Ambient background canvas
        bg_cv = tk.Canvas(v, width=W, height=760, bg=self.BG, highlightthickness=0)
        bg_cv.place(x=0, y=0)
        self._paint_orbs(bg_cv, W, 760)

        # ── Titlebar (Native Layout) ─────────────────────────────────────────
        tb = tk.Frame(v, bg=self.BG, height=60)
        tb.place(x=0, y=0, relwidth=1)
        
        self._pill_button(tb, "NEUTRALIZE SITEBLOCK?", self.AMBER, "#120d00",
                          cmd=lambda: self.show_view("bypass"))"""

build_main_new = """        # Flat background
        bg_cv = tk.Canvas(v, width=W, height=760, bg=self.BG, highlightthickness=0)
        bg_cv.place(x=0, y=0)

        # ── Titlebar (Native Layout) ─────────────────────────────────────────
        tb = tk.Frame(v, bg=self.BG, height=60)
        tb.place(x=0, y=0, relwidth=1)
        
        self._pill_button(tb, "Blocked in site?", self.DIM, self.BG,
                          cmd=lambda: self.show_view("bypass"))"""

content = content.replace(build_main_old, build_main_new)

# 3. Simplify QR Empty
qr_empty_old = """    def _draw_qr_empty(self):
        c = self._qr_cv
        c.delete("all")
        W, H = int(c["width"]), int(c["height"])
        rounded_rect(c, 0, 0, W, H, r=16, fill=self.BG2, outline=self.BORDER)
        cx, cy = W // 2, H // 2
        # Radar circles
        c.create_oval(cx - 35, cy - 45, cx + 35, cy + 25,
                      outline="#161616", width=1, dash=(4, 4))
        c.create_oval(cx - 20, cy - 30, cx + 20, cy + 10,
                      outline="#1a1a1a", width=1)
        # Radar target
        c.create_text(cx, cy - 10, text="⌖", font=(self.FU, 24), fill="#1c1c1c")
        
        c.create_text(cx, cy + 38, text="AWAITING PAIRING",
                      font=(self.FU, 9, "bold"), fill="#2e2e2e")
        c.create_text(cx, cy + 56, text="Start the server to generate QR",
                      font=(self.FU, 9), fill="#222222")"""

qr_empty_new = """    def _draw_qr_empty(self):
        c = self._qr_cv
        c.delete("all")
        W, H = int(c["width"]), int(c["height"])
        rounded_rect(c, 0, 0, W, H, r=16, fill=self.BG2, outline=self.BORDER)
        cx, cy = W // 2, H // 2
        c.create_text(cx, cy - 10, text="QR Code", font=(self.FU, 16, "bold"), fill=self.DIM)
        c.create_text(cx, cy + 15, text="Start the server to generate",
                      font=(self.FU, 12), fill=self.DIM)"""

content = content.replace(qr_empty_old, qr_empty_new)

# 4. Simplify QR Active
qr_active_old = """    def _draw_qr_active(self, img: Image.Image):
        c = self._qr_cv
        c.delete("all")
        W, H = int(c["width"]), int(c["height"])
        # Outer amber glow ring
        rounded_rect(c, 0, 0, W, H, r=16, fill="#0c0800", outline=self.AMBER)
        rounded_rect(c, 2, 2, W - 2, H - 2, r=15, fill=self.BG2, outline="")
        self._qr_photo = ImageTk.PhotoImage(img)
        c.create_image(W // 2, H // 2, image=self._qr_photo)"""

qr_active_new = """    def _draw_qr_active(self, img: Image.Image):
        c = self._qr_cv
        c.delete("all")
        W, H = int(c["width"]), int(c["height"])
        rounded_rect(c, 0, 0, W, H, r=16, fill=self.BG2, outline=self.BORDER)
        self._qr_photo = ImageTk.PhotoImage(img)
        c.create_image(W // 2, H // 2, image=self._qr_photo)"""

content = content.replace(qr_active_old, qr_active_new)

# 5. Simplify IP
ip_old = """    def _draw_ip(self, active: bool):
        c = self._ip_cv
        c.delete("all")
        W = int(c["width"])
        if active:
            rounded_rect(c, 0, 2, W, 32, r=15, fill="#0d0900", outline=self.AMBER)
            c.create_text(W // 2, 17, text=self._ip_text,
                          font=(self.FM, 10), fill=self.AMBER)
        else:
            rounded_rect(c, 0, 2, W, 32, r=15, fill=self.BG2, outline=self.BORDER)
            c.create_text(W // 2, 17, text=self._ip_text,
                          font=(self.FM, 10), fill="#2e2e2e")"""

ip_new = """    def _draw_ip(self, active: bool):
        c = self._ip_cv
        c.delete("all")
        W = int(c["width"])
        rounded_rect(c, 0, 2, W, 32, r=10, fill=self.BG2, outline=self.BORDER)
        c.create_text(W // 2, 17, text=self._ip_text,
                      font=(self.FM, 12), fill=self.WHITE if active else self.DIM)"""

content = content.replace(ip_old, ip_new)

# 6. Simplify Main Button
btn_old = """    def _draw_main_btn(self, active: bool):
        c = self._btn_cv
        c.delete("all")
        W = int(c["width"])
        if active:
            rounded_rect(c, 0, 1, W, 51, r=24, fill="#150505", outline=self.RED)
            c.create_text(W // 2, 26, text="⏻  STOP SERVER",
                          fill=self.RED, font=(self.FU, 13, "bold"))
        else:
            rounded_rect(c, 0, 1, W, 51, r=24, fill=self.WHITE, outline="")
            c.create_text(W // 2, 26, text="START SERVER",
                          fill="#000000", font=(self.FU, 13, "bold"))
        c.bind("<Button-1>", lambda e: self.toggle_server())
        c.config(cursor="hand2")"""

btn_new = """    def _draw_main_btn(self, active: bool):
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
        c.config(cursor="hand2")"""

content = content.replace(btn_old, btn_new)

# 7. Remove dot animation
dot_old = """    def _tick_dot(self):
        if self._server_on:
            self._dot_tick = (self._dot_tick + 1) % 20
            t = 0.45 + 0.55 * math.sin(self._dot_tick / 20 * 2 * math.pi)
            r = int(18 + 16 * t)
            g = int(110 + 87 * t)
            b = int(36 + 58 * t)
            self._dot_cv.itemconfig(self._dot_id, fill=f"#{r:02x}{g:02x}{b:02x}")
        self.root.after(80, self._tick_dot)"""

dot_new = """    def _tick_dot(self):
        # Animation removed for clean UI
        pass"""

content = content.replace(dot_old, dot_new)

# 8. Remove bypass orbs
bypass_old = """        # Ambient background
        bg_cv = tk.Canvas(v, width=W, height=760, bg=self.BG, highlightthickness=0)
        bg_cv.place(x=0, y=0)
        self._paint_orbs(bg_cv, W, 760)

        # ── Titlebar (Native Layout) ─────────────────────────────────────────
        tb = tk.Frame(v, bg=self.BG, height=60)
        tb.place(x=0, y=0, relwidth=1)
        self._pill_button(tb, "← Back", "#666666", "#111111",
                          cmd=lambda: self.show_view("main"), side="right")"""

bypass_new = """        # Flat background
        bg_cv = tk.Canvas(v, width=W, height=760, bg=self.BG, highlightthickness=0)
        bg_cv.place(x=0, y=0)

        # ── Titlebar (Native Layout) ─────────────────────────────────────────
        tb = tk.Frame(v, bg=self.BG, height=60)
        tb.place(x=0, y=0, relwidth=1)
        self._pill_button(tb, "← Back", self.DIM, self.BG2,
                          cmd=lambda: self.show_view("main"), side="right")"""

content = content.replace(bypass_old, bypass_new)

with open(file_path, "w") as f:
    f.write(content)
print("Updated launcher.py successfully.")

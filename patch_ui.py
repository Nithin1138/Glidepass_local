import sys

with open("launcher.py", "r") as f:
    content = f.read()

# Add safeguard to _ui_active
old_active = """        self.root.after(200, lambda: self.update_qr_code(ip))"""
new_active = """        self.root.after(200, lambda: self.update_qr_code(ip))
        self.root.after(100, self.show_window)"""

content = content.replace(old_active, new_active)

# Add safeguard to _ui_reset
old_reset = """        self._ip_text = "http://0.0.0.0:8000"
        self._draw_ip(False)
        self._draw_qr_empty()"""
new_reset = """        self._ip_text = "http://0.0.0.0:8000"
        self._draw_ip(False)
        self._draw_qr_empty()
        self.root.after(100, self.show_window)"""

content = content.replace(old_reset, new_reset)

with open("launcher.py", "w") as f:
    f.write(content)

print("Patched UI updates")

import sys
import socket
import time

if sys.platform == "darwin":
    from AppKit import NSApplication, NSApplicationActivationPolicyProhibited, NSApplicationActivationPolicyRegular
    app = NSApplication.sharedApplication()
    app.setActivationPolicy_(NSApplicationActivationPolicyProhibited)

try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 8001))
except Exception:
    print("Failed to bind")
    sys.exit(0)

if sys.platform == "darwin":
    app.setActivationPolicy_(NSApplicationActivationPolicyRegular)

import tkinter as tk
root = tk.Tk()
root.title("Test Policy")
root.mainloop()

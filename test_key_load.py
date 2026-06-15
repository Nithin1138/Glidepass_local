import tkinter as tk
import os
import sys
from launcher import LANpadLauncher

root = tk.Tk()
app = LANpadLauncher(root)
app.update_lock_time_left()
app.load_active_key_if_present()
print("Key Entry Text:", app.key_entry.get())
print("Key Entry Show:", app.key_entry.cget("show"))
try:
    print("Show Hide Button text:", app.show_hide_btn.cget("text"))
except Exception as e:
    print("Show Hide Button error:", e)

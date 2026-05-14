import tkinter as tk
from tkinter import messagebox
import subprocess
import os
import signal
import socket
import threading
import time
import sys

class GlidePassLauncher:
    def __init__(self, root):
        self.root = root
        self.root.title("GlidePass Launcher")
        self.root.geometry("400x300")
        self.root.configure(bg="#0f0f0f")
        self.process = None

        # UI Styling
        self.label = tk.Label(root, text="GlidePass", font=("Inter", 24, "bold"), bg="#0f0f0f", fg="#d97757")
        self.label.pack(pady=20)

        self.status_label = tk.Label(root, text="Status: Offline", font=("Inter", 12), bg="#0f0f0f", fg="#9a9a9a")
        self.status_label.pack(pady=5)

        self.ip_label = tk.Label(root, text="", font=("JetBrains Mono", 10), bg="#0f0f0f", fg="#666")
        self.ip_label.pack(pady=5)

        self.start_button = tk.Button(root, text="START SERVER", command=self.toggle_server, 
                                     font=("Inter", 12, "bold"), bg="#d97757", fg="black", 
                                     padx=20, pady=10, borderwidth=0)
        self.start_button.pack(pady=20)

        # Auto-start if requested
        if "--auto-start" in sys.argv:
            self.root.after(500, self.start_server)
        
        # Start monitoring process status
        self.check_process_status()

    def get_local_ip(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"

    def toggle_server(self):
        if self.process is None:
            self.start_server()
        else:
            self.stop_server()

    def start_server(self):
        try:
            # Start the FastAPI server using uvicorn
            self.process = subprocess.Popen([sys.executable, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"], 
                                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            self.status_label.config(text="Status: Online", fg="#4caf50")
            self.start_button.config(text="STOP SERVER", bg="#333", fg="white")
            
            ip = self.get_local_ip()
            self.ip_label.config(text=f"Access at: http://{ip}:8000")
            
            # Only show messagebox if NOT auto-starting
            if "--auto-start" not in sys.argv:
                messagebox.showinfo("GlidePass", f"Server started successfully!\nMobile access: http://{ip}:8000")
        except Exception as e:
            messagebox.showerror("Error", f"Could not start server: {e}")

    def check_process_status(self):
        """Monitor the backend process and auto-close if it stops."""
        if self.process:
            poll = self.process.poll()
            if poll is not None:
                # Process has terminated
                self.process = None
                if "--auto-start" in sys.argv:
                    # Auto-close the launcher if it was started by the extension
                    self.root.destroy()
                else:
                    self.status_label.config(text="Status: Offline", fg="#f44336")
                    self.start_button.config(text="START SERVER", bg="#d97757", fg="black")
                    self.ip_label.config(text="")
        
        # Check again in 1 second
        if self.root.winfo_exists():
            self.root.after(1000, self.check_process_status)

    def stop_server(self):
        if self.process:
            os.kill(self.process.pid, signal.SIGTERM)
            self.process = None
            self.status_label.config(text="Status: Offline", fg="#f44336")
            self.start_button.config(text="START SERVER", bg="#d97757", fg="black")
            self.ip_label.config(text="")
            messagebox.showinfo("GlidePass", "Server stopped.")

    def on_closing(self):
        self.stop_server()
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = GlidePassLauncher(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()

import tkinter as tk
import threading
import uvicorn
from fastapi import FastAPI
import time

app = FastAPI()
@app.get("/")
def read_root(): return {"Hello": "World"}

def start_server():
    print("Starting uvicorn in thread")
    config = uvicorn.Config(app=app, host="127.0.0.1", port=8005)
    server = uvicorn.Server(config)
    t = threading.Thread(target=server.run, daemon=True)
    t.start()

root = tk.Tk()
btn = tk.Button(root, text="Start Server", command=start_server)
btn.pack()

# Auto-click after 1s, then close after 3s
root.after(1000, start_server)
root.after(3000, root.destroy)
root.mainloop()
print("Success")

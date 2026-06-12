import threading, time, sys, urllib.request, uvicorn
from fastapi import FastAPI
import tkinter as tk

app = FastAPI()

@app.get("/shutdown")
def shutdown():
    global SHUTDOWN_REQUESTED
    SHUTDOWN_REQUESTED = True
    return {"status": "success"}

SHUTDOWN_REQUESTED = False
server_instance = None

def run_server():
    global server_instance
    config = uvicorn.Config(app=app, host="127.0.0.1", port=8006, log_level="error")
    server_instance = uvicorn.Server(config)
    server_instance.run()

def poll_shutdown():
    global SHUTDOWN_REQUESTED, server_instance
    while True:
        if SHUTDOWN_REQUESTED:
            if server_instance:
                server_instance.should_exit = True
                server_instance.force_exit = True
            SHUTDOWN_REQUESTED = False
        time.sleep(0.5)

threading.Thread(target=run_server, daemon=True).start()
threading.Thread(target=poll_shutdown, daemon=True).start()

def hit_shutdown():
    print("Hitting shutdown...")
    urllib.request.urlopen("http://127.0.0.1:8006/shutdown")

root = tk.Tk()
root.after(2000, hit_shutdown)
root.after(4000, lambda: print("App still running!"))
root.after(5000, lambda: sys.exit(0))
root.mainloop()

import uvicorn
from fastapi import FastAPI
import threading
import time

app = FastAPI()

server = None

def run_server():
    global server
    print("Starting Uvicorn...")
    config = uvicorn.Config(app=app, host="127.0.0.1", port=8005, log_level="error")
    server = uvicorn.Server(config)
    server.run()
    print("Uvicorn run returned.")

t = threading.Thread(target=run_server)
t.start()
time.sleep(2)
print("Setting force_exit")
server.should_exit = True
server.force_exit = True
time.sleep(2)
print("Main thread finishing")

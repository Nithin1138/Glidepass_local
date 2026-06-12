import uvicorn
from app import app
import threading
import time

print("Starting 1")
config = uvicorn.Config(app=app, host="0.0.0.0", port=8000, log_level="error")
server = uvicorn.Server(config)
t = threading.Thread(target=server.run, daemon=True)
t.start()
time.sleep(2)

print("Stopping 1")
server.should_exit = True
server.force_exit = True
time.sleep(2)

print("Starting 2")
config2 = uvicorn.Config(app=app, host="0.0.0.0", port=8000, log_level="error")
server2 = uvicorn.Server(config2)
t2 = threading.Thread(target=server2.run, daemon=True)
t2.start()
time.sleep(2)

print("Done")

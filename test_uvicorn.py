import sys, threading, time, uvicorn
from fastapi import FastAPI

app = FastAPI()

def run_server():
    print("Starting server...")
    config = uvicorn.Config(app=app, host="127.0.0.1", port=8005, log_level="error")
    server = uvicorn.Server(config)
    
    def shutdown():
        time.sleep(2)
        print("Stopping server...")
        server.should_exit = True
    
    threading.Thread(target=shutdown).start()
    server.run()
    print("Server run() finished")

t = threading.Thread(target=run_server)
t.start()
t.join()
print("Main thread exiting peacefully")

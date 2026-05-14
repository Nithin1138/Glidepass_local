#!/usr/bin/env python3
import sys
import json
import struct
import subprocess
import os
import logging

# Setup logging to a file in the same directory
log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bridge_log.txt")
logging.basicConfig(filename=log_file, level=logging.DEBUG, format='%(asctime)s %(message)s')

def send_message(message):
    try:
        encoded_message = json.dumps(message).encode('utf-8')
        sys.stdout.buffer.write(struct.pack('I', len(encoded_message)))
        sys.stdout.buffer.write(encoded_message)
        sys.stdout.buffer.flush()
        logging.debug(f"Sent message: {message}")
    except Exception as e:
        logging.error(f"Error sending message: {e}")

def read_message():
    try:
        raw_length = sys.stdin.buffer.read(4)
        if len(raw_length) == 0:
            logging.debug("No length received, exiting.")
            sys.exit(0)
        message_length = struct.unpack('I', raw_length)[0]
        message = sys.stdin.buffer.read(message_length).decode('utf-8')
        logging.debug(f"Read message: {message}")
        return json.loads(message)
    except Exception as e:
        logging.error(f"Error reading message: {e}")
        sys.exit(1)

def main():
    logging.debug("Native Host Started")
    while True:
        message = read_message()
        if message.get("command") == "start_backend":
            try:
                cwd = os.path.dirname(os.path.abspath(__file__))
                logging.debug(f"Starting backend in {cwd}")
                
                # Start uvicorn. Use sys.executable to ensure we use the same python
                # We use -m uvicorn to find the module in the current environment
                subprocess.Popen(
                    [sys.executable, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"],
                    cwd=cwd,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    start_new_session=True
                )
                logging.debug("Subprocess Popen called successfully.")
                send_message({"status": "success", "message": "Backend started!"})
            except Exception as e:
                logging.error(f"Failed to start backend: {e}")
                send_message({"status": "error", "message": str(e)})

if __name__ == "__main__":
    main()

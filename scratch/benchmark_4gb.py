import os
import time
import sys
import json
import urllib.request
import urllib.parse

SERVER_URL = "http://127.0.0.1:8000"
FILE_SIZE_GB = 4
FILE_SIZE_BYTES = FILE_SIZE_GB * 1024 * 1024 * 1024
TEMP_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "speedtest_4gb.tmp")

def get_active_session_token():
    try:
        url = f"{SERVER_URL}/api/benchmark/token"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["session_token"]
    except Exception as e:
        print(f"Failed to fetch session token from server: {e}")
        print("Please make sure the server is running on port 8000.")
        sys.exit(1)

def create_4gb_file():
    print(f"Creating a 4GB dummy file for speed testing at: {TEMP_FILE_PATH}")
    buffer_size = 16 * 1024 * 1024  # 16MB
    data = b"a" * buffer_size
    written = 0
    start = time.time()
    
    with open(TEMP_FILE_PATH, "wb") as f:
        while written < FILE_SIZE_BYTES:
            to_write = min(buffer_size, FILE_SIZE_BYTES - written)
            f.write(data[:to_write])
            written += to_write
            if time.time() - start > 1:
                pct = (written / FILE_SIZE_BYTES) * 100
                print(f"Writing dummy file: {pct:.1f}%...")
                start = time.time()
                
    print("Successfully created 4GB dummy file.")

def run_upload_test(sid):
    print("\n--- STARTING 4GB UPLOAD SPEED TEST ---")
    url = f"{SERVER_URL}/api/files/upload_raw?filename=speedtest_4gb.tmp&sid={urllib.parse.quote(sid)}"
    print("Uploading 4GB payload to local server...")
    start_time = time.time()
    
    try:
        import httpx
        
        def generator():
            bytes_sent = 0
            last_report = time.time()
            with open(TEMP_FILE_PATH, "rb") as f:
                while True:
                    chunk = f.read(4 * 1024 * 1024) # 4MB chunks
                    if not chunk:
                        break
                    bytes_sent += len(chunk)
                    now = time.time()
                    if now - last_report >= 1.0:
                        pct = (bytes_sent / FILE_SIZE_BYTES) * 100
                        speed = (bytes_sent / (now - start_time) / 1048576)
                        print(f"Uploading: {pct:.1f}% | Current Speed: {speed:.2f} MB/s")
                        last_report = now
                    yield chunk

        with httpx.Client(timeout=600.0) as client:
            r = client.post(url, content=generator(), headers={"Content-Type": "application/octet-stream"})
            print(f"Server response: {r.json()}")
            duration = time.time() - start_time
            avg_speed = (FILE_SIZE_BYTES / duration / 1048576)
            print(f"Average Upload Speed: {avg_speed:.2f} MB/s (Time taken: {duration:.2f}s)")
            return avg_speed
    except ImportError:
        print("Please install httpx to run this benchmark: pip install httpx")
        return 0

def run_download_test(sid):
    print("\n--- STARTING 4GB DOWNLOAD SPEED TEST ---")
    url = f"{SERVER_URL}/api/files/download/speedtest_4gb.tmp?sid={urllib.parse.quote(sid)}"
    start_time = time.time()
    bytes_received = 0
    last_report = time.time()
    
    req = urllib.request.Request(url, headers={"User-Agent": "LANpad Benchmark"})
    with urllib.request.urlopen(req) as response:
        while True:
            chunk = response.read(4 * 1024 * 1024) # 4MB chunks
            if not chunk:
                break
            bytes_received += len(chunk)
            now = time.time()
            if now - last_report >= 1.0:
                pct = (bytes_received / FILE_SIZE_BYTES) * 100
                speed = (bytes_received / (now - start_time) / 1048576)
                print(f"Downloading: {pct:.1f}% | Current Speed: {speed:.2f} MB/s")
                last_report = now
                
    duration = time.time() - start_time
    avg_speed = (bytes_received / duration / 1048576)
    print(f"Average Download Speed: {avg_speed:.2f} MB/s (Time taken: {duration:.2f}s)")
    return avg_speed

if __name__ == "__main__":
    sid = get_active_session_token()
    
    if not os.path.exists(TEMP_FILE_PATH):
        create_4gb_file()
    
    try:
        up = run_upload_test(sid)
        dl = run_download_test(sid)
        
        print("\n======================================")
        print("         BENCHMARK RESULTS            ")
        print("======================================")
        print(f"Upload Speed:   {up:.2f} MB/s")
        print(f"Download Speed: {dl:.2f} MB/s")
        print("======================================\n")
    finally:
        if os.path.exists(TEMP_FILE_PATH):
            os.remove(TEMP_FILE_PATH)
        # Try to delete the uploaded test file from sharing dir
        try:
            url = f"{SERVER_URL}/api/files/delete/speedtest_4gb.tmp?sid={urllib.parse.quote(sid)}"
            req = urllib.request.Request(url, method="DELETE")
            urllib.request.urlopen(req)
        except Exception:
            pass

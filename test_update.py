import sys
import tkinter as tk
import platform_utils
import threading
import urllib.request
import json
from launcher import LANpadLauncher

def run_test():
    print(f"Starting LANpad Update Tester (Current Version: {platform_utils.VERSION})...")
    root = tk.Tk()
    
    print("Initializing Launcher GUI...")
    app = LANpadLauncher(root)
    
    # Override check_for_updates to point to the local next.js backend for testing
    def local_check_for_updates():
        def _thread():
            try:
                local_url = "http://localhost:3000/api/ota?file=downloads/version.json"
                print(f"Checking for updates against {local_url} ...")
                req = urllib.request.Request(
                    local_url, 
                    headers={'User-Agent': 'Mozilla/5.0'}
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode('utf-8'))
                
                online_version = data.get("version")
                if not online_version:
                    print("No version found in response from server.")
                    return

                print(f"Server reports latest version: {online_version}")
                
                def v_tuple(v):
                    clean = v.lower().lstrip('v')
                    return tuple(map(int, clean.split('.')))

                try:
                    if v_tuple(online_version) > v_tuple(platform_utils.VERSION):
                        print(f"Update available! {online_version} > {platform_utils.VERSION}")
                        app.root.after(0, lambda: app.prompt_update(online_version, data))
                    else:
                        print(f"App is up to date. ({platform_utils.VERSION} >= {online_version})")
                except Exception as e:
                    print(f"Version comparison failed: {e}")
            except Exception as e:
                print(f"[auto-updater] Local update check failed: {e}")

        threading.Thread(target=_thread, daemon=True).start()

    # Patch the method
    app.check_for_updates = local_check_for_updates
    
    print("Triggering real update check against local server in 1 second...")
    root.after(1000, app.check_for_updates)
    
    root.mainloop()

if __name__ == "__main__":
    run_test()

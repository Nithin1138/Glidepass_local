import os
import json
import sys
import subprocess

# THE ID FROM chrome://extensions
EXTENSION_ID = "balleijkjhnmflldlhgclonmnndoeiji" 

def register():
    host_name = "com.glidepass.launcher"
    bridge_path = os.path.abspath("glidepass_bridge.sh")
    
    # Ensure ID is clean
    clean_id = EXTENSION_ID.strip().lower()
    
    manifest = {
        "name": host_name,
        "description": "GlidePass Backend Launcher",
        "path": bridge_path, 
        "type": "stdio",
        "allowed_origins": [
            f"chrome-extension://{clean_id}/"
        ]
    }
    
    # Exhaustive list of Chromium paths on Mac
    paths = [
        "~/Library/Application Support/Google/Chrome/NativeMessagingHosts",
        "~/Library/Application Support/Google/Chrome Canary/NativeMessagingHosts",
        "~/Library/Application Support/Chromium/NativeMessagingHosts",
        "~/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts",
        "~/Library/Application Support/Microsoft Edge/NativeMessagingHosts",
        "~/Library/Application Support/Vivaldi/NativeMessagingHosts"
    ]
    
    # Update the shell bridge with the absolute python path
    python_path = subprocess.check_output(["which", "python3"]).decode().strip()
    with open("glidepass_bridge.sh", "w") as f:
        f.write(f"#!/bin/bash\n")
        f.write(f"DIR=\"$( cd \"$( dirname \"${{BASH_SOURCE[0]}}\" )\" >/dev/null 2>&1 && pwd )\"\n")
        f.write(f"\"{python_path}\" \"$DIR/native_host.py\" \"$@\"\n")
    
    os.chmod(bridge_path, 0o755)
    os.chmod(os.path.abspath("native_host.py"), 0o755)
    
    count = 0
    for p in paths:
        target_dir = os.path.expanduser(p)
        # We create the dir even if it doesn't exist to be safe
        try:
            os.makedirs(target_dir, exist_ok=True)
            target_path = os.path.join(target_dir, f"{host_name}.json")
            with open(target_path, "w") as f:
                json.dump(manifest, f, indent=2)
            print(f"✅ Registered: {p}")
            count += 1
        except Exception as e:
            print(f"❌ Failed for {p}: {e}")

    print(f"\n🚀 Total registrations: {count}")
    print(f"👉 Now RESTART your browser and try again.")

if __name__ == "__main__":
    register()

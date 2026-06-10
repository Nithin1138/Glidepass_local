import os
import subprocess
import sys

APP_NAME = "LANpadStarter"
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
# Get the absolute path to the current python3
PYTHON_PATH = subprocess.check_output(["which", "python3"]).decode().strip()

def create_app():
    # 1. Create the App structure
    app_path = os.path.join(PROJECT_DIR, f"{APP_NAME}.app")
    contents_dir = os.path.join(app_path, "Contents")
    macos_dir = os.path.join(contents_dir, "MacOS")
    
    # Remove old app if exists
    if os.path.exists(app_path):
        subprocess.run(["rm", "-rf", app_path])
        
    os.makedirs(macos_dir, exist_ok=True)
    
    # 2. Add Icon to Resources
    resources_dir = os.path.join(contents_dir, "Resources")
    os.makedirs(resources_dir, exist_ok=True)
    if os.path.exists(os.path.join(PROJECT_DIR, "logo.icns")):
        subprocess.run(["cp", os.path.join(PROJECT_DIR, "logo.icns"), os.path.join(resources_dir, "AppIcon.icns")])
    
    # 3. Create the executable script with FULL ABSOLUTE PATHS
    executable_path = os.path.join(macos_dir, "LANpadStarter")
    with open(executable_path, "w") as f:
        f.write("#!/bin/bash\n")
        # Log attempts for debugging
        f.write(f"echo 'Launching LANpad from {PROJECT_DIR}' > \"{PROJECT_DIR}/starter_log.txt\"\n")
        f.write(f"cd \"{PROJECT_DIR}\"\n")
        # Launch the Launcher GUI with auto-start flag
        f.write(f"\"{PYTHON_PATH}\" \"{PROJECT_DIR}/launcher.py\" --auto-start &\n")
        f.write(f"echo \"Launcher triggered at $(date)\" >> \"{PROJECT_DIR}/starter_log.txt\"\n")
    
    os.chmod(executable_path, 0o755)
    
    # 3. Create the Info.plist
    plist_path = os.path.join(contents_dir, "Info.plist")
    with open(plist_path, "w") as f:
        f.write(f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>LANpadStarter</string>
    <key>CFBundleIdentifier</key>
    <string>com.lanpad.starter</string>
    <key>CFBundleName</key>
    <string>LANpadStarter</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSUIElement</key>
    <true/>
    <key>LSArchitecturePriority</key>
    <array>
        <string>arm64</string>
        <string>x86_64</string>
    </array>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>LANpad Protocol</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>lanpad</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
""")

    # 4. Force register with Launch Services
    # This tells macOS exactly where this app is located
    ls_register = "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
    subprocess.run([ls_register, "-f", app_path])
    
    print(f"✅ Rebuilt {APP_NAME}.app with absolute path: {PYTHON_PATH}")
    print(f"✅ Registered protocol lanpad:// successfully.")

if __name__ == "__main__":
    create_app()

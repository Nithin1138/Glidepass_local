import os
import subprocess

APP_PATH = "LANpadBridge.app"
PLIST_PATH = f"{APP_PATH}/Contents/Info.plist"

def fix_plist():
    # 1. First, make sure the app is compiled
    if not os.path.exists(APP_PATH):
        print("❌ App not found. Run osacompile first.")
        return

    # 2. Use 'defaults' command to inject the URL handler
    # This is much safer than manual XML editing
    subprocess.run(["defaults", "write", os.path.abspath(PLIST_PATH), "CFBundleURLTypes", "-array", "<dict><key>CFBundleURLName</key><string>LANpad</string><key>CFBundleURLSchemes</key><array><string>lanpad</string></array></dict>"])
    
    # 3. Convert to XML format (defaults often saves as binary)
    subprocess.run(["plutil", "-convert", "xml1", PLIST_PATH])
    
    # 4. Force Launch Services to re-register
    ls_register = "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"
    subprocess.run([ls_register, "-f", APP_PATH])
    
    print("✅ Injected Protocol Handler into LANpadBridge.app")
    print("✅ Force-registered with macOS Launch Services")

if __name__ == "__main__":
    fix_plist()

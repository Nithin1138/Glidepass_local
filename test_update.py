import sys
import tkinter as tk
from launcher import LANpadLauncher

def run_test():
    print("Starting LANpad Update Tester...")
    root = tk.Tk()
    
    # This data mocks what normally comes from version.json
    # We point to the actual latest files just to test the download mechanics
    mock_update_data = {
        "version": "99.9.9",
        "windows_url": "http://localhost:3000/downloads/LANpad_Windows.zip",
        "mac_url": "http://localhost:3000/downloads/LANpad_macOS.dmg"
    }
    
    print("Initializing Launcher GUI...")
    app = LANpadLauncher(root)
    
    # We trigger the prompt after 1 second
    print("Triggering update prompt in 1 second...")
    root.after(1000, lambda: app.prompt_update(mock_update_data["version"], mock_update_data))
    
    root.mainloop()

if __name__ == "__main__":
    run_test()

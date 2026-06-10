# 🔐 LANpad: Private Project Blueprint

This document is for internal reference. It outlines the core architecture, technical challenges, and logic flows of LANpad.

---

## 🧠 Core Concept
The goal of LANpad is to solve the "Mobile-to-Desktop Text Gap." Instead of using cloud-based notes or messaging apps to transfer snippets, LANpad uses a local FastAPI server to act as a bridge, allowing a mobile browser to control system-level events (typing/pasting) on a Mac/Windows machine.

## 🏗️ Technical Architecture

### 1. The Backend (FastAPI + Uvicorn)
The heart of the project is `app.py`.
- **Async Polling**: Uses a long-polling mechanism (`/poll_paste`) to allow the mobile client to stay updated without heavy overhead.
- **System Injection**:
    - **macOS**: Uses `osascript` (AppleScript) for reliable system-level pasting because it's more robust than standard clipboard libraries in some environments.
    - **Windows**: Uses `pyautogui` for hotkey simulation (`Ctrl+V`).
- **Network Discovery**: Automatically detects the local IP to generate the mobile access URL and QR code.

### 2. The Bridge (Custom Protocol Handler)
To allow the Chrome Extension to "launch" a local Python script (which is usually blocked for security), we implemented a custom macOS protocol: `lanpad://`.
- `create_starter_app.py` creates a tiny macOS `.app` bundle.
- This bundle is registered with the system to handle `lanpad://` links.
- When the extension "opens" that link, macOS launches the starter app, which then boots the Python server.

### 3. The Typing Engine
The `perform_typing` function in `app.py` is designed to bypass "Anti-Paste" protections on certain websites.
- **WPM Logic**: Converts Words Per Minute to a typing interval with a 20% random variance to simulate human behavior.
- **IDE Awareness**: Detects line breaks and attempts to clear auto-indentation (Command+Left -> Shift+Command+Right -> Backspace) to prevent the "staircase effect" when typing code.

### 4. Live Sync Diffing
The sync mode doesn't just "paste" everything. It calculates the difference between the last known text and the new text:
- **Append**: If the new text starts with the old text, it only types the new characters.
- **Backspace**: If the old text starts with the new text, it presses backspace for the missing count.
- **Reset**: If the text changes completely in the middle, it stops syncing to avoid massive backspacing.

## 🛠️ Build & Deployment
- **Bundling**: Uses `PyInstaller` with `--onefile` and `--add-data` to package the `templates/` folder.
- **Cross-Platform**: The code is gated with `platform.system()` checks to switch between `Darwin` (Mac) and `Windows` logic.

## 🚀 Future Roadmap
- [ ] **Android/iOS Native Apps**: Move beyond the mobile browser for better clipboard access.
- [ ] **End-to-End Encryption**: Even though it's local, adding a PIN-based handshake would enhance security.
- [ ] **Multi-Device Support**: Allow one mobile device to control multiple laptops in the same network.

---
*Property of Nithin. Confidential.*

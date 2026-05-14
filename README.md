# 🚀 GlidePass

GlidePass is a powerful cross-device clipboard and text injection tool. It allows you to seamlessly send text from your mobile device directly into your laptop's active window, supporting realistic typing, instant pasting, and live synchronization.

---

## 🛠️ One-Time Setup (First Use Only)

Follow these steps to get everything running on your Mac:

### 1. Install Dependencies
Ensure you have Python 3 installed, then run the following in your terminal:
```bash
pip install fastapi uvicorn pyautogui pyperclip httpx
```

### 2. Register the Backend Launcher
GlidePass uses a custom macOS protocol (`glidepass://`) to start the server directly from Chrome. Run this script to create and register the launcher app:
```bash
python3 create_starter_app.py
```
*This will create `GlidePassStarter.app` in your project folder.*

### 3. Grant macOS Permissions
Since GlidePass types for you, macOS requires security permissions:
1. Go to **System Settings > Privacy & Security > Accessibility**.
2. Add and enable your **Terminal** (and **Chrome** if needed).
3. (Optional) Also enable **Screen Recording** if you face issues with `pyautogui`.

### 4. Install the Chrome Extension
1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select the `extension` folder in this repository.

---

## 🚀 How to Use

### 1. Start the Backend
Open the GlidePass extension in Chrome and click **START BACKEND SERVER**. 
* Chrome will ask: "Open GlidePassStarter?" — Click **Open**.
* The status dot will turn **Green** 🟢 once the server is ready.

### 2. Connect Your Mobile Device
* Once the server is online, a **QR Code** will appear in the extension.
* Scan it with your phone to open the mobile controller interface.

### 3. Dispatch Text
On your mobile device, type or paste text and choose a mode:
* **FLASH (Default)**: Instant Command+V paste.
* **INJECT**: Cleans the text (removes extra spaces/newlines) and pastes it.
* **TYPE**: Simulates realistic human typing at a configurable WPM.
* **LIVE SYNC**: As you type on mobile, the text appears live on your laptop.

---

## 🔍 Troubleshooting

### Server won't start?
Check the `starter_log.txt` file in the project directory. It captures all errors during the startup process.

### Permission Popups
If you see a "Terminal wants to control this computer" message, click **Allow**. This is required for the text injection to work.

### Architecture Errors
If you are on an Apple Silicon (M1/M2/M3) Mac, ensure you ran the latest `create_starter_app.py`, which is optimized to prevent Rosetta compatibility issues.

---

## 🛡️ Security
GlidePass runs entirely on your local network. Your data never leaves your home Wi-Fi.
# Glidepass_local

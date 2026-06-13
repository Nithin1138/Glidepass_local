# 🚀 LANpad (GlidePass)

LANpad (also known as GlidePass) is a powerful, zero-configuration cross-device productivity tool that bridges the gap between your mobile device and your computer. It allows you to use your phone as a remote clipboard, a code repository viewer, and a "virtual keyboard" for your computer. 

Built specifically to help students and developers manage code snippets and work efficiently under strict local network conditions.

---

## ✨ Key Features

*   ⌨️ **Smart Type Mode (Paste-Block Bypass)**: Simulate real-time physical keyboard typing at varying speeds to safely inject text/code into platforms that disable standard clipboards or paste shortcuts (e.g., HackerRank, safe-lock browsers).
*   📲 **Zero-Config Mobile Portal**: Scan a dynamically generated local QR code to sync your phone and laptop instantly over campus Wi-Fi (even through AP isolation firewalls).
*   📚 **Integrated VIT Code Bank**: Built-in repository viewer on the mobile dashboard allowing users to search, view, and paste contributed codes for active sessions instantly.
*   📊 **Real-time Synchronization**: Transfer clipboard contents bidirectionally between your phone and laptop in under 50ms.
*   🔒 **Secure & Local-First**: Operates primarily over your local network. Connections are direct, fast, and keep your data private.

---

## 🛠️ Architecture Overview

The system consists of three main components:
1.  **Desktop Client (Tkinter GUI & Uvicorn Backend)**: Runs locally on the user's laptop to simulate keystroke injection and serve the local connection portals.
2.  **Next.js Web App (`website-v2`)**: The central landing page, admin manager dashboard, contributor portal, and host for versioning/templates.
3.  **Dynamic Mobile templates (`templates/vitcodes.html`)**: Interactive mobile portal templates pushed to clients to render tables, code snippets, and sync controllers.

---

## 🚀 Getting Started (Users)

### 1. Launch the Desktop App
*   **macOS**: Open the `LANpad.app` bundle or build the DMG.
*   **Windows**: Run the compiled `LANpad.exe`.

### 2. Connect Your Mobile Device
*   On startup, the desktop app will show a dashboard containing a **QR Code**.
*   Scan the QR code with your phone (both devices must be on the same local network/Wi-Fi).
*   Select your session/exam, search for code snippets, or use the input box to send custom text.

---

## 🧑‍💻 Development Setup (Engineers)

### Prerequisites
*   Python 3.8+ (macOS users need the `certifi` package for secure updater checks).
*   Node.js v18+ & npm (for editing the web interface).

### Running the Python Desktop Client Locally
1.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
2.  Launch the app:
    *   **GUI / Dashboard Mode**:
        ```bash
        python3 main.py --gui
        ```
    *   **Menubar Mode** (runs in background with an status bar icon):
        ```bash
        python3 main.py
        ```

### Running the Next.js Web App
1.  Navigate to the web directory:
    ```bash
    cd website-v2
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Run the local development server:
    ```bash
    npm run dev
    ```

---

## 🏗️ Production Builds

### Building the Windows Executable (`.exe`)
Run the helper batch script from a Windows terminal:
```cmd
build_win.bat
```
This packages the app into a single standalone binary inside `dist/LANpad.exe` using PyInstaller. Detailed instructions can be found in the [Windows Build Guide](file:///Users/nithin/Projects/GlidePass/WINDOWS_BUILD.md).

### Building the macOS Application (`.app` / `.dmg`)
Run the builder script:
```bash
./build_mac.sh
```
This generates a portable Disk Image (`LANpad_Installer.dmg`) in your root directory.

---

## 🤝 Contributing & Admin Controls

Administrators can manage active exam sessions, telemetry, and contributor details at the `/admin` portal of the web application. 

Top contributors are rewarded with premium features and free passes for helping maintain the repository code libraries. If you want to contribute, log in to the web interface and click **Contributors**.

---
*Created with ❤️ for seamless productivity.*

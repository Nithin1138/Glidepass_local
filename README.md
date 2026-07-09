# LANpad (GlidePass)

LANpad, also known as GlidePass, is a local-first desktop app that turns your phone into a powerful input and resource-sharing companion for your Mac or Windows machine. It is designed for fast, private, and low-friction transfer of text, snippets, and shared resources between devices on the same local network.

The product now combines two core experiences:
- a local desktop app for instant input and clipboard-style workflows
- a web-based resource ecosystem for discovering, publishing, and sending useful snippets and links into the app

---

## What LANpad does

LANpad helps you:
- send text from your phone to your computer instantly
- use your phone as a remote keyboard or clipboard
- enter text into console prompts or remote terminal environments where standard clipboard copy/paste is unsupported
- browse and share reusable resources such as code snippets, notes, links, and templates
- keep the core experience local and private without relying on cloud transfer for everyday use

---

## Core features

### 1. Local desktop app
- runs locally on macOS or Windows
- opens a lightweight local server on port 8000
- pairs with your phone through a QR code and local network connection
- supports multiple input modes for different workflows

### 2. Input modes
- Flash / Paste: fast clipboard-style transfer
- Type: typing simulation for terminal environments or consoles with input restrictions
- Inject: code-friendly injection with cleanup for formatting issues
- Live Sync: real-time text streaming for longer inputs

### 3. Resource sharing
- browse community resources from the web experience
- publish resources such as code snippets, links, notes, and templates
- send a selected resource directly into the local app for instant use on your desktop
- support for resource discovery, hubs, categories, and analytics in the website experience

### 4. Privacy-first design
- the main app is built around local network usage
- data is handled locally and does not depend on cloud transfer for the core desktop workflow
- secure session handling and local-only access are central to the experience

---

## Architecture overview

The project is made of three main parts:

1. Desktop app
   - Python-based local app with FastAPI/Uvicorn backend
   - desktop UI entry points through the main launcher and app bootstrap
   - keyboard and clipboard injection logic for input delivery

2. Mobile/web interface
   - web UI served by the local app for mobile pairing and interaction
   - QR-based connection flow for quick setup
   - resource browsing and sharing entry points

3. Website resource platform
   - Next.js web app under the website-v2 folder
   - supports landing pages, resource discovery, publishing, hubs, and analytics
   - connects with the desktop app so shared resources can be sent directly into LANpad

---

## Getting started

### Run the desktop app locally

#### macOS / Linux
```bash
python3 main.py --gui
```

#### Menubar / background mode
```bash
python3 main.py
```

The app will start a local server and display a QR-based connection page for your phone or browser.

### Run the website locally

```bash
cd website-v2
npm install
npm run dev
```

Then open:
- http://localhost:3000 for the website
- http://localhost:8000 for the local app interface

---

## Development setup

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm

### Install Python dependencies
```bash
pip install -r requirements.txt
```

### Run the desktop app
```bash
python3 main.py --gui
```

### Run the web app
```bash
cd website-v2
npm install
npm run dev
```

---

## Build and packaging

### Windows build
```cmd
build_win.bat
```

### macOS build
```bash
./build_mac.sh
```

This produces packaged desktop builds for distribution.

---

## Current status

LANpad is now positioned as a local-first productivity tool with:
- desktop app support for Mac and Windows
- QR-based local pairing
- clipboard and typing-based input workflows
- a resource-sharing system that connects the website and the local desktop app

It is best described as a hybrid of:
- a local mobile-to-desktop transfer tool
- a snippet/resource sharing platform
- a private productivity bridge for developers, students, and power users

---

## Project focus

The current direction of the project is to make LANpad feel like:
- fast and simple for everyday text transfer
- useful for developers working with code and terminal workflows
- practical for sharing helpful resources without forcing users into a cloud-first experience

---

## Notes

The core app remains local-first, while the website experience adds discovery, publishing, and resource management capabilities that extend the product beyond simple input transfer.

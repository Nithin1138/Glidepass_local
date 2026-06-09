# 🪟 GlidePass – Building the Windows Version

> **Audience:** Nithin (developer) and anyone who wants to ship GlidePass
> as a Windows `.exe` to friends, customers, or themselves on a PC.

This document is the **end-to-end playbook** for turning the GlidePass
codebase – originally macOS-only – into a working Windows
`GlidePass.exe`.  Read it once top-to-bottom before you start, then
keep it open in a second tab while you build.

---

## 📑 Table of Contents

1. [Architecture overview](#1-architecture-overview)
2. [What changed in the code](#2-what-changed-in-the-code)
3. [Three possible build strategies](#3-three-possible-build-strategies)
4. [Strategy A – build on your Mac (recommended)](#4-strategy-a--build-on-your-mac-recommended)
5. [Strategy B – have your friend build on Windows](#5-strategy-b--have-your-friend-build-on-windows)
6. [Strategy C – Hybrid: code on Mac, run on Windows](#6-strategy-c--hybrid-code-on-mac-run-on-windows)
7. [Running GlidePass on Windows](#7-running-glidepass-on-windows)
8. [Windows-specific quirks & gotchas](#8-windows-specific-quirks--gotchas)
9. [Distribution checklist](#9-distribution-checklist)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Architecture overview

GlidePass is a **client-server** app:

```
┌─────────────────┐                ┌──────────────────────┐
│  📱 Mobile      │   HTTP/WS      │  💻 Laptop           │
│  Browser        │ ─────────────► │  • FastAPI backend   │
│  (any device)   │  ◄─────────────│  • Tkinter dashboard │
│                 │                │  • System tray icon  │
└─────────────────┘                │  • Keyboard inject   │
                                   └──────────────────────┘
                                              │
                                              │ glidepass:// (URL scheme)
                                              ▼
                                   ┌──────────────────────┐
                                   │  🧩 Chrome extension │
                                   │  (talks to backend   │
                                   │   via the host)      │
                                   └──────────────────────┘
```

The backend (`app.py`) is **100% cross-platform Python** – it runs on
any OS that has Python 3.9+.  The pieces that needed work to support
Windows were:

| Component               | macOS                              | Windows                                                                                  |
|-------------------------|------------------------------------|------------------------------------------------------------------------------------------|
| **System tray icon**    | `rumps` (Cocoa `NSStatusItem`)     | `pystray` (Win32 notification area)                                                       |
| **Keyboard injection**  | `pyautogui` + `pbcopy`/`osascript` | `pyautogui` + `pyperclip` (which shells out to `clip.exe`)                               |
| **URL scheme handler**  | `GlidePassStarter.app` (Launch Services) | `GlidePassStarter.bat` + `HKCU\Software\Classes\glidepass` registry keys             |
| **Native messaging host** | `glidepass_bridge.sh` (bash)    | `native_host_wrapper.bat` (CMD)                                                           |
| **Build artifact**      | `GlidePass.app` (PyInstaller BUNDLE) | `GlidePass.exe` + `dist/GlidePass/` folder of dependencies (PyInstaller COLLECT)         |
| **Per-user data dir**   | `~/.glidepass/`                    | `%LOCALAPPDATA%\GlidePass\`                                                              |

All those deltas are hidden behind a single helper module:
[`platform_utils.py`](./platform_utils.py).  Every other file
imports `is_mac()`, `is_windows()`, `cmd_key()`, and `user_data_dir()`
from there – so adding Linux support later would be a 50-line change
in one file.

---

## 2. What changed in the code

This is the diff summary, so you can audit it before building:

| File                              | Change                                                                                                                                              |
|-----------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `platform_utils.py` (NEW)         | Single source of truth for OS detection, `resource_path()`, and per-user data dir.                                                                 |
| `app.py`                          | Uses `platform_utils`.  `pyautogui` is now imported **lazily** inside endpoints.  New `_set_clipboard()` / `_safe_pyautogui()` helpers.  `open_terminal` opens CMD on Windows. |
| `launcher.py`                     | Already cross-platform (Tkinter + guarded AppKit import).  Uses `platform_utils.resource_path`.                                                   |
| `menubar_handler.py`              | **Refactored** – the `rumps` import is now wrapped in `if is_mac():` blocks.  On Windows it builds a `pystray.Menu` with identical item names.    |
| `register_bridge.py`              | **Cross-platform** – writes native-messaging JSON to all Chromium user-data folders on both macOS and Windows, plus the Windows Chrome registry. |
| `native_host_wrapper.bat` (NEW)   | Windows wrapper for the native-messaging host (Chromium needs an `.exe`/`.bat` to launch).                                                          |
| `GlidePassStarter.bat` (NEW)      | Generated by `create_starter_app_windows.py`; launched when the user opens `glidepass://…`.                                                        |
| `create_starter_app_windows.py` (NEW) | Writes `GlidePassStarter.bat` and the `HKCU\Software\Classes\glidepass` registry hive (no admin needed).                                       |
| `GlidePass_win.spec` (NEW)        | PyInstaller spec for Windows (no `BUNDLE`, `.ico` icon, `pystray` instead of `rumps`).                                                             |
| `build_win.bat`                   | End-to-end build script – checks Python, installs deps, generates icon, registers URL scheme, runs PyInstaller.                                     |

The macOS code paths are **unchanged** – all the new code lives in
`else:` branches or behind `if is_mac():` guards.

---

## 3. Three possible build strategies

You have three realistic options for actually producing a
`GlidePass.exe`:

| Strategy | Where you build | How easy | What you ship | Pros | Cons |
|----------|-----------------|----------|---------------|------|------|
| **A. Build on your Mac**              | Your Mac                            | ⭐⭐ (medium)         | A pre-built `GlidePass.exe` you zip & send | Friend clicks one .exe and it works.  No Python on Windows. | Cross-compile PyInstaller is unsupported → you need a Windows VM (Parallels, UTM, VirtualBox) **or** a cloud Windows instance. |
| **B. Build on your friend's Windows** | Friend's PC                         | ⭐ (easiest)          | Source code (or just the scripts)        | No VM needed, no cross-compilation.                  | Friend needs Python + ~5 minutes of setup.         |
| **C. Hybrid**                         | Code on Mac, test in a VM, ship the resulting `dist/GlidePass/` | ⭐⭐ (medium) | The unzipped `dist/GlidePass/` folder | Same as A but lets you iterate on the Mac and only spin up the VM for the final build. | Requires a Windows VM at least once.               |

👉 **Recommendation:** go with **Strategy A** if you have any kind of
Windows VM (Parallels is best; UTM on Apple Silicon is free).  Use
**Strategy B** for one-off friend tests.  Use **Strategy C** if you
plan to ship Windows builds regularly.

---

## 4. Strategy A – build on your Mac (recommended)

### 4.1  Set up a Windows VM

The simplest path is to use a free Windows VM:

1. **Apple Silicon (M1/M2/M3):** Download [UTM](https://mac.getutm.app)
   (free) and grab a Windows 11 ARM64 ISO from
   [microsoft.com](https://www.microsoft.com/software-download/windows11).
2. **Intel Mac:** Use VirtualBox (free) or Parallels (paid, faster).
3. Inside the VM, install **Python 3.11+** (64-bit) from
   [python.org](https://www.python.org/downloads/windows/).  Make
   sure to tick **"Add Python to PATH"** at the install screen.
4. Inside the VM, install **Git for Windows** so you can clone the
   GlidePass repo.

### 4.2  Get the code into the VM

The easiest way is to share a folder between macOS and the VM
(UTM/Parallels both have a "Shared Folder" option).  Alternatively:

```cmd
git clone https://github.com/Nithin1138/Glidepass_local.git
cd Glidepass_local
```

### 4.3  Build

Inside the VM, in the project folder:

```cmd
build_win.bat
```

That's it.  The script will:

1. Verify Python is installed.
2. Install all required libraries (`fastapi`, `uvicorn`, `pyautogui`,
   `pyperclip`, `pystray`, `Pillow`, `pyinstaller`, `requests`,
   `httpx`).
3. Generate `GlidePass.ico` from `logo.png` if missing.
4. Run `create_starter_app_windows.py` to register `glidepass://`.
5. Clean previous `build/` and `dist/` folders.
6. Run `pyinstaller --clean --noconfirm GlidePass_win.spec`.
7. Print "BUILD SUCCESSFUL!" with the path to the `.exe`.

### 4.4  Grab the artifact

The whole app lives in:

```
dist\
  └─ GlidePass\
       ├─ GlidePass.exe           ← the launcher (double-click this)
       ├─ python311.dll
       ├─ _internal\              ← Python runtime + every dep
       ├─ templates\              ← HTML pages served by the backend
       ├─ logo.png
       ├─ menubar_icon.png
       └─ GlidePass.ico
```

**Important:** you must zip the **entire** `dist\GlidePass\` folder,
not just the `.exe` – the `.exe` is a tiny bootloader and the real
code is in `_internal\`.

### 4.5  Smoke-test in the VM before you ship

Before sending it to your friend:

```cmd
cd dist\GlidePass
GlidePass.exe
```

You should see a Tkinter window (the dashboard) and a green/teal tray
icon in the system tray.  Click the tray icon → **Show Dashboard** and
scan the QR code with your phone (on the same Wi-Fi).

---

## 5. Strategy B – have your friend build on Windows

If you'd rather not bother with a VM, just send your friend the
project folder and these instructions:

1. **Install Python 3.11+** from python.org (tick "Add to PATH").
2. **Open Command Prompt** in the project folder (Shift+Right-click
   → "Open PowerShell window here").
3. Run:

   ```cmd
   build_win.bat
   ```

4. When the build finishes, the `.exe` will be at
   `dist\GlidePass\GlidePass.exe`.  Double-click it.

This is the lowest-friction path but it does mean the friend has
Python installed.

---

## 6. Strategy C – Hybrid: code on Mac, run on Windows

Useful when you want to iterate on the code on your Mac (where you
have rumps, the nice Mac dock icon, etc.) but you want a quick Windows
smoke test without a full VM.

1. Sync the code to a Windows VM via Git / Syncthing / shared folder.
2. In the VM, run `build_win.bat`.
3. Test, take note of any Windows-specific bugs, fix them on the Mac,
   push, re-sync, re-build.

A **5-minute** loop once you get it set up.

---

## 7. Running GlidePass on Windows

### 7.1  First-run experience

1. Friend unzips `GlidePass.zip` to e.g. `C:\Apps\GlidePass\`.
2. Friend double-clicks `GlidePass.exe`.
3. Windows SmartScreen will warn: **"Windows protected your PC"**.
   Click **More info → Run anyway**.  (We don't sign the binary;
   see [Troubleshooting](#10-troubleshooting) below for how to
   optionally sign it.)
4. The dashboard window opens.  The tray icon (small 🛰️) appears in
   the notification area.
5. Friend installs the Chrome extension (see [README.md](./README.md)).
6. Friend scans the QR with their phone.

### 7.2  Optional: install the URL scheme & native host

To make the Chrome extension's "Start Backend" button work, your
friend should also run **once**:

```cmd
python create_starter_app_windows.py
python register_bridge.py
```

(or just `build_win.bat` – it already runs `create_starter_app_windows.py`).

### 7.3  Firewall

The first time the FastAPI server tries to bind to `0.0.0.0:8000`,
Windows Defender Firewall will pop up a "Windows Defender Firewall
has blocked some features" dialog.  Tick **"Private networks"** and
click **Allow access**.  Without this, your phone won't be able to
reach the laptop over Wi-Fi.

### 7.4  Auto-start on login (optional)

To make GlidePass start every time your friend logs in:

1. Press <kbd>Win</kbd> + <kbd>R</kbd>, type `shell:startup`, hit
   <kbd>Enter</kbd>.
2. Create a shortcut to `GlidePass.exe` in that folder.

---

## 8. Windows-specific quirks & gotchas

### 8.1  `pyautogui` requires a display

`pyautogui` cannot inject keystrokes from a session 0 / service
context.  GlidePass must be running in the **interactive desktop
session** of the user who is typing.  This means:

* ✅  Double-clicking `GlidePass.exe` from Explorer works.
* ✅  A shortcut in the Startup folder works.
* ❌  Running it as a Windows Service does **not** work – there is no
  desktop to inject into.
* ❌  Running it over a Remote Desktop session works **only** if
  you are connected at the *console* session, not a virtual one.

### 8.2  The "Press Ctrl+V" path differs from Mac

On macOS we use `command` + `v`; on Windows we use `ctrl` + `v`.  The
code uses `cmd_key()` from `platform_utils` everywhere, so this is
already handled.  The only place it might bite is if you hard-code
a hotkey in `templates/index.html` – always use the `cmdKey` variable
the JS exposes.

### 8.3  Forward-delete

On macOS, the **Delete** key deletes backward, and `fn+delete`
deletes forward.  `pyautogui.press('delete')` on a Mac therefore
emits backspace.  `app.py`'s typing engine compensates for this with
the `forward_delete_keys = ('fn', 'delete') if IS_MAC else ('delete',)`
trick.  **Don't** change that line.

### 8.4  File paths

The codebase uses `os.path.join` and `pathlib` correctly, but
template paths in `index.html` use forward slashes (which Windows
also accepts).  Avoid hard-coded Unix-only paths.

### 8.5  The `templates` folder

`make_square_icon.py`, `refine_icon.py`, and `make_ico.py` only need
to be run on a machine that has PIL; they don't ship in the binary.
The PyInstaller spec bundles the `templates/` directory.

### 8.6  The `_internal` folder name

PyInstaller on Windows renames `dist/GlidePass/GlidePass/` to
`dist/GlidePass/`.  Inside, it creates an `_internal/` folder for
the Python runtime.  **Don't rename it** – the bootloader looks for
that exact path.

### 8.7  Console window flashes

`GlidePass.exe` is built with `console=False` so no console window
appears.  If you want a console window for debugging, change line
`console=False` in `GlidePass_win.spec` to `console=True`, rebuild,
and you can `print()` freely.

### 8.8  Long path support

If your friend's `C:\` username contains a tilde, or the path to
`GlidePass.exe` is longer than 260 characters, you may hit the
classic "path too long" error.  Either:

* Enable long paths: `gpedit.msc` → Computer Configuration →
  Administrative Templates → System → Filesystem → **Enable Win32
  long paths**.
* Or install to a short path like `C:\GP\`.

---

## 9. Distribution checklist

Before you send `GlidePass.zip` to anyone, verify:

- [ ] `dist\GlidePass\GlidePass.exe` exists and is > 1 MB.
- [ ] `dist\GlidePass\_internal\` folder is present and contains
      `python311.dll`.
- [ ] `dist\GlidePass\templates\` folder contains `index.html`,
      `center.html`, `vitcodes.html`.
- [ ] `dist\GlidePass\logo.png`, `menubar_icon.png`, and
      `GlidePass.ico` are bundled.
- [ ] The whole `dist\GlidePass\` folder is zipped (not just the
      `.exe`).
- [ ] README inside the zip explains "double-click GlidePass.exe,
      click More info → Run anyway, allow the firewall prompt".

Optional polish:

- [ ] Code-sign the binary (otherwise SmartScreen will keep
      complaining).  See
      [signtool](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool).
- [ ] Build an MSI installer with
      [Inno Setup](https://jrsoftware.org/isinfo.php) or
      [Advanced Installer](https://www.advancedinstaller.com/).
- [ ] Host the build on your

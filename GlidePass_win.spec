# -*- mode: python ; coding: utf-8 -*-
#
# GlidePass Windows PyInstaller spec
#
# Build with:
#     pyinstaller --clean --noconfirm GlidePass_win.spec
#
# Output:  dist\GlidePass\GlidePass.exe   (and ~150 MB of dependencies)
#
# Differences from the macOS GlidePass.spec:
#   * No BUNDLE(...) / .app section.
#   * Icon is .ico (not .icns).
#   * console=False  (the GUI launcher is windowless; the backend logs
#     go to glidepass_backend.log).
#   * No macOS-only hiddenimports (rumps, AppKit, etc.) – pystray is
#     added instead.
#   * `templates` is included in the bundle.
# -----------------------------------------------------------------------------

block_cipher = None

a = Analysis(
    ["main.py"],
    pathex=[],
    binaries=[],
    datas=[
        ("templates", "templates"),
        ("logo.png", "."),
        ("logo_final_square.png", "."),
        ("menubar_icon.png", "."),
        ("GlidePass.ico", "."),
    ],
    hiddenimports=[
        # FastAPI / uvicorn
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "fastapi",
        "pydantic",
        # Injection (Windows backend)
        "pyautogui",
        "pyperclip",
        # Tray icon (pystray backend) – rumps is intentionally NOT bundled
        "pystray",
        "PIL",
        "PIL.Image",
        "PIL.ImageTk",
        # Tkinter (built-in to stock Python on Windows)
        "tkinter",
        "tkinter.messagebox",
        # Native host bridge (for the Chrome extension)
        "native_host",
        "menubar_handler",
        "platform_utils",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Strip out macOS-only modules that are accidentally imported
        # transitively.  PyInstaller is usually smart enough but
        # excluding them shaves a few MB off the final binary.
        "rumps",
        "AppKit",
        "Foundation",
        "objc",
        # Optional: strip unused GUI toolkits
        "matplotlib",
        "numpy.tests",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="GlidePass",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,           # GUI app – no flashing console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon="GlidePass.ico",
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="GlidePass",
)

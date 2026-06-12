# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('logo.png', '.'),
        ('logo_final_square.png', '.'),
        ('menubar_icon.png', '.'),
        ('LANpad.ico', '.'),
        ('LANpad.icns', '.')
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'fastapi',
        'pydantic',
        'pyautogui',
        'pyperclip',
        'rumps',
        'pystray',
        'PIL',
        'PIL.Image',
        'menubar_handler',
        'qrcode'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
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
    name='LANpad',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='LANpad.ico' if os.name == 'nt' else 'LANpad.icns'
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='LANpad'
)

app = BUNDLE(
    coll,
    name='LANpad.app',
    icon='LANpad.icns',
    bundle_identifier='com.lanpad.macos',
    info_plist={
        'CFBundleShortVersionString': '1.5.0',
        'CFBundleVersion': '1.5.0',
        'NSHighResolutionCapable': True,
        'CFBundleURLTypes': [
            {
                'CFBundleURLName': 'LANpad Protocol',
                'CFBundleURLSchemes': ['lanpad']
            }
        ],
    },
)

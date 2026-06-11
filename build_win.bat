@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM LANpad Windows Production Build Script
REM
REM This script:
REM   1. Verifies Python is installed.
REM   2. Installs all required libraries.
REM   3. Generates the Windows .ico icon (if missing).
REM   4. Registers the lanpad:// URL protocol (creates LANpadStarter.bat
REM      and writes the HKCU\Software\Classes\lanpad keys).
REM   5. Builds LANpad.exe with PyInstaller.
REM   6. Prints clear next-step instructions.
REM ============================================================================

echo.
echo ============================================================
echo   LANpad Windows Build Script
echo ============================================================
echo.

REM 1. Check Python
echo [1/6] Checking for Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: Python is not installed or not in PATH.
    echo   Please install Python 3.9+ from https://www.python.org/downloads/
    echo   IMPORTANT: Check "Add Python to PATH" during installation.
    pause
    exit /b 1
)
python --version
echo.

REM 2. Install / Upgrade dependencies
echo [2/6] Installing required Python packages...
python -m pip install --upgrade pip
python -m pip install ^
    fastapi ^
    "uvicorn[standard]" ^
    pyautogui ^
    pyperclip ^
    pystray ^
    Pillow ^
    pyinstaller ^
    requests ^
    httpx ^
    qrcode ^
    pynput
if %errorlevel% neq 0 (
    echo   ERROR: pip install failed.  Check your network / proxy.
    pause
    exit /b 1
)
echo.

REM 3. Generate the Windows icon if missing
echo [3/6] Generating Windows icon...
if not exist LANpad.ico (
    python make_ico.py
    if %errorlevel% neq 0 (
        echo   WARNING: make_ico.py failed - using the existing icon if any.
    )
) else (
    echo   LANpad.ico already exists - skipping.
)
echo.

REM 4. Register the lanpad:// URL protocol
echo [4/6] Registering the lanpad:// URL protocol...
python create_starter_app_windows.py
if %errorlevel% neq 0 (
    echo   WARNING: URL-scheme registration failed.  The app will still build
    echo   but the Chrome extension's "Start Backend" button will not work
    echo   until you register the protocol manually.
)
echo.

REM 5. Clean previous builds
echo [5/6] Cleaning old build artifacts...
if exist build rmdir /s /q build
if exist dist  rmdir /s /q dist
echo.

REM 6. Build the .exe
echo [6/6] Building LANpad.exe with PyInstaller...
echo   (this can take 2-5 minutes - it bundles Python + dependencies)
echo.
pyinstaller --clean --noconfirm LANpad_win.spec
if %errorlevel% neq 0 (
    echo.
    echo   BUILD FAILED.  Scroll up for the PyInstaller error message.
    pause
    exit /b 1
)
echo.

REM 7. Verify the build
if exist dist\LANpad\LANpad.exe (
    echo.
    echo ============================================================
    echo   BUILD SUCCESSFUL!
    echo ============================================================
    echo.
    echo   Your Windows app is at:   dist\LANpad\LANpad.exe
    echo.
    echo   To share with your friend:
    echo     1. ZIP the entire   dist\LANpad   folder.
    echo     2. Send the .zip to them.
    echo     3. They unzip it and double-click LANpad.exe.
    echo.
    echo   Optional but recommended:
    echo     - Run   python register_bridge.py   to wire up the
    echo       Chrome extension (writes com.lanpad.launcher.json
    echo       to %%APPDATA%% and the Chrome registry hive).
    echo     - Run   python create_starter_app_windows.py   again
    echo       if you move the app to a new folder.
    echo.
) else (
    echo.
    echo   BUILD FAILED - dist\LANpad\LANpad.exe not found.
    echo.
)

pause

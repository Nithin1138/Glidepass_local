@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM GlidePass Windows Production Build Script
REM
REM This script:
REM   1. Verifies Python is installed.
REM   2. Installs all required libraries.
REM   3. Generates the Windows .ico icon (if missing).
REM   4. Registers the glidepass:// URL protocol (creates GlidePassStarter.bat
REM      and writes the HKCU\Software\Classes\glidepass keys).
REM   5. Builds GlidePass.exe with PyInstaller.
REM   6. Prints clear next-step instructions.
REM ============================================================================

echo.
echo ============================================================
echo   GlidePass Windows Build Script
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
    qrcode
if %errorlevel% neq 0 (
    echo   ERROR: pip install failed.  Check your network / proxy.
    pause
    exit /b 1
)
echo.

REM 3. Generate the Windows icon if missing
echo [3/6] Generating Windows icon...
if not exist GlidePass.ico (
    python make_ico.py
    if %errorlevel% neq 0 (
        echo   WARNING: make_ico.py failed - using the existing icon if any.
    )
) else (
    echo   GlidePass.ico already exists - skipping.
)
echo.

REM 4. Register the glidepass:// URL protocol
echo [4/6] Registering the glidepass:// URL protocol...
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
echo [6/6] Building GlidePass.exe with PyInstaller...
echo   (this can take 2-5 minutes - it bundles Python + dependencies)
echo.
pyinstaller --clean --noconfirm GlidePass_win.spec
if %errorlevel% neq 0 (
    echo.
    echo   BUILD FAILED.  Scroll up for the PyInstaller error message.
    pause
    exit /b 1
)
echo.

REM 7. Verify the build
if exist dist\GlidePass\GlidePass.exe (
    echo.
    echo ============================================================
    echo   BUILD SUCCESSFUL!
    echo ============================================================
    echo.
    echo   Your Windows app is at:   dist\GlidePass\GlidePass.exe
    echo.
    echo   To share with your friend:
    echo     1. ZIP the entire   dist\GlidePass   folder.
    echo     2. Send the .zip to them.
    echo     3. They unzip it and double-click GlidePass.exe.
    echo.
    echo   Optional but recommended:
    echo     - Run   python register_bridge.py   to wire up the
    echo       Chrome extension (writes com.glidepass.launcher.json
    echo       to %%APPDATA%% and the Chrome registry hive).
    echo     - Run   python create_starter_app_windows.py   again
    echo       if you move the app to a new folder.
    echo.
) else (
    echo.
    echo   BUILD FAILED - dist\GlidePass\GlidePass.exe not found.
    echo.
)

pause

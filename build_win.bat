@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting GlidePass Windows Production Build...

:: 1. Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Python is not installed or not in PATH.
    echo Please install Python 3.9+ from python.org
    pause
    exit /b
)

:: 2. Install/Update Dependencies
echo 📦 Installing required libraries...
pip install --upgrade pip
pip install fastapi uvicorn pyautogui pyperclip pystray Pillow pyinstaller

:: 3. Generate Windows Icon if missing
if not exist GlidePass.ico (
    echo 🎨 Generating Windows icon...
    python make_ico.py
)

:: 4. Clean previous builds
echo 🧹 Cleaning old build files...
if exist build rd /s /q build
if exist dist rd /s /q dist

:: 5. Run PyInstaller
echo 🔨 Bundling application (this may take a few minutes)...
pyinstaller --clean --noconfirm GlidePass.spec

:: 6. Check result
if exist dist\GlidePass\GlidePass.exe (
    echo.
    echo ✅ BUILD SUCCESSFUL!
    echo ✨ Your Windows App is ready at: dist\GlidePass\
    echo 👉 Share the ENTIRE "dist\GlidePass" folder with your friend.
    echo.
) else (
    echo.
    echo ❌ Build failed. Please check the error messages above.
    echo.
)

pause

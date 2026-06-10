#!/bin/bash

# LANpad Production Build Script
echo "🚀 Starting LANpad Production Build..."

# 1. Clean previous builds
echo "🧹 Cleaning old build files..."
rm -rf build dist LANpad.app

# 2. Run PyInstaller
echo "📦 Bundling application (this may take a minute)..."
pyinstaller --clean --noconfirm LANpad.spec

# 3. Move the app to the root for easy access
echo "🔍 Searching for built app in dist..."
ls -la dist/

if [ -d "dist/LANpad.app" ]; then
    echo "✅ Found LANpad.app"
    mv dist/LANpad.app ./
    echo "✨ LANpad.app is now available in your project root."
elif [ -d "dist/LANpad" ]; then
    echo "⚠️ Found LANpad folder, checking if it's a bundle..."
    if [ -d "dist/LANpad/Contents" ]; then
        echo "📦 It is a bundle! Renaming to LANpad.app"
        mv dist/LANpad ./LANpad.app
    else
        echo "❌ dist/LANpad is not a macOS bundle. BUNDLE step might have failed."
    fi
else
    echo "❌ Build failed. LANpad.app not found in dist/."
    exit 1
fi

# 4. Optional: Open the folder
open .

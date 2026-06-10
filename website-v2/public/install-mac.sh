#!/bin/bash
echo "🚀 Installing LANpad for macOS..."

# Production download URL for the packaged DMG installer
DOWNLOAD_URL="https://lanpad.vercel.app/downloads/LANpad_macOS.dmg"

echo "📥 Downloading LANpad DMG..."
curl -sSL -o /tmp/LANpad_macOS.dmg "$DOWNLOAD_URL"

echo "💿 Mounting DMG..."
mkdir -p /tmp/LANpad_Mount
hdiutil attach /tmp/LANpad_macOS.dmg -mountpoint /tmp/LANpad_Mount -nobrowse -quiet

echo "📦 Copying LANpad.app to Applications folder..."
cp -R /tmp/LANpad_Mount/LANpad.app /Applications/

echo "⏏ Unmounting DMG..."
hdiutil detach /tmp/LANpad_Mount -quiet

echo "🔓 Removing Apple security restrictions..."
xattr -cr /Applications/LANpad.app

echo "🧹 Cleaning up..."
rm -f /tmp/LANpad_macOS.dmg
rm -rf /tmp/LANpad_Mount

echo "✅ Installed successfully! You can now launch LANpad from your Applications folder."

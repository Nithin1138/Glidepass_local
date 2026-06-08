#!/bin/bash
echo "🚀 Installing GlidePass for macOS..."

# Production download URL for the packaged DMG installer
DOWNLOAD_URL="https://glidepass.vercel.app/downloads/GlidePass_macOS.dmg"

echo "📥 Downloading GlidePass DMG..."
curl -sSL -o /tmp/GlidePass_macOS.dmg "$DOWNLOAD_URL"

echo "💿 Mounting DMG..."
mkdir -p /tmp/GlidePass_Mount
hdiutil attach /tmp/GlidePass_macOS.dmg -mountpoint /tmp/GlidePass_Mount -nobrowse -quiet

echo "📦 Copying GlidePass.app to Applications folder..."
cp -R /tmp/GlidePass_Mount/GlidePass.app /Applications/

echo "⏏ Unmounting DMG..."
hdiutil detach /tmp/GlidePass_Mount -quiet

echo "🔓 Removing Apple security restrictions..."
xattr -cr /Applications/GlidePass.app

echo "🧹 Cleaning up..."
rm -f /tmp/GlidePass_macOS.dmg
rm -rf /tmp/GlidePass_Mount

echo "✅ Installed successfully! You can now launch GlidePass from your Applications folder."

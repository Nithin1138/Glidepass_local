#!/bin/bash
echo "🚀 Installing GlidePass for macOS..."

# Determine download URL based on where the script is hosted
# In production, this should be the absolute URL to your zip file
DOWNLOAD_URL="http://localhost:3000/downloads/GlidePass_macOS.zip"

echo "📥 Downloading GlidePass..."
curl -sSL -o /tmp/GlidePass_macOS.zip "$DOWNLOAD_URL"

echo "📦 Extracting app to Applications folder..."
unzip -q -o /tmp/GlidePass_macOS.zip -d /Applications/

echo "🔓 Removing Apple security restrictions..."
xattr -cr /Applications/GlidePass.app

echo "🧹 Cleaning up..."
rm /tmp/GlidePass_macOS.zip

echo "✅ Installed successfully! You can now launch GlidePass from your Applications folder."

#!/bin/bash
echo "🚀 Installing LANpad for macOS..."
echo ""
echo "⚠️  LEGAL DISCLAIMER:"
echo "LANpad is provided AS IS without warranty of any kind."
echo "The developers, contributors, and founders assume NO liability or responsibility"
echo "for any misuse of this tool, including academic misconduct, policy violations,"
echo "data security issues, or system disruption."
echo "By continuing, you agree that you use this software at your own risk."
echo ""

# Production download URL for the packaged DMG installer (logs telemetry)
DOWNLOAD_URL="https://lanpad.vercel.app/api/download?platform=mac"

echo "📥 Downloading LANpad DMG..."
curl -L -# -o /tmp/LANpad_macOS.dmg "$DOWNLOAD_URL"

echo "💿 Mounting DMG..."
mkdir -p /tmp/LANpad_Mount
hdiutil attach /tmp/LANpad_macOS.dmg -mountpoint /tmp/LANpad_Mount -nobrowse -quiet

echo "📦 Copying LANpad.app to Applications folder..."
if cp -R /tmp/LANpad_Mount/LANpad.app /Applications/ 2>/dev/null; then
    echo "⏏ Unmounting DMG..."
    hdiutil detach /tmp/LANpad_Mount -quiet

    echo "🔓 Removing Apple security restrictions..."
    xattr -cr /Applications/LANpad.app 2>/dev/null

    echo "🧹 Cleaning up..."
    rm -f /tmp/LANpad_macOS.dmg
    rm -rf /tmp/LANpad_Mount

    echo "✅ Installed successfully! You can now launch LANpad from your Applications folder."
else
    echo "⏏ Unmounting DMG..."
    hdiutil detach /tmp/LANpad_Mount -quiet

    echo "🧹 Cleaning up..."
    rm -f /tmp/LANpad_macOS.dmg
    rm -rf /tmp/LANpad_Mount

    echo "❌ Installation failed: LANpad.app was not found in the installer package."
    exit 1
fi


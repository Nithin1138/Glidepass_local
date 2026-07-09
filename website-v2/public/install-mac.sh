#!/bin/bash
echo "🚀 Installing LANpad for macOS..."
echo ""
echo "⚠️  SECURITY NOTICE & TRUST DISCLOSURE:"
echo "This installer executes a remote script to download and install LANpad."
echo "While this script is provided by the LANpad project for convenience,"
echo "running scripts directly from the internet is a potential security risk."
echo "You should always review the source code of this script at:"
echo "https://github.com/Nithin1138/Glidepass_local/blob/main/website-v2/public/install-mac.sh"
echo "before executing it."
echo ""
echo "⚠️  LEGAL DISCLAIMER:"
echo "LANpad is provided AS IS without warranty of any kind."
echo "The developers, contributors, and founders assume NO liability or responsibility"
echo "for any misuse of this tool, including academic misconduct, policy violations,"
echo "data security issues, or system disruption."
echo "By continuing, you agree that you use this software at your own risk."
echo ""

# Production download URL for the packaged DMG installer (logs telemetry)
DOWNLOAD_URL="https://lanpad.app/api/download?platform=mac"

echo "📥 Downloading LANpad DMG..."
curl -L -# -o /tmp/LANpad_macOS.dmg "$DOWNLOAD_URL"

echo "💿 Mounting DMG..."
MOUNT_OUT=$(hdiutil attach /tmp/LANpad_macOS.dmg -nobrowse)
MOUNT_DIR=$(echo "$MOUNT_OUT" | grep -o '/Volumes/.*')

if [ -z "$MOUNT_DIR" ]; then
    if [ -d "/Volumes/LANpad Installer" ]; then
        MOUNT_DIR="/Volumes/LANpad Installer"
    else
        echo "❌ Error: Could not mount DMG."
        rm -f /tmp/LANpad_macOS.dmg
        exit 1
    fi
fi

echo "📦 Copying LANpad.app to Applications folder..."
if cp -R "$MOUNT_DIR/LANpad.app" /Applications/ 2>/dev/null; then
    echo "⏏ Unmounting DMG..."
    hdiutil detach "$MOUNT_DIR" -quiet

    echo "🔓 Removing Apple security restrictions..."
    xattr -cr /Applications/LANpad.app 2>/dev/null

    echo "🧹 Cleaning up..."
    rm -f /tmp/LANpad_macOS.dmg

    echo "✅ Installed successfully! You can now launch LANpad from your Applications folder."
else
    echo "⏏ Unmounting DMG..."
    hdiutil detach "$MOUNT_DIR" -quiet

    echo "🧹 Cleaning up..."
    rm -f /tmp/LANpad_macOS.dmg

    echo "❌ Installation failed: LANpad.app was not found in the installer package."
    exit 1
fi


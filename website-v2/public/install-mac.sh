#!/bin/bash
echo "🚀 Installing LANpad for macOS (v1.3.5)..."
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

TAG_URL="https://github.com/Nithin1138/Glidepass_local/releases/download/v1.3.5/LANpad_macOS.dmg"
LATEST_URL="https://github.com/Nithin1138/Glidepass_local/releases/latest/download/LANpad_macOS.dmg"
FALLBACK_URL="https://lanpad.app/api/download?platform=mac"

echo "📥 Downloading LANpad DMG..."
DOWNLOAD_SUCCESS=false

for URL in "$TAG_URL" "$LATEST_URL" "$FALLBACK_URL"; do
    rm -f /tmp/LANpad_macOS.dmg
    if curl -sL -f -o /tmp/LANpad_macOS.dmg "$URL"; then
        if [ -f /tmp/LANpad_macOS.dmg ]; then
            if grep -q -i "<!DOCTYPE" /tmp/LANpad_macOS.dmg 2>/dev/null || grep -q -i "<html" /tmp/LANpad_macOS.dmg 2>/dev/null; then
                rm -f /tmp/LANpad_macOS.dmg
                echo "⚠️ Download returned an HTML error/block page from $URL. Trying next mirror..."
                continue
            fi
            DOWNLOAD_SUCCESS=true
            break
        fi
    fi
done

if [ "$DOWNLOAD_SUCCESS" = false ] || [ ! -f /tmp/LANpad_macOS.dmg ]; then
    echo "❌ Error: Could not download LANpad macOS DMG."
    echo "Your network proxy or university campus firewall blocked the download."
    echo "Please download LANpad directly from GitHub Releases: https://github.com/Nithin1138/Glidepass_local/releases/tag/v1.3.5"
    exit 1
fi

echo "CD Mounting DMG..."
MOUNT_OUT=$(hdiutil attach /tmp/LANpad_macOS.dmg -nobrowse 2>&1)
MOUNT_DIR=$(echo "$MOUNT_OUT" | grep -o '/Volumes/.*')

if [ -z "$MOUNT_DIR" ]; then
    if [ -d "/Volumes/LANpad Installer" ]; then
        MOUNT_DIR="/Volumes/LANpad Installer"
    elif [ -d "/Volumes/LANpad" ]; then
        MOUNT_DIR="/Volumes/LANpad"
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

#!/bin/bash
# LANpad Installer — Download the latest release and open it
# Usage: curl -fsSL https://raw.githubusercontent.com/Nithin1138/Glidepass_local/checkall/install.sh | bash

set -e

REPO="Nithin1138/Glidepass_local"
API="https://api.github.com/repos/$REPO/releases/latest"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║         LANpad Installer v1          ║"
echo "╚══════════════════════════════════════╝"
echo ""

OS=$(uname -s)
if [ "$OS" = "Darwin" ]; then
    ASSET="GlidePass-macOS.dmg"
elif [ "$OS" = "Linux" ]; then
    echo "❌ Linux is not yet supported. Please download manually from:"
    echo "   https://github.com/$REPO/releases/latest"
    exit 1
else
    echo "❌ This installer runs on macOS only."
    echo "   Windows users: download GlidePass-Windows.exe from:"
    echo "   https://github.com/$REPO/releases/latest"
    exit 1
fi

echo "📡 Fetching latest release..."
DOWNLOAD_URL=$(curl -fsSL "$API" | grep "browser_download_url" | grep "$ASSET" | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
    echo "❌ Could not find the download URL. Please check the releases page:"
    echo "   https://github.com/$REPO/releases/latest"
    exit 1
fi

DEST="$HOME/Downloads/$ASSET"
echo "⬇️  Downloading $ASSET..."
curl -L --progress-bar "$DOWNLOAD_URL" -o "$DEST"

echo ""
echo "✅ Download complete: $DEST"
echo "🚀 Opening installer..."
open "$DEST"
echo ""
echo "Follow the on-screen instructions to install LANpad."
echo "Enjoy! 🎉"

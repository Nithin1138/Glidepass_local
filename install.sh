#!/bin/bash
# ============================================================
#   LANpad Installer for macOS
#   https://github.com/Nithin1138/Glidepass_local
# ============================================================

set -e

REPO="Nithin1138/Glidepass_local"
ASSET="LANpad_Installer.dmg"
DEST="$HOME/Downloads/$ASSET"

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

clear
echo ""
echo -e "${CYAN}${BOLD}"
echo "  ██╗      █████╗ ███╗   ██╗██████╗  █████╗ ██████╗ "
echo "  ██║     ██╔══██╗████╗  ██║██╔══██╗██╔══██╗██╔══██╗"
echo "  ██║     ███████║██╔██╗ ██║██████╔╝███████║██║  ██║"
echo "  ██║     ██╔══██║██║╚██╗██║██╔═══╝ ██╔══██║██║  ██║"
echo "  ███████╗██║  ██║██║ ╚████║██║     ██║  ██║██████╔╝"
echo "  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═════╝ "
echo -e "${NC}"
echo -e "${DIM}  The fast, local keyboard & file bridge for your devices${NC}"
echo ""
echo -e "  ${DIM}────────────────────────────────────────────────────${NC}"
echo ""

# ── Disclaimer ───────────────────────────────────────────────
echo -e "${YELLOW}${BOLD}  ⚠  DISCLAIMER & TERMS${NC}"
echo ""
echo -e "  ${DIM}By installing LANpad, you agree to the following:${NC}"
echo ""
echo -e "  ${DIM}• LANpad runs a local HTTP server on your machine${NC}"
echo -e "  ${DIM}• It may create an outbound tunnel (Cloudflare) for relay mode${NC}"
echo -e "  ${DIM}• No data is stored or sent to external servers by default${NC}"
echo -e "  ${DIM}• Use only on trusted networks${NC}"
echo -e "  ${DIM}• Source code: https://github.com/${REPO}${NC}"
echo ""
echo -e "  ${DIM}────────────────────────────────────────────────────${NC}"
echo ""
read -r -p "  Press [ENTER] to accept and continue, or Ctrl+C to cancel... "
echo ""

# ── System check ─────────────────────────────────────────────
echo -e "  ${CYAN}[1/4]${NC} Checking system..."
OS=$(uname -s)
if [ "$OS" != "Darwin" ]; then
    echo -e "  ${RED}✗ This script is for macOS only.${NC}"
    echo -e "  ${DIM}  Windows users: see install.ps1${NC}"
    exit 1
fi
ARCH=$(uname -m)
echo -e "  ${GREEN}✓ macOS detected${NC} ${DIM}(${ARCH})${NC}"
sleep 0.3

# ── Fetch release info ───────────────────────────────────────
echo ""
echo -e "  ${CYAN}[2/4]${NC} Fetching latest release..."
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
RELEASE_JSON=$(curl -fsSL "$API_URL")
DOWNLOAD_URL=$(echo "$RELEASE_JSON" | grep "browser_download_url" | grep "$ASSET" | cut -d '"' -f 4)
VERSION=$(echo "$RELEASE_JSON" | grep '"tag_name"' | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
    echo -e "  ${RED}✗ Could not find release. Check: https://github.com/${REPO}/releases${NC}"
    exit 1
fi

FILE_SIZE_BYTES=$(echo "$RELEASE_JSON" | grep -A2 "$ASSET" | grep '"size"' | head -1 | grep -o '[0-9]*')
FILE_SIZE_MB=$(echo "scale=1; ${FILE_SIZE_BYTES:-0} / 1048576" | bc 2>/dev/null || echo "?")
echo -e "  ${GREEN}✓ Found version ${BOLD}${VERSION}${NC} ${DIM}(${FILE_SIZE_MB} MB)${NC}"
sleep 0.3

# ── Download ─────────────────────────────────────────────────
echo ""
echo -e "  ${CYAN}[3/4]${NC} Downloading LANpad ${VERSION}..."
echo ""
curl -L --progress-bar "$DOWNLOAD_URL" -o "$DEST"
echo ""

ACTUAL_SIZE=$(du -sh "$DEST" 2>/dev/null | cut -f1)
echo -e "  ${GREEN}✓ Downloaded successfully${NC} ${DIM}(${ACTUAL_SIZE})${NC}"
sleep 0.3

# ── Open installer ───────────────────────────────────────────
echo ""
echo -e "  ${CYAN}[4/4]${NC} Opening installer..."
open "$DEST"
sleep 1

echo ""
echo -e "  ${DIM}────────────────────────────────────────────────────${NC}"
echo ""
echo -e "  ${GREEN}${BOLD}✓ LANpad ${VERSION} is ready to install!${NC}"
echo ""
echo -e "  ${DIM}1. Drag LANpad into Applications${NC}"
echo -e "  ${DIM}2. Open LANpad from your Applications folder${NC}"
echo -e "  ${DIM}3. Scan the QR code with the LANpad mobile app${NC}"
echo ""
echo -e "  ${DIM}Need help? https://github.com/${REPO}/issues${NC}"
echo ""

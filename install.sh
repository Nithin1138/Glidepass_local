#!/bin/bash
# ============================================================
#   LANpad Installer for macOS
#   https://github.com/Nithin1138/Glidepass_local
# ============================================================

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
echo -e "  ${DIM}The fast, local keyboard & file bridge for your devices${NC}"
echo ""
echo -e "  ${DIM}────────────────────────────────────────────────────${NC}"
echo ""

# ── Disclaimer ───────────────────────────────────────────────
echo -e "${YELLOW}${BOLD}  ⚠  DISCLAIMER & TERMS${NC}"
echo ""
echo -e "  ${DIM}By installing LANpad, you agree to the following:${NC}"
echo -e "  ${DIM}  • Runs a local HTTP server on your machine${NC}"
echo -e "  ${DIM}  • May use a Cloudflare tunnel for relay mode${NC}"
echo -e "  ${DIM}  • No data stored externally by default${NC}"
echo -e "  ${DIM}  • Use on trusted networks only${NC}"
echo -e "  ${DIM}  • Source: https://github.com/${REPO}${NC}"
echo ""
echo -e "  ${DIM}────────────────────────────────────────────────────${NC}"
echo ""
read -r -p "  Press [ENTER] to accept and continue, or Ctrl+C to cancel... "
echo ""

# ── System check ─────────────────────────────────────────────
echo -e "  ${CYAN}[1/4]${NC} Checking system..."
if [ "$(uname -s)" != "Darwin" ]; then
    echo -e "  ${RED}✗ This script is for macOS only.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓ macOS detected${NC} ${DIM}($(uname -m))${NC}"

# ── Fetch release info ───────────────────────────────────────
echo ""
echo -e "  ${CYAN}[2/4]${NC} Fetching latest release..."

API_URL="https://api.github.com/repos/${REPO}/releases/latest"
RELEASE_JSON=$(curl -fsSL --connect-timeout 10 "$API_URL")

if [ -z "$RELEASE_JSON" ]; then
    echo -e "  ${RED}✗ Could not reach GitHub API. Check your internet connection.${NC}"
    exit 1
fi

# Use Python3 (always available on macOS) for reliable JSON parsing
DOWNLOAD_URL=$(python3 -c "
import json, sys
data = json.loads(sys.stdin.read())
for a in data.get('assets', []):
    if a['name'] == '${ASSET}':
        print(a['browser_download_url'])
        break
" <<< "$RELEASE_JSON")

VERSION=$(python3 -c "
import json, sys
data = json.loads(sys.stdin.read())
print(data.get('tag_name', 'unknown'))
" <<< "$RELEASE_JSON")

SIZE_MB=$(python3 -c "
import json, sys
data = json.loads(sys.stdin.read())
for a in data.get('assets', []):
    if a['name'] == '${ASSET}':
        print(round(a['size'] / 1048576, 1))
        break
" <<< "$RELEASE_JSON")

if [ -z "$DOWNLOAD_URL" ]; then
    echo -e "  ${RED}✗ Release not yet available. Try: https://github.com/${REPO}/releases${NC}"
    exit 1
fi

echo -e "  ${GREEN}✓ Found ${BOLD}${VERSION}${NC} ${DIM}(${SIZE_MB} MB)${NC}"

# ── Download ─────────────────────────────────────────────────
echo ""
echo -e "  ${CYAN}[3/4]${NC} Downloading LANpad ${VERSION}..."
echo ""
# --location follows redirects, --progress-bar shows live bar
curl --location --progress-bar --output "$DEST" "$DOWNLOAD_URL"

echo ""
echo -e "  ${GREEN}✓ Saved to ${BOLD}~/Downloads/${ASSET}${NC}"

# ── Open installer ───────────────────────────────────────────
echo ""
echo -e "  ${CYAN}[4/4]${NC} Opening installer..."
open "$DEST"

echo ""
echo -e "  ${DIM}────────────────────────────────────────────────────${NC}"
echo ""
echo -e "  ${GREEN}${BOLD}✓ LANpad ${VERSION} is ready!${NC}"
echo ""
echo -e "  ${DIM}1. Drag LANpad into Applications${NC}"
echo -e "  ${DIM}2. Open LANpad from Applications${NC}"
echo -e "  ${DIM}3. Scan the QR code with the LANpad mobile app${NC}"
echo ""
echo -e "  ${DIM}Need help? https://github.com/${REPO}/issues${NC}"
echo ""

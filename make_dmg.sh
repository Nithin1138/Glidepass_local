#!/bin/bash

# GlidePass DMG Creation Script
APP_NAME="GlidePass"
APP_BUNDLE="${APP_NAME}.app"
DMG_NAME="${APP_NAME}_Installer.dmg"
VOL_NAME="${APP_NAME} Installer"
TMP_DMG="tmp.dmg"

echo "💿 Creating DMG for ${APP_NAME}..."

# 1. Check if .app exists
if [ ! -d "$APP_BUNDLE" ]; then
    echo "❌ Error: ${APP_BUNDLE} not found. Run ./build_mac.sh first."
    exit 1
fi

# 2. Cleanup old DMG
rm -f "$DMG_NAME" "$TMP_DMG"

# 3. Create a temporary disk image
echo "📂 Creating temporary disk image..."
hdiutil create -size 500m -fs HFS+ -volname "$VOL_NAME" "$TMP_DMG"

# 4. Mount it
echo "🏔 Mounting image..."
# Use -plist to get structured output and avoid awk issues with spaces
MOUNT_DIR=$(hdiutil attach "$TMP_DMG" | grep "/Volumes/" | sed 's/.*\/Volumes\//\/Volumes\//')

if [ -z "$MOUNT_DIR" ]; then
    echo "❌ Error: Could not mount DMG."
    exit 1
fi

echo "📍 Mount point: $MOUNT_DIR"
sleep 2 # Give it a second to settle

# 5. Copy the app and add a link to /Applications
echo "🚚 Copying files to $MOUNT_DIR..."
# Note: cp -R needs the source to be the bundle
cp -R "$APP_BUNDLE" "$MOUNT_DIR/"
ln -s /Applications "$MOUNT_DIR/Applications"

# 6. Optional: You could add a custom icon or background here if available
# cp logo.png "$MOUNT_DIR/.background.png"

# 7. Unmount
echo "⏏ Unmounting $MOUNT_DIR..."
sync # Flush any pending writes
hdiutil detach "$MOUNT_DIR" || {
    echo "⚠️ Detach failed, trying force..."
    hdiutil detach "$MOUNT_DIR" -force
}

# 8. Convert to compressed, read-only DMG
echo "🗜 Finalizing DMG..."
hdiutil convert "$TMP_DMG" -format UDZO -o "$DMG_NAME"

# 9. Cleanup
rm "$TMP_DMG"

echo "✅ DMG Created: ${DMG_NAME}"
echo "👉 You can now share this file with your friend!"

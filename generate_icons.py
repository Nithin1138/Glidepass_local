import os, sys, shutil, subprocess
try:
    from PIL import Image
except ImportError:
    os.system(f"{sys.executable} -m pip install Pillow --quiet")
    from PIL import Image

SOURCE = "/Users/nithin/Projects/GlidePass/finallogo.png"
BASE   = "/Users/nithin/Projects/GlidePass"

src = Image.open(SOURCE).convert("RGBA")
w, h = src.size
print(f"Source image size: {w}x{h}")

# Sample background color from top-left corner
bg_color = src.getpixel((0, 0))

# Create square master image (1536x1536)
square_size = max(w, h)
square = Image.new("RGBA", (square_size, square_size), bg_color)
x_off = (square_size - w) // 2
y_off = (square_size - h) // 2
square.paste(src, (x_off, y_off), src)

def save_png(px, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    square.copy().resize((px, px), Image.LANCZOS).save(path, "PNG", optimize=True)
    print(f"  ✓ {px}x{px} PNG  →  {path.replace(BASE+'/', '')}")

def save_ico(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    imgs = [square.copy().resize((s,s), Image.LANCZOS).convert("RGBA") for s in [16,32,48,64,128,256]]
    imgs[0].save(path, format="ICO", sizes=[(s,s) for s in [16,32,48,64,128,256]])
    print(f"  ✓ ICO multi-size  →  {path.replace(BASE+'/', '')}")

print("\n[1] Root logos")
save_png(1024, f"{BASE}/logo.png")
save_png(1024, f"{BASE}/logo_dark_theme.png")
save_png(1024, f"{BASE}/logo_final_square.png")
save_png(64,   f"{BASE}/menubar_icon.png")
save_ico(      f"{BASE}/LANpad.ico")

print("\n[2] Flutter assets (lanpad_mobile/assets)")
save_png(1024, f"{BASE}/lanpad_mobile/assets/logo.png")
save_png(1024, f"{BASE}/lanpad_mobile/assets/logo_dark_theme.png")
save_png(1024, f"{BASE}/lanpad_mobile/assets/logo_final_square.png")
save_png(64,   f"{BASE}/lanpad_mobile/assets/menubar_icon.png")
save_ico(      f"{BASE}/lanpad_mobile/assets/app_icon.ico")

print("\n[3] Android launcher icons")
res = f"{BASE}/lanpad_mobile/android/app/src/main/res"
for folder, px in [("mipmap-mdpi",48),("mipmap-hdpi",72),("mipmap-xhdpi",96),("mipmap-xxhdpi",144),("mipmap-xxxhdpi",192)]:
    save_png(px, f"{res}/{folder}/ic_launcher.png")
    save_png(px, f"{res}/{folder}/launcher_icon.png")

print("\n[4] iOS AppIcons")
ios = f"{BASE}/lanpad_mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset"
for name, px in [
    ("Icon-App-1024x1024@1x.png",1024),("Icon-App-20x20@1x.png",20),
    ("Icon-App-20x20@2x.png",40),("Icon-App-20x20@3x.png",60),
    ("Icon-App-29x29@1x.png",29),("Icon-App-29x29@2x.png",58),("Icon-App-29x29@3x.png",87),
    ("Icon-App-40x40@1x.png",40),("Icon-App-40x40@2x.png",80),("Icon-App-40x40@3x.png",120),
    ("Icon-App-50x50@1x.png",50),("Icon-App-50x50@2x.png",100),
    ("Icon-App-57x57@1x.png",57),("Icon-App-57x57@2x.png",114),
    ("Icon-App-60x60@2x.png",120),("Icon-App-60x60@3x.png",180),
    ("Icon-App-72x72@1x.png",72),("Icon-App-72x72@2x.png",144),
    ("Icon-App-76x76@1x.png",76),("Icon-App-76x76@2x.png",152),
    ("Icon-App-83.5x83.5@2x.png",167),
]:
    save_png(px, f"{ios}/{name}")

print("\n[5] macOS AppIcons")
mac = f"{BASE}/lanpad_mobile/macos/Runner/Assets.xcassets/AppIcon.appiconset"
for name, px in [("app_icon_16.png",16),("app_icon_32.png",32),("app_icon_64.png",64),
                 ("app_icon_128.png",128),("app_icon_256.png",256),("app_icon_512.png",512),("app_icon_1024.png",1024)]:
    save_png(px, f"{mac}/{name}")

# Generate LANpad.icns using iconutil
iconset_dir = f"{BASE}/temp_icon.iconset"
os.makedirs(iconset_dir, exist_ok=True)
icon_map = [
    (16, "icon_16x16.png"),
    (32, "icon_16x16@2x.png"),
    (32, "icon_32x32.png"),
    (64, "icon_32x32@2x.png"),
    (128, "icon_128x128.png"),
    (256, "icon_128x128@2x.png"),
    (256, "icon_256x256.png"),
    (512, "icon_256x256@2x.png"),
    (512, "icon_512x512.png"),
    (1024, "icon_512x512@2x.png"),
]
for pxx, filename in icon_map:
    square.copy().resize((pxx, pxx), Image.LANCZOS).save(os.path.join(iconset_dir, filename), "PNG")

try:
    subprocess.run(["iconutil", "-c", "icns", iconset_dir, "-o", f"{BASE}/LANpad.icns"], check=True)
    print(f"  ✓ LANpad.icns generated via iconutil")
finally:
    shutil.rmtree(iconset_dir, ignore_errors=True)

print("\n[6] Website public & app assets")
web = f"{BASE}/website-v2/public"
save_png(1024, f"{web}/logo.png")
save_png(1024, f"{web}/logo_dark_theme.png")
save_png(128,  f"{web}/logo-favicon.png")
save_png(128,  f"{web}/logo-small.png")

save_ico(f"{BASE}/website-v2/src/app/favicon.ico")

print("\n✅ All icon assets regenerated successfully!")

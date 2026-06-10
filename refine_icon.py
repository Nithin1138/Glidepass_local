from PIL import Image, ImageOps, ImageDraw, ImageFilter
import os
import subprocess

def create_premium_icon(input_path, output_icns):
    try:
        logo = Image.open(input_path).convert("RGBA")
        
        # 1. Smart Crop (Trim black background/whitespace from the logo by finding colored content)
        w, h = logo.size
        pix = logo.load()
        min_x, min_y, max_x, max_y = w, h, 0, 0
        found = False
        for y in range(h):
            for x in range(w):
                r, g, b, a = pix[x, y]
                if (r > 15 or g > 15 or b > 15) and a > 15:
                    if x < min_x: min_x = x
                    if y < min_y: min_y = y
                    if x > max_x: max_x = x
                    if y > max_y: max_y = y
                    found = True
        if found:
            logo = logo.crop((min_x, min_y, max_x + 1, max_y + 1))
        
        # --- CREATE SIMPLE & SMOOTH MENUBAR ICON ---
        canvas_size_mb = 38 # Retina menubar height
        # Standard graphic size is around 32-34px to match system icons
        target_graphic_size = 38 
        
        w, h = logo.size
        aspect = w / h
        if w > h:
            new_w = target_graphic_size
            new_h = int(target_graphic_size / aspect)
        else:
            new_h = target_graphic_size
            new_w = int(target_graphic_size * aspect)
            
        # Smooth Resize
        logo_mb = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Create a transparent canvas
        menubar_canvas = Image.new('RGBA', (canvas_size_mb, canvas_size_mb), (0, 0, 0, 0))
        
        # Center the smaller logo in the 44px canvas
        offset_mb = ((canvas_size_mb - new_w) // 2, (canvas_size_mb - new_h) // 2)
        
        # Apply a crisp silver-white color
        silver_fill = Image.new('RGB', (new_w, new_h), (240, 240, 240))
        logo_mb_colored = Image.merge('RGBA', (silver_fill.split()[0], silver_fill.split()[1], silver_fill.split()[2], logo_mb.split()[3]))
        
        menubar_canvas.paste(logo_mb_colored, offset_mb, logo_mb_colored)
        menubar_canvas.save("menubar_icon.png")
        print("✅ Simple & Smooth Menubar Icon generated: menubar_icon.png")

        # --- CREATE APP ICON (macOS Squircle Background) ---
        canvas_size = 1024
        card_size = 824
        # Create an RGBA canvas to support transparent rounded corners
        canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0)) 
        
        # Create solid black card
        card = Image.new('RGB', (card_size, card_size), (0, 0, 0))
        
        # Create squircle mask for the card (radius ~180px for standard 824px card)
        from PIL import ImageDraw
        mask_im = Image.new('L', (card_size, card_size), 0)
        draw = ImageDraw.Draw(mask_im)
        draw.rounded_rectangle([0, 0, card_size, card_size], radius=180, fill=255)
        
        # Scale the logo to fit 90% of the card size
        logo_target_size = int(card_size * 0.90)
        w_app, h_app = logo.size
        aspect_app = w_app / h_app
        if w_app > h_app:
            new_w_app = logo_target_size
            new_h_app = int(logo_target_size / aspect_app)
        else:
            new_h_app = logo_target_size
            new_w_app = int(logo_target_size * aspect_app)
        logo_resized = logo.resize((new_w_app, new_h_app), Image.Resampling.LANCZOS)
        
        # Center the logo on the card
        offset_app = ((card_size - new_w_app) // 2, (card_size - new_h_app) // 2)
        card.paste(logo_resized, offset_app, logo_resized)
        
        # Paste the card onto the transparent canvas (centered)
        card_offset = (canvas_size - card_size) // 2
        canvas.paste(card, (card_offset, card_offset), mask=mask_im)
        
        iconset_dir = "LANpad.iconset"
        if os.path.exists(iconset_dir):
            subprocess.run(["rm", "-rf", iconset_dir])
        os.makedirs(iconset_dir)
        sizes = [16, 32, 64, 128, 256, 512, 1024]
        for s in sizes:
            img = canvas.resize((s, s), Image.Resampling.LANCZOS)
            img.save(f"{iconset_dir}/icon_{s}x{s}.png")
            if s <= 512:
                img_2x = canvas.resize((s*2, s*2), Image.Resampling.LANCZOS)
                img_2x.save(f"{iconset_dir}/icon_{s}x{s}@2x.png")
        
        subprocess.run(["iconutil", "-c", "icns", iconset_dir, "-o", output_icns])
        subprocess.run(["rm", "-rf", iconset_dir])
        print(f"✅ Balanced Pro Icon generated: {output_icns}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
 
if __name__ == "__main__":
    create_premium_icon("logo.png", "LANpad.icns")
from PIL import Image, ImageOps, ImageDraw, ImageFilter
import os
import subprocess

def create_premium_icon(input_path, output_icns):
    try:
        logo = Image.open(input_path).convert("RGBA")
        
        # 1. Smart Crop
        alpha = logo.split()[3]
        mask = alpha.point(lambda p: 255 if p > 25 else 0)
        bbox = mask.getbbox()
        if bbox:
            logo = logo.crop(bbox)
        
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
        # 1024x1024 transparent canvas (for shadow margins)
        canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0)) 
        
        # Create 824x824 card with gradient background
        card_size = 824
        card_grad = Image.new('RGB', (card_size, card_size))
        
        # Sunset Orchid theme gradient: dark violet/indigo to deep slate black
        top_color = (25, 15, 40)      # Dark violet
        bottom_color = (6, 8, 20)      # Deep slate black
        for y in range(card_size):
            factor = y / card_size
            r = int(top_color[0] + (bottom_color[0] - top_color[0]) * factor)
            g = int(top_color[1] + (bottom_color[1] - top_color[1]) * factor)
            b = int(top_color[2] + (bottom_color[2] - top_color[2]) * factor)
            for x in range(card_size):
                card_grad.putpixel((x, y), (r, g, b))
                
        # Create squircle mask (Apple macOS standard: 185px corner radius for 824px card)
        mask_im = Image.new('L', (card_size, card_size), 0)
        draw = ImageDraw.Draw(mask_im)
        draw.rounded_rectangle([0, 0, card_size, card_size], radius=185, fill=255)
        
        # Apply mask to gradient card
        card = Image.new('RGBA', (card_size, card_size), (0, 0, 0, 0))
        card.paste(card_grad, (0, 0), mask=mask_im)
        
        # Paste card centered on the 1024x1024 transparent canvas
        canvas.paste(card, (100, 100), card)
        
        # Scale the logo to fit beautifully (approx 480px, ~47% of canvas size)
        logo_target_size = 480
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
        offset_app = ((canvas_size - new_w_app) // 2, (canvas_size - new_h_app) // 2)
        canvas.paste(logo_resized, offset_app, logo_resized)
        
        iconset_dir = "GlidePass.iconset"
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
    create_premium_icon("logo.png", "GlidePass.icns")
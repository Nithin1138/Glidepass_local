from PIL import Image, ImageOps

def make_icon():
    # Load the logo
    logo = Image.open('logo.png')
    
    # Trim black background/whitespace from the logo by finding colored content
    if logo.mode != 'RGBA':
        logo = logo.convert('RGBA')
    
    # Custom colored crop to ignore the solid black background in logo.png
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
        
    # Create a standard macOS app icon layout:
    # 824x824 squircle card centered on a 1024x1024 transparent canvas (100px margins)
    canvas_size = 1024
    card_size = 824
    background = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    card = Image.new('RGB', (card_size, card_size), (0, 0, 0))
    
    from PIL import ImageDraw
    mask_im = Image.new('L', (card_size, card_size), 0)
    draw = ImageDraw.Draw(mask_im)
    draw.rounded_rectangle([0, 0, card_size, card_size], radius=180, fill=255)
    
    # Scale the logo to fit 90% of the card size
    logo_target_size = int(card_size * 0.90)
    w, h = logo.size
    aspect = w / h
    if w > h:
        new_w = logo_target_size
        new_h = int(logo_target_size / aspect)
    else:
        new_h = logo_target_size
        new_w = int(logo_target_size * aspect)
    
    # Resize logo with high-quality resampling
    logo_resized = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Center the logo on the card
    offset_logo = ((card_size - new_w) // 2, (card_size - new_h) // 2)
    card.paste(logo_resized, offset_logo, logo_resized)
    
    # Paste the card onto the transparent canvas (centered)
    card_offset = (canvas_size - card_size) // 2
    background.paste(card, (card_offset, card_offset), mask=mask_im)
    
    # Save the result
    background.save('logo_final_square.png')
    print(f"✅ Created logo_final_square.png (Trimming: {found})")

if __name__ == "__main__":
    make_icon()

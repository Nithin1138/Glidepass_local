from PIL import Image, ImageOps

def make_icon():
    # Load the logo
    logo = Image.open('logo.png')
    
    # Trim whitespace from the logo (bbox finds non-zero regions)
    # Convert to RGBA to ensure alpha channel is used for bounding box
    if logo.mode != 'RGBA':
        logo = logo.convert('RGBA')
        
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
        
    # Create a 1024x1024 solid black background with rounded corners
    size = (1024, 1024)
    background = Image.new('RGBA', size, (0, 0, 0, 0))
    card = Image.new('RGB', size, (0, 0, 0))
    
    from PIL import ImageDraw
    mask_im = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask_im)
    draw.rounded_rectangle([0, 0, size[0], size[1]], radius=225, fill=255)
    
    background.paste(card, (0, 0), mask=mask_im)

    # Scale the logo to fit beautifully (90% of size)
    logo_target_size = int(size[0] * 0.90)
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
    
    # Center the logo on the background
    offset = ((size[0] - new_w) // 2, (size[1] - new_h) // 2)
    background.paste(logo_resized, offset, logo_resized)
    
    # Save the result
    background.save('logo_final_square.png')
    print(f"✅ Created logo_final_square.png (Trimming: {bbox is not None})")

if __name__ == "__main__":
    make_icon()

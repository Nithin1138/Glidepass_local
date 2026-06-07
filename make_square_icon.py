from PIL import Image, ImageOps

def make_icon():
    # Load the logo
    logo = Image.open('website-v2/public/logo.png')
    
    # Trim whitespace from the logo (bbox finds non-zero regions)
    # Convert to RGBA to ensure alpha channel is used for bounding box
    if logo.mode != 'RGBA':
        logo = logo.convert('RGBA')
        
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
        
    # Create a 1024x1024 Comet Black gradient background
    size = (1024, 1024)
    background = Image.new('RGB', size, (0, 0, 0))
    
    # Draw vertical gradient (Comet Black: #050505 to #000000)
    top_color = (5, 5, 5)
    bottom_color = (0, 0, 0)
    
    for y in range(size[1]):
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * (y / size[1]))
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * (y / size[1]))
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * (y / size[1]))
        for x in range(size[0]):
            background.putpixel((x, y), (r, g, b))

    # Calculate scale for extreme enlargement (negative padding to over-scale)
    padding = -0.30 
    max_dim = int(1024 * (1 - 2 * padding))
    
    w, h = logo.size
    ratio = min(max_dim/w, max_dim/h)
    new_size = (int(w * ratio), int(h * ratio))
    
    # Resize logo with high-quality resampling
    logo_resized = logo.resize(new_size, Image.Resampling.LANCZOS)
    
    # Center the logo on the background
    offset = ((1024 - new_size[0]) // 2, (1024 - new_size[1]) // 2)
    background.paste(logo_resized, offset, logo_resized)
    
    # Save the result
    background.save('logo_final_square.png')
    print(f"✅ Created logo_final_square.png (Trimming: {bbox is not None})")

if __name__ == "__main__":
    make_icon()

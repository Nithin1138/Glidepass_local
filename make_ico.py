from PIL import Image, ImageDraw
import os

def create_ico():
    img_path = "logo_final_square.png"
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found")
        return

    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    
    # Create a transparent base image
    bg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    
    # Create a rounded mask (squircle style)
    mask = Image.new("L", (w, h), 0)
    draw_mask = ImageDraw.Draw(mask)
    radius = int(w * 0.18) # ~18% corner radius matches standard squircle
    draw_mask.rounded_rectangle([0, 0, w, h], radius=radius, fill=255)
    
    # Create solid black card with the logo
    black_card = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    black_card.paste(img, (0, 0), img)
    
    # Paste the black card onto the transparent base using the rounded mask
    bg.paste(black_card, (0, 0), mask=mask)
    
    # Windows icons usually include multiple sizes
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    bg.save("LANpad.ico", format="ICO", sizes=sizes)
    print("✅ LANpad.ico created with curved black background!")

if __name__ == "__main__":
    create_ico()


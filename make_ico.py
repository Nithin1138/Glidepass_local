from PIL import Image
import os

def create_ico():
    img_path = "logo_final_square.png"
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found")
        return

    img = Image.open(img_path).convert("RGBA")
    
    # Create a solid black background
    bg = Image.new("RGBA", img.size, (0, 0, 0, 255))
    
    # Paste the logo image using its alpha channel as the mask
    bg.paste(img, (0, 0), img)
    
    # Windows icons usually include multiple sizes
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    bg.save("LANpad.ico", format="ICO", sizes=sizes)
    print("✅ LANpad.ico created with black background!")

if __name__ == "__main__":
    create_ico()


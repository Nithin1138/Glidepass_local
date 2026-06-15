from PIL import Image

def make_icon():
    try:
        img = Image.open('logo_final_square.png').convert("RGBA")
        
        # Create a white background image of the same size
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        
        # Paste the original image onto the background using the original image as a mask
        bg.paste(img, (0, 0), img)
        
        # Save as ICO with multiple sizes for Windows
        icon_sizes = [(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)]
        bg.save('LANpad.ico', format='ICO', sizes=icon_sizes)
        print("Saved LANpad.ico with white background.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    make_icon()

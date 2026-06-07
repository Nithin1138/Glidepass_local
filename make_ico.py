from PIL import Image
import os

def create_ico():
    img_path = "logo.png"
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found")
        return

    img = Image.open(img_path)
    # Windows icons usually include multiple sizes
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save("GlidePass.ico", sizes=sizes)
    print("✅ GlidePass.ico created!")

if __name__ == "__main__":
    create_ico()

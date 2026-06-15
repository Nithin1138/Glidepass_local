import tkinter as tk
root = tk.Tk()
cv = tk.Canvas(root)
cv.pack()
def handler(e):
    print("Click!")
    cv.unbind("<ButtonRelease-1>")
    print("Unbound!")
cv.bind("<ButtonRelease-1>", handler)
# simulate click
handler(None)

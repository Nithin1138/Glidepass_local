import tkinter as tk

def on_close():
    print("WM_DELETE_WINDOW triggered (Red Cross)")
    root.destroy()

def on_quit(*args):
    print("Command+Q triggered")
    root.destroy()

root = tk.Tk()
root.protocol("WM_DELETE_WINDOW", on_close)
root.createcommand("::tk::mac::Quit", on_quit)

root.mainloop()

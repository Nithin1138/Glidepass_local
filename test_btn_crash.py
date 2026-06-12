import tkinter as tk

class App:
    def __init__(self, root):
        self.root = root
        self.GREEN = "green"
        self.RED = "red"
        self.WHITE = "white"
        self.FU = "Arial"
        
        self._btn_cv = tk.Canvas(root, width=200, height=54, bg="black", highlightthickness=0)
        self._btn_cv.pack()
        self._draw_main_btn(active=False)
        self.active = False
        
    def _draw_main_btn(self, active: bool):
        c = self._btn_cv
        c.delete("all")
        W = int(c["width"])
        
        def rounded_rect(cv, x1, y1, x2, y2, r, **kwargs):
            cv.create_rectangle(x1, y1, x2, y2, **kwargs)
            
        if active:
            rounded_rect(c, 0, 1, W, 51, r=12, fill=self.RED, outline="")
            c.create_text(W // 2, 26, text="Stop Server",
                          fill=self.WHITE, font=(self.FU, 16, "bold"))
        else:
            rounded_rect(c, 0, 1, W, 51, r=12, fill=self.GREEN, outline="")
            c.create_text(W // 2, 26, text="Start Server",
                          fill=self.WHITE, font=(self.FU, 16, "bold"))
        c.bind("<Button-1>", lambda e: self.toggle_server())

    def toggle_server(self):
        print("Toggling server!")
        self.active = not self.active
        self._draw_main_btn(active=self.active)

root = tk.Tk()
app = App(root)
app.toggle_server()
app.toggle_server()
print("Success")

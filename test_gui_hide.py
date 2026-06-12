import tkinter as tk
from launcher import LANpadLauncher

def main():
    root = tk.Tk()
    app = LANpadLauncher(root)
    
    def click_stop():
        print("Clicking stop server")
        app.stop_server()
        
    def check_if_hidden():
        print("Root state:", root.state())
        print("Winfo exists:", root.winfo_exists())
        root.after(1000, check_if_hidden)
        
    root.after(3000, click_stop)
    root.after(1000, check_if_hidden)
    
    root.mainloop()

if __name__ == "__main__":
    main()

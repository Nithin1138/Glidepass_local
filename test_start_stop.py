from launcher import LANpadLauncher
import tkinter as tk
import time, threading

def auto_test():
    time.sleep(2)
    print("Clicking Start")
    app.start_server()
    time.sleep(2)
    print("Clicking Stop")
    app.stop_server()
    time.sleep(2)
    print("Clicking Start again")
    app.start_server()
    time.sleep(2)
    print("Clicking Stop again")
    app.stop_server()
    time.sleep(2)
    print("Test finished successfully.")
    import os
    os._exit(0)

root = tk.Tk()
app = LANpadLauncher(root)
threading.Thread(target=auto_test).start()
root.mainloop()

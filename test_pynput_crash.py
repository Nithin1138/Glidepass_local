from pynput import keyboard
import time

def on_press(key):
    pass

print("Starting first listener")
l1 = keyboard.Listener(on_press=on_press)
l1.start()
time.sleep(1)

print("Stopping first listener")
l1.stop()
time.sleep(1)

print("Starting second listener")
l2 = keyboard.Listener(on_press=on_press)
l2.start()
time.sleep(1)

print("Success")

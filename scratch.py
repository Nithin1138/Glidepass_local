import time
import pyautogui

pyautogui.PAUSE = 0
text = "A" * 100

start = time.time()
for char in text:
    pyautogui.write(char)
end = time.time()
print(f"Time for 100 chars: {end - start}s")

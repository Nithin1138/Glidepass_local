import subprocess
import time
import os

if __name__ == "__main__":
    with open("child.py", "w") as f:
        f.write("import os, time, signal\nprint('Child parent PID:', os.getppid())\nos.kill(os.getppid(), signal.SIGTERM)\ntime.sleep(1)\nprint('Child exiting')\n")
    print("Parent PID:", os.getpid())
    p = subprocess.Popen(["python3", "child.py"])
    time.sleep(5)
    print("Parent survived!")

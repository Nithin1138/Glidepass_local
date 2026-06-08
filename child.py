import os, time, signal
print('Child parent PID:', os.getppid())
os.kill(os.getppid(), signal.SIGTERM)
time.sleep(1)
print('Child exiting')

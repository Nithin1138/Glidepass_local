import ctypes
import ctypes.util

def check():
    try:
        app_services = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices')
        app_services.AXIsProcessTrusted.restype = ctypes.c_bool
        return app_services.AXIsProcessTrusted()
    except Exception as e:
        print("Error:", e)
        return False

print("TRUSTED:", check())

import sys
import ctypes
import ctypes.util

def check_mac_accessibility():
    if sys.platform != 'darwin':
        return True
    try:
        app_services = ctypes.cdll.LoadLibrary(ctypes.util.find_library('ApplicationServices'))
        core_foundation = ctypes.cdll.LoadLibrary(ctypes.util.find_library('CoreFoundation'))
        
        kAXTrustedCheckOptionPrompt = ctypes.c_void_p.in_dll(app_services, 'kAXTrustedCheckOptionPrompt')
        kCFBooleanTrue = ctypes.c_void_p.in_dll(core_foundation, 'kCFBooleanTrue')
        
        keys = (ctypes.c_void_p * 1)(kAXTrustedCheckOptionPrompt)
        values = (ctypes.c_void_p * 1)(kCFBooleanTrue)
        options = core_foundation.CFDictionaryCreate(None, keys, values, 1, None, None)
        
        app_services.AXIsProcessTrustedWithOptions.restype = ctypes.c_bool
        app_services.AXIsProcessTrustedWithOptions.argtypes = [ctypes.c_void_p]
        
        trusted = app_services.AXIsProcessTrustedWithOptions(options)
        core_foundation.CFRelease(options)
        
        return trusted
    except Exception as e:
        print("Error:", e)
        return False

if __name__ == "__main__":
    print("Is Trusted?", check_mac_accessibility())

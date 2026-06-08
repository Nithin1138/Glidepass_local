import sys

def check_mac_accessibility():
    try:
        from rubicon.objc import ObjCClass, NSDictionary, objc_id
        import ctypes
        
        # Load ApplicationServices framework
        ctypes.cdll.LoadLibrary('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices')
        
        # We need AXIsProcessTrustedWithOptions
        # It's a C function, not an Objective-C class!
        app_services = ctypes.cdll.LoadLibrary('/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices')
        
        # Wait, using ctypes is simpler for C functions.
        # Let's try PyObjC approach if ctypes crashes.
    except Exception as e:
        print(e)

if __name__ == '__main__':
    check_mac_accessibility()

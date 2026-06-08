import AppKit
import objc

def handle_reopen(*args):
    print("Reopen handled!")

class AppDelegate(AppKit.NSObject):
    def applicationShouldHandleReopen_hasVisibleWindows_(self, app, flag):
        print("Reopen called!")
        return True

app = AppKit.NSApplication.sharedApplication()
delegate = AppDelegate.alloc().init()
app.setDelegate_(delegate)
print("Delegate set!")

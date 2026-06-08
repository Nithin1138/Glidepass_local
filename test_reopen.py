from AppKit import NSApplication, NSObject
import objc

app = NSApplication.sharedApplication()
delegate = app.delegate()
print("Delegate is:", delegate)

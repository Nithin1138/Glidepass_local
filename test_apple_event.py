from AppKit import NSAppleEventManager, kCoreEventClass, kAEReopenApplication, NSApplication
import objc

class ReopenHandler(objc.lookUpClass("NSObject")):
    def handleReopenEvent_withReplyEvent_(self, event, reply):
        print("Reopen event received!")

app = NSApplication.sharedApplication()
handler = ReopenHandler.alloc().init()
manager = NSAppleEventManager.sharedAppleEventManager()
manager.setEventHandler_andSelector_forEventClass_andEventID_(
    handler,
    objc.selector(handler.handleReopenEvent_withReplyEvent_, signature=b"v@:@@"),
    kCoreEventClass,
    kAEReopenApplication
)
print("Handler registered!")

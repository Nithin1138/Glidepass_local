import Cocoa
import FlutterMacOS
import Carbon

@main
class AppDelegate: FlutterAppDelegate {
  override func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    return false
  }

  override func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
    if !flag {
      mainFlutterWindow?.makeKeyAndOrderFront(nil)
    }
    return true
  }

  override func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool {
    return true
  }

  override func applicationDidFinishLaunching(_ notification: Notification) {
    let controller = mainFlutterWindow?.contentViewController as! FlutterViewController
    let channel = FlutterMethodChannel(name: "lanpad/system", binaryMessenger: controller.engine.binaryMessenger)
    
    channel.setMethodCallHandler { (call, result) in
      if call.method == "simulateTyping" {
        guard let args = call.arguments as? [String: Any],
              let text = args["text"] as? String else {
          result(FlutterError(code: "INVALID_ARGS", message: "Missing text", details: nil))
          return
        }
        self.simulateTyping(text: text)
        result("success")
      } else if call.method == "checkAccessibility" {
        result(AXIsProcessTrusted())
      } else if call.method == "requestAccessibility" {
        let prefpane = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        if let url = URL(string: prefpane) {
          NSWorkspace.shared.open(url)
        }
        result(true)
      } else if call.method == "checkInputMonitoring" {
        result(self.checkInputMonitoring())
      } else if call.method == "checkFullDiskAccess" {
        result(self.checkFullDiskAccess())
      } else {
        result(FlutterMethodNotImplemented)
      }
    }
  }

  private func checkInputMonitoring() -> Bool {
    if #available(macOS 10.15, *) {
        return CGPreflightListenEventAccess()
    } else {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: false] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }
  }

  private func checkFullDiskAccess() -> Bool {
    let path = "/Library/Application Support/com.apple.TCC/TCC.db"
    return FileManager.default.isReadableFile(atPath: path)
  }

  private func simulateTyping(text: String) {
    let source = CGEventSource(stateID: .combinedSessionState)
    for char in text {
      var utf16Chars = Array(String(char).utf16)
      let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: true)
      keyDown?.keyboardSetUnicodeString(stringLength: utf16Chars.count, unicodeString: &utf16Chars)
      keyDown?.post(tap: .cghidEventTap)
      
      let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: false)
      keyUp?.keyboardSetUnicodeString(stringLength: utf16Chars.count, unicodeString: &utf16Chars)
      keyUp?.post(tap: .cghidEventTap)
      
      Thread.sleep(forTimeInterval: 0.005)
    }
  }
}

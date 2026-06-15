import objc
import queue
import sys

# Load LocalAuthentication
objc.loadBundle("LocalAuthentication", bundle_path="/System/Library/Frameworks/LocalAuthentication.framework", module_globals=globals())

# Register metadata for block completion handler
objc.registerMetaDataForSelector(
    b"LAContext",
    b"evaluatePolicy:localizedReason:reply:",
    {
        "arguments": {
            4: {
                "callable": {
                    "retval": {"type": b"v"},
                    "arguments": {
                        0: {"type": b"^v"},  # Block signature requires 0 to be the block pointer context
                        1: {"type": b"B"},   # BOOL success
                        2: {"type": b"@"},   # NSError *error
                    }
                }
            }
        }
    }
)

context = LAContext.alloc().init()
q = queue.Queue()

def reply_callback(success, error):
    q.put((success, error))
    print("Callback triggered:", success, error)

try:
    # Now it should successfully bridge the reply_callback
    context.evaluatePolicy_localizedReason_reply_(2, "show your activation key", reply_callback)
    print("Called evaluatePolicy successfully.")
except Exception as e:
    print("Call failed:", e)

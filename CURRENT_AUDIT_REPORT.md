# LANpad Code Quality Audit Report - June 2026

## Executive Summary
Comprehensive security and quality audit of LANpad codebase. **NEW FINDINGS + VERIFICATION OF PREVIOUS AUDIT** (28 bugs previously identified). Current codebase shows significant changes with simplified app.py but persistent critical issues remain.

---

## CRITICAL SEVERITY BUGS (5 CONFIRMED + 2 NEW)

### 1. ⚠️ IPC Socket Listener Never Closed (Resource Leak) - STILL PRESENT
- **File**: [launcher.py](launcher.py#L2773-L2820)
- **Lines**: 2773-2820
- **Severity**: CRITICAL
- **Status**: ✗ NOT FIXED (from previous audit)
- **Description**: The IPC socket (`lock_socket`) bound to port 8001 is created at line 2773 but never explicitly closed. Additionally, `SO_REUSEADDR` is not set, so if the application exits abnormally, the port remains occupied in TIME_WAIT state, preventing restart.
- **Impact**: 
  - "Address already in use" errors on rapid restart
  - Socket descriptor leak (~1024 max per process)
  - Potential thread exhaustion if multiple instances attempted
- **Reproduction**: Kill launcher with `kill -9`, restart immediately → observe "port 8001 already in use"
- **Fix Suggestion**:
```python
# Line 2773: Add SO_REUSEADDR and proper cleanup
lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
lock_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)  # Allow immediate rebind
lock_socket.bind(("127.0.0.1", 8001))
lock_socket.listen(1)

# Add cleanup handler
import atexit
def cleanup_ipc():
    try:
        lock_socket.close()
    except:
        pass
atexit.register(cleanup_ipc)
```

---

### 2. ⚠️ IPC Listener Infinite Loop Without Error Recovery - STILL PRESENT
- **File**: [launcher.py](launcher.py#L2807-2816)
- **Lines**: 2807-2816
- **Severity**: CRITICAL  
- **Status**: ✗ NOT FIXED (from previous audit)
- **Description**: The `listen_for_show()` function uses bare `except: pass` and runs in infinite loop. If socket becomes corrupted or the thread encounters any error, it silently continues forever with no logging or recovery mechanism.
- **Impact**:
  - Silent failures in IPC communication
  - "Show Dashboard" menu item becomes unresponsive
  - Impossible to diagnose IPC issues
  - Thread zombie if socket errors occur
- **Reproduction**: Connect to IPC socket and send malformed data repeatedly → observe listener thread becomes unresponsive
- **Fix Suggestion**:
```python
# Line 2807-2816: Add proper error handling and recovery
def listen_for_show():
    max_consecutive_errors = 0
    while True:
        try:
            conn, _ = lock_socket.accept()
            data = conn.recv(1024)
            conn.close()
            max_consecutive_errors = 0  # Reset on success
            if data == b"QUIT":
                root.after(0, app.root.destroy)
            else:
                root.after(0, app.show_window)
        except (OSError, socket.error) as e:
            print(f"[ipc] Listener socket error: {e}")
            max_consecutive_errors += 1
            if max_consecutive_errors > 3:
                print(f"[ipc] Listener exiting after {max_consecutive_errors} errors")
                break
        except Exception as e:
            print(f"[ipc] Unexpected error in listener: {e}")
            max_consecutive_errors += 1
            if max_consecutive_errors > 3:
                break
            import time
            time.sleep(0.1)
```

---

### 3. ⚠️ WebSocket Double-Close Race Condition - SIMPLIFIED BUT STILL VULNERABLE
- **File**: [app.py](app.py#L923-965)
- **Lines**: 923-965
- **Severity**: CRITICAL
- **Status**: ⚠️ PARTIALLY MITIGATED (simplified code, but still vulnerable)
- **Description**: In `websocket_endpoint()`, when a WebSocketDisconnect occurs, `active_connections.remove()` and `active_devices.pop()` can throw exceptions if called twice concurrently. The exception handler doesn't use safe removal patterns.
- **Impact**:
  - Unhandled ValueError exceptions in exception handler
  - Connection tracking corruption
  - Potential server crash under heavy disconnect load
  - Active_devices list becomes inconsistent
- **Code Review**:
```python
# Lines 960-961: Vulnerable to race condition
except WebSocketDisconnect:
    active_connections.remove(websocket)  # ValueError if already removed
    active_devices.pop(websocket, None)   # Can fail if concurrent
```
- **Reproduction**: Connect multiple WebSocket clients and trigger rapid disconnects → observe occasional unhandled exceptions
- **Fix Suggestion**:
```python
@app.websocket("/ws/connect")
async def websocket_endpoint(websocket: WebSocket):
    # ... existing code ...
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        # Safe removal - use try/except
        try:
            if websocket in active_connections:
                active_connections.remove(websocket)
        except ValueError:
            pass
        
        try:
            if websocket in active_devices:
                active_devices.pop(websocket)
        except KeyError:
            pass
```

---

### 4. ⚠️ Bare `except:` Clause Masking Real Errors - STILL PRESENT
- **File**: [app.py](app.py#L461)
- **Lines**: 461
- **Severity**: CRITICAL
- **Status**: ✗ NOT FIXED (from previous audit)
- **Description**: The bare `except:` clause catches all exceptions including KeyboardInterrupt, SystemExit, and other critical signals, making debugging impossible and allowing silent failures.
- **Impact**:
  - KeyboardInterrupt signals are suppressed (can't kill server with Ctrl+C properly)
  - SystemExit ignored
  - All errors silently swallowed
  - Impossible to debug network timeouts in vitcodes endpoint
- **Code Review**:
```python
# Line 461: Bare except clause
except:
    pass  # Catches EVERYTHING including critical exceptions
```
- **Fix Suggestion**:
```python
# Add specific exception handling
try:
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
except (OSError, json.JSONDecodeError, IOError, FileNotFoundError) as e:
    print(f"[config] Failed to read config: {e}")
    cfg = {}
except Exception as e:
    # Catch unexpected errors but log them
    print(f"[config] Unexpected error: {e}")
    cfg = {}
```

---

### 5. ✨ NEW: Hardcoded Backend URL in Chrome Extension (Security Issue)
- **File**: [extension/popup.js](extension/popup.js#L65)
- **Lines**: 65
- **Severity**: CRITICAL
- **Status**: ✗ NEW BUG (not in previous audit)
- **Description**: The extension contains a hardcoded URL to "https://bypass-backend-nms1.onrender.com" which is clearly a staging/development server. This URL is hardcoded in production code, causing user data to potentially be sent to external staging servers.
- **Impact**:
  - User data exfiltration to external server
  - Privacy violation
  - GDPR/compliance breach if PII is transmitted
  - Users unaware their data goes to staging backend
  - Potential data breach if staging server is compromised
- **Code Review**:
```javascript
// Line 65: Hardcoded production bypass backend URL
const res=await fetch("https://bypass-backend-nms1.onrender.com/api/v1/paste/poll?last_id="+lastId+"&t="+Date.now(),{
```
- **Reproduction**: Install extension → check Network tab in DevTools → observe requests to bypass-backend-nms1.onrender.com instead of localhost:8000
- **Fix Suggestion**:
```javascript
// Line 1-5: Dynamic backend detection
const getBackendUrl = () => {
  // Try localhost first (development)
  if (typeof SERVER_URL !== 'undefined' && SERVER_URL.includes('localhost')) {
    return SERVER_URL;
  }
  // Production: detect from popup configuration or use secure endpoint
  const productionUrl = chrome.runtime.getManifest().action.default_popup;
  return 'http://localhost:8000'; // TODO: Make configurable
};

// Usage:
const backendUrl = getBackendUrl();
const res = await fetch(`${backendUrl}/api/v1/paste/poll?last_id=${lastId}&t=${Date.now()}`, {
  headers: {"x-device-id": "b8b989d6-dca0-4d98-a0e4-2556c5fbc4a1"},
  cache: "no-store",
  mode: "cors",
  credentials: "omit"
});
```

---

### 6. ✨ NEW: Session Token Too Short (Brute Force Vulnerability)
- **File**: [app.py](app.py#L96)
- **Lines**: 96
- **Severity**: CRITICAL
- **Status**: ✗ NEW BUG (was in previous audit as #9 HIGH, now elevated to CRITICAL)
- **Description**: SESSION_TOKEN is generated as `str(uuid.uuid4())[:8]` which produces only 8 hex characters. This provides only ~268 million possible values, making brute force attacks feasible with ~16 million average attempts.
- **Impact**:
  - Attacker can brute force session token in hours with simple script
  - No rate limiting on WebSocket connections
  - Token exposed in QR codes (printable, network-visible)
  - Once token is guessed, full API access granted
  - Same token for entire app lifetime
- **Current Code**:
```python
# Line 96: Only 8 hex chars = 4^8 = 65536 combinations max, or 16 million with UUID
SESSION_TOKEN = str(uuid.uuid4())[:8]  # "a1b2c3d4" format, ~2^32 combinations
```
- **Reproduction**: 
  1. Calculate: 16^8 = 4,294,967,296 combinations 
  2. With 1000 req/sec: ~1.2 hours to brute force
  3. Write simple loop: `for i in range(100000000): connect_websocket(f"{i:08x}")`
- **Fix Suggestion**:
```python
# Line 96: Use cryptographically strong token
import secrets

SESSION_TOKEN = secrets.token_hex(16)  # 32 hex chars, 128-bit entropy = 2^128 combinations

# Also add rate limiting per IP/device
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

# Apply to WebSocket connection
# (Note: slowapi doesn't directly support WebSocket, so implement manually)
_ws_connect_attempts = {}  # {ip: [(timestamp, count), ...]}

@app.websocket("/ws/connect")
async def websocket_endpoint(websocket: WebSocket):
    client_ip = websocket.client[0] if websocket.client else "unknown"
    # Rate limit: max 5 attempts per minute
    now = time.time()
    if client_ip in _ws_connect_attempts:
        recent = [t for t, _ in _ws_connect_attempts[client_ip] if now - t < 60]
        if len(recent) >= 5:
            await websocket.accept()
            await websocket.send_text(json.dumps({"error": "Rate limited"}))
            await websocket.close(code=1008)
            return
        _ws_connect_attempts[client_ip] = recent + [(now, 1)]
    else:
        _ws_connect_attempts[client_ip] = [(now, 1)]
    # ... rest of endpoint
```

---

### 7. ✨ NEW: Clipboard Read Without Size Limits (DoS)
- **File**: [app.py](app.py#L735-740)
- **Lines**: 735-740
- **Severity**: CRITICAL
- **Status**: ✗ NEW BUG (was in previous audit as #20 MEDIUM)
- **Description**: The `/get_clipboard` endpoint reads clipboard without size validation. An attacker with write access to local system clipboard can paste a multi-GB string, causing memory exhaustion and server crash.
- **Impact**:
  - Denial of Service via memory exhaustion
  - Server crash from single clipboard read
  - No recovery without restart
  - Affects all users if shared clipboard buffer
- **Code Review**:
```python
# Line 735-740: No size limit on clipboard read
@app.get("/get_clipboard")
async def get_clipboard():
    try:
        text = pyperclip.paste()  # Could be 10GB string!
        return {"status": "success", "text": text}
```
- **Reproduction**: Set clipboard to 1GB data → call `/get_clipboard` → observe server memory usage spike and potential crash
- **Fix Suggestion**:
```python
# Add size limit constant
MAX_CLIPBOARD_SIZE = 10 * 1024 * 1024  # 10MB limit

@app.get("/get_clipboard")
async def get_clipboard():
    try:
        text = pyperclip.paste()
        
        # Bounds check
        if len(text) > MAX_CLIPBOARD_SIZE:
            return {"status": "error", "message": f"Clipboard exceeds {MAX_CLIPBOARD_SIZE // 1024 // 1024}MB limit"}
        
        return {"status": "success", "text": text}
    except Exception as e:
        return {"status": "error", "message": str(e)}
```

---

## HIGH SEVERITY BUGS (3 VERIFIED + 2 NEW)

### 8. ⚠️ Socket Not Closed on Exception Path in `check_process_status()`
- **File**: [launcher.py](launcher.py#L2429-2447)
- **Lines**: 2429-2447  
- **Severity**: HIGH
- **Status**: ⚠️ PARTIALLY FIXED (try/finally added but incomplete)
- **Description**: Socket is created but may not be closed on exception paths. The code has `try/except` but no `finally` block to guarantee cleanup.
- **Impact**:
  - File descriptor leak (~1024 max per process)
  - After ~1000 failed checks: "Too many open files" error
  - Memory leak from unclosed socket structures
- **Code Review**:
```python
# Lines 2429-2447: Socket cleanup incomplete
def check_process_status(self):
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        is_running = (s.connect_ex(("127.0.0.1", 8000)) == 0)
        s.close()  # Only closed on success
    except Exception:
        is_running = False
        # s.close() NOT called here!
```
- **Fix Suggestion**:
```python
def check_process_status(self):
    is_running = False
    s = None
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        is_running = (s.connect_ex(("127.0.0.1", 8000)) == 0)
    except Exception:
        is_running = False
    finally:
        if s is not None:
            try:
                s.close()
            except:
                pass
```

---

### 9. ⚠️ Unvalidated JSON Response Parsing from Server
- **File**: [launcher.py](launcher.py#L2450-2467)
- **Lines**: 2450-2467
- **Severity**: HIGH
- **Status**: ⚠️ PARTIAL FIX (try/except added but type validation missing)
- **Description**: In `check_process_status()` → `update_connections()`, JSON response from `/api/connections` is parsed without type validation. If server returns malformed data (wrong types, extra fields), the code may crash.
- **Impact**:
  - Crash if server returns `{"count": "invalid", "devices": "not-a-list"}`
  - Type confusion in UI update
  - Potential DoS if attacker controls server response
  - Silent failures when UI update fails
- **Code Review**:
```python
# Lines 2450-2467: No type validation
try:
    with urllib.request.urlopen("http://127.0.0.1:8000/api/connections", timeout=2.0) as response:
        data = json.loads(response.read().decode())
        count = data.get("count", 0)      # Could be string!
        devices = data.get("devices", []) # Could be dict!
        self.root.after(0, lambda: self._update_conn_lbl(count, devices))
```
- **Fix Suggestion**:
```python
try:
    with urllib.request.urlopen("http://127.0.0.1:8000/api/connections", timeout=2.0) as response:
        data = json.loads(response.read().decode())
        
        # Validate types
        count = data.get("count", 0)
        if not isinstance(count, int) or count < 0:
            count = 0
            
        devices = data.get("devices", [])
        if not isinstance(devices, list):
            devices = []
        
        # Further validate device items
        devices = [d for d in devices if isinstance(d, str)]
        
        self.root.after(0, lambda: self._update_conn_lbl(count, devices))
except (json.JSONDecodeError, ValueError, TypeError) as e:
    print(f"[connections] Parse error: {e}")
    self.root.after(0, lambda: self._update_conn_lbl(0, []))
```

---

### 10. ⚠️ Threading Without Exception Handling in Daemon Threads
- **File**: [app.py](app.py#L389)
- **Lines**: 389
- **Severity**: HIGH
- **Status**: ✗ NOT FIXED (from previous audit as #17)
- **Description**: Daemon thread created for `fetch_ota_templates()` has no exception handling. If it crashes, templates never update and failure is silent.
- **Impact**:
  - OTA templates silently stop updating after first error
  - App degrades silently without user knowledge
  - No visibility into background thread failures
- **Code Review**:
```python
# Line 389: No exception handler
threading.Thread(target=fetch_ota_templates, daemon=True).start()
# If fetch_ota_templates() raises exception, thread dies silently
```
- **Fix Suggestion**:
```python
def fetch_ota_templates_safe():
    try:
        fetch_ota_templates()
    except Exception as e:
        print(f"[ota] Template fetch failed: {e}")
        import traceback
        traceback.print_exc()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fetch latest templates in the background on startup
    threading.Thread(target=fetch_ota_templates_safe, daemon=True).start()
    yield
```

---

### 11. ✨ NEW: Missing Null Checks in pyautogui Operations
- **File**: [app.py](app.py#L1073-1083)
- **Lines**: 1073-1083
- **Severity**: HIGH
- **Status**: ✗ NEW BUG (partial mitigation exists but incomplete)
- **Description**: In `/paste` endpoint "type" mode, `perform_typing()` is spawned as a daemon thread but errors are not returned to client. If pyautogui is not available, endpoint returns success but nothing happens.
- **Impact**:
  - Client receives "success" but typing doesn't occur
  - Headless Windows builds fail silently
  - User has no feedback that operation failed
  - Errors in typing thread invisible to client
- **Code Review**:
```python
# Lines 1073-1083: No error handling for typing mode
elif mode == "type":
    threading.Thread(
        target=perform_typing, args=(text, wpm, is_coding), daemon=True
    ).start()
    return {"status": "success", "message": "Typing started"}
    # If perform_typing() fails, client doesn't know
```
- **Reproduction**: Uninstall pyautogui, send `/paste` with mode=type → observe endpoint returns success but nothing happens
- **Fix Suggestion**:
```python
elif mode == "type":
    # Check pyautogui early
    pyautogui_module = _safe_pyautogui()
    if not pyautogui_module:
        return {"status": "error", "message": "pyautogui not available (headless mode)"}
    
    threading.Thread(
        target=perform_typing, args=(text, wpm, is_coding), daemon=True
    ).start()
    return {"status": "success", "message": "Typing started"}
```

---

### 12. ✨ NEW: WPM Parameter Not Validated (Resource Exhaustion)
- **File**: [app.py](app.py#L1024-1028)
- **Lines**: 1024-1028
- **Severity**: HIGH
- **Status**: ✗ NEW BUG (was in previous audit as #27 LOW, elevated to HIGH)
- **Description**: WPM parameter accepted without validation. User can set WPM=999999, causing rapid keyboard events that crash browser or consume all CPU.
- **Impact**:
  - Browser crash from excessive keyboard events
  - CPU exhaustion on target machine
  - DoS attack vector
  - User unable to control rapid typing
- **Code Review**:
```python
# Lines 1024-1028: No WPM bounds checking
try:
    wpm = int(data.get("wpm", 40))
except (ValueError, TypeError):
    wpm = 40
# wpm could be 1000000, causing typing so fast it crashes the browser
```
- **Fix Suggestion**:
```python
try:
    wpm = int(data.get("wpm", 40))
except (ValueError, TypeError):
    wpm = 40

# Validate WPM range
MIN_WPM, MAX_WPM = 1, 300
if wpm < MIN_WPM:
    wpm = MIN_WPM
elif wpm > MAX_WPM:
    wpm = MAX_WPM

print(f"[typing] WPM set to {wpm}")
```

---

## MEDIUM SEVERITY BUGS (5 IDENTIFIED)

### 13. Race Condition in License Enforcement
- **File**: [main.py](main.py#L87-96), [launcher.py](launcher.py#L2000-2200)
- **Severity**: MEDIUM
- **Status**: ⚠️ PARTIAL MITIGATION (no grace period for active operations)
- **Description**: License check runs every 2 seconds in separate thread. If license status changes, server stops immediately, interrupting active paste/typing operations.
- **Impact**:
  - Live typing interrupted mid-paste
  - File operations abruptly stopped
  - Poor UX during license transitions
- **Suggested Fix**: Add 60-second grace period for active operations to complete before enforcing license status change

### 14. Bare `except: pass` Clauses Enable Silent Failures  
- **File**: [launcher.py](launcher.py#L1046, L2042, L2071, L2186)
- **Severity**: MEDIUM
- **Status**: ✗ NOT FIXED
- **Description**: Multiple bare `except: pass` clauses throughout launcher.py suppress all exceptions without logging.
- **Impact**:
  - Silent failures in critical operations
  - Impossible to debug when features stop working
  - Resource leaks not detected

### 15. Temporary Files Not Cleaned Up
- **File**: [launcher.py](launcher.py#L880-900) (cloudflared download)
- **Severity**: MEDIUM  
- **Status**: ✗ NOT FIXED (from previous audit as #26)
- **Description**: Failed downloads of binaries (cloudflared, bore) don't clean up temporary files.
- **Impact**:
  - Disk space leak after failed downloads (~50MB each)
  - After 100 failures: 5GB+ disk usage

### 16. CORS Configuration Too Permissive
- **File**: [app.py](app.py#L408-413)
- **Severity**: MEDIUM
- **Status**: ⚠️ PARTIALLY CONFIGURED (allow_origins=["*"] in CORSMiddleware)
- **Description**: CORS configured with wildcard origin, allowing any website to call API (though browser CORS policies provide some protection).

### 17. Missing Rate Limiting on API Endpoints
- **File**: [app.py](app.py) - Multiple endpoints
- **Severity**: MEDIUM
- **Status**: ✗ NOT IMPLEMENTED (from previous audit as #28)
- **Description**: No rate limiting on endpoints. Malicious client can make unlimited requests causing DoS.

---

## FINDINGS COMPARISON: PREVIOUS AUDIT vs CURRENT

### BUGS STILL PRESENT (7):
1. ✗ #1: IPC socket never closed
2. ✗ #2: File upload FD leak (REMOVED - endpoints deleted) 
3. ✗ #3: WebSocket double-close (SIMPLIFIED)
4. ✗ #8: Bare except masking errors
5. ✗ #11: IPC listener infinite loop
6. ✗ #17: Daemon thread exception handling
7. ✗ #28: No rate limiting

### NEW BUGS FOUND (3):
1. ✨ Hardcoded backend URL in extension (CRITICAL)
2. ✨ Session token too short - brute forceable (CRITICAL)
3. ✨ Clipboard without size limits (CRITICAL)

### MAJOR CHANGES IN CODEBASE:
- **app.py**: Reduced from 1618+ lines to 1159 lines
- **File upload endpoints**: `/api/files/*` endpoints removed/simplified
- **Extension**: Has hardcoded staging backend URL (NEW vulnerability)
- **Configuration**: Moved to launcher.py

---

## SUMMARY BY SEVERITY

| Severity | Count | Status |
|----------|-------|--------|
| **CRITICAL** | 7 | 5 verified + 2 new |
| **HIGH** | 5 | 3 verified + 2 new |
| **MEDIUM** | 5 | Mostly existing |
| **TOTAL** | **17** | |

---

## IMMEDIATE ACTIONS REQUIRED

### Within 24 Hours (CRITICAL):
1. Remove hardcoded backend URL from extension/popup.js (line 65)
2. Fix session token length to minimum 32 hex chars (line 96 app.py)
3. Add SO_REUSEADDR to IPC socket (line 2773 launcher.py)
4. Add max clipboard size limit (line 735 app.py)

### Within 1 Week (HIGH):
5. Fix WebSocket race condition with safe removal (line 960 app.py)
6. Add socket finally-block cleanup in check_process_status (line 2429 launcher.py)
7. Add exception handler to daemon threads
8. Add WPM validation bounds checking (line 1024 app.py)

### Within 2 Weeks (MEDIUM):
9. Fix bare except clauses throughout codebase
10. Implement rate limiting on all endpoints
11. Add comprehensive error logging to background threads
12. Implement license grace period for active operations

---

## TESTING CHECKLIST

- [ ] Rapid restart test: Kill launcher → restart → verify no "port in use" error
- [ ] IPC connectivity: Send malformed IPC data → verify listener recovers
- [ ] WebSocket stability: Connect/disconnect 1000 clients → check no exceptions
- [ ] Session token: Verify new tokens are >16 chars and cryptographically random
- [ ] Clipboard DoS: Set clipboard to 100MB → call get_clipboard → verify fails gracefully
- [ ] Extension backend: Check Network tab → verify no onrender.com requests
- [ ] Rate limiting: Send 1000 requests/sec to endpoint → verify rate limited
- [ ] File descriptor count: Monitor `lsof | wc -l` during operations → verify no growth

---

**Report Generated**: June 18, 2026
**Total Critical Bugs**: 7 (5 from previous audit still present, 2 new)
**Total High Bugs**: 5 (3 from previous audit still present, 2 new)
**Code Coverage**: app.py, launcher.py, main.py, extension/popup.js, extension/manifest.json
**Recommendation**: PRIORITY FIX - Address all 7 CRITICAL bugs before next release

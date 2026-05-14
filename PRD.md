# 📝 Product Requirements Document (PRD): GlidePass

**Status:** Draft / Active Development  
**Author:** Nithin  
**Version:** 1.2 (Final Refinement)

---

## 1. Product Vision
GlidePass turns a smartphone into a low-latency input companion for laptops and desktops, enabling instant local text transfer, human-like typing simulation, and real-time synchronization without relying on cloud services.

## 2. Problem Statement
Users frequently need to move text (links, credentials, code snippets, or notes) from their mobile devices to their laptops. Existing solutions (cloud notes, messaging themselves) are slow, require internet access, and are often blocked by corporate firewalls or restricted environments where clipboard pasting is disabled.

## 3. Goals & Objectives
*   **High-Speed Transfer:** Near real-time transfer with perceived latency below 50ms.
*   **Restricted Environment Support:** Human-like typing simulation for environments where direct clipboard pasting is unavailable or restricted.
*   **Privacy First:** Ensure all data remains on the local Wi-Fi network.
*   **Ease of Use:** One-click server start and QR-based mobile connection.

## 4. Target Audience
*   **Developers:** Moving code snippets from mobile documentation to IDEs.
*   **Students:** Quick notes transfer from phone to assignment docs.
*   **Privacy-Focused Users:** Transferring sensitive text snippets or temporary credentials without intentional long-term persistence.

## 5. System Architecture & Request Flow

### Components:
*   **FastAPI Backend (Host)**: Core logic server and QR generation.
*   **Keyboard Simulation Engine**: System-level injection (pyautogui/AppleScript).
*   **Mobile Browser UI**: Cross-platform controller.

### Request Flow:
1.  **Launch**: User starts GlidePass server on Laptop.
2.  **Discovery**: Backend generates session token + QR code based on local IP.
3.  **Pairing**: Mobile scans QR and establishes WebSocket/HTTP connection.
4.  **Submission**: User submits text from mobile controller.
5.  **Injection**: Keyboard engine executes events on the active host window.
6.  **Feedback**: Success/Error status is pushed back to the mobile UI.

## 6. Functional Requirements

### FR-01: Local Backend Server
*   The system must run a FastAPI server locally on the host machine.
*   The server must be startable via a custom macOS protocol (`glidepass://`) from a browser extension.

### FR-02: Mobile Controller Interface
*   Must support multiple modes: Flash (Paste), Type (Simulated), Inject (Cleaned), and Live Sync.

### FR-03: Human-Like Typing Simulation
*   Simulate keyboard events with configurable WPM and human-like timing variance.
*   Handle IDE auto-indentation by clearing leading whitespace on new lines.

### FR-04: Live Synchronization
*   Synchronize changes via WebSockets with update frequency < 50ms.
*   Automatic handling of connection loss and session resync.

### FR-05: Bidirectional Clipboard
*   Mobile client must be able to request and view the host's current clipboard content.

## 7. Platform & Connection Requirements

### Platform Permissions:
*   **macOS**: Accessibility permissions (for keyboard simulation) and Clipboard access.
*   **Windows**: Keyboard hook permissions and Clipboard access.

### Connection Constraints (MVP):
*   **1:1 Ratio**: One active host machine to one active mobile controller.
*   **Local Only**: Both devices must be on the same sub-network.

## 8. Security & Data Handling
*   **No Intentional Long-Term Persistence**: Data exists only in temporary memory (RAM) during active sessions and is removed after transfer completion.
*   **Session Security**: Device pairing via QR code containing temporary, non-reusable session tokens.
*   **Auto-Expiry**: Automatic session termination after 15 minutes of inactivity.

## 9. Failure Scenarios & Error Handling
*   **Focus Loss**: Typing engine must pause if the host's target window loses focus.
*   **Network Drop**: Mobile UI shows immediate "Disconnected" state if the heartbeat fails.
*   **Conflict Handling**: If the host is manually typing, the remote engine should yield or notify the user.

## 10. Competitive Advantage

| Feature | GlidePass | KDE Connect | Pushbullet | Phone Link |
| :--- | :---: | :---: | :---: | :---: |
| **Internet Needed** | **No** | No | Yes | Partial |
| **Anti-Paste Bypass**| **Yes** | No | No | No |
| **Live Typing** | **Yes** | Partial | No | No |
| **Local Only** | **Yes** | Yes | No | Partial |

## 11. MVP vs Future Scope

### Phase 1 (In-Scope):
*   Local FastAPI server & Standalone Binary.
*   QR-pairing & Type simulation.
*   Basic Live Sync.

### Out of Scope (Phase 1):
*   Internet-based/Remote synchronization.
*   Cloud storage or history persistence.
*   File transfer / Screen sharing.
*   Multi-user collaboration.

## 12. Success Metrics

| Metric | Target |
| :--- | :--- |
| **First-time setup** | < 2 min |
| **Typing response** | < 50 ms |
| **Successful transfer rate** | ≥ 95% |
| **Average transfer completion** | < 3 sec |
| **User retention after first use** | ≥ 60% |

---
*End of PRD*

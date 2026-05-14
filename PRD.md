# 📝 Product Requirements Document (PRD): GlidePass

**Status:** Draft / Active Development  
**Author:** Nithin  
**Version:** 1.1 (Improved)

---

## 1. Product Vision
GlidePass turns a smartphone into a low-latency input companion for laptops and desktops, enabling instant local text transfer, human-like typing simulation, and real-time synchronization without relying on cloud services.

## 2. Problem Statement
Users frequently need to move text (links, credentials, code snippets, or notes) from their mobile devices to their laptops. Existing solutions (cloud notes, messaging themselves) are slow, require internet access, and are often blocked by corporate firewalls or "anti-paste" restrictions on specific websites.

## 3. Goals & Objectives
*   **Zero-Latency Transfer:** Eliminate the need for cloud intermediaries.
*   **Bypass Restrictions:** Allow text input on websites that disable the "Paste" function.
*   **Privacy First:** Ensure all data remains on the local Wi-Fi network.
*   **Ease of Use:** One-click server start and QR-based mobile connection.

## 4. Target Audience
*   **Developers:** Moving code snippets from mobile documentation to IDEs.
*   **Students:** Quick notes transfer from phone to assignment docs.
*   **Security-Conscious Users:** Transferring sensitive text snippets or temporary credentials without cloud persistence.

## 5. System Architecture
**Laptop/Desktop (Host):**
*   **FastAPI Backend**: Core logic server.
*   **Clipboard Manager**: System-level clipboard access.
*   **Keyboard Simulation Engine**: `pyautogui` / AppleScript integration.
*   **QR Generation Service**: Local IP-based discovery.

**Mobile (Controller):**
*   **Browser-Based UI**: Cross-platform web interface.
*   **WebSocket Client**: For real-time typing events.

**Communication:**
*   **Local Wi-Fi Channel**: Secure HTTP/WebSocket communication between host and mobile.

## 6. Functional Requirements

### FR-01: Local Backend Server
*   The system must run a FastAPI server locally on the host machine.
*   The server must be startable via a custom macOS protocol (`glidepass://`) from a browser extension.

### FR-02: Mobile Controller Interface
*   A web-based interface accessible via mobile browser.
*   Must support multiple modes: Flash (Paste), Type (Simulated), Inject (Cleaned), and Live Sync.

### FR-03: Typing Simulation (Anti-Paste Bypass)
*   The system must simulate keyboard events using `pyautogui`.
*   Support for configurable WPM (Words Per Minute).
*   Must handle IDE auto-indentation issues by clearing whitespace on new lines.

### FR-04: Live Synchronization
*   Synchronize changes using WebSocket events with update frequency < 50ms.
*   Support for character addition, deletion, and basic cursor tracking.
*   Automatic handling of connection loss and resync.

### FR-05: Bidirectional Clipboard
*   The mobile device must be able to "pull" the laptop's current clipboard content.

## 7. Security & Privacy Requirements
*   **Local Only:** No data persistence; traffic never leaves the local network.
*   **Session Security:** Device pairing via QR code containing temporary session tokens.
*   **Auto-Expiry:** Automatic session termination after periods of inactivity.
*   **Data Integrity:** Optional PIN-based authentication for sensitive transfers.
*   **No Trace:** No data is stored on the host machine once the transfer is complete.

## 8. Failure Scenarios & Error Handling
*   **Network Disconnect:** Mobile UI must show an "Offline" status if the local Wi-Fi connection drops.
*   **Host Sleep:** System should attempt to keep the backend alive or notify the mobile client if the laptop enters sleep mode.
*   **Focus Loss:** If the target window on the laptop loses focus, the typing engine should pause to avoid "ghost typing."
*   **QR Expiration:** Generated QR codes should be valid for a limited time to prevent unauthorized access.

## 9. Competitive Advantage

| Feature | GlidePass | KDE Connect | Pushbullet | Phone Link |
| :--- | :---: | :---: | :---: | :---: |
| **Internet Needed** | **No** | No | Yes | Partial |
| **Anti-Paste Bypass**| **Yes** | No | No | No |
| **Live Typing** | **Yes** | Partial | No | No |
| **Local Only** | **Yes** | Yes | No | Partial |

## 10. Roadmap: MVP vs Future

**MVP (Phase 1):**
*   Local FastAPI server & Standalone Executable.
*   QR-based pairing.
*   Flash & Type modes (Keyboard simulation).
*   Clipboard pull from laptop.

**Future Features (Phase 2):**
*   Full WebSocket-based Live Sync.
*   Multi-device "Target" switching.
*   Local File Transfer.
*   Voice-to-Text injection.

## 11. Success Metrics
*   **Setup Time:** Under 2 minutes for first-time users.
*   **Reliability:** $\ge 95\%$ successful text injection across supported apps and browser environments.
*   **Usage:** Reduction in "Message to self" workflows for local text transfer.

---
*End of PRD*

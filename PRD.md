# 📝 Product Requirements Document (PRD): GlidePass

**Status:** Draft / Active Development  
**Author:** Nithin  
**Version:** 1.0  

---

## 1. Product Overview
**GlidePass** is a cross-device productivity bridge that allows users to treat their mobile device as a secondary input peripheral for their laptop/desktop. It enables seamless text transfer, human-like typing simulation, and real-time clipboard synchronization over a local network.

## 2. Problem Statement
Users frequently need to move text (links, passwords, code snippets, or notes) from their mobile devices to their laptops. Existing solutions (cloud notes, messaging themselves) are slow, require internet access, and are often blocked by corporate firewalls or "anti-paste" restrictions on specific websites.

## 3. Goals & Objectives
*   **Zero-Latency Transfer:** Eliminate the need for cloud intermediaries.
*   **Bypass Restrictions:** Allow text input on websites that disable the "Paste" function.
*   **Privacy First:** Ensure all data remains on the local Wi-Fi network.
*   **Ease of Use:** One-click server start and QR-based mobile connection.

## 4. Target Audience
*   **Developers:** Moving code snippets from mobile documentation to IDEs.
*   **Students:** Quick notes transfer from phone to assignment docs.
*   **Security-Conscious Users:** Transferring passwords without using a cloud clipboard.

## 5. Functional Requirements

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
*   Real-time diffing between mobile input and laptop cursor.
*   Support for both character addition and backspacing.

### FR-05: Bidirectional Clipboard
*   The mobile device must be able to "pull" the laptop's current clipboard content.

## 6. Non-Functional Requirements
*   **Security:** Data must stay within the local network (no external APIs for text).
*   **Performance:** Typing lag should be less than 50ms for Live Sync.
*   **Compatibility:** Must work on macOS and Windows.
*   **Portability:** Bundled as a standalone executable via PyInstaller.

## 7. User Flow
1. User opens Chrome Extension -> Clicks **Start Server**.
2. Extension triggers `GlidePassStarter.app` via protocol handler.
3. User scans QR code on phone.
4. User types/pastes on phone -> Selects **Mode** -> Text appears on Laptop.

## 8. Success Metrics
*   **Setup Time:** Under 2 minutes for first-time users.
*   **Reliability:** 100% success rate for text injection on restricted fields.
*   **Usage:** Reduction in the use of "Message to self" for text transfer.

---
*End of PRD*

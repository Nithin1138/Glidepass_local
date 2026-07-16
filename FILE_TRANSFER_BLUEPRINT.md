# LANpad File Transfer Blueprint

This document covers the file transfer feature for the LANpad desktop app and its connected mobile/web experience. It is a separate extension of the main desktop app blueprint and focuses specifically on how file transfer should work, what screens and components are needed, and how the experience should feel.

---

## 1. Purpose of File Transfer

File transfer is a natural extension of LANpad’s core value: moving useful content quickly between devices without friction. It should support sending files from the phone or browser to the desktop app, and from the desktop app to the connected device when needed.

The file transfer experience should feel:
- fast
- trustworthy
- simple
- private
- polished

---

## 2. Core Goal

The file transfer flow should enable users to:
- send files from phone to desktop
- receive files on the desktop app locally
- preview incoming files before accepting them
- keep the experience lightweight and local-first
- avoid unnecessary setup or account requirements

---

## 3. Where File Transfer Fits in LANpad

File transfer is not just a side feature. It should be considered part of the larger content-sharing system alongside:
- text transfer
- snippets and resource sharing
- clipboard rooms
- local device pairing

It should support scenarios such as:
- sending a screenshot or document from phone to laptop
- sharing a file with a teammate in the same room
- moving a code file or note quickly between devices
- transferring a resource attachment into the desktop workflow

---

## 4. File Transfer Use Cases

### A. Phone to Desktop
User wants to send a file from their phone to their laptop.

Example:
- screenshot
- PDF
- document
- image
- code archive
- note file

### B. Desktop to Phone
User wants to send a file back to their phone.

Example:
- exported note
- generated image
- downloaded resource
- project export

### C. Quick Share Between Devices
User wants to send a file temporarily to a nearby device or collaborator.

### D. Resource Attachment Support
A resource shared through the website experience may include a file attachment.

---

## 5. File Transfer Experience Principles

The experience should follow these principles:
1. Make it obvious how to send a file
2. Keep transfer progress visible and clear
3. Always show success or failure clearly
4. Prefer local transfer over cloud dependency
5. Make the process feel lightweight and modern

---

## 6. Main File Transfer Flow

### Flow 1: Send from Phone to Desktop
1. User opens LANpad on the desktop app
2. Device is connected and ready
3. User selects file on phone or browser
4. File is sent over local connection
5. Desktop app receives the file
6. User sees preview or save prompt
7. File is saved into a chosen destination

### Flow 2: Send from Desktop to Phone
1. User chooses a file on desktop
2. File is packaged and sent to connected device
3. Phone/browser receives the transfer prompt
4. User accepts or declines the transfer
5. File is saved locally on the receiving device

### Flow 3: Quick Share / Temporary Transfer
1. User creates a quick transfer session
2. A temporary share token or room is created
3. Another device joins or scans the invite
4. File is transferred securely over the local connection
5. Session closes after completion or timeout

---

## 7. File Transfer Screens and Pages

### 1. File Transfer Entry Point
Purpose:
- let the user start a transfer quickly

Why it is needed:
- file transfer should feel discoverable, not hidden

Content:
- “Send a file”
- “Receive a file”
- “Quick share”

### 2. File Picker / Select File Screen
Purpose:
- allow the sending device to choose a file

Why it is needed:
- users need a clear way to pick content

Elements:
- drag-and-drop area
- browse button
- recent files list
- file type badges

### 3. Transfer Preview Screen
Purpose:
- show the incoming file before acceptance

Why it is needed:
- users should know what they are receiving

Elements:
- filename
- file type
- size
- sender info
- preview thumbnail if available
- accept / reject buttons

### 4. Transfer Progress Screen
Purpose:
- show the active upload or download state

Why it is needed:
- progress feedback reduces uncertainty

Elements:
- progress bar
- transfer speed indicator
- remaining time estimate
- cancel button

### 5. Transfer Complete / Success Screen
Purpose:
- confirm success cleanly

Why it is needed:
- small success feedback makes the feature feel polished

Elements:
- success icon
- file name
- “Open file” or “Open folder” action
- “Send another” action

### 6. Transfer Error / Retry Screen
Purpose:
- handle failures gracefully

Why it is needed:
- users need clarity when something goes wrong

Elements:
- error title
- short explanation
- retry button
- help text

### 7. Files History / Recent Transfers Screen
Purpose:
- show previously transferred files

Why it is needed:
- users often want to revisit recent file moves

Elements:
- file list
- timestamp
- source/destination info
- open or re-send actions

---

## 8. File Transfer Components

### Core components
- file card
- file preview tile
- progress bar
- transfer badge
- send button
- receive prompt
- recent files list
- destination picker
- transfer summary panel

### UI elements
- drag-and-drop zone
- file metadata row
- thumbnail preview
- action buttons
- status chips
- success/error banners

---

## 9. File Transfer Interaction Behaviors

### Upload behavior
- user selects file
- system validates file type and size
- transfer begins
- user sees progress
- transfer completes and shows confirmation

### Download behavior
- receiving device gets a notification or preview prompt
- user accepts or declines
- file saves to a destination folder
- success is confirmed

### Retry behavior
- if interrupted, the user can retry
- if the connection is lost, the app should preserve the transfer state where possible

---

## 10. File Transfer States

The file transfer system should clearly support these states:
- idle
- selecting file
- preparing transfer
- in progress
- paused / interrupted
- completed
- failed
- declined

Each state needs a visible UI treatment.

---

## 11. File Transfer UX Requirements

### Must-have UX qualities
- very clear start and finish states
- low friction for first-time use
- strong feedback during transfer
- confidence that the file is safe and local
- graceful handling of large files

### Good interaction design
- one-click transfer from the resource or content view when relevant
- clear accept/reject prompts for incoming transfer
- the app should not feel like a generic file-sharing utility
- the experience should match the premium LANpad design language

---

## 12. Supported File Types

The system should support common files such as:
- images
- PDFs
- documents
- text files
- code files
- archives
- screenshots
- audio/video if later supported

The UI should show a friendly file type badge and a clear preview when supported.

---

## 13. File Handling Requirements

### File metadata
Show:
- file name
- type
- size
- sender
- time received
- destination path

### File destination
The desktop app should allow users to choose:
- Downloads folder
- Desktop
- specific project folder
- custom destination

### File safety
- show warning for suspicious or large files if needed
- avoid risky automatic execution of unknown files
- treat file transfer as a controlled local experience

---

## 14. Desktop App File Transfer Placement

The feature should appear in the desktop app in these main places:
- Home dashboard as a quick action card
- Resource page when a resource contains an attachment
- Quick share panel for temporary sharing
- History or recent activity section
- Settings if transfer preferences are configured

---

## 15. Visual Design Direction for File Transfer

The file transfer UI should feel polished and calm.

### Style direction
- clear cards for each transfer
- soft progress states
- premium dark/light surfaces
- subtle motion and success feedback
- focused, premium feel

### Visual treatment
- strong focus on the current transfer item
- use iconography and metadata instead of clutter
- clean empty states for no transfers yet

---

## 16. Important Missing Details to Include

The file transfer system should also define:
- maximum file size behavior
- unsupported file warning
- local folder selection behavior
- notifications for incoming files
- cancellation and resume behavior
- transfer history retention
- file preview capability
- security prompts for unknown files
- cross-device compatibility expectations

---

## 17. Recommended File Transfer Module Structure

The app should organize file transfer into these modules:
1. File picker and selection
2. Transfer manager
3. Transfer state controller
4. Preview and acceptance UI
5. Save destination handler
6. History and recent transfer record
7. Error handling and retry logic

---

## 18. Final Summary

File transfer should be treated as a first-class capability inside LANpad, not an extra feature. It should work seamlessly with the app’s local pairing, resource sharing, and clipboard workflows and feel as polished and premium as the rest of the product.

The experience should be:
- simple to start
- clear during transfer
- polished at completion
- private and local-first
- fully aligned with the LANpad product vision

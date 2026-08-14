# 📄 LANpad (GlidePass) — Comprehensive Project & Interview Master Guide

> **Project Name:** LANpad (GlidePass)  
> **Repository:** `https://github.com/Nithin1138/Glidepass_local`  
> **Target Audience:** Engineering Candidates, Technical Interviewers, System Designers & Software Engineers  
> **Tech Stack:** Flutter (Dart), Next.js 15 (React 19, TypeScript), PostgreSQL, Prisma ORM, WebSockets, Cloudflare Tunnels, C++ (Win32 API), GitHub Actions CI/CD, TailwindCSS, Framer Motion.

---

## 🎯 1. Resume Bullet Points (3-Line Summary for CV)

1. **Cross-Platform System Architecture:** Engineered **LANpad**, a full-stack real-time clipboard and file sharing ecosystem (Flutter/Dart desktop & mobile apps + Next.js 15/TypeScript web app) supporting zero-configuration mDNS local discovery and Cloudflare WebSocket relay tunneling across Windows, macOS, Android, iOS, and Web.
2. **Serverless Streaming & Chunking Infrastructure:** Architected a chunked binary upload pipeline that bypassed Vercel serverless 4.5MB payload limits, processing 100MB+ file uploads via 2MB chunked streams into PostgreSQL/Supabase with zero disk I/O and zero server memory footprint.
3. **Automated CI/CD & Firewall Bypass Engineering:** Implemented automated multi-OS GitHub Actions CI/CD matrix pipelines and self-healing PowerShell/Bash installers that bypassed enterprise campus Wi-Fi firewall blocks (FortiGate Category 37) using fallback CDN mirrors and dynamic DLL dependency flattening.

---

## 🎙️ 2. Project Elevator Pitches

### 30-Second Elevator Pitch
"LANpad is an open-source, ultra-fast cross-platform clipboard and file-sharing application that seamlessly bridges content between desktop, mobile, and web browsers. Built using Flutter for cross-platform desktop/mobile and Next.js 15 for the web, it allows users to transfer text snippets, images, and large files in under 1 second either over local Wi-Fi via mDNS P2P or remotely through Cloudflare WebSocket relay tunnels—without needing account logins or manual pairing."

### 2-Minute Deep Technical Pitch
"LANpad solves the friction of sharing copy-pasted text, screenshots, and files across personal devices on different operating systems. On the desktop and mobile side, I built Flutter client applications utilizing native C++ Win32 extensions and macOS Menubar handlers for background system tray operation and instant local device discovery using mDNS/Zeroconf. 

On the web side, I developed a Next.js 15 App Router web application with real-time temporary room code synchronization. To handle large file transfers on serverless platforms like Vercel—which strictly enforce a 4.5MB payload limit—I engineered a client-side binary chunking protocol that breaks files into 2MB chunks, streams them to a serverless API, and reassembles them in PostgreSQL/Supabase DB without writing to ephemeral disk or causing server memory spikes.

To overcome enterprise campus Wi-Fi firewalls (like FortiGate proxy blocks) that block custom domains and app downloads, I designed a multi-mirror fallback installer architecture in PowerShell and Bash that dynamically pulls raw script representations and pre-compiled Flutter bundles from GitHub CDN mirrors with automated DLL dependency resolution."

---

## 🏗️ 3. System Architecture & High-Level Design

```
+-----------------------------------------------------------------------------------+
|                                  LANpad Ecosystem                                 |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +---------------------------+                      +--------------------------+  |
|  | Flutter Desktop / Mobile  |                      | Next.js 15 Web Client    |  |
|  | (Windows, macOS, Mobile)  |                      | (TypeScript, React 19)   |  |
|  +-------------+-------------+                      +------------+-------------+  |
|                |                                                 |                |
|                | mDNS / Zeroconf                                 | HTTP / SSE /   |
|                | (Local Wi-Fi P2P)                               | WebSockets     |
|                v                                                 v                |
|  +-------------+-------------+                      +------------+-------------+  |
|  | Local WebSocket Bridge    |<====================>| Next.js Serverless API   |  |
|  | (Direct P2P Transfer)     |  Cloudflare Relay    | (Vercel / Node.js)       |  |
|  +---------------------------+  WebSocket Tunnel    +------------+-------------+  |
|                                                                  |                |
|                                                                  v                |
|                                                     +------------+-------------+  |
|                                                     | PostgreSQL / Supabase    |  |
|                                                     | (Prisma ORM - Chunks DB) |  |
|                                                     +--------------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Components Breakdown:
1. **Desktop & Mobile Application (`/lanpad_mobile`)**:
   - **Framework:** Flutter 3.x with Dart.
   - **Native Layer:** C++ Win32 Runner (`flutter_window.cpp`) for custom window controls & `system_tray_plugin` for background tray integration; AppleScript/Swift hooks for macOS menu bar.
   - **Networking:** `http`, `web_socket_channel`, and `nsd` (Network Service Discovery for mDNS/Zeroconf local peer detection).
2. **Web Application & Backend API (`/website-v2`)**:
   - **Framework:** Next.js 15 (App Router), React 19, TypeScript.
   - **Styling & UI:** TailwindCSS, Vanilla CSS glassmorphism token system, Framer Motion for micro-animations.
   - **Database & State:** PostgreSQL / Supabase, Prisma ORM, Server-Sent Events (SSE) & REST endpoints for real-time room state sync.
3. **Installer & Deployment Pipeline (`.github/workflows/ci-cd.yml`, `install.ps1`, `install-windows.ps1`, `install-mac.sh`)**:
   - Automated multi-OS GitHub Actions workflow.
   - PowerShell & Bash self-healing installation scripts with multi-mirror CDN fallbacks (`curl.exe -sL -f` and `System.Net.WebClient`).

---

## 🛠️ 4. Key Methodologies & Software Engineering Patterns

### 1. Serverless Payload Limitation Bypass (Chunked Stream Uploader)
- **Problem:** Vercel serverless functions enforce a strict **4.5MB request body size cap** and ephemeral stateless execution (no persistent `/tmp` disk storage).
- **Solution:** Designed a client-side chunked upload protocol (`uploadSingleFile`). Files up to 100MB are sliced into 2MB binary chunks on the client browser (`File.slice()`), transmitted via individual HTTP POST requests with metadata headers (`uploadId`, `chunkIndex`, `totalChunks`), stored as base64 byte streams in PostgreSQL, and streamed back on demand.

### 2. Enterprise Proxy & Campus Wi-Fi Bypass Architecture
- **Problem:** Campus and corporate Wi-Fi firewalls (e.g., FortiGate, Palo Alto) block new app domains (`lanpad.app`) under Category 37 (File Sharing) and intercept PowerShell `irm` downloads, returning HTML block pages.
- **Solution:**
  1. Created explicit Next.js plain-text route handlers (`/install-windows.ps1/route.ts`) serving scripts with explicit `text/plain` headers.
  2. Implemented primary raw CDN mirrors (`raw.githubusercontent.com`) unaffected by domain blocking.
  3. Upgraded PowerShell scripts to use native `curl.exe -sL -f` and `WebClient` with strict file size validation (`> 1MB`), silently discarding HTML block responses and failing over to secondary mirrors.

### 3. Flutter Windows Plugin DLL Dependency Flattening
- **Problem:** Bare `LANpad.exe` compiled by Flutter requires companion plugin DLLs (`screen_retriever_windows_plugin.dll`, `permission_handler_windows_plugin.dll`, `system_tray_plugin.dll`, `url_launcher_windows_plugin.dll`) located in the same directory. Downloading standalone `.exe` without DLLs causes Windows to crash with "System Error: DLL not found".
- **Solution:**
  1. Modified GitHub Actions CI/CD to package all binaries into `LANpad-Windows.zip` and suppressed bare `.exe` uploads to prevent incomplete user downloads.
  2. Added recursive directory scanning and automatic directory flattening to `install-windows.ps1` to move extracted DLLs from nested zip subfolders directly to `%LOCALAPPDATA%\LANpad\`.

### 4. Zero-Permission HTML5 Clipboard Integration
- **Implementation:** Leveraged `navigator.clipboard.read()` and `navigator.clipboard.readText()` to build a 1-click **"📋 Paste Clipboard"** button and global `Ctrl+V`/`Cmd+V` event listeners, allowing instant capture of rich text, pasted screenshots/images, and binary file streams into active room sessions.

---

## ❓ 5. Top 20 Technical Interview Questions & Expert Answers

### Q1: How does LANpad handle real-time synchronization between desktop apps and web clients without account registration?
**Answer:** LANpad utilizes an **ephemeral room code system** combined with a hybrid connection model. On the local network, devices use mDNS (Multicast DNS) to discover peers automatically and establish direct HTTP/WebSocket connections over local IP addresses. For cross-network or remote web clients, LANpad uses short-lived 6-digit room codes generated via Next.js API endpoints. Clients subscribe to Server-Sent Events (SSE) or WebSockets on the room ID to receive instant broadcast updates whenever text or files are added.

### Q2: How did you overcome Vercel's 4.5MB request payload limit for uploading 100MB files?
**Answer:** Vercel serverless functions return HTTP 413 (Payload Too Large) for requests exceeding 4.5MB. To solve this without requiring external S3 infrastructure, I implemented a client-side chunked upload algorithm:
1. The client slices the file into 2MB binary chunks using `Blob.prototype.slice()`.
2. Each 2MB chunk is POSTed to `/api/clipboard/upload` with headers indicating `uploadId`, `chunkIndex`, and `totalChunks`.
3. The serverless function persists each 2MB chunk directly into PostgreSQL as base64 database records.
4. When all chunks arrive, the database records are joined or served directly as a continuous stream, keeping both serverless memory and payload size well within operational limits.

### Q3: Why did bare `LANpad.exe` fail with "DLL Not Found" errors on Windows, and how did you resolve it?
**Answer:** Flutter on Windows compiles client code into `LANpad.exe` but relies on dynamic link libraries (DLLs) generated by Flutter plugins (e.g., `screen_retriever_windows_plugin.dll`, `url_launcher_windows_plugin.dll`, `flutter_windows.dll`). If a user downloads `LANpad.exe` without these DLLs placed in the same working directory, Windows PE loader cannot resolve the symbol table and throws a system error. 
To resolve this:
1. I modified `.github/workflows/ci-cd.yml` to remove bare `LANpad.exe` from GitHub Release artifacts and publish only `LANpad-Windows.zip` containing the full Flutter release folder.
2. I updated the PowerShell installer script (`install-windows.ps1`) to automatically clean old orphaned files, extract `LANpad-Windows.zip`, and recursively flatten any nested subfolders so all `.dll` files and `LANpad.exe` reside in `%LOCALAPPDATA%\LANpad\`.

### Q4: How did you solve campus Wi-Fi firewall blocks (FortiGate Category 37) intercepting script downloads?
**Answer:** University campus Wi-Fi networks often use FortiGate or Palo Alto firewalls that categorize custom app domains (like `lanpad.app`) under Category 37 (File Sharing) and intercept HTTP requests, returning an HTML block page instead of the PowerShell script. When piped into `iex` (`Invoke-Expression`), PowerShell fails with command not found errors because it attempts to execute HTML code.
I solved this by:
1. Creating explicit Next.js route handlers (`/install-windows.ps1/route.ts`) serving scripts with explicit `text/plain; charset=utf-8` and `no-cache` response headers.
2. Setting primary download mirrors to GitHub's raw CDN (`raw.githubusercontent.com`), which is whitelisted on campus networks.
3. Updating PowerShell scripts to use native `curl.exe -sL -f` with strict file size checks (`(Get-Item $Path).Length -gt 1MB`), rejecting HTML block pages and automatically falling over to alternate CDN mirrors.

### Q5: What state management strategy is used in the Next.js web application?
**Answer:** The Next.js web application (`website-v2`) uses React 19 functional hooks (`useState`, `useEffect`, `useRef`, `useCallback`) optimized for high-frequency real-time updates. State is modularized into Room State (room code, expiration, active users, write permissions), File Upload State (`stagedFiles` array, upload progress percentage), and UI State (dark mode, modal toggles, interactive user profile editing). Local persistence for room codes and display names is managed via `localStorage` synchronization hooks.

### Q6: How does the mDNS (Zeroconf) local discovery mechanism work in the Flutter client?
**Answer:** In the Flutter client (`lanpad_mobile`), device discovery uses the `nsd` package implementing Multicast DNS (RFC 6762). When LANpad starts on a local network, it advertises a service record `_lanpad._tcp` with the device hostname, port, and IP address. Other LANpad instances listening on `_lanpad._tcp` receive discovery events, automatically adding local peers to the active device list without requiring central server registration or internet connectivity.

### Q7: How do you prevent memory leaks when users drag-and-drop or paste large images into the browser?
**Answer:** When staging files or pasted images in the browser UI, generating base64 data URLs in React state consumes double memory and causes GC lag. To prevent this, LANpad uses `URL.createObjectURL(file)` to generate instant, zero-copy local object URLs for image preview thumbnails. When a file is removed or successfully uploaded, `URL.revokeObjectURL(url)` is called to release memory back to the browser engine immediately.

### Q8: How is security handled for temporary clipboard rooms?
**Answer:** 
1. **Time-To-Live (TTL):** Temporary rooms automatically expire after 1 to 24 hours. Cleanup background cron jobs purge expired records and file chunks from PostgreSQL.
2. **Access Control:** Room Hosts can toggle write permissions (`allowAllMembersToAdd`) in real-time, restricting item uploads to the Host session ID only.
3. **Session Identification:** Every user is assigned a cryptographic UUID session ID stored in `sessionStorage`, enforcing host privileges without requiring user authentication accounts.

### Q9: What is the CI/CD deployment pipeline architecture for this repository?
**Answer:** The project uses **GitHub Actions** (`.github/workflows/ci-cd.yml`) with a multi-OS build matrix (`ubuntu-latest`, `macos-latest`, `windows-latest`).
1. **Web App:** Pushing to `main` triggers Vercel automatic deployments for Next.js.
2. **Desktop Apps:** Creating git tags matching `v*` (e.g., `v1.3.7`) triggers the GitHub Actions matrix. The workflow installs Flutter, builds release binaries for macOS (`LANpad_macOS.dmg`) and Windows (`LANpad-Windows.zip`), and automatically publishes them to GitHub Releases via `softprops/action-gh-release`.

### Q10: How did you make the Left Sidebar fixed/pinned on desktop without layout breaks?
**Answer:** Using TailwindCSS utility classes, I set the left sidebar wrapper to `w-full lg:w-[400px] shrink-0 space-y-4 lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto`. `self-start` prevents Flexbox from stretching the sidebar to full height, while `lg:sticky lg:top-24` pins the sidebar smoothly in the viewport as the user scrolls through the right-hand column of clipboard items.

### Q11: Explain the database schema for handling clipboard items and file chunks in Prisma.
**Answer:** The database schema consists of two primary models:
1. `Room`: Holds `code` (unique primary key), `expiresAt`, `allowAllMembersToAdd`, and `hostSessionId`.
2. `ClipboardItem`: Holds `id`, `roomCode` (foreign key to `Room`), `title`, `content` (plain text or JSON metadata for files), `fileType`, `fileSize`, `uploadId`, and `createdAt`. File chunks are indexed by `uploadId` and `chunkIndex` for sequential retrieval.

### Q12: How does the direct clipboard paste feature work across browsers?
**Answer:** The `handlePasteClipboard` function uses the Asynchronous Clipboard API (`navigator.clipboard.read()`). When invoked:
1. It queries clipboard items and iterates through available MIME types.
2. If `image/*` or `application/*` types are found, it converts the blob into a `window.File` object and stages it into the `stagedFiles` array.
3. If `text/plain` is found, it populates `newContent`.
4. If `read()` permission is blocked, it seamlessly falls back to `navigator.clipboard.readText()` or listens to global window `paste` events (`Ctrl+V`/`Cmd+V`).

### Q13: What architectural patterns are used in the Flutter mobile/desktop codebase?
**Answer:** The Flutter app follows a **Clean Layered Architecture**:
- **Presentation Layer:** Reactive UI widgets (`StatCard`, `DeviceListItem`) using `Provider` / `ChangeNotifier` for state management.
- **Logic / Controller Layer:** `ClipboardNotifier` and `DeviceDiscoveryNotifier` managing state transitions and background network sockets.
- **Data / Infrastructure Layer:** Native HTTP/WebSocket services and mDNS discovery bindings.

### Q14: How did you implement cross-platform background operation for desktop?
**Answer:**
- **Windows:** Configured `system_tray_plugin` in `flutter_window.cpp` to minimize the application to the Windows System Tray notification area upon closing the window, keeping the background HTTP server running.
- **macOS:** Implemented macOS Menu Bar integration using AppleScript and Cocoa wrappers (`menubar_handler.py` / Swift runner) to display an active status icon in the macOS menu bar.

### Q15: How do you handle network connectivity drops or offline mode?
**Answer:** LANpad prioritizes local P2P connectivity over internet connectivity. If WAN internet access drops, local Wi-Fi mDNS discovery and local WebSocket transfers remain 100% operational between connected LAN devices. If WAN is restored, the client reconnects to the Cloudflare WebSocket relay automatically.

### Q16: What performance optimizations were applied to the Next.js frontend?
**Answer:**
1. **Dynamic Code-Splitting:** Heavy markdown/code rendering components (`FormattedMarkdown`) are dynamically imported to minimize initial JavaScript bundle size.
2. **Asset Optimization:** Next.js Image Optimization for SVG/PNG branding assets.
3. **CSS Layering:** Custom Vanilla CSS variables for glassmorphism tokens, avoiding Tailwind utility bloat.
4. **Debounced API Calls:** Polling and user inputs use debounced execution to reduce serverless invocation costs.

### Q17: How do you ensure multi-file uploads don't block the browser UI thread?
**Answer:** File uploads use asynchronous `XMLHttpRequest` upload objects wrapped inside JavaScript `Promise` chains (`uploadSingleFile`). Progress callbacks (`xhr.upload.onprogress`) update React progress bars without blocking the main event loop, allowing users to scroll, view existing items, or stage additional items concurrently.

### Q18: What trade-offs were made when choosing PostgreSQL database chunks vs AWS S3/Cloudflare R2?
**Answer:**
- **Trade-off:** Storing 2MB base64 chunks in PostgreSQL increases database storage size compared to dedicated blob storage (S3/R2).
- **Rationale:** Storing chunks in PostgreSQL eliminated the need for external cloud storage API keys, simplified single-database deployments, allowed automatic transactional room deletion, and avoided CORS/S3 bucket permission issues across diverse client platforms.

### Q19: How is legal and regulatory compliance handled in LANpad?
**Answer:** The repository includes a comprehensive legal compliance framework (`LEGAL_AUDIT_REPORT.md`, `BUSINESS_MODEL_README.md`, content policy, terms of service, and DMCA policy pages) explicitly documenting tool disclaimer policies, data privacy boundaries (no user PII collected), and intellectual property protection.

### Q20: What future scalability improvements would you introduce to LANpad?
**Answer:**
1. **WebRTC DataChannels:** Upgrade remote relay transfers from WebSocket servers to direct WebRTC P2P DataChannels for sub-100ms peer-to-peer file streaming.
2. **Cloudflare R2 Object Storage:** Migrate large file uploads from database chunks to presigned R2 URLs for direct client-to-storage uploads.
3. **End-to-End Encryption (E2EE):** Implement Web Crypto API WebAssembly AES-GCM encryption where room keys are derived strictly on client devices, making room content zero-knowledge to the server.

---

## 📊 Summary Checklist for Interview Preparation

- [x] Memorized 30-Second & 2-Minute Elevator Pitches.
- [x] Can explain how Vercel's 4.5MB payload limit was solved via 2MB chunked streams.
- [x] Can explain campus proxy block bypass (`curl.exe` fallback + GitHub raw CDN).
- [x] Can explain Flutter Windows DLL dependency flattening in `install-windows.ps1`.
- [x] Fluent in system architecture diagram (mDNS local P2P + Cloudflare Relay + Next.js + PostgreSQL).

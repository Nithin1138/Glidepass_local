# 🏛️ LANpad Legal Audit Report

**Date:** June 19, 2026  
**Project:** LANpad (GlidePass)  
**Status:** CRITICAL GAPS IDENTIFIED  
**Author:** Legal Compliance Review

---

## Executive Summary

LANpad is a **high-risk security and accessibility tool** that currently has **zero legal documentation** and faces significant liability exposure. The application explicitly enables keystroke injection to bypass paste-block restrictions—a feature that, while technically legitimate for accessibility, requires comprehensive legal safeguards before public release.

### Key Findings:
- ⛔ **NO Terms of Service, Privacy Policy, Disclaimer, or EULA** present
- 🔓 **Open CORS** with no access controls (allows any origin)- 🔑 **Keyboard injection capability** without prominent security warnings
- 📱 **Clipboard and accessibility permissions** not clearly disclosed
- 🚨 **Bypass bookmarklet** with controversial "bypass-backend" third-party integration
- 🇮🇳 **India jurisdiction issues** (VIT is in Chennai; project targets VIT students)
- 💾 **License headers missing** from all Python/JavaScript files
- 🛡️ **No acceptable-use policy** addressing proctoring bypass, credential theft, phishing

---

## 1. CURRENT STATE OF LEGAL DOCUMENTATION

### What Exists:
- ✅ **LICENSE file**: MIT License (dated 2026) — standard permissive open-source license
- ✅ **README.md**: Product overview with no legal disclaimers
- ✅ **BUSINESS_MODEL_README.md**: Revenue/positioning document
  - Mentions "clear acceptable-use policy" as future mitigation for misuse risks
  - No actual policy documented

### What's Missing (CRITICAL):
- ❌ **Terms of Service** — No user agreement, no liability disclaimers
- ❌ **Privacy Policy** — No data handling disclosure, retention policies
- ❌ **Accessibility Disclaimer** — No warning that keystroke injection may violate test/exam integrity policies
- ❌ **Acceptable Use Policy** — No restrictions on proctoring bypass, credential stuffing, or unauthorized access
- ❌ **End-User License Agreement (EULA)** — No restrictions on redistribution or modification
- ❌ **Security & Safety Warning** — No disclosure of risks (keyboard sniffing, local network exposure)
- ❌ **Copyright & Attribution** — No attribution for third-party libraries (pyautogui, pynput, rumps, etc.)
- ❌ **Changelog** — No version history or breaking changes documented
- ❌ **License headers in code** — No SPDX identifiers or copyright notices in any source files

---

## 2. CRITICAL LEGAL RISKS ASSESSMENT

### 2.1 Intellectual Property & License Compliance

**Risk Level: MEDIUM-HIGH**

#### Dependencies & License Compliance:

| Package | Version | License | Risk | Status |
|---------|---------|---------|------|--------|
| `fastapi` | ? | BSD 3-Clause | Low | ✅ Compatible |
| `uvicorn` | ? | BSD 3-Clause | Low | ✅ Compatible |
| `pyautogui` | ? | MIT | Low | ✅ Compatible |
| `pynput` | ? | MIT | Low | ✅ Compatible |
| `pyperclip` | ? | BSD 3-Clause | Low | ✅ Compatible |
| `rumps` | ? | MIT | Low | ✅ Compatible |
| `pydantic` | ? | MIT | Low | ✅ Compatible |
| `qrcode` | ? | BSD | Low | ✅ Compatible |
| `httpx` | ? | BSD 3-Clause | Low | ✅ Compatible |
| `next` | 16.2.6 | MIT | Low | ✅ Compatible |
| `react` | 19.2.4 | MIT | Low | ✅ Compatible |
| `pg` | 8.21.0 | MIT | Low | ✅ Compatible |

**Issues Found:**
- No `requirements.txt` or `setup.py` with pinned versions
- No SBOM (Software Bill of Materials) provided to users
- No license notices in code headers or generated binaries
- Potential GPL infection risk if any unlisted GPL dependencies exist

**Recommendation:**
- [ ] Create `requirements.txt` with exact versions and license info
- [ ] Add SPDX license headers to every Python/JS file
- [ ] Generate SBOM for binary releases
- [ ] Audit all transitive dependencies

---

### 2.2 Data Privacy & GDPR/CCPA Compliance

**Risk Level: MEDIUM**

#### Current Data Handling:

**What LANpad Processes:**
- Clipboard contents (text, potentially including passwords, API keys)
- User-supplied text via mobile UI
- Keystroke data (implicitly captured during "live sync" mode)
- Local IP address and device hostnames
- Session tokens (temporary, 8-character UUID)
- Hardware ID (for license verification)
- Configuration data (stored in `~/.lanpad/config.json`)

**Where Data Resides:**
- ✅ **Local network only** — data does NOT leave the user's LAN
- ✅ **In-memory processing** — most data is transient
- ⚠️ **Local file storage** — config file persists on disk
- ⚠️ **No encryption** — clipboard data stored/transmitted in plaintext over HTTP

**GDPR/CCPA Issues:**
1. **No Privacy Policy** — users don't know what data is collected/retained
2. **No data retention policy** — config files persist indefinitely
3. **No right to erasure mechanism** — users have no built-in way to delete local data
4. **No consent mechanism** — users are not explicitly asked to consent to clipboard access
5. **International data handling** — VIT is in India; no Indian DPA compliance mentioned

**Specific Concern — "VIT Student Data":**
- BUSINESS_MODEL_README.md targets "VIT Code Bank" feature for students
- If students store/paste academic credentials, exam questions, or personal data → potential FERPA, GDPR, and Indian student privacy violations
- No institutional agreement with VIT mentioned
- No data controller/processor relationship established

**Recommendation:**
- [ ] Create Privacy Policy explicitly stating:
  - What data is collected
  - Where it's stored (local-only, no cloud)
  - How long it's retained
  - What clipboard contents are accessible
  - User's right to delete data
- [ ] Implement automatic data cleanup (e.g., clear config after 30 days of inactivity)
- [ ] Add explicit user consent before accessing clipboard
- [ ] For VIT integration: obtain institutional agreement and add student data protections

---

### 2.3 Security Liability & Keystroke Injection

**Risk Level: HIGH**

#### The Core Issue:

LANpad explicitly enables **keystroke injection** ("Type Mode") to bypass paste-block restrictions on websites (HackerRank, safe-lock browsers, banking sites, exam proctoring software).

**Code Evidence (app.py:~800-900):**
```python
def perform_typing(text, wpm, is_coding=False):
    """Simulate human-like keyboard typing to bypass paste blocks."""
    # Uses Quartz (macOS) or pyautogui (Windows) to inject keystrokes
    # into any active window
```

**Legitimate Accessibility Use:**
- ✅ Users with disabilities who cannot use clipboard may need keystroke injection
- ✅ Some restricted environments (corporate, government) legitimately block paste

**Illegitimate / High-Risk Uses:**
- ❌ **Exam/Proctoring Bypass** — unauthorized use during proctored exams
- ❌ **Credential Stuffing** — automating login attacks
- ❌ **Phishing** — injecting malicious keystrokes into user's keyboard buffer
- ❌ **Information Theft** — copying sensitive data across restricted networks
- ❌ **Unauthorized Access** — bypassing security measures on shared systems

**Current Safeguards: MINIMAL**
- ✅ User must manually scan QR and approve connection
- ⚠️ Session token is only 8 chars (16 bits entropy) — brute-forceable
- ⚠️ No rate limiting on typing requests
- ⚠️ No audit log of what text was injected
- ⚠️ No warning displayed before activating keystroke injection
- ⚠️ CORS allows any origin to make requests

**Liability Exposure:**
1. **Facilitating Exam Fraud** — VIT could hold developer liable if LANpad is used to cheat
2. **Unauthorized Computer Access** — if used to bypass security controls (CFAA violation in US)
3. **Accessory Liability** — enabling credential theft or phishing attacks
4. **Proctoring Bypass Liability** — proctoring vendors could sue for circumvention

**Recommendation:**
- [ ] Add prominent warning dialogs before keystroke injection
- [ ] Implement "Terms Acceptance" modal that explicitly prohibits exam/test bypass
- [ ] Add audit logging of all text injections (optional, local-only)
- [ ] Implement rate limiting (e.g., max 1000 characters/minute)
- [ ] Extend session token to at least 32 chars (256-bit entropy)
- [ ] Add CSRF token validation to prevent cross-origin injection
- [ ] Create "Acceptable Use Policy" document

---

### 2.4 Accessibility Bypass & Legal Defensibility

**Risk Level: MEDIUM-HIGH**

#### The Paradox:

LANpad is positioned as an **accessibility tool** (helping users with disabilities) but is explicitly marketed for **bypassing paste restrictions** (accessibility *bypass*).

**From README.md & BUSINESS_MODEL_README.md:**
- "Bypass paste-blocked sites (banks, exams, IDE anti-paste)" ✅ Transparency
- "Nuclear Unblocker bookmarklet" → controversial branding
- No mention of accessibility compliance (WCAG, Section 508)

**Legal Issues:**
1. **Section 508 / WCAG Compliance** — LANpad itself may not be accessible
   - No alt text in extension UI
   - No keyboard-only navigation documented
   - No screen reader testing mentioned

2. **ADA Defensibility** — if sued by exam proctoring vendor or institution:
   - LANpad's accessibility claims could be challenged
   - "Bypass" framing makes it difficult to argue pure accessibility purpose
   - Lack of restrictions on misuse is problematic

3. **Fair Use Argument** — weaker without explicit accessibility focus:
   - Copyright/CFAA fair use claims need strong accessibility nexus
   - Current framing emphasizes *any* "blocked" site, not accessibility-specific needs

**Recommendation:**
- [ ] Rename/rebrand away from "bypass" language if targeting accessibility market
- [ ] Or commit to "unrestricted" positioning and accept liability risks
- [ ] Implement WCAG AAA compliance for LANpad itself
- [ ] Create clear accessibility statement if pursuing that market

---

### 2.5 Export Controls & Encryption

**Risk Level: LOW-MEDIUM**

#### Potential Issue:

If LANpad includes **encryption** (for local network transport or stored credentials), it may trigger US/EU export control regulations.

**Current Status:**
- ✅ **No encryption in transport** — HTTP (not HTTPS) used for local network
- ✅ **No end-to-end encryption** — clipboard data transmitted in plaintext
- ✅ **No integrated cryptography** — only relies on open standards (fastapi, pyperclip)

**However:**
- If integrated with third-party "bypass backend" (popup.js references `bypass-backend-nms1.onrender.com`) that uses encryption → potential regulatory risk
- If future versions add encryption → must comply with EAR/ITAR if distributed internationally

**Recommendation:**
- [ ] Audit third-party backend (`bypass-backend-nms1.onrender.com`) for encryption claims
- [ ] Document encryption approach (if any added in future)
- [ ] Ensure compliance with US Export Administration Regulations (EAR) Part 740 if targeting international users

---

### 2.6 Credential Handling & Security Warnings

**Risk Level: HIGH**

#### Current Risks:

**Clipboard Access Without Warnings:**
```python
@app.get("/get_clipboard")
async def get_clipboard():
    """Retrieve host clipboard — may contain passwords, API keys, etc."""
    text = pyperclip.paste()
    return {"status": "success", "text": text}
```

**Issues:**
- ✅ Requires QR pairing (some authentication)
- ⚠️ No warning that clipboard data is being read
- ⚠️ No user consent before clipboard operation
- ⚠️ No encryption in transit (HTTP, no HTTPS)
- ⚠️ Data is logged in browser DevTools/network tabs
- ⚠️ No redaction of sensitive fields (passwords, API keys, tokens)

**Attack Scenarios:**
1. User pairs a compromised mobile device → clipboard drained
2. Man-in-the-middle attack on local Wi-Fi → clipboard intercepted
3. Malicious third-party PWA spoofs QR to gain clipboard access

**Recommendation:**
- [ ] Add explicit warning before clipboard access: *"LANpad is about to read your clipboard. It may contain passwords or sensitive data. Continue?"*
- [ ] Implement HTTPS for all endpoints (even local)
- [ ] Add opt-in "sensitive data redaction" mode
- [ ] Log clipboard operations (with user consent)
- [ ] Create security advisory for users handling credentials

---

### 2.7 File Access & Permissions Disclosure

**Risk Level: MEDIUM**

#### macOS Permissions:

LANpad requires several system permissions:
1. **Accessibility** — for keyboard event injection
2. **Clipboard** — for paste/copy operations
3. **Screen recording** — may be needed for some keyboard monitoring

**Current State:**
```python
def _check_mac_accessibility_and_prompt():
    """macOS Accessibility permission check and user prompt."""
    script = (
        'display alert "LANpad Needs Permissions" '
        'message "To auto-type or paste text from your phone, '
        'macOS requires you to grant Accessibility permissions..."'
    )
```

**Issues:**
- ✅ User prompt shown
- ⚠️ Prompt only shown if permission missing (not on first launch)
- ⚠️ No full disclosure of what "Accessibility" permission allows
- ⚠️ No warning that LANpad can type keystrokes in ANY application

**Windows Permissions:**
- Global keyboard hook registration (`pynput`) — less documented
- No permission prompt on Windows

**Recommendation:**
- [ ] Create comprehensive "System Permissions" disclosure page in app
- [ ] Warn users that Accessibility access allows keystroke injection globally
- [ ] For Windows: document required permissions and security implications
- [ ] Add teardown instructions (how to revoke permissions)

---

### 2.8 Session Token Security

**Risk Level: MEDIUM**

#### Issue:

Session tokens are only 8 characters derived from UUID:

```python
SESSION_TOKEN = str(uuid.uuid4())[:8]  # Simple temporary token for pairing
```

**Problems:**
- 8 characters ≈ 32 bits entropy (vs. 128 bits for full UUID)
- Brute-forceable: ~4 billion possible tokens
- No rate limiting on `/session/create` or `/get_config`
- Attacker on same Wi-Fi could iterate through tokens to find active sessions

**Example Attack:**
```bash
for i in {00000000..99999999}; do
  curl "http://192.168.1.100:8000/get_config?token=$i"
done
```

**Recommendation:**
- [ ] Use full 128-bit UUID (36 chars) or Base64 encoding (24 chars)
- [ ] Implement rate limiting on session endpoints (max 10 requests/second)
- [ ] Implement CSRF tokens for all state-changing operations
- [ ] Add session expiration (30 minutes recommended)

---

### 2.9 Open CORS & Cross-Origin Risks

**Risk Level: HIGH**

#### Issue:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Extension origins are chrome-extension://...
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Problems:**
- `allow_origins=["*"]` permits **any website** to make requests to LANpad backend
- Combined with `allow_credentials=True` — creates CSRF vulnerability
- Malicious website could inject keystrokes into user's laptop without consent

**Attack Example:**
```html
<!-- Malicious website -->
<script>
  fetch('http://localhost:8000/input/type', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({
      text: 'rm -rf /',  // Inject dangerous keystroke
      wpm: 1000,
      session_id: 'brute-forced-token'
    })
  });
</script>
```

**Recommendation:**
- [ ] Restrict CORS to specific origins (extension only)
- [ ] Use `allow_credentials=False` or implement CSRF tokens
- [ ] Require valid `session_id` in all POST requests
- [ ] Implement origin validation

---

## 3. JURISDICTION-SPECIFIC COMPLIANCE

### 3.1 India / VIT Specific Issues

**Risk Level: MEDIUM-HIGH** (VIT targeting)

#### Indian Legal Framework:

**1. Information Technology Act, 2000 (ITA 2000)**

| Section | Issue | Applicability |
|---------|-------|----------------|
| § 66 | Hacking / Unauthorized computer access | ⚠️ If used to bypass exam/institutional security |
| § 66B | Dishonesty / receiving stolen computer resources | ⚠️ If used for credential theft |
| § 66C | Identity theft | ⚠️ If used to bypass 2FA/authentication |
| § 43 | Civil liability for unauthorized access | ⚠️ Private right of action for institutions |

**2. University-Specific Concerns**

- **VIT Examination Policy** — likely prohibits unauthorized devices/software during exams
- **Proctoring Bypass** — if LANpad used during online exams → institutional disciplinary action + criminal prosecution
- **Intellectual Property** — VIT exam content is institutional IP; bypass tools may infringe

**3. Data Protection Bill (upcoming)**

- India is developing Personal Data Protection Bill (PDPB)
- When enacted, will require explicit consent for clipboard access
- May require data retention policies and user deletion rights

#### Student-Specific Risks:

- **Academic Integrity Violation** — if VIT students use LANpad during exams → disciplinary dismissal
- **Criminal Liability** — § 66 ITA prosecution for proctoring bypass
- **Institutional Liability** — VIT could hold LANpad developer liable as accessory

**Recommendation:**
- [ ] Add prominent **"For Academic Integrity"** disclaimer
- [ ] Create specific Indian Privacy Policy (mention ITA 2000 compliance)
- [ ] Require users to confirm they are NOT using LANpad for exam/assessment bypass
- [ ] Contact VIT legal counsel before marketing to VIT community
- [ ] Consider geographic restrictions or explicit student waivers

---

### 3.2 US Legal Issues (CFAA, DMCA, CAN-SPAM)

**Risk Level: MEDIUM**

#### Computer Fraud & Abuse Act (CFAA), 18 USC § 1030

**Potential Liability:**
- § 1030(a)(2) — unauthorized access to protected computer
- § 1030(a)(5) — damage to computer system
- § 1030(a)(6) — trafficking in passwords/credentials

**Scenarios:**
- If LANpad used to bypass banking website security → potential CFAA violation
- If used to bypass exam proctoring → potential violation
- If used for credential stuffing → definite violation

**LANpad Developer's Exposure:**
- **Direct liability** — unlikely (tool is general-purpose, not solely for hacking)
- **Accessory liability** — possible if LANpad marketed specifically for bypassing security
- **Contributory liability** — if inadequate safeguards + knowledge of misuse

**Current Defense:**
- ✅ General-purpose tool (not solely for hacking)
- ✅ Legitimate accessibility use case
- ✅ Local network only (not targeting "protected computers")
- ⚠️ BUT: "bypass" marketing language weakens this defense

#### DMCA Circumvention (17 USC § 1201)

- **Low risk** — LANpad doesn't circumvent TPM/DRM, just bypasses paste blocks
- Most TPM/DRM claims would fail against paste-block bypass

#### CAN-SPAM & Email Harassment

- **Low risk** — LANpad doesn't send emails
- If users use LANpad to bypass email security → user's liability, not LANpad's

**Recommendation:**
- [ ] Add Terms of Service explicitly prohibiting use for:
  - Unauthorized computer access
  - Bypassing authentication systems
  - Phishing or credential theft
- [ ] Implement abuse reporting mechanism
- [ ] Consider geographic restrictions (e.g., no export to embargoed countries)

---

### 3.3 EU/GDPR Compliance

**Risk Level: MEDIUM**

#### GDPR Requirements (if targeting EU users):

1. **Data Controller Status** — LANpad is NOT a data controller (all data local)
   - ✅ No cloud storage
   - ✅ No data transfer to third parties
   - ✅ User is controller of their own clipboard

2. **Privacy Policy** — Still required even for local-only processing
   - [ ] Disclosure of what data is processed
   - [ ] User rights (access, deletion, portability)
   - [ ] Contact for data subject requests

3. **Consent** — Required before processing personal data
   - ⚠️ Clipboard data may include personal data (emails, passwords, addresses)
   - [ ] Add explicit opt-in before clipboard access

4. **Data Retention** — Must be specified
   - ⚠️ No documented policy for `~/.lanpad/config.json` retention
   - [ ] Implement automatic cleanup mechanism

**Recommendation:**
- [ ] Create GDPR-compliant Privacy Policy
- [ ] Implement data deletion mechanisms
- [ ] Add data processing impact assessment (DPIA) if processing sensitive data
- [ ] Obtain explicit consent before clipboard operations

---

## 4. RECOMMENDED LEGAL DOCUMENTS

### 4.1 Priority 1 (CRITICAL — Before Public Release)

#### 1. **Terms of Service (ToS)**

**Must Include:**
- Acceptable use restrictions (no exam bypass, no hacking, no credential theft)
- Liability disclaimers (LANpad provided AS-IS, developer not liable for misuse)
- Intellectual property notices (copyright, third-party licenses)
- User responsibilities (user assumes liability for their use)
- Dispute resolution / jurisdiction (India or Delaware recommended)
- Changes/termination clauses

**Estimated Length:** 2-3 pages (1500-2000 words)

#### 2. **Privacy Policy**

**Must Include:**
- What data LANpad collects (clipboard, IP, session data)
- Where data is stored (local only, no cloud)
- How long data is retained (specifics for each data type)
- User rights (access, deletion, portability)
- Cookies/local storage usage
- GDPR/CCPA/India compliance
- Security measures (what protections are in place)
- Contact for privacy inquiries

**Estimated Length:** 1-2 pages (1000-1500 words)

#### 3. **Acceptable Use Policy (AUP)**

**Must Include:**
- ❌ **Prohibited Uses:**
  - Proctoring/exam bypass
  - Unauthorized computer access (CFAA violations)
  - Credential stuffing / phishing
  - Circumventing security measures on others' computers
  - Violating institutional policies (school, work)
- ✅ **Permitted Uses:**
  - Accessibility for users with disabilities
  - Personal/authorized use only
  - Work/academic use with proper authorization
- Enforcement mechanisms (account suspension, legal action)

**Estimated Length:** 1-2 pages (1000-1500 words)

#### 4. **Security & Safety Disclaimer**

**Must Include:**
- **Keystroke Injection Risk:** LANpad can inject keystrokes into ANY application
- **Clipboard Privacy Risk:** Clipboard contents may be sensitive (passwords, API keys)
- **Local Network Risk:** Wi-Fi eavesdropping could expose data
- **Session Token Risk:** Short tokens (current: 8 chars) could be brute-forced
- **User Responsibility:** Users must verify security of their network
- **Warranty Disclaimer:** NO WARRANTY FOR FITNESS OR SECURITY

**Estimated Length:** 1 page (500-800 words)

#### 5. **License Attribution & Third-Party Notices**

**Must Include:**
- MIT License copyright notice (LANpad core)
- All third-party library licenses:
  - fastapi (BSD 3-Clause)
  - pyautogui (MIT)
  - pynput (MIT)
  - rumps (MIT)
  - etc.
- Instructions for obtaining full license texts

**Format:** Plain text or markdown file named `THIRD_PARTY_LICENSES.md` or `ATTRIBUTION.md`

---

### 4.2 Priority 2 (HIGH — Before VIT Release / Monetization)

#### 6. **Accessibility Statement**

**If positioning as accessibility tool:**
- WCAG compliance level (A/AA/AAA)
- Accessibility features implemented
- Known accessibility issues
- Contact for accessibility feedback
- Commitment to ongoing improvement

#### 7. **Data Processing Agreement (DPA)**

**If any B2B or institutional partnerships:**
- Define roles (controller, processor, joint controller)
- Data handling obligations
- Sub-processor approval
- Data breach notification procedures
- Data subject rights mechanisms

#### 8. **Institutional User Agreement**

**If targeting schools/universities:**
- Compliance with institutional policies
- User authentication / identity verification
- Audit log retention
- Indemnification (institution indemnifies developer)
- Limitation of liability

---

### 4.3 Priority 3 (MEDIUM — Long-term)

#### 9. **Developer Code of Conduct**

**For open-source community:**
- Community guidelines
- Anti-harassment policies
- Contribution guidelines
- Reporting mechanisms

#### 10. **Security Policy**

**For responsible vulnerability disclosure:**
- How to report security issues
- Bounty program (if applicable)
- Vulnerability response timeline
- Disclosure coordination process

---

## 5. CRITICAL LEGAL GAPS & IMMEDIATE ACTIONS

### Gaps Summary:

| Gap | Severity | User Impact | Legal Impact | Deadline |
|-----|----------|------------|--------------|----------|
| No Terms of Service | CRITICAL | Users don't know restrictions | Liability exposure | ASAP |
| No Privacy Policy | CRITICAL | Data collection undisclosed | GDPR/CCPA violation | ASAP |
| No Acceptable Use Policy | CRITICAL | Misuse not prohibited | Accessory liability | ASAP |
| Weak Session Token | HIGH | Security vulnerability | Breach liability | This sprint |
| Open CORS | HIGH | CSRF attack surface | Unauthorized access | This sprint |
| No Credential Warning | HIGH | Sensitive data at risk | Privacy violation | This sprint |
| No Accessibility Disclosure | MEDIUM | Users unaware of risks | ADA defensibility | This month |
| License headers missing | MEDIUM | Attribution unclear | Copyright violation | This quarter |
| No data cleanup mechanism | MEDIUM | Indefinite retention | GDPR violation | This quarter |

---

### Immediate Action Items (This Week):

1. **[ ] Draft Terms of Service** — use template, customize for LANpad
   - Include AUP (no exam bypass)
   - Liability disclaimers
   - Jurisdiction (India or Delaware)

2. **[ ] Draft Privacy Policy** — specific to LANpad's data handling
   - Clipboard data disclosure
   - Local-only storage
   - Data retention policies

3. **[ ] Add Security Warning Modal** — shown on first app launch
   - "LANpad can inject keystrokes into any application"
   - "Do NOT use during exams, security-sensitive tasks"
   - Require explicit "I understand" checkbox

4. **[ ] Extend Session Token** — from 8 chars to 32+ chars
   - Change: `SESSION_TOKEN = str(uuid.uuid4())[:8]` → full UUID
   - Add rate limiting to session endpoints

5. **[ ] Fix CORS Configuration** — restrict to extension origin only
   - Replace `allow_origins=["*"]` with specific extension IDs
   - Add CSRF token validation

6. **[ ] Add License Headers** — to all source files
   - SPDX identifier: `SPDX-License-Identifier: MIT`
   - Copyright notice: `Copyright (c) 2026 LANpad`

---

### Longer-term Roadmap (This Quarter):

7. **[ ] Create THIRD_PARTY_LICENSES.md** — full attribution for all deps
8. **[ ] Implement clipboard consent modal** — before accessing clipboard
9. **[ ] Add audit logging** — optional, local-only
10. **[ ] Create institutional agreement template** — for VIT/school deployments
11. **[ ] Implement data cleanup** — auto-delete config files after 30 days inactive

---

## 6. RISK ASSESSMENT MATRIX

### Overall Risk Level: **🔴 HIGH**

| Dimension | Level | Justification |
|-----------|-------|----------------|
| **IP/Licensing** | MEDIUM | Missing attributions, but all deps compatible |
| **Data Privacy** | MEDIUM | Local-only, but no privacy policy; clipboard risks |
| **Security/Liability** | HIGH | Keystroke injection + weak token + open CORS |
| **Regulatory (India)** | MEDIUM-HIGH | ITA 2000 concerns; VIT targeting; proctoring bypass |
| **Regulatory (US/EU)** | MEDIUM | CFAA/GDPR risks; legitimate accessibility defense weak |
| **Accessibility** | MEDIUM | "Bypass" framing undermines accessibility claims |
| **Institutional** | HIGH | VIT/exam-bypass exposure; no institutional agreement |

---

## 7. GO/NO-GO RECOMMENDATION FOR VIT RELEASE

### Current Status: ❌ **NOT READY FOR PUBLIC RELEASE**

#### Blockers:

1. **No Terms of Service** — Cannot legally release without
2. **No Acceptable Use Policy** — VIT may hold developer liable for exam bypass
3. **No Privacy Policy** — GDPR/student data protection violation
4. **Weak Security (token, CORS)** — Breach liability exposure
5. **No Institutional Agreement** — VIT has no legal relationship with project

#### To Clear Blockers (Estimated Timeline):

| Task | Effort | Timeline |
|------|--------|----------|
| Draft ToS & Privacy Policy | 2-3 days | This week |
| Create Acceptable Use Policy | 1 day | This week |
| Add security warnings/disclaimers | 1 day | This week |
| Fix session token + CORS + rate limiting | 2 days | This week |
| Legal review by Indian lawyer | 3-5 days | Next week |
| Institutional agreement with VIT | 1-2 weeks | Next 2 weeks |

**Estimated Total Timeline:** 2-3 weeks

#### Go-Live Checklist:

- [ ] Terms of Service published and linked in app
- [ ] Privacy Policy published and linked in app
- [ ] Acceptable Use Policy published (no exam bypass)
- [ ] Security disclaimer shown to users
- [ ] Session token extended to 32+ chars
- [ ] CORS restricted to extension origin
- [ ] Rate limiting implemented
- [ ] Indian lawyer review completed
- [ ] Institutional agreement with VIT (if targeting VIT)
- [ ] License headers added to all source files
- [ ] THIRD_PARTY_LICENSES.md created

---

## 8. RECOMMENDED LEGAL DISCLAIMERS (TEMPLATE TEXT)

### Security & Safety Disclaimer

```
⚠️  SECURITY & SAFETY WARNING

LANpad provides keystroke injection and clipboard access functionality.
By using LANpad, you acknowledge and accept the following:

1. KEYSTROKE INJECTION RISKS
   - LANpad can inject keystrokes into ANY active application
   - DO NOT use LANpad during exams, security-sensitive tasks, or on
     systems you are not authorized to access
   - You are solely liable for any harm caused by keystroke injection

2. CLIPBOARD PRIVACY
   - LANpad can read your clipboard, which may contain passwords,
     API keys, credentials, or other sensitive data
   - Your clipboard data is transmitted in plaintext over HTTP
   - DO NOT use LANpad on public Wi-Fi networks

3. LOCAL NETWORK RISKS
   - LANpad communicates only on your local network
   - Wi-Fi eavesdropping or man-in-the-middle attacks could expose
     your clipboard data to attackers on the same network

4. LIMITED WARRANTY
   - LANpad is provided AS-IS, WITHOUT ANY WARRANTY of fitness,
     security, or merchantability
   - The developers assume NO LIABILITY for unauthorized access,
     data theft, or damage caused by LANpad use

5. ACCEPTABLE USE
   - YOU MAY NOT use LANpad to:
     ✗ Bypass proctoring software or exam security
     ✗ Gain unauthorized access to computer systems (CFAA violation)
     ✗ Steal credentials or perform phishing attacks
     ✗ Violate academic integrity policies or institutional rules
   - Violation of this AUP may result in criminal prosecution

By proceeding, you accept full responsibility for your use of LANpad.
```

### Exam/Academic Integrity Disclaimer

```
🎓 ACADEMIC INTEGRITY STATEMENT

If you are using LANpad during an exam, quiz, assessment, or other
academic integrity-sensitive situation:

❌ LANpad IS NOT PERMITTED
   - Using LANpad to bypass proctoring or paste blocks is considered
     CHEATING
   - You will face academic discipline (grade penalty, expulsion) and
     may face criminal prosecution under local laws (e.g., ITA 2000 § 66)

✅ PERMITTED USES
   - LANpad is permitted for accessibility purposes with instructor approval
   - LANpad is permitted for authorized work/academic activities

⚖️ LIABILITY
   - By using LANpad, you assume all liability for academic integrity violations
   - LANpad developers are NOT LIABLE for your misuse

If you have legitimate accessibility needs, contact your institution's
accessibility office BEFORE using LANpad during exams.
```

---

## 9. CONCLUSION & RECOMMENDATIONS

### Summary:

LANpad is a **powerful but legally complex** tool that enables keystroke injection to bypass paste-block restrictions. While the technology has legitimate accessibility use cases, it is **currently exposed to significant legal liability** due to:

1. **Complete absence of legal documentation** (ToS, Privacy Policy, AUP)
2. **Weak security controls** (short session tokens, open CORS)
3. **High-risk jurisdiction** (India; VIT targeting; proctoring bypass concerns)
4. **Unclear accessibility positioning** ("bypass" vs. genuine accessibility tool)

### Recommendations (Priority Order):

#### THIS WEEK:
1. ✅ **Create & publish Terms of Service** with explicit AUP
2. ✅ **Create & publish Privacy Policy** with data handling details
3. ✅ **Add security warning modals** (keystroke injection risks, don't use in exams)
4. ✅ **Extend session token** to 32+ characters (minimum 256-bit entropy)
5. ✅ **Fix CORS configuration** — restrict to extension origin only

#### THIS MONTH:
6. ✅ **Implement rate limiting** on all endpoints (prevent brute force)
7. ✅ **Add CSRF token validation** to POST requests
8. ✅ **Create THIRD_PARTY_LICENSES.md** with full attribution
9. ✅ **Add license headers** to all source files (SPDX identifiers)
10. ✅ **Get legal review** from Indian counsel (ITA 2000 compliance)

#### BEFORE VIT RELEASE:
11. ✅ **Create institutional agreement template** (data handling, liability)
12. ✅ **Implement clipboard consent modal** (before accessing clipboard)
13. ✅ **Create institutional user agreement** (for VIT or schools)
14. ✅ **Contact VIT legal** to establish data processing relationship

### Final Verdict:

**Current GO/NO-GO: ❌ NOT READY**

With 2-3 weeks of legal and security hardening, LANpad can be responsibly released with proper disclaimers and safeguards. The main risks are **addressable through documentation, security fixes, and institutional partnerships**.

---

## 10. APPENDICES

### Appendix A: List of Laws Relevant to LANpad

| Jurisdiction | Law | Sections | Applicability |
|--------------|-----|----------|----------------|
| **India** | Information Technology Act, 2000 | § 66, 66B, 66C, 43 | Exam bypass, hacking, fraud |
| **India** | Bharatiya Nyaya Sanhita, 2023 | § 172, 177 | General criminal law |
| **US** | Computer Fraud and Abuse Act | 18 USC § 1030 | Unauthorized access, circumvention |
| **US** | DMCA Anti-Circumvention | 17 USC § 1201 | TPM/DRM circumvention (low risk) |
| **US** | State Wiretap Laws | Varies | Keystroke logging in some states |
| **EU** | GDPR | Articles 6, 13, 14 | Privacy, consent, disclosure |
| **UK** | DPA 2018 / UK GDPR | Varies | Post-Brexit privacy compliance |
| **US** | Section 508 / ADA | 29 CFR § 1910.1020 | Accessibility compliance (if claiming ADA) |

---

### Appendix B: Sample Terms of Service Outline

```
TERMS OF SERVICE - LANpad

1. USE LICENSE
   - Grant of limited, non-exclusive license
   - Restrictions on redistribution, modification

2. ACCEPTABLE USE
   - Permitted uses (accessibility, authorized business use)
   - PROHIBITED USES:
     - Exam/proctoring bypass
     - Unauthorized computer access
     - Credential theft, phishing
     - Violation of institutional policies

3. DISCLAIMERS
   - AS-IS warranty disclaimer
   - NO WARRANTY of fitness, security, non-infringement
   - NO WARRANTY that LANpad will work with all systems

4. LIMITATION OF LIABILITY
   - Developer not liable for:
     - Unauthorized access / data theft
     - Academic integrity violations
     - Loss of data / system corruption
     - Criminal prosecution

5. USER RESPONSIBILITIES
   - User assumes all liability for their use
   - User responsible for securing their network
   - User responsible for compliance with institutional policies

6. INTELLECTUAL PROPERTY
   - Copyright notice (LANpad © 2026)
   - Third-party license attribution
   - User license grants (contributions, feedback)

7. PRIVACY
   - Link to Privacy Policy
   - Clipboard and permission disclosures

8. TERMINATION
   - Developer may terminate use for AUP violations
   - Data retention after termination

9. DISPUTE RESOLUTION
   - Jurisdiction (India or Delaware)
   - Arbitration clause (optional)
   - Limitation period for claims

10. CHANGES TO TERMS
    - Developer may update terms
    - Continued use = acceptance of new terms
```

---

### Appendix C: Recommended Reading

- **US CFAA Liability:** "Software Liability Under the CFAA" (TechFreedom)
- **GDPR Compliance:** "GDPR Compliance for Startups" (ICO.org.uk)
- **India IT Act:** "The Information Technology Act Explained" (MeitY)
- **Accessibility Law:** "ADA Title III & Digital Accessibility" (DOJ)
- **Terms of Service Best Practices:** "Terms of Service for SaaS" (Nolo)

---

**Report Generated:** June 19, 2026  
**Next Review Date:** September 19, 2026 (quarterly)  
**Prepared By:** Legal Compliance Review Team

---

**END OF REPORT**

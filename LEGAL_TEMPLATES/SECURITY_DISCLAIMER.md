# SECURITY & SAFETY DISCLAIMER — LANpad

**Last Updated:** June 19, 2026

---

## ⚠️ SECURITY & SAFETY WARNING

**PLEASE READ THIS CAREFULLY BEFORE USING LANpad.**

By using LANpad, you acknowledge and accept the following risks and limitations. LANpad is a **powerful tool that can inject keystrokes into your computer** and **access your clipboard**. Misuse can result in data theft, unauthorized access, or system compromise.

---

## 1. KEYSTROKE INJECTION RISKS

### What LANpad Does:
LANpad simulates realistic human typing by injecting keyboard events directly into your computer's operating system. This allows it to type into ANY active application, including:

- Text editors & IDEs
- Web browsers
- Email clients
- Terminal/command-line windows
- Banking & financial applications
- Secure systems & password managers
- **ANY ACTIVE APPLICATION ON YOUR COMPUTER**

### Risks:

#### 🔴 **Unintended Injection**
- LANpad can inject keystrokes into the WRONG application if you switch windows
- Example: You intend to inject code into Visual Studio Code, but switch to your browser and LANpad injects keystrokes into a banking website
- Result: Unintended data loss, unauthorized actions, account compromise

#### 🔴 **Bypass of Security Measures**
- LANpad can bypass paste-block restrictions and anti-automation controls
- If you use LANpad on a system where it's prohibited (exam, work, shared system), you are violating institutional policies
- Result: Academic discipline, employment termination, criminal prosecution

#### 🔴 **Keystroke Interception**
- If a malicious application or malware is running, it could intercept LANpad's keystroke injection
- Adversary could inject different keystrokes than intended
- Result: Data theft, system compromise, credential leakage

### YOUR RESPONSIBILITY:

✅ **DO:**
- Use LANpad only on systems you own or have explicit permission to use
- Keep focus on the correct application before injecting
- Monitor injection in progress in case you need to stop it (press ESC)
- Verify results immediately after injection
- Use LANpad only with authorized data (not sensitive credentials on shared systems)

❌ **DON'T:**
- Use LANpad during exams, assessments, or other security-sensitive activities
- Use LANpad on shared computers without owner approval
- Inject sensitive credentials (passwords, API keys) if unauthorized users have access
- Use LANpad on systems you don't own or control

---

## 2. CLIPBOARD PRIVACY RISKS

### What LANpad Does:
LANpad can read and write to your clipboard, allowing text transfer between devices. However, **your clipboard may contain highly sensitive data**:

- Passwords & passphases
- API keys & authentication tokens
- Credit card numbers & financial information
- Private encryption keys
- Personal identification (SSN, driver's license #, passport #)
- Health information
- Confidential business data

### Risks:

#### 🔴 **Unencrypted Transmission**
- Clipboard data travels over **HTTP (NOT HTTPS)** on your local Wi-Fi
- Data is transmitted **in plaintext** (no encryption)
- Any device on your Wi-Fi network can intercept clipboard data
- Result: Eavesdropping, credential theft, data leakage

#### 🔴 **Wi-Fi Eavesdropping**
- Attackers on your local network can sniff all LANpad traffic
- If your Wi-Fi password is weak or compromised, attackers gain access
- Public Wi-Fi networks are particularly dangerous
- Result: Credentials stolen, accounts compromised, identity theft

#### 🔴 **Malicious Mobile Device**
- If you pair LANpad with a compromised or stolen phone, that device can read your clipboard
- The phone could exfiltrate your credentials to remote attackers
- Result: Wholesale account compromise

#### 🔴 **Man-in-the-Middle (MITM) Attack**
- An attacker with network access could intercept and modify clipboard data
- Attacker could change pasted credentials to their own, injecting them into your accounts
- Result: Account takeover, unauthorized access

### YOUR RESPONSIBILITY:

✅ **DO:**
- Only use LANpad on **your own trusted devices** (that you own)
- Only use LANpad on **password-protected Wi-Fi networks**
- Use Wi-Fi security: **WPA3 encryption recommended** (at minimum WPA2)
- Regularly **check your clipboard contents** before using LANpad
- **Avoid pasting sensitive credentials** via LANpad if possible
- **Clear your clipboard** after pasting sensitive data (`⌘X` in macOS or `Ctrl+X` on Windows, then paste something non-sensitive)

❌ **DON'T:**
- Use LANpad on public Wi-Fi networks (coffee shops, airports, hotels)
- Use LANpad on open/unsecured networks without strong authentication
- Pair LANpad with untrusted mobile devices
- Keep sensitive data in your clipboard while LANpad is running
- Use LANpad if you suspect your network is compromised

---

## 3. LOCAL NETWORK SECURITY RISKS

### What LANpad Does:
LANpad creates an HTTP server on your local network (`http://YOUR_IP:8000`) that communicates with your phone via WebSocket. This exposes endpoints for:

- Session pairing
- Clipboard read/write
- Keystroke injection

### Risks:

#### 🔴 **Brute-Force Session Token Attack**
- LANpad uses an 8-character session token (currently)
- This provides only ~32 bits of entropy (brute-forceable)
- An attacker on your network could iterate through all possible tokens
- Result: Unauthorized access to your LANpad session, keystroke injection, clipboard theft

**Status:** KNOWN ISSUE, being fixed (tokens will be extended to 32+ characters)

#### 🔴 **Malicious Local Device**
- Any device on your Wi-Fi network can reach `http://YOUR_IP:8000`
- A malicious laptop, smartphone, or IoT device could:
  - Read your clipboard
  - Inject arbitrary keystrokes
  - Trigger unauthorized actions
- Result: Data theft, malware injection, system compromise

#### 🔴 **AP Isolation Bypass**
- Corporate networks use "AP Isolation" to prevent device-to-device communication
- LANpad can bypass this, potentially allowing you to communicate across network boundaries
- Result: Violation of corporate security policies, disciplinary action

### YOUR RESPONSIBILITY:

✅ **DO:**
- Only connect devices YOU OWN to LANpad
- Trust only your personal phone (not borrowed devices, friends' phones, etc.)
- Use a **strong Wi-Fi password** (12+ characters, random)
- Keep LANpad updated to get security patches
- Monitor your network for unauthorized devices (use router settings)
- Disable LANpad when not actively using it

❌ **DON'T:**
- Connect to LANpad from an unknown or untrusted device
- Allow guests on your Wi-Fi without vetting their devices
- Leave LANpad running unattended on open networks
- Use weak Wi-Fi passwords

---

## 4. ACCESSIBILITY & KEYBOARD INJECTION DEFENSIBILITY

### Legal Risk:
LANpad's keystroke injection feature can be used to **bypass accessibility controls** on websites that intentionally restrict pasting (e.g., exam proctoring software, banking sites, password managers).

**This creates legal ambiguity:**

- **Accessibility Defense:** "LANpad helps users with disabilities bypass paste restrictions"
- **Circumvention Concern:** "LANpad helps unauthorized users bypass exam/security controls"

### If Sued or Prosecuted:

**Worst Case:**
- Proctoring vendor or institution sues Developer for "circumvention of technical measures" (DMCA § 1201 in US, similar laws elsewhere)
- Criminal prosecution for CFAA violations if used for unauthorized access
- Civil liability for enabling exam cheating or fraud

**Dev

eloper's Position:**
- Developer is not liable for how users misuse LANpad
- This disclaimer shifts liability to you (the user)
- However, regulatory changes could restrict LANpad's legal status

### YOUR RESPONSIBILITY:

✅ **DO:**
- Use keystroke injection **only for legitimate accessibility needs** (with proper institutional approval)
- Document any accessibility accommodations you have
- Get explicit permission from instructors/administrators before using LANpad on their systems

❌ **DON'T:**
- Use LANpad to bypass exam/proctoring software
- Use LANpad to bypass security measures on systems you don't own
- Claim accessibility needs if you don't have them

---

## 5. LIMITED WARRANTY & NO LIABILITY

### Developer Makes NO Guarantees:

❌ **NO WARRANTY** that LANpad is secure  
❌ **NO WARRANTY** that your data will be protected  
❌ **NO WARRANTY** that LANpad will work without errors  
❌ **NO WARRANTY** that LANpad is compatible with all systems  
❌ **NO WARRANTY** of fitness for any particular purpose  

### Developer is NOT LIABLE For:

❌ Unauthorized access or data theft via LANpad  
❌ Loss of credentials or sensitive data  
❌ Academic integrity violations or disciplinary action  
❌ Criminal prosecution (CFAA, ITA § 66, etc.)  
❌ Damage to your computer or data  
❌ Breach of institutional policies  
❌ Consequences of misuse (intentional or unintentional)  
❌ Third-party claims against you  

### You Accept Full Responsibility For:

✅ Your use of LANpad  
✅ Security of your network and devices  
✅ Consequences of misuse (intentional or unintentional)  
✅ Compliance with institutional policies  
✅ Compliance with all applicable laws  

---

## 6. ACCEPTABLE & UNACCEPTABLE USES

### ✅ ACCEPTABLE USES:
- Personal productivity on your own devices
- Accessibility for users with disabilities (with proper approval)
- Development & testing on systems you own
- Authorized business use (with employer permission)
- Accessibility research (with ethical oversight)

### ❌ UNACCEPTABLE USES:
- Bypassing exam/proctoring software
- Unauthorized computer access or hacking
- Credential theft or phishing
- Violating institutional policies
- Unauthorized access on systems you don't own/control
- Criminal activity of any kind

See [ACCEPTABLE_USE_POLICY.md](ACCEPTABLE_USE_POLICY.md) for full details.

---

## 7. WHAT TO DO IF SOMETHING GOES WRONG

### If You Inject Keystrokes Into the Wrong Application:

1. **Stop immediately** — Press **ESC** to stop LANpad
2. **Assess damage** — Check what data was injected
3. **Undo** — Use Undo (`⌘Z` / `Ctrl+Z`) if possible
4. **Clear records** — Close the application without saving if sensitive data was injected

### If Your Clipboard Data is Compromised:

1. **Stop LANpad** — Close the application immediately
2. **Clear clipboard** — Do something benign and copy it (`⌘C` / `Ctrl+C`)
3. **Change passwords** — If credentials were exposed, reset affected passwords immediately
4. **Monitor accounts** — Watch for suspicious activity on exposed accounts
5. **Report to authorities** — If data theft is suspected, consider reporting to cyber crime authorities

### If LANpad Causes System Issues:

1. **Force quit LANpad** (`⌘Q` / `Ctrl+Alt+Delete` → End Task)
2. **Restart your computer** if issues persist
3. **Delete configuration** — Remove `~/.lanpad/config.json` to reset
4. **Reinstall** — Reinstall LANpad if corruption is suspected
5. **Report to Developer** — [security@example.com]

---

## 8. THIRD-PARTY BACKEND DISCLAIMER

**Note:** LANpad extension references a third-party bypass backend (`bypass-backend-nms1.onrender.com`). This is **NOT endorsed or controlled by Developer**.

Using third-party backends may introduce additional security risks:
- Unverified encryption claims
- Potential data logging by third parties
- Liability for third-party security breaches

Use at your own risk. Developer assumes no liability for third-party services.

---

## 9. OPEN SOURCE & TRANSPARENCY

LANpad is **open-source** under the MIT License:

✅ **You can:**
- Audit the source code
- Report security issues
- Contribute security patches

✅ **Transparency:**
- All code is publicly available on [GitHub](https://github.com/Nithin1138/Glidepass_local)
- No hidden data exfiltration
- No backdoors or telemetry (to Developer's knowledge)

✅ **Verified Security:**
- If concerned about security, you can review the source code
- You can compile from source and verify the binary

---

## 10. ACKNOWLEDGMENT

By using LANpad, you confirm that:

✅ You have read and understood these risks  
✅ You accept full responsibility for your use  
✅ You understand LANpad is provided AS-IS  
✅ You will not hold Developer liable for damages  
✅ You will use LANpad only for permitted, legal purposes  

---

## 11. CONTACT & SECURITY REPORTING

**For security vulnerabilities or concerns:**

Email: [security@example.com]  
Response Time: Within 48 hours  
Responsible Disclosure: 90 days to remediate before public disclosure

---

**This Disclaimer is effective as of:** [INSERT DATE]  
**Last Updated:** June 19, 2026

**BY USING LANpad, YOU ACCEPT THESE RISKS AND LIMITATIONS.**


# PRIVACY POLICY — LANpad

**Last Updated:** June 19, 2026  
**Effective Date:** [INSERT DATE]

---

## 1. INTRODUCTION

This Privacy Policy ("**Policy**") explains how LANpad collects, uses, stores, and protects your data. LANpad is designed with **privacy-by-default** principles: most data is processed locally on your devices and is never transmitted to external servers.

By using LANpad, you consent to this Policy. If you do not agree, please do not use LANpad.

---

## 2. WHAT DATA DOES LANpad COLLECT?

### 2.1 Data You Provide

| Data | Purpose | Retained? |
|------|---------|-----------|
| **Clipboard contents** | Transfer between devices | Temporarily (during session) |
| **Text you type** | Inject into applications | Temporarily (during session) |
| **Session preferences** | Remember your settings (WPM, mode, etc.) | Until you clear config |
| **Configuration data** | Store user preferences, license info | Indefinitely (in `~/.lanpad/config.json`) |

### 2.2 Technical Data Collected Automatically

| Data | Purpose | Retained? |
|------|---------|-----------|
| **Local IP address** | Generate QR code for mobile pairing | Session-only |
| **Device hostname** | Display in UI for identification | Session-only |
| **Platform (macOS/Windows)** | Adapt functionality to OS | Session-only |
| **Session token** | Authenticate mobile device connection | Session-only |
| **Hardware ID** | Verify license validity (if applicable) | Until cleared by user |

### 2.3 Data We Do NOT Collect

- ❌ Your name, email, or personal identity
- ❌ GPS location or device location
- ❌ Browsing history or web pages visited
- ❌ Long-term keystroke logs (only during active session)
- ❌ Detailed crash reports or system telemetry
- ❌ Third-party account credentials or API keys (clipboard may contain these, but we don't intentionally log them)

---

## 3. WHERE IS MY DATA STORED?

### 3.1 Local-Only Processing

**LANpad processes data only on your local network.** This means:

✅ Your clipboard data **never leaves your local Wi-Fi network**  
✅ Your keystroke data **never reaches external servers**  
✅ Your configuration **is stored only on your computer**  
❌ Developer's servers **do not store your personal data**

### 3.2 Data Retention On Your Device

| Data | Location | Retention | Deletion Method |
|------|----------|-----------|-----------------|
| **Clipboard** | Memory (RAM) | Duration of session | Automatically cleared when session ends |
| **Session tokens** | Memory (RAM) | Duration of session | Automatically cleared when session ends |
| **Configuration** | `~/.lanpad/config.json` | Indefinitely | [Manual] Delete file, or [Automated] See section 6.4 |
| **Hardware ID** | `~/.lanpad/config.json` | Indefinitely | [Manual] Delete file |
| **License info** | `~/.lanpad/config.json` or `~/.lanpad_license.json` | Until license expires | [Manual] Delete files |

### 3.3 Secure Transmission (Within Local Network)

- Clipboard data is transmitted **via HTTP (NOT HTTPS)** over your local Wi-Fi
- **No encryption** is currently applied (plaintext transfer)
- Data is vulnerable to **Wi-Fi eavesdropping** by attackers on your network
- For sensitive data, ensure your Wi-Fi network is **password-protected** and uses **WPA3 encryption**

---

## 4. HOW IS MY DATA USED?

### Permitted Uses

1. **Functionality** — To enable text transfer between your devices
2. **Accessibility** — To support users with disabilities who need keystroke injection
3. **Personalization** — To remember your preferences (WPM settings, mode preferences)
4. **License Verification** — To check if you have a valid license (if using paid features)
5. **Security** — To authenticate pairing between devices (session tokens)

### Prohibited Uses

Developer **will NEVER**:

- ❌ Sell or share your clipboard data with third parties
- ❌ Use your data for marketing or profiling
- ❌ Share with advertisers or data brokers
- ❌ Use data to track or identify you
- ❌ Combine LANpad data with other tracking systems

---

## 5. THIRD-PARTY INTEGRATIONS

### 5.1 Third-Party Services

LANpad **does not intentionally integrate with third-party services** for data transmission. However:

- **Browser extension permissions** — The LANpad Chrome extension requests `clipboardRead` and `clipboardWrite` permissions from your browser (not shared with Developer)
- **License verification** — LANpad may contact `https://lanpad.vercel.app/api/monetization/status` to check if monetization is enabled (no personal data sent)
- **Template updates** — LANpad may fetch UI templates from GitHub or a custom server (no personal data sent)

### 5.2 No Third-Party Cookies or Tracking

LANpad does **not use**:
- Google Analytics or other tracking services
- Third-party cookies
- Advertising networks or pixels
- Session replay or heatmap tools

---

## 6. YOUR DATA RIGHTS & CONTROLS

### 6.1 Access Your Data

To view your LANpad configuration data:

```bash
# macOS/Linux:
cat ~/.lanpad/config.json

# Windows:
type %USERPROFILE%\.lanpad\config.json
```

### 6.2 Delete Your Data

**Option 1: Manual Deletion**
```bash
# macOS/Linux:
rm -rf ~/.lanpad

# Windows:
rmdir /s %USERPROFILE%\.lanpad
```

**Option 2: In-App Deletion** [If implemented]
Settings > Privacy > Clear All Local Data > Confirm

### 6.3 Automatic Data Cleanup [Future Feature]

LANpad will offer **automatic data cleanup**:
- Configuration files older than **30 days of inactivity** will be automatically deleted
- Session tokens are deleted immediately upon disconnection
- Clipboard history is never stored

### 6.4 Data Portability

Since LANpad stores data locally, **you can easily port your data**:
- Copy `~/.lanpad/config.json` to transfer your configuration to another computer
- LANpad data is **not locked** to any cloud account

### 6.5 GDPR / CCPA Rights (If Applicable)

If you are in the EU (GDPR) or California (CCPA), you have rights to:

| Right | How to Exercise | Timeline |
|-------|-----------------|----------|
| **Access** | Use section 6.1 above | Immediate (your device) |
| **Deletion** | Use section 6.2 above | Immediate (your device) |
| **Portability** | Use section 6.4 above | Immediate |
| **Objection** | Contact Developer (see section 10) | 30 days |

---

## 7. SECURITY MEASURES

### 7.1 What We Do to Protect Data

✅ Local processing (data doesn't leave your device)  
✅ No cloud storage (no centralized breach risk)  
✅ Session-based access (tokens expire automatically)  
✅ Encrypted storage of license info (if applicable)

### 7.2 What We Do NOT Do

⚠️ **We do not use HTTPS for local network** (HTTP only; data is unencrypted)  
⚠️ **We do not encrypt clipboard data** (plaintext in transit)  
⚠️ **We do not maintain backups** (you are responsible for backup)  
⚠️ **We do not provide encryption keys** (you cannot encrypt LANpad data)

### 7.3 Your Responsibility

**You are responsible for:**
- Protecting your computer's physical security
- Securing your Wi-Fi network (use strong passwords, WPA3)
- Keeping LANpad updated with security patches
- Monitoring clipboard data (do not paste sensitive data while LANpad is connected)

### 7.4 Data Breach Notification

In the unlikely event of a breach of LANpad servers (not applicable currently, as we don't store data), we will:

1. Notify affected users within **72 hours** (GDPR standard)
2. Provide details of what data was accessed
3. Provide guidance on remediation
4. Explain what we're doing to prevent future breaches

---

## 8. THIRD-PARTY DEPENDENCIES & OPEN SOURCE

LANpad uses open-source libraries, each with their own privacy practices:

| Library | License | Privacy Impact |
|---------|---------|-----------------|
| **fastapi** | BSD 3-Clause | None (server-side only, no external calls) |
| **pyautogui** | MIT | None (local keyboard injection only) |
| **pynput** | MIT | None (local keyboard monitoring only) |
| **pyperclip** | BSD 3-Clause | None (local clipboard access only) |
| **rumps** | MIT | None (local system tray only) |

See [THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md) for full details.

---

## 9. DATA RETENTION POLICY

### 9.1 Summary

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| **Session data** | Duration of session only | Automatic upon disconnect |
| **Clipboard** | During session | Cleared when LANpad closes |
| **Configuration** | Until user deletes | Manual deletion or auto-cleanup (future) |
| **License info** | Until license expires or revoked | Manual deletion |
| **Logs** (if enabled) | 24 hours (if implemented) | Automatic rotation |

### 9.2 Detailed Retention Schedules

**Clipboard Data:**
- Retained in memory during active session
- Cleared upon application shutdown or session termination
- No persistent clipboard history

**Session Tokens:**
- Valid for duration of session (typically 15–30 minutes recommended)
- Automatically expired and deleted upon disconnect
- Not retained across app restarts

**Configuration Data:**
- Persisted indefinitely in `~/.lanpad/config.json`
- User can manually delete at any time
- Future: auto-delete after 30 days of app inactivity

---

## 10. CONTACT & COMPLAINTS

### 10.1 Privacy Questions

For questions about this Privacy Policy or your data, contact:

**[Your Name/Entity]**  
Email: [privacy@example.com]  
Address: [Your Address]  
Response Time: Within 15 business days

### 10.2 Complaints

If you believe your privacy rights have been violated:

**In the EU (GDPR):** You may lodge a complaint with your local data protection authority:
- [Link to supervisory authority list](https://edpb.ec.europa.eu/about-edpb/board/members_en)

**In India:** You may contact:
- Data Protection Officer (if applicable): [Your DPO contact]
- Local law enforcement or cybercrime authorities

**In US/Other:** You may pursue legal remedies in your jurisdiction.

---

## 11. CHILDREN'S PRIVACY

LANpad is not intended for children under **13 years old**. We do not knowingly collect data from children. If we learn that a child under 13 has provided us data, we will delete it promptly. Parents/guardians who believe their child has used LANpad should contact us immediately.

---

## 12. INTERNATIONAL DATA TRANSFERS

Since LANpad processes data **locally on your device**, data does not transfer internationally. However:

- If you use LANpad to connect devices in different countries, those devices may process data in different jurisdictions
- You are responsible for complying with local data protection laws in each jurisdiction

---

## 13. POLICY UPDATES

We may update this Privacy Policy at any time. We will:

1. Post the updated Policy on our website/app
2. Update the "Last Updated" date at the top
3. Notify you if changes materially affect your privacy (via email, if applicable)
4. Require your consent before enforcing new terms (if required by law)

**Your continued use of LANpad after updates = acceptance of new Policy.**

---

## 14. CALIFORNIA PRIVACY RIGHTS (CCPA)

If you are a California resident, you have additional rights under CCPA:

| Right | Description | How to Request |
|-------|-------------|-----------------|
| **Know** | What personal data we collect | See section 6.1 |
| **Delete** | Request deletion of your data | Use section 6.2 |
| **Opt-Out** | Opt out of data sales (none occur) | N/A (we don't sell data) |
| **Non-Discrimination** | We cannot discriminate for exercising rights | Contact us if violated |

**To exercise CCPA rights, contact:** [privacy@example.com]

---

## 15. ENTIRE PRIVACY AGREEMENT

This Privacy Policy, together with our [Terms of Service](TERMS_OF_SERVICE.md) and [Acceptable Use Policy](ACCEPTABLE_USE_POLICY.md), constitute the entire agreement regarding your privacy.

---

**Privacy Policy effective as of:** [INSERT DATE]  
**Last updated:** June 19, 2026

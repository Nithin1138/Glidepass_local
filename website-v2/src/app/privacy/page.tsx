"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Eye, Database, Globe, ListCollapse, HelpCircle } from "lucide-react";
import Link from "next/link";

const P = {
  white: "#FAFAFA",
  sky: "#C7EEFF",
  blue: "#0077C0",
  black: "#050505",
  gray: "#121212",
  border: "rgba(199, 238, 255, 0.08)",
  textMuted: "#A0AEC0"
} as const;

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-[#FAFAFA] font-sans relative overflow-hidden" style={{ backgroundColor: P.black }}>
      {/* Background Grid & Orbs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(199,238,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(199,238,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#0077C0]/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#C7EEFF]/5 to-transparent blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-[rgba(199,238,255,0.08)] bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="text-[#C7EEFF]" size={20} />
            <span className="text-xs uppercase tracking-widest text-[#A0AEC0]">Home</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-[#A0AEC0] font-mono">
            LEGAL // PRIVACY POLICY
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(199,238,255,0.15)] bg-[#121212]/80 mb-6">
            <Shield size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">Data Privacy disclosures</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">Policy</span>
          </h1>
          <p className="text-sm text-[#A0AEC0] font-mono">LAST UPDATED: JUNE 19, 2026 &bull; EFFECTIVE DATE: JUNE 19, 2026</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="border border-[rgba(199,238,255,0.08)] rounded-3xl bg-[#050505]/40 backdrop-blur-md p-8 md:p-12 space-y-10 text-[#FAFAFA]/90 leading-relaxed font-inter text-sm md:text-base"
        >
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">1. INTRODUCTION</h2>
            <p>
              This Privacy Policy ("<strong>Policy</strong>") explains how LANpad collects, uses, stores, and protects your data. LANpad is designed with <strong>privacy-by-default</strong> principles: most data is processed locally on your devices and is never transmitted to external servers.
            </p>
            <p>
              By using LANpad, you consent to this Policy. If you do not agree, please do not use LANpad.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 2 */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">2. WHAT DATA DOES LANpad PROCESS?</h2>
            
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">2.1 Data You Provide</h3>
            <div className="overflow-x-auto border border-[rgba(199,238,255,0.08)] rounded-xl">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(199,238,255,0.08)] bg-white/[0.01]">
                    <th className="py-3 px-4 font-bold text-[#C7EEFF]">Data Type</th>
                    <th className="py-3 px-4 font-bold text-[#C7EEFF]">Purpose</th>
                    <th className="py-3 px-4 font-bold text-[#C7EEFF]">Retained?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(199,238,255,0.04)] text-[#A0AEC0]">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Clipboard contents</td>
                    <td className="py-3 px-4">Transfer between paired desktop/mobile devices</td>
                    <td className="py-3 px-4">Temporarily (during active session only)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Text you type</td>
                    <td className="py-3 px-4">Inject simulated keyboard input on target</td>
                    <td className="py-3 px-4">Temporarily (during active session only)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Workspace/Resource metadata</td>
                    <td className="py-3 px-4">Snippet titles, languages, tags, and timestamps for discovery platform sharing</td>
                    <td className="py-3 px-4">Indefinitely on database (for shared resources)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Session preferences</td>
                    <td className="py-3 px-4">Remember user settings (WPM speed limit, etc.)</td>
                    <td className="py-3 px-4">Until config file is cleared</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Configuration data</td>
                    <td className="py-3 px-4">Store user credentials and local settings</td>
                    <td className="py-3 px-4">Indefinitely in local files (`~/.lanpad/config.json`)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">2.2 Technical Data Collected Automatically</h3>
            <div className="overflow-x-auto border border-[rgba(199,238,255,0.08)] rounded-xl">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(199,238,255,0.08)] bg-white/[0.01]">
                    <th className="py-3 px-4 font-bold text-[#C7EEFF]">Data Type</th>
                    <th className="py-3 px-4 font-bold text-[#C7EEFF]">Purpose</th>
                    <th className="py-3 px-4 font-bold text-[#C7EEFF]">Retained?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(199,238,255,0.04)] text-[#A0AEC0]">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Local IP address</td>
                    <td className="py-3 px-4">Generate QR code for local network pairing</td>
                    <td className="py-3 px-4">Session-only</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Device hostname</td>
                    <td className="py-3 px-4">Identify target connection terminals in GUI</td>
                    <td className="py-3 px-4">Session-only</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Viewer Fingerprint Hash</td>
                    <td className="py-3 px-4">Track unique resource views (SHA-256 hash of IP + User-Agent)</td>
                    <td className="py-3 px-4">30 days (auto-expired)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Platform details</td>
                    <td className="py-3 px-4">Adapt system shortcuts to macOS or Windows</td>
                    <td className="py-3 px-4">Session-only</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Session pairing token</td>
                    <td className="py-3 px-4">Authenticate and cryptographically pair phone</td>
                    <td className="py-3 px-4">Session-only</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-5 rounded-2xl border border-red-500/10 bg-red-500/5 space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                <Eye size={16} /> Data We Do NOT Collect
              </h3>
              <p className="text-xs text-[#A0AEC0]">
                We do not collect or monitor your name, GPS location, web search histories, persistent keystroke inputs, or telemetry configurations. All transfers happen locally.
              </p>
            </div>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">3. WHERE IS MY DATA STORED?</h2>
            <div className="space-y-3">
              <p className="flex items-start gap-3">
                <Database className="text-[#0077C0] mt-1 flex-shrink-0" size={18} />
                <span>
                  <strong>Local-Only Processing:</strong> LANpad processes data only on your local network. Your clipboard text never leaves your local Wi-Fi, and no centralized databases hold copy logs.
                </span>
              </p>
              <p className="flex items-start gap-3">
                <Globe className="text-[#C7EEFF] mt-1 flex-shrink-0" size={18} />
                <span>
                  <strong>Plaintext local transport:</strong> Because local network traffic is routed via HTTP (not HTTPS) for convenience, it is readable by users sharing the same subnet. Secure your Wi-Fi network using WPA3.
                </span>
              </p>
            </div>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">4. THIRD-PARTY INTEGRATIONS</h2>
            <p>
              LANpad does not integrate with any external advertisement networks or tracking cookies (e.g. Google Analytics). The application may contact verification servers solely to check license validations (`https://lanpad.app/api/monetization/status`) or download updated web UI templates from GitHub repository. No private clipboard data is ever sent during these checks.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 4A */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">4A. UNIQUE VIEWER TRACKING</h2>
            <p>
              To measure content reach for creators on the discovery platform without compromising privacy, we compute a hashed fingerprint of your IP address and User-Agent (using SHA-256). This hash is stored for 30 days to prevent duplicate view/copy counts. The raw IP address and User-Agent are discarded immediately. You can opt out of this tracking by enabling "Do Not Track" in your browser settings.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">5. YOUR RIGHTS & CONTROLS</h2>
            <p>Because configuration data is saved locally, you can view or delete it immediately:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl border border-[rgba(199,238,255,0.08)] bg-white/[0.01]">
                <p className="text-white mb-2">// View config data (macOS):</p>
                <code className="text-emerald-400">cat ~/.lanpad/config.json</code>
              </div>
              <div className="p-4 rounded-xl border border-[rgba(199,238,255,0.08)] bg-white/[0.01]">
                <p className="text-white mb-2">// Delete config data (macOS):</p>
                <code className="text-red-400">rm -rf ~/.lanpad</code>
              </div>
            </div>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">6. DATA RETENTION POLICY</h2>
            <div className="overflow-x-auto border border-[rgba(199,238,255,0.08)] rounded-xl">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(199,238,255,0.08)] bg-white/[0.01]">
                    <th className="py-3 px-4 font-bold text-[#C7EEFF]">Data Type</th>
                    <th className="py-3 px-4 font-bold text-[#C7EEFF]">Retention Duration</th>
                    <th className="py-3 px-4 font-bold text-[#C7EEFF]">Deletion Mechanism</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(199,238,255,0.04)] text-[#A0AEC0]">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Session logs</td>
                    <td className="py-3 px-4">Duration of the pairing connection only</td>
                    <td className="py-3 px-4">Automatic cleanup on disconnect</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Clipboard text</td>
                    <td className="py-3 px-4">Memory-buffered only during sync events</td>
                    <td className="py-3 px-4">Cleared instantly on exit</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">License keys</td>
                    <td className="py-3 px-4">Until revoked or manually deleted</td>
                    <td className="py-3 px-4">Manual deletion of file</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Viewer Fingerprints</td>
                    <td className="py-3 px-4">30 days</td>
                    <td className="py-3 px-4">Automatic database expiration job</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">7. CONTACT INFORMATION</h2>
            <p>
              If you have any questions or complaints regarding local network processing, data boundaries, or CCPA/GDPR compliance requests, please write to us at <strong>privacy@example.com</strong>.
            </p>
          </section>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(199,238,255,0.08)] py-8 text-center text-xs text-[#A0AEC0]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} LANpad. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-[#FAFAFA] transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-[#FAFAFA] transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

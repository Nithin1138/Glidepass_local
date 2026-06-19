"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Eye, Database, Globe } from "lucide-react";
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
            LEGAL // DOCUMENT
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
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">Privacy Policy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">Policy</span>
          </h1>
          <p className="text-sm text-[#A0AEC0] font-mono">LAST UPDATED: JUNE 19, 2026</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="border border-[rgba(199,238,255,0.08)] rounded-3xl bg-[#050505]/40 backdrop-blur-md p-8 md:p-12 space-y-10 text-[#FAFAFA]/90 leading-relaxed font-inter text-sm md:text-base"
        >
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <span className="text-[#0077C0] font-mono text-sm">01.</span> Introduction
            </h2>
            <p>
              This Privacy Policy explains how LANpad collects, uses, stores, and protects your data. LANpad is designed with <strong>privacy-by-default</strong> principles: data is processed locally on your devices and is never transmitted to external servers.
            </p>
            <p>
              By using LANpad, you consent to this Policy. If you do not agree, please do not use LANpad.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 2 */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <span className="text-[#0077C0] font-mono text-sm">02.</span> What Data is Processed?
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(199,238,255,0.08)]">
                    <th className="py-3 pr-4 font-bold text-[#C7EEFF]">Data Type</th>
                    <th className="py-3 px-4 font-bold text-[#C7EEFF]">Purpose</th>
                    <th className="py-3 pl-4 font-bold text-[#C7EEFF]">Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(199,238,255,0.04)] text-[#A0AEC0]">
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-white">Clipboard Contents</td>
                    <td className="py-3 px-4">Transfer text between devices</td>
                    <td className="py-3 pl-4">Temporary (Session only)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-white">Typed Inputs</td>
                    <td className="py-3 px-4">Inject simulated keyboard entries</td>
                    <td className="py-3 pl-4">Temporary (Session only)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-white">Local Network Parameters</td>
                    <td className="py-3 px-4">Connect devices via local IP</td>
                    <td className="py-3 pl-4">Temporary (Session only)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-white">Configuration File</td>
                    <td className="py-3 px-4">Remember preference settings</td>
                    <td className="py-3 pl-4">Persistent (Local configuration)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-5 rounded-2xl border border-blue-500/10 bg-blue-500/5 space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#C7EEFF] flex items-center gap-2">
                <Eye size={16} /> What We Do NOT Collect
              </h3>
              <p className="text-xs text-[#A0AEC0]">
                We do not collect names, email addresses, location telemetry, web history, keystroke logs, or third-party credentials.
              </p>
            </div>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <span className="text-[#0077C0] font-mono text-sm">03.</span> Where is My Data Stored?
            </h2>
            <p className="flex items-start gap-2">
              <Database className="text-[#0077C0] mt-1 flex-shrink-0" size={18} />
              <span>
                <strong>Local-Only Processing:</strong> LANpad processes data only on your local network. Your clipboard text never leaves your local network, and no external servers store your personal data.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Globe className="text-[#C7EEFF] mt-1 flex-shrink-0" size={18} />
              <span>
                <strong>Transmission Security:</strong> Local network transmission is over HTTP (plaintext). For maximum protection against local eavesdropping, verify that your Wi-Fi network uses WPA3 encryption.
              </span>
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <span className="text-[#0077C0] font-mono text-sm">04.</span> How is My Data Used?
            </h2>
            <p>
              Data is processed strictly to enable cross-device synchronization and keystroke simulation. We <strong>NEVER</strong> sell or share your clipboard data, and we do not participate in any ad network tracking.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <span className="text-[#0077C0] font-mono text-sm">05.</span> Contact Info
            </h2>
            <p>
              For questions regarding this Privacy Policy, you can reach out via email to privacy@example.com.
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

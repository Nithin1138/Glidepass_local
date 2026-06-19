"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Terminal, Shield, Cpu, HelpCircle } from "lucide-react";
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

export default function DocsPage() {
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
            RESOURCES // DOCUMENTATION
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(199, 238, 255, 0.15)] bg-[#121212]/80 mb-6">
            <BookOpen size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">Reference Guide</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Technical <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">Docs</span>
          </h1>
          <p className="text-sm text-[#A0AEC0] font-mono">LANpad User and Developer Reference manual</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="border border-[rgba(199,238,255,0.08)] rounded-3xl bg-[#050505]/40 backdrop-blur-md p-8 md:p-12 space-y-10 text-[#FAFAFA]/90 leading-relaxed font-inter text-sm md:text-base"
        >
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <Terminal size={18} className="text-[#0077C0]" /> 1. Architecture Overview
            </h2>
            <p>
              LANpad uses a local-first client-server bridge. The desktop application starts a local HTTP and WebSocket server (binding to port 8000 by default). Your mobile device acts as a secondary command pad, scanning the dynamic host parameters, generating connection session keys, and sending clipboard and keystroke commands across the local Wi-Fi.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <Cpu size={18} className="text-[#0077C0]" /> 2. Keyboard Injection Simulation
            </h2>
            <p>
              The simulation engine translates incoming text packets into low-level keyboard scans via PyAutoGUI. Key behaviors include:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#A0AEC0]">
              <li><strong>Words Per Minute (WPM):</strong> Adjustable speed settings (default 120 WPM) to match human typing rhythms.</li>
              <li><strong>Character Mapping:</strong> Translates unicode symbols into active system layout keycodes to prevent syntax failures.</li>
              <li><strong>Emergency Override:</strong> Pressing the <code>ESC</code> key instantly halts any ongoing typing sequence.</li>
            </ul>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <Shield size={18} className="text-[#0077C0]" /> 3. Security Boundaries
            </h2>
            <p>
              By default, local network transmissions utilize unencrypted HTTP channels. To prevent eavesdropping by rogue devices:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#A0AEC0]">
              <li>Always execute LANpad over secure, password-protected WPA2/WPA3 Wi-Fi connections.</li>
              <li>Pair exclusively with mobile devices you own.</li>
              <li>Disconnect or quit the server when not actively transfering data.</li>
            </ul>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <HelpCircle size={18} className="text-[#0077C0]" /> 4. Troubleshooting
            </h2>
            <div className="space-y-3 text-xs md:text-sm text-[#A0AEC0]">
              <p><strong>Q: Mobile app cannot connect to the server?</strong><br />
              A: Verify that both your laptop and phone are connected to the exact same Wi-Fi subnet and that AP Isolation is disabled on the router.</p>
              <p><strong>Q: Keyboard input skips characters or symbols?</strong><br />
              A: Make sure your target active application window has keyboard focus and your system language matches standard QWERTY configurations.</p>
            </div>
          </section>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(199,238,255,0.08)] py-8 text-center text-xs text-[#A0AEC0]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} LANpad. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-[#FAFAFA] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[#FAFAFA] transition-colors">Privacy</Link>
            <Link href="/" className="hover:text-[#FAFAFA] transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

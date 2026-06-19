"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, AlertTriangle, Check, ShieldAlert } from "lucide-react";
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

export default function TermsPage() {
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
            LEGAL // TERMS OF SERVICE
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
            <FileText size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">LANpad Core Terms</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">Service</span>
          </h1>
          <p className="text-sm text-[#A0AEC0] font-mono">LAST UPDATED: JUNE 19, 2026 &bull; EFFECTIVE DATE: JUNE 19, 2026</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="border border-[rgba(199,238,255,0.08)] rounded-3xl bg-[#050505]/40 backdrop-blur-md p-8 md:p-12 space-y-8 text-[#FAFAFA]/90 leading-relaxed font-inter text-sm md:text-base"
        >
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">1. ACCEPTANCE OF TERMS</h2>
            <p>
              By downloading, installing, or using LANpad (including any updates, mobile apps, desktop applications, or scripts) (collectively, <strong>"LANpad"</strong>), you agree to be bound by these Terms of Service (<strong>"Terms"</strong>). If you do not agree to these Terms, do not use LANpad.
            </p>
            <p>
              LANpad is provided by Developer (<strong>"we"</strong> or <strong>"Developer"</strong>). These Terms apply to all users of LANpad regardless of platform (macOS, Windows, mobile, local web interface).
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">2. LICENSE GRANT</h2>
            <p>
              We grant you a limited, non-exclusive, non-transferable, revocable license to use LANpad for personal, non-commercial productivity purposes. Under this license, you may not:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#A0AEC0]">
              <li>Rent, lease, lend, sell, redistribute, or sublicense LANpad.</li>
              <li>Reverse-engineer, decompile, disassemble, or attempt to extract the source code (except to the extent permitted by applicable open-source licensing or active local debugging permissions).</li>
              <li>Create unauthorized derivative works or modifications.</li>
              <li>Use LANpad as a managed service to provide commercial automated typing solutions to third parties.</li>
              <li>Remove, obscure, or alter any copyright, trademark, or other proprietary rights notices contained in the application files.</li>
            </ul>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">3. ACCEPTABLE USE & PROHIBITED CONDUCT</h2>
            <p>You agree to comply with all applicable local, national, and international laws when using LANpad. Specifically, you agree that you <strong>MUST NOT</strong> use LANpad for any of the following prohibited categories:</p>

            <div className="p-6 rounded-2xl border border-red-500/10 bg-red-500/5 space-y-4">
              <h3 className="text-base font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                <AlertTriangle size={18} /> Prohibited Conduct Checklists
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm text-[#A0AEC0]">
                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Academic Integrity</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Bypassing browser exam proctoring softwares or system isolation lockouts.</li>
                    <li>Cheating on exams, quizzes, or formal assessments.</li>
                    <li>Circumventing copy-paste locks or keystroke detection layers on academic platforms.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">System Interception</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Accessing corporate computer networks or target terminals without explicit, written authorization.</li>
                    <li>Deploying keylogging or network sniffer scripts on shared computers.</li>
                    <li>Harvesting passwords, session keys, or API configurations.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Check size={16} /> Explicit Permitted Uses
              </h3>
              <ul className="list-disc pl-5 text-xs md:text-sm space-y-1 text-[#A0AEC0]">
                <li>Accessibility: Users with physical keyboard typing difficulties using local clipboard mirrors with institutional approval.</li>
                <li>Cross-device productivity: Mirroring your own typed paragraphs between your personally owned phone and laptop over private network routes.</li>
              </ul>
            </div>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">4. DISCLAIMERS & "AS-IS" WARRANTY</h2>
            <div className="space-y-3 text-sm md:text-base">
              <p>
                <strong>LANpad is provided "AS-IS" and "AS-AVAILABLE" without warranty of any kind</strong>, either express or implied. To the maximum extent permitted by law, Developer disclaims all warranties, including merchantability, fitness for a particular purpose, non-infringement, security, privacy, data integrity, and uninterrupted operation.
              </p>
              <p className="flex items-start gap-2 text-yellow-400/90 font-mono text-xs">
                <ShieldAlert className="flex-shrink-0 mt-0.5" size={16} />
                <span>
                  <strong>NO SECURITY GUARANTEE:</strong> Because clipboard contents travel over your local network using plaintext HTTP requests, your shared text is vulnerable to local Wi-Fi eavesdropping. Users must connect exclusively to secure, password-protected networks (utilizing WPA3) to safeguard sensitive credentials.
                </span>
              </p>
            </div>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">5. LIMITATION OF LIABILITY</h2>
            <p>
              IN NO EVENT shall Developer, its contributors, or associates be liable for any direct, indirect, incidental, special, consequential, or punitive damages (including loss of profits, data, system breaches, academic suspensions, workplace terminations, or criminal prosecutions) arising from your use, misuse, or inability to use LANpad.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">6. DATA HANDLING & RETENTION</h2>
            <p>
              LANpad is designed with local-first protocols. No clipboard text, simulated typing logs, or connection tokens are ever written to, synced with, or transmitted to any external databases or cloud servers owned by Developer. All configuration preferences are saved in your local directory (e.g. `~/.lanpad/`).
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">7. JURISDICTION & DISPUTE RESOLUTION</h2>
            <p>
              These Terms and your relationship with Developer under these Terms shall be governed by the laws of India, without regard to conflict of law provisions. You agree to submit to the exclusive jurisdiction of the courts located within our home region for any dispute resolution.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">8. MODIFICATIONS & UPDATES</h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes will be posted inside the repository or fronted on our website. Your continued use of the application following updates indicates binding acceptance of the updated terms.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">9. CONTACT</h2>
            <p>
              For legal compliance questions, licensing validation details, or other terms concerns, please contact our support desk at <strong>legal@example.com</strong>.
            </p>
          </section>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(199,238,255,0.08)] py-8 text-center text-xs text-[#A0AEC0]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} LANpad. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#FAFAFA] transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-[#FAFAFA] transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

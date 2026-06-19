"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Check, AlertTriangle, FileText } from "lucide-react";
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
            <FileText size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">Terms of Service</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">Service</span>
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
              <span className="text-[#0077C0] font-mono text-sm">01.</span> Acceptance of Terms
            </h2>
            <p>
              By downloading, installing, or using LANpad (including any updates, mobile apps, desktop applications) (collectively, <strong>"LANpad"</strong>), you agree to be bound by these Terms of Service (<strong>"Terms"</strong>). If you do not agree to these Terms, do not use LANpad.
            </p>
            <p>
              LANpad is provided by Developer (<strong>"we"</strong>). These Terms apply to all users of LANpad regardless of platform (macOS, Windows, mobile, web application).
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <span className="text-[#0077C0] font-mono text-sm">02.</span> License Grant
            </h2>
            <p>
              We grant you a limited, non-exclusive, non-transferable, revocable license to use LANpad for personal, non-commercial purposes. You may not:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-[#A0AEC0]">
              <li>Rent, lease, lend, sell, redistribute, or sublicense LANpad.</li>
              <li>Reverse-engineer, decompile, or extract source code.</li>
              <li>Create derivative works or adaptations.</li>
              <li>Use LANpad to provide services to third parties.</li>
              <li>Remove or obscure any copyright, trademark, or proprietary notice.</li>
            </ul>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 3 */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <span className="text-[#0077C0] font-mono text-sm">03.</span> Acceptable Use & Prohibited Conduct
            </h2>
            <p>You MUST NOT use LANpad to perform any of the following prohibited actions:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl border border-red-500/10 bg-red-500/5 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                  <AlertTriangle size={16} /> Academic Infractions
                </h3>
                <ul className="text-xs space-y-2 text-[#A0AEC0]">
                  <li>Bypassing exam proctoring or assessment security measures.</li>
                  <li>Cheating on exams, quizzes, or assignments.</li>
                  <li>Circumventing paste-block or keyboard-lock features.</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl border border-red-500/10 bg-red-500/5 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                  <AlertTriangle size={16} /> Unauthorized Access
                </h3>
                <ul className="text-xs space-y-2 text-[#A0AEC0]">
                  <li>Accessing systems without authorization.</li>
                  <li>Bypassing authentication, firewalls, or network controls.</li>
                  <li>Deploying keystroke loggers or unauthorized sniffing tools.</li>
                </ul>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Check size={16} /> Permitted Use Cases
              </h3>
              <ul className="text-xs space-y-2 text-[#A0AEC0]">
                <li>Accessibility assistance with explicit institutional approval.</li>
                <li>Personal productivity transfers between devices you own.</li>
                <li>Testing and software development under controlled local environments.</li>
              </ul>
            </div>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <span className="text-[#0077C0] font-mono text-sm">04.</span> Disclaimers & "AS-IS" Warranty
            </h2>
            <p>
              <strong>LANpad is provided "AS-IS" and "AS-AVAILABLE" without warranty of any kind</strong>, either express or implied. To the maximum extent permitted by law, Developer disclaims all warranties, including merchantability, fitness for a particular purpose, non-infringement, security, privacy, accuracy, and uninterrupted operation.
            </p>
            <p>
              You acknowledge that keystroke injection is inherently risky and local network data travels unencrypted over HTTP. Secure your network parameters accordingly.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <span className="text-[#0077C0] font-mono text-sm">05.</span> Limitation of Liability
            </h2>
            <p>
              IN NO EVENT shall Developer be liable for any direct, indirect, incidental, special, consequential, or punitive damages (including loss of profits, data, academic integrity violations, or criminal prosecution) resulting from your use or misuse of LANpad.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight flex items-center gap-2 font-outfit">
              <span className="text-[#0077C0] font-mono text-sm">06.</span> Jurisdiction
            </h2>
            <p>
              These Terms are governed by the laws of India, without regard to its conflict-of-law provisions. You irrevocably consent to the exclusive jurisdiction of the local courts.
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

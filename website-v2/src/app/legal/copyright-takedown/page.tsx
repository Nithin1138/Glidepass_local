"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldAlert } from "lucide-react";
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

export default function CopyrightTakedownPage() {
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
            LEGAL // COPYRIGHT TAKEDOWN
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
            <ShieldAlert size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">IP protection</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Copyright <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">Takedown Policy</span>
          </h1>
          <p className="text-sm text-[#A0AEC0] font-mono">LAST UPDATED: JUNE 19, 2026 &bull; DMCA / SECTION 79 IT ACT</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="border border-[rgba(199,238,255,0.08)] rounded-3xl bg-[#050505]/40 backdrop-blur-md p-8 md:p-12 space-y-8 text-[#FAFAFA]/90 leading-relaxed font-inter text-sm md:text-base"
        >
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">1. SUBMITTING A COPYRIGHT CLAIM</h2>
            <p>
              If you believe that any resource hosted on or distributed through LANpad infringes your copyright, you may submit a takedown notice. To be valid, your notice must include:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#A0AEC0]">
              <li>Your full name, contact address, telephone number, and email address.</li>
              <li>A detailed description of the copyrighted work that you claim has been infringed.</li>
              <li>The exact URL or ID of the resource on LANpad that is infringing.</li>
              <li>A good faith statement that you believe the use of the material is unauthorized.</li>
              <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf.</li>
              <li>Your physical or electronic signature.</li>
            </ul>
            <p className="mt-4">
              Send takedown notices to: <strong>copyright@example.com</strong>.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">2. RESPONSE TIMELINE</h2>
            <p>
              We take intellectual property claims seriously. Upon receiving a valid, fully completed takedown notice, we will act to remove or disable access to the infringing material within <strong>36 hours</strong>.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">3. COUNTER-NOTICES</h2>
            <p>
              If your content was removed via a copyright notice and you believe this was an error, you may submit a counter-notice containing your contact details, resource ID, a statement under penalty of perjury of your right to share, and your signature. Counter-notices will be shared with the original claimant.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">4. REPEAT INFRINGER POLICY</h2>
            <p>
              We will terminate or suspend accounts, publishing privileges, or license keys of users who repeatedly publish unauthorized copyrighted material.
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
            <Link href="/privacy" className="hover:text-[#FAFAFA] transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-[#FAFAFA] transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

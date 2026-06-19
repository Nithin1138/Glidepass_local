"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Cookie, Info, ShieldCheck } from "lucide-react";
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

export default function CookiesPage() {
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
            LEGAL // COOKIE POLICY
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
            <Cookie size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">Cookies & Local Data</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Cookie <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">Policy</span>
          </h1>
          <p className="text-sm text-[#A0AEC0] font-mono">LAST UPDATED: JUNE 19, 2026</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="border border-[rgba(199,238,255,0.08)] rounded-3xl bg-[#050505]/40 backdrop-blur-md p-8 md:p-12 space-y-8 text-[#FAFAFA]/90 leading-relaxed font-inter text-sm md:text-base"
        >
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">1. NO TRACKING COOKIES</h2>
            <p>
              LANpad is designed with privacy-by-default protocols. <strong>We do not use any tracking cookies, third-party advertising cookies, or analytics tracking scripts</strong> (such as Google Analytics or Meta Pixel) on our website or within our local dashboard application.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">2. LOCAL CONFIGURATION STORAGE</h2>
            <p>
              While we do not use tracking cookies, LANpad's local web dashboard interface utilizes standard HTML5 local storage parameters and temporary cookies for core application operations.
            </p>
            
            <div className="p-6 rounded-2xl border border-blue-500/10 bg-blue-500/5 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#C7EEFF] flex items-center gap-2">
                <Info size={16} /> Permitted Local Storage Uses
              </h3>
              <ul className="list-disc pl-5 text-xs md:text-sm space-y-2 text-[#A0AEC0]">
                <li><strong>Session Pairing:</strong> Keeping your mobile device connected and authenticated with your local desktop server via temporary tokens.</li>
                <li><strong>UI Preferences:</strong> Remembering your custom typing simulation settings (e.g. Words Per Minute speed configuration) and interface theme settings (dark mode).</li>
              </ul>
            </div>

            <p>
              All preferences are stored purely on your local devices and are never transmitted to Developer or external servers.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">3. MANAGING LOCAL DATA</h2>
            <p>
              You can easily clear local preferences by clearing your browser's history and site data (specifically Local Storage) or by manually resetting the configuration files on your desktop in `~/.lanpad/`.
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

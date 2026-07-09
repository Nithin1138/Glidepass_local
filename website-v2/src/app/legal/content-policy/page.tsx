"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
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

export default function ContentPolicyPage() {
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
            LEGAL // CONTENT POLICY
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
            <Shield size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">Acceptable Content</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Content <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">Policy</span>
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
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">1. ALLOWED CONTENT</h2>
            <p>
              LANpad allows the publishing and sharing of code snippets, workspace configurations, notes, documentation links, and utility files intended for legitimate development, educational, or productivity purposes.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">2. PROHIBITED CONTENT</h2>
            <p>You must not upload, share, or publish any resource that contains:</p>
            <ul className="list-disc pl-5 space-y-2 text-[#A0AEC0]">
              <li><strong>Malware & Exploits:</strong> Viruses, spyware, Trojans, logic bombs, ransomware, or scripts designed to exploit or gain unauthorized access to target terminals or networks.</li>
              <li><strong>Copyright Infringement:</strong> Source code, proprietary assets, textbook materials, or private intellectual property uploaded without explicit authorization. Any code, configurations, or snippets copied or extracted from proprietary enterprise repositories, commercial software products, or university assessment keys without the owner's written consent is strictly prohibited.</li>
              <li><strong>Abuse & Harassment:</strong> Content that threatens, defames, bullies, or promotes discrimination against individuals or groups.</li>
              <li><strong>Spam & Phishing:</strong> Unrelated advertising, repetitive listings, obfuscated redirect links, or form pages designed to harvest credentials.</li>
              <li><strong>Adult/Sensitive Content:</strong> Content that is sexually explicit, graphic, violent, or otherwise inappropriate for educational and professional software environments.</li>
            </ul>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">3. ENFORCEMENT & REMOVALS</h2>
            <p>
              Reports submitted by users are processed daily. We run automated scans to detect public leaks of private or proprietary code. We enforce a strict **zero-tolerance** policy for deliberate intellectual property theft and unauthorized leaks. If any content is found to violate this Content Policy, we reserve the right to remove it immediately without notice and suspend or terminate the creator's upload privileges or license keys permanently.
            </p>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">4. APPEALS</h2>
            <p>
              If your content was removed in error, you may file an appeal by contacting us at <strong>appeals@example.com</strong> with the resource ID and a detailed justification.
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

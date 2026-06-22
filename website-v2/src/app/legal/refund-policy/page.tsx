"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard } from "lucide-react";
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

export default function RefundPolicyPage() {
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
            LEGAL // REFUND POLICY
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
            <CreditCard size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">Billing & refunds</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Refund <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">Policy</span>
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
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">1. ELIGIBILITY FOR REFUNDS</h2>
            <p>
              We want you to be completely satisfied with your purchase. You may request a full refund within <strong>7 days</strong> of your initial purchase of any paid plan (Pro or Creator).
            </p>
            <p>Exceptions to refund eligibility include:</p>
            <ul className="list-disc pl-5 space-y-2 text-[#A0AEC0]">
              <li>No refunds will be issued if you have successfully uploaded, shared, or fetched shared resources using the subscription features.</li>
              <li>No refunds will be issued if your account is suspended or terminated due to a violation of our Terms of Service or Content Policy.</li>
              <li>No refunds are provided for renewals or subsequent months of service.</li>
            </ul>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">2. HOW TO REQUEST A REFUND</h2>
            <p>To request a refund, email our support team at <strong>billing@example.com</strong> with:</p>
            <ul className="list-disc pl-5 space-y-2 text-[#A0AEC0]">
              <li>Your registered email address.</li>
              <li>Your Razorpay payment/order ID.</li>
              <li>A brief reason for the refund request (this helps us improve LANpad!).</li>
            </ul>
          </section>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#C7EEFF] tracking-tight font-outfit">3. PROCESSING TIME</h2>
            <p>
              Once approved, refunds are processed back to the original payment method within 5–7 business days, depending on your bank or payment provider.
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

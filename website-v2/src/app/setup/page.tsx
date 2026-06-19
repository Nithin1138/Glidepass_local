"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Smartphone, Laptop, CheckCircle, Wifi } from "lucide-react";
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

export default function SetupPage() {
  const steps = [
    {
      num: "01",
      title: "Download & Install Launcher",
      desc: "Get the LANpad app for macOS or Windows. Launch it, and complete the one-time system accessibility settings prompt.",
      icon: <Laptop className="text-[#C7EEFF]" size={24} />
    },
    {
      num: "02",
      title: "Ensure Same Network",
      desc: "Confirm both your desktop/laptop and mobile device are connected to the same local Wi-Fi router (avoid open corporate subnets).",
      icon: <Wifi className="text-[#C7EEFF]" size={24} />
    },
    {
      num: "03",
      title: "Scan the pairing QR Code",
      desc: "Open the mobile app or browser interface on your phone. Scan the QR code displayed inside the desktop dashboard launcher.",
      icon: <Smartphone className="text-[#C7EEFF]" size={24} />
    },
    {
      num: "04",
      title: "Sync & Type",
      desc: "You are paired! Clipboard contents will mirror instantly, and any text you type on mobile can be simulated directly on the laptop.",
      icon: <CheckCircle className="text-[#C7EEFF]" size={24} />
    }
  ];

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
            RESOURCES // SETUP GUIDE
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
            <Play size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">Quickstart Checklist</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Setup <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">Guide</span>
          </h1>
          <p className="text-sm text-[#A0AEC0] font-mono">Follow these steps to connect and configure your LANpad session.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[#FAFAFA]/90 font-inter text-sm md:text-base"
        >
          {steps.map((step, index) => (
            <div key={index} className="p-6 rounded-2xl border border-[rgba(199,238,255,0.08)] bg-[#050505]/40 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#0077C0] font-mono">{step.num}</span>
                <div className="p-2 rounded-lg border border-[rgba(199,238,255,0.08)] bg-white/[0.01]">
                  {step.icon}
                </div>
              </div>
              <h3 className="text-base font-bold font-outfit text-[#C7EEFF]">{step.title}</h3>
              <p className="text-xs md:text-sm text-[#A0AEC0] leading-relaxed">{step.desc}</p>
            </div>
          ))}
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

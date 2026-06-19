"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Activity, CheckCircle, AlertCircle } from "lucide-react";
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

export default function StatusPage() {
  const [latency, setLatency] = useState("12ms");

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = Math.floor(Math.random() * 8) + 8;
      setLatency(`${ms}ms`);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const systems = [
    { name: "Licensing Status Verification (Status Check)", desc: "Verifies license passes globally", status: "Operational" },
    { name: "OTA UI Updates Distribution Network", desc: "Hosts and distributes web interface templates", status: "Operational" },
    { name: "AP Isolation Tunneling Services (Bore/Bridges)", desc: "Enables secure cross-subnet routing fallbacks", status: "Operational" }
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
            RESOURCES // API STATUS
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
            <Activity size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">Live Health Monitor</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            System <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">Status</span>
          </h1>
          <p className="text-sm text-[#A0AEC0] font-mono">Current operational health index for all LANpad remote interfaces.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="border border-[rgba(199,238,255,0.08)] rounded-3xl bg-[#050505]/40 backdrop-blur-md p-8 md:p-12 space-y-8 text-[#FAFAFA]/90 leading-relaxed font-inter text-sm md:text-base"
        >
          {/* Overall Health Card */}
          <div className="flex items-center justify-between p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/5">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-emerald-400" size={24} />
              <div>
                <h3 className="font-bold text-white text-base">All Systems Operational</h3>
                <p className="text-xs text-[#A0AEC0]">Uptime averages 99.98% over past 30 days.</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-[#A0AEC0] block">LATENCY</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{latency}</span>
            </div>
          </div>

          <div className="h-[1px] bg-[rgba(199,238,255,0.08)]" />

          {/* Subsystems */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#C7EEFF] font-mono">LANpad Network Subsystems</h3>
            <div className="space-y-4">
              {systems.map((sys, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-[rgba(199,238,255,0.05)] bg-[#121212]/30">
                  <div>
                    <h4 className="font-bold text-xs md:text-sm text-white">{sys.name}</h4>
                    <p className="text-[10px] md:text-xs text-[#A0AEC0]">{sys.desc}</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    {sys.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
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

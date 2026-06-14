"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Check, Shield, Zap, Sparkles, CreditCard, ChevronRight, HelpCircle, 
  ArrowLeft, Globe, Key, Clock, BookOpen, Star
} from "lucide-react";
import Link from "next/link";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PALETTE TOKENS (Synced with Admin page theme)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const P = {
  white: "#FAFAFA",
  sky: "#C7EEFF",
  blue: "#0077C0",
  black: "#050505",
  gray: "#121212",
  border: "rgba(199, 238, 255, 0.08)",
  textMuted: "#A0AEC0"
} as const;

export default function PricingPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const plans = [
    {
      name: "Week Pass",
      price: "₹39",
      period: "per week",
      description: "Perfect for quick test-prep and exam weeks.",
      features: [
        "Type Mode (Bypass paste blocks)",
        "Custom WPM control",
        "AP Isolation bypass (Tunnel)",
        "Instant Clipboard sync",
        "1 Active session at a time",
      ],
      isPopular: false,
      badge: "Exam Special",
      color: "rgba(160, 174, 192, 0.08)"
    },
    {
      name: "Monthly Pass",
      price: "₹99",
      period: "per month",
      description: "For consistent, hassle-free campus connectivity.",
      features: [
        "All Week Pass features",
        "Live Sync character mirroring",
        "Persistent session pairing",
        "Multiple device configurations",
        "Priority tunnel routing",
      ],
      isPopular: false,
      badge: "Standard",
      color: "rgba(0, 119, 192, 0.08)"
    },
    {
      name: "Sem Pass",
      price: "₹299",
      period: "per semester",
      description: "The ultimate academic semester companion. Unmatched value.",
      features: [
        "All Monthly Pass features",
        "Unlimited parallel sessions",
        "Dedicated high-speed Tunnels",
        "Direct developer support",
        "Ad-free experience",
      ],
      isPopular: true,
      badge: "Best Value",
      color: "rgba(199, 238, 255, 0.12)"
    },
    {
      name: "Yearly Pass",
      price: "₹499",
      period: "per year",
      description: "Full year-round connectivity and unlimited access.",
      features: [
        "All Sem Pass features",
        "Offline emergency access",
        "Free version upgrades",
        "Persistent cloud backup",
        "Special Discord contributor role",
      ],
      isPopular: false,
      badge: "Power User",
      color: "rgba(250, 250, 250, 0.08)"
    }
  ];

  const faqs = [
    {
      q: "How does the license activation work?",
      a: "Once you purchase a pass, you will receive an activation key via your registered email. Simply paste it into the Lock Screen of the LANpad desktop app to unlock all features instantly."
    },
    {
      q: "Can I use one license key on multiple devices?",
      a: "Yes! Monthly, Sem, and Yearly passes allow you to activate LANpad on up to 3 personal devices simultaneously."
    },
    {
      q: "What is the AP Isolation Bypass (Tunnel)?",
      a: "Institutional Wi-Fi networks (like college campus Wi-Fi) block devices from communicating with each other. The Tunnel connection acts as a secure external bridge to bypass these restrictions seamlessly."
    },
    {
      q: "Do you offer refunds?",
      a: "Due to the digital nature of the software passes, we do not support automated refunds. However, if you face issues, reach out to our team via the Admin portal and we will resolve it."
    }
  ];

  return (
    <div className="min-h-screen text-[#FAFAFA] font-sans relative overflow-hidden" style={{ backgroundColor: P.black }}>
      
      {/* ── Background Grid & Orbs ── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(199,238,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(199,238,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      
      {/* Glowing Accent Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#0077C0]/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#C7EEFF]/5 to-transparent blur-[120px] pointer-events-none" />

      {/* ── Header ── */}
      <header className="border-b border-[rgba(199,238,255,0.08)] bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ArrowLeft className="text-[#C7EEFF]" size={20} />
              <span className="text-xs uppercase tracking-widest text-[#A0AEC0]">Home</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-mono">
              PRO ACTIVE
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero section ── */}
      <main className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(199,238,255,0.15)] bg-[#121212]/80 mb-6"
          >
            <Sparkles size={14} className="text-[#C7EEFF]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#C7EEFF]">PLANS & ACCESS</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6"
          >
            Choose your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C7EEFF] via-[#0077C0] to-[#FAFAFA]">LANpad Pass</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg text-[#A0AEC0] font-medium"
          >
            Neutralize institutional restrictions and bypass AP Isolation instantly. Choose the plan that fits your campus needs.
          </motion.p>
        </div>

        {/* ── Pricing Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          {plans.map((plan, index) => {
            const isHovered = hoveredCard === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`relative rounded-2xl border transition-all duration-500 overflow-hidden flex flex-col justify-between`}
                style={{
                  backgroundColor: plan.isPopular ? "rgba(18, 18, 18, 0.85)" : "rgba(5, 5, 5, 0.70)",
                  borderColor: plan.isPopular 
                    ? "rgba(0, 119, 192, 0.4)" 
                    : (isHovered ? "rgba(199, 238, 255, 0.2)" : "rgba(199, 238, 255, 0.08)"),
                  boxShadow: isHovered 
                    ? `0 10px 30px -10px ${plan.isPopular ? "rgba(0, 119, 192, 0.3)" : "rgba(199, 238, 255, 0.15)"}`
                    : "none"
                }}
              >
                {/* Neon Top Highlight for Popular plan */}
                {plan.isPopular && (
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#0077C0] to-transparent" />
                )}

                <div className="p-8">
                  {/* Badge */}
                  <div className="flex justify-between items-center mb-6">
                    <span 
                      className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border`}
                      style={{
                        backgroundColor: plan.isPopular ? "rgba(0, 119, 192, 0.1)" : "rgba(199, 238, 255, 0.05)",
                        borderColor: plan.isPopular ? "rgba(0, 119, 192, 0.3)" : "rgba(199, 238, 255, 0.1)",
                        color: plan.isPopular ? "#C7EEFF" : "#A0AEC0"
                      }}
                    >
                      {plan.badge}
                    </span>
                    {plan.isPopular && (
                      <span className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold tracking-wider uppercase">
                        <Star size={12} fill="currentColor" /> POPULAR
                      </span>
                    )}
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-xl font-bold tracking-tight mb-2 text-[#FAFAFA]">
                    {plan.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-[#A0AEC0] mb-6 h-10">
                    {plan.description}
                  </p>

                  {/* Pricing */}
                  <div className="flex items-baseline gap-1.5 mb-8">
                    <span className="text-4xl font-extrabold tracking-tight text-[#FAFAFA]">
                      {plan.price}
                    </span>
                    <span className="text-xs text-[#A0AEC0]">
                      / {plan.period}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-[1px] bg-[rgba(199,238,255,0.08)] mb-8" />

                  {/* Features List */}
                  <ul className="space-y-4">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-3">
                        <div className={`rounded-full p-0.5 mt-0.5 flex-shrink-0 ${plan.isPopular ? "bg-[#0077C0]/20 text-[#C7EEFF]" : "bg-[#121212] text-[#A0AEC0]"}`}>
                          <Check size={12} />
                        </div>
                        <span className="text-xs text-[#FAFAFA]/90">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Action Button */}
                <div className="p-8 pt-0">
                  <button 
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2`}
                    style={{
                      backgroundColor: plan.isPopular ? P.blue : P.gray,
                      color: P.white,
                      border: plan.isPopular ? "none" : `1px solid ${P.border}`,
                    }}
                  >
                    <span>Get Activation Key</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

              </motion.div>
            );
          })}
        </div>

        {/* ── Feature Comparison Section ── */}
        <section className="border border-[rgba(199,238,255,0.08)] rounded-3xl bg-[#050505]/40 backdrop-blur-md p-10 mb-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#0077C0]/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-start justify-between gap-12">
            <div className="max-w-md">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                What does a <span className="text-[#C7EEFF]">Pass</span> unlock?
              </h2>
              <p className="text-sm text-[#A0AEC0] mb-6 leading-relaxed">
                Unlock full hardware accessibility parameters to bypass campus Wi-Fi AP Isolation and institutional proxies instantly.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[rgba(199,238,255,0.05)] bg-[#121212]/30">
                  <Globe className="text-[#C7EEFF] mb-2" size={20} />
                  <h4 className="text-xs font-bold mb-1">Tunneling</h4>
                  <p className="text-[10px] text-[#A0AEC0]">External secure bridges.</p>
                </div>
                <div className="p-4 rounded-xl border border-[rgba(199,238,255,0.05)] bg-[#121212]/30">
                  <Key className="text-[#0077C0] mb-2" size={20} />
                  <h4 className="text-xs font-bold mb-1">Activation</h4>
                  <p className="text-[10px] text-[#A0AEC0]">Instant lifetime validity.</p>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full space-y-6">
              <div className="flex gap-4 p-4 rounded-2xl border border-[rgba(199,238,255,0.05)] bg-[#121212]/20 hover:border-[rgba(199,238,255,0.15)] transition-all">
                <Clock className="text-[#C7EEFF] flex-shrink-0" size={24} />
                <div>
                  <h4 className="text-sm font-bold mb-1">Lifetime or Validity-based Licensing</h4>
                  <p className="text-xs text-[#A0AEC0] leading-relaxed">
                    License keys persist locally inside the app. You only enter them once; the app automatically manages reconnects and credentials.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-2xl border border-[rgba(199,238,255,0.05)] bg-[#121212]/20 hover:border-[rgba(199,238,255,0.15)] transition-all">
                <Zap className="text-[#0077C0] flex-shrink-0" size={24} />
                <div>
                  <h4 className="text-sm font-bold mb-1">Uncapped Speeds</h4>
                  <p className="text-xs text-[#A0AEC0] leading-relaxed">
                    High-performance cloud tunnels run at maximum bandwidth over Port 443, making downloads and clipboard transfer incredibly fast.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-2xl border border-[rgba(199,238,255,0.05)] bg-[#121212]/20 hover:border-[rgba(199,238,255,0.15)] transition-all">
                <BookOpen className="text-emerald-400 flex-shrink-0" size={24} />
                <div>
                  <h4 className="text-sm font-bold mb-1">College Isolation Bypass</h4>
                  <p className="text-xs text-[#A0AEC0] leading-relaxed">
                    Purpose-built algorithms automatically bypass routers running peer-to-peer isolation filters in academic campuses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ Section ── */}
        <section className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold tracking-tight mb-8 text-center flex items-center justify-center gap-2">
            <HelpCircle size={22} className="text-[#C7EEFF]" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 rounded-2xl border border-[rgba(199,238,255,0.06)] bg-[#121212]/20">
                <h4 className="text-sm font-bold text-[#FAFAFA] mb-2">{faq.q}</h4>
                <p className="text-xs text-[#A0AEC0] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[rgba(199,238,255,0.08)] py-8 text-center text-xs text-[#A0AEC0]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} LANpad. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-[#FAFAFA] transition-colors">Downloads</Link>
            <Link href="/admin" className="hover:text-[#FAFAFA] transition-colors">Admin Portal</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

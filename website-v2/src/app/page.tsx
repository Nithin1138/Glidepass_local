"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Zap, ShieldCheck, Keyboard, RefreshCw, ChevronRight, Monitor, Smartphone, Chrome, ArrowRight, Download, BookOpen, Lock } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";

// --- COMPONENTS ---

const Navbar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 font-outfit font-extrabold text-xl tracking-tighter">
          <Zap className="text-accent fill-accent" size={24} />
          <span>GLIDEPASS</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#docs" className="hover:text-white transition-colors">Documentation</Link>
          <Link href="#downloads" className="hover:text-white transition-colors">Downloads</Link>
        </div>
        <Link href="#setup" className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-accent hover:text-white transition-all duration-300">
          Get Started
        </Link>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-40 pb-20 px-6 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-accent/20 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-4xl mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-[10px] font-bold uppercase tracking-widest mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          v1.4.1 Production Grade
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-outfit font-extrabold tracking-tight leading-[0.9] mb-8"
        >
          Your Phone as a <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-[#d97757]">Intelligent Layer</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 font-inter"
        >
          Instant local text transfer, human-like typing simulation, and real-time input orchestration. Built for power users who demand zero-lag productivity.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="#setup" className="group bg-accent text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-accent-light transition-all duration-300 shadow-xl shadow-accent/20">
            Setup Guide
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="#downloads" className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all duration-300">
            Download Assets
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

const Visualization = () => {
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const fullText = "Hello from my phone! _";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) {
        i = 0;
        setTimeout(() => {}, 1000);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="relative bg-white/[0.02] border border-white/5 rounded-[40px] p-12 md:p-20 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
            
            {/* Phone Side */}
            <div className="flex justify-center">
              <motion.div 
                initial={{ rotateY: 20 }}
                whileInView={{ rotateY: 10 }}
                className="w-64 h-[500px] bg-[#0a0a0a] border-[8px] border-[#1a1a1a] rounded-[45px] p-6 shadow-2xl relative"
              >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#1a1a1a] rounded-full" />
                <div className="mt-12 text-center">
                   <p className="text-[10px] text-accent font-bold tracking-widest uppercase mb-4">Syncing...</p>
                   <div className="bg-accent/20 border border-accent/30 p-4 rounded-2xl text-accent text-sm font-medium animate-pulse">
                     {text}
                   </div>
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/10 rounded-full" />
              </motion.div>
            </div>

            {/* Laptop Side */}
            <div className="flex justify-center">
              <motion.div 
                initial={{ rotateY: -20 }}
                whileInView={{ rotateY: -10 }}
                className="w-full max-w-lg aspect-video bg-[#0a0a0a] border-[12px] border-[#1a1a1a] rounded-3xl p-8 shadow-2xl relative group"
              >
                <div className="flex gap-1.5 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500/20" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20" />
                </div>
                <div className="font-mono text-sm space-y-2">
                  <p className="text-accent/60">const glide = <span className="text-accent">"awesome"</span>;</p>
                  <p className="text-white/80">{text}<span className="animate-pulse text-accent">|</span></p>
                </div>
                
                {/* Connection Visual */}
                <div className="absolute -left-20 top-1/2 -translate-y-1/2 hidden lg:block">
                  <div className="w-20 h-px bg-gradient-to-r from-accent to-transparent relative">
                    <motion.div 
                      animate={{ left: ["0%", "100%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-3 left-0 text-xl"
                    >
                      🛰️
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
          
          {/* Background Decorative Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent/5 blur-[100px] -z-10" />
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  const features = [
    {
      title: "Flash Paste",
      desc: "Immediate high-speed text transfer using clipboard injection with smart fallback.",
      icon: <Zap size={24} />,
      color: "from-orange-500 to-accent"
    },
    {
      title: "Realistic Typing",
      desc: "Human-like keyboard event simulation to bypass restricted environment blocks.",
      icon: <Keyboard size={24} />,
      color: "from-blue-500 to-indigo-500"
    },
    {
      title: "Local-Only Security",
      desc: "Zero-cloud persistence. Data exists only in temporary memory during active sessions.",
      icon: <ShieldCheck size={24} />,
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Input Orchestration",
      desc: "Turn your phone into a remote control layer for macros and terminal commands.",
      icon: <RefreshCw size={24} />,
      color: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <section id="features" className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-outfit font-extrabold mb-6 tracking-tight">Built for Performance</h2>
          <p className="text-white/50 max-w-xl mx-auto">Every detail engineered to eliminate friction between your ideas and your machine.</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 bg-white/[0.03] border border-white/5 rounded-[32px] hover:border-accent/30 transition-all duration-500"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-6 shadow-lg shadow-black/50`}>
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-4 font-outfit">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed font-inter">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SetupGuide = () => {
  return (
    <section id="setup" className="py-20 px-6">
      <div className="max-w-5xl mx-auto bg-accent/5 border border-accent/10 rounded-[48px] p-12 md:p-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 blur-[100px] rounded-full -z-10" />
        
        <h2 className="text-4xl md:text-6xl font-outfit font-extrabold mb-12 tracking-tight">Setup in 60s</h2>
        
        <div className="space-y-12">
          {[
            { step: "01", title: "Launch Backend", desc: "Download and run the GlidePass binary on your laptop. Hit 'Start Server'." },
            { step: "02", title: "Pair Mobile", desc: "Scan the generated QR code with your phone to establish a secure local tunnel." },
            { step: "03", title: "Ready to Sync", desc: "Start typing or pasting. Your laptop is now an extension of your phone." }
          ].map((s, i) => (
            <div key={i} className="flex gap-8 group">
              <span className="text-6xl font-outfit font-black text-white/5 group-hover:text-accent/20 transition-colors duration-500 leading-none">
                {s.step}
              </span>
              <div>
                <h3 className="text-2xl font-bold mb-3 font-outfit">{s.title}</h3>
                <p className="text-white/50 max-w-md font-inter">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Downloads = () => {
  const assets = [
    { title: "Chrome Extension", icon: <Chrome />, desc: "Unpacked folder for dev mode", link: "#" },
    { title: "macOS Backend", icon: <Monitor />, desc: "Intel & Apple Silicon Native", link: "#" },
    { title: "Windows Backend", icon: <Monitor />, desc: "Standard x64 Portable .exe", link: "#" }
  ];

  return (
    <section id="downloads" className="py-20 px-6">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl md:text-6xl font-outfit font-extrabold mb-16 tracking-tight">Downloads</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {assets.map((a, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[32px] hover:scale-[1.02] transition-transform duration-300">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto mb-6">
                {a.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 font-outfit">{a.title}</h3>
              <p className="text-xs text-white/40 mb-8 font-inter">{a.desc}</p>
              <button className="w-full py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent hover:text-white transition-colors">
                <Download size={16} />
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Visualization />
      <Features />
      <SetupGuide />
      <Downloads />
      
      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:row items-center justify-between gap-12">
          <div className="flex items-center gap-2 font-outfit font-extrabold text-xl tracking-tighter">
            <Zap className="text-accent fill-accent" size={24} />
            <span>GLIDEPASS</span>
          </div>
          <div className="flex gap-8 text-sm text-white/40">
            <Link href="#">Twitter</Link>
            <Link href="#">GitHub</Link>
            <Link href="#">Terms</Link>
          </div>
          <p className="text-xs text-white/20 font-mono">© 2026 GLIDEPASS. BUILT FOR PEAK PRODUCTIVITY.</p>
        </div>
      </footer>
    </main>
  );
}

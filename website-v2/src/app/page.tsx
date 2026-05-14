"use client";

import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { Zap, ShieldCheck, Keyboard, RefreshCw, ChevronRight, Monitor, Smartphone, Globe, ArrowRight, Download, BookOpen, Lock } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";

// --- UI UTILITIES ---

const CursorSpotlight = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
      style={{
        background: useTransform(
          [mouseX, mouseY],
          ([x, y]) => `radial-gradient(600px at ${x}px ${y}px, rgba(163, 106, 82, 0.05), transparent 80%)`
        ),
      }}
    />
  );
};

// --- COMPONENTS ---

const Navbar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/[0.03] bg-black/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
        <div className="flex items-center gap-3 font-outfit font-black text-xl tracking-tighter">
          <Zap className="text-accent fill-accent" size={26} />
          <span className="mt-1">GLIDEPASS</span>
        </div>
        <div className="hidden md:flex items-center gap-10 text-[13px] font-medium tracking-wide uppercase text-white/40">
          <Link href="#features" className="hover:text-white transition-colors duration-300">Features</Link>
          <Link href="#visualization" className="hover:text-white transition-colors duration-300">Technology</Link>
          <Link href="#downloads" className="hover:text-white transition-colors duration-300">Downloads</Link>
        </div>
        <Link href="#setup" className="group bg-white text-black px-7 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all duration-500">
          Get Started
        </Link>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-60 pb-32 px-6 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-accent/10 blur-[150px] rounded-full -z-10" />
      
      <div className="max-w-6xl mx-auto text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl md:text-8xl lg:text-[140px] font-outfit font-black tracking-tighter leading-[0.85] mb-12"
        >
          Your Phone as an <br />
          <span className="inline-block py-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30">
            Intelligent Layer
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-lg md:text-2xl text-white/40 max-w-2xl mx-auto mb-16 font-inter leading-relaxed tracking-tight"
        >
          Instant local text transfer, human-like typing simulation, and real-time input orchestration. Zero lag. Zero cloud. Just speed.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <Link href="#setup" className="group bg-accent text-white px-10 py-5 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all duration-500 shadow-2xl shadow-accent/20">
            Setup Guide
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="#downloads" className="px-10 py-5 rounded-2xl font-bold border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300">
            Download Assets
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

const Visualization = () => {
  const [text, setText] = useState("");
  const fullText = "Hello from my phone! _";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) {
        i = 0;
      }
    }, 120);
    return () => clearInterval(interval);
  }, []);

  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"]
  });

  const phoneRotate = useTransform(scrollYProgress, [0, 1], [0, 20]);
  const laptopRotate = useTransform(scrollYProgress, [0, 1], [0, -20]);

  return (
    <section id="visualization" ref={sectionRef} className="py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative bg-white/[0.01] border border-white/[0.05] rounded-[64px] p-16 md:p-32 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-24 items-center relative z-10">
            
            {/* Phone Side */}
            <div className="flex justify-center" style={{ perspective: "1200px" }}>
              <motion.div 
                style={{ transformStyle: "preserve-3d", rotateY: phoneRotate }}
                className="w-[200px] h-[420px] bg-[#0a0a0a] border-[10px] border-[#1a1a1a] rounded-[40px] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative"
              >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-5 bg-[#1a1a1a] rounded-full shadow-inner" />
                <div className="mt-24 text-center">
                   <p className="text-[10px] text-white/30 font-black tracking-[0.3em] uppercase mb-8">Syncing</p>
                   <div className="bg-accent p-5 rounded-2xl text-white text-sm font-semibold shadow-[0_15px_40px_rgba(163,106,82,0.4)] leading-snug">
                     {text}
                   </div>
                </div>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-white/5 rounded-full" />
              </motion.div>
            </div>

            {/* Laptop Side */}
            <div className="flex justify-center" style={{ perspective: "1200px" }}>
              <motion.div 
                style={{ transformStyle: "preserve-3d", rotateY: laptopRotate }}
                className="w-full max-w-xl aspect-[1.6/1] bg-[#0a0a0a] border-[14px] border-[#1a1a1a] rounded-[32px] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative"
              >
                <div className="flex gap-2 mb-8">
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
                <div className="font-mono text-base space-y-3">
                  <p className="text-white/20">const glide = <span className="text-accent">"awesome"</span>;</p>
                  <p className="text-white/80 leading-relaxed tracking-tight">
                    {text}
                    <span className="inline-block w-[1px] h-5 bg-accent ml-1 animate-pulse" />
                  </p>
                </div>
                
                {/* Connection Visual */}
                <div className="absolute -left-48 top-1/2 -translate-y-1/2 w-48 h-[1px] bg-gradient-to-r from-accent/40 to-transparent hidden xl:block overflow-visible">
                  <motion.div 
                    animate={{ left: ["-10%", "110%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-3.5 text-3xl filter drop-shadow(0 0 10px #a36a52)"
                  >
                    🛰️
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent/5 blur-[120px] -z-10" />
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  const features = [
    { title: "Flash Paste", desc: "Immediate high-speed text transfer using clipboard injection with smart fallback.", icon: <Zap size={22} /> },
    { title: "Realistic Typing", desc: "Human-like keyboard event simulation to bypass restricted environment blocks.", icon: <Keyboard size={22} /> },
    { title: "Local-Only", desc: "Zero-cloud persistence. Data exists only in temporary memory during active sessions.", icon: <ShieldCheck size={22} /> },
    { title: "Orchestration", desc: "Turn your phone into a remote control layer for macros and terminal commands.", icon: <RefreshCw size={22} /> }
  ];

  return (
    <section id="features" className="py-40 px-8 bg-[#080808]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-24">
          <div>
            <h2 className="text-5xl md:text-7xl font-outfit font-black tracking-tighter mb-4">The New Standard</h2>
            <p className="text-white/40 max-w-md font-medium text-lg">Engineered to eliminate friction between your ideas and your machine.</p>
          </div>
          <div className="h-[1px] flex-1 bg-white/10 hidden md:block mb-6 ml-12" />
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.8 }}
              className="p-10 bg-white/[0.02] border border-white/[0.05] rounded-[40px] hover:border-accent/40 transition-all duration-700 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-8 text-accent group-hover:scale-110 transition-transform duration-500">
                {f.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4 font-outfit">{f.title}</h3>
              <p className="text-[15px] text-white/40 leading-relaxed font-inter">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <CursorSpotlight />
      <Navbar />
      <Hero />
      <Visualization />
      <Features />
      
      {/* Downloads */}
      <section id="downloads" className="py-40 px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
           {[
             { title: "Chrome Extension", icon: <Globe />, label: "Install" },
             { title: "macOS Backend", icon: <Monitor />, label: "Download .dmg" },
             { title: "Windows Backend", icon: <Monitor />, label: "Download .exe" }
           ].map((d, i) => (
             <div key={i} className="group p-10 bg-white/[0.01] border border-white/[0.05] rounded-[40px] text-center hover:bg-white/[0.03] transition-all duration-500">
               <div className="w-20 h-20 bg-accent/5 rounded-[28px] flex items-center justify-center text-accent mx-auto mb-8 group-hover:scale-110 transition-transform">
                 {d.icon}
               </div>
               <h3 className="text-xl font-bold mb-8 font-outfit uppercase tracking-widest">{d.title}</h3>
               <button className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-accent hover:text-white transition-all duration-500">
                 {d.label}
               </button>
             </div>
           ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-8 flex flex-col items-center gap-16">
          <div className="flex items-center gap-3 font-outfit font-black text-2xl tracking-tighter">
            <Zap className="text-accent fill-accent" size={32} />
            <span className="mt-1">GLIDEPASS</span>
          </div>
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
            <Link href="#" className="hover:text-accent transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-accent transition-colors">GitHub</Link>
            <Link href="#" className="hover:text-accent transition-colors">Discord</Link>
          </div>
          <p className="text-[10px] text-white/10 font-mono tracking-widest">© 2026 GLIDEPASS. THE INPUT STANDARD.</p>
        </div>
      </footer>
    </main>
  );
}

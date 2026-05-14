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
          ([x, y]) => `radial-gradient(600px at ${x}px ${y}px, rgba(99, 102, 241, 0.08), rgba(236, 72, 153, 0.02), transparent 80%)`
        ),
      }}
    />
  );
};

const BackgroundOrbs = () => {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
      <motion.div 
        animate={{ 
          x: [0, 100, 0], 
          y: [0, 50, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full"
      />
      <motion.div 
        animate={{ 
          x: [0, -100, 0], 
          y: [0, 100, 0],
          scale: [1, 1.3, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-500/10 blur-[120px] rounded-full"
      />
    </div>
  );
};

// --- COMPONENTS ---

const Navbar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/[0.05] bg-black/40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
        <div className="flex items-center gap-3 font-outfit font-black text-xl tracking-tighter">
          <Zap className="text-indigo-500 fill-indigo-500 animate-pulse" size={26} />
          <span className="mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">GLIDEPASS</span>
        </div>
        <div className="hidden md:flex items-center gap-10 text-[11px] font-bold tracking-[0.2em] uppercase text-white/40">
          <Link href="#features" className="hover:text-indigo-400 transition-colors duration-300">Features</Link>
          <Link href="#visualization" className="hover:text-rose-400 transition-colors duration-300">Technology</Link>
          <Link href="#downloads" className="hover:text-amber-400 transition-colors duration-300">Downloads</Link>
        </div>
        <Link href="#setup" className="relative group bg-white text-black px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest overflow-hidden transition-all duration-500">
          <span className="relative z-10 group-hover:text-white transition-colors duration-500">Get Started</span>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-rose-600 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
        </Link>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-64 pb-32 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto text-center relative z-10">
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl md:text-8xl lg:text-[140px] font-outfit font-black tracking-tighter leading-[0.8] mb-12"
        >
          <span className="inline-block py-4 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/20">
            Intelligent
          </span>
          <br />
          <span className="inline-block py-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-rose-400 to-amber-400">
            Layer
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-lg md:text-2xl text-white/40 max-w-2xl mx-auto mb-16 font-inter leading-relaxed tracking-tight"
        >
          The ultimate input orchestration engine. Instant local transfer, realistic typing, and biometric-grade security. Redefining how you interact.
        </motion.p>
        
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <Link href="#setup" className="group relative px-10 py-5 rounded-2xl font-bold overflow-hidden shadow-2xl shadow-indigo-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-rose-600 transition-transform group-hover:scale-110 duration-500" />
            <span className="relative flex items-center gap-3 text-white">
              Setup Guide
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
          <Link href="#downloads" className="px-10 py-5 rounded-2xl font-bold border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300">
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
      if (i > fullText.length) i = 0;
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
        <div className="relative bg-white/[0.01] border border-white/[0.08] rounded-[64px] p-16 md:p-32 overflow-hidden group">
          <div className="grid lg:grid-cols-2 gap-24 items-center relative z-10">
            
            {/* Phone Side */}
            <div className="flex justify-center" style={{ perspective: "1200px" }}>
              <motion.div 
                style={{ transformStyle: "preserve-3d", rotateY: phoneRotate }}
                className="w-[200px] h-[420px] bg-[#0a0a0a] border-[10px] border-[#1a1a1a] rounded-[40px] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-50" />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-5 bg-[#1a1a1a] rounded-full shadow-inner" />
                <div className="mt-24 text-center relative z-10">
                   <p className="text-[10px] text-indigo-400 font-black tracking-[0.3em] uppercase mb-8 animate-pulse">Syncing</p>
                   <div className="bg-gradient-to-br from-indigo-600 to-rose-600 p-5 rounded-2xl text-white text-sm font-semibold shadow-[0_15px_40px_rgba(99,102,241,0.3)] leading-snug">
                     {text}
                   </div>
                </div>
              </motion.div>
            </div>

            {/* Laptop Side */}
            <div className="flex justify-center" style={{ perspective: "1200px" }}>
              <motion.div 
                style={{ transformStyle: "preserve-3d", rotateY: laptopRotate }}
                className="w-full max-w-xl aspect-[1.6/1] bg-[#0a0a0a] border-[14px] border-[#1a1a1a] rounded-[32px] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-50" />
                <div className="flex gap-2 mb-8 relative z-10">
                  <div className="w-3 h-3 rounded-full bg-indigo-500/20" />
                  <div className="w-3 h-3 rounded-full bg-rose-500/20" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                </div>
                <div className="font-mono text-base space-y-3 relative z-10">
                  <p className="text-white/20">const glide = <span className="text-indigo-400">"awesome"</span>;</p>
                  <p className="text-white/80 leading-relaxed tracking-tight">
                    {text}
                    <span className="inline-block w-[1px] h-5 bg-rose-400 ml-1 animate-pulse" />
                  </p>
                </div>
                
                {/* Connection Visual */}
                <div className="absolute -left-48 top-1/2 -translate-y-1/2 w-48 h-[1px] bg-gradient-to-r from-indigo-500/40 via-rose-500/20 to-transparent hidden xl:block overflow-visible">
                  <motion.div 
                    animate={{ left: ["-10%", "110%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-4 text-3xl filter drop-shadow(0 0 15px #6366f1)"
                  >
                    🛰️
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-indigo-500/5 via-rose-500/5 to-transparent blur-[120px] -z-10" />
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  const features = [
    { title: "Flash Paste", desc: "Immediate high-speed text transfer using clipboard injection with smart fallback.", icon: <Zap size={22} />, color: "border-indigo-500/20 shadow-indigo-500/5" },
    { title: "Realistic Typing", desc: "Human-like keyboard event simulation to bypass restricted environment blocks.", icon: <Keyboard size={22} />, color: "border-rose-500/20 shadow-rose-500/5" },
    { title: "Local-Only", desc: "Zero-cloud persistence. Data exists only in temporary memory during active sessions.", icon: <ShieldCheck size={22} />, color: "border-amber-500/20 shadow-amber-500/5" },
    { title: "Orchestration", desc: "Turn your phone into a remote control layer for macros and terminal commands.", icon: <RefreshCw size={22} />, color: "border-indigo-500/20 shadow-indigo-500/5" }
  ];

  return (
    <section id="features" className="py-40 px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-24">
          <div>
            <h2 className="text-5xl md:text-7xl font-outfit font-black tracking-tighter mb-4">The Input Standard</h2>
            <p className="text-white/40 max-w-md font-medium text-lg leading-relaxed">Engineered to eliminate friction between your ideas and your machine.</p>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent hidden md:block mb-6 ml-12" />
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.8 }}
              className={`p-10 bg-white/[0.01] border ${f.color} rounded-[40px] hover:scale-[1.02] hover:bg-white/[0.03] transition-all duration-700 group shadow-2xl`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-8 text-white group-hover:text-indigo-400 transition-colors duration-500">
                {f.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4 font-outfit tracking-tight">{f.title}</h3>
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
      <div className="mesh-gradient" />
      <BackgroundOrbs />
      <CursorSpotlight />
      <Navbar />
      <Hero />
      <Visualization />
      <Features />
      
      {/* Downloads */}
      <section id="downloads" className="py-40 px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
           {[
             { title: "Chrome Extension", icon: <Globe />, label: "Install", color: "hover:border-indigo-500/30 shadow-indigo-500/10" },
             { title: "macOS Backend", icon: <Monitor />, label: "Download .dmg", color: "hover:border-rose-500/30 shadow-rose-500/10" },
             { title: "Windows Backend", icon: <Monitor />, label: "Download .exe", color: "hover:border-amber-500/30 shadow-amber-500/10" }
           ].map((d, i) => (
             <div key={i} className={`group p-10 bg-white/[0.01] border border-white/[0.05] rounded-[40px] text-center transition-all duration-500 ${d.color} shadow-2xl`}>
               <div className="w-20 h-20 bg-white/[0.03] rounded-[28px] flex items-center justify-center text-white mx-auto mb-8 group-hover:scale-110 group-hover:text-indigo-400 transition-all">
                 {d.icon}
               </div>
               <h3 className="text-xl font-bold mb-8 font-outfit uppercase tracking-[0.2em]">{d.title}</h3>
               <button className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all duration-500">
                 {d.label}
               </button>
             </div>
           ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 border-t border-white/[0.03] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 flex flex-col items-center gap-16 relative z-10">
          <div className="flex items-center gap-3 font-outfit font-black text-2xl tracking-tighter">
            <Zap className="text-indigo-500 fill-indigo-500" size={32} />
            <span className="mt-1">GLIDEPASS</span>
          </div>
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
            <Link href="#" className="hover:text-indigo-400 transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-rose-400 transition-colors">GitHub</Link>
            <Link href="#" className="hover:text-amber-400 transition-colors">Discord</Link>
          </div>
          <p className="text-[10px] text-white/10 font-mono tracking-widest">© 2026 GLIDEPASS. BUILT FOR THE FUTURE.</p>
        </div>
      </footer>
    </main>
  );
}

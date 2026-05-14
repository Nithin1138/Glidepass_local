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
    <nav className="fixed top-0 w-full z-50 border-b border-white/[0.03] bg-black/40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-18 md:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5 font-outfit font-black text-lg md:text-xl tracking-tighter">
          <Zap className="text-indigo-500 fill-indigo-500 animate-pulse" size={22} />
          <span className="mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">GLIDEPASS</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">
          <Link href="#features" className="hover:text-indigo-400 transition-colors duration-300">Features</Link>
          <Link href="#visualization" className="hover:text-rose-400 transition-colors duration-300">Technology</Link>
          <Link href="#downloads" className="hover:text-amber-400 transition-colors duration-300">Downloads</Link>
        </div>
        <Link href="#setup" className="relative group bg-white text-black px-6 md:px-8 py-2 md:py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest overflow-hidden transition-all duration-500">
          <span className="relative z-10 group-hover:text-white transition-colors duration-500">Get Started</span>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-rose-600 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
        </Link>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-48 pb-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto text-center relative z-10">
        
        {/* Social Proof Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-4 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md mb-10"
        >
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-background bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-[8px] font-bold">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Zap key={i} size={10} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span className="text-[11px] font-bold tracking-tight text-white/60">
              Joined by <span className="text-white">15,000+</span> professionals
            </span>
          </div>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl lg:text-[100px] font-outfit font-black tracking-tighter leading-[0.9] mb-8"
        >
          <span className="inline-block py-2 text-white">
            Your Phone as a
          </span>
          <br />
          <div className="relative inline-block py-2">
            {/* The "Downshadow" Stack Layer (No Blur) */}
            <span className="absolute inset-0 translate-y-[3px] md:translate-y-[5px] text-accent/20 select-none">
              Intelligent Layer
            </span>
            {/* The Main Gradient Layer */}
            <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-accent">
              Intelligent Layer
            </span>
          </div>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-base md:text-xl text-white/40 max-w-xl mx-auto mb-12 font-inter leading-relaxed tracking-tight"
        >
          Instant local text transfer, human-like typing simulation, and real-time input orchestration. Built for power users who demand zero-lag productivity.
        </motion.p>
        
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="#setup" className="group relative px-8 py-4 rounded-xl font-bold overflow-hidden shadow-2xl shadow-accent/20">
            <div className="absolute inset-0 bg-accent transition-transform group-hover:scale-110 duration-500" />
            <span className="relative flex items-center gap-2 text-sm text-white">
              Setup Guide
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
          <Link href="#downloads" className="px-8 py-4 rounded-xl font-bold text-sm border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300">
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
    <section id="visualization" ref={sectionRef} className="py-24 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="relative bg-white/[0.01] border border-white/[0.05] rounded-[64px] p-12 md:p-24 overflow-hidden group">
          <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
            
            {/* Phone Side (iPhone 16 Pro Style) */}
            <div className="flex justify-center" style={{ perspective: "1200px" }}>
              <motion.div 
                style={{ transformStyle: "preserve-3d", rotateY: phoneRotate }}
                className="w-[220px] h-[440px] bg-[#050505] border-[10px] border-[#1a1a1a] rounded-[48px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9),0_0_20px_rgba(163,106,82,0.1)] relative"
              >
                {/* Dynamic Island */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#000] rounded-full flex items-center justify-center border border-white/5">
                  <div className="w-1 h-1 rounded-full bg-indigo-500/40 ml-auto mr-4" />
                </div>

                {/* Status Bar */}
                <div className="absolute top-12 left-8 right-8 flex justify-between items-center text-[10px] font-bold text-white/40">
                  <span>9:41</span>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-1.5 rounded-sm border border-white/20 relative">
                       <div className="absolute left-0 top-0 h-full w-[80%] bg-white/40" />
                    </div>
                  </div>
                </div>

                {/* Screen UI */}
                <div className="mt-28 px-6 text-center">
                   <div className="mb-10">
                      <p className="text-[10px] text-indigo-400 font-black tracking-[0.2em] uppercase mb-1">GlidePass</p>
                      <p className="text-[8px] text-white/20 font-medium">Secure Tunnel Active</p>
                   </div>
                   
                   <div className="relative group/input">
                     <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-rose-500/20 rounded-2xl blur opacity-40" />
                     <div className="relative bg-[#111] border border-white/10 p-5 rounded-2xl text-white text-sm font-semibold shadow-inner leading-snug">
                       {text}
                     </div>
                   </div>

                   <div className="mt-12 flex justify-center gap-4">
                      {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/5" />)}
                   </div>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/10 rounded-full" />
              </motion.div>
            </div>

            {/* Laptop Side (MacBook Style) */}
            <div className="flex justify-center" style={{ perspective: "1200px" }}>
              <motion.div 
                style={{ transformStyle: "preserve-3d", rotateY: laptopRotate }}
                className="w-full max-w-lg aspect-[1.6/1] bg-[#050505] border-[12px] border-[#1a1a1a] rounded-[24px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] relative overflow-hidden"
              >
                {/* Aluminum Screen Reflection */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                
                {/* macOS Header */}
                <div className="h-10 bg-white/[0.03] border-b border-white/[0.05] flex items-center px-5 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] shadow-lg" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e] shadow-lg" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#28c840] shadow-lg" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-[9px] font-mono text-white/20 tracking-widest uppercase">glidepass — local_node</span>
                  </div>
                </div>

                {/* Editor UI */}
                <div className="p-8 font-mono text-sm leading-relaxed relative">
                  <div className="flex gap-6">
                    <div className="text-white/10 text-right space-y-1 hidden sm:block">
                      {Array.from({length: 6}).map((_, i) => <div key={i}>{i + 1}</div>)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-white/20">const tunnel = <span className="text-indigo-400">new</span> Glide(<span className="text-rose-400">"secure"</span>);</p>
                      <p className="text-white/80 tracking-tight">
                        {text}
                        <span className="inline-block w-[1px] h-4 bg-indigo-500 ml-1 animate-pulse" />
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Connection Visual (Satellite) */}
                <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-40 h-[1px] bg-gradient-to-r from-indigo-500/40 via-rose-500/20 to-transparent hidden xl:block overflow-visible">
                  <motion.div 
                    animate={{ left: ["-10%", "110%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-3.5 text-2xl filter drop-shadow(0 0 10px #6366f1)"
                  >
                    🛰️
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-indigo-500/10 via-rose-500/5 to-transparent blur-[120px] -z-10" />
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
      icon: <Zap size={22} />, 
      span: "md:col-span-2",
      visual: (
        <div className="absolute right-[-20px] bottom-[-20px] w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full group-hover:bg-indigo-500/20 transition-colors" />
      )
    },
    { 
      title: "Realistic Typing", 
      desc: "Human-like keyboard event simulation.", 
      icon: <Keyboard size={22} />, 
      span: "md:col-span-1" 
    },
    { 
      title: "Local-Only", 
      desc: "Zero-cloud persistence. Data stays in RAM.", 
      icon: <ShieldCheck size={22} />, 
      span: "md:col-span-1" 
    },
    { 
      title: "Orchestration", 
      desc: "Turn your phone into a remote control layer for complex macros and terminal commands.", 
      icon: <RefreshCw size={22} />, 
      span: "md:col-span-2",
      visual: (
        <div className="mt-4 p-3 bg-black/40 border border-white/5 rounded-xl font-mono text-[9px] text-indigo-400/60 overflow-hidden">
          <div className="flex gap-1 mb-1.5">
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="w-1 h-1 rounded-full bg-white/10" />
          </div>
          <p className="">$ glide --tunnel --secure</p>
          <p className="text-white/20">&gt; establishing handshake...</p>
        </div>
      )
    }
  ];

  return (
    <section id="features" className="py-16 px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-10">
          <div>
            <h2 className="text-4xl md:text-5xl font-outfit font-black tracking-tighter mb-2">The Input Standard</h2>
            <p className="text-white/30 max-w-sm font-medium text-sm leading-relaxed font-inter">Engineered to eliminate friction between your ideas and your machine.</p>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-indigo-500/10 to-transparent hidden md:block mb-4 ml-12" />
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.8 }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
                e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
              }}
              className={`relative group p-6 md:p-8 bg-white/[0.01] border border-white/[0.05] rounded-[32px] overflow-hidden transition-all duration-700 ${f.span}`}
            >
              {/* Cursor Follow Glow (Inherits vars from parent) */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),_rgba(99,102,241,0.06)_0%,_transparent_50%)]" />
              
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-5 text-white group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-500">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 font-outfit tracking-tight">{f.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed font-inter max-w-[280px]">
                  {f.desc}
                </p>
                {f.visual}
              </div>

              {/* Decorative Border Glow */}
              <div className="absolute inset-0 border border-white/0 group-hover:border-indigo-500/20 rounded-[32px] transition-colors duration-700" />
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

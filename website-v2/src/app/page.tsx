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
          ([x, y]) => `radial-gradient(800px at ${x}px ${y}px, rgba(163, 106, 82, 0.08), transparent 80%)`
        ),
      }}
    />
  );
};

const BorderBeam = () => (
  <div className="absolute inset-0 rounded-[inherit] [mask-image:linear-gradient(white,transparent)] pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/50 to-accent/0 h-[1px] top-0 animate-[shimmer_3s_infinite]" />
  </div>
);

// --- COMPONENTS ---

const Navbar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/[0.05] bg-black/20 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
        <div className="flex items-center gap-3 font-outfit font-black text-xl tracking-tighter group cursor-pointer">
          <Zap className="text-accent fill-accent group-hover:scale-110 transition-transform" size={26} />
          <span className="mt-1 group-hover:text-accent transition-colors">GLIDEPASS</span>
        </div>
        <div className="hidden md:flex items-center gap-12 text-[11px] font-bold tracking-[0.2em] uppercase text-white/40">
          <Link href="#features" className="hover:text-white transition-colors duration-300">Features</Link>
          <Link href="#visualization" className="hover:text-white transition-colors duration-300">Technology</Link>
          <Link href="#downloads" className="hover:text-white transition-colors duration-300">Downloads</Link>
        </div>
        <Link href="#setup" className="relative px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest overflow-hidden group">
          <span className="relative z-10 text-white group-hover:text-black transition-colors duration-500">Get Started</span>
          <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
          <div className="absolute inset-0 border border-white/20" />
        </Link>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-64 pb-32 px-6 overflow-hidden">
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1400px] h-[1000px] bg-accent/5 blur-[180px] rounded-full -z-10 animate-pulse" />
      
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <motion.h1 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-7xl md:text-9xl lg:text-[160px] font-outfit font-black tracking-tighter leading-[0.8] mb-16"
        >
          The Input <br />
          <span className="inline-block py-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/10">
            Evolution
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1 }}
          className="text-lg md:text-2xl text-white/30 max-w-2xl mx-auto mb-20 font-inter leading-relaxed tracking-tight"
        >
          Instant local text transfer, human-like typing simulation, and real-time input orchestration. Reimagined for the modern desktop.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-8"
        >
          <Link href="#setup" className="group relative bg-accent text-white px-12 py-6 rounded-2xl font-bold overflow-hidden shadow-2xl shadow-accent/20 transition-transform hover:scale-[1.02]">
            <div className="relative z-10 flex items-center gap-3">
               Setup Guide
               <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="absolute inset-0 bg-accent-light opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Link>
          <Link href="#downloads" className="px-12 py-6 rounded-2xl font-bold border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition-all duration-300 backdrop-blur-sm">
            Downloads
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
    <section id="visualization" ref={sectionRef} className="py-52 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative bg-white/[0.01] border border-white/[0.04] rounded-[80px] p-20 md:p-40 overflow-hidden shadow-[inset_0_0_80px_rgba(255,255,255,0.01)]">
          <div className="grid lg:grid-cols-2 gap-32 items-center relative z-10">
            
            {/* Phone Side */}
            <div className="flex justify-center" style={{ perspective: "1500px" }}>
              <motion.div 
                style={{ transformStyle: "preserve-3d", rotateY: phoneRotate }}
                className="w-[220px] h-[460px] bg-[#080808] border-[12px] border-[#151515] rounded-[50px] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.9)] relative"
              >
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#151515] rounded-full shadow-inner" />
                <div className="mt-28 text-center">
                   <p className="text-[11px] text-white/20 font-black tracking-[0.4em] uppercase mb-10">Sync</p>
                   <div className="bg-[#a36a52] p-6 rounded-2xl text-white text-sm font-bold shadow-[0_20px_50px_rgba(163,106,82,0.4)] leading-relaxed">
                     {text}
                   </div>
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-28 h-1.5 bg-white/[0.05] rounded-full" />
              </motion.div>
            </div>

            {/* Laptop Side */}
            <div className="flex justify-center" style={{ perspective: "1500px" }}>
              <motion.div 
                style={{ transformStyle: "preserve-3d", rotateY: laptopRotate }}
                className="w-full max-w-2xl aspect-[1.7/1] bg-[#080808] border-[16px] border-[#151515] rounded-[40px] p-12 shadow-[0_40px_120px_rgba(0,0,0,0.9)] relative"
              >
                <div className="flex gap-2.5 mb-10">
                  <div className="w-3.5 h-3.5 rounded-full bg-white/[0.06]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-white/[0.06]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-white/[0.06]" />
                </div>
                <div className="font-mono text-lg space-y-4">
                  <p className="text-white/20">const glide = <span className="text-accent">"awesome"</span>;</p>
                  <p className="text-white/80 leading-relaxed tracking-tight">
                    {text}
                    <span className="inline-block w-[1.5px] h-6 bg-accent ml-2 animate-pulse" />
                  </p>
                </div>
                
                {/* Connection Visual */}
                <div className="absolute -left-60 top-1/2 -translate-y-1/2 w-60 h-[2px] bg-gradient-to-r from-accent/50 to-transparent hidden xl:block overflow-visible">
                  <motion.div 
                    animate={{ left: ["-10%", "110%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-4 text-4xl filter drop-shadow(0 0 15px #a36a52)"
                  >
                    🛰️
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent/[0.03] blur-[150px] -z-10" />
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
    <section id="features" className="py-52 px-8 relative overflow-hidden">
      <div className="absolute top-1/2 right-[-10%] w-[800px] h-[800px] bg-accent/[0.04] blur-[140px] rounded-full -z-10" />
      
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-32">
          <div className="max-w-xl">
            <h2 className="text-5xl md:text-8xl font-outfit font-black tracking-tighter mb-8 leading-[0.9]">The Standard.</h2>
            <p className="text-white/40 font-medium text-xl leading-relaxed">Engineered to eliminate friction between your ideas and your machine.</p>
          </div>
          <div className="h-[1px] flex-1 bg-white/[0.08] hidden md:block mb-8 ml-16" />
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 1 }}
              className="group p-12 bg-white/[0.02] border border-white/[0.04] rounded-[48px] hover:border-accent/40 hover:bg-white/[0.04] transition-all duration-700 relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-10 text-accent group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all duration-500 shadow-xl">
                {f.icon}
              </div>
              <h3 className="text-2xl font-bold mb-5 font-outfit">{f.title}</h3>
              <p className="text-[16px] text-white/40 leading-relaxed font-inter">
                {f.desc}
              </p>
              <BorderBeam />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function Home() {
  return (
    <main className="relative min-h-screen selection:bg-accent/30 selection:text-white">
      <CursorSpotlight />
      <Navbar />
      <Hero />
      <Visualization />
      <Features />
      
      {/* Downloads */}
      <section id="downloads" className="py-52 px-8 bg-black/40 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10">
           {[
             { title: "Chrome Extension", icon: <Globe />, label: "Install" },
             { title: "macOS Backend", icon: <Monitor />, label: "Download .dmg" },
             { title: "Windows Backend", icon: <Monitor />, label: "Download .exe" }
           ].map((d, i) => (
             <div key={i} className="group p-14 bg-white/[0.01] border border-white/[0.04] rounded-[56px] text-center hover:bg-white/[0.03] transition-all duration-700 relative overflow-hidden">
               <div className="w-24 h-24 bg-accent/5 rounded-[36px] flex items-center justify-center text-accent mx-auto mb-10 group-hover:scale-110 group-hover:bg-accent/10 transition-all duration-500 shadow-2xl">
                 {d.icon}
               </div>
               <h3 className="text-2xl font-bold mb-12 font-outfit uppercase tracking-widest leading-none">{d.title}</h3>
               <button className="relative w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] overflow-hidden group/btn">
                  <span className="relative z-10 text-white group-hover/btn:text-black transition-colors duration-500">{d.label}</span>
                  <div className="absolute inset-0 bg-white translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-out" />
                  <div className="absolute inset-0 border border-white/10" />
               </button>
             </div>
           ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-40 border-t border-white/[0.04] bg-[#020202]">
        <div className="max-w-7xl mx-auto px-8 flex flex-col items-center gap-20">
          <div className="flex items-center gap-4 font-outfit font-black text-3xl tracking-tighter">
            <Zap className="text-accent fill-accent" size={36} />
            <span className="mt-1">GLIDEPASS</span>
          </div>
          <div className="flex gap-16 text-[11px] font-black uppercase tracking-[0.4em] text-white/10 hover:text-white/40 transition-colors">
            <Link href="#" className="hover:text-accent">Twitter</Link>
            <Link href="#" className="hover:text-accent">GitHub</Link>
            <Link href="#" className="hover:text-accent">Discord</Link>
          </div>
          <p className="text-[11px] text-white/[0.05] font-mono tracking-widest">© 2026 GLIDEPASS. DESIGNED FOR THE ELITE.</p>
        </div>
      </footer>
    </main>
  );
}

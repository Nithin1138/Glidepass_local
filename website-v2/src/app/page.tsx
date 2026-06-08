"use client";

import { motion, useScroll, useTransform, useSpring, useMotionValue, animate, AnimatePresence } from "framer-motion";
import { Zap, ShieldCheck, Keyboard, RefreshCw, ChevronRight, Monitor, Smartphone, Globe, ArrowRight, Download, BookOpen, Lock, Star, X } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";

// --- UI UTILITIES ---

const CountUp = ({ to }: { to: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    const controls = animate(count, to, { duration: 2, ease: "easeOut" });
    return controls.stop;
  }, [count, to]);

  return <motion.span>{rounded}</motion.span>;
};

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
      <div className="w-full px-6 md:px-12 h-14 md:h-16 flex items-center justify-between relative">
        {/* Left: App Icon Logo */}
        <div className="flex items-center gap-3.5 font-outfit font-black text-lg md:text-xl tracking-tighter shrink-0 relative z-10">
          <div className="w-9 h-9 md:w-10 md:h-10 bg-black rounded-[10px] border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group/logo transition-transform duration-500 hover:scale-110">
            <img
              src="/logo.png"
              alt="GlidePass Icon"
              className="w-[120%] h-[120%] object-contain scale-125 transition-all duration-500 invert hue-rotate-180 brightness-110 contrast-125"
            />
          </div>
          <span className="mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">GLIDEPASS</span>
        </div>

        {/* Center: Navigation Links */}
        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">
          <Link href="#visualization" className="hover:text-rose-400 transition-colors duration-300">Technology</Link>
          <Link href="#features" className="hover:text-indigo-400 transition-colors duration-300">Features</Link>
          <Link href="#downloads" className="hover:text-amber-400 transition-colors duration-300">Downloads</Link>
          <Link href="#setup" className="hover:text-orange-500 transition-colors duration-300">How to Use</Link>
        </div>

        {/* Right: CTA */}
        <div className="shrink-0 relative z-10">
          <Link href="#setup" className="relative group bg-white text-black px-6 md:px-8 py-2 md:py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest overflow-hidden transition-all duration-500 block">
            <span className="relative z-10 group-hover:text-white transition-colors duration-500">How to Use</span>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-500 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
          </Link>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-52 pb-32 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto text-center relative z-10">

        {/* Social Proof Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-4 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md mb-6"
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
              Joined by <span className="text-white"><CountUp to={2481} />+</span> professionals
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
            <span className="absolute inset-0 translate-y-[3px] md:translate-y-[5px] text-amber-500/20 select-none">
              {"Intelligent Layer".split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + i * 0.1, duration: 0.05 }}
                >
                  {char}
                </motion.span>
              ))}
            </span>
            {/* The Main Gradient Layer */}
            <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-amber-500">
              {"Intelligent Layer".split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + i * 0.05, duration: 0.1 }}
                >
                  {char}
                </motion.span>
              ))}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 2 }}
                className="inline-block w-[3px] h-[0.8em] bg-amber-500 ml-1 translate-y-[10%]"
              />
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
        <div className="relative bg-white/[0.01] border border-white/[0.05] rounded-[64px] pt-20 pb-12 md:pt-40 md:pb-24 px-12 md:px-24 overflow-hidden group">
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
                    {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/5" />)}
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
                      {Array.from({ length: 6 }).map((_, i) => <div key={i}>{i + 1}</div>)}
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

                {/* Data Stream Animation (Visible on LG and above) */}
                <div className="absolute -left-[200px] top-1/2 -translate-y-1/2 w-[200px] h-[2px] bg-gradient-to-r from-indigo-500/60 via-rose-500/40 to-transparent hidden lg:block overflow-visible">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ left: "-10%", opacity: 0 }}
                      animate={{
                        left: ["-10%", "110%"],
                        opacity: [0, 1, 1, 0],
                        scale: [1, 1.5, 1]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        delay: i * 0.8,
                        ease: "linear"
                      }}
                      className="absolute -top-2 w-6 h-4 bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full blur-[1px] shadow-[0_0_25px_rgba(244,63,94,0.8)] flex items-center justify-center"
                    >
                      <div className="w-full h-[1px] bg-white/60" />
                    </motion.div>
                  ))}

                  {/* Glowing Path Pulse */}
                  <motion.div
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute inset-0 bg-indigo-500/30 blur-md"
                  />
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
      title: "Live Sync",
      desc: "Two-way clipboard sync. Copy on your phone, paste on your laptop instantly.",
      icon: <RefreshCw size={22} />,
      span: "md:col-span-2",
      visual: (
        <div className="absolute right-10 bottom-6 flex items-center gap-6">
          <div className="hidden lg:flex flex-col items-end gap-1.5 mr-2">
            <div className="text-[7px] font-mono text-rose-500/60 tracking-[0.2em] uppercase">link_status</div>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-rose-500/40" />)}
              <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
            </div>
          </div>
          <div className="relative w-32 h-10 flex items-center">
            <svg className="absolute inset-0 w-full h-full text-rose-500/20" viewBox="0 0 100 20">
              <motion.path
                d="M 0 10 Q 25 20 50 10 T 100 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                animate={{ d: ["M 0 10 Q 25 0 50 10 T 100 10", "M 0 10 Q 25 20 50 10 T 100 10", "M 0 10 Q 25 0 50 10 T 100 10"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent relative z-10">
              <motion.div
                animate={{ left: ["0%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1 w-2 h-2 bg-rose-500 rounded-full blur-[2px]"
              />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[6px] font-mono text-white/10 uppercase tracking-tighter whitespace-nowrap">id: 0x4f2a_tunnel</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10 flex items-center gap-2">
            <Lock size={10} className="text-rose-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-rose-500/80">Secure</span>
          </div>
        </div>
      )
    },
    {
      title: "Realistic Typing",
      desc: "Human-like keyboard event simulation.",
      icon: <Keyboard size={22} />,
      span: "md:col-span-1",
      visual: (
        <div className="mt-auto pt-6 flex flex-wrap gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
          {["SHIFT", "CMD", "V", "↵"].map(key => (
            <div key={key} className="px-1.5 py-1 rounded-sm border border-white/20 text-[6px] font-mono">{key}</div>
          ))}
        </div>
      )
    },
    {
      title: "Local-Only",
      desc: "Zero-cloud persistence. Data stays in RAM.",
      icon: <ShieldCheck size={22} />,
      span: "md:col-span-1",
      visual: (
        <div className="mt-auto pt-6">
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: ["0%", "15%", "12%"] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-full bg-indigo-500/40"
            />
          </div>
          <div className="mt-1 text-[6px] font-mono text-white/20 uppercase">Ram Usage: 0.1%</div>
        </div>
      )
    },
    {
      title: "Remote Control",
      desc: "Control your laptop from your phone browser. No mobile app install needed.",
      icon: <Smartphone size={22} />,
      span: "md:col-span-2",
      visual: (
        <div className="mt-4 flex items-end gap-6">
          <div className="flex-1 p-3 bg-black/40 border border-white/5 rounded-xl font-mono text-[9px] text-indigo-400/60 overflow-hidden relative">
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <p className="text-white/20 mb-1 tracking-tighter">NODE_ESTABLISHED // PORT: 8080</p>
            <p className="">$ glide --tunnel --open</p>
          </div>
          <div className="flex gap-2 mb-1">
            {["Sync", "Macro", "CMD"].map(tag => (
              <div key={tag} className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[7px] font-black uppercase tracking-widest text-white/20 hover:text-white hover:border-indigo-500/30 transition-all flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-white/10" />
                {tag}
              </div>
            ))}
          </div>
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

const SetupGuide = () => {
  const [method, setMethod] = useState<"device" | "extension">("device");

  const deviceSteps = [
    {
      step: "01",
      title: "Open & Start",
      desc: "Open the app and start the backend. A QR code or session link will display for your mobile.",
      icon: <Monitor size={20} />
    },
    {
      step: "02",
      title: "Scan to Connect",
      desc: "Scan the QR code or open the link on your mobile to connect your devices directly.",
      icon: <Smartphone size={20} />
    },
    {
      step: "03",
      title: "Ready to Use",
      desc: "That's it! Use all features as needed and experience the intelligent layer.",
      icon: <Zap size={20} />
    }
  ];

  const extensionSteps = [
    {
      step: "01",
      title: "Run Backend",
      desc: "Keep the backend app running on your laptop for the secure tunnel.",
      icon: <Monitor size={20} />
    },
    {
      step: "02",
      title: "Pin Extension",
      desc: "Open Chrome, click the GlidePass icon, and grab your session link.",
      icon: <Globe size={20} />
    },
    {
      step: "03",
      title: "Start Syncing",
      desc: "Open the link on your phone browser and start moving text instantly.",
      icon: <Zap size={20} />
    }
  ];

  const activeSteps = method === "device" ? deviceSteps : extensionSteps;

  return (
    <div className="max-w-7xl mx-auto px-8">
      <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-20">
        <div>
          <h3 className="text-4xl font-black font-outfit tracking-tighter uppercase mb-2">Setup Guide</h3>
          <p className="text-white/30 text-sm font-medium font-inter">Follow the steps below to initialize your link.</p>
        </div>

        {/* Enhanced Tab Switcher */}
        <div className="flex p-1 bg-white/[0.02] border border-white/[0.08] rounded-2xl relative backdrop-blur-md shadow-2xl">
          <motion.div
            layoutId="activeTab"
            animate={{ x: method === "device" ? 0 : "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-1 left-1 w-[calc(50%-4px)] h-[calc(100%-8px)] bg-white rounded-[14px] shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          />
          <button
            onClick={() => setMethod("device")}
            className={`relative z-10 px-8 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${method === "device" ? "text-black" : "text-white/30 hover:text-white/60"}`}
          >
            In-Device
          </button>
          <button
            onClick={() => setMethod("extension")}
            className={`relative z-10 px-8 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${method === "extension" ? "text-black" : "text-white/30 hover:text-white/60"}`}
          >
            With Extension
          </button>
        </div>
      </div>

      <div className="relative min-h-[280px]">
        {method === "device" && (
          <div className="absolute top-12 left-0 w-full h-[1px] bg-gradient-to-r from-indigo-500/20 via-rose-500/20 to-transparent hidden md:block" />
        )}

        <AnimatePresence mode="wait">
          {method === "device" ? (
            <motion.div
              key="device"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid md:grid-cols-3 gap-16"
            >
              {deviceSteps.map((s, i) => (
                <div key={i} className="relative">
                  <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-black text-xs mb-8 relative z-10 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                    {s.step}
                  </div>
                  <h4 className="text-xl font-bold mb-4 font-outfit tracking-tight flex items-center gap-3">
                    {s.title}
                  </h4>
                  <p className="text-sm text-white/40 leading-relaxed font-inter">
                    {s.desc}
                  </p>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="extension"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center pt-8 pb-20 text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-8 animate-pulse">
                <Globe size={40} />
              </div>
              <h4 className="text-2xl font-black font-outfit uppercase tracking-tighter mb-4 text-white">Thank you for your interest!</h4>
              <p className="text-white/40 max-w-sm font-medium font-inter">The Chrome extension is currently under development and is **coming soon.** Stay tuned for the release!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function Home() {
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <main className="relative min-h-screen">
      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative max-w-sm w-full bg-[#080808] border border-white/10 p-8 rounded-[32px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] text-center overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-[60px] pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-[20px] flex items-center justify-center text-amber-500 mx-auto mb-6 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
                  <Globe size={32} className="animate-pulse" />
                </div>
                
                <h4 className="text-2xl font-black font-outfit uppercase tracking-tighter mb-4 text-white">Thank You!</h4>
                <p className="text-white/40 font-medium font-inter leading-relaxed mb-10">
                  The Chrome extension is currently under development and is <span className="text-amber-500 font-bold">Coming Soon</span>. 
                  <br /><br />
                  For now, please use the <span className="text-white">Windows</span> or <span className="text-white">macOS</span> backend to bridge your devices.
                </p>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setShowComingSoon(false)}
                    className="w-full py-4 rounded-full bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] hover:bg-amber-500 hover:text-white transition-all duration-500"
                  >
                    Got It
                  </button>
                  <Link 
                    href="#downloads" 
                    onClick={() => setShowComingSoon(false)}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-colors py-2"
                  >
                    View Backends
                  </Link>
                </div>
              </div>

              <button 
                onClick={() => setShowComingSoon(false)}
                className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mesh-gradient" />
      <BackgroundOrbs />
      <CursorSpotlight />
      <Navbar />
      <Hero />
      <Visualization />
      <Features />

      {/* Downloads */}
      <section id="downloads" className="py-40 px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-outfit font-black tracking-tighter mb-4 text-white">Ready to Sync?</h2>
            <p className="text-white/30 max-w-lg mx-auto font-medium text-base font-inter">Download the backend for your OS and install the extension to start your local sync tunnel.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Chrome Extension",
                icon: <Globe size={28} />,
                label: "Add to Chrome",
                version: "v1.4.2",
                size: "2.1 MB",
                theme: "amber",
                gradient: "from-amber-500/30 to-transparent",
                btnGradient: "hover:bg-gradient-to-r hover:from-amber-600 hover:to-amber-400",
                borderHover: "group-hover/card:border-amber-500/40",
                iconGlow: "group-hover/card:text-amber-400 group-hover/card:border-amber-500/30 group-hover/card:bg-amber-500/10",
                installCommand: undefined,
                href: undefined
              },
              {
                title: "macOS Backend",
                icon: <Monitor size={28} />,
                label: "Copy Install Cmd",
                installCommand: "curl -sSL https://glidepass.vercel.app/install-mac.sh | bash",
                version: "v1.4.1",
                size: "42.5 MB",
                theme: "rose",
                gradient: "from-rose-500/30 to-transparent",
                btnGradient: "hover:bg-gradient-to-r hover:from-rose-600 hover:to-rose-400",
                borderHover: "group-hover/card:border-rose-500/40",
                iconGlow: "group-hover/card:text-rose-400 group-hover/card:border-rose-500/30 group-hover/card:bg-rose-500/10",
                href: undefined
              },
              {
                title: "Windows Backend",
                icon: <Monitor size={28} />,
                label: "Download .exe",
                version: "v1.4.1",
                size: "38.2 MB",
                theme: "indigo",
                gradient: "from-indigo-500/30 to-transparent",
                btnGradient: "hover:bg-gradient-to-r hover:from-indigo-600 hover:to-indigo-400",
                borderHover: "group-hover/card:border-indigo-500/40",
                iconGlow: "group-hover/card:text-indigo-400 group-hover/card:border-indigo-500/30 group-hover/card:bg-indigo-500/10",
                installCommand: undefined,
                href: undefined
              }
            ].map((d, i) => (
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
                className="group/card relative p-8 bg-[#050505] border border-white/[0.04] rounded-[32px] overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]"
              >
                {/* Cursor Spotlight Glow */}
                <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_var(--x,_50%)_var(--y,_50%),_rgba(255,255,255,0.03)_0%,_transparent_60%)]" />

                {/* Corner Gradient Blob */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${d.gradient} rounded-full blur-[40px] opacity-30 group-hover/card:opacity-80 transition-opacity duration-700 pointer-events-none`} />

                <div className="relative z-10 flex flex-col h-full">
                  {/* Header / Meta */}
                  <div className="flex justify-between items-start mb-16">
                    <div className={`w-14 h-14 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-center justify-center text-white/30 transition-all duration-500 group-hover/card:scale-110 ${d.iconGlow}`}>
                      {d.icon}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">{d.version}</div>
                      <div className="text-[9px] font-mono uppercase tracking-widest text-white/20">{d.size}</div>
                    </div>
                  </div>

                  {/* Title & Action */}
                  <div className="mt-auto">
                    <h3 className="text-2xl font-black font-outfit tracking-tighter text-white/70 group-hover/card:text-white transition-colors duration-500 mb-6">{d.title}</h3>

                    <button 
                      onClick={() => {
                        if (d.title === "Chrome Extension") {
                          setShowComingSoon(true);
                        } else if (d.installCommand) {
                          navigator.clipboard.writeText(d.installCommand);
                          alert("Install command copied to clipboard! Paste it in your Terminal.");
                        } else if (d.href) {
                          window.location.href = d.href;
                        }
                      }}
                      className={`group/btn relative w-full overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.02] p-4 flex items-center justify-between transition-all duration-500 hover:border-white/40 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] ${d.btnGradient}`}
                    >
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />

                      <div className="flex items-center gap-3 ml-2 z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white group-hover/btn:scale-105 transition-all duration-500">
                          {d.label}
                        </span>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center group-hover/btn:bg-white group-hover/btn:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all duration-500 z-10">
                        <ArrowRight size={14} className="text-white group-hover/btn:text-black group-hover/btn:-rotate-45 transition-all duration-500" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Outer Active Border */}
                <div className={`absolute inset-0 border border-transparent rounded-[32px] pointer-events-none transition-colors duration-700 ${d.borderHover}`} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Setup Guide */}
        <div id="setup" className="mt-20 pt-20 border-t border-white/[0.03]">
          <SetupGuide />
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-32 pb-16 border-t border-white/[0.03] bg-white/[0.01] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-24">

            {/* Brand Column */}
            <div className="col-span-2">
              <div className="flex items-center gap-4 font-outfit font-black text-xl md:text-2xl tracking-tighter mb-8">
                <div className="w-12 h-12 bg-black rounded-[12px] border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                  <img
                    src="/logo.png"
                    alt="GlidePass Icon"
                    className="w-[120%] h-[120%] object-contain scale-125 invert hue-rotate-180 brightness-110 contrast-125"
                  />
                </div>
                <span className="mt-1">GLIDEPASS</span>
              </div>
              <p className="text-sm text-white/30 font-medium font-inter max-w-xs leading-relaxed mb-8">
                Building the intelligent layer between your phone and your machine. Zero-lag, local-first synchronization for power users.
              </p>
              <div className="flex gap-5">
                {[
                  { icon: <Globe size={18} />, label: "Web" },
                  { icon: <Star size={18} />, label: "GitHub" },
                  { icon: <ShieldCheck size={18} />, label: "Discord" }
                ].map((s, i) => (
                  <button key={i} className="group/social relative w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/20 transition-all duration-500 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/10">
                    {/* Outer Pulse Ring */}
                    <div className="absolute inset-0 rounded-full border border-indigo-500/0 group-hover/social:border-indigo-500/40 group-hover/social:scale-125 transition-all duration-700 pointer-events-none" />

                    <div className="relative z-10 group-hover/social:scale-110 transition-transform duration-500">
                      {s.icon}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-8">Product</h4>
              <ul className="space-y-4 text-sm font-medium text-white/40 font-inter">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#visualization" className="hover:text-white transition-colors">Technology</Link></li>
                <li><Link href="#downloads" className="hover:text-white transition-colors">Download</Link></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-8">Resources</h4>
              <ul className="space-y-4 text-sm font-medium text-white/40 font-inter">
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Setup Guide</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API Status</Link></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-8">Legal</h4>
              <ul className="space-y-4 text-sm font-medium text-white/40 font-inter">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-12 border-t border-white/[0.03] flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">All Systems Operational</span>
              </div>
              <span className="text-[10px] font-mono text-white/10 uppercase tracking-widest">v1.4.2-stable</span>
            </div>
            <p className="text-[10px] text-white/10 font-mono tracking-widest">© 2026 GLIDEPASS. ALL RIGHTS RESERVED.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

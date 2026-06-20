"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Smartphone, Keyboard, ShieldAlert, Cpu, Check, ArrowRight,
  Terminal as TerminalIcon, Sparkles, BookOpen, Download, HelpCircle,
  Code2, Play, Trash2, ArrowUpRight, CheckCircle2, ShieldCheck, Zap
} from "lucide-react";
import Link from "next/link";

// ─── TYPES & INTERFACES ───
type VariantType = "developer" | "creative" | "secure";

interface Preset {
  label: string;
  type: string;
  payload: string;
}

export default function Landing2() {
  const [activeVariant, setActiveVariant] = useState<VariantType>("developer");
  const [phoneText, setPhoneText] = useState("");
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  // Set default terminal logs when variant changes
  useEffect(() => {
    resetTerminal();
  }, [activeVariant]);

  const resetTerminal = () => {
    if (typingTimer.current) clearInterval(typingTimer.current);
    setIsTyping(false);
    setPhoneText("");
    
    if (activeVariant === "developer") {
      setTerminalLines([
        "~/projects/lanpad-dev  ● LAN LINKED",
        "$ npm run dev",
        "[LANpad] Listening on port 8008",
        "[P2P] Verified peer key: SHA256:4a88f..."
      ]);
    } else if (activeVariant === "creative") {
      setTerminalLines([
        "figma // LANpad action-listener",
        "[Figma] Connected to Local Workspace",
        "[Macro] Loaded 12 active canvas rules",
        "[Status] Ready for hotkey triggers..."
      ]);
    } else {
      setTerminalLines([
        "enterprise // air-gapped node",
        "[Secure] Enforcing local-only memory residency",
        "[Bypass] Keystroke injection engine loaded",
        "[Status] Safe tunnel active. Listening..."
      ]);
    }
  };

  // Automated Typing Engine for presets
  const runPresetAnimation = (text: string) => {
    if (isTyping) return;
    setIsTyping(true);
    setPhoneText("");
    
    // Add prompt line to terminal
    setTerminalLines(prev => [...prev, `$ ${activeVariant === "developer" ? "" : "trigger: "}`]);
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        const char = text[index];
        setPhoneText(prev => prev + char);
        
        // Append character to the last line of the terminal
        setTerminalLines(prev => {
          const updated = [...prev];
          updated[updated.length - 1] += char;
          return updated;
        });
        
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        // Append execution outcome
        setTimeout(() => {
          setTerminalLines(prev => [
            ...prev,
            activeVariant === "developer" 
              ? `[LANpad] Injected ${text.length} characters in 1.2ms` 
              : activeVariant === "creative"
              ? `[Trigger] Action executed: ${text.toUpperCase()}`
              : `[Secure] Key sequence transmitted securely (RAM cleared)`
          ]);
        }, 300);
      }
    }, 60);
    
    typingTimer.current = interval;
  };

  // User input handling (typing in phone simulator input field)
  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isTyping) return;
    const val = e.target.value;
    setPhoneText(val);

    // Update terminal in real-time
    setTerminalLines(prev => {
      const updated = [...prev];
      // Keep only initial logs + the current custom prompt line
      const baseCount = activeVariant === "developer" ? 4 : 4;
      const baseLines = prev.slice(0, baseCount);
      return [...baseLines, `$ ${val}`];
    });
  };

  const getPresets = (): Preset[] => {
    if (activeVariant === "developer") {
      return [
        { label: "Code", type: "snippet", payload: "const api = new LANpad();" },
        { label: "Git", type: "cmd", payload: "git commit -m 'feat: local sync'" },
        { label: "Sys", type: "cmd", payload: "systemctl restart lanpad" }
      ];
    } else if (activeVariant === "creative") {
      return [
        { label: "Figma", type: "macro", payload: "Group & Frame Selection" },
        { label: "Macro", type: "macro", payload: "Export all assets to PNG" },
        { label: "Undo", type: "hotkey", payload: "Cmd + Option + Z" }
      ];
    } else {
      return [
        { label: "Key", type: "credential", payload: "ssh-rsa AAAAB3NzaC1yc2E..." },
        { label: "Secure", type: "token", payload: "gpg --decrypt secret.asc" }
      ];
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans relative overflow-x-hidden">
      
      {/* Light Blueprint Grid Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0 opacity-60" />

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[10%] right-[-10%] w-[45%] h-[45%] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* ─── NAVBAR ─── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-black text-lg">L</span>
          </div>
          <div>
            <h1 className="font-outfit font-black text-lg leading-none tracking-tight text-blue-900">LANpad</h1>
            <span className="text-[9px] font-mono tracking-widest text-blue-600 uppercase font-black">Local-First</span>
          </div>
        </div>

        {/* Variant Selector Tabs */}
        <div className="hidden md:flex bg-slate-100 p-1.5 rounded-full border border-slate-200/40">
          {[
            { id: "developer", label: "Developer Launch" },
            { id: "creative", label: "Creative Workspace" },
            { id: "secure", label: "Secure Enterprise" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveVariant(tab.id as VariantType)}
              className={`px-5 py-2 rounded-full text-xs font-bold tracking-tight transition-all duration-300 ${
                activeVariant === tab.id
                  ? "bg-white text-blue-600 shadow-md shadow-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden lg:inline text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">Core Engine</span>
          <Link
            href="/"
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-lg shadow-slate-900/10"
          >
            Get LANpad
          </Link>
        </div>
      </header>

      {/* Mobile Selector Alert */}
      <div className="md:hidden w-full max-w-sm mx-auto mt-6 px-4">
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-2 flex justify-around">
          {["developer", "creative", "secure"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveVariant(tab as VariantType)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold capitalize transition-all ${
                activeVariant === tab ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ─── MAIN HERO AREA ─── */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        
        {/* Left Copy Panel */}
        <div className="lg:col-span-6 space-y-8">
          
          {/* Tagline */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100/50">
            <Zap size={12} className="text-blue-600 fill-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Zero Servers. 100% Peer-to-Peer.</span>
          </div>

          {/* Dynamic Headlines based on Tab selection */}
          <div className="min-h-[160px] md:min-h-[200px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {activeVariant === "developer" && (
                <motion.div
                  key="dev"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-outfit font-black tracking-tight leading-[1.05] text-slate-900">
                    Bridge your mobile keyboard straight to your <span className="text-blue-600 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">IDE terminal.</span>
                  </h2>
                  <p className="text-sm md:text-base text-slate-500 leading-relaxed font-medium">
                    Type script blocks, terminal triggers, and database strings effortlessly from your phone directly into VS Code, Terminal, or Vim over pure local LAN. No internet required.
                  </p>
                </motion.div>
              )}

              {activeVariant === "creative" && (
                <motion.div
                  key="creative"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-outfit font-black tracking-tight leading-[1.05] text-slate-900">
                    Orchestrate your creative canvas <span className="text-amber-600 bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-500">from your palm.</span>
                  </h2>
                  <p className="text-sm md:text-base text-slate-500 leading-relaxed font-medium">
                    Trigger custom hotkeys, macros, and layer adjustments in Photoshop, Figma, or Premiere. Turn your phone into a custom macro deck with sub-millisecond local latency.
                  </p>
                </motion.div>
              )}

              {activeVariant === "secure" && (
                <motion.div
                  key="secure"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-outfit font-black tracking-tight leading-[1.05] text-slate-900">
                    Air-gapped text transfer with <span className="text-emerald-600 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">hardware trust.</span>
                  </h2>
                  <p className="text-sm md:text-base text-slate-500 leading-relaxed font-medium">
                    Pass credentials, server keys, and sensitive tokens securely. Features zero cloud connection, zero logs, and native human-like keyboard emulation to bypass enterprise paste blocks.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => runPresetAnimation(activeVariant === "developer" ? "git status" : activeVariant === "creative" ? "Scale Selection" : "ssh-add ~/.ssh/id_rsa")}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-all duration-300"
            >
              Launch Live Simulator
            </button>
            <a
              href="#setup"
              className="w-full sm:w-auto text-center border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300"
            >
              How it works (Local LAN)
            </a>
          </div>

          {/* Value Stats */}
          <div className="pt-8 border-t border-slate-200/60 grid grid-cols-3 gap-6">
            <div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 leading-none">1.2ms</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Local Latency</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 leading-none">0% Cloud</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Zero-Data Leak</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 leading-none">No Setup</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Auto QR pairing</div>
            </div>
          </div>

        </div>

        {/* Right Simulator Panel */}
        <div className="lg:col-span-6 flex flex-col items-center relative">
          
          <div className="flex flex-col md:flex-row gap-6 items-center w-full max-w-2xl justify-center z-10">
            
            {/* Phone Simulator Card */}
            <div className="w-[230px] h-[450px] bg-slate-900 border-[8px] border-slate-800 rounded-[38px] shadow-[0_30px_60px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col justify-between p-4 text-white">
              {/* Dynamic Island */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4.5 bg-black rounded-full" />
              
              {/* Phone Status Info */}
              <div className="flex justify-between items-center text-[8px] font-semibold text-slate-400 px-2 pt-1">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <div className="w-3.5 h-1.5 border border-slate-500 rounded-sm relative">
                    <div className="absolute top-0 left-0 h-full w-[80%] bg-slate-400" />
                  </div>
                </div>
              </div>

              {/* Mobile Web Interface */}
              <div className="flex-1 mt-6 flex flex-col justify-between bg-white rounded-3xl p-4 text-slate-800">
                <div className="text-center space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-blue-600 leading-none">LANpad Client</span>
                  <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-tight">TYPE MODE</h4>
                  <p className="text-[8px] text-slate-400 leading-tight">Tap presets or type below to instantly inject text:</p>
                </div>

                {/* Simulated Input Field */}
                <div className="relative my-4">
                  <input
                    type="text"
                    value={phoneText}
                    onChange={handlePhoneInputChange}
                    placeholder={
                      activeVariant === "developer"
                        ? "Type script or command..."
                        : activeVariant === "creative"
                        ? "Enter macro trigger..."
                        : "Type credentials..."
                    }
                    className="w-full text-[9px] bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  {isTyping && (
                    <div className="absolute right-3 top-2.5 flex gap-0.5">
                      <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                      <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-75" />
                      <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-150" />
                    </div>
                  )}
                </div>

                {/* Preset Controls */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {getPresets().map((preset) => (
                      <button
                        key={preset.label}
                        disabled={isTyping}
                        onClick={() => runPresetAnimation(preset.payload)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg py-2 text-[8px] font-bold uppercase tracking-wider transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      onClick={resetTerminal}
                      className="bg-red-50 hover:bg-red-100 text-red-600 rounded-lg py-2 text-[8px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* iOS Home Line */}
              <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-1" />
            </div>

            {/* Terminal/IDE Simulator Card */}
            <div className="w-[320px] aspect-[1.3/1] bg-[#0c0f19] border border-slate-800 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col">
              {/* Window Header */}
              <div className="bg-[#080a10] px-4 py-3 flex items-center justify-between border-b border-slate-900">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                  <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                </div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  {activeVariant === "developer" 
                    ? "vscode // LANpad listener" 
                    : activeVariant === "creative"
                    ? "figma // action-listener"
                    : "secure // key-node"}
                </span>
                <span className="w-6" />
              </div>

              {/* Console log list */}
              <div className="flex-1 p-5 font-mono text-[9px] text-slate-300 leading-relaxed overflow-y-auto space-y-1">
                {terminalLines.map((line, idx) => (
                  <div 
                    key={idx} 
                    className={`whitespace-pre-wrap ${
                      line.startsWith("$") 
                        ? "text-blue-400 font-bold" 
                        : line.includes("Verified") || line.includes("Connected")
                        ? "text-emerald-400" 
                        : line.startsWith("[") 
                        ? "text-slate-400" 
                        : "text-white"
                    }`}
                  >
                    {line}
                  </div>
                ))}
                {isTyping && (
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="inline-block w-1.5 h-3 bg-blue-500"
                  />
                )}
              </div>
            </div>

          </div>

          {/* Micro instructions caption */}
          <div className="mt-8 text-[10px] font-semibold text-slate-400/80 tracking-wide text-center">
            ✨ Type in the input field above, or click presets to witness the 1.2ms local execution.
          </div>

        </div>

      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-200/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100/50 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            All Systems Active
          </span>
          <span>v1.5.8.7-stable</span>
        </div>
        <div>© 2026 LANPAD. ALL RIGHTS RESERVED.</div>
      </footer>

    </div>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Award, Code2, ChevronRight, Sparkles, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Question {
  id: string;
  title: string;
  code: string;
  language: string;
}

interface VitCode {
  id: string;
  date: string;
  examType: string;
  title?: string;
  questions: Question[];
}

function VitCodesContent() {
  const searchParams = useSearchParams();
  const origin = searchParams.get("origin") || "";
  
  // ─── Theme (shared with admin via localStorage) ───
  const [theme, setTheme] = useState<"dark" | "light" | "system">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("glidepass-admin-theme") as "dark" | "light" | "system" | null;
    return saved || "dark";
  });
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    localStorage.setItem("glidepass-admin-theme", theme);
    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      setResolvedTheme(media.matches ? "dark" : "light");
      const fn = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? "dark" : "light");
      media.addEventListener("change", fn);
      return () => media.removeEventListener("change", fn);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  const dk = resolvedTheme === "dark";
  const [codes, setCodes] = useState<VitCode[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<string | null>(null);
  const [examRules, setExamRules] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Group sessions by examType
  const sessionsByExamType = codes.reduce((acc, session) => {
    const type = session.examType || "Other";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(session);
    return acc;
  }, {} as Record<string, VitCode[]>);

  const examTypes = Object.keys(sessionsByExamType);

  const getExamTypeDates = (type: string) => {
    const list = sessionsByExamType[type] || [];
    if (list.length === 0) return "";
    const dates = list.map(s => s.date).filter(Boolean);
    if (dates.length === 0) return "";
    const earliest = dates.reduce((a, b) => (a < b ? a : b), dates[0]);
    const latest = dates.reduce((a, b) => (a > b ? a : b), dates[0]);
    return earliest === latest ? earliest : `${earliest} → ${latest}`;
  };

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const [codesRes, rulesRes] = await Promise.all([
          fetch("/api/vitcodes"),
          fetch("/api/vitcodes/rules")
        ]);
        if (!codesRes.ok) throw new Error("Failed to fetch codes");
        
        const data = await codesRes.json();
        setCodes(data);

        if (rulesRes.ok) {
          const rulesData = await rulesRes.json();
          setExamRules(rulesData);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load VIT-AP codes.");
      } finally {
        setLoading(false);
      }
    };
    fetchCodes();
  }, []);

  const getRuleForType = (type: string | null | undefined): string | null => {
    if (!type) return null;
    const target = type.trim().toLowerCase();
    const matchedKey = Object.keys(examRules).find(
      key => key.trim().toLowerCase() === target
    );
    return matchedKey ? examRules[matchedKey] : null;
  };

  const getMaxCap = (ruleStr: string | null | undefined): number | null => {
    if (!ruleStr) return null;
    const trimmed = ruleStr.trim();
    if (!trimmed) return null;

    if (trimmed.includes("-")) {
      const parts = trimmed.split("-");
      if (parts.length === 2) {
        const maxVal = parseInt(parts[1].trim(), 10);
        return isNaN(maxVal) ? null : maxVal;
      }
    } else {
      const val = parseInt(trimmed, 10);
      return isNaN(val) ? null : val;
    }
    return null;
  };

  // ─── Style Tokens ───
  const bg = dk ? `bg-[#050505]` : `bg-[#F0F4F8]`; 
  const cardBg = dk 
    ? "bg-gradient-to-br from-white/[0.08] to-white/[0.01] backdrop-blur-[40px] shadow-2xl shadow-black/80" 
    : "bg-gradient-to-br from-white/90 to-white/40 backdrop-blur-[40px] shadow-xl shadow-[#0077C0]/5";
  const cardBorder = dk 
    ? "border border-white/[0.12] border-b-white/[0.02] border-r-white/[0.02]" 
    : "border border-white border-b-[#050505]/5 border-r-[#050505]/5";
  const txt1 = dk ? `text-[#FAFAFA]` : `text-[#050505]`;
  const txt2 = dk ? `text-[#C7EEFF]` : "text-[#0077C0]";
  const txt3 = dk ? "text-white/50" : "text-[#050505]/40";
  const borderLight = dk ? "border-white/10" : "border-black/10";
  const inputBg = dk ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10";

  return (
    <div className={`min-h-screen ${bg} ${txt1} relative font-sans antialiased overflow-x-hidden transition-colors duration-500`}>
      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="absolute top-[5%] left-[10%] w-[600px] h-[600px] rounded-full animate-pulse"
          style={{ background: dk ? "rgba(0,119,192,0.06)" : "rgba(0,119,192,0.08)", filter: "blur(150px)" }}
        />
        <div
          className="absolute bottom-[5%] right-[10%] w-[600px] h-[600px] rounded-full animate-pulse"
          style={{ background: dk ? "rgba(199,238,255,0.04)" : "rgba(0,119,192,0.04)", filter: "blur(150px)" }}
        />
      </div>

      <header className={`border-b ${borderLight} ${dk ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-xl sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={origin ? `${origin}/` : "/"}
              className={`${dk ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"} transition-colors duration-200`}
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="flex items-center gap-2 md:gap-3">
              <div className={`shrink-0 w-8 h-8 rounded-lg overflow-hidden border ${dk ? 'border-white/10' : 'border-black/10'} ${dk ? 'bg-black' : 'bg-white'} flex items-center justify-center`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/logo.png" 
                  alt="LANpad Logo" 
                  className={`w-[120%] h-[120%] object-contain scale-125 transition-all duration-500 ${dk ? 'invert hue-rotate-180 brightness-110 contrast-125' : ''}`} 
                />
              </div>
              <span className={`font-outfit font-black text-base md:text-lg tracking-tighter bg-clip-text text-transparent bg-gradient-to-r ${dk ? 'from-white to-white/60' : 'from-black to-black/60'}`}>
                LANPAD
              </span>
              <span className={`text-[9px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full border ${dk ? 'border-[#C7EEFF]/30 bg-[#C7EEFF]/10 text-[#C7EEFF]' : 'border-[#0077C0]/30 bg-[#0077C0]/10 text-[#0077C0]'}`}>
                VIT-AP Portal
              </span>
            </div>
          </div>

          <div>
            <button 
              onClick={() => {
                const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
                setTheme(next);
              }} 
              className={`w-9 h-9 rounded-xl border ${borderLight} hover:bg-white/5 flex items-center justify-center transition-all`}
              title={`Theme: ${theme}`}
            >
              {theme === "dark" ? <Moon size={14} className={txt1} /> : theme === "light" ? <Sun size={14} className={txt1} /> : <Sparkles size={14} className="text-blue-400" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-12 relative z-10">
        {selectedExamType === null && (
          <div className="text-center mb-10 space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${borderLight} ${dk ? 'bg-white/[0.02] text-white/50' : 'bg-black/[0.02] text-black/50'} text-xs`}
            >
              <Sparkles size={12} className="text-blue-400" />
              <span>Over-The-Air Code Repository</span>
            </motion.div>
            <h1 className={`text-4xl md:text-5xl font-outfit font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r ${dk ? 'from-white to-white/60' : 'from-black to-black/60'}`}>
              VIT-AP Today's Codes
            </h1>
            <p className={`${txt3} max-w-md mx-auto text-sm`}>
              Select your exam session, copy questions directly, or dispatch code straight to your laptop's clipboard.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className={`text-xs ${txt3}`}>Fetching latest sessions...</span>
          </div>
        ) : error ? (
          <div className={`text-center py-20 border ${borderLight} ${dk ? 'bg-white/[0.01]' : 'bg-black/[0.01]'} rounded-3xl max-w-lg mx-auto shadow-xl`}>
            <p className={`text-red-400 text-sm`}>{error}</p>
          </div>
        ) : codes.length === 0 ? (
          <div className={`text-center py-20 border ${borderLight} ${dk ? 'bg-white/[0.01]' : 'bg-black/[0.01]'} rounded-3xl max-w-lg mx-auto shadow-xl`}>
            <p className={`${txt3} text-sm`}>No exam codes added yet.</p>
          </div>
        ) : selectedExamType === null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {examTypes.map((type, index) => {
              const sessions = sessionsByExamType[type] || [];
              const count = sessions.length;
              const daysInfo = getExamTypeDates(type);
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.5 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="flex cursor-pointer"
                  onClick={() => setSelectedExamType(type)}
                >
                  <div className={`block w-full p-6 rounded-2xl ${cardBg} ${cardBorder} transition-all duration-300 group flex flex-col justify-between`}>
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div className={`flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg border ${
                          dk 
                            ? 'border-blue-400/30 bg-blue-500/10 text-blue-300' 
                            : 'border-blue-500/30 bg-blue-500/10 text-blue-700'
                        }`}>
                          <Award size={10} />
                          <span>{type}</span>
                        </div>
                      </div>
                      <h3 className={`text-lg font-black font-outfit ${txt1} group-hover:${txt2} transition-colors duration-300 mb-4`}>
                        {type}
                      </h3>
                      {daysInfo && (
                        <p className={`flex items-center gap-1.5 text-xs ${txt3} font-medium`}>
                          <Calendar size={12} />
                          {daysInfo}
                        </p>
                      )}
                    </div>
                    
                    <div className={`flex items-center justify-between text-xs ${txt3} pt-4 border-t ${borderLight} mt-8`}>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Code2 size={12} className={txt2} />
                        {count} Session{count > 1 ? "s" : ""} Available
                      </span>
                      <ChevronRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setSelectedExamType(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${borderLight} hover:bg-white/5 text-xs font-semibold transition-all`}
              >
                <ArrowLeft size={12} />
                Back to Exam Types
              </button>
              <span className={`text-xs ${txt3}`}>/</span>
              <span className={`text-xs font-bold ${txt2}`}>{selectedExamType}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(sessionsByExamType[selectedExamType] || []).map((session, index) => (
                <Link
                  key={session.id}
                  href={`/vitcodes/${session.id}${origin ? `?origin=${encodeURIComponent(origin)}` : ""}`}
                  className="flex w-full"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06, duration: 0.5 }}
                    whileHover={{ y: -6, scale: 1.01 }}
                    className={`block w-full p-6 rounded-2xl ${cardBg} ${cardBorder} transition-all duration-300 group flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col gap-1.5">
                          <div className={`flex items-center gap-1.5 text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg border ${
                            dk 
                              ? 'border-blue-400/30 bg-blue-500/10 text-blue-300' 
                              : 'border-blue-500/30 bg-blue-500/10 text-blue-700'
                          }`}>
                            <Award size={10} />
                            {session.examType}
                          </div>
                          {(() => {
                            const ruleForType = getRuleForType(session.examType);
                            const maxCap = getMaxCap(ruleForType);
                            const isCapped = maxCap !== null && session.questions && session.questions.length >= maxCap;
                            if (isCapped) {
                              return (
                                <span className="text-[8px] self-start px-1.5 py-0.5 rounded-md font-bold uppercase border bg-red-500/10 text-red-400 border-red-500/20 animate-pulse">
                                  Capped (Max {maxCap})
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${txt3} font-medium`}>
                          <Calendar size={12} />
                          {session.date}
                        </div>
                      </div>

                      <h3 className={`text-lg font-black font-outfit ${txt1} group-hover:${txt2} transition-colors duration-300 mb-4`}>
                        {session.title || session.examType} Session
                      </h3>
                    </div>
                    
                    <div className={`flex items-center justify-between text-xs ${txt3} pt-4 border-t ${borderLight} mt-auto`}>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Code2 size={12} className={txt2} />
                        {session.questions.length} Question{session.questions.length > 1 ? "s" : ""} Available
                      </span>
                      <ChevronRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function VitCodesPage() {

  return (
    <Suspense fallback={
      <div className={`min-h-screen bg-black text-white flex items-center justify-center`}>
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    }>
      <VitCodesContent />
    </Suspense>
  );
}

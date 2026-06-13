"use client";

import { useState, useEffect, use, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Copy, Check, Terminal, Sun, Moon, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Question {
  id: string;
  title: string;
  code: string;
  language: string;
  contributorName?: string;
}

interface VitCode {
  id: string;
  date: string;
  examType: string;
  questions: Question[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function SessionCodesContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
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
  const [session, setSession] = useState<VitCode | null>(null);
  const [examRules, setExamRules] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedQId, setExpandedQId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const [res, rulesRes] = await Promise.all([
          fetch("/api/vitcodes"),
          fetch("/api/vitcodes/rules")
        ]);
        if (!res.ok) throw new Error("Failed to load session codes");
        const data: VitCode[] = await res.json();
        const found = data.find((item) => item.id === sessionId);
        if (!found) throw new Error("Session not found");
        setSession(found);

        if (rulesRes.ok) {
          const rulesData = await rulesRes.json();
          setExamRules(rulesData);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load session details.");
      } finally {
        setLoading(false);
      }
    };
    fetchSessionData();
  }, [sessionId]);

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

  const handleCopy = (code: string, qId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(qId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendCommandCenter = (code: string) => {
    const targetOrigin = origin || "http://localhost:8000";
    window.location.href = `${targetOrigin}/center?code=${encodeURIComponent(code)}`;
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
      {/* Ambient background decoration */}
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
              href={`/vitcodes${origin ? `?origin=${encodeURIComponent(origin)}` : ""}`}
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
                Session Questions
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className={`text-xs ${txt3}`}>Loading session questions...</span>
          </div>
        ) : error || !session ? (
          <div className={`text-center py-20 border ${borderLight} ${dk ? 'bg-white/[0.01]' : 'bg-black/[0.01]'} rounded-3xl max-w-lg mx-auto shadow-xl`}>
            <p className={`text-sky-400 text-sm mb-4`}>{error || "Session not found."}</p>
            <Link href={`/vitcodes${origin ? `?origin=${encodeURIComponent(origin)}` : ""}`} className={`inline-block text-xs text-blue-400 hover:underline`}>
              Back to Overview
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className={`flex items-center gap-2 text-xs ${txt3} mb-2 font-mono`}>
                  <span>{session.date}</span>
                  <span>•</span>
                  <span className="text-blue-400 font-semibold">{session.examType}</span>
                  {(() => {
                    const ruleForType = getRuleForType(session.examType);
                    const maxCap = getMaxCap(ruleForType);
                    const isCapped = maxCap !== null && session.questions && session.questions.length >= maxCap;
                    if (isCapped) {
                      return (
                        <>
                          <span>•</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase border bg-red-500/10 text-red-400 border-red-500/20 animate-pulse">
                            Capped (Max {maxCap})
                          </span>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
                <h1 className={`text-3xl font-outfit font-black tracking-tight ${txt1}`}>
                  {session.examType} Questions
                </h1>
              </div>
            </div>

            <div className="space-y-6">
              {session.questions.map((q, idx) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.5 }}
                  className={`rounded-2xl overflow-hidden cursor-pointer transition-all ${cardBg} ${cardBorder}`}
                  onClick={() => setExpandedQId(expandedQId === q.id ? null : q.id)}
                >
                  {/* Card Header */}
                  <div className={`px-6 py-4 border-b ${borderLight} flex items-center justify-between ${dk ? 'bg-white/[0.01]' : 'bg-black/[0.01]'}`}>
                    <div className="flex items-center gap-2 min-w-0 mr-3 flex-wrap">
                      <Terminal size={14} className="text-blue-400 shrink-0" />
                      <span className={`text-xs font-bold ${dk ? "text-white/80" : "text-black/80"} font-mono truncate`}>Question {idx + 1}: {q.title}</span>
                      {q.contributorName && (
                        <span className={`text-[10px] ${txt3} font-mono`}>• by <span className={dk ? "text-white/70" : "text-black/70"}>{q.contributorName}</span></span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSendCommandCenter(q.code); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold uppercase transition-all"
                      >
                        <Send size={10} />
                        <span>Center</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(q.code, q.id); }}
                        className={`p-1.5 rounded-lg border ${borderLight} hover:bg-white/[0.05] transition-colors`}
                        title="Copy Code"
                      >
                        {copiedId === q.id ? <Check size={12} className="text-blue-400" /> : <Copy size={12} />}
                      </button>
                      <span className={`text-[9px] uppercase tracking-wider ${dk ? "bg-white/10 text-white/70" : "bg-black/10 text-black/75"} font-mono font-bold px-2 py-0.5 rounded border ${borderLight}`}>
                        {q.language}
                      </span>
                      {expandedQId === q.id ? <ChevronUp size={14} className="opacity-60" /> : <ChevronDown size={14} className="opacity-60" />}
                    </div>
                  </div>

                  {/* Title & Body */}
                  <AnimatePresence>
                    {expandedQId === q.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 space-y-4 border-t border-white/5">
                          {/* Code Editor Preview */}
                          <div className={`relative rounded-xl overflow-hidden border ${borderLight} ${dk ? "bg-black/40" : "bg-white/60"}`}>
                            <pre className="p-4 overflow-x-auto text-[11px] font-mono text-blue-200/90 leading-relaxed max-h-85 select-all">
                              <code className={dk ? "text-blue-200/90" : "text-blue-900"}>{q.code}</code>
                            </pre>
                          </div>

                          {/* Actions */}
                          <div className="pt-2 flex flex-row items-center justify-between gap-4">
                            <div className={`text-[10px] ${txt3} font-mono flex-1 min-w-0`}>
                              {q.contributorName && (
                                <span className="block truncate">Contributed by: <span className={`${dk ? "text-white/70" : "text-black/70"} font-bold`}>{q.contributorName}</span></span>
                              )}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSendCommandCenter(q.code); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] shrink-0"
                            >
                              <Send size={11} className="shrink-0" />
                              <span>Enter Command Center</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SessionCodesPage({ params }: PageProps) {

  return (
    <Suspense fallback={
      <div className={`min-h-screen bg-black text-white flex items-center justify-center`}>
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    }>
      <SessionCodesContent params={params} />
    </Suspense>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import {
  LogOut, Plus, Trash2, Calendar, Check, X, ChevronLeft, ArrowLeft,
  FileCode, Settings, Layout, Code, BookOpen, CheckCircle, AlertCircle, Sun, Moon
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PALETTE TOKENS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const P = {
  white: "#FAFAFA",
  sky: "#C7EEFF",
  blue: "#0077C0",
  black: "#050505",
  error: "#C62828",
} as const;

interface Question {
  id: string;
  title: string;
  code: string;
  language: string;
  comment?: string;
}

interface VitCode {
  id: string;
  date: string;
  examType: string;
  title?: string;
  questions: Question[];
}

function ContributorsDashboard() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  // ─── Theme ───
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const dk = theme === "dark";
  const gradientLine = "bg-gradient-to-r from-transparent via-[rgba(199,238,255,0.4)] to-transparent";

  // ─── Toast ───
  const [toast, setToast] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast({ type: null, msg: "" }), 4000);
  };

  // ─── State ───
  const [vitSessions, setVitSessions] = useState<VitCode[]>([]);
  const [loadingVit, setLoadingVit] = useState(true);
  const [savingVit, setSavingVit] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [vitDetailView, setVitDetailView] = useState(false);
  const [examTypeFilter, setExamTypeFilter] = useState<string>("all");
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const [selectedExamType, setSelectedExamType] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [accessStatus, setAccessStatus] = useState<"loading" | "active" | "blocked" | "error">("loading");

  // New session form
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [newExamType, setNewExamType] = useState("NERD");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [examTypes, setExamTypes] = useState(["NERD", "Daily Assessment", "Mid Term Exam", "Final Term Exam", "Coding Challenge"]);

  const [qTitle, setQTitle] = useState("");
  const [qCode, setQCode] = useState("");
  const [qLang, setQLang] = useState("cpp");
  const [qComment, setQComment] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("vit_exam_types");
    if (saved) {
      try { setExamTypes(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (examTypes.length > 0) {
      localStorage.setItem("vit_exam_types", JSON.stringify(examTypes));
    }
  }, [examTypes]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/contributors/status")
        .then(r => r.json())
        .then(d => {
          setAccessStatus(d.status === "blocked" ? "blocked" : "active");
          if (d.status !== "blocked") {
            fetchVitCodes();
            // Poll for real-time updates every 5 seconds
            const interval = setInterval(() => {
              fetchVitCodes();
            }, 5000);
            return () => clearInterval(interval);
          }
        })
        .catch(err => {
          setAccessStatus("error");
          showToast("error", "Failed to verify contributor status.");
        });
    }
  }, [status]);

  const fetchVitCodes = async () => {
    setLoadingVit(true);
    try {
      const res = await fetch("/api/vitcodes", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch VIT codes");
      const data = await res.json();
      setVitSessions(data);
      if (data.length > 0 && !activeSessionId) setActiveSessionId(data[0].id);
      if (data && Array.from) {
        const types = data.map((s: any) => s.examType).filter(Boolean);
        setExamTypes(prev => Array.from(new Set([...prev, ...types])));
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setLoadingVit(false);
    }
  };

  // We removed saveVitDB to prevent overwriting the DB. We use granular API routes.

  const handleAddSession = async () => {
    if (!newDate || !newExamType) return showToast("error", "Date and Exam Type required.");
    const session: VitCode = {
      id: "session_" + Date.now(),
      date: newDate,
      examType: newExamType,
      title: newSessionTitle,
      questions: []
    };
    
    // Optimistic Update
    setVitSessions(prev => [session, ...prev]);
    setActiveSessionId(session.id);
    setShowNewSessionModal(false);
    setNewSessionTitle("");
    setVitDetailView(true);

    try {
      const res = await fetch("/api/vitcodes/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session)
      });
      if (!res.ok) throw new Error("Failed to create session");
    } catch (e: any) {
      showToast("error", e.message);
      fetchVitCodes();
    }
  };

  const handleAddQuestion = async () => {
    if (!activeSessionId) return;
    if (!qTitle || !qCode) return showToast("error", "Title and Code required.");
    
    const newQ: Question = { 
      id: "q_" + Date.now(), 
      title: qTitle, 
      code: qCode, 
      language: qLang, 
      comment: qComment,
      contributorEmail: sessionData?.user?.email || "unknown" 
    };
    
    // Optimistic Update
    setVitSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, questions: [...s.questions, newQ] };
      }
      return s;
    }));
    setQTitle("");
    setQCode("");
    setQComment("");

    try {
      const res = await fetch("/api/vitcodes/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId, question: newQ })
      });
      if (!res.ok) throw new Error("Failed to add question");
    } catch (e: any) {
      showToast("error", e.message);
      fetchVitCodes();
    }
  };

  // ─── UI Variables ───
  const activeSession = useMemo(() => vitSessions.find(s => s.id === activeSessionId) || null, [vitSessions, activeSessionId]);
  
  const { filteredSessions, groupedSessions } = useMemo(() => {
    const filtered = examTypeFilter === "all" ? vitSessions : vitSessions.filter(s => s.examType === examTypeFilter);
    const grouped = filtered.reduce((acc, s) => {
      if (!acc[s.examType]) acc[s.examType] = [];
      acc[s.examType].push(s);
      return acc;
    }, {} as Record<string, VitCode[]>);
    return { filteredSessions: filtered, groupedSessions: grouped };
  }, [vitSessions, examTypeFilter]);

  const cardBg = dk ? "bg-black" : "bg-white";
  const textPrimary = dk ? "text-white" : "text-black";
  const textSecondary = dk ? "text-white/60" : "text-black/60";
  const borderLight = dk ? "border-white/10" : "border-black/10";
  const inputBg = dk ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10";

  // ─── BLOCKED STATE ───
  if (status === "authenticated" && accessStatus === "blocked") {
    return (
      <div className={`min-h-screen ${cardBg} ${textPrimary} font-inter flex flex-col items-center justify-center p-6`}>
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle size={48} className="mx-auto text-red-500" />
          <h1 className="text-2xl font-bold font-outfit uppercase">Access Revoked</h1>
          <p className="text-sm opacity-60 font-mono">Your contributor access has been temporarily suspended by an administrator. Please contact support if you believe this is a mistake.</p>
          <button onClick={() => signOut()} className="mt-4 px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98]" style={{ background: P.blue, color: "white" }}>Sign Out</button>
        </div>
      </div>
    );
  }

  // ─── UNAUTHENTICATED STATE ───
  if (status === "unauthenticated") {
    return (
      <div className={`min-h-screen ${cardBg} ${textPrimary} font-inter flex flex-col items-center justify-center relative overflow-hidden`}>
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-400/10 blur-[120px] rounded-full mix-blend-screen" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-5xl w-full px-6 text-center"
        >
          <div className="mb-6 inline-flex items-center justify-center p-3 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
            <Code size={40} className="text-blue-400" />
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Contribute to LANpad
          </h1>
          
          <p className={`text-lg md:text-xl ${textSecondary} mb-12 leading-relaxed max-w-2xl mx-auto`}>
            A community effort to maintain accurate exam codes for VIT students. Help your peers by providing the latest exam session questions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left items-stretch">
            <div className="h-full p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-start">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-base"><BookOpen size={18} className="text-sky-400 shrink-0"/> What is Contribute?</h3>
              <p className={`text-sm ${textSecondary} leading-relaxed`}>Contributors can submit new VIT-AP code sessions directly to the LANpad database for all users to access seamlessly.</p>
            </div>
            <div className="h-full p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-start">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-base"><Layout size={18} className="text-blue-400 shrink-0"/> Minimal Control</h3>
              <p className={`text-sm ${textSecondary} leading-relaxed`}>You get access to a simplified version of the Admin panel. Safely add new sessions and code snippets without delete risks.</p>
            </div>
            <div className="h-full p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-start">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-base"><LogOut size={18} className="text-rose-400 shrink-0"/> Who is allowed?</h3>
              <p className={`text-sm ${textSecondary} leading-relaxed`}>Access is strictly limited to verified university Google Workspace accounts (e.g. <code className={`px-1.5 py-0.5 rounded ${dk ? 'bg-white/10' : 'bg-black/10'} text-xs`}>@vitapstudent.ac.in</code>).</p>
            </div>
          </div>

          {authError === "AccessDenied" && (
            <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-base font-bold">
              Access Denied. You must use a valid VIT university email to sign in.
            </div>
          )}

          <div className="flex items-center gap-4 justify-center mb-8 text-left max-w-lg mx-auto p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <input 
              type="checkbox" 
              id="terms" 
              checked={acceptedTerms} 
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 accent-blue-500 shrink-0 cursor-pointer"
            />
            <label htmlFor="terms" className={`text-sm ${textSecondary} cursor-pointer select-none leading-relaxed`}>
              I understand that all contributions will be monitored. I agree to provide accurate exam codes.
            </label>
          </div>

          <button
            onClick={() => signIn("google")}
            disabled={!acceptedTerms}
            className={`group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-black rounded-full font-black uppercase tracking-widest text-base transition-all shadow-xl
              ${acceptedTerms ? 'hover:scale-105 active:scale-95 hover:shadow-white/20 cursor-pointer' : 'opacity-50 cursor-not-allowed grayscale'}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Sign in with Google
          </button>
          
          <div className="mt-8">
            <Link href="/" className={`transition-colors text-xs font-bold uppercase tracking-wider ${dk ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'}`}>
              ← Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── AUTHENTICATED STATE (Simplified Admin UI) ───
  if (status === "loading") {
    return (
      <div className={`min-h-screen ${cardBg} flex items-center justify-center`}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${cardBg} ${textPrimary} font-inter relative overflow-hidden pb-32`}>
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <motion.div animate={{ x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 20, repeat: Infinity }} className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <motion.div animate={{ x: [0, -50, 0], y: [0, -30, 0] }} transition={{ duration: 15, repeat: Infinity }} className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-sky-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Navigation Bar */}
      <nav className={`sticky top-0 z-40 border-b ${borderLight} backdrop-blur-xl ${dk ? 'bg-black/50' : 'bg-white/50'}`}>
        <div className="px-4 md:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 font-outfit font-black tracking-tighter truncate">
            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${dk ? 'bg-white text-black' : 'bg-black text-white'}`}>
              <Code size={18} />
            </div>
            <span className={`text-base md:text-lg bg-clip-text text-transparent bg-gradient-to-r ${dk ? 'from-white to-white/60' : 'from-black to-black/60'} truncate`}>
              LANpad <span className="hidden sm:inline text-blue-400 font-mono text-[10px] tracking-widest uppercase ml-2 px-2 py-0.5 rounded border border-blue-400/30 bg-blue-400/10">Contributors</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="hidden md:block text-xs font-mono" style={{ color: textSecondary }}>{session?.user?.email}</span>
            <button onClick={() => setTheme(dk ? "light" : "dark")} className={`p-2 rounded-xl border ${borderLight} hover:bg-white/5 transition-colors`}>
              {dk ? <Sun size={16} className="text-white" /> : <Moon size={16} className="text-black" />}
            </button>
            <button onClick={() => signOut()} className={`p-2 rounded-xl border ${borderLight} hover:bg-white/5 transition-colors`}>
              <LogOut size={16} className={dk ? "text-white/60" : "text-black/60"} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="px-4 md:px-12 py-6 md:py-10 max-w-7xl mx-auto">
        <motion.div key="vit" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
          <AnimatePresence mode="wait">
            {!vitDetailView ? (
              <motion.div key="vit-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-lg md:text-xl font-black font-outfit tracking-wide uppercase">VIT-AP Code Sessions</h2>
                    <p className={`text-xs ${textSecondary}`}>Manage exam sessions and code questions</p>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 flex-wrap w-full md:w-auto">
                    <select value={examTypeFilter} onChange={e => setExamTypeFilter(e.target.value)} className={`flex-1 md:flex-none text-xs rounded-xl px-3 py-2 border focus:outline-none ${inputBg}`}>
                      <option value="all">All Types</option>
                      {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => setShowNewSessionModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 md:px-4.5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all whitespace-nowrap"
                      style={{ background: P.blue }}>
                      <Plus size={13} /> New Session
                    </button>
                  </div>
                </div>

                {/* Session Cards Grid */}
                {loadingVit ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="py-20 text-center rounded-[28px] border border-dashed" style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(0,0,0,0.1)", color: dk ? `${P.sky}60` : `${P.black}60` }}>
                    <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-xs">No sessions yet. Create your first one.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {!selectedExamType ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(groupedSessions).map(([type, sessions]) => {
                          const totalCodes = sessions.reduce((acc, s) => acc + s.questions.length, 0);
                          return (
                            <div key={type}
                              onClick={() => setSelectedExamType(type)}
                              className="p-6 rounded-[28px] border cursor-pointer transition-all group hover:shadow-lg relative overflow-hidden"
                              style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                              <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine} opacity-0 group-hover:opacity-100 transition-opacity`} />
                              <h2 className="text-xl font-black uppercase tracking-wider mb-2">{type}</h2>
                              <p className="text-sm font-mono" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{totalCodes} Codes Contributed</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <button onClick={() => setSelectedExamType(null)} className="flex items-center gap-2 text-xs font-bold hover:opacity-70 transition-colors" style={{ color: P.blue }}>
                          <ArrowLeft size={14} /> Back to Exam Types
                        </button>
                        
                        {(() => {
                          const sessions = groupedSessions[selectedExamType] || [];
                          const today = new Date();
                          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                          
                          const sorted = [...sessions].sort((a, b) => {
                            if (a.date === todayStr && b.date !== todayStr) return -1;
                            if (b.date === todayStr && a.date !== todayStr) return 1;
                            const dateCmp = b.date.localeCompare(a.date);
                            if (dateCmp !== 0) return dateCmp;
                            return b.id.localeCompare(a.id);
                          });
                          
                          const formatDate = (d: string) => {
                            const p = d.split("-");
                            return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
                          };
                          
                          const totalCodes = sessions.reduce((acc, s) => acc + s.questions.length, 0);

                          return (
                            <>
                              <div className="mb-4">
                                <h2 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>{selectedExamType}</h2>
                                <p className="text-[10px] font-mono mt-1" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{sessions.length} Session{sessions.length !== 1 && 's'} • {totalCodes} Codes Contributed</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sorted.map(s => (
                                  <div key={s.id}
                                    onClick={() => { setActiveSessionId(s.id); setVitDetailView(true); }}
                                    className="p-5 rounded-[24px] border cursor-pointer transition-all group hover:shadow-lg relative overflow-hidden"
                                    style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                                    <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border" style={{ background: `${P.sky}15`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>{s.examType}</span>
                                      <span className="text-[10px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{formatDate(s.date)}</span>
                                    </div>
                                    <h3 className="text-sm font-bold mb-3">{s.title || formatDate(s.date)}</h3>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{s.questions.length} Codes Contributed</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              /* Session Detail View */
              <motion.div key="vit-detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="space-y-6">
                <button onClick={() => setVitDetailView(false)} className="flex items-center gap-2 text-xs font-bold hover:opacity-70 transition-colors" style={{ color: P.blue }}>
                  <ArrowLeft size={14} /> Back to Sessions
                </button>

                {activeSession && (
                  <>
                    {/* Session Header */}
                    <div className="p-6 rounded-[28px] border relative overflow-hidden"
                      style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                      <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-black font-outfit uppercase">{activeSession.title || activeSession.date}</h2>
                        <span className="text-[9px] px-2.5 py-0.5 rounded-md font-bold uppercase border" style={{ background: `${P.sky}15`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>{activeSession.examType}</span>
                        <span className="text-[10px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{activeSession.date}</span>
                        <span className="text-[10px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>• {activeSession.questions.length} Codes Contributed</span>
                      </div>
                    </div>

                    {/* Add Question Form */}
                    <div className="p-4 md:p-6 rounded-[24px] md:rounded-[28px] border relative overflow-hidden space-y-4 md:space-y-5"
                      style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                      <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                      <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase flex items-center gap-2" style={{ color: P.blue }}>
                        <Plus size={14} /> Add Code Question
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Question Title</label>
                          <input type="text" value={qTitle} onChange={e => setQTitle(e.target.value)} placeholder="e.g. Matrix Transpose"
                            className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`} />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Language</label>
                          <select value={qLang} onChange={e => setQLang(e.target.value)} className={`w-full text-xs rounded-xl px-3 py-3 border focus:outline-none ${inputBg}`}>
                            <option value="cpp">C++ (cpp)</option>
                            <option value="c">C (c)</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="javascript">JavaScript</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Comment (Optional)</label>
                        <input type="text" value={qComment} onChange={e => setQComment(e.target.value)} placeholder="e.g. Needs C++17 support..."
                          className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`} />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: `${P.sky}80` }}>Source Code</label>
                        <textarea value={qCode} onChange={e => setQCode(e.target.value)} placeholder="Paste source code..."
                          className="w-full h-40 text-xs font-mono rounded-xl p-4 border focus:outline-none resize-none"
                          style={{ background: "#151b22", borderColor: "rgba(199,238,255,0.1)", color: "#8ecfff" }} />
                      </div>
                      <div className="flex justify-end">
                        <button onClick={handleAddQuestion} className="px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-[0.98] transition-all"
                          style={{ background: P.blue }}><Plus size={13} /> Add Question</button>
                      </div>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-4">
                      {activeSession.questions.length === 0 ? (
                        <div className="py-12 text-center rounded-[28px] border border-dashed" style={{ borderColor: "rgba(199,238,255,0.1)", color: `${P.sky}60` }}>
                          <Code size={32} className="mx-auto mb-3 opacity-30" />
                          <p className="text-xs">No questions in this session.</p>
                        </div>
                      ) : (
                        activeSession.questions.map((q, idx) => (
                          <div key={q.id} className="p-1.5 rounded-[28px] border relative overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(240,240,240,0.5)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(0,0,0,0.05)", backdropFilter: "blur(40px)" }}
                            onClick={() => setExpandedQId(expandedQId === q.id ? null : q.id)}>
                            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine} opacity-50`} />
                            
                            <div className="p-4 md:p-5 rounded-[24px] border" style={{ background: dk ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.8)", borderColor: dk ? "transparent" : "rgba(0,0,0,0.03)" }}>
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-lg text-[10px] font-bold mt-0.5" style={{ background: `${P.sky}15`, color: P.sky }}>{idx + 1}</span>
                                  <div className="flex flex-col">
                                    <h4 className="text-sm font-bold" style={{ color: dk ? "white" : "black" }}>{q.title}</h4>
                                    {q.comment && <p className="text-xs mt-1" style={{ color: dk ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)" }}>{q.comment}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center shrink-0 ml-4">
                                  <span className="text-[10px] font-mono uppercase px-2 py-1 rounded-md border" style={{ color: dk ? `${P.sky}80` : `${P.black}60`, borderColor: dk ? "rgba(199,238,255,0.15)" : "rgba(0,0,0,0.1)", background: dk ? "rgba(199,238,255,0.05)" : "rgba(0,0,0,0.02)" }}>{q.language}</span>
                                </div>
                              </div>
                              <AnimatePresence>
                                {expandedQId === q.id && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4">
                                    <div className="rounded-xl overflow-hidden border relative" style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(0,0,0,0.1)" }}>
                                      <div className="absolute top-0 left-0 right-0 h-6 flex items-center px-3 border-b" style={{ background: dk ? "black" : "#f3f4f6", borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                                        <div className="flex gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                          <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                          <div className="w-2 h-2 rounded-full bg-green-500/50" />
                                        </div>
                                      </div>
                                      <pre className="text-[11px] font-mono p-4 pt-10 overflow-x-auto" style={{ background: dk ? "#0d1117" : "#ffffff", color: dk ? "#c9d1d9" : "#24292e" }}>
                                        <code>{q.code}</code>
                                      </pre>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* NEW SESSION MODAL */}
      <AnimatePresence>
        {showNewSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewSessionModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-[95%] sm:w-full max-w-md p-1 sm:p-1.5 rounded-[24px] sm:rounded-[32px] border bg-black border-white/10 shadow-2xl mx-auto`}>
              <div className={`p-5 sm:p-6 rounded-[20px] sm:rounded-[28px] ${cardBg}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-lg font-black uppercase ${textPrimary}`}>Create Session</h3>
                  <button onClick={() => setShowNewSessionModal(false)} className={`p-1.5 rounded-lg border ${borderLight} hover:bg-white/5`}>
                    <X size={14} className={textPrimary} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-[10px] font-mono mb-1.5 ${textSecondary}`}>Exam Type</label>
                    <div className="flex gap-2">
                      <select value={newExamType} onChange={e => setNewExamType(e.target.value)} className={`flex-1 text-xs rounded-xl px-4 py-3 border focus:outline-none ${inputBg}`}>
                        {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-mono mb-1.5 ${textSecondary}`}>Session Date</label>
                    <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none ${inputBg}`} />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-mono mb-1.5 ${textSecondary}`}>Optional Title</label>
                    <input type="text" value={newSessionTitle} onChange={e => setNewSessionTitle(e.target.value)} placeholder="e.g. Morning Batch" className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none ${inputBg}`} />
                  </div>
                  <button onClick={handleAddSession} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-white font-bold text-xs shadow-md" style={{ background: P.blue }}>
                    <Check size={14} /> Create Session
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast.type && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bottom-6 right-6 z-[100] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold text-white border backdrop-blur-xl
            ${toast.type === 'success' ? 'bg-[#0077C0]/90 border-[#C7EEFF]/30' : 'bg-[#C62828]/90 border-red-400/30'}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ContributorsPage() {
  return (
    <SessionProvider>
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <ContributorsDashboard />
      </React.Suspense>
    </SessionProvider>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import dynamic from "next/dynamic";

const MagicRings = dynamic(() => import("../../components/MagicRings"), { ssr: false });
import {
  LogOut, Plus, Trash2, Calendar, Check, X, ChevronLeft, ArrowLeft,
  FileCode, Settings, Layout, Code, BookOpen, CheckCircle, AlertCircle, Sun, Moon, Copy, Edit
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
  contributorEmail?: string;
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

  // ─── Theme (shared with admin via localStorage) ───
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("glidepass-admin-theme");
    if (saved === "light") return "light";
    if (saved === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark"; // default
  });

  useEffect(() => {
    localStorage.setItem("glidepass-admin-theme", theme);
  }, [theme]);

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
  const [sayMyName, setSayMyName] = useState(false);

  const [examRules, setExamRules] = useState<Record<string, string>>({});
  const [sessionLimits, setSessionLimits] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/vitcodes/rules")
      .then(r => r.json())
      .then(data => {
        if (data.rules) setExamRules(data.rules);
        if (data.sessionLimits) setSessionLimits(data.sessionLimits);
      })
      .catch(() => {});
  }, []);

  const getRuleForType = (type: string | null | undefined): string | null => {
    if (!type) return null;
    const target = type.trim().toLowerCase();
    const matchedKey = Object.keys(examRules).find(
      key => key.trim().toLowerCase() === target
    );
    return matchedKey ? examRules[matchedKey] : null;
  };

  const getSessionLimitForType = (type: string | null | undefined): number => {
    if (!type) return 1;
    const target = type.trim().toLowerCase();
    const matchedKey = Object.keys(sessionLimits).find(
      key => key.trim().toLowerCase() === target
    );
    if (matchedKey && sessionLimits[matchedKey] !== undefined) {
      return sessionLimits[matchedKey];
    }
    return 1; // default 1 session per day
  };

  const checkRuleSatisfied = (questionsCount: number, ruleStr: string | null | undefined): boolean => {
    if (!ruleStr) return questionsCount >= 1;
    const trimmed = ruleStr.trim();
    if (!trimmed) return questionsCount >= 1;

    if (trimmed.includes("-")) {
      const [minStr, maxStr] = trimmed.split("-");
      const min = parseInt(minStr.trim(), 10);
      const max = parseInt(maxStr.trim(), 10);
      if (isNaN(min) && isNaN(max)) return questionsCount >= 1;
      if (isNaN(min)) return questionsCount <= max;
      if (isNaN(max)) return questionsCount >= min;
      return questionsCount >= min && questionsCount <= max;
    } else {
      const min = parseInt(trimmed, 10);
      if (isNaN(min)) return questionsCount >= 1;
      return questionsCount >= min;
    }
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
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);

  // Copy and Edit states
  const [copiedQId, setCopiedQId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editQTitle, setEditQTitle] = useState("");
  const [editQCode, setEditQCode] = useState("");
  const [editQLang, setEditQLang] = useState("cpp");
  const [editQComment, setEditQComment] = useState("");
  const [editReason, setEditReason] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  const handleCopyCode = (qId: string, code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedQId(qId);
    showToast("success", "Code copied to clipboard!");
    setTimeout(() => setCopiedQId(null), 2000);
  };

  const handleOpenEdit = (q: Question, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingQuestion(q);
    setEditQTitle(q.title);
    setEditQCode(q.code);
    setEditQLang(q.language);
    setEditQComment(q.comment || "");
    setEditReason("");
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    if (!editQTitle || !editQCode) return showToast("error", "Title and Code required.");
    if (!editReason.trim()) return showToast("error", "Reason for edit is required.");

    const updatedQ: Question = {
      ...editingQuestion,
      title: editQTitle,
      code: editQCode,
      language: editQLang,
      comment: editReason.trim()
    };

    setVitSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          questions: s.questions.map(q => q.id === updatedQ.id ? updatedQ : q)
        };
      }
      return s;
    }));

    setShowEditModal(false);
    setEditingQuestion(null);

    try {
      const res = await fetch("/api/vitcodes/question", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedQ)
      });
      if (!res.ok) throw new Error("Failed to save edit");
      showToast("success", "Code edited successfully.");
    } catch (e: any) {
      showToast("error", e.message);
      fetchVitCodes();
    }
  };

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
          if (d.sayMyName !== undefined) {
            setSayMyName(d.sayMyName);
          }
          if (d.status !== "blocked") {
            fetchVitCodes();
            // Poll for real-time updates every 1 second (quiet mode)
            const interval = setInterval(() => {
              fetchVitCodes(true);
            }, 1000);
            return () => clearInterval(interval);
          }
        })
        .catch(err => {
          setAccessStatus("error");
          showToast("error", "Failed to verify contributor status.");
        });
    }
  }, [status]);

  const handleToggleSayMyName = async () => {
    const nextVal = !sayMyName;
    setSayMyName(nextVal);
    try {
      const res = await fetch("/api/contributors/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sayMyName: nextVal })
      });
      if (!res.ok) throw new Error("Failed to save preference");
      showToast("success", nextVal ? "Your name will be shown on contributions." : "Your contributions are now anonymous.");
    } catch (e: any) {
      setSayMyName(sayMyName); // rollback
      showToast("error", e.message);
    }
  };

  const fetchVitCodes = async (quiet = false) => {
    if (!quiet) setLoadingVit(true);
    try {
      const res = await fetch("/api/vitcodes", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch VIT codes");
      const data = await res.json();
      setVitSessions(prev => {
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data;
      });
      if (data.length > 0 && !quiet && !activeSessionId) setActiveSessionId(data[0].id);
      if (data && Array.from) {
        const types = data.map((s: any) => s.examType).filter(Boolean);
        setExamTypes(prev => Array.from(new Set([...prev, ...types])));
      }

      // Sync rules in real-time
      const rulesRes = await fetch("/api/vitcodes/rules", { cache: "no-store" });
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        if (rulesData) {
          if (rulesData.rules) {
            setExamRules(prev => JSON.stringify(prev) === JSON.stringify(rulesData.rules) ? prev : rulesData.rules);
          }
          if (rulesData.sessionLimits) {
            setSessionLimits(prev => JSON.stringify(prev) === JSON.stringify(rulesData.sessionLimits) ? prev : rulesData.sessionLimits);
          }
        }
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      if (!quiet) setLoadingVit(false);
    }
  };

  // We removed saveVitDB to prevent overwriting the DB. We use granular API routes.

  const handleAddSession = async () => {
    if (!newDate || !newExamType) return showToast("error", "Date and Exam Type required.");

    const sessionsToday = vitSessions.filter(
      s => s.date === newDate && s.examType.trim().toLowerCase() === newExamType.trim().toLowerCase()
    );
    const limitRule = getSessionLimitForType(newExamType);
    if (sessionsToday.length >= limitRule) {
      return showToast("error", `Failed to create session: The daily limit of ${limitRule} session(s) for ${newExamType} has been reached.`);
    }
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

    const currentSession = vitSessions.find(s => s.id === activeSessionId);
    if (currentSession) {
      const ruleForType = getRuleForType(currentSession.examType);
      const maxCap = getMaxCap(ruleForType);
      if (maxCap !== null && currentSession.questions.length >= maxCap) {
        return showToast("error", `Failed to add code: The session has reached its capacity limit of ${maxCap} codes.`);
      }
    }

    if (!qTitle || !qCode) return showToast("error", "Title and Code required.");
    
    const newQ: Question = { 
      id: "q_" + Date.now(), 
      title: qTitle, 
      code: qCode, 
      language: qLang, 
      comment: qComment,
      contributorEmail: session?.user?.email || "unknown" 
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
    setShowAddQuestionModal(false);

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
      <div className="h-[100dvh] bg-[#050505] text-[#FAFAFA] font-inter flex flex-col items-center justify-between relative overflow-hidden py-6 md:py-12 px-4">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-400/10 blur-[120px] rounded-full mix-blend-screen" />
        </div>
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <MagicRings
            color="#0077c0"
            colorTwo="#c7eeff"
            ringCount={8}
            speed={0.8}
            attenuation={12}
            lineThickness={1.5}
            baseRadius={0.25}
            radiusStep={0.08}
            scaleRate={0.08}
            opacity={0.35}
            blur={0}
            noiseAmount={0.05}
            followMouse={true}
            mouseInfluence={0.15}
            hoverScale={1.1}
            parallax={0.03}
          />
        </div>

        {/* Top Spacer or Icon */}
        <div className="relative z-10 shrink-0 mb-1 md:mb-4">
          <div className="inline-flex items-center justify-center rounded-2xl overflow-hidden border border-white/10 shadow-2xl w-14 h-14 md:w-20 md:h-20 bg-white/5 backdrop-blur-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="LANpad Logo" className="w-[85%] h-[85%] object-contain scale-[1.05] invert hue-rotate-180 brightness-110 contrast-125" />
          </div>
        </div>

        {/* Middle Main Card Container */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-5xl w-full flex-1 flex flex-col justify-center items-center text-center min-h-0"
        >
          <h1 className="text-3xl md:text-6xl font-black tracking-tighter mb-2 md:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Contribute to LANpad
          </h1>
          
          <p className="text-xs md:text-lg text-[#FAFAFA]/60 mb-4 md:mb-8 leading-relaxed max-w-2xl mx-auto px-4">
            A community effort to maintain accurate exam exam codes for VIT students. Help your peers by providing the latest exam session questions.
          </p>

          {/* Info Cards Container (Stack vertically on mobile, row on desktop) */}
          <div className="w-full flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-6 px-4 md:px-0 py-1 mb-4 md:mb-8 min-h-0 shrink-0">
            <div className="p-3 md:p-6 rounded-xl md:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col text-left justify-start">
              <h3 className="font-bold mb-0.5 md:mb-2 flex items-center gap-1.5 md:gap-2 text-[11px] md:text-base text-white"><BookOpen size={13} className="text-sky-400 shrink-0 md:w-5 md:h-5"/> What is Contribute?</h3>
              <p className="text-[9px] md:text-sm text-[#FAFAFA]/60 leading-relaxed">Submit VIT exam sessions directly to the LANpad database for real-time local syncs.</p>
            </div>
            <div className="p-3 md:p-6 rounded-xl md:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col text-left justify-start">
              <h3 className="font-bold mb-0.5 md:mb-2 flex items-center gap-1.5 md:gap-2 text-[11px] md:text-base text-white"><Layout size={13} className="text-blue-400 shrink-0 md:w-5 md:h-5"/> Minimal Control</h3>
              <p className="text-[9px] md:text-sm text-[#FAFAFA]/60 leading-relaxed">A simplified workspace to add sessions and verify codes safely without deletion risk.</p>
            </div>
            <div className="p-3 md:p-6 rounded-xl md:rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col text-left justify-start">
              <h3 className="font-bold mb-0.5 md:mb-2 flex items-center gap-1.5 md:gap-2 text-[11px] md:text-base text-white"><LogOut size={13} className="text-rose-400 shrink-0 md:w-5 md:h-5"/> Who is allowed?</h3>
              <p className="text-[9px] md:text-sm text-[#FAFAFA]/60 leading-relaxed">Access is strictly limited to verified university Google accounts.</p>
            </div>
          </div>

          {authError === "AccessDenied" && (
            <div className="mb-4 p-2.5 md:p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs md:text-sm font-bold">
              Access Denied. You must use a valid VIT university email to sign in.
            </div>
          )}

          <div className="flex items-start md:items-center gap-3 text-left max-w-md md:max-w-xl mx-auto p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-white/5 bg-white/[0.02] mb-4 md:mb-8">
            <input 
              type="checkbox" 
              id="terms" 
              checked={acceptedTerms} 
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-3.5 h-3.5 md:w-4 md:h-4 rounded border-white/20 bg-white/5 accent-blue-500 shrink-0 cursor-pointer mt-0.5 md:mt-0"
            />
            <label htmlFor="terms" className="text-[10px] md:text-sm text-[#FAFAFA]/60 cursor-pointer select-none leading-normal">
              I understand that all contributions are monitored. I agree to provide accurate and clean exam codes.
            </label>
          </div>

          <button
            onClick={() => signIn("google")}
            disabled={!acceptedTerms}
            className={`group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 md:gap-3.5 px-6 py-3.5 md:px-10 md:py-4.5 bg-white text-black rounded-full font-black uppercase tracking-wider text-xs md:text-sm transition-all shadow-xl shrink-0
              ${acceptedTerms ? 'hover:scale-105 active:scale-95 hover:shadow-white/20 cursor-pointer' : 'opacity-50 cursor-not-allowed grayscale'}`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" className="md:w-5 md:h-5" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Sign in with Google
          </button>
        </motion.div>

        {/* Footer Link */}
        <div className="relative z-10 shrink-0 mt-2 md:mt-6">
          <Link href="/" className="transition-colors text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white">
            ← Back to Home
          </Link>
        </div>
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
    <div className={`h-[100dvh] flex flex-col ${cardBg} ${textPrimary} font-inter relative overflow-hidden`}>
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <motion.div animate={{ x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 20, repeat: Infinity }} className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <motion.div animate={{ x: [0, -50, 0], y: [0, -30, 0] }} transition={{ duration: 15, repeat: Infinity }} className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-sky-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Navigation Bar */}
      <nav className={`shrink-0 border-b ${borderLight} backdrop-blur-xl ${dk ? 'bg-black/50' : 'bg-white/50'} z-40`}>
        <div className="px-4 md:px-12 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 font-outfit font-black tracking-tighter truncate">
            <div className={`shrink-0 w-8 h-8 rounded-lg overflow-hidden border ${dk ? 'border-white/10' : 'border-black/10'} ${dk ? 'bg-black' : 'bg-white'} flex items-center justify-center`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/logo.png" 
                alt="LANpad Logo" 
                className={`w-[120%] h-[120%] object-contain scale-125 transition-all duration-500 ${dk ? 'invert hue-rotate-180 brightness-110 contrast-125' : ''}`} 
              />
            </div>
            <span className={`text-base md:text-lg bg-clip-text text-transparent bg-gradient-to-r ${dk ? 'from-white to-white/60' : 'from-black to-black/60'} truncate`}>
              LANpad <span className="hidden sm:inline text-blue-400 font-mono text-[10px] tracking-widest uppercase ml-2 px-2 py-0.5 rounded border border-blue-400/30 bg-blue-400/10">Contributors</span>
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-xs font-mono" style={{ color: textSecondary }}>{session?.user?.email}</span>
            
            {/* Say My Name Toggle */}
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border ${borderLight} ${dk ? 'bg-white/[0.02]' : 'bg-black/[0.02]'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${dk ? "text-white/60" : "text-black/60"}`}>Say my name</span>
              <button 
                onClick={handleToggleSayMyName} 
                className={`w-9 h-5 rounded-full p-0.5 relative transition-colors duration-200 focus:outline-none shrink-0 ${sayMyName ? 'bg-blue-500' : 'bg-neutral-600'}`}
              >
                <span className={`w-4 h-4 bg-white rounded-full block transition-transform duration-200 ${sayMyName ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            <button onClick={() => setTheme(dk ? "light" : "dark")} className={`p-2 rounded-xl border ${borderLight} hover:bg-white/5 transition-colors`}>
              {dk ? <Sun size={14} className="text-white" /> : <Moon size={14} className="text-black" />}
            </button>
            <button onClick={() => signOut()} className={`p-2 rounded-xl border ${borderLight} hover:bg-white/5 transition-colors`}>
              <LogOut size={14} className={dk ? "text-white/60" : "text-black/60"} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col relative w-full max-w-7xl mx-auto px-4 md:px-12 py-4">
        <div className="flex-1 min-h-0 flex flex-col">
          <AnimatePresence mode="wait">
            {!vitDetailView ? (
              <motion.div key="vit-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }} className="flex-1 min-h-0 flex flex-col space-y-4">
                {/* Header */}
                <div className="shrink-0 flex flex-row justify-between items-center gap-4">
                  <div>
                    <h2 className="text-base md:text-lg font-black font-outfit tracking-wide uppercase">VIT-AP Code Sessions</h2>
                    <p className={`text-[10px] ${textSecondary}`}>Manage exam sessions and code questions</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={examTypeFilter} onChange={e => setExamTypeFilter(e.target.value)} className={`text-xs rounded-xl px-2.5 py-1.5 border focus:outline-none ${inputBg}`}>
                      <option value="all">All</option>
                      {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => setShowNewSessionModal(true)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all whitespace-nowrap"
                      style={{ background: P.blue }}>
                      <Plus size={12} /> <span className="hidden sm:inline">New Session</span><span className="sm:hidden">New</span>
                    </button>
                  </div>
                </div>

                {/* Session Cards list (Scrollable internally) */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
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
                    <div className="space-y-4">
                      {!selectedExamType ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(groupedSessions).map(([type, sessions]) => {
                            const totalCodes = sessions.reduce((acc, s) => acc + s.questions.length, 0);
                            const today = new Date();
                            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                            const todaySessions = sessions.filter(s => s.date === todayStr);
                            const isSatisfied = todaySessions.some(s => checkRuleSatisfied(s.questions?.length || 0, examRules[type]));

                            return (
                              <div key={type}
                                onClick={() => setSelectedExamType(type)}
                                className="p-4 rounded-[20px] border cursor-pointer transition-all group hover:shadow-lg relative overflow-hidden flex justify-between items-center"
                                style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                                <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                <div className="space-y-1">
                                  <h2 className="text-base font-black uppercase tracking-wider">{type}</h2>
                                  <p className="text-xs font-mono" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                                    {sessions.length} Session{sessions.length !== 1 && 's'} • {totalCodes} Code{totalCodes !== 1 && 's'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`w-3 h-3 rounded-full ${isSatisfied ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'} transition-all duration-300 animate-pulse`} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
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
                              return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d;
                            };
                            
                            const totalCodes = sessions.reduce((acc, s) => acc + s.questions.length, 0);

                            return (
                              <>
                                <div className="mb-2 shrink-0">
                                  <h2 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>{selectedExamType}</h2>
                                  <p className="text-[10px] font-mono mt-0.5" style={{ color: dk ? `${P.sky}60` : `${P.black}44` }}>{sessions.length} Session{sessions.length !== 1 && 's'} • {totalCodes} Codes Contributed</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {sorted.map(s => {
                                    const ruleForType = getRuleForType(s.examType);
                                    const maxCap = getMaxCap(ruleForType);
                                    const isCapped = maxCap !== null && s.questions && s.questions.length >= maxCap;

                                    return (
                                      <div key={s.id}
                                        onClick={() => { setActiveSessionId(s.id); setVitDetailView(true); }}
                                        className="p-4 rounded-[20px] border cursor-pointer transition-all group hover:shadow-lg relative overflow-hidden"
                                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border" style={{ background: `${P.sky}15`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>{s.examType}</span>
                                          <span className="text-[9px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{formatDate(s.date)}</span>
                                          {isCapped && (
                                            <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase border bg-red-500/10 text-red-400 border-red-500/20 animate-pulse">
                                              Capped (Max {maxCap})
                                            </span>
                                          )}
                                        </div>
                                        <h3 className="text-xs font-bold mb-2 truncate">{s.title || formatDate(s.date)}</h3>
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{s.questions.length} Codes Contributed</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* Session Detail View */
              <motion.div key="vit-detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="flex-1 min-h-0 flex flex-col space-y-4">
                <div className="shrink-0 flex items-center justify-between">
                  <button onClick={() => setVitDetailView(false)} className="flex items-center gap-1.5 text-xs font-bold hover:opacity-70 transition-colors" style={{ color: P.blue }}>
                    <ArrowLeft size={14} /> Back
                  </button>

                  {(() => {
                    const ruleForType = activeSession ? getRuleForType(activeSession.examType) : undefined;
                    const maxCap = getMaxCap(ruleForType);
                    const isCapped = maxCap !== null && activeSession && activeSession.questions.length >= maxCap;
                    
                    return (
                      <button 
                        onClick={() => { if (!isCapped) setShowAddQuestionModal(true); }} 
                        disabled={!!isCapped}
                        className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all ${isCapped ? 'opacity-50 cursor-not-allowed bg-neutral-600' : 'active:scale-[0.98]'}`}
                        style={{ background: isCapped ? undefined : P.blue }}
                        title={isCapped ? `Capped at max ${maxCap} codes` : undefined}
                      >
                        <Plus size={12} /> {isCapped ? `Capped (${maxCap} Max)` : 'Add Question'}
                      </button>
                    );
                  })()}
                </div>

                {activeSession && (
                  <div className="flex-1 min-h-0 flex flex-col space-y-3">
                    {/* Session Header Card */}
                    <div className="shrink-0 p-4 rounded-[20px] border relative overflow-hidden"
                      style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                      <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-black font-outfit uppercase">{activeSession.title || activeSession.date}</h2>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase border" style={{ background: `${P.sky}15`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>{activeSession.examType}</span>
                        <span className="text-[9px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{activeSession.date}</span>
                        <span className="text-[9px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>• {activeSession.questions.length} Codes</span>
                        {(() => {
                          const ruleForType = getRuleForType(activeSession.examType);
                          const maxCap = getMaxCap(ruleForType);
                          const isCapped = maxCap !== null && activeSession.questions.length >= maxCap;
                          if (isCapped) {
                            return (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase border bg-red-500/10 text-red-400 border-red-500/20 animate-pulse">
                                Capped (Max {maxCap})
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>

                    {/* Questions List (Fills remainder & scrolls internally) */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                      {activeSession.questions.length === 0 ? (
                        <div className="py-16 text-center rounded-[28px] border border-dashed" style={{ borderColor: "rgba(199,238,255,0.1)", color: `${P.sky}60` }}>
                          <Code size={32} className="mx-auto mb-3 opacity-30" />
                          <p className="text-xs">No questions in this session. Click "Add Question" to start contributing.</p>
                        </div>
                      ) : (
                        activeSession.questions.map((q, idx) => (
                          <div key={q.id} className="p-1 rounded-[20px] border relative overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(240,240,240,0.5)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(0,0,0,0.05)", backdropFilter: "blur(40px)" }}
                            onClick={() => setExpandedQId(expandedQId === q.id ? null : q.id)}>
                            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine} opacity-50`} />
                            
                            <div className="p-3 md:p-4 rounded-[16px] border" style={{ background: dk ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.8)", borderColor: dk ? "transparent" : "rgba(0,0,0,0.03)" }}>
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded-lg text-[9px] font-bold mt-0.5" style={{ background: `${P.sky}15`, color: P.sky }}>{idx + 1}</span>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <h4 className="text-xs font-bold truncate" style={{ color: dk ? "white" : "black" }}>{q.title}</h4>
                                    {q.comment && <p className="text-[10px] mt-0.5 truncate" style={{ color: dk ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }}>{q.comment}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center shrink-0 ml-3 gap-1">
                                  <button
                                    onClick={(e) => handleCopyCode(q.id, q.code, e)}
                                    className="p-1 rounded border hover:bg-white/5 transition-all"
                                    style={{ borderColor: dk ? "rgba(199,238,255,0.15)" : "rgba(0,0,0,0.1)", background: dk ? "rgba(199,238,255,0.05)" : "rgba(0,0,0,0.02)" }}
                                    title="Copy Code"
                                  >
                                    {copiedQId === q.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} style={{ color: dk ? P.sky : P.blue }} />}
                                  </button>
                                  <button
                                    onClick={(e) => handleOpenEdit(q, e)}
                                    className="p-1 rounded border hover:bg-white/5 transition-all mr-1"
                                    style={{ borderColor: dk ? "rgba(199,238,255,0.15)" : "rgba(0,0,0,0.1)", background: dk ? "rgba(199,238,255,0.05)" : "rgba(0,0,0,0.02)" }}
                                    title="Edit Code"
                                  >
                                    <Edit size={11} style={{ color: dk ? P.sky : P.blue }} />
                                  </button>
                                  <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border" style={{ color: dk ? `${P.sky}80` : `${P.black}60`, borderColor: dk ? "rgba(199,238,255,0.15)" : "rgba(0,0,0,0.1)", background: dk ? "rgba(199,238,255,0.05)" : "rgba(0,0,0,0.02)" }}>{q.language}</span>
                                </div>
                              </div>
                              <AnimatePresence>
                                {expandedQId === q.id && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
                                    <div className="rounded-xl overflow-hidden border relative" style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(0,0,0,0.1)" }}>
                                      <div className="absolute top-0 left-0 right-0 h-6 flex items-center px-3 border-b" style={{ background: dk ? "black" : "#f3f4f6", borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                                        <div className="flex gap-1.5">
                                          <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                                          <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                                        </div>
                                      </div>
                                      <pre className="text-[10px] font-mono p-3 pt-8 overflow-x-auto" style={{ background: dk ? "#0d1117" : "#ffffff", color: dk ? "#c9d1d9" : "#24292e" }}>
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
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* NEW SESSION MODAL */}
      <AnimatePresence>
        {showNewSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewSessionModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-[95%] sm:w-full max-w-md p-1 sm:p-1.5 rounded-[24px] sm:rounded-[32px] border bg-black border-white/10 shadow-2xl mx-auto z-10`}>
              <div className={`p-5 sm:p-6 rounded-[20px] sm:rounded-[28px] ${cardBg}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-sm font-black uppercase ${textPrimary}`}>Create Session</h3>
                  <button onClick={() => setShowNewSessionModal(false)} className={`p-1.5 rounded-lg border ${borderLight} hover:bg-white/5`}>
                    <X size={14} className={textPrimary} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1.5 ${textSecondary}`}>Exam Type</label>
                    <div className="flex gap-2">
                      <select value={newExamType} onChange={e => setNewExamType(e.target.value)} className={`flex-1 text-xs rounded-xl px-4 py-3 border focus:outline-none ${inputBg}`}>
                        {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1.5 ${textSecondary}`}>Session Date</label>
                    <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none ${inputBg}`} />
                  </div>
                  <div>
                    <label className={`block text-[9px] uppercase font-bold tracking-wider mb-1.5 ${textSecondary}`}>Optional Title</label>
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

      {/* ADD QUESTION MODAL (Bottom Sheet style on mobile, center modal on desktop) */}
      <AnimatePresence>
        {showAddQuestionModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddQuestionModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%", opacity: 0.5 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className={`relative w-full sm:max-w-xl p-1 rounded-t-[24px] sm:rounded-b-[24px] sm:rounded-t-[24px] border bg-black border-white/10 shadow-2xl z-10 max-h-[90vh] sm:max-h-[85vh] flex flex-col`}
            >
              <div className={`p-4 sm:p-6 rounded-t-[20px] sm:rounded-[20px] ${cardBg} flex-1 overflow-hidden flex flex-col`}>
                {/* Header */}
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${textPrimary}`}>
                    <Plus size={16} /> Add Code Question
                  </h3>
                  <button onClick={() => setShowAddQuestionModal(false)} className={`p-1.5 rounded-lg border ${borderLight} hover:bg-white/5`}>
                    <X size={14} className={textPrimary} />
                  </button>
                </div>

                {/* Form Body - Scrollable internally */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
                  {(() => {
                    const ruleForType = activeSession ? getRuleForType(activeSession.examType) : undefined;
                    const maxCap = getMaxCap(ruleForType);
                    const isCapped = maxCap !== null && activeSession && activeSession.questions.length >= maxCap;
                    if (isCapped) {
                      return (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center animate-pulse">
                          This session has reached its capacity limit of {maxCap} questions. You cannot add more codes.
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Question Title</label>
                      <input type="text" value={qTitle} onChange={e => setQTitle(e.target.value)} placeholder="e.g. Matrix Transpose"
                        className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`} />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Language</label>
                      <select value={qLang} onChange={e => setQLang(e.target.value)} className={`w-full text-xs rounded-xl px-3 py-2.5 border focus:outline-none ${inputBg}`}>
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
                      className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`} />
                  </div>
                  <div className="flex-1 flex flex-col min-h-[180px] sm:min-h-[220px]">
                    <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Source Code</label>
                    <textarea value={qCode} onChange={e => setQCode(e.target.value)} placeholder="Paste source code..."
                      className="w-full flex-1 text-xs font-mono rounded-xl p-3 border focus:outline-none resize-none min-h-[160px]"
                      style={{ background: "#151b22", borderColor: "rgba(199,238,255,0.1)", color: "#8ecfff" }} />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-4 pt-3 border-t shrink-0 flex justify-end gap-2" style={{ borderColor: borderLight }}>
                  <button onClick={() => setShowAddQuestionModal(false)} className={`px-4 py-2 rounded-xl text-xs font-bold border ${borderLight} hover:bg-white/5`}>
                    Cancel
                  </button>
                   <button 
                    onClick={handleAddQuestion} 
                    disabled={!!(() => {
                      const ruleForType = activeSession ? getRuleForType(activeSession.examType) : undefined;
                      const maxCap = getMaxCap(ruleForType);
                      return maxCap !== null && activeSession && activeSession.questions.length >= maxCap;
                    })()}
                    className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ${
                      (() => {
                        const ruleForType = activeSession ? getRuleForType(activeSession.examType) : undefined;
                        const maxCap = getMaxCap(ruleForType);
                        const isCapped = maxCap !== null && activeSession && activeSession.questions.length >= maxCap;
                        return isCapped ? 'opacity-50 cursor-not-allowed bg-neutral-600' : 'active:scale-[0.98]';
                      })()
                    }`}
                    style={{ background: (() => {
                      const ruleForType = activeSession ? getRuleForType(activeSession.examType) : undefined;
                      const maxCap = getMaxCap(ruleForType);
                      const isCapped = maxCap !== null && activeSession && activeSession.questions.length >= maxCap;
                      return isCapped ? undefined : P.blue;
                    })() }}
                  >
                    <Plus size={12} /> Add Question
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT QUESTION MODAL (Bottom Sheet style on mobile, center modal on desktop) */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: "100%", opacity: 0.5 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className={`relative w-full sm:max-w-xl p-1 rounded-t-[24px] sm:rounded-b-[24px] sm:rounded-t-[24px] border bg-black border-white/10 shadow-2xl z-10 max-h-[90vh] sm:max-h-[85vh] flex flex-col`}
            >
              <div className={`p-4 sm:p-6 rounded-t-[20px] sm:rounded-[20px] ${cardBg} flex-1 overflow-hidden flex flex-col`}>
                {/* Header */}
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${textPrimary}`}>
                    <Edit size={16} /> Edit Code Question
                  </h3>
                  <button onClick={() => setShowEditModal(false)} className={`p-1.5 rounded-lg border ${borderLight} hover:bg-white/5`}>
                    <X size={14} className={textPrimary} />
                  </button>
                </div>

                {/* Form Body - Scrollable internally */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Question Title</label>
                      <input type="text" value={editQTitle} onChange={e => setEditQTitle(e.target.value)} placeholder="e.g. Matrix Transpose"
                        className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`} />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Language</label>
                      <select value={editQLang} onChange={e => setEditQLang(e.target.value)} className={`w-full text-xs rounded-xl px-3 py-2.5 border focus:outline-none ${inputBg}`}>
                        <option value="cpp">C++ (cpp)</option>
                        <option value="c">C (c)</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="javascript">JavaScript</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Comment (Optional)</label>
                      <input type="text" value={editQComment} onChange={e => setEditQComment(e.target.value)} placeholder="e.g. Needs C++17 support..."
                        className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`} />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: P.error }}>Reason for Edit (Required)</label>
                      <input type="text" value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="e.g. fixed compilation error, passed 6/6"
                        className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-red-500/30 ${inputBg}`} />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col min-h-[180px] sm:min-h-[220px]">
                    <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Source Code</label>
                    <textarea value={editQCode} onChange={e => setEditQCode(e.target.value)} placeholder="Paste source code..."
                      className="w-full flex-1 text-xs font-mono rounded-xl p-3 border focus:outline-none resize-none min-h-[160px]"
                      style={{ background: "#151b22", borderColor: "rgba(199,238,255,0.1)", color: "#8ecfff" }} />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-4 pt-3 border-t shrink-0 flex justify-end gap-2" style={{ borderColor: borderLight }}>
                  <button onClick={() => setShowEditModal(false)} className={`px-4 py-2 rounded-xl text-xs font-bold border ${borderLight} hover:bg-white/5`}>
                    Cancel
                  </button>
                  <button onClick={handleSaveEdit} className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
                    style={{ background: P.blue }}>
                    <Check size={12} /> Save Edit
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

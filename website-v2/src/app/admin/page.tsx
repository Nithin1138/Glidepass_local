"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Save, RotateCcw, AlertCircle, CheckCircle, FileCode, MonitorSmartphone, Settings, Plus, Trash2,
  Calendar, Edit2, Check, X, ChevronRight, ChevronLeft, Terminal, Layout, Globe, Activity,
  ExternalLink, Sparkles, Filter, Code, Info, Users, BarChart3, Database, Lock,
  Unlock, User, ShieldCheck, Key, Eye, EyeOff, Search, Bell, Moon, Sun, Monitor, Menu, LogOut, CheckSquare,
  AlertTriangle, RefreshCw, Download, HardDrive, Cpu, Shield, BookOpen, UserCheck
} from "lucide-react";
import Link from "next/link";

// Client-safe VIT email metadata parser
function parseVitEmail(email: string) {
  const parts = email.split("@");
  if (parts.length !== 2) return { name: "unknown", regno: "unknown", college: "unknown" };
  const localPart = parts[0];
  const domain = parts[1].toLowerCase();

  const dotIndex = localPart.indexOf(".");
  let name = localPart;
  let regno = "unknown";
  if (dotIndex !== -1) {
    name = localPart.substring(0, dotIndex);
    regno = localPart.substring(dotIndex + 1);
  }
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  let college = "unknown";
  if (domain.includes("vitap")) {
    college = "vit-ap";
  } else if (domain.includes("vitbhopal")) {
    college = "vit-bhopal";
  } else if (domain.includes("vitchennai") || domain.includes("chennai")) {
    college = "vit-chennai";
  } else if (domain.includes("vitstudent") || domain.includes("vellore")) {
    college = "vit-vellore";
  } else {
    college = domain.split(".")[0];
  }

  return { name, regno, college };
}

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface Question {
  id: string;
  title: string;
  code: string;
  language: string;
  comment?: string;
  contributorEmail?: string;
  isDeleted?: boolean;
  isLocked?: boolean;
}

interface VitCode {
  id: string;
  date: string;
  examType: string;
  title?: string;
  questions: Question[];
  isDeleted?: boolean;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "suspended" | "pending";
  verified: boolean;
  activity: string;
}

interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  user: string;
  ip: string;
  status: "success" | "failed" | "warning";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function GlidePassAdmin() {
  // ─── Theme Engine ───
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("glidepass-admin-theme") as "light" | "dark" | "system" | null;
    if (saved) setTheme(saved);
  }, []);

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

  // ─── Auth ───
  const [isAuth, setIsAuth] = useState(false);
  const [userIn, setUserIn] = useState("");
  const [passIn, setPassIn] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginHistory, setLoginHistory] = useState<{ time: string; success: boolean }[]>([]);

  // Load stored password (for change-password feature)
  const [storedPassword, setStoredPassword] = useState("check");

  useEffect(() => {
    const logged = localStorage.getItem("glidepass-admin-logged");
    if (logged === "true") setIsAuth(true);
    const hist = localStorage.getItem("glidepass-login-history");
    if (hist) setLoginHistory(JSON.parse(hist));
    const sp = localStorage.getItem("glidepass-admin-pw");
    if (sp) setStoredPassword(sp);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = userIn.trim() === "Nithin" && passIn === storedPassword;
    const entry = { time: new Date().toLocaleString(), success: ok };
    const updated = [entry, ...loginHistory].slice(0, 10);
    setLoginHistory(updated);
    localStorage.setItem("glidepass-login-history", JSON.stringify(updated));
    if (ok) {
      setIsAuth(true);
      if (remember) localStorage.setItem("glidepass-admin-logged", "true");
      showToast("success", "Access granted. Welcome back, Nithin.");
    } else {
      setLoginAttempts(p => p + 1);
      showToast("error", "Invalid credentials. Access denied.");
    }
  };

  const handleLogout = () => {
    setIsAuth(false);
    localStorage.removeItem("glidepass-admin-logged");
    setUserIn("");
    setPassIn("");
    showToast("success", "Session terminated.");
  };

  // ─── Layout ───
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const [view, setView] = useState<
    "dashboard" | "users" | "rbac" | "analytics" | "vitcodes" | "ota" | "system" | "security" | "settings" | "profile" | "contributors"
  >("dashboard");
  const [workspace, setWorkspace] = useState<"production" | "staging">("production");

  // ─── Command Palette ───
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQ, setCmdQ] = useState("");
  const cmdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(p => !p);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    if (cmdOpen && cmdRef.current) cmdRef.current.focus();
  }, [cmdOpen]);

  // ─── Notifications ───
  const [notiOpen, setNotiOpen] = useState(false);
  const [notifications] = useState([
    { id: "1", title: "Deployment Live", desc: "OTA template center.html deployed on Edge CDN.", type: "success" as const, time: "5m ago" },
    { id: "2", title: "Suspicious Activity", desc: "Failed admin sign-in from IP 198.51.100.42.", type: "warning" as const, time: "1h ago" },
    { id: "3", title: "Rate-Limit Alert", desc: "Host sync exceeded 1,200 req/min threshold.", type: "info" as const, time: "3h ago" },
  ]);

  // ─── Toast ───
  const [toast, setToast] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast({ type: null, msg: "" }), 4000);
  };

  // ─── OTA ───
  const [selectedFile, setSelectedFile] = useState<"index.html" | "center.html">("center.html");
  const [otaContent, setOtaContent] = useState("");
  const [loadingOta, setLoadingOta] = useState(true);
  const [savingOta, setSavingOta] = useState(false);
  const [usingCustom, setUsingCustom] = useState(false);

  const fetchTemplate = async (f: "index.html" | "center.html") => {
    setLoadingOta(true);
    try {
      const res = await fetch(`/api/ota?file=${f}`);
      if (!res.ok) throw new Error(`Failed to fetch ${f}`);
      setOtaContent(await res.text());
      setUsingCustom(true);
    } catch (err: any) {
      showToast("error", err.messky);
    } finally {
      setLoadingOta(false);
    }
  };

  const handleSaveOta = async () => {
    setSavingOta(true);
    try {
      const res = await fetch("/api/ota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: selectedFile, content: otaContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      showToast("success", `Published ${selectedFile} successfully.`);
      setUsingCustom(true);
    } catch (err: any) {
      showToast("error", err.messky);
    } finally {
      setSavingOta(false);
    }
  };

  const handleResetOta = async () => {
    if (!confirm(`Reset ${selectedFile} to default?`)) return;
    setLoadingOta(true);
    try {
      const base = "https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/templates/";
      const res = await fetch(base + selectedFile);
      if (!res.ok) throw new Error("Failed to fetch default template");
      const def = await res.text();
      setOtaContent(def);
      const sr = await fetch("/api/ota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: selectedFile, content: def }),
      });
      if (!sr.ok) throw new Error("Failed to save reset");
      showToast("success", `Reset ${selectedFile} to default.`);
    } catch (err: any) {
      showToast("error", err.messky);
    } finally {
      setLoadingOta(false);
    }
  };

  // ─── VIT Codes ───
  const [vitSessions, setVitSessions] = useState<VitCode[]>([]);
  const [loadingVit, setLoadingVit] = useState(true);
  const [savingVit, setSavingVit] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [vitDetailView, setVitDetailView] = useState(false);
  const [examTypeFilter, setExamTypeFilter] = useState<string>("all");
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showManageTypes, setShowManageTypes] = useState(false);
  const [expandedQId, setExpandedQId] = useState<string | null>(null);

  // ─── VIT Bin States ───
  const [showBin, setShowBin] = useState(false);
  const [binTab, setBinTab] = useState<"sessions" | "questions">("sessions");
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<{ type: "session" | "question"; id: string; name: string } | null>(null);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [permanentDeleteConfirmText, setPermanentDeleteConfirmText] = useState("");
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);

  // ─── Delete Session (Two-Step) ───
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetSession, setDeleteTargetSession] = useState<VitCode | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingSession, setDeletingSession] = useState(false);

  // ─── Delete Exam Type (Two-Step) ───
  const [showDeleteTypeModal, setShowDeleteTypeModal] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<string | null>(null);
  const [deleteTypeConfirmText, setDeleteTypeConfirmText] = useState("");

  // New session form
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [newExamType, setNewExamType] = useState("NERD");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [examTypes, setExamTypes] = useState(["NERD", "Daily Assessment", "Mid Term Exam", "Final Term Exam", "Coding Challenge"]);
  const [newExamTypeName, setNewExamTypeName] = useState("");
  const [editingTypeIdx, setEditingTypeIdx] = useState<number | null>(null);
  const [editingTypeName, setEditingTypeName] = useState("");

  const [deletedExamTypes, _setDeletedExamTypes] = useState<string[]>([]);
  const deletedExamTypesRef = useRef<string[]>([]);
  const setDeletedExamTypes = (val: string[] | ((prev: string[]) => string[])) => {
    if (typeof val === 'function') {
      _setDeletedExamTypes(prev => {
        const next = val(prev);
        deletedExamTypesRef.current = next;
        return next;
      });
    } else {
      _setDeletedExamTypes(val);
      deletedExamTypesRef.current = val;
    }
  };

  useEffect(() => {
    const savedDeleted = localStorage.getItem("vit_deleted_exam_types");
    if (savedDeleted) {
      try {
        const parsed = JSON.parse(savedDeleted);
        _setDeletedExamTypes(parsed);
        deletedExamTypesRef.current = parsed;
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("vit_deleted_exam_types", JSON.stringify(deletedExamTypes));
  }, [deletedExamTypes]);

  const [examRules, setExamRules] = useState<Record<string, string>>({});
  const [sessionLimits, setSessionLimits] = useState<Record<string, number>>({});
  const [selectedRuleType, setSelectedRuleType] = useState("NERD");

  useEffect(() => {
    fetch("/api/vitcodes/rules")
      .then(r => r.json())
      .then(data => {
        if (data.rules) setExamRules(data.rules);
        if (data.sessionLimits) setSessionLimits(data.sessionLimits);
      })
      .catch(() => {});
  }, []);

  const handleUpdateRule = async (type: string, val: string) => {
    const updated = { ...examRules, [type]: val };
    setExamRules(updated);
    try {
      await fetch("/api/vitcodes/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: type, rule: val })
      });
    } catch (e) {}
  };

  const handleUpdateSessionLimit = async (type: string, val: number) => {
    const updated = { ...sessionLimits, [type]: val };
    setSessionLimits(updated);
    try {
      await fetch("/api/vitcodes/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: type, sessionLimit: val })
      });
    } catch (e) {}
  };

  useEffect(() => {
    if (examTypes.length > 0 && !examTypes.includes(selectedRuleType)) {
      setSelectedRuleType(examTypes[0]);
    }
  }, [examTypes, selectedRuleType]);

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

  // Question form
  const [qTitle, setQTitle] = useState("");
  const [qCode, setQCode] = useState("");
  const [qLang, setQLang] = useState("cpp");
  const [qComment, setQComment] = useState("");

  // ─── Contributors Management ───
  const [contributors, setContributors] = useState<{ email: string; status: string; name?: string; regno?: string; college?: string; }[]>([]);
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [selectedContributor, setSelectedContributor] = useState<string | null>(null);
  const [expandedContribQId, setExpandedContribQId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuth && view === "contributors") {
      setLoadingContributors(true);
      fetch("/api/admin/contributors")
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) setContributors(d);
        })
        .finally(() => setLoadingContributors(false));
    }
  }, [isAuth, view]);

  const toggleContributorStatus = async (email: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "blocked" : "active";
    setContributors(prev => prev.map(c => c.email === email ? { ...c, status: newStatus } : c));
    try {
      const res = await fetch("/api/admin/contributors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch (e) {
      showToast("error", "Failed to update status");
      // revert
      setContributors(prev => prev.map(c => c.email === email ? { ...c, status: currentStatus } : c));
    }
  };

  const fetchVitCodes = async (quiet = false) => {
    if (!quiet) setLoadingVit(true);
    try {
      const res = await fetch("/api/vitcodes?includeDeleted=true", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch VIT codes");
      const data = await res.json();
      setVitSessions(prev => {
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data;
      });
      if (data.length > 0 && !activeSessionId) setActiveSessionId(data[0].id);
      if (data && Array.from) {
        const types = data.map((s: any) => s.examType).filter(Boolean);
        const activeTypes = types.filter((t: string) => !deletedExamTypesRef.current.includes(t));
        setExamTypes(prev => Array.from(new Set([...prev, ...activeTypes])).filter(t => !deletedExamTypesRef.current.includes(t)));
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

  // We removed saveVitDB because it overrides everything. We now use granular endpoints.

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

  const handleAddSession = async () => {
    if (!newDate) return alert("Select a date");

    const sessionsToday = vitSessions.filter(
      s => s.date === newDate && s.examType.trim().toLowerCase() === newExamType.trim().toLowerCase()
    );
    const limitRule = getSessionLimitForType(newExamType);
    if (sessionsToday.length >= limitRule) {
      return showToast("error", `Failed to create session: The daily limit of ${limitRule} session(s) for ${newExamType} has been reached.`);
    }

    const s: VitCode = { id: Date.now().toString(), date: newDate, examType: newExamType, title: newSessionTitle.trim() || undefined, questions: [] };
    
    // Optimistic
    setVitSessions(prev => [s, ...prev]);
    setActiveSessionId(s.id);
    setNewSessionTitle("");
    setShowNewSessionModal(false);

  };

  const handleAddQuestion = async () => {
    if (!activeSessionId) return;
    if (!qTitle || !qCode) return showToast("error", "Title and Code required.");
    
    const newQ: Question = { id: "q_" + Date.now(), title: qTitle, code: qCode, language: qLang, comment: qComment };
    
    // Optimistic
    setVitSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, questions: [...s.questions, newQ] };
      }
      return s;
    }));
    setQTitle("");
    setQCode("");
    setQComment("");

    const currentSession = vitSessions.find(s => s.id === activeSessionId);

    try {
      const res = await fetch("/api/vitcodes/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId: activeSessionId, 
          question: newQ,
          session: currentSession ? { id: currentSession.id, date: currentSession.date, examType: currentSession.examType, title: currentSession.title } : undefined
        })
      });
      if (!res.ok) throw new Error("Failed to add question");
    } catch (e: any) {
      showToast("error", e.message);
      fetchVitCodes();
    }
  };

  const openDeleteModal = (session: VitCode) => {
    setDeleteTargetSession(session);
    setDeleteConfirmText("");
    setShowDeleteModal(true);
  };

  const handleDeleteSession = async () => {
    if (!deleteTargetSession) return;
    const expectedConfirm = (deleteTargetSession.title || deleteTargetSession.date).trim().toLowerCase();
    if (deleteConfirmText.trim().toLowerCase() !== expectedConfirm) return;
    const id = deleteTargetSession.id;
    setDeletingSession(true);

    // Optimistic removal
    setVitSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(next.length > 0 ? next[0].id : null);
        setVitDetailView(false);
      }
      return next;
    });
    setShowDeleteModal(false);
    setDeleteConfirmText("");
    setDeleteTargetSession(null);

    try {
      const res = await fetch(`/api/vitcodes/session?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      showToast("success", "Session deleted successfully.");
    } catch (e: any) {
      showToast("error", e.message);
      fetchVitCodes();
    } finally {
      setDeletingSession(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("Delete this question?")) return;
    
    // Optimistic
    setVitSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, questions: s.questions.filter(q => q.id !== qId) };
      }
      return s;
    }));

    try {
      const res = await fetch(`/api/vitcodes/question?id=${qId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete question");
    } catch (e: any) {
      showToast("error", e.message);
      fetchVitCodes();
    }
  };

  const handleToggleQuestionLock = async (qId: string, currentLockStatus: boolean) => {
    const newLockStatus = !currentLockStatus;
    
    // Optimistic
    setVitSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { 
          ...s, 
          questions: s.questions.map(q => q.id === qId ? { ...q, isLocked: newLockStatus } : q) 
        };
      }
      return s;
    }));

    try {
      const res = await fetch(`/api/vitcodes/question`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: qId, isLocked: newLockStatus })
      });
      if (!res.ok) throw new Error("Failed to toggle question lock");
      showToast("success", `Question ${newLockStatus ? 'locked' : 'unlocked'}.`);
    } catch (e: any) {
      showToast("error", e.message);
      fetchVitCodes();
    }
  };

  const handleRestoreItem = async (type: "session" | "question", id: string) => {
    // Optimistic restoration
    setVitSessions(prev => prev.map(s => {
      if (type === "session" && s.id === id) {
        return {
          ...s,
          isDeleted: false,
          questions: (s.questions || []).map(q => ({ ...q, isDeleted: false }))
        };
      }
      if (type === "question") {
        const hasQ = (s.questions || []).some(q => q.id === id);
        if (hasQ) {
          return {
            ...s,
            isDeleted: false, // restore parent session if it was deleted
            questions: (s.questions || []).map(q => q.id === id ? { ...q, isDeleted: false } : q)
          };
        }
      }
      return s;
    }));

    try {
      const res = await fetch("/api/vitcodes/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id })
      });
      if (!res.ok) throw new Error("Failed to restore");
      showToast("success", `${type === "session" ? "Session" : "Question"} restored successfully.`);
      fetchVitCodes();
    } catch (e: any) {
      showToast("error", e.message);
      fetchVitCodes();
    }
  };

  const openPermanentDeleteModal = (type: "session" | "question", id: string, name: string) => {
    setPermanentDeleteTarget({ type, id, name });
    setPermanentDeleteConfirmText("");
    setShowPermanentDeleteModal(true);
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    const { type, id, name } = permanentDeleteTarget;
    if (permanentDeleteConfirmText.trim().toLowerCase() !== name.trim().toLowerCase()) {
      return showToast("error", "Confirmation text mismatch.");
    }

    setIsPermanentlyDeleting(true);

    // Optimistic delete
    setVitSessions(prev => {
      if (type === "session") {
        return prev.filter(s => s.id !== id);
      }
      return prev.map(s => ({
        ...s,
        questions: (s.questions || []).filter(q => q.id !== id)
      }));
    });

    setShowPermanentDeleteModal(false);
    setPermanentDeleteConfirmText("");
    setPermanentDeleteTarget(null);

    try {
      const endpoint = type === "session" ? `/api/vitcodes/session?id=${id}&permanent=true` : `/api/vitcodes/question?id=${id}&permanent=true`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to permanently delete");
      showToast("success", `${type === "session" ? "Session" : "Question"} deleted permanently.`);
      fetchVitCodes();
    } catch (e: any) {
      showToast("error", e.message);
      fetchVitCodes();
    } finally {
      setIsPermanentlyDeleting(false);
    }
  };

  const activeSession = useMemo(() => {
    const s = vitSessions.find(s => s.id === activeSessionId);
    if (!s) return undefined;
    return {
      ...s,
      questions: (s.questions || []).filter(q => !q.isDeleted)
    };
  }, [vitSessions, activeSessionId]);
  const totalQ = useMemo(() => vitSessions.filter(s => !s.isDeleted).reduce((a, s) => a + (s.questions?.filter(q => !q.isDeleted).length || 0), 0), [vitSessions]);

  const contributorCodes = useMemo(() => {
    return vitSessions.filter(s => !s.isDeleted).flatMap(s => (s.questions || []).filter(q => !q.isDeleted).map(q => ({ ...q, sessionDate: s.date, sessionType: s.examType })));
  }, [vitSessions]);

  const filteredSessions = useMemo(() => {
    const active = vitSessions.filter(s => !s.isDeleted);
    if (examTypeFilter === "all") return active;
    return active.filter(s => s.examType === examTypeFilter);
  }, [vitSessions, examTypeFilter]);

  const groupedSessions = useMemo(() => {
    const groups: Record<string, VitCode[]> = {};
    filteredSessions.forEach(s => {
      if (!groups[s.examType]) groups[s.examType] = [];
      groups[s.examType].push(s);
    });
    return groups;
  }, [filteredSessions]);

  const binnedSessions = useMemo(() => {
    return vitSessions.filter(s => s.isDeleted);
  }, [vitSessions]);

  const binnedQuestions = useMemo(() => {
    const list: { question: Question; session: VitCode }[] = [];
    vitSessions.forEach(s => {
      if (!s.isDeleted && s.questions) {
        s.questions.forEach(q => {
          if (q.isDeleted) {
            list.push({ question: q, session: s });
          }
        });
      }
    });
    return list;
  }, [vitSessions]);

  const binnedSessionsCount = binnedSessions.length;
  const binnedQuestionsCount = binnedQuestions.length;

  // ─── Data Fetching & Real-time Polling ───
  useEffect(() => {
    if (isAuth) {
      if (view === "ota") fetchTemplate(selectedFile);
      if (view === "vitcodes" || view === "dashboard" || view === "contributors") {
        fetchVitCodes();
        // Start polling for real-time sync (every 1 second, quiet mode)
        const interval = setInterval(() => {
          fetchVitCodes(true);
        }, 1000);
        return () => clearInterval(interval);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedFile, isAuth]);

  // ─── Users ───
  const [users, setUsers] = useState<UserRecord[]>([
    { id: "1", name: "Nithin Kumar", email: "nithin@glidepass.app", role: "Super Admin", status: "active", verified: true, activity: "Active 2m ago" },
    { id: "2", name: "Sarah Connor", email: "sarah@resist.org", role: "Developer", status: "active", verified: true, activity: "Active 4h ago" },
    { id: "3", name: "Alex Mercer", email: "mercer@gentek.com", role: "Auditor", status: "suspended", verified: false, activity: "Banned 2d ago" },
    { id: "4", name: "David Lightman", email: "wopr@falken.mil", role: "Contributor", status: "pending", verified: false, activity: "Registered 1h ago" },
  ]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const ms = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
      const mr = userRoleFilter === "all" || u.role === userRoleFilter;
      return ms && mr;
    });
  }, [users, userSearch, userRoleFilter]);

  const toggleVerify = (id: string) => { setUsers(p => p.map(u => u.id === id ? { ...u, verified: !u.verified } : u)); showToast("success", "Verification toggled."); };
  const toggleBan = (id: string) => { setUsers(p => p.map(u => u.id === id ? { ...u, status: u.status === "suspended" ? "active" : "suspended" } : u)); showToast("success", "User status updated."); };

  const exportCSV = () => {
    const hdr = ["ID", "Name", "Email", "Role", "Status", "Verified"];
    const rows = users.map(u => [u.id, u.name, u.email, u.role, u.status, u.verified]);
    const csv = "data:text/csv;charset=utf-8," + [hdr.join(","), ...rows.map(r => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = "glidepass_users.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("success", "CSV exported.");
  };

  // ─── RBAC ───
  const [rbac, setRbac] = useState<Record<string, Record<string, boolean>>>({
    "Super Admin": { users: true, rbac: true, analytics: true, content: true, system: true, security: true, settings: true },
    Developer: { users: false, rbac: false, analytics: true, content: true, system: true, security: false, settings: false },
    Auditor: { users: true, rbac: false, analytics: true, content: false, system: false, security: true, settings: false },
    Contributor: { users: false, rbac: false, analytics: false, content: true, system: false, security: false, settings: false },
  });

  const toggleRbac = (role: string, mod: string) => {
    setRbac(p => ({ ...p, [role]: { ...p[role], [mod]: !p[role][mod] } }));
    showToast("success", "Permission updated.");
  };

  // ─── Security Logs ───
  const [secLogs] = useState<SecurityLog[]>([
    { id: "101", timestamp: "23:02:15", event: "Admin Session Terminated", user: "Nithin", ip: "192.168.1.15", status: "success" },
    { id: "102", timestamp: "22:58:40", event: "Failed Auth Attempt", user: "Unknown", ip: "198.51.100.42", status: "failed" },
    { id: "103", timestamp: "22:45:12", event: "VIT Database Modified", user: "Nithin", ip: "10.251.103.162", status: "warning" },
    { id: "104", timestamp: "22:30:05", event: "SSL Handshake Verified", user: "System", ip: "127.0.0.1", status: "success" },
  ]);

  // ─── Profile ───
  const [adminName, setAdminName] = useState("Nithin");
  const [adminAvatar, setAdminAvatar] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const handleUpdateProfile = (e: React.FormEvent) => { e.preventDefault(); showToast("success", "Profile updated."); };

  const handleChangePw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!curPw || !newPw || !confirmPw) return showToast("error", "Fill all fields.");
    if (curPw !== storedPassword) return showToast("error", "Current password incorrect.");
    if (newPw !== confirmPw) return showToast("error", "Passwords don't match.");
    setStoredPassword(newPw);
    localStorage.setItem("glidepass-admin-pw", newPw);
    showToast("success", "Password updated.");
    setCurPw(""); setNewPw(""); setConfirmPw("");
  };

  const pwStrength = useMemo(() => {
    if (!newPw) return 0;
    let s = 0;
    if (newPw.length >= 6) s++;
    if (/[A-Z]/.test(newPw)) s++;
    if (/[0-9]/.test(newPw)) s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  }, [newPw]);

  // ─── Command Palette Actions ───
  const cmdActions = useMemo(() => {
    const list = [
      { name: "Go to Dashboard", action: () => { setView("dashboard"); setCmdOpen(false); } },
      { name: "Go to User Directory", action: () => { setView("users"); setCmdOpen(false); } },
      { name: "Go to Roles & Policies", action: () => { setView("rbac"); setCmdOpen(false); } },
      { name: "Go to Analytics", action: () => { setView("analytics"); setCmdOpen(false); } },
      { name: "Go to VIT-AP Codes", action: () => { setView("vitcodes"); setCmdOpen(false); } },
      { name: "Go to OTA Templates", action: () => { setView("ota"); setCmdOpen(false); } },
      { name: "Go to Diagnostics", action: () => { setView("system"); setCmdOpen(false); } },
      { name: "Go to Audit Trail", action: () => { setView("security"); setCmdOpen(false); } },
      { name: "Go to Settings", action: () => { setView("settings"); setCmdOpen(false); } },
      { name: "Theme: Light", action: () => { setTheme("light"); setCmdOpen(false); } },
      { name: "Theme: Dark", action: () => { setTheme("dark"); setCmdOpen(false); } },
      { name: "Sign Out", action: () => { handleLogout(); setCmdOpen(false); } },
    ];
    return list.filter(i => i.name.toLowerCase().includes(cmdQ.toLowerCase()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmdQ]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STYLE HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const bg = dk ? `bg-[#050505]` : `bg-[#F0F4F8]`; // slightly off-white bg makes glass pop more in light mode
  const cardBg = dk 
    ? "bg-gradient-to-br from-white/[0.08] to-white/[0.01] backdrop-blur-[40px] shadow-2xl shadow-black/80" 
    : "bg-gradient-to-br from-white/90 to-white/40 backdrop-blur-[40px] shadow-xl shadow-[#0077C0]/5";
  const cardBorder = dk 
    ? "border-t border-l border-white/[0.12] border-b-white/[0.02] border-r-white/[0.02]" 
    : "border border-white border-b-[#050505]/5 border-r-[#050505]/5";
  const panelBg = dk 
    ? "bg-[#050505]/50 backdrop-blur-[60px]" 
    : "bg-white/60 backdrop-blur-[60px]";
  const txt1 = dk ? `text-[#FAFAFA]` : `text-[#050505]`;
  const txt2 = dk ? `text-[#C7EEFF]` : "text-[#0077C0]";
  const txt3 = dk ? "text-white/50" : "text-[#050505]/40";
  const inputBg = dk 
    ? "bg-black/40 border-t border-l border-white/10 border-b-transparent border-r-transparent shadow-inner text-[#FAFAFA] placeholder-white/30 focus:bg-white/[0.05]" 
    : "bg-white/60 border-t border-l border-white border-b-[#050505]/10 border-r-[#050505]/10 shadow-sm text-[#050505] placeholder-[#050505]/30 focus:bg-white";
  const accentBtn = `bg-[#0077C0] hover:bg-[#005f99] text-white shadow-lg shadow-[#0077C0]/30 border-t border-white/20`;
  const gradientLine = "bg-gradient-to-r from-[#0077C0] via-[#C7EEFF] to-transparent";

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div
      className="min-h-screen relative font-sans antialiased overflow-x-hidden transition-colors duration-500"
      style={{ background: dk ? P.black : P.white, color: dk ? P.white : P.black }}
    >
      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="absolute top-[5%] left-[10%] w-[600px] h-[600px] rounded-full animate-pulse"
          style={{ background: dk ? "rgba(0,119,192,0.06)" : "rgba(0,119,192,0.08)", filter: "blur(150px)" }}
        />
        <div
          className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full"
          style={{ background: dk ? "rgba(199,238,255,0.04)" : "rgba(199,238,255,0.1)", filter: "blur(140px)" }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!isAuth ? (
          /* ═══════════════════ LOGIN GATE ═══════════════════ */
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center p-6"
          >
            <div
              className="w-full max-w-[440px] rounded-[36px] border backdrop-blur-3xl shadow-2xl p-6 sm:p-10 relative overflow-hidden mx-4 sm:mx-0"
              style={{
                background: dk ? "rgba(5,5,5,0.60)" : "rgba(255,255,255,0.70)",
                borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)",
              }}
            >
              {/* Top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shadow-lg relative" style={{ background: P.blue }}>
                  <Lock className="text-white" size={24} />
                  {loginAttempts > 2 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center animate-bounce" style={{ background: P.error }}>
                      {loginAttempts}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-xl font-bold font-[family-name:var(--font-outfit)] tracking-wider">GLIDEPASS ADMIN</h1>
                  <p className={txt3} style={{ fontSize: 12 }}>Administrative credentials required</p>
                </div>

                <form onSubmit={handleLogin} className="w-full space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest" style={{ color: dk ? P.sky : P.blue }}>Username</label>
                    <div className="relative">
                      <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }} />
                      <input
                        type="text" value={userIn} onChange={e => setUserIn(e.target.value)} placeholder="Nithin" required
                        className={`w-full text-xs rounded-xl pl-10 pr-4 py-3.5 border focus:outline-none focus:ring-2 focus:ring-[#0077C0]/30 transition-all ${inputBg}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest" style={{ color: dk ? P.sky : P.blue }}>Access Key</label>
                    <div className="relative">
                      <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }} />
                      <input
                        type={showPass ? "text" : "password"} value={passIn} onChange={e => setPassIn(e.target.value)} placeholder="••••" required
                        className={`w-full text-xs rounded-xl pl-10 pr-11 py-3.5 border focus:outline-none focus:ring-2 focus:ring-[#0077C0]/30 transition-all ${inputBg}`}
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded w-3.5 h-3.5" style={{ accentColor: P.blue }} />
                    <span className="text-[11px]" style={{ color: dk ? `${P.sky}90` : `${P.black}80` }}>Remember session</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
                    style={{ background: P.blue }}
                  >
                    <Unlock size={14} /> Authenticate
                  </button>
                </form>

                {loginHistory.length > 0 && (
                  <div className="w-full pt-4 text-left" style={{ borderTop: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.06)"}` }}>
                    <span className="text-[9px] uppercase font-bold block mb-2" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Recent Attempts</span>
                    <div className="space-y-1 max-h-[70px] overflow-y-auto pr-1 text-[10px]">
                      {loginHistory.slice(0, 3).map((h, i) => (
                        <div key={i} className="flex justify-between" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                          <span className="font-mono">{h.time}</span>
                          <span style={{ color: h.success ? P.blue : P.error }}>{h.success ? "Success" : "Failed"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ═══════════════════ MAIN ADMIN LAYOUT ═══════════════════ */
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-screen relative">

            {/* ─── Mobile Sidebar Overlay ─── */}
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
            </AnimatePresence>

            {/* ─── Sidebar ─── */}
            <aside
              className={`border-r shrink-0 flex flex-col justify-between transition-all duration-300 backdrop-blur-3xl fixed md:sticky top-0 h-screen z-40 md:z-30 ${
                sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 w-64 md:w-20"
              }`}
              style={{
                background: dk ? "rgba(5,5,5,0.85)" : "rgba(255,255,255,0.85)",
                borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)",
              }}
            >
              <div className="flex flex-col">
                {/* Logo */}
                <div className="h-20 px-6 flex items-center justify-between" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.05)"}` }}>
                  {sidebarOpen ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: P.blue }}>
                        <Terminal size={14} className="text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-[family-name:var(--font-outfit)] font-black text-xs tracking-wider">GLIDEPASS</span>
                        <span className="text-[8px] uppercase tracking-wider font-extrabold" style={{ color: P.blue }}>Control v1.0</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto" style={{ background: P.blue }}>
                      <Terminal size={14} className="text-white" />
                    </div>
                  )}
                  {sidebarOpen && (
                    <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg transition-colors hover:opacity-70" style={{ color: dk ? P.sky : P.black }}>
                      <ChevronLeft size={16} />
                    </button>
                  )}
                </div>

                {/* Search */}
                {sidebarOpen && (
                  <div className="px-6 py-4">
                    <button onClick={() => setCmdOpen(true)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-colors`}
                      style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", color: dk ? `${P.sky}80` : `${P.black}60` }}>
                      <span className="flex items-center gap-2"><Search size={12} /> Search...</span>
                      <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.06)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.06)" }}>⌘K</kbd>
                    </button>
                  </div>
                )}

                {/* Nav */}
                <nav className="px-4 py-6 space-y-6">
                  {[
                    { label: "Overview", items: [{ key: "dashboard", icon: Layout, name: "Dashboard" }, { key: "analytics", icon: BarChart3, name: "Analytics" }] },
                    { label: "Management", items: [{ key: "users", icon: Users, name: "Users" }, { key: "rbac", icon: ShieldCheck, name: "Roles & Policies" }, { key: "vitcodes", icon: Code, name: "VIT-AP Codes" }, { key: "contributors", icon: UserCheck, name: "Contributors" }] },
                    { label: "Operations", items: [{ key: "ota", icon: MonitorSmartphone, name: "OTA Templates" }, { key: "system", icon: Cpu, name: "Diagnostics" }, { key: "security", icon: Shield, name: "Audit Trail" }] },
                  ].map(group => (
                    <div key={group.label} className="space-y-1">
                      {sidebarOpen && <span className="text-[9px] uppercase font-bold px-3 block mb-2" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{group.label}</span>}
                      {group.items.map(item => {
                        const active = view === item.key;
                        return (
                          <button key={item.key} onClick={() => { setView(item.key as any); setVitDetailView(false); setShowBin(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${active ? "text-white shadow-lg" : "hover:opacity-80"}`}
                            style={{
                              background: active ? P.blue : "transparent",
                              color: active ? "white" : dk ? `${P.sky}CC` : `${P.black}AA`,
                              boxShadow: active ? `0 8px 16px rgba(0,119,192,0.2)` : "none",
                            }}>
                            <item.icon size={14} />
                            {sidebarOpen && <span>{item.name}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </div>

              {/* Profile footer */}
              <div className="p-4 space-y-2" style={{ borderTop: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.05)"}` }}>
                <button onClick={() => { setView("profile"); setShowBin(false); }} className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:opacity-80 transition-colors">
                  <img src={adminAvatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border shadow-md shrink-0" style={{ borderColor: dk ? "rgba(199,238,255,0.15)" : "rgba(5,5,5,0.1)" }} />
                  {sidebarOpen && (
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate">{adminName}</span>
                      <span className="text-[9px] truncate" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Administrator</span>
                    </div>
                  )}
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold transition-all hover:opacity-80" style={{ color: P.blue }}>
                  <LogOut size={14} />
                  {sidebarOpen && <span>Sign Out</span>}
                </button>
              </div>
            </aside>

            {/* ─── Main Content ─── */}
            <div className="flex-1 flex flex-col min-w-0 max-w-full">
              {/* Top Header */}
              <header
                className="h-20 border-b flex items-center justify-between px-4 md:px-8 backdrop-blur-3xl sticky top-0 z-20"
                style={{
                  background: dk ? "rgba(5,5,5,0.80)" : "rgba(255,255,255,0.80)",
                  borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.05)",
                }}
              >
                <div className="flex items-center gap-2 md:gap-4">
                  {(!sidebarOpen || (typeof window !== 'undefined' && window.innerWidth < 768)) && (
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:opacity-70 transition-colors md:hidden block" style={{ color: dk ? P.sky : P.black }}>
                      <Menu size={16} />
                    </button>
                  )}
                  {(!sidebarOpen) && (
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:opacity-70 transition-colors hidden md:block" style={{ color: dk ? P.sky : P.black }}>
                      <Menu size={16} />
                    </button>
                  )}
                  <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-mono">
                    <span style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>admin</span>
                    <ChevronRight size={10} style={{ color: dk ? `${P.sky}40` : `${P.black}30` }} />
                    <span className="font-bold uppercase" style={{ color: P.blue }}>{view}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                  <select value={workspace} onChange={e => setWorkspace(e.target.value as any)}
                    className={`text-[9px] md:text-[10px] uppercase font-bold tracking-widest px-2 md:px-3 py-2 rounded-xl border focus:outline-none ${inputBg}`}>
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                  </select>

                  <button onClick={() => setNotiOpen(!notiOpen)} className="p-2.5 rounded-xl hover:opacity-70 relative transition-colors" style={{ color: dk ? P.sky : P.black }}>
                    <Bell size={15} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: P.blue }} />
                  </button>

                  <div className="flex border p-0.5 rounded-xl" style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)" }}>
                    {([["light", Sun], ["dark", Moon], ["system", Monitor]] as const).map(([t, Icon]) => (
                      <button key={t} onClick={() => setTheme(t)} title={t}
                        className={`p-1.5 rounded-lg transition-colors`}
                        style={{
                          background: theme === t ? (dk ? "rgba(199,238,255,0.1)" : "white") : "transparent",
                          color: theme === t ? (dk ? P.white : P.black) : (dk ? `${P.sky}60` : `${P.black}40`),
                        }}>
                        <Icon size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              </header>

              {/* Content Area */}
              <div className="flex-1 p-8 max-w-[1600px] w-full mx-auto space-y-8">
                <AnimatePresence mode="wait">

                  {/* ═══ DASHBOARD ═══ */}
                  {view === "dashboard" && (
                    <motion.div key="dash" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-8">
                      <div>
                        <h2 className="text-2xl font-black font-[family-name:var(--font-outfit)] tracking-wide">Executive Overview</h2>
                        <p className="text-xs mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>System health, sync metrics, and real-time activity</p>
                      </div>

                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                          { title: "Host Sync", val: "99.8%", label: "Active connections", live: true },
                          { title: "Total Questions", val: String(totalQ), label: "VIT exam items cached", live: false },
                          { title: "Avg Latency", val: "38ms", label: "Outbound WebSockets", live: true },
                          { title: "Sessions", val: String(vitSessions.length), label: "Active instances", live: false },
                        ].map((c, i) => (
                          <div key={i} className="p-6 rounded-[24px] border relative overflow-hidden transition-all"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{c.title}</span>
                              {c.live && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: P.blue }} />}
                            </div>
                            <h3 className="text-3xl font-[family-name:var(--font-outfit)] font-black">{c.val}</h3>
                            <span className="text-[10px] mt-1.5 block" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{c.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Chart + Events */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 p-6 rounded-[28px] border relative overflow-hidden min-h-[350px]"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-center pb-4 mb-6" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                            <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>User Engagement</h3>
                            <div className="flex items-center gap-1.5 text-[10px] p-1 rounded-xl border font-mono" style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.05)" }}>
                              <span className="px-2.5 py-1.5 font-bold rounded-lg" style={{ background: `${P.blue}15`, color: P.blue }}>Daily</span>
                              <span className="px-2.5 py-1.5 cursor-pointer" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Weekly</span>
                              <span className="px-2.5 py-1.5 cursor-pointer" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Monthly</span>
                            </div>
                          </div>
                          <div className="w-full h-44 relative">
                            <svg className="w-full h-full" viewBox="0 0 500 150">
                              <defs>
                                <linearGradient id="gl" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor={P.blue} />
                                  <stop offset="50%" stopColor={P.sky} />
                                  <stop offset="100%" stopColor={P.blue} />
                                </linearGradient>
                                <linearGradient id="gf" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor={P.blue} stopOpacity="0.2" />
                                  <stop offset="100%" stopColor={P.blue} stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              <line x1="0" y1="30" x2="500" y2="30" stroke={dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.04)"} strokeWidth="1" />
                              <line x1="0" y1="75" x2="500" y2="75" stroke={dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.04)"} strokeWidth="1" />
                              <line x1="0" y1="120" x2="500" y2="120" stroke={dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.04)"} strokeWidth="1" />
                              <path d="M0 130 Q 80 120, 150 60 T 300 90 T 450 40 T 500 20 L 500 150 L 0 150 Z" fill="url(#gf)" />
                              <path d="M0 130 Q 80 120, 150 60 T 300 90 T 450 40 T 500 20" fill="none" stroke="url(#gl)" strokeWidth="3.5" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-mono mt-4 pt-3" style={{ color: dk ? `${P.sky}60` : `${P.black}40`, borderTop: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                            <span>00:00</span><span>12:00 (Peak)</span><span>23:59</span>
                          </div>
                        </div>

                        <div className="lg:col-span-4 p-6 rounded-[28px] border relative overflow-hidden min-h-[350px] flex flex-col"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-center pb-4 mb-4" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                            <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>System Events</h3>
                            <button onClick={() => fetchVitCodes()} className="p-1 rounded-lg hover:opacity-70 transition-colors" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>
                              <RefreshCw size={12} />
                            </button>
                          </div>
                          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                            {secLogs.slice(0, 4).map(log => (
                              <div key={log.id} className="flex justify-between items-start gap-4 text-xs">
                                <div className="space-y-0.5">
                                  <span className="font-bold block leading-tight">{log.event}</span>
                                  <span className="text-[10px] font-mono block" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{log.timestamp} • {log.ip}</span>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 font-bold rounded-lg font-mono tracking-wider uppercase shrink-0 border"
                                  style={{
                                    background: log.status === "success" ? `${P.blue}15` : log.status === "failed" ? `${P.error}15` : `${P.sky}20`,
                                    color: log.status === "success" ? P.blue : log.status === "failed" ? P.error : dk ? P.sky : P.black,
                                    borderColor: log.status === "success" ? `${P.blue}30` : log.status === "failed" ? `${P.error}30` : `${P.sky}30`,
                                  }}>{log.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ USERS ═══ */}
                  {view === "users" && (
                    <motion.div key="users" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase">User Directory</h2>
                          <p className="text-xs" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Manage roles, verify, and moderate accounts</p>
                        </div>
                        <button onClick={exportCSV} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all" style={{ background: P.blue }}>
                          <Download size={13} /> Export CSV
                        </button>
                      </div>

                      <div className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="relative w-full md:w-80">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }} />
                          <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search name or email..."
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`} />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] uppercase font-bold" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Role:</span>
                          <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${inputBg}`}>
                            <option value="all">All</option>
                            <option value="Super Admin">Super Admin</option>
                            <option value="Developer">Developer</option>
                            <option value="Auditor">Auditor</option>
                            <option value="Contributor">Contributor</option>
                          </select>
                        </div>
                      </div>

                      <div className="rounded-2xl border overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                              {["Verified", "Name", "Email", "Role", "Activity", "Actions"].map(h => (
                                <th key={h} className={`p-4 text-[10px] uppercase font-extrabold tracking-widest ${h === "Actions" ? "text-right pr-6" : h === "Verified" ? "pl-6" : ""}`}
                                  style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map(u => (
                              <tr key={u.id} className="text-xs hover:opacity-90 transition-colors" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                <td className="p-4 pl-6">
                                  <button onClick={() => toggleVerify(u.id)} className="p-1.5 rounded-lg border"
                                    style={{ background: u.verified ? `${P.blue}15` : "transparent", borderColor: u.verified ? `${P.blue}30` : dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: u.verified ? P.blue : dk ? `${P.sky}40` : `${P.black}30` }}>
                                    <CheckSquare size={13} />
                                  </button>
                                </td>
                                <td className="p-4 font-bold">{u.name}</td>
                                <td className="p-4" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{u.email}</td>
                                <td className="p-4">
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-md font-mono border" style={{ background: `${P.sky}15`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>{u.role}</span>
                                </td>
                                <td className="p-4 font-mono text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{u.activity}</td>
                                <td className="p-4 pr-6 text-right">
                                  <button onClick={() => toggleBan(u.id)} className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all border"
                                    style={{ background: u.status === "suspended" ? `${P.error}15` : "transparent", borderColor: u.status === "suspended" ? `${P.error}25` : dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", color: u.status === "suspended" ? P.error : dk ? `${P.sky}80` : `${P.black}60` }}>
                                    {u.status === "suspended" ? "Unsuspend" : "Suspend"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ RBAC ═══ */}
                  {view === "rbac" && (
                    <motion.div key="rbac" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div>
                        <h2 className="text-xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase">Roles & Policy Matrix</h2>
                        <p className="text-xs" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Configure role-based access controls across system modules</p>
                      </div>
                      <div className="rounded-2xl border overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                              <th className="p-5 pl-6 text-[10px] uppercase font-extrabold tracking-widest" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Role</th>
                              {["users", "rbac", "analytics", "content", "system", "security", "settings"].map(m => (
                                <th key={m} className="p-5 text-center text-[10px] uppercase font-extrabold tracking-widest" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{m}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(rbac).map(([role, perms]) => (
                              <tr key={role} className="text-xs" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                <td className="p-5 pl-6 font-bold">{role}</td>
                                {Object.entries(perms).map(([mod, has]) => (
                                  <td key={mod} className="p-5 text-center">
                                    <button onClick={() => toggleRbac(role, mod)} className="w-6 h-6 rounded-lg flex items-center justify-center border mx-auto transition-all"
                                      style={{ background: has ? `${P.blue}15` : `${P.error}10`, borderColor: has ? `${P.blue}30` : `${P.error}20`, color: has ? P.blue : P.error }}>
                                      {has ? <CheckSquare size={13} /> : <AlertTriangle size={13} />}
                                    </button>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ ANALYTICS ═══ */}
                  {view === "analytics" && (
                    <motion.div key="analytics" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-6 rounded-[28px] border relative overflow-hidden"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-6" style={{ color: P.blue }}>User Acquisition Funnel</h3>
                        <div className="space-y-4">
                          {[
                            { step: "Discovery Scan", val: "100%", w: "100%" },
                            { step: "Active WebSockets", val: "84%", w: "84%" },
                            { step: "Intelligent Injection", val: "62%", w: "62%" },
                            { step: "Local Cache Session", val: "48%", w: "48%" },
                          ].map((s, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span>{s.step}</span>
                                <span className="font-mono" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{s.val}</span>
                              </div>
                              <div className="h-4 rounded-xl overflow-hidden border" style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                                <div className="h-full rounded-xl transition-all" style={{ width: s.w, background: `linear-gradient(90deg, ${P.blue}, ${P.sky})` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-6 rounded-[28px] border relative overflow-hidden"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-6" style={{ color: P.blue }}>Device Retention Cohorts</h3>
                        <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-mono">
                          <div className="font-sans font-bold text-left pl-2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Cohort</div>
                          <div>Day 1</div><div>Day 3</div><div>Day 7</div><div>Day 30</div>
                          {["June 01", "June 03", "June 07"].map((c, i) => (
                            <React.Fragment key={i}>
                              <div className="text-left font-sans font-semibold pl-2 py-2" style={{ borderTop: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>{c}</div>
                              {[92, 78, 64, 45].map((v, j) => (
                                <div key={j} className="rounded border py-2" style={{ background: `${P.blue}${Math.max(10, 25 - j * 5).toString(16)}`, color: P.blue, borderColor: `${P.blue}15` }}>{v}%</div>
                              ))}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ VIT-AP CODES — MASTER-DETAIL ═══ */}
                  {view === "vitcodes" && (
                    <motion.div key="vit" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <AnimatePresence mode="wait">
                        {showBin ? (
                          <motion.div key="vit-bin" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="space-y-6">
                            {/* Bin Header */}
                            <div className="flex justify-between items-center">
                              <div>
                                <button onClick={() => setShowBin(false)} className="flex items-center gap-1.5 text-xs font-bold hover:opacity-70 transition-colors mb-2" style={{ color: P.blue }}>
                                  <ArrowLeft size={14} /> Back to Sessions
                                </button>
                                <h2 className="text-xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase text-red-400">VIT AP TRASH BIN</h2>
                                <p className="text-xs" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Restore or permanently delete sessions and questions</p>
                              </div>
                            </div>

                            {/* Bin Tabs */}
                            <div className="flex gap-2 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                              <button
                                onClick={() => setBinTab("sessions")}
                                className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 ${binTab === "sessions" ? "border-red-500 text-red-400" : "border-transparent opacity-60"}`}
                              >
                                Binned Sessions ({binnedSessionsCount})
                              </button>
                              <button
                                onClick={() => setBinTab("questions")}
                                className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 ${binTab === "questions" ? "border-red-500 text-red-400" : "border-transparent opacity-60"}`}
                              >
                                Binned Questions ({binnedQuestionsCount})
                              </button>
                            </div>

                            {/* Bin Content */}
                            {binTab === "sessions" ? (
                              binnedSessions.length === 0 ? (
                                <div className="py-20 text-center rounded-[28px] border border-dashed" style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: dk ? `${P.sky}60` : `${P.black}40` }}>
                                  <Trash2 size={32} className="mx-auto mb-3 opacity-30 text-red-400" />
                                  <p className="text-xs">No sessions in trash bin.</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {binnedSessions.map(s => {
                                    const formatDate = (d: string) => {
                                      const p = d.split("-");
                                      return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d;
                                    };
                                    return (
                                      <div key={s.id}
                                        className="p-5 rounded-[24px] border relative overflow-hidden flex flex-col justify-between"
                                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: "rgba(239, 68, 68, 0.20)", backdropFilter: "blur(40px)" }}>
                                        <div>
                                          <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-red-500/30 bg-red-500/10 text-red-400">{s.examType}</span>
                                            <span className="text-[10px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{formatDate(s.date)}</span>
                                          </div>
                                          <h3 className="text-sm font-bold mb-3">{s.title || formatDate(s.date)}</h3>
                                          <p className="text-[10px] font-mono mb-4" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{s.questions.length} Codes Contributed</p>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                          <button
                                            onClick={() => handleRestoreItem("session", s.id)}
                                            className="flex-1 py-2 rounded-xl border border-white/10 hover:bg-white/5 font-bold text-xs transition-all flex items-center justify-center gap-1"
                                            style={{ color: P.blue }}
                                          >
                                            <RotateCcw size={12} /> Restore
                                          </button>
                                          <button
                                            onClick={() => openPermanentDeleteModal("session", s.id, s.title || s.date)}
                                            className="flex-1 py-2 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-500/10 font-bold text-xs transition-all flex items-center justify-center gap-1"
                                          >
                                            <Trash2 size={12} /> Delete Forever
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )
                            ) : (
                              binnedQuestions.length === 0 ? (
                                <div className="py-20 text-center rounded-[28px] border border-dashed" style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: dk ? `${P.sky}60` : `${P.black}40` }}>
                                  <Trash2 size={32} className="mx-auto mb-3 opacity-30 text-red-400" />
                                  <p className="text-xs">No questions in trash bin.</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {binnedQuestions.map(({ question: q, session: s }) => (
                                    <div key={q.id} className="rounded-2xl border overflow-hidden transition-all p-5"
                                      style={{ background: dk ? "rgba(5,5,5,0.40)" : "rgba(255,255,255,0.60)", borderColor: "rgba(239, 68, 68, 0.15)" }}>
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-red-500/20 bg-red-500/5 text-red-400">{q.language}</span>
                                            <span className="text-[9px] font-sans px-2 py-0.5 rounded border" style={{ background: `${P.blue}10`, color: P.blue, borderColor: `${P.blue}20` }}>
                                              Session: {s.title || s.date} ({s.examType})
                                            </span>
                                          </div>
                                          <h4 className="text-xs font-bold">{q.title}</h4>
                                          {q.comment && <p className="text-[10px] font-mono mt-1 opacity-60">{q.comment}</p>}
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                          <button
                                            onClick={() => handleRestoreItem("question", q.id)}
                                            className="px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 font-bold text-[10px] transition-all flex items-center gap-1"
                                            style={{ color: P.blue }}
                                          >
                                            <RotateCcw size={10} /> Restore
                                          </button>
                                          <button
                                            onClick={() => openPermanentDeleteModal("question", q.id, q.title)}
                                            className="px-3 py-1.5 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-500/10 font-bold text-[10px] transition-all flex items-center gap-1"
                                          >
                                            <Trash2 size={10} /> Delete Forever
                                          </button>
                                        </div>
                                      </div>
                                      <pre className="p-3 text-[10px] font-[family-name:var(--font-mono)] overflow-x-auto max-h-32 rounded-lg" style={{ background: "#151b22", color: "#8ecfff" }}>
                                        <code>{q.code}</code>
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              )
                            )}
                          </motion.div>
                        ) : !vitDetailView ? (
                          <motion.div key="vit-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div>
                                <h2 className="text-xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase">VIT-AP Code Sessions</h2>
                                <p className="text-xs" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Manage exam sessions and code questions</p>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <select value={examTypeFilter} onChange={e => setExamTypeFilter(e.target.value)} className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${inputBg}`}>
                                  <option value="all">All Types</option>
                                  {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>

                                <button onClick={() => setShowManageTypes(true)} className="p-2.5 rounded-xl border transition-all hover:opacity-80"
                                  style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: dk ? P.sky : P.black }}>
                                  <Settings size={14} />
                                </button>
                                <button onClick={() => setShowBin(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-xs shadow-md active:scale-[0.98] transition-all hover:bg-red-500/10 border-red-500/30 text-red-400 bg-red-500/5">
                                  <Trash2 size={13} /> VIT Bin ({binnedSessionsCount + binnedQuestionsCount})
                                </button>
                                <button onClick={() => setShowNewSessionModal(true)} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all"
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
                              <div className="py-20 text-center rounded-[28px] border border-dashed" style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: dk ? `${P.sky}60` : `${P.black}40` }}>
                                <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-xs">No sessions yet. Create your first one.</p>
                              </div>
                            ) : (
                              <div className="space-y-8">
                                {Object.entries(groupedSessions).map(([type, sessions]) => {
                                  const today = new Date();
                                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                                  
                                  // Sort descending so newest is first, BUT pin today's date to the very front
                                  const sorted = [...sessions].sort((a, b) => {
                                    if (a.date === todayStr && b.date !== todayStr) return -1;
                                    if (b.date === todayStr && a.date !== todayStr) return 1;
                                    const dateCmp = b.date.localeCompare(a.date);
                                    if (dateCmp !== 0) return dateCmp;
                                    return b.id.localeCompare(a.id); // Tie-breaker for multiple sessions on same day
                                  });
                                  const maxDate = sorted[0].date;
                                  const minDate = sorted[sorted.length - 1].date;
                                  
                                  const formatDate = (d: string) => {
                                    const p = d.split("-");
                                    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d;
                                  };
                                  
                                  const dateRange = minDate === maxDate ? formatDate(minDate) : `${formatDate(minDate)} to ${formatDate(maxDate)}`;

                                  return (
                                    <div key={type} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                      <div className="mb-4">
                                        <h2 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>{type}</h2>
                                        <p className="text-[10px] font-mono mt-1" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Available: {dateRange} • {sessions.length} Session{sessions.length !== 1 && 's'}</p>
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
                                              <button onClick={e => { e.stopPropagation(); openDeleteModal(s); }}
                                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:opacity-80"
                                                style={{ color: P.error }}>
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
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
                                    <h2 className="text-lg font-black font-[family-name:var(--font-outfit)]">{activeSession.title || activeSession.date}</h2>
                                    <span className="text-[9px] px-2.5 py-0.5 rounded-md font-bold uppercase border" style={{ background: `${P.sky}15`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>{activeSession.examType}</span>
                                    <span className="text-[10px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{activeSession.date}</span>
                                    <span className="text-[10px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>• {activeSession.questions.length} Codes Contributed</span>
                                  </div>
                                </div>

                                {/* Add Question Form */}
                                <div className="p-6 rounded-[28px] border relative overflow-hidden space-y-5"
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
                                  <div className="flex flex-col h-64">
                                    <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Source Code</label>
                                    <textarea value={qCode} onChange={e => setQCode(e.target.value)} placeholder="Paste source code..."
                                      className="w-full flex-1 text-xs font-mono rounded-xl p-4 border focus:outline-none resize-none"
                                      style={{ background: "#151b22", borderColor: "rgba(199,238,255,0.1)", color: "#8ecfff" }} />
                                  </div>
                                  <div className="flex justify-end">
                                    <button onClick={handleAddQuestion} className="px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-[0.98] transition-all"
                                      style={{ background: P.blue }}><Plus size={13} /> Add Question</button>
                                  </div>
                                </div>

                                {/* Questions List */}
                                <div className="space-y-3">
                                  {activeSession.questions.length === 0 ? (
                                    <div className="py-16 text-center rounded-[28px] border border-dashed" style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: dk ? `${P.sky}60` : `${P.black}40` }}>
                                      <Code size={28} className="mx-auto mb-3 opacity-30" />
                                      <p className="text-xs">No questions yet. Add your first question above.</p>
                                    </div>
                                  ) : activeSession.questions.map((q, idx) => (
                                    <div key={q.id} className="rounded-2xl border overflow-hidden transition-all"
                                      style={{ background: dk ? "rgba(5,5,5,0.40)" : "rgba(255,255,255,0.60)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                                      <div onClick={() => setExpandedQId(expandedQId === q.id ? null : q.id)}
                                        className="w-full px-5 py-4 flex justify-between items-center text-left hover:opacity-90 transition-colors cursor-pointer">
                                        <div className="flex flex-col gap-1">
                                          <span className="text-xs font-bold">{idx + 1}. {q.title}</span>
                                          {q.comment && <span className="text-[10px] font-mono" style={{ color: dk ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{q.comment}</span>}
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0 ml-4">
                                          <span className="text-[9px] font-mono px-2 py-0.5 rounded border" style={{ background: `${P.blue}10`, color: P.blue, borderColor: `${P.blue}20` }}>{q.language}</span>
                                          <button onClick={e => { e.stopPropagation(); handleToggleQuestionLock(q.id, !!q.isLocked); }} className="p-1 rounded hover:opacity-70 transition-colors" style={{ color: q.isLocked ? P.blue : P.sky }} title={q.isLocked ? "Unlock code" : "Lock code"}>
                                            {q.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                          </button>
                                          <button onClick={e => { e.stopPropagation(); handleDeleteQuestion(q.id); }} className="p-1 rounded hover:opacity-70" style={{ color: P.error }} title="Delete code"><Trash2 size={12} /></button>
                                          <ChevronRight size={14} className={`transition-transform ${expandedQId === q.id ? "rotate-90" : ""}`} style={{ color: dk ? `${P.sky}60` : `${P.black}40` }} />
                                        </div>
                                      </div>
                                      <AnimatePresence>
                                        {expandedQId === q.id && (
                                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <pre className="p-4 text-[10px] font-[family-name:var(--font-mono)] overflow-x-auto max-h-52" style={{ background: "#151b22", color: "#8ecfff" }}>
                                              <code>{q.code}</code>
                                            </pre>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {/* ═══ DELETE SESSION CONFIRMATION MODAL ═══ */}
                  <AnimatePresence>
                    {showDeleteModal && deleteTargetSession && (
                      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.92 }}
                          className="relative w-[95%] sm:max-w-md p-1 rounded-[24px] border border-red-500/30 bg-black shadow-2xl z-10"
                        >
                          <div className={`p-5 sm:p-6 rounded-[20px] ${cardBg} space-y-4`}>
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                  <Trash2 size={16} className="text-red-400" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-black uppercase tracking-wide text-red-400">Delete Session</h3>
                                  <p className={`text-[10px] ${txt3}`}>This action cannot be undone</p>
                                </div>
                              </div>
                              <button onClick={() => setShowDeleteModal(false)} className={`p-1.5 rounded-lg border border-white/10 hover:bg-white/5 shrink-0`}>
                                <X size={14} className={txt1} />
                              </button>
                            </div>

                            {/* Warning Box */}
                            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                              <p className="text-xs text-red-300/80 leading-relaxed">
                                You are about to permanently delete session{" "}
                                <span className="font-bold text-white">{deleteTargetSession.title || deleteTargetSession.date}</span>{" "}
                                from <span className="font-bold text-white">{deleteTargetSession.examType}</span>.
                                All {deleteTargetSession.questions.length} question{deleteTargetSession.questions.length !== 1 ? "s" : ""} will be removed from the database.
                              </p>
                            </div>

                            {/* Type-to-confirm */}
                            <div>
                              <label className={`block text-[10px] uppercase font-bold tracking-wider mb-2 ${txt3}`}>
                                Type <span className="font-mono text-white px-1 py-0.5 rounded bg-white/10">{deleteTargetSession.title || deleteTargetSession.date}</span> to confirm
                              </label>
                              <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={e => setDeleteConfirmText(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && deleteConfirmText.trim().toLowerCase() === (deleteTargetSession.title || deleteTargetSession.date).trim().toLowerCase()) handleDeleteSession(); }}
                                placeholder={`Type "${deleteTargetSession.title || deleteTargetSession.date}" here...`}
                                autoFocus
                                className={`w-full text-xs font-mono rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 transition-all ${deleteConfirmText.trim().toLowerCase() === (deleteTargetSession.title || deleteTargetSession.date).trim().toLowerCase() ? 'border-red-500/50 focus:ring-red-500/20 bg-red-500/5' : inputBg}`}
                              />
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                onClick={() => setShowDeleteModal(false)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-all`}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleDeleteSession}
                                disabled={deleteConfirmText.trim().toLowerCase() !== (deleteTargetSession.title || deleteTargetSession.date).trim().toLowerCase() || deletingSession}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                  deleteConfirmText.trim().toLowerCase() === (deleteTargetSession.title || deleteTargetSession.date).trim().toLowerCase() && !deletingSession
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 active:scale-[0.98]'
                                    : 'bg-red-900/20 text-red-700 cursor-not-allowed border border-red-500/10'
                                }`}
                              >
                                {deletingSession ? (
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-red-300/40 border-t-white animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                                Delete Session
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* ═══ PERMANENT DELETE CONFIRMATION MODAL ═══ */}
                  <AnimatePresence>
                    {showPermanentDeleteModal && permanentDeleteTarget && (
                      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPermanentDeleteModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.92 }}
                          className="relative w-[95%] sm:max-w-md p-1 rounded-[24px] border border-red-500/30 bg-black shadow-2xl z-10"
                        >
                          <div className={`p-5 sm:p-6 rounded-[20px] ${cardBg} space-y-4`}>
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                  <Trash2 size={16} className="text-red-400" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-black uppercase tracking-wide text-red-400">Delete Permanently</h3>
                                  <p className={`text-[10px] ${txt3}`}>This action cannot be undone</p>
                                </div>
                              </div>
                              <button onClick={() => setShowPermanentDeleteModal(false)} className={`p-1.5 rounded-lg border border-white/10 hover:bg-white/5 shrink-0`}>
                                <X size={14} className={txt1} />
                              </button>
                            </div>

                            {/* Warning Box */}
                            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                              <p className="text-xs text-red-300/80 leading-relaxed">
                                You are about to **permanently delete** this {permanentDeleteTarget.type}: <span className="font-bold text-white">{permanentDeleteTarget.name}</span>.
                                This will erase it from the database forever.
                              </p>
                            </div>

                            {/* Type-to-confirm */}
                            <div>
                              <label className={`block text-[10px] uppercase font-bold tracking-wider mb-2 ${txt3}`}>
                                Type <span className="font-mono text-white px-1 py-0.5 rounded bg-white/10">{permanentDeleteTarget.name}</span> to confirm
                              </label>
                              <input
                                type="text"
                                value={permanentDeleteConfirmText}
                                onChange={e => setPermanentDeleteConfirmText(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && permanentDeleteConfirmText.trim().toLowerCase() === permanentDeleteTarget.name.trim().toLowerCase()) handlePermanentDelete(); }}
                                placeholder={`Type confirmation name here...`}
                                autoFocus
                                className={`w-full text-xs font-mono rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 transition-all ${permanentDeleteConfirmText.trim().toLowerCase() === permanentDeleteTarget.name.trim().toLowerCase() ? 'border-red-500/50 focus:ring-red-500/20 bg-red-500/5' : inputBg}`}
                              />
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                onClick={() => setShowPermanentDeleteModal(false)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-all`}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handlePermanentDelete}
                                disabled={permanentDeleteConfirmText.trim().toLowerCase() !== permanentDeleteTarget.name.trim().toLowerCase() || isPermanentlyDeleting}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                  permanentDeleteConfirmText.trim().toLowerCase() === permanentDeleteTarget.name.trim().toLowerCase() && !isPermanentlyDeleting
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 active:scale-[0.98]'
                                    : 'bg-red-900/20 text-red-700 cursor-not-allowed border border-red-500/10'
                                }`}
                              >
                                {isPermanentlyDeleting ? (
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-red-300/40 border-t-white animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                                Delete Permanently
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {/* ═══ CONTRIBUTORS ═══ */}
                  {view === "contributors" && (
                    <motion.div key="contributors" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                          <h2 className="text-xl font-black font-outfit uppercase tracking-wide">Contributor Management</h2>
                          <p className="text-xs text-white/60">Monitor code submissions and control access</p>
                        </div>
                      </div>

                      {loadingContributors ? (
                        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} /></div>
                      ) : !selectedContributor ? (
                        <div className="grid grid-cols-1 gap-4">
                          {contributors.map(c => {
                            const parsed = parseVitEmail(c.email);
                            const name = c.name || parsed.name;
                            const regno = c.regno || parsed.regno;
                            const college = c.college || parsed.college;
                            const codes = contributorCodes.filter(q => q.contributorEmail === c.email);
                            
                            return (
                              <div key={c.email} onClick={() => setSelectedContributor(c.email)} className="p-5 rounded-[24px] border cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                                <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black uppercase text-lg" style={{ background: `${P.blue}15`, color: P.blue }}>
                                    {name[0] || "?"}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-sm font-bold uppercase">{name}</h3>
                                      <span className="text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border" style={{ background: `${P.sky}15`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>{college}</span>
                                    </div>
                                    <p className="text-[10px] font-mono mt-1" style={{ color: dk ? `${P.sky}60` : `${P.black}60` }}>{c.email} • {regno}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6 w-full md:w-auto">
                                  <div className="text-left md:text-right flex-1 md:flex-none">
                                    <p className="text-xs font-bold" style={{ color: P.blue }}>{codes.length} Codes</p>
                                    <p className="text-[10px] font-mono uppercase" style={{ color: dk ? `${P.sky}60` : `${P.black}60` }}>Contributed</p>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); toggleContributorStatus(c.email, c.status); }} className="px-4 py-2 rounded-lg text-xs font-bold transition-all border" style={{ background: c.status === "active" ? `${P.error}15` : `${P.blue}15`, color: c.status === "active" ? P.error : P.blue, borderColor: c.status === "active" ? `${P.error}30` : `${P.blue}30` }}>
                                    {c.status === "active" ? "Block Access" : "Activate Access"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <button onClick={() => setSelectedContributor(null)} className="flex items-center gap-2 text-xs font-bold hover:opacity-70 transition-colors relative z-50 cursor-pointer" style={{ color: P.blue }}><ChevronLeft size={14} /> Back to Contributors</button>
                          
                          {(() => {
                            const c = contributors.find(x => x.email === selectedContributor);
                            if (!c) return null;
                            const parsed = parseVitEmail(c.email);
                            const name = c.name || parsed.name;
                            const regno = c.regno || parsed.regno;
                            const college = c.college || parsed.college;
                            const codes = contributorCodes.filter(q => q.contributorEmail === c.email);
                            const types = Array.from(new Set(codes.map(q => q.sessionType)));
                            
                            // Group by date
                            const byDate = codes.reduce((acc, q) => {
                              if (!acc[q.sessionDate]) acc[q.sessionDate] = [];
                              acc[q.sessionDate].push(q);
                              return acc;
                            }, {} as Record<string, typeof codes>);
                            
                            return (
                              <div className="space-y-6">
                                <div className="p-6 rounded-[28px] border relative overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                                  <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h2 className="text-xl font-black uppercase">{name}</h2>
                                        <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase border" style={{ background: `${P.sky}15`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>{college}</span>
                                      </div>
                                      <p className="text-xs font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}60` }}>{c.email} • ID: {regno}</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {types.map(t => (
                                        <span key={t} className="text-[9px] px-2.5 py-1 rounded border font-bold uppercase" style={{ background: `${P.sky}10`, color: dk ? P.sky : P.black, borderColor: `${P.sky}20` }}>{t}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-6">
                                  {Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, qs]) => (
                                    <div key={date} className="space-y-3">
                                      <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: P.blue }}>{date}</h3>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {qs.map((q, idx) => {
                                          const tsStr = q.id.replace("q_", "");
                                          const ts = parseInt(tsStr);
                                          const timeStr = !isNaN(ts) ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                                          return (
                                            <div key={q.id} className="p-5 rounded-[24px] border relative cursor-pointer hover:shadow-lg transition-all" style={{ background: dk ? "rgba(5,5,5,0.40)" : "rgba(255,255,255,0.60)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }} onClick={() => setExpandedContribQId(expandedContribQId === q.id ? null : q.id)}>
                                              <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                  <span className="w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold" style={{ background: `${P.sky}15`, color: P.sky }}>{idx + 1}</span>
                                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase" style={{ background: `${P.blue}10`, color: P.blue, borderColor: `${P.blue}20` }}>{q.language}</span>
                                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase" style={{ background: `${P.sky}10`, color: dk ? P.sky : P.black, borderColor: `${P.sky}20` }}>{q.sessionType}</span>
                                                </div>
                                                {timeStr && <span className="text-[10px] font-mono opacity-60 mt-1">{timeStr}</span>}
                                              </div>
                                              <h4 className="text-sm font-bold mb-2">{q.title}</h4>
                                              {q.comment && <p className="text-xs italic mb-2" style={{ color: dk ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{q.comment}</p>}
                                              <AnimatePresence>
                                                {expandedContribQId === q.id && (
                                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4">
                                                    <pre className="p-4 rounded-xl text-[10px] font-[family-name:var(--font-mono)] overflow-x-auto max-h-52 border" style={{ background: "#151b22", color: "#8ecfff", borderColor: dk ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
                                                      <code>{q.code}</code>
                                                    </pre>
                                                  </motion.div>
                                                )}
                                              </AnimatePresence>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ═══ OTA TEMPLATES ═══ */}
                  {view === "ota" && (
                    <motion.div key="ota" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      <div className="lg:col-span-3 space-y-6">
                        <div className="rounded-[28px] border p-6 relative overflow-hidden space-y-4"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h2 className="text-[10px] font-extrabold tracking-[0.2em] uppercase flex items-center gap-2 pb-2" style={{ color: P.blue, borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                            <Layout size={13} /> Choose File
                          </h2>
                          <div className="space-y-2">
                            {(["center.html", "index.html"] as const).map(file => (
                              <button key={file} onClick={() => setSelectedFile(file)}
                                className="w-full text-left p-4 rounded-2xl flex items-center gap-3.5 transition-all border"
                                style={{
                                  borderColor: selectedFile === file ? `${P.blue}30` : dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)",
                                  background: selectedFile === file ? `${P.blue}10` : dk ? "rgba(5,5,5,0.3)" : "rgba(250,250,250,0.4)",
                                  color: selectedFile === file ? P.blue : dk ? `${P.sky}CC` : `${P.black}AA`,
                                }}>
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: selectedFile === file ? `${P.blue}15` : dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                                  {file === "center.html" ? <MonitorSmartphone size={16} /> : <FileCode size={16} />}
                                </div>
                                <div className="text-xs">
                                  <p className="font-bold">{file}</p>
                                  <p className="text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{file === "center.html" ? "Mobile Command Center" : "Mobile Landing Page"}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-9 rounded-[28px] border overflow-hidden flex flex-col min-h-[580px] relative shadow-2xl"
                        style={{ background: dk ? "rgba(5,5,5,0.30)" : "rgba(255,255,255,0.60)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4"
                          style={{ background: dk ? "rgba(5,5,5,0.6)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${P.blue}15`, border: `1px solid ${P.blue}30` }}>
                              <Globe size={12} style={{ color: P.blue }} />
                            </div>
                            <span className="text-xs font-bold font-[family-name:var(--font-mono)]">{selectedFile}</span>
                            {usingCustom && (
                              <span className="text-[8px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-md animate-pulse" style={{ background: `${P.sky}15`, color: P.sky, border: `1px solid ${P.sky}25` }}>Custom</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={handleResetOta} disabled={loadingOta}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                              style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", color: dk ? P.sky : P.black }}>
                              <RotateCcw size={13} /> Reset
                            </button>
                            <button onClick={handleSaveOta} disabled={loadingOta || savingOta}
                              className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md active:scale-[0.98] disabled:opacity-50 transition-all"
                              style={{ background: P.blue }}>
                              <Save size={13} /> {savingOta ? "Publishing..." : "Publish"}
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 relative flex flex-col" style={{ background: "#151b22" }}>
                          {loadingOta && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3" style={{ background: "rgba(21,27,34,0.9)" }}>
                              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
                              <span className="text-xs font-mono" style={{ color: `${P.sky}60` }}>Loading template...</span>
                            </div>
                          )}
                          <div className="absolute top-0 bottom-0 left-0 w-12 border-r flex flex-col items-center py-6 text-[10px] font-mono select-none leading-relaxed"
                            style={{ background: "rgba(5,5,5,0.2)", borderColor: "rgba(199,238,255,0.04)", color: `${P.sky}30` }}>
                            {Array.from({ length: 22 }).map((_, i) => <span key={i} className="h-5">{i + 1}</span>)}
                          </div>
                          <textarea value={otaContent} onChange={e => setOtaContent(e.target.value)}
                            className="flex-1 bg-transparent font-[family-name:var(--font-mono)] text-xs pl-16 pr-6 py-6 focus:outline-none resize-none leading-relaxed"
                            style={{ color: "#8ecfff" }}
                            placeholder="<!-- Custom Template Source -->" spellCheck={false} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ DIAGNOSTICS ═══ */}
                  {view === "system" && (
                    <motion.div key="sys" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { title: "Host CPU Usky", icon: Cpu, pct: 25, label: "Thread pooling idle" },
                        { title: "System RAM", icon: HardDrive, pct: 50, label: "1.2 GB cached resident" },
                      ].map((g, i) => (
                        <div key={i} className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-4 flex items-center gap-2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            <g.icon size={12} style={{ color: P.blue }} /> {g.title}
                          </h3>
                          <div className="flex flex-col items-center justify-center py-6 space-y-4">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" fill="none" stroke={dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.06)"} strokeWidth="8" />
                                <circle cx="50" cy="50" r="40" fill="none" stroke={P.blue} strokeWidth="8"
                                  strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - g.pct / 100)} strokeLinecap="round" />
                              </svg>
                              <span className="absolute text-2xl font-black font-[family-name:var(--font-outfit)]">{g.pct}%</span>
                            </div>
                            <span className="text-xs font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{g.label}</span>
                          </div>
                        </div>
                      ))}

                      <div className="p-6 rounded-[28px] border relative overflow-hidden"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-4 flex items-center gap-2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                          <Database size={12} style={{ color: P.blue }} /> Database Status
                        </h3>
                        <div className="space-y-4 py-4 text-xs font-mono">
                          {[
                            { k: "Connection Engine", v: "PostgreSQL Live", c: P.blue },
                            { k: "Session Buffer Pool", v: "Active", c: dk ? P.white : P.black },
                            { k: "Total Transactions", v: "2,450 commits", c: P.blue },
                          ].map((r, i) => (
                            <div key={i} className="flex justify-between pb-2" style={{ borderBottom: i < 2 ? `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` : "none" }}>
                              <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{r.k}</span>
                              <span style={{ color: r.c }}>{r.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ SECURITY AUDIT ═══ */}
                  {view === "security" && (
                    <motion.div key="sec" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div>
                        <h2 className="text-xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase">Audit History</h2>
                        <p className="text-xs" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>System login events and security metrics</p>
                      </div>
                      <div className="rounded-2xl border overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                              {["ID", "Time", "Event", "User", "IP", "Severity"].map(h => (
                                <th key={h} className={`p-4 text-[10px] uppercase font-extrabold tracking-widest ${h === "Severity" ? "text-right pr-6" : h === "ID" ? "pl-6" : ""}`}
                                  style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {secLogs.map(l => (
                              <tr key={l.id} className="text-xs" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                <td className="p-4 pl-6 font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{l.id}</td>
                                <td className="p-4 font-mono" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{l.timestamp}</td>
                                <td className="p-4 font-bold">{l.event}</td>
                                <td className="p-4" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{l.user}</td>
                                <td className="p-4 font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{l.ip}</td>
                                <td className="p-4 pr-6 text-right">
                                  <span className="text-[8px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-md border"
                                    style={{
                                      background: l.status === "failed" ? `${P.error}15` : l.status === "warning" ? `${P.sky}15` : `${P.blue}15`,
                                      color: l.status === "failed" ? P.error : l.status === "warning" ? (dk ? P.sky : P.black) : P.blue,
                                      borderColor: l.status === "failed" ? `${P.error}25` : l.status === "warning" ? `${P.sky}25` : `${P.blue}25`,
                                    }}>{l.status === "failed" ? "Critical" : l.status === "warning" ? "Warning" : "Info"}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ SETTINGS ═══ */}
                  {view === "settings" && (
                    <motion.div key="set" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                        { title: "General Preferences", items: [
                          { label: "Verbose Debug Logs", checked: true },
                          { label: "Automatic Backup Schedule", checked: true },
                          { label: "Multi-Node API Proxying", checked: false },
                        ]},
                      ].map((section, si) => (
                        <div key={si} className="p-6 rounded-[28px] border relative overflow-hidden space-y-6"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>{section.title}</h3>
                          <div className="space-y-4">
                            {section.items.map((item, ii) => (
                              <label key={ii} className="flex items-center justify-between cursor-pointer">
                                <span className="text-xs font-semibold">{item.label}</span>
                                <input type="checkbox" defaultChecked={item.checked} className="rounded-md w-4 h-4" style={{ accentColor: P.blue }} />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="p-6 rounded-[28px] border relative overflow-hidden space-y-6"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Branding & Endpoint</h3>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Console Brand Label</span>
                            <input type="text" defaultValue="GlidePass Control" className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none ${inputBg}`} />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Local IP Proxy</span>
                            <input type="text" defaultValue="0.0.0.0:8000" className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none ${inputBg}`} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ PROFILE & PASSWORD ═══ */}
                  {view === "profile" && (
                    <motion.div key="prof" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <form onSubmit={handleUpdateProfile} className="p-6 rounded-[28px] border relative overflow-hidden space-y-6"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Profile Settings</h3>
                        <div className="flex items-center gap-5">
                          <img src={adminAvatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover border shadow-lg" style={{ borderColor: dk ? "rgba(199,238,255,0.15)" : "rgba(5,5,5,0.1)" }} />
                          <div className="space-y-1.5 flex-1">
                            <span className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Avatar URL</span>
                            <input type="text" value={adminAvatar} onChange={e => setAdminAvatar(e.target.value)}
                              className={`text-xs rounded-xl px-3 py-2 w-full border focus:outline-none ${inputBg}`} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold tracking-wider block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Admin Name</label>
                          <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)}
                            className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none ${inputBg}`} />
                        </div>
                        <div className="flex justify-end">
                          <button type="submit" className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md active:scale-[0.98] transition-all" style={{ background: P.blue }}>Update Profile</button>
                        </div>
                      </form>

                      <form onSubmit={handleChangePw} className="p-6 rounded-[28px] border relative overflow-hidden space-y-6"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Change Password</h3>
                        <div className="space-y-4">
                          {[
                            { label: "Current Password", val: curPw, set: setCurPw },
                            { label: "New Password", val: newPw, set: setNewPw },
                            { label: "Confirm Password", val: confirmPw, set: setConfirmPw },
                          ].map((f, i) => (
                            <div key={i} className="space-y-1.5">
                              <label className="text-[9px] uppercase font-bold tracking-wider block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{f.label}</label>
                              <input type="password" value={f.val} onChange={e => f.set(e.target.value)}
                                className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none ${inputBg}`} />
                              {f.label === "New Password" && newPw && (
                                <div className="flex gap-1 items-center pt-1.5">
                                  <span className="text-[9px] uppercase font-bold" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Strength:</span>
                                  <div className="flex gap-1 flex-1 max-w-[100px]">
                                    {Array.from({ length: 4 }).map((_, j) => (
                                      <div key={j} className="h-1 flex-1 rounded-sm transition-all" style={{ background: j < pwStrength ? (pwStrength < 3 ? P.sky : P.blue) : dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.06)" }} />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <button type="submit" className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md active:scale-[0.98] transition-all" style={{ background: P.blue }}>Update Password</button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>

            {/* ─── Notification Drawer ─── */}
            <AnimatePresence>
              {notiOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                  onClick={() => setNotiOpen(false)}>
                  <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="w-80 h-full p-6 border-l flex flex-col backdrop-blur-3xl"
                    style={{ background: dk ? "rgba(5,5,5,0.92)" : "rgba(255,255,255,0.92)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}
                    onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center pb-3 mb-6" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                      <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Notifications</h3>
                      <button onClick={() => setNotiOpen(false)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: dk ? P.sky : P.black }}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {notifications.map(n => (
                        <div key={n.id} className="p-3 rounded-xl border text-xs space-y-1"
                          style={{ background: dk ? "rgba(5,5,5,0.3)" : "rgba(250,250,250,0.5)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold">{n.title}</span>
                            <span className="text-[8px]" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{n.time}</span>
                          </div>
                          <p className="text-[10px] leading-normal" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{n.desc}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Command Palette ─── */}
            <AnimatePresence>
              {cmdOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
                  style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                  onClick={() => setCmdOpen(false)}>
                  <motion.div initial={{ scale: 0.95, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -20 }}
                    className="w-full max-w-[550px] rounded-3xl border shadow-2xl p-4 overflow-hidden"
                    style={{ background: dk ? "rgba(5,5,5,0.95)" : "rgba(255,255,255,0.95)", borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)" }}
                    onClick={e => e.stopPropagation()}>
                    <div className="relative mb-3">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }} />
                      <input ref={cmdRef} type="text" placeholder="Search views, toggle theme, sign out..."
                        value={cmdQ} onChange={e => setCmdQ(e.target.value)}
                        className={`w-full text-xs rounded-2xl pl-10 pr-4 py-3 border focus:outline-none ${inputBg}`} />
                    </div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 text-xs">
                      {cmdActions.map((item, i) => (
                        <button key={i} onClick={item.action}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl hover:opacity-80 transition-colors"
                          style={{ color: dk ? `${P.sky}CC` : `${P.black}AA` }}>
                          {item.name}
                        </button>
                      ))}
                      {cmdActions.length === 0 && (
                        <div className="py-8 text-center text-xs" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>No matching commands.</div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── New Session Modal ─── */}
            <AnimatePresence>
              {showNewSessionModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center px-4"
                  style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                  onClick={() => setShowNewSessionModal(false)}>
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                    className="w-full max-w-[450px] rounded-[28px] border p-6 space-y-5 relative overflow-hidden"
                    style={{ background: dk ? "rgba(5,5,5,0.95)" : "rgba(255,255,255,0.95)", borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)" }}
                    onClick={e => e.stopPropagation()}>
                    <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>New Session</h3>
                      <button onClick={() => setShowNewSessionModal(false)} className="p-1 rounded-lg hover:opacity-70" style={{ color: dk ? P.sky : P.black }}><X size={14} /></button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Session Title</label>
                        <input type="text" value={newSessionTitle} onChange={e => setNewSessionTitle(e.target.value)} placeholder="e.g. Lab Assessment 1"
                          className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none ${inputBg}`} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Date</label>
                          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                            className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none ${inputBg}`} />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Exam Type</label>
                          <select value={newExamType} onChange={e => setNewExamType(e.target.value)}
                            className={`w-full text-xs rounded-xl px-3 py-3 border focus:outline-none ${inputBg}`}>
                            {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <button onClick={handleAddSession} className="w-full py-3.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
                        style={{ background: P.blue }}><Plus size={14} /> Create Session</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Manage Exam Types Modal ─── */}
            <AnimatePresence>
              {showManageTypes && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center px-4"
                  style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                  onClick={() => setShowManageTypes(false)}>
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                    className="w-full max-w-[400px] rounded-[28px] border p-6 space-y-5 relative overflow-hidden"
                    style={{ background: dk ? "rgba(5,5,5,0.95)" : "rgba(255,255,255,0.95)", borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)" }}
                    onClick={e => e.stopPropagation()}>
                    <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Manage Exam Types</h3>
                      <button onClick={() => setShowManageTypes(false)} className="p-1 rounded-lg hover:opacity-70" style={{ color: dk ? P.sky : P.black }}><X size={14} /></button>
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {examTypes.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border"
                          style={{ background: dk ? "rgba(5,5,5,0.3)" : "rgba(250,250,250,0.5)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                          {editingTypeIdx === i ? (
                            <input type="text" value={editingTypeName} onChange={e => setEditingTypeName(e.target.value)} className={`text-xs rounded-lg px-2 py-1 border focus:outline-none flex-1 mr-2 ${inputBg}`} autoFocus />
                          ) : (
                            <div className="flex flex-col gap-2 flex-1 mr-4 min-w-0">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold truncate">{t}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}50` : `${P.black}50` }}>Rule:</span>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. 5" 
                                    value={examRules[t] || ""} 
                                    onChange={e => handleUpdateRule(t, e.target.value)}
                                    className={`w-14 text-[10px] rounded-lg px-1.5 py-0.5 border focus:outline-none ${inputBg}`} 
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}50` : `${P.black}50` }}>Sessions:</span>
                                  <input 
                                    type="number" 
                                    min="1"
                                    placeholder="1" 
                                    value={sessionLimits[t] !== undefined ? sessionLimits[t] : 1} 
                                    onChange={e => handleUpdateSessionLimit(t, parseInt(e.target.value, 10) || 1)}
                                    className={`w-10 text-[10px] rounded-lg px-1 py-0.5 border focus:outline-none ${inputBg}`} 
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {editingTypeIdx === i ? (
                              <>
                                <button onClick={() => { const u = [...examTypes]; u[i] = editingTypeName; setExamTypes(u); setEditingTypeIdx(null); }} className="p-1 rounded" style={{ color: P.blue }}><Check size={12} /></button>
                                <button onClick={() => setEditingTypeIdx(null)} className="p-1 rounded" style={{ color: P.error }}><X size={12} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditingTypeIdx(i); setEditingTypeName(t); }} className="p-1 rounded hover:opacity-70" style={{ color: dk ? P.sky : P.black }}><Edit2 size={12} /></button>
                                <button onClick={() => { setDeleteTargetType(t); setDeleteTypeConfirmText(""); setShowDeleteTypeModal(true); }} className="p-1 rounded hover:opacity-70" style={{ color: P.error }}><Trash2 size={12} /></button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input type="text" value={newExamTypeName} onChange={e => setNewExamTypeName(e.target.value)} placeholder="New type..."
                        className={`flex-1 text-xs rounded-xl px-3 py-2.5 border focus:outline-none ${inputBg}`} />
                      <button onClick={() => {
                        const added = newExamTypeName.trim();
                        if (added) {
                          setDeletedExamTypes(prev => prev.filter(t => t.toLowerCase() !== added.toLowerCase()));
                          setExamTypes(prev => Array.from(new Set([...prev, added])));
                          setNewExamType(added);
                          setNewExamTypeName("");
                        }
                      }}
                        className="px-4 py-2.5 rounded-xl text-white text-xs font-bold active:scale-[0.98] transition-all" style={{ background: P.blue }}>
                        <Plus size={13} />
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══ DELETE EXAM TYPE CONFIRMATION MODAL ═══ */}
            <AnimatePresence>
              {showDeleteTypeModal && deleteTargetType && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteTypeModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="relative w-[95%] sm:max-w-md p-1 rounded-[24px] border border-red-500/30 bg-black shadow-2xl z-10"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className={`p-5 sm:p-6 rounded-[20px] space-y-4`} style={{ background: dk ? "rgba(5,5,5,0.98)" : "rgba(255,255,255,0.98)" }}>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <Trash2 size={16} className="text-red-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-wide text-red-400">Delete Exam Type</h3>
                            <p className={`text-[10px] ${txt3}`}>This will remove the type permanently</p>
                          </div>
                        </div>
                        <button onClick={() => setShowDeleteTypeModal(false)} className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
                          <X size={14} className={txt1} />
                        </button>
                      </div>

                      {/* Warning */}
                      <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                        <p className="text-xs text-red-300/80 leading-relaxed">
                          You are about to permanently delete the exam type{" "}
                          <span className="font-bold text-white">{deleteTargetType}</span>.
                          {" "}Existing sessions using this type will not be deleted but the type will no longer be available.
                        </p>
                      </div>

                      {/* Type-to-confirm */}
                      <div>
                        <label className={`block text-[10px] uppercase font-bold tracking-wider mb-2 ${txt3}`}>
                          Type <span className="font-mono text-white px-1 py-0.5 rounded bg-white/10 normal-case">{deleteTargetType}</span> to confirm
                        </label>
                        <input
                          type="text"
                          value={deleteTypeConfirmText}
                          onChange={e => setDeleteTypeConfirmText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && deleteTypeConfirmText.trim().toLowerCase() === deleteTargetType.trim().toLowerCase()) {
                              setDeletedExamTypes(prev => Array.from(new Set([...prev, deleteTargetType])));
                              setExamTypes(prev => prev.filter(t => t !== deleteTargetType));
                              setShowDeleteTypeModal(false);
                              setDeleteTargetType(null);
                              setDeleteTypeConfirmText("");
                            }
                          }}
                          placeholder={`Type "${deleteTargetType}" here...`}
                          autoFocus
                          className={`w-full text-xs font-mono rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 transition-all ${
                            deleteTypeConfirmText.trim().toLowerCase() === deleteTargetType.trim().toLowerCase()
                              ? 'border-red-500/50 focus:ring-red-500/20 bg-red-500/5'
                              : inputBg
                          }`}
                        />
                      </div>

                      {/* Footer */}
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setShowDeleteTypeModal(false)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (deleteTypeConfirmText.trim().toLowerCase() !== deleteTargetType.trim().toLowerCase()) return;
                            setDeletedExamTypes(prev => Array.from(new Set([...prev, deleteTargetType])));
                            setExamTypes(prev => prev.filter(t => t !== deleteTargetType));
                            setShowDeleteTypeModal(false);
                            setDeleteTargetType(null);
                            setDeleteTypeConfirmText("");
                            showToast("success", `Exam type "${deleteTargetType}" deleted.`);
                          }}
                          disabled={deleteTypeConfirmText.trim().toLowerCase() !== deleteTargetType.trim().toLowerCase()}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            deleteTypeConfirmText.trim().toLowerCase() === deleteTargetType.trim().toLowerCase()
                              ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 active:scale-[0.98]'
                              : 'bg-red-900/20 text-red-700 cursor-not-allowed border border-red-500/10'
                          }`}
                        >
                          <Trash2 size={12} />
                          Delete Type
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toast ─── */}
      <AnimatePresence>
        {toast.type && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-2xl"
            style={{
              background: dk ? "rgba(5,5,5,0.92)" : "rgba(255,255,255,0.92)",
              borderColor: toast.type === "success" ? `${P.blue}30` : `${P.error}30`,
            }}>
            {toast.type === "success" ? <CheckCircle size={16} style={{ color: P.blue }} /> : <AlertCircle size={16} style={{ color: P.error }} />}
            <span className="text-xs font-semibold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


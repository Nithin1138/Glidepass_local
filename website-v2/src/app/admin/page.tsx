"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Save, RotateCcw, AlertCircle, CheckCircle, FileCode, MonitorSmartphone, Settings, Plus, Trash2,
  Award, Calendar, BookOpen, Edit2, Check, X, ChevronRight, ChevronLeft, Terminal, Layout, Globe, Activity,
  ExternalLink, CalendarDays, Sparkles, Filter, Code, Info, Users, ShieldAlert, BarChart3, Database, Lock,
  Unlock, User, ShieldCheck, Key, Eye, EyeOff, Search, Bell, Moon, Sun, Monitor, Menu, LogOut, CheckSquare,
  AlertTriangle, Play, Pause, RefreshCw, Download, Sliders, HardDrive, Cpu, Radio, Shield, ListTodo
} from "lucide-react";
import Link from "next/link";

// Interfaces
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

export default function PremiumAdminPanel() {
  // --- Theme Engine ---
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("lanpad-admin-theme") as "light" | "dark" | "system" | null;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("lanpad-admin-theme", theme);
    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      setResolvedTheme(media.matches ? "dark" : "light");
      const listener = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? "dark" : "light");
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  // --- Auth Session ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [loginHistory, setLoginHistory] = useState<{ time: string; ip: string; device: string; success: boolean }[]>([]);

  useEffect(() => {
    const isLogged = localStorage.getItem("lanpad-admin-logged");
    if (isLogged === "true") {
      setIsAuthenticated(true);
    }
    // Load local history
    const hist = localStorage.getItem("lanpad-login-history");
    if (hist) setLoginHistory(JSON.parse(hist));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = usernameInput.trim();
    const isSuccess = cleanUser === "Nithin" && passwordInput === "check";

    const newLog = {
      time: new Date().toLocaleTimeString() + " " + new Date().toLocaleDateString(),
      ip: "192.168.1.15",
      device: navigator.userAgent.includes("Mac") ? "MacBook Pro" : "Windows Desktop",
      success: isSuccess
    };

    const updatedHistory = [newLog, ...loginHistory].slice(0, 10);
    setLoginHistory(updatedHistory);
    localStorage.setItem("lanpad-login-history", JSON.stringify(updatedHistory));

    if (isSuccess) {
      setIsAuthenticated(true);
      if (rememberMe) {
        localStorage.setItem("lanpad-admin-logged", "true");
      }
      showStatus("success", "Access Granted. Welcome back, Admin.");
    } else {
      setLoginAttempts(prev => prev + 1);
      showStatus("error", "Access Denied. Invalid administrative credentials.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("lanpad-admin-logged");
    setUsernameInput("");
    setPasswordInput("");
    showStatus("success", "Session terminated successfully.");
  };

  // --- Layout & View Manager ---
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<
    "dashboard" | "users" | "rbac" | "analytics" | "vitcodes" | "ota" | "system" | "security" | "settings" | "profile"
  >("dashboard");
  const [workspace, setWorkspace] = useState<"production" | "staging">("production");

  // --- Command Palette ---
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [paletteQuery, setPaletteQuery] = useState<string>("");
  const paletteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isCommandPaletteOpen && paletteInputRef.current) {
      paletteInputRef.current.focus();
    }
  }, [isCommandPaletteOpen]);

  // --- Notification Center ---
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; desc: string; type: "info" | "warning" | "success"; time: string }[]>([
    { id: "1", title: "Deployment Successful", desc: "OTA template center.html deployed live on Edge CDN.", type: "success", time: "5m ago" },
    { id: "2", title: "Suspicious Activity Detected", desc: "Failed admin sign-in attempt from IP 198.51.100.42.", type: "warning", time: "1h ago" },
    { id: "3", title: "API Rate-Limit Alert", desc: "Host sync spikes exceeded 1,200 req/min limit.", type: "info", time: "3h ago" }
  ]);

  // --- General Notification state ---
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  const showStatus = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: null, message: "" }), 5000);
  };

  // --- OTA Tab States ---
  const [selectedFile, setSelectedFile] = useState<"index.html" | "center.html">("center.html");
  const [content, setContent] = useState<string>("");
  const [loadingOta, setLoadingOta] = useState<boolean>(true);
  const [savingOta, setSavingOta] = useState<boolean>(false);
  const [usingCustom, setUsingCustom] = useState<boolean>(false);

  // --- VIT Codes Tab States ---
  const [vitSessions, setVitSessions] = useState<VitCode[]>([]);
  const [loadingVit, setLoadingVit] = useState<boolean>(true);
  const [savingVit, setSavingVit] = useState<boolean>(false);

  // Selected session for editing questions
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [examTypeFilter, setExamTypeFilter] = useState<string | null>(null);

  // New session form states
  const [newDate, setNewDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [newExamType, setNewExamType] = useState<string>("NERD");
  const [newSessionTitle, setNewSessionTitle] = useState<string>("");
  const [examTypes, setExamTypes] = useState<string[]>([
    "NERD", "Daily Assessment", "Mid Term Exam", "Final Term Exam", "Coding Challenge"
  ]);
  const [showAddExamType, setShowAddExamType] = useState<boolean>(false);
  const [newExamTypeName, setNewExamTypeName] = useState<string>("");
  const [showManageExamTypes, setShowManageExamTypes] = useState<boolean>(false);
  const [editingExamTypeIndex, setEditingExamTypeIndex] = useState<number | null>(null);
  const [editingExamTypeName, setEditingExamTypeName] = useState<string>("");

  // New question form states
  const [qTitle, setQTitle] = useState<string>("");
  const [qCode, setQCode] = useState<string>("");
  const [qLang, setQLang] = useState<string>("cpp");

  // --- Fetch Data functions ---
  const fetchTemplate = async (fileName: "index.html" | "center.html") => {
    setLoadingOta(true);
    try {
      const res = await fetch(`/api/ota?file=${fileName}`);
      if (!res.ok) throw new Error(`Failed to fetch ${fileName}`);
      const data = await res.text();
      setContent(data);
      setUsingCustom(true);
    } catch (err: any) {
      showStatus("error", err.message || "Failed to load template");
    } finally {
      setLoadingOta(false);
    }
  };

  const fetchVitCodes = async () => {
    setLoadingVit(true);
    try {
      const res = await fetch("/api/vitcodes");
      if (!res.ok) throw new Error("Failed to fetch VIT codes");
      const data = await res.json();
      setVitSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
      if (data && Array.from) {
        const types = data.map((s: any) => s.examType).filter(Boolean);
        setExamTypes(prev => Array.from(new Set([...prev, ...types])));
      }
    } catch (err: any) {
      showStatus("error", err.message || "Failed to load VIT codes");
    } finally {
      setLoadingVit(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (currentView === "ota") fetchTemplate(selectedFile);
      if (currentView === "vitcodes" || currentView === "dashboard") fetchVitCodes();
    }
  }, [currentView, selectedFile, isAuthenticated]);

  // --- Save OTA template ---
  const handleSaveOta = async () => {
    setSavingOta(true);
    try {
      const res = await fetch("/api/ota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: selectedFile, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");
      showStatus("success", `Successfully updated ${selectedFile} live on mobile site!`);
      setUsingCustom(true);
    } catch (err: any) {
      showStatus("error", err.message || "Failed to save template");
    } finally {
      setSavingOta(false);
    }
  };

  const handleResetOta = async () => {
    if (!confirm(`Are you sure you want to reset ${selectedFile} to default repository version?`)) return;
    setLoadingOta(true);
    try {
      const otaGithubBase = "https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/templates/";
      const res = await fetch(otaGithubBase + selectedFile);
      if (!res.ok) throw new Error("Failed to fetch default template from GitHub");
      const defaultContent = await res.text();
      setContent(defaultContent);

      const saveRes = await fetch("/api/ota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: selectedFile, content: defaultContent }),
      });
      if (!saveRes.ok) throw new Error("Failed to save reset template");
      showStatus("success", `Successfully reset ${selectedFile} to repository default.`);
    } catch (err: any) {
      showStatus("error", err.message || "Failed to reset template");
    } finally {
      setLoadingOta(false);
    }
  };

  // --- Save VIT Codes ---
  const handleSaveVitDatabase = async (updatedSessions: VitCode[]) => {
    setSavingVit(true);
    try {
      const res = await fetch("/api/vitcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSessions),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save VIT codes");
      setVitSessions(updatedSessions);
      showStatus("success", "Successfully updated VIT codes database!");
    } catch (err: any) {
      showStatus("error", err.message || "Failed to save VIT codes database");
    } finally {
      setSavingVit(false);
    }
  };

  // Add new session
  const handleAddSession = () => {
    if (!newDate) {
      alert("Please select a date");
      return;
    }
    const newSession: VitCode = {
      id: Date.now().toString(),
      date: newDate,
      examType: newExamType,
      title: newSessionTitle.trim() || undefined,
      questions: [],
    };
    const updated = [...vitSessions, newSession];
    handleSaveVitDatabase(updated);
    setActiveSessionId(newSession.id);
    setNewSessionTitle("");
    const today = new Date();
    setNewDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  };

  const handleDeleteSession = (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    const updated = vitSessions.filter((s) => s.id !== id);
    handleSaveVitDatabase(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleAddQuestion = () => {
    if (!activeSessionId) return;
    if (!qTitle || !qCode) {
      alert("Please enter both question title and code");
      return;
    }
    const updated = vitSessions.map((s) => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          questions: [
            ...s.questions,
            {
              id: Date.now().toString(),
              title: qTitle,
              code: qCode,
              language: qLang,
            },
          ],
        };
      }
      return s;
    });
    handleSaveVitDatabase(updated);
    setQTitle("");
    setQCode("");
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!confirm("Delete this question?")) return;
    const updated = vitSessions.map((s) => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          questions: s.questions.filter((q) => q.id !== qId),
        };
      }
      return s;
    });
    handleSaveVitDatabase(updated);
  };

  const activeSession = vitSessions.find((s) => s.id === activeSessionId);

  // Compute Stats for sidebar
  const totalSessionsCount = vitSessions.length;
  const totalQuestionsCount = vitSessions.reduce((acc, s) => acc + (s.questions ? s.questions.length : 0), 0);


  // --- Users Module Data & States ---
  const [users, setUsers] = useState<UserRecord[]>([
    { id: "1", name: "Nithin Kumar", email: "nithin@lanpad.app", role: "Super Admin", status: "active", verified: true, activity: "Active 2m ago" },
    { id: "2", name: "Sarah Connor", email: "sarah@resist.org", role: "Developer", status: "active", verified: true, activity: "Active 4h ago" },
    { id: "3", name: "Alex Mercer", email: "mercer@gentek.com", role: "Auditor", status: "suspended", verified: false, activity: "Banned 2d ago" },
    { id: "4", name: "David Lightman", email: "wopr@falken.mil", role: "Contributor", status: "pending", verified: false, activity: "Registered 1h ago" }
  ]);
  const [userSearch, setUserSearch] = useState<string>("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [users, userSearch, userRoleFilter]);

  const toggleVerifyUser = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, verified: !u.verified } : u));
    showStatus("success", "User verification status toggled.");
  };

  const toggleBanUser = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "suspended" ? "active" : "suspended" } : u));
    showStatus("success", "User status updated.");
  };

  const exportUsersCSV = () => {
    const headers = ["ID", "Name", "Email", "Role", "Status", "Verified"];
    const rows = users.map(u => [u.id, u.name, u.email, u.role, u.status, u.verified]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "lanpad_users_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showStatus("success", "CSV file generated and downloaded.");
  };

  // --- Role Access Matrix State ---
  const [rbacMatrix, setRbacMatrix] = useState<Record<string, Record<string, boolean>>>({
    "Super Admin": { users: true, rbac: true, analytics: true, content: true, system: true, security: true, settings: true },
    "Developer": { users: false, rbac: false, analytics: true, content: true, system: true, security: false, settings: false },
    "Auditor": { users: true, rbac: false, analytics: true, content: false, system: false, security: true, settings: false },
    "Contributor": { users: false, rbac: false, analytics: false, content: true, system: false, security: false, settings: false }
  });

  const toggleRbacPermission = (role: string, module: string) => {
    setRbacMatrix(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [module]: !prev[role][module]
      }
    }));
    showStatus("success", "Role access level updated.");
  };

  // --- Security Audit Log Data ---
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([
    { id: "101", timestamp: "23:02:15", event: "Admin Session Terminated", user: "Nithin", ip: "192.168.1.15", status: "success" },
    { id: "102", timestamp: "22:58:40", event: "Failed Authentication Attempt", user: "Admin", ip: "198.51.100.42", status: "failed" },
    { id: "103", timestamp: "22:45:12", event: "VIT database edited", user: "Nithin", ip: "10.251.103.162", status: "warning" },
    { id: "104", timestamp: "22:30:05", event: "SSL Handshake verified", user: "System", ip: "127.0.0.1", status: "success" }
  ]);

  // --- Admin Profile Management state ---
  const [adminName, setAdminName] = useState<string>("Nithin");
  const [adminAvatar, setAdminAvatar] = useState<string>("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isPassVisible, setIsPassVisible] = useState<boolean>(false);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showStatus("success", "Profile settings saved.");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showStatus("error", "Fill in all credentials fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showStatus("error", "New passwords do not match.");
      return;
    }
    showStatus("success", "Administrative password updated successfully.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  }, [newPassword]);

  // --- Command Palette Filtered Actions ---
  const commandPaletteActions = useMemo(() => {
    const list = [
      { name: "Go to Dashboard", action: () => { setCurrentView("dashboard"); setIsCommandPaletteOpen(false); } },
      { name: "Go to User Management", action: () => { setCurrentView("users"); setIsCommandPaletteOpen(false); } },
      { name: "Go to RBAC Access Policies", action: () => { setCurrentView("rbac"); setIsCommandPaletteOpen(false); } },
      { name: "Go to Analytics Analytics Center", action: () => { setCurrentView("analytics"); setIsCommandPaletteOpen(false); } },
      { name: "Go to VIT-AP Codes Manager", action: () => { setCurrentView("vitcodes"); setIsCommandPaletteOpen(false); } },
      { name: "Go to OTA Live Templates", action: () => { setCurrentView("ota"); setIsCommandPaletteOpen(false); } },
      { name: "Go to System Health Monitoring", action: () => { setCurrentView("system"); setIsCommandPaletteOpen(false); } },
      { name: "Go to Security Logs", action: () => { setCurrentView("security"); setIsCommandPaletteOpen(false); } },
      { name: "Go to Settings Center", action: () => { setCurrentView("settings"); setIsCommandPaletteOpen(false); } },
      { name: "Toggle Theme Mode: Light", action: () => { setTheme("light"); setIsCommandPaletteOpen(false); } },
      { name: "Toggle Theme Mode: Dark", action: () => { setTheme("dark"); setIsCommandPaletteOpen(false); } },
      { name: "Admin Sign Out", action: () => { handleLogout(); setIsCommandPaletteOpen(false); } }
    ];
    return list.filter(item => item.name.toLowerCase().includes(paletteQuery.toLowerCase()));
  }, [paletteQuery]);

  // Render CSS variables depending on theme selection
  const isDark = resolvedTheme === "dark";

  return (
    <div className={`min-h-screen relative font-sans antialiased overflow-x-hidden transition-colors duration-500 ${
      isDark ? "bg-[#020205] text-[#ececf1] selection:bg-indigo-500/30 selection:text-white" : "bg-[#f5f6fa] text-[#1c1c1f] selection:bg-indigo-500/20 selection:text-black"
    }`}>
      {/* Background Liquid blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className={`absolute top-[5%] left-[10%] w-[600px] h-[600px] blur-[150px] rounded-full animate-liquid-1 transition-colors duration-1000 ${
          isDark ? "bg-indigo-500/5 via-fuchsia-500/3 to-transparent" : "bg-indigo-500/10 via-fuchsia-500/5 to-transparent"
        }`} />
        <div className={`absolute bottom-[10%] right-[10%] w-[500px] h-[500px] blur-[140px] rounded-full animate-liquid-2 transition-colors duration-1000 ${
          isDark ? "bg-rose-500/3 via-amber-500/2 to-transparent" : "bg-rose-500/5 via-amber-500/3 to-transparent"
        }`} />
      </div>

      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          // ==================== ADMINISTRATIVE LOCK GATE ====================
          <motion.div
            key="lockscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center p-6"
          >
            <div className={`w-full max-w-[450px] rounded-[36px] border backdrop-blur-3xl shadow-2xl p-10 relative overflow-hidden transition-all duration-300 ${
              isDark ? "bg-[#07070c]/60 border-white/[0.06] shadow-black" : "bg-white/70 border-black/[0.05] shadow-slate-200"
            }`}>
              {/* Upper Light Line */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
              
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-indigo-500 via-fuchsia-500 to-rose-500 flex items-center justify-center shadow-lg relative">
                  <Lock className="text-white" size={24} />
                  {loginAttempts > 2 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                      {loginAttempts}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-xl font-bold font-outfit tracking-wider">
                    LANPAD ADMINISTRATIVE GATE
                  </h1>
                  <p className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                    Administrative authorization token required for entry
                  </p>
                </div>

                <form onSubmit={handleLogin} className="w-full space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Admin Username</label>
                    <div className="relative">
                      <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="Nithin"
                        className={`w-full text-xs rounded-xl pl-10 pr-4 py-3.5 focus:outline-none focus:ring-2 transition-all ${
                          isDark ? "bg-black/40 border border-white/[0.08] text-white focus:ring-indigo-500/30" : "bg-slate-100 border border-black/[0.06] text-black focus:ring-indigo-500/20"
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Access Key</label>
                    <div className="relative">
                      <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••"
                        className={`w-full text-xs rounded-xl pl-10 pr-11 py-3.5 focus:outline-none focus:ring-2 transition-all ${
                          isDark ? "bg-black/40 border border-white/[0.08] text-white focus:ring-indigo-500/30" : "bg-slate-100 border border-black/[0.06] text-black focus:ring-indigo-500/20"
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className={`rounded-md w-3.5 h-3.5 focus:ring-0 ${isDark ? "bg-black/40 border-white/[0.08]" : "bg-slate-100 border-black/[0.06]"}`}
                      />
                      <span className="text-[11px] text-neutral-400">Remember session</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 hover:from-indigo-500 hover:via-fuchsia-500 hover:to-rose-450 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 active:scale-98 transition-all duration-300"
                  >
                    <Unlock size={14} /> Validate Credentials
                  </button>
                </form>

                {loginHistory.length > 0 && (
                  <div className="w-full pt-4 border-t border-white/[0.04] text-left">
                    <span className="text-[9px] uppercase font-bold text-neutral-500 block mb-2">Failed Login Attempts Tracker</span>
                    <div className="space-y-1 max-h-[80px] overflow-y-auto pr-1 text-[10px] scrollbar-thin">
                      {loginHistory.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-neutral-400">
                          <span className="font-mono">{item.time}</span>
                          <span className={item.success ? "text-emerald-400" : "text-rose-400"}>
                            {item.success ? "Success" : "Failed"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          // ==================== PREMIUM SYSTEM CONSOLE LAYOUT ====================
          <motion.div
            key="dashboard-app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-screen relative"
          >
            {/* Sidebar Navigation */}
            <aside className={`border-r shrink-0 flex flex-col justify-between transition-all duration-500 backdrop-blur-3xl sticky top-0 h-screen z-30 ${
              isSidebarExpanded ? "w-64" : "w-20"
            } ${
              isDark ? "bg-[#07070c]/80 border-white/[0.05]" : "bg-white/80 border-black/[0.05]"
            }`}>
              <div className="flex flex-col">
                {/* Logo & Expand Toggle */}
                <div className="h-20 px-6 flex items-center justify-between border-b border-white/[0.03]">
                  {isSidebarExpanded ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center">
                        <Terminal size={14} className="text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-outfit font-black text-xs tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-neutral-400">
                          LANPAD
                        </span>
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-400">
                          Control v1.4
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center mx-auto">
                      <Terminal size={14} className="text-white" />
                    </div>
                  )}

                  <button
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    className={`p-1.5 rounded-lg hover:bg-white/[0.05] text-neutral-400 hover:text-white transition-colors ${
                      !isSidebarExpanded && "hidden"
                    }`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>

                {/* Search Shortcut */}
                {isSidebarExpanded && (
                  <div className="px-6 py-4">
                    <button
                      onClick={() => setIsCommandPaletteOpen(true)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs text-neutral-500 hover:text-neutral-300 transition-colors ${
                        isDark ? "bg-black/30 border-white/[0.05]" : "bg-slate-100 border-black/[0.05]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Search size={12} /> Search...
                      </span>
                      <kbd className="font-mono text-[9px] bg-white/[0.05] border border-white/[0.05] px-1.5 py-0.5 rounded-md">
                        ⌘K
                      </kbd>
                    </button>
                  </div>
                )}

                {/* Navigation Groups */}
                <nav className="px-4 py-6 space-y-6">
                  {/* Category 1: Overview */}
                  <div className="space-y-1">
                    {isSidebarExpanded && (
                      <span className="text-[9px] uppercase font-bold text-neutral-500 px-3 block mb-2">Overview</span>
                    )}
                    <button
                      onClick={() => setCurrentView("dashboard")}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        currentView === "dashboard"
                          ? "bg-gradient-to-tr from-indigo-600/90 to-rose-500/90 text-white shadow-[0_8px_16px_rgba(236,72,153,0.15)]"
                          : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      <Layout size={14} />
                      {isSidebarExpanded && <span>Dashboard</span>}
                    </button>
                    <button
                      onClick={() => setCurrentView("analytics")}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        currentView === "analytics"
                          ? "bg-gradient-to-tr from-indigo-600/90 to-rose-500/90 text-white shadow-[0_8px_16px_rgba(236,72,153,0.15)]"
                          : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      <BarChart3 size={14} />
                      {isSidebarExpanded && <span>Analytics Center</span>}
                    </button>
                  </div>

                  {/* Category 2: Management */}
                  <div className="space-y-1">
                    {isSidebarExpanded && (
                      <span className="text-[9px] uppercase font-bold text-neutral-500 px-3 block mb-2">Management</span>
                    )}
                    <button
                      onClick={() => setCurrentView("users")}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        currentView === "users"
                          ? "bg-gradient-to-tr from-indigo-600/90 to-rose-500/90 text-white shadow-[0_8px_16px_rgba(236,72,153,0.15)]"
                          : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      <Users size={14} />
                      {isSidebarExpanded && <span>User Directory</span>}
                    </button>
                    <button
                      onClick={() => setCurrentView("rbac")}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        currentView === "rbac"
                          ? "bg-gradient-to-tr from-indigo-600/90 to-rose-500/90 text-white shadow-[0_8px_16px_rgba(236,72,153,0.15)]"
                          : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      <ShieldCheck size={14} />
                      {isSidebarExpanded && <span>Roles & Policies</span>}
                    </button>
                    <button
                      onClick={() => setCurrentView("vitcodes")}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        currentView === "vitcodes"
                          ? "bg-gradient-to-tr from-indigo-600/90 to-rose-500/90 text-white shadow-[0_8px_16px_rgba(236,72,153,0.15)]"
                          : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      <Code size={14} />
                      {isSidebarExpanded && <span>VIT-AP Codes</span>}
                    </button>
                  </div>

                  {/* Category 3: System Core */}
                  <div className="space-y-1">
                    {isSidebarExpanded && (
                      <span className="text-[9px] uppercase font-bold text-neutral-500 px-3 block mb-2">Operations</span>
                    )}
                    <button
                      onClick={() => setCurrentView("ota")}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        currentView === "ota"
                          ? "bg-gradient-to-tr from-indigo-600/90 to-rose-500/90 text-white shadow-[0_8px_16px_rgba(236,72,153,0.15)]"
                          : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      <MonitorSmartphone size={14} />
                      {isSidebarExpanded && <span>OTA Templates</span>}
                    </button>
                    <button
                      onClick={() => setCurrentView("system")}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        currentView === "system"
                          ? "bg-gradient-to-tr from-indigo-600/90 to-rose-500/90 text-white shadow-[0_8px_16px_rgba(236,72,153,0.15)]"
                          : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      <Cpu size={14} />
                      {isSidebarExpanded && <span>Diagnostics</span>}
                    </button>
                    <button
                      onClick={() => setCurrentView("security")}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        currentView === "security"
                          ? "bg-gradient-to-tr from-indigo-600/90 to-rose-500/90 text-white shadow-[0_8px_16px_rgba(236,72,153,0.15)]"
                          : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      <Shield size={14} />
                      {isSidebarExpanded && <span>Audit Trail</span>}
                    </button>
                  </div>
                </nav>
              </div>

              {/* User profile footer */}
              <div className="p-4 border-t border-white/[0.03] space-y-2">
                <button
                  onClick={() => setCurrentView("profile")}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-white/[0.03] transition-colors`}
                >
                  <img
                    src={adminAvatar}
                    alt="Admin Avatar"
                    className="w-8 h-8 rounded-full object-cover border border-white/[0.1] shadow-md shrink-0"
                  />
                  {isSidebarExpanded && (
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate text-white">{adminName}</span>
                      <span className="text-[9px] text-neutral-500 truncate">Administrator</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all`}
                >
                  <LogOut size={14} />
                  {isSidebarExpanded && <span>Sign Out</span>}
                </button>
              </div>
            </aside>

            {/* Main view content body */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top Navigation bar */}
              <header className={`h-20 border-b flex items-center justify-between px-8 backdrop-blur-3xl sticky top-0 z-20 ${
                isDark ? "bg-[#020205]/80 border-white/[0.05]" : "bg-white/80 border-black/[0.05]"
              }`}>
                {/* Left controls: menu toggle & breadcrumbs */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    className={`p-2 rounded-xl hover:bg-white/[0.03] text-neutral-400 hover:text-white transition-colors ${
                      isSidebarExpanded && "hidden"
                    }`}
                  >
                    <Menu size={16} />
                  </button>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-neutral-500">deck</span>
                    <ChevronRight size={10} className="text-neutral-600" />
                    <span className="text-indigo-400 font-bold uppercase">{currentView}</span>
                  </div>
                </div>

                {/* Right controls: search, theme, settings */}
                <div className="flex items-center gap-4">
                  {/* Workspace selector */}
                  <select
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value as "production" | "staging")}
                    className={`text-[10px] uppercase font-bold tracking-widest px-3 py-2 rounded-xl border focus:outline-none focus:ring-0 ${
                      isDark ? "bg-black/40 border-white/[0.06] text-white" : "bg-white border-black/[0.06] text-black"
                    }`}
                  >
                    <option value="production">Prod Network</option>
                    <option value="staging">Staging Env</option>
                  </select>

                  {/* Bell trigger */}
                  <button
                    onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
                    className="p-2.5 rounded-xl hover:bg-white/[0.03] text-neutral-400 hover:text-white relative transition-colors"
                  >
                    <Bell size={15} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                  </button>

                  {/* Theme switcher */}
                  <div className={`flex border p-0.5 rounded-xl ${
                    isDark ? "border-white/[0.05] bg-black/40" : "border-black/[0.05] bg-slate-100"
                  }`}>
                    <button
                      onClick={() => setTheme("light")}
                      className={`p-1.5 rounded-lg transition-colors ${theme === "light" ? "bg-white text-black shadow-sm" : "text-neutral-500"}`}
                      title="Light Mode"
                    >
                      <Sun size={12} />
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`p-1.5 rounded-lg transition-colors ${theme === "dark" ? "bg-white/[0.08] text-white shadow-sm" : "text-neutral-500"}`}
                      title="Dark Mode"
                    >
                      <Moon size={12} />
                    </button>
                    <button
                      onClick={() => setTheme("system")}
                      className={`p-1.5 rounded-lg transition-colors ${theme === "system" ? "bg-white/[0.08] text-white shadow-sm" : "text-neutral-500"}`}
                      title="System Preference"
                    >
                      <Monitor size={12} />
                    </button>
                  </div>
                </div>
              </header>

              {/* Dynamic View panels */}
              <div className="flex-1 p-8 max-w-[1600px] w-full mx-auto space-y-8">
                <AnimatePresence mode="wait">
                  {currentView === "dashboard" && (
                    // ==================== VIEW: EXECUTIVE DASHBOARD ====================
                    <motion.div
                      key="dashboard"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-8"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <h2 className="text-2xl font-black font-outfit tracking-wide">
                            EXECUTIVE OVERVIEW
                          </h2>
                          <p className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                            Enterprise health status, sync latency metrics, and real-time logs
                          </p>
                        </div>
                      </div>

                      {/* KPI Summary Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                          { title: "Host Nodes Sync", val: "99.8%", status: "success", label: "Active Connections" },
                          { title: "Total Database Qs", val: totalQuestionsCount.toString(), status: "info", label: "VIT exam items cached" },
                          { title: "Average Latency", val: "38ms", status: "success", label: "Outbound WebSockets" },
                          { title: "Active Sessions", val: totalSessionsCount.toString(), status: "warning", label: "Active local instances" }
                        ].map((card, idx) => (
                          <div
                            key={idx}
                            className={`p-6 rounded-[24px] border backdrop-blur-3xl shadow-lg relative overflow-hidden transition-all duration-300 ${
                              isDark ? "bg-[#07070c]/50 border-white/[0.05] shadow-black" : "bg-white border-black/[0.05]"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-450">{card.title}</span>
                              <span className={`w-2 h-2 rounded-full ${
                                card.status === "success" ? "bg-emerald-500 animate-pulse" : card.status === "warning" ? "bg-amber-500" : "bg-indigo-500"
                              }`} />
                            </div>
                            <h3 className="text-3xl font-outfit font-black text-white">{card.val}</h3>
                            <span className="text-[10px] text-neutral-500 mt-1.5 block">{card.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Analytics Charts & Security Audit */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Interactive SVG User Activity Chart */}
                        <div className={`lg:col-span-8 p-6 rounded-[28px] border backdrop-blur-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[350px] ${
                          isDark ? "bg-[#07070c]/50 border-white/[0.05] shadow-black" : "bg-white border-black/[0.05]"
                        }`}>
                          <div className="flex justify-between items-center pb-4 border-b border-white/[0.03] mb-6">
                            <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-neutral-400 uppercase">Interactive User Engagement</h3>
                            <div className="flex items-center gap-1.5 text-[10px] bg-black/45 p-1 rounded-xl border border-white/[0.04] font-mono">
                              <span className="px-2.5 py-1.5 bg-rose-500/10 text-rose-400 font-bold rounded-lg">Daily</span>
                              <span className="px-2.5 py-1.5 text-neutral-500 hover:text-neutral-350 cursor-pointer">Weekly</span>
                              <span className="px-2.5 py-1.5 text-neutral-500 hover:text-neutral-350 cursor-pointer">Monthly</span>
                            </div>
                          </div>

                          {/* SVG simulated line graph */}
                          <div className="flex-1 w-full h-44 relative">
                            <svg className="w-full h-full" viewBox="0 0 500 150">
                              <defs>
                                <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#6366f1" />
                                  <stop offset="50%" stopColor="#ec4899" />
                                  <stop offset="100%" stopColor="#f43f5e" />
                                </linearGradient>
                                <linearGradient id="gradient-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.2" />
                                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              {/* Grid lines */}
                              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                              <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                              <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                              
                              {/* Filled path */}
                              <path d="M0 130 Q 80 120, 150 60 T 300 90 T 450 40 T 500 20 L 500 150 L 0 150 Z" fill="url(#gradient-fill)" />
                              {/* Stroke line */}
                              <path d="M0 130 Q 80 120, 150 60 T 300 90 T 450 40 T 500 20" fill="none" stroke="url(#gradient-line)" strokeWidth="3.5" strokeLinecap="round" />
                            </svg>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono mt-4 pt-3 border-t border-white/[0.03]">
                            <span>00:00 (Idle)</span>
                            <span>12:00 (Peak Sync)</span>
                            <span>23:59 (Current)</span>
                          </div>
                        </div>

                        {/* Recent Actions / Security Events */}
                        <div className={`lg:col-span-4 p-6 rounded-[28px] border backdrop-blur-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[350px] ${
                          isDark ? "bg-[#07070c]/50 border-white/[0.05] shadow-black" : "bg-white border-black/[0.05]"
                        }`}>
                          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-rose-500 to-indigo-500/20" />
                          <div className="flex justify-between items-center pb-4 border-b border-white/[0.03] mb-4">
                            <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-neutral-400 uppercase">Recent System Events</h3>
                            <button
                              onClick={fetchVitCodes}
                              className="p-1 rounded-lg text-neutral-500 hover:text-white transition-colors"
                            >
                              <RefreshCw size={12} className="animate-spin-slow" />
                            </button>
                          </div>

                          <div className="flex-1 space-y-4 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
                            {securityLogs.slice(0, 4).map((log) => (
                              <div key={log.id} className="flex justify-between items-start gap-4 text-xs">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-neutral-200 block leading-tight">{log.event}</span>
                                  <span className="text-[10px] text-neutral-500 font-mono block">{log.timestamp} • IP: {log.ip}</span>
                                </div>
                                <span className={`text-[9px] px-2 py-0.5 font-bold rounded-lg font-mono tracking-wider uppercase shrink-0 ${
                                  log.status === "success"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                                    : log.status === "failed"
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                                }`}>
                                  {log.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentView === "users" && (
                    // ==================== VIEW: USER DIRECTORY ====================
                    <motion.div
                      key="users"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-6"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <h2 className="text-xl font-black font-outfit tracking-wide uppercase">User Directory</h2>
                          <p className="text-xs text-neutral-500">Edit database roles, suspend credentials, or audit signatures</p>
                        </div>
                        <button
                          onClick={exportUsersCSV}
                          className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 hover:from-indigo-500 hover:via-fuchsia-500 hover:to-rose-450 text-white font-bold text-xs shadow-md"
                        >
                          <Download size={13} /> Export Users CSV
                        </button>
                      </div>

                      {/* Filters */}
                      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                      }`}>
                        <div className="relative w-full md:w-80">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                          <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 ${
                              isDark ? "bg-black/40 border border-white/[0.06] text-white focus:ring-indigo-500/30" : "bg-slate-100 border border-black/[0.06] text-black focus:ring-indigo-500/20"
                            }`}
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] uppercase font-bold text-neutral-500">Filter Role:</span>
                          <select
                            value={userRoleFilter}
                            onChange={(e) => setUserRoleFilter(e.target.value)}
                            className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${
                              isDark ? "bg-black/40 border-white/[0.06] text-white" : "bg-white border-black/[0.06] text-black"
                            }`}
                          >
                            <option value="all">All Roles</option>
                            <option value="Super Admin">Super Admin</option>
                            <option value="Developer">Developer</option>
                            <option value="Auditor">Auditor</option>
                            <option value="Contributor">Contributor</option>
                          </select>
                        </div>
                      </div>

                      {/* Tables */}
                      <div className={`rounded-2xl border overflow-hidden ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                      }`}>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={`border-b text-[10px] uppercase font-extrabold tracking-widest text-neutral-450 ${
                              isDark ? "bg-[#0c0c14]/40 border-white/[0.04]" : "bg-slate-100 border-black/[0.04]"
                            }`}>
                              <th className="p-4 pl-6">Verified</th>
                              <th className="p-4">Name</th>
                              <th className="p-4">Email</th>
                              <th className="p-4">Role</th>
                              <th className="p-4">Activity</th>
                              <th className="p-4 pr-6 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {filteredUsers.map(user => (
                              <tr key={user.id} className="text-xs hover:bg-white/[0.01] transition-colors">
                                <td className="p-4 pl-6">
                                  <button
                                    onClick={() => toggleVerifyUser(user.id)}
                                    className={`p-1.5 rounded-lg border ${
                                      user.verified
                                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                        : "bg-neutral-900 border-white/[0.05] text-neutral-600"
                                    }`}
                                    title="Toggle verification"
                                  >
                                    <CheckSquare size={13} />
                                  </button>
                                </td>
                                <td className="p-4 font-bold text-white">{user.name}</td>
                                <td className="p-4 text-neutral-400">{user.email}</td>
                                <td className="p-4">
                                  <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-md font-mono">
                                    {user.role}
                                  </span>
                                </td>
                                <td className="p-4 text-neutral-500 font-mono text-[10px]">{user.activity}</td>
                                <td className="p-4 pr-6 text-right space-x-2">
                                  <button
                                    onClick={() => toggleBanUser(user.id)}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all ${
                                      user.status === "suspended"
                                        ? "bg-rose-500/20 border border-rose-500/30 text-rose-400"
                                        : "bg-white/[0.02] border border-white/[0.05] text-neutral-400 hover:text-white"
                                    }`}
                                  >
                                    {user.status === "suspended" ? "Unsuspend" : "Suspend"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {currentView === "rbac" && (
                    // ==================== VIEW: ROLES & Access CONTROL MATRIX ====================
                    <motion.div
                      key="rbac"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-6"
                    >
                      <div className="space-y-1">
                        <h2 className="text-xl font-black font-outfit tracking-wide uppercase">Roles & Policy Matrix</h2>
                        <p className="text-xs text-neutral-500">Configure Role-Based Access Controls (RBAC) across system layers</p>
                      </div>

                      <div className={`rounded-2xl border overflow-hidden ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                      }`}>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={`border-b text-[10px] uppercase font-extrabold tracking-widest text-neutral-450 ${
                              isDark ? "bg-[#0c0c14]/40 border-white/[0.04]" : "bg-slate-100 border-black/[0.04]"
                            }`}>
                              <th className="p-5 pl-6">Role Target</th>
                              {["users", "rbac", "analytics", "content", "system", "security", "settings"].map(mod => (
                                <th key={mod} className="p-5 text-center">{mod}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {Object.entries(rbacMatrix).map(([role, permissions]) => (
                              <tr key={role} className="text-xs hover:bg-white/[0.01] transition-colors">
                                <td className="p-5 pl-6 font-bold text-white">{role}</td>
                                {Object.entries(permissions).map(([moduleName, hasPermission]) => (
                                  <td key={moduleName} className="p-5 text-center">
                                    <button
                                      onClick={() => toggleRbacPermission(role, moduleName)}
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center border mx-auto transition-all ${
                                        hasPermission
                                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                          : "bg-rose-500/10 border-rose-500/30 text-rose-450"
                                      }`}
                                    >
                                      {hasPermission ? <CheckSquare size={13} /> : <AlertTriangle size={13} />}
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

                  {currentView === "analytics" && (
                    // ==================== VIEW: ANALYTICS CENTER ====================
                    <motion.div
                      key="analytics"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                      {/* Funnel Graph */}
                      <div className={`p-6 rounded-[28px] border backdrop-blur-3xl shadow-lg relative overflow-hidden flex flex-col justify-between ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05] shadow-black" : "bg-white border-black/[0.05]"
                      }`}>
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500 via-rose-500 to-transparent" />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-indigo-400 uppercase mb-6">User Acquisition Funnel</h3>
                        
                        <div className="space-y-4">
                          {[
                            { step: "Discovery Scan", val: "100%", width: "w-full", color: "from-indigo-600 to-indigo-500" },
                            { step: "Active WebSockets", val: "84%", width: "w-[84%]", color: "from-fuchsia-600 to-fuchsia-500" },
                            { step: "Intelligent Injection", val: "62%", width: "w-[62%]", color: "from-rose-600 to-rose-500" },
                            { step: "Local Cache Session", val: "48%", width: "w-[48%]", color: "from-amber-600 to-amber-500" }
                          ].map((step, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-neutral-300">{step.step}</span>
                                <span className="font-mono text-neutral-400">{step.val}</span>
                              </div>
                              <div className="h-4 bg-black/40 rounded-xl overflow-hidden border border-white/[0.04]">
                                <div className={`h-full bg-gradient-to-r ${step.color} rounded-xl ${step.width}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cohort retention */}
                      <div className={`p-6 rounded-[28px] border backdrop-blur-3xl shadow-lg relative overflow-hidden flex flex-col justify-between ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05] shadow-black" : "bg-white border-black/[0.05]"
                      }`}>
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-rose-500 to-indigo-500/20" />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-rose-400 uppercase mb-6">Device Retention Cohorts</h3>
                        
                        <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-mono">
                          <div className="font-sans font-bold text-left pl-2 text-neutral-400">Cohort</div>
                          <div>Day 1</div>
                          <div>Day 3</div>
                          <div>Day 7</div>
                          <div>Day 30</div>
                          
                          {["June 01", "June 03", "June 07"].map((cohort, idx) => (
                            <>
                              <div key={idx} className="text-left font-sans font-semibold pl-2 py-2 text-neutral-200 border-t border-white/[0.02]">{cohort}</div>
                              <div className="bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/10 py-2">92%</div>
                              <div className="bg-emerald-500/15 text-emerald-400 rounded border border-emerald-500/10 py-2">78%</div>
                              <div className="bg-indigo-500/15 text-indigo-400 rounded border border-indigo-500/10 py-2">64%</div>
                              <div className="bg-rose-500/10 text-rose-450 rounded border border-rose-500/10 py-2">45%</div>
                            </>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentView === "vitcodes" && (
                    // ==================== VIEW: VIT-AP CODES MANAGER ====================
                    <motion.div
                      key="vitcodes"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
                    >
                      {/* Sub-Panel 1: Add Session Form */}
                      <div className="lg:col-span-3 space-y-6">
                        <div className={`border rounded-[28px] p-6 shadow-lg backdrop-blur-3xl space-y-5 relative overflow-hidden ${
                          isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                        }`}>
                          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
                          
                          <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
                            <h2 className="text-[10px] font-extrabold tracking-[0.2em] text-neutral-300 uppercase flex items-center gap-2">
                              <CalendarDays size={14} className="text-rose-400" /> Create Session
                            </h2>
                            
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setShowManageExamTypes(!showManageExamTypes);
                                  setShowAddExamType(false);
                                }}
                                className={`text-[9px] px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                  showManageExamTypes 
                                    ? "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                                    : "bg-white/[0.02] border border-white/[0.05] text-neutral-300"
                                }`}
                              >
                                <Settings size={10} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 block">Session Title</label>
                              <input
                                type="text"
                                placeholder="e.g. Lab Assessment 1"
                                value={newSessionTitle}
                                onChange={(e) => setNewSessionTitle(e.target.value)}
                                className={`w-full text-xs rounded-xl px-3.5 py-3 focus:outline-none focus:ring-1 transition-all ${
                                  isDark ? "bg-black/40 border border-white/[0.06] text-white focus:border-rose-500/50 focus:ring-rose-500/20" : "bg-slate-100 border border-black/[0.06] text-black focus:ring-indigo-500/20"
                                }`}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 block">Date</label>
                                <input
                                  type="date"
                                  value={newDate}
                                  onChange={(e) => setNewDate(e.target.value)}
                                  className={`w-full text-xs rounded-xl px-3.5 py-3 focus:outline-none ${
                                    isDark ? "bg-black/40 border border-white/[0.06] text-white" : "bg-slate-100 border border-black/[0.06] text-black"
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 block">Exam Type</label>
                                <select
                                  value={newExamType}
                                  onChange={(e) => setNewExamType(e.target.value)}
                                  className={`w-full text-xs rounded-xl px-3 py-3 focus:outline-none cursor-pointer ${
                                    isDark ? "bg-black/40 border border-white/[0.06] text-white" : "bg-slate-100 border border-black/[0.06] text-black"
                                  }`}
                                >
                                  {examTypes.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <button
                              onClick={handleAddSession}
                              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 hover:from-indigo-500 hover:via-fuchsia-500 hover:to-rose-450 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                              <Plus size={14} /> Add Session
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Sub-Panel 2: Active Sessions Directory */}
                      <div className="lg:col-span-4 space-y-6">
                        <div className={`border rounded-[28px] p-6 shadow-lg backdrop-blur-3xl relative overflow-hidden min-h-[400px] ${
                          isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                        }`}>
                          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
                          
                          <div className="flex justify-between items-center pb-3 border-b border-white/[0.04] mb-4">
                            <h2 className="text-[10px] font-extrabold tracking-[0.2em] text-neutral-300 uppercase flex items-center gap-2">
                              <Filter size={12} className="text-rose-400" /> Exam Sessions
                            </h2>
                          </div>

                          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
                            {vitSessions.map(s => (
                              <div
                                key={s.id}
                                onClick={() => setActiveSessionId(s.id)}
                                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between group ${
                                  activeSessionId === s.id
                                    ? "border-rose-500/30 bg-rose-500/10 text-rose-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                                    : "border-white/[0.04] bg-black/20 hover:bg-white/[0.03] text-neutral-300"
                                }`}
                              >
                                <div className="space-y-1">
                                  <span className="text-xs font-bold block">{s.title || s.date}</span>
                                  <span className="text-[9px] text-neutral-500 font-mono block">{s.date} • {s.examType}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-mono bg-black/40 px-2.5 py-0.5 rounded-md text-neutral-400 font-bold border border-white/[0.05]">
                                    {s.questions.length} Qs
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                                    className="p-1.5 rounded-lg text-neutral-550 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Sub-Panel 3: Question Editor */}
                      <div className="lg:col-span-5 space-y-6">
                        {activeSession ? (
                          <>
                            <div className={`border rounded-[28px] p-6 shadow-lg backdrop-blur-3xl relative overflow-hidden space-y-5 ${
                              isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                            }`}>
                              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500" />
                              <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-rose-400 uppercase flex items-center gap-2">
                                <Plus size={14} /> Add Code Question
                              </h3>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                  <label className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 block">Question Title</label>
                                  <input
                                    type="text"
                                    value={qTitle}
                                    placeholder="e.g. Matrix Transpose"
                                    onChange={(e) => setQTitle(e.target.value)}
                                    className={`w-full text-xs rounded-xl px-3.5 py-3 focus:outline-none focus:ring-1 transition-all ${
                                      isDark ? "bg-black/40 border border-white/[0.06] text-white focus:border-rose-500/50 focus:ring-rose-500/20" : "bg-slate-100 border border-black/[0.06] text-black focus:ring-indigo-500/20"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 block">Code Language</label>
                                  <select
                                    value={qLang}
                                    onChange={(e) => setQLang(e.target.value)}
                                    className={`w-full text-xs rounded-xl px-3 py-3 focus:outline-none cursor-pointer ${
                                      isDark ? "bg-black/40 border border-white/[0.06] text-white" : "bg-slate-100 border border-black/[0.06] text-black"
                                    }`}
                                  >
                                    <option value="cpp">C++ (cpp)</option>
                                    <option value="python">Python</option>
                                    <option value="java">Java</option>
                                    <option value="javascript">JavaScript</option>
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider block">Source Code</label>
                                <textarea
                                  value={qCode}
                                  placeholder="Paste source code block here..."
                                  onChange={(e) => setQCode(e.target.value)}
                                  className={`w-full h-40 text-xs font-mono rounded-xl p-4 focus:outline-none resize-none ${
                                    isDark ? "bg-black/40 border border-white/[0.06] text-rose-350" : "bg-slate-100 border border-black/[0.06] text-rose-800"
                                  }`}
                                />
                              </div>

                              <div className="flex justify-end">
                                <button
                                  onClick={handleAddQuestion}
                                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 hover:from-indigo-500 hover:via-fuchsia-500 hover:to-rose-400 text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95"
                                >
                                  <Plus size={13} /> Add Question
                                </button>
                              </div>
                            </div>

                            {/* Questions list */}
                            <div className="space-y-4">
                              {activeSession.questions.map((q, idx) => (
                                <div key={q.id} className={`border rounded-2xl overflow-hidden shadow-sm ${
                                  isDark ? "bg-[#07070c]/30 border-white/[0.04]" : "bg-white border-black/[0.04]"
                                }`}>
                                  <div className="px-4 py-3 bg-[#0c0c14]/40 border-b border-white/[0.03] flex justify-between items-center">
                                    <span className="text-xs font-bold text-white">{idx+1}. {q.title}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{q.language}</span>
                                      <button
                                        onClick={() => handleDeleteQuestion(q.id)}
                                        className="p-1 rounded text-neutral-500 hover:text-rose-450"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                  <pre className="p-4 bg-black/40 text-[10px] font-mono text-neutral-400 overflow-x-auto max-h-40">
                                    <code>{q.code}</code>
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="py-20 text-center border border-dashed border-white/[0.05] rounded-[28px] text-xs text-neutral-600">
                            Select a session from the list to manage question templates.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {currentView === "ota" && (
                    // ==================== VIEW: OTA TEMPLATES REDESIGN ====================
                    <motion.div
                      key="ota"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
                    >
                      {/* Left Panel: Select Template */}
                      <div className="lg:col-span-3 space-y-6">
                        <div className={`border rounded-[28px] p-6 shadow-lg backdrop-blur-3xl space-y-4 relative overflow-hidden ${
                          isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                        }`}>
                          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
                          <h2 className="text-[10px] font-extrabold tracking-[0.2em] text-neutral-300 uppercase flex items-center gap-2 pb-2 border-b border-white/[0.04]">
                            <Layout size={13} className="text-rose-400" /> Choose File
                          </h2>
                          
                          <div className="space-y-2">
                            {["center.html", "index.html"].map(file => (
                              <button
                                key={file}
                                onClick={() => setSelectedFile(file as any)}
                                className={`w-full text-left p-4 rounded-2xl flex items-center gap-3.5 transition-all border ${
                                  selectedFile === file
                                    ? "border-rose-500/30 bg-rose-50/10 text-rose-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                                    : "border-white/[0.04] bg-black/25 text-neutral-400 hover:bg-white/[0.02]"
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                  selectedFile === file ? "bg-rose-500/15" : "bg-white/[0.04]"
                                }`}>
                                  {file === "center.html" ? <MonitorSmartphone size={16} /> : <FileCode size={16} />}
                                </div>
                                <div className="text-xs">
                                  <p className="font-bold">{file}</p>
                                  <p className="text-[10px] text-neutral-500 font-normal">
                                    {file === "center.html" ? "Mobile Command Center" : "Mobile Landing Page"}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Panel: Source Code Editor */}
                      <div className="lg:col-span-9 border border-white/[0.05] bg-[#07070c]/30 backdrop-blur-3xl rounded-[28px] overflow-hidden flex flex-col min-h-[580px] relative shadow-2xl">
                        <div className="px-6 py-4 bg-[#0c0c14]/80 border-b border-white/[0.04] flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
                              <Globe size={12} className="text-indigo-400" />
                            </div>
                            <span className="text-xs font-bold font-mono tracking-wide text-neutral-250">{selectedFile}</span>
                            {usingCustom && (
                              <span className="text-[8px] tracking-wider uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-md animate-pulse">
                                Overridden Active
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleResetOta}
                              disabled={loadingOta}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:text-white disabled:opacity-50 text-xs font-semibold transition-all active:scale-[0.98]"
                            >
                              <RotateCcw size={13} /> Reset
                            </button>
                            <button
                              onClick={handleSaveOta}
                              disabled={loadingOta || savingOta}
                              className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 hover:from-indigo-500 hover:via-fuchsia-500 hover:to-rose-400 disabled:opacity-50 text-xs font-bold transition-all text-white shadow-md active:scale-[0.98]"
                            >
                              <Save size={13} /> {savingOta ? "Deploying..." : "Publish Template"}
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 relative bg-black/45 flex flex-col min-h-[450px]">
                          {loadingOta && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-3">
                              <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                              <span className="text-xs text-neutral-450 font-mono">Syncing code block...</span>
                            </div>
                          )}
                          <div className="absolute top-0 bottom-0 left-0 w-12 bg-[#09090f]/30 border-r border-white/[0.02] flex flex-col items-center py-6 text-[10px] font-mono text-neutral-600 select-none leading-relaxed">
                            {Array.from({ length: 22 }).map((_, i) => (
                              <span key={i} className="h-5">{i + 1}</span>
                            ))}
                          </div>
                          <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="flex-1 bg-transparent text-rose-350/80 font-mono text-xs pl-16 pr-6 py-6 focus:outline-none resize-none leading-relaxed selection:bg-rose-500/20"
                            placeholder="<!-- Custom Template Source Code -->"
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentView === "system" && (
                    // ==================== VIEW: DIAGNOSTICS & SYSTEM MONITORING ====================
                    <motion.div
                      key="system"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                      {/* Cpu Gauge */}
                      <div className={`p-6 rounded-[28px] border backdrop-blur-3xl shadow-lg relative overflow-hidden flex flex-col justify-between ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05] shadow-black" : "bg-white border-black/[0.05]"
                      }`}>
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-neutral-400 uppercase mb-4 flex items-center gap-2">
                          <Cpu size={12} className="text-indigo-400" /> Host CPU Usage
                        </h3>
                        <div className="flex flex-col items-center justify-center py-6 space-y-4">
                          <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="8" />
                              <circle cx="50" cy="50" r="40" fill="none" stroke="url(#gradient-line)" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="188.4" strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-2xl font-black font-outfit text-white">25%</span>
                          </div>
                          <span className="text-xs text-neutral-500 font-mono">Platform thread pooling idle</span>
                        </div>
                      </div>

                      {/* Memory Gauge */}
                      <div className={`p-6 rounded-[28px] border backdrop-blur-3xl shadow-lg relative overflow-hidden flex flex-col justify-between ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05] shadow-black" : "bg-white border-black/[0.05]"
                      }`}>
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-neutral-400 uppercase mb-4 flex items-center gap-2">
                          <HardDrive size={12} className="text-rose-450" /> System RAM Usage
                        </h3>
                        <div className="flex flex-col items-center justify-center py-6 space-y-4">
                          <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="8" />
                              <circle cx="50" cy="50" r="40" fill="none" stroke="url(#gradient-line)" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="125.6" strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-2xl font-black font-outfit text-white">50%</span>
                          </div>
                          <span className="text-xs text-neutral-500 font-mono">1.2 GB cached memory resident</span>
                        </div>
                      </div>

                      {/* Database Status card */}
                      <div className={`p-6 rounded-[28px] border backdrop-blur-3xl shadow-lg relative overflow-hidden flex flex-col justify-between ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05] shadow-black" : "bg-white border-black/[0.05]"
                      }`}>
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-neutral-400 uppercase mb-4 flex items-center gap-2">
                          <Database size={12} className="text-rose-400" /> Database Status
                        </h3>
                        <div className="space-y-4 py-4 text-xs font-mono">
                          <div className="flex justify-between border-b border-white/[0.02] pb-2">
                            <span className="text-neutral-400">Connection Engine</span>
                            <span className="text-emerald-400">PostgreSQL Live</span>
                          </div>
                          <div className="flex justify-between border-b border-white/[0.02] pb-2">
                            <span className="text-neutral-400">Session Buffer Pool</span>
                            <span className="text-white">Active</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Total Transactions</span>
                            <span className="text-indigo-400">2,450 commits</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentView === "security" && (
                    // ==================== VIEW: SECURITY CENTRE ====================
                    <motion.div
                      key="security"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-6"
                    >
                      <div className="space-y-1">
                        <h2 className="text-xl font-black font-outfit tracking-wide uppercase">Audit History</h2>
                        <p className="text-xs text-neutral-500">View failed system logins and session access metrics</p>
                      </div>

                      <div className={`rounded-2xl border overflow-hidden ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                      }`}>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={`border-b text-[10px] uppercase font-extrabold tracking-widest text-neutral-450 ${
                              isDark ? "bg-[#0c0c14]/40 border-white/[0.04]" : "bg-slate-100 border-black/[0.04]"
                            }`}>
                              <th className="p-4 pl-6">ID</th>
                              <th className="p-4">Time</th>
                              <th className="p-4">Administrative Event</th>
                              <th className="p-4">Target User</th>
                              <th className="p-4">Host Node IP</th>
                              <th className="p-4 pr-6 text-right">Severity</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {securityLogs.map(log => (
                              <tr key={log.id} className="text-xs hover:bg-white/[0.01] transition-colors">
                                <td className="p-4 pl-6 font-mono text-neutral-500">{log.id}</td>
                                <td className="p-4 font-mono text-neutral-450">{log.timestamp}</td>
                                <td className="p-4 font-bold text-white">{log.event}</td>
                                <td className="p-4 text-neutral-400">{log.user}</td>
                                <td className="p-4 text-neutral-500 font-mono">{log.ip}</td>
                                <td className="p-4 pr-6 text-right">
                                  <span className={`text-[8px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-md border ${
                                    log.status === "failed"
                                      ? "bg-rose-500/15 border-rose-500/20 text-rose-400"
                                      : log.status === "warning"
                                      ? "bg-amber-500/15 border-amber-500/20 text-amber-400"
                                      : "bg-emerald-500/15 border-emerald-500/20 text-emerald-400"
                                  }`}>
                                    {log.status === "failed" ? "Critical" : log.status === "warning" ? "Warning" : "Info"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {currentView === "settings" && (
                    // ==================== VIEW: SYSTEM SETTINGS ====================
                    <motion.div
                      key="settings"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                      <div className={`p-6 rounded-[28px] border backdrop-blur-3xl shadow-lg relative overflow-hidden space-y-6 ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                      }`}>
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-indigo-400 uppercase">General System Preferences</h3>
                        
                        <div className="space-y-4">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-semibold text-neutral-300">Verbose System Debug Logs</span>
                            <input type="checkbox" defaultChecked className="rounded-md w-4 h-4" />
                          </label>
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-semibold text-neutral-300">Automatic Backup Schedule</span>
                            <input type="checkbox" defaultChecked className="rounded-md w-4 h-4" />
                          </label>
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-semibold text-neutral-300">Multi-Node API Proxying</span>
                            <input type="checkbox" className="rounded-md w-4 h-4" />
                          </label>
                        </div>
                      </div>

                      <div className={`p-6 rounded-[28px] border backdrop-blur-3xl shadow-lg relative overflow-hidden space-y-6 ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                      }`}>
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-rose-500 to-indigo-500/20" />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-rose-450 uppercase">Branding & Endpoint Configuration</h3>
                        
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-neutral-450 block">Console Brand Label</span>
                            <input type="text" defaultValue="LANpad Control" className={`w-full text-xs rounded-xl px-3.5 py-2.5 focus:outline-none ${
                              isDark ? "bg-black/40 border border-white/[0.06] text-white" : "bg-slate-100 border border-black/[0.06] text-black"
                            }`} />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-neutral-450 block">Local IP Proxy Binding</span>
                            <input type="text" defaultValue="0.0.0.0:8000" className={`w-full text-xs rounded-xl px-3.5 py-2.5 focus:outline-none ${
                              isDark ? "bg-black/40 border border-white/[0.06] text-white" : "bg-slate-100 border border-black/[0.06] text-black"
                            }`} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentView === "profile" && (
                    // ==================== VIEW: PROFILE & PASSWORD MANAGEMENT ====================
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                      {/* Edit Profile */}
                      <form onSubmit={handleUpdateProfile} className={`p-6 rounded-[28px] border backdrop-blur-3xl shadow-lg relative overflow-hidden space-y-6 ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                      }`}>
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-indigo-400 uppercase">Profile Settings</h3>
                        
                        <div className="flex items-center gap-5">
                          <img
                            src={adminAvatar}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full object-cover border border-white/[0.1] shadow-lg"
                          />
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Avatar image URL</span>
                            <input
                              type="text"
                              value={adminAvatar}
                              onChange={(e) => setAdminAvatar(e.target.value)}
                              className={`text-xs rounded-xl px-3 py-2 w-60 focus:outline-none ${
                                isDark ? "bg-black/40 border border-white/[0.06] text-white" : "bg-slate-100 border border-black/[0.06] text-black"
                              }`}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider block">Admin Fullname</label>
                            <input
                              type="text"
                              value={adminName}
                              onChange={(e) => setAdminName(e.target.value)}
                              className={`w-full text-xs rounded-xl px-3.5 py-3 focus:outline-none ${
                                isDark ? "bg-black/40 border border-white/[0.06] text-white" : "bg-slate-100 border border-black/[0.06] text-black"
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 text-white text-xs font-bold shadow-md"
                          >
                            Update Profile
                          </button>
                        </div>
                      </form>

                      {/* Change Password */}
                      <form onSubmit={handleChangePassword} className={`p-6 rounded-[28px] border backdrop-blur-3xl shadow-lg relative overflow-hidden space-y-6 ${
                        isDark ? "bg-[#07070c]/50 border-white/[0.05]" : "bg-white border-black/[0.05]"
                      }`}>
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-rose-500 to-indigo-500/20" />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] text-rose-450 uppercase">Update Access Key</h3>
                        
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider block">Current Password</label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className={`w-full text-xs rounded-xl px-3.5 py-3 focus:outline-none ${
                                isDark ? "bg-black/40 border border-white/[0.06] text-white" : "bg-slate-100 border border-black/[0.06] text-black"
                              }`}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider block">New Password</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className={`w-full text-xs rounded-xl px-3.5 py-3 focus:outline-none ${
                                isDark ? "bg-black/40 border border-white/[0.06] text-white" : "bg-slate-100 border border-black/[0.06] text-black"
                              }`}
                            />
                            {newPassword && (
                              <div className="flex gap-1 items-center pt-1.5">
                                <span className="text-[9px] uppercase font-bold text-neutral-500">Strength:</span>
                                <div className="flex gap-1 flex-1 max-w-[100px]">
                                  {Array.from({ length: 4 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className={`h-1 flex-1 rounded-sm transition-all duration-350 ${
                                        i < passwordStrength
                                          ? passwordStrength < 3
                                            ? "bg-amber-500"
                                            : "bg-emerald-500"
                                          : "bg-white/[0.06]"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider block">Confirm Password</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className={`w-full text-xs rounded-xl px-3.5 py-3 focus:outline-none ${
                                isDark ? "bg-black/40 border border-white/[0.06] text-white" : "bg-slate-100 border border-black/[0.06] text-black"
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 text-white text-xs font-bold shadow-md"
                          >
                            Update Password
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Notification slide-over drawer */}
            <AnimatePresence>
              {isNotificationCenterOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-sm"
                  onClick={() => setIsNotificationCenterOpen(false)}
                >
                  <motion.div
                    initial={{ x: 300 }}
                    animate={{ x: 0 }}
                    exit={{ x: 300 }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className={`w-80 h-full p-6 border-l flex flex-col justify-between backdrop-blur-3xl ${
                      isDark ? "bg-[#07070c]/90 border-white/[0.06] text-white" : "bg-white border-black/[0.06] text-black"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-6">
                      <div className="flex justify-between items-center pb-3 border-b border-white/[0.04]">
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-450">Alert Logs</h3>
                        <button
                          onClick={() => setIsNotificationCenterOpen(false)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.05] text-neutral-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="space-y-4">
                        {notifications.map(note => (
                          <div key={note.id} className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-neutral-250">{note.title}</span>
                              <span className="text-[8px] text-neutral-500">{note.time}</span>
                            </div>
                            <p className="text-[10px] text-neutral-400 leading-normal">{note.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Command Palette Command Modal */}
            <AnimatePresence>
              {isCommandPaletteOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24 px-4 backdrop-blur-sm"
                  onClick={() => setIsCommandPaletteOpen(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, y: -20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: -20 }}
                    className={`w-full max-w-[550px] rounded-3xl border shadow-2xl p-4 overflow-hidden relative ${
                      isDark ? "bg-[#07070c]/95 border-white/[0.08]" : "bg-white border-black/[0.08]"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative mb-3">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        ref={paletteInputRef}
                        type="text"
                        placeholder="Search dashboard view, toggle theme, logout..."
                        value={paletteQuery}
                        onChange={(e) => setPaletteQuery(e.target.value)}
                        className={`w-full text-xs rounded-2xl pl-10 pr-4 py-3 focus:outline-none ${
                          isDark ? "bg-black/60 border border-white/[0.06] text-white" : "bg-slate-100 border border-black/[0.06] text-black"
                        }`}
                      />
                    </div>

                    <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 text-xs scrollbar-thin">
                      {commandPaletteActions.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={item.action}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-white/[0.03] text-neutral-350 hover:text-white transition-colors"
                        >
                          {item.name}
                        </button>
                      ))}
                      {commandPaletteActions.length === 0 && (
                        <div className="py-8 text-center text-neutral-500 text-xs">No matching system commands found.</div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

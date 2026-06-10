"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, RotateCcw, AlertCircle, CheckCircle, FileCode, MonitorSmartphone, Settings, Plus, Trash2, Award, Calendar, BookOpen, Edit2, Check, X, ChevronRight, ChevronLeft, Terminal, Layout, Globe, Activity, ExternalLink, CalendarDays, Sparkles, Filter, Code, Info } from "lucide-react";
import Link from "next/link";

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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"ota" | "vit">("vit");

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
  
  // New session form states
  const [newDate, setNewDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [newExamType, setNewExamType] = useState<string>("NERD");
  const [newSessionTitle, setNewSessionTitle] = useState<string>("");
  const [examTypes, setExamTypes] = useState<string[]>([
    "NERD",
    "Daily Assessment",
    "Mid Term Exam",
    "Final Term Exam",
    "Coding Challenge"
  ]);
  const [showAddExamType, setShowAddExamType] = useState<boolean>(false);
  const [newExamTypeName, setNewExamTypeName] = useState<string>("");
  const [showManageExamTypes, setShowManageExamTypes] = useState<boolean>(false);
  const [editingExamTypeIndex, setEditingExamTypeIndex] = useState<number | null>(null);
  const [editingExamTypeName, setEditingExamTypeName] = useState<string>("");
  
  // Selected session for editing questions
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [examTypeFilter, setExamTypeFilter] = useState<string | null>(null);
  
  // New question form states
  const [qTitle, setQTitle] = useState<string>("");
  const [qCode, setQCode] = useState<string>("");
  const [qLang, setQLang] = useState<string>("cpp");

  // General Notification state
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });

  const showStatus = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: null, message: "" }), 5000);
  };

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
    if (activeTab === "ota") {
      fetchTemplate(selectedFile);
    } else {
      fetchVitCodes();
    }
  }, [activeTab, selectedFile]);

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

  // Delete session
  const handleDeleteSession = (id: string) => {
    if (!confirm("Are you sure you want to delete this session and all its questions?")) return;
    const updated = vitSessions.filter((s) => s.id !== id);
    handleSaveVitDatabase(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Add new question to active session
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

  // Delete question
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

  return (
    <div className="min-h-screen bg-[#060814] text-neutral-100 relative font-sans antialiased selection:bg-rose-500/30 selection:text-white">
      {/* Premium Background Ambiance (Cosmic Sunset Glows) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[5%] left-[10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[160px] rounded-full animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[5%] right-[10%] w-[50%] h-[50%] bg-rose-500/5 blur-[160px] rounded-full animate-pulse" style={{ animationDuration: '18s' }} />
      </div>

      {/* Premium Carbon Navigation Bar */}
      <header className="mx-6 mt-6 rounded-3xl border border-[#161d33] bg-[#0b0e1a]/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.02),0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl sticky top-6 z-40">
        <div className="max-w-[1600px] mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link 
              href="/" 
              className="group flex items-center justify-center w-10 h-10 rounded-2xl border border-[#1d2642] bg-[#05070f]/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] hover:bg-[#0c0f1d] text-neutral-400 hover:text-white transition-all duration-300"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-fuchsia-600 to-rose-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),0_8px_16px_rgba(244,63,94,0.2)] flex items-center justify-center">
                <Terminal size={16} className="text-white font-bold" />
              </div>
              <div className="flex flex-col">
                <span className="font-outfit font-black text-sm tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-100 to-neutral-400">
                  GLIDEPASS
                </span>
                <span className="text-[9px] uppercase tracking-[0.25em] font-extrabold text-rose-400/90">
                  Control Deck
                </span>
              </div>
            </div>
          </div>

          {/* Premium Selector Tabs */}
          <div className="flex border border-[#161d33] bg-[#04060d]/90 p-1.5 rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveTab("vit")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
                activeTab === "vit" 
                  ? "bg-gradient-to-tr from-indigo-600 via-fuchsia-600 to-rose-500 text-white shadow-[0_8px_16px_rgba(244,63,94,0.25)]" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-[#0f1228]/50"
              }`}
            >
              <Code size={14} />
              <span>VIT-AP Codes</span>
            </button>
            <button
              onClick={() => setActiveTab("ota")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
                activeTab === "ota" 
                  ? "bg-gradient-to-tr from-indigo-600 via-fuchsia-600 to-rose-500 text-white shadow-[0_8px_16px_rgba(244,63,94,0.25)]" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-[#0f1228]/50"
              }`}
            >
              <MonitorSmartphone size={14} />
              <span>OTA Templates</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        {/* Claymorphic status popup */}
        <AnimatePresence>
          {status.message && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              className={`mb-8 p-4 rounded-3xl flex items-center justify-between border shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),0_12px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl ${
                status.type === "success"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  : "bg-[#251020] border-rose-900/40 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-3.5 text-xs font-semibold">
                <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] ${
                  status.type === "success" ? "bg-rose-500/25" : "bg-rose-950/50"
                }`}>
                  {status.type === "success" ? <CheckCircle size={16} className="text-rose-400" /> : <AlertCircle size={16} className="text-rose-400" />}
                </div>
                <span>{status.message}</span>
              </div>
              <button 
                onClick={() => setStatus({ type: null, message: "" })}
                className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "vit" ? (
          // ==================== VIT PORTAL MANAGER (3-COLUMN WORKSPACE DECK) ====================
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* PANEL 1: CONTROL CONSOLE (col-span-3) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="border border-[#161d33] bg-[#0b0e1a]/40 rounded-3xl p-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.02),0_16px_32px_rgba(0,0,0,0.6)] backdrop-blur-md space-y-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
                
                <div className="flex justify-between items-center pb-2">
                  <h2 className="text-xs font-bold tracking-widest text-neutral-400 uppercase flex items-center gap-2">
                    <CalendarDays size={14} className="text-rose-400" /> Create Session
                  </h2>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setShowManageExamTypes(!showManageExamTypes);
                        setShowAddExamType(false);
                      }}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        showManageExamTypes 
                          ? "bg-rose-500/20 border border-rose-500/40 text-rose-300"
                          : "bg-[#05070f]/80 hover:bg-[#0d1026] border border-[#161d33] text-neutral-300"
                      }`}
                      title="Manage Exam Types"
                    >
                      <Settings size={11} /> Types
                    </button>
                    <button
                      onClick={() => {
                        setShowAddExamType(!showAddExamType);
                        setShowManageExamTypes(false);
                      }}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        showAddExamType 
                          ? "bg-rose-500/20 border border-rose-500/40 text-rose-300"
                          : "bg-gradient-to-r from-indigo-600 to-rose-500 text-white shadow-md shadow-rose-500/10"
                      }`}
                    >
                      <Plus size={11} /> Add Type
                    </button>
                  </div>
                </div>
                
                {/* Dynamically sliding manage drawers */}
                <AnimatePresence mode="wait">
                  {showAddExamType && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-[#05070f] border border-rose-500/20 rounded-2xl space-y-3 overflow-hidden"
                    >
                      <label className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block">New Exam Type Name</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newExamTypeName}
                          placeholder="e.g. Daily Assessment"
                          onChange={(e) => setNewExamTypeName(e.target.value)}
                          className="flex-1 text-xs bg-[#0b0e1a] border border-[#1d2642] rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 transition-all font-medium placeholder:text-neutral-600 shadow-inner"
                        />
                        <button
                          onClick={() => {
                            if (newExamTypeName.trim()) {
                              const val = newExamTypeName.trim();
                              setExamTypes(prev => Array.from(new Set([...prev, val])));
                              setNewExamType(val);
                              setNewExamTypeName("");
                              setShowAddExamType(false);
                            }
                          }}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_4px_8px_rgba(244,63,94,0.2)] active:scale-95 transition-all"
                        >
                          Create
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {showManageExamTypes && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-[#05070f] border border-[#161d33] rounded-2xl space-y-3 overflow-hidden"
                    >
                      <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">Configured Types</label>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
                        {examTypes.map((type, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-[#0d1026] border border-[#161d33] gap-2">
                            {editingExamTypeIndex === idx ? (
                              <div className="flex items-center gap-1.5 w-full">
                                <input
                                  type="text"
                                  value={editingExamTypeName}
                                  onChange={(e) => setEditingExamTypeName(e.target.value)}
                                  className="flex-1 text-xs bg-neutral-950 border border-rose-500/30 rounded-lg px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-rose-500/20"
                                />
                                <button
                                  onClick={() => {
                                    if (editingExamTypeName.trim()) {
                                      const oldVal = type;
                                      const newVal = editingExamTypeName.trim();
                                      setExamTypes(prev => prev.map((t, i) => i === idx ? newVal : t));
                                      if (newExamType === oldVal) {
                                        setNewExamType(newVal);
                                      }
                                      setEditingExamTypeIndex(null);
                                      setEditingExamTypeName("");
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingExamTypeIndex(null);
                                    setEditingExamTypeName("");
                                  }}
                                  className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-850"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs font-semibold text-neutral-300">{type}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingExamTypeIndex(idx);
                                      setEditingExamTypeName(type);
                                    }}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-850 transition-colors"
                                    title="Edit label"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Remove "${type}" from list?`)) {
                                        setExamTypes(prev => prev.filter((_, i) => i !== idx));
                                        if (newExamType === type) {
                                          const nextTypes = examTypes.filter((_, i) => i !== idx);
                                          setNewExamType(nextTypes[0] || "");
                                        }
                                      }
                                    }}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                    title="Delete type"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4 pt-1">
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 block">Session Title <span className="text-neutral-600 font-normal">(Optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Session 1, Afternoon Lab"
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      className="w-full text-xs bg-[#05070f] border border-[#161d33] rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all placeholder:text-neutral-700 font-medium shadow-inner"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 block">Date</label>
                      <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full text-xs bg-[#05070f] border border-[#161d33] rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all font-mono font-medium shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 block">Exam Type</label>
                      <select
                        value={newExamType}
                        onChange={(e) => setNewExamType(e.target.value)}
                        className="w-full text-xs bg-[#05070f] border border-[#161d33] rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all font-medium cursor-pointer shadow-inner"
                      >
                        {examTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleAddSession}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 hover:from-indigo-500 hover:via-fuchsia-500 hover:to-rose-400 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_rgba(244,63,94,0.15)] active:scale-[0.98]"
                  >
                    <Plus size={14} /> Add Exam Session
                  </button>
                </div>
              </div>
            </div>

            {/* PANEL 2: DATABASE EXPLORER (col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="border border-[#161d33] bg-[#0b0e1a]/40 rounded-3xl p-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.02),0_16px_32px_rgba(0,0,0,0.6)] backdrop-blur-md space-y-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-500 to-rose-500" />
                
                {examTypeFilter === null ? (
                  <>
                    <h2 className="text-xs font-bold tracking-widest text-neutral-400 uppercase flex items-center gap-2 pb-1">
                      <Filter size={12} className="text-rose-400" /> Active Exam Types
                    </h2>
                    {loadingVit ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-6 h-6 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                        <span className="text-xs text-neutral-500">Loading exam types...</span>
                      </div>
                    ) : Object.keys(
                      vitSessions.reduce((acc: Record<string, VitCode[]>, s) => {
                        (acc[s.examType] = acc[s.examType] || []).push(s);
                        return acc;
                      }, {})
                    ).length === 0 ? (
                      <div className="py-12 border border-dashed border-[#1d2642] rounded-2xl text-center text-xs text-neutral-500">
                        No sessions or types configured.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
                        {Object.entries(
                          vitSessions.reduce((acc: Record<string, VitCode[]>, s) => {
                            (acc[s.examType] = acc[s.examType] || []).push(s);
                            return acc;
                          }, {})
                        ).map(([type, sessions]) => {
                          const dates = sessions.map(s => s.date).sort();
                          const earliest = dates[0];
                          const latest = dates[dates.length - 1];
                          const range = earliest && latest ? `${earliest} → ${latest}` : "";
                          return (
                            <button
                              key={type}
                              onClick={() => setExamTypeFilter(type)}
                              className="w-full text-left p-4 rounded-2xl bg-[#05070f]/40 hover:bg-[#0d1026] border border-[#161d33] hover:border-[#1d2642] shadow-[inset_0_1px_2px_rgba(255,255,255,0.01)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.4)] transition-all flex items-center justify-between group"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded bg-rose-500/20 flex items-center justify-center">
                                    <Award size={10} className="text-rose-400" />
                                  </div>
                                  <span className="text-xs font-bold text-neutral-200 group-hover:text-white transition-colors">{type}</span>
                                </div>
                                {range && (
                                  <span className="text-[10px] text-neutral-500 font-mono block pl-4.5">{range}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 rounded-lg text-rose-400 font-bold">
                                  {sessions.length} Session{sessions.length > 1 ? 's' : ''}
                                </span>
                                <ChevronRight size={14} className="text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-[#161d33] pb-3">
                      <button
                        onClick={() => setExamTypeFilter(null)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5"
                      >
                        <ChevronLeft size={14} /> Back to Types
                      </button>
                      <span className="text-[10px] font-mono bg-[#160c18] text-rose-300 border border-rose-900/60 px-2.5 py-0.5 rounded-lg font-bold">
                        {examTypeFilter}
                      </span>
                    </div>
                    
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
                      {vitSessions
                        .filter(s => s.examType === examTypeFilter)
                        .map(s => (
                          <div
                            key={s.id}
                            onClick={() => setActiveSessionId(s.id)}
                            className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between group ${
                              activeSessionId === s.id
                                ? "border-rose-500/40 bg-rose-500/10 text-rose-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]"
                                : "border-[#161d33] bg-[#05070f]/40 hover:bg-[#0d1026]/60 text-neutral-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.02)]"
                            }`}
                          >
                            <div className="space-y-1">
                              <span className="text-xs font-bold block">
                                {s.title || s.date}
                              </span>
                              {s.title && (
                                <span className="text-[10px] text-neutral-500 font-mono block">{s.date}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono bg-[#05070f] px-2 py-0.5 rounded-md text-neutral-400 font-bold border border-[#161d33] shadow-inner">
                                {s.questions.length} Q
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSession(s.id);
                                }}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                title="Delete session"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* PANEL 3: WORKSPACE EDITOR (col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              {activeSession ? (
                <>
                  {/* Current Session Heading */}
                  <div className="flex justify-between items-center p-5 border border-[#161d33] bg-[#0b0e1a]/20 rounded-3xl backdrop-blur-md shadow-md">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 font-mono">{activeSession.date}</span>
                      <h2 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                        <span>{activeSession.title || activeSession.examType}</span>
                        <span className="text-xs bg-[#160c18] text-rose-400 px-2 py-0.5 rounded font-normal font-sans border border-rose-900/40">{activeSession.examType}</span>
                      </h2>
                    </div>
                    <span className="text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-3.5 py-1.5 rounded-xl font-mono font-bold">
                      {activeSession.questions.length} Question{activeSession.questions.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Add Question Box */}
                  <div className="border border-[#161d33] bg-[#0b0e1a]/40 rounded-3xl p-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.02),0_16px_32px_rgba(0,0,0,0.6)] backdrop-blur-md space-y-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-rose-500" />
                    
                    <h3 className="text-xs font-bold tracking-widest text-rose-400 uppercase flex items-center gap-2">
                      <Plus size={14} /> Add Question to Session
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 block">Question Title</label>
                        <input
                          type="text"
                          value={qTitle}
                          placeholder="e.g. Find First and Last Position of Element"
                          onChange={(e) => setQTitle(e.target.value)}
                          className="w-full text-xs bg-[#05070f] border border-[#161d33] rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all font-medium placeholder:text-neutral-700 shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 block">Code Language</label>
                        <select
                          value={qLang}
                          onChange={(e) => setQLang(e.target.value)}
                          className="w-full text-xs bg-[#05070f] border border-[#161d33] rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all font-medium cursor-pointer shadow-inner"
                        >
                          <option value="cpp">C++ (cpp)</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="javascript">JavaScript</option>
                          <option value="c">C</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-1.5 block">Source Code</label>
                      <div className="relative border border-[#161d33] bg-[#05070f] rounded-2xl overflow-hidden focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500/20 transition-all shadow-inner">
                        <div className="bg-[#0b0e1a]/60 px-4 py-2 flex items-center justify-between border-b border-[#161d33]">
                          <span className="text-[10px] font-mono text-neutral-500 uppercase">{qLang} code block</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/20 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          </span>
                        </div>
                        <textarea
                          value={qCode}
                          placeholder="Paste code snippet here..."
                          onChange={(e) => setQCode(e.target.value)}
                          className="w-full h-56 bg-[#05070f] text-rose-300/90 font-mono text-xs p-4 focus:outline-none resize-none leading-relaxed"
                          spellCheck={false}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleAddQuestion}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 hover:from-indigo-500 hover:via-fuchsia-500 hover:to-rose-400 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-[0_8px_16px_rgba(244,63,94,0.15)] active:scale-95"
                      >
                        <Plus size={14} /> Add Question
                      </button>
                    </div>
                  </div>

                  {/* Configured Questions Grid */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Configured Questions</h3>
                    {activeSession.questions.length === 0 ? (
                      <div className="py-16 border border-dashed border-[#161d33] rounded-3xl text-center text-xs text-neutral-500 flex flex-col items-center gap-3">
                        <Code size={20} className="text-neutral-755" />
                        <span>No questions added to this session yet. Add one above!</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeSession.questions.map((q, idx) => (
                          <div
                            key={q.id}
                            className="border border-[#161d33] bg-[#0b0e1a]/20 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm hover:border-[#1d2642] transition-all duration-300"
                          >
                            <div className="px-5 py-3.5 bg-[#0b0e1a]/60 border-b border-[#161d33] flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold flex items-center justify-center border border-rose-500/20">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-neutral-200">{q.title}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] bg-neutral-950 border border-[#161d33] px-2.5 py-1 rounded-md font-mono font-bold text-rose-300 tracking-wider">
                                  {q.language}
                                </span>
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  title="Remove question"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <pre className="p-4 bg-neutral-950 text-[10px] font-mono text-rose-300/80 overflow-x-auto max-h-52 leading-relaxed scrollbar-thin scrollbar-thumb-neutral-850">
                              <code>{q.code}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-28 text-center border border-dashed border-[#161d33] rounded-3xl text-xs text-neutral-500 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#0b0e1a] flex items-center justify-center border border-[#161d33]">
                    <Info size={20} className="text-neutral-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-neutral-400">No Session Selected</p>
                    <p className="text-[11px] text-neutral-600 max-w-xs">Select a session from the browser or create a new one to begin editing questions.</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : (
          // ==================== OTA MOBILE UI TEMPLATES (2-COLUMN REDESIGN) ====================
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-3 space-y-6">
              <div className="border border-[#161d33] bg-[#0b0e1a]/40 rounded-3xl p-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.02),0_16px_32px_rgba(0,0,0,0.6)] backdrop-blur-md space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-rose-500" />
                <h2 className="text-xs font-bold tracking-widest text-neutral-400 uppercase flex items-center gap-2 pb-1">
                  <Layout size={13} className="text-rose-400" /> Select Template
                </h2>
                
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedFile("center.html")}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl flex items-center gap-3.5 transition-all border ${
                      selectedFile === "center.html"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]"
                        : "border-[#161d33] bg-neutral-950/20 text-neutral-400 hover:bg-[#0d1026]/40 hover:text-neutral-200"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      selectedFile === "center.html" ? "bg-rose-500/20" : "bg-neutral-800/80"
                    }`}>
                      <MonitorSmartphone size={16} />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold">center.html</p>
                      <p className="text-[10px] text-neutral-500 font-normal">Command Center Panel</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setSelectedFile("index.html")}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl flex items-center gap-3.5 transition-all border ${
                      selectedFile === "index.html"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]"
                        : "border-[#161d33] bg-neutral-950/20 text-neutral-400 hover:bg-[#0d1026]/40 hover:text-neutral-200"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      selectedFile === "index.html" ? "bg-rose-500/20" : "bg-neutral-800/80"
                    }`}>
                      <FileCode size={16} />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold">index.html</p>
                      <p className="text-[10px] text-neutral-500 font-normal">Initial Setup Landing</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-9 border border-[#161d33] bg-[#0b0e1a]/30 backdrop-blur-md rounded-3xl overflow-hidden flex flex-col min-h-[620px] relative shadow-2xl">
              {/* Editor Toolbar */}
              <div className="px-6 py-4.5 bg-[#0b0e1a]/60 border-b border-[#161d33] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
                    <Globe size={12} className="text-rose-400" />
                  </div>
                  <span className="text-xs font-bold font-mono tracking-wide text-neutral-200">{selectedFile}</span>
                  {usingCustom && (
                    <span className="text-[8px] tracking-wider uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-md">
                      Overridden Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResetOta}
                    disabled={loadingOta}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#161d33] hover:bg-neutral-800 hover:text-white disabled:opacity-50 text-xs font-semibold transition-all active:scale-[0.98]"
                  >
                    <RotateCcw size={13} />
                    Reset Default
                  </button>

                  <button
                    onClick={handleSaveOta}
                    disabled={loadingOta || savingOta}
                    className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 hover:from-indigo-500 hover:via-fuchsia-500 hover:to-rose-400 disabled:opacity-50 text-xs font-bold transition-all text-white shadow-lg shadow-rose-600/10 active:scale-[0.98]"
                  >
                    <Save size={13} />
                    {savingOta ? "Deploying..." : "Publish Template"}
                  </button>
                </div>
              </div>

              {/* Editor Textarea */}
              <div className="flex-1 relative bg-neutral-950 flex flex-col">
                {loadingOta && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/80 z-10 gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                    <span className="text-xs text-neutral-400">Streaming template contents...</span>
                  </div>
                )}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 min-h-[500px] bg-neutral-950 text-rose-300/90 font-mono text-xs p-6 focus:outline-none resize-none leading-relaxed selection:bg-rose-500/20"
                  placeholder="<!-- Custom Template XML/HTML Source Code -->"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

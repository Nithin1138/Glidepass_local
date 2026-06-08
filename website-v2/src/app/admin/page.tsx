"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, RotateCcw, AlertCircle, CheckCircle, FileCode, MonitorSmartphone, Settings, Plus, Trash2, Award, Calendar, BookOpen, Edit2, Check } from "lucide-react";
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
  const [newDate, setNewDate] = useState<string>("");
  const [newExamType, setNewExamType] = useState<string>("NERD");
  
  // Selected session for editing questions
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
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
      questions: [],
    };
    const updated = [...vitSessions, newSession];
    handleSaveVitDatabase(updated);
    setActiveSessionId(newSession.id);
    setNewDate("");
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
    <div className="min-h-screen bg-black text-white relative font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] right-[20%] w-[35%] h-[35%] bg-rose-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="border-b border-white/[0.06] bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/40 hover:text-white transition-colors duration-200">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-outfit font-black text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                GLIDEPASS
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                Admin Console
              </span>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border border-white/[0.08] bg-white/[0.02] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("vit")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "vit" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-white/40 hover:text-white"
              }`}
            >
              VIT-AP Today's Codes
            </button>
            <button
              onClick={() => setActiveTab("ota")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "ota" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-white/40 hover:text-white"
              }`}
            >
              OTA Mobile UI
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Status notification */}
        <AnimatePresence>
          {status.message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 px-6 py-3 rounded-xl flex items-center justify-between border ${
                status.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400"
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                {status.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                <span>{status.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "vit" ? (
          // ==================== VIT PORTAL MANAGER ====================
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Col: Sessions Grid & Creator */}
            <div className="lg:col-span-4 space-y-6">
              {/* Creator Box */}
              <div className="border border-white/[0.06] bg-white/[0.02] backdrop-blur-md rounded-2xl p-5 space-y-4">
                <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase flex items-center gap-2">
                  <Calendar size={13} className="text-indigo-400" /> Add Exam Session
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1 block">Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full text-xs bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1 block">Exam Type</label>
                    <select
                      value={newExamType}
                      onChange={(e) => setNewExamType(e.target.value)}
                      className="w-full text-xs bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="NERD">NERD</option>
                      <option value="Daily Assessment">Daily Assessment</option>
                      <option value="Mid Term Exam">Mid Term Exam</option>
                      <option value="Final Term Exam">Final Term Exam</option>
                      <option value="Coding Challenge">Coding Challenge</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddSession}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus size={14} /> Add Exam Session
                  </button>
                </div>
              </div>

              {/* Sessions List */}
              <div className="border border-white/[0.06] bg-white/[0.02] backdrop-blur-md rounded-2xl p-5 space-y-4">
                <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase">Active Sessions</h2>
                
                {loadingVit ? (
                  <div className="py-10 text-center text-xs text-white/30">Loading sessions...</div>
                ) : vitSessions.length === 0 ? (
                  <div className="py-10 text-center text-xs text-white/30">No sessions added yet.</div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {vitSessions.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setActiveSessionId(s.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 border cursor-pointer ${
                          activeSessionId === s.id
                            ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                            : "border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Award size={16} className={activeSessionId === s.id ? "text-indigo-400" : "text-white/30"} />
                          <div>
                            <p className="text-xs font-bold">{s.examType}</p>
                            <p className="text-[10px] text-white/30 font-medium">{s.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded font-bold text-white/40 font-mono">
                            {s.questions.length} Q
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(s.id);
                            }}
                            className="p-1 rounded text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Questions Grid & Editor */}
            <div className="lg:col-span-8 space-y-6">
              {activeSession ? (
                <>
                  {/* Current Session Heading */}
                  <div className="flex justify-between items-center p-4 border border-white/[0.06] bg-white/[0.01] rounded-2xl">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 font-mono">{activeSession.date}</span>
                      <h2 className="text-base font-bold text-white leading-tight">{activeSession.examType} Questions</h2>
                    </div>
                    <span className="text-xs text-white/40 font-mono">{activeSession.questions.length} Question(s) Configured</span>
                  </div>

                  {/* Add Question Box */}
                  <div className="border border-white/[0.06] bg-white/[0.02] backdrop-blur-md rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-bold tracking-widest text-indigo-400 uppercase flex items-center gap-2">
                      <Plus size={14} /> Add Question to Session
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1 block">Question Title</label>
                        <input
                          type="text"
                          value={qTitle}
                          placeholder="e.g. Reverse a Linked List"
                          onChange={(e) => setQTitle(e.target.value)}
                          className="w-full text-xs bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1 block">Code Language</label>
                        <select
                          value={qLang}
                          onChange={(e) => setQLang(e.target.value)}
                          className="w-full text-xs bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
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
                      <label className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1 block">Source Code</label>
                      <textarea
                        value={qCode}
                        placeholder="Paste code snippet here..."
                        onChange={(e) => setQCode(e.target.value)}
                        className="w-full h-48 bg-black text-emerald-200/90 border border-white/10 rounded-xl p-4 font-mono text-xs focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleAddQuestion}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/10"
                      >
                        <Plus size={14} /> Add Question
                      </button>
                    </div>
                  </div>

                  {/* Configured Questions Grid */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase">Configured Questions</h3>
                    {activeSession.questions.length === 0 ? (
                      <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center text-xs text-white/30">
                        No questions added to this session yet. Add one above!
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeSession.questions.map((q, idx) => (
                          <div
                            key={q.id}
                            className="border border-white/[0.06] bg-white/[0.01] rounded-xl overflow-hidden"
                          >
                            <div className="px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] flex justify-between items-center">
                              <span className="text-xs font-bold text-white/70">Question {idx + 1}: {q.title}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded font-mono font-bold text-white/50">{q.language}</span>
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1 rounded text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <pre className="p-4 bg-black/60 text-[10px] font-mono text-emerald-300/80 overflow-x-auto max-h-40 leading-normal">
                              <code>{q.code}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl text-xs text-white/30">
                  Select a session from the list or create a new one to manage questions.
                </div>
              )}
            </div>

          </div>
        ) : (
          // ==================== OTA MOBILE UI MANAGER ====================
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="border border-white/[0.06] bg-white/[0.02] backdrop-blur-md rounded-2xl p-5 space-y-4">
                <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase">Select Template</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedFile("center.html")}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 border ${
                      selectedFile === "center.html"
                        ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                        : "border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <MonitorSmartphone size={16} />
                    <div className="text-xs font-semibold">
                      <p className="font-bold">center.html</p>
                      <p className="text-[10px] text-white/30 font-normal">Command Center UI</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedFile("index.html")}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 border ${
                      selectedFile === "index.html"
                        ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                        : "border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <FileCode size={16} />
                    <div className="text-xs font-semibold">
                      <p className="font-bold">index.html</p>
                      <p className="text-[10px] text-white/30 font-normal">Initial Setup Page</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 border border-white/[0.06] bg-white/[0.01] backdrop-blur-md rounded-2xl overflow-hidden flex flex-col min-h-[600px] relative">
              {/* Editor Toolbar */}
              <div className="px-6 py-4 bg-white/[0.02] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-xs font-bold font-mono tracking-wide">{selectedFile}</span>
                  {usingCustom && (
                    <span className="text-[9px] uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded">
                      Custom Override Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResetOta}
                    disabled={loadingOta}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/[0.05] disabled:opacity-50 text-xs font-semibold transition-all"
                  >
                    <RotateCcw size={13} />
                    Reset to GitHub Default
                  </button>

                  <button
                    onClick={handleSaveOta}
                    disabled={loadingOta || savingOta}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <Save size={13} />
                    {savingOta ? "Saving..." : "Save & Live Update"}
                  </button>
                </div>
              </div>

              {/* Editor Textarea */}
              <div className="flex-1 relative">
                {loadingOta && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                      <span className="text-xs text-white/40">Loading template from server...</span>
                    </div>
                  </div>
                )}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full min-h-[500px] bg-black text-indigo-200/90 font-mono text-xs p-6 focus:outline-none focus:ring-0 resize-none selection:bg-indigo-500/30 leading-relaxed"
                  placeholder="<!-- Write your updated HTML template here -->"
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

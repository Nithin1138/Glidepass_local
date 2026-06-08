"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, RotateCcw, AlertCircle, CheckCircle, FileCode, MonitorSmartphone, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [selectedFile, setSelectedFile] = useState<"index.html" | "center.html">("center.html");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  const [usingCustom, setUsingCustom] = useState<boolean>(false);

  // Fetch the current template from our API
  const fetchTemplate = async (fileName: "index.html" | "center.html") => {
    setLoading(true);
    setStatus({ type: null, message: "" });
    try {
      const res = await fetch(`/api/ota?file=${fileName}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${fileName}`);
      }
      const data = await res.text();
      setContent(data);
      
      // Let's check if there is a custom file saved by trying to see if we've stored one.
      // We can also see if our GET response matches the fallback by checking headers or just letting the UI know we retrieved it.
      setUsingCustom(true); // Default to true if retrieved successfully
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to load template" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplate(selectedFile);
  }, [selectedFile]);

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: null, message: "" });
    try {
      const res = await fetch("/api/ota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: selectedFile, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save template");
      }
      setStatus({ type: "success", message: `Successfully updated ${selectedFile} live on mobile site!` });
      setUsingCustom(true);
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to save template" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm(`Are you sure you want to reset ${selectedFile} to its default repository version? This will discard custom admin overrides.`)) {
      return;
    }
    setLoading(true);
    try {
      // Fetch the default one from GitHub to restore
      const otaGithubBase = "https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/templates/";
      const res = await fetch(otaGithubBase + selectedFile);
      if (!res.ok) {
        throw new Error("Failed to fetch default template from GitHub");
      }
      const defaultContent = await res.text();
      setContent(defaultContent);

      // Save the default content back to our server to overwrite the custom one
      const saveRes = await fetch("/api/ota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: selectedFile, content: defaultContent }),
      });
      if (!saveRes.ok) {
        throw new Error("Failed to save reset template");
      }

      setStatus({ type: "success", message: `Successfully reset ${selectedFile} to official repository default.` });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to reset template" });
    } finally {
      setLoading(false);
    }
  };

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
          <div className="flex items-center gap-4 text-xs text-white/50">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.05] bg-white/[0.02]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hybrid OTA Mode Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Panel: Navigation & Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="border border-white/[0.06] bg-white/[0.02] backdrop-blur-md rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase">Select Template</h2>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedFile("center.html")}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 border ${
                    selectedFile === "center.html"
                      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 shadow-indigo-500/5 shadow-md"
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
                      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 shadow-indigo-500/5 shadow-md"
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

            <div className="border border-white/[0.06] bg-white/[0.02] backdrop-blur-md rounded-2xl p-5 space-y-3.5 text-xs text-white/60">
              <div className="flex items-center gap-2 text-white font-bold">
                <Settings size={14} className="text-indigo-400" />
                <span>How Hybrid Update Works</span>
              </div>
              <p className="leading-relaxed">
                GlidePass utilizes a **hybrid Over-The-Air (OTA) architecture** to deliver instant updates to mobile sites:
              </p>
              <ul className="space-y-2 list-disc list-inside text-[11px] text-white/40 leading-relaxed">
                <li>Your admin console updates the website database or local filesystem.</li>
                <li>The GlidePass desktop app fetches updates directly from this API endpoint.</li>
                <li>If the website is down, GlidePass automatically falls back to GitHub raw files.</li>
              </ul>
              <div className="pt-2 flex gap-2">
                <a
                  href="https://github.com/Nithin1138/Glidepass_local/tree/main/templates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <FileCode size={12} />
                  GitHub Repository
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </div>

          {/* Right Panel: Code Editor */}
          <div className="lg:col-span-3 border border-white/[0.06] bg-white/[0.01] backdrop-blur-md rounded-2xl overflow-hidden flex flex-col min-h-[600px] relative">
            {/* Status notifications inside editor */}
            <AnimatePresence>
              {status.message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`px-6 py-3 flex items-center justify-between border-b ${
                    status.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    {status.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                    <span>{status.message}</span>
                  </div>
                  <button onClick={() => setStatus({ type: null, message: "" })} className="text-xs opacity-50 hover:opacity-100">
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

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
                  onClick={handleResetToDefault}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/[0.05] disabled:opacity-50 text-xs font-semibold transition-all"
                >
                  <RotateCcw size={13} />
                  Reset to GitHub Default
                </button>

                <button
                  onClick={handleSave}
                  disabled={loading || saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Save size={13} />
                  {saving ? "Saving..." : "Save & Live Update"}
                </button>
              </div>
            </div>

            {/* Editor Textarea */}
            <div className="flex-1 relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <span className="text-xs text-white/40">Loading template from server...</span>
                  </div>
                </div>
              ) : null}
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
      </main>
    </div>
  );
}

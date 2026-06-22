"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, Terminal, Link2, BookOpen, Tag, CheckCircle2, AlertCircle } from "lucide-react";
import { useCreator } from "../context";

export default function NewResourcePage() {
  const { email, name, licenseKey, dk } = useCreator();

  const formats = [
    { id: "code", label: "Code", icon: Terminal },
    { id: "link", label: "Link", icon: Link2 },
    { id: "text", label: "Text", icon: BookOpen },
  ];

  /* ── Form state ─────────────────────────────────── */
  const [title, setTitle] = useState("");
  const [type, setType] = useState("code");
  const [language, setLanguage] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [selectedHubId, setSelectedHubId] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [error, setError] = useState("");

  /* ── Hub data for selector ─────────────────────── */
  const [hubs, setHubs] = useState<any[]>([]);
  const [joinedHubs, setJoinedHubs] = useState<any[]>([]);

  useEffect(() => {
    if (!email) return;
    (async () => {
      try {
        const res = await fetch("/api/hubs");
        const data = await res.json();
        if (res.ok && data.success) {
          const owned = data.hubs.filter((h: any) => h.creatorEmail.toLowerCase() === email.toLowerCase());
          setHubs(owned);
          const joined: any[] = [];
          for (const h of data.hubs) {
            if (h.creatorEmail.toLowerCase() !== email.toLowerCase()) {
              const r = await fetch(`/api/hubs/${h.id}/contributors`);
              const rd = await r.json();
              if (r.ok && rd.success) {
                const me = rd.contributors.find((c: any) => c.contributorEmail.toLowerCase() === email.toLowerCase());
                if (me?.status === "approved") joined.push(h);
              }
            }
          }
          setJoinedHubs(joined);
        }
      } catch { /* noop */ }
    })();
  }, [email]);

  // Auto-select first hub
  useEffect(() => {
    if (!selectedHubId) {
      if (hubs.length > 0) setSelectedHubId(hubs[0].id);
      else if (joinedHubs.length > 0) setSelectedHubId(joinedHubs[0].id);
    }
  }, [hubs, joinedHubs, selectedHubId]);

  // Dynamic categories list
  const activeHub = [...hubs, ...joinedHubs].find(h => h.id === selectedHubId);
  const categoriesList = activeHub?.categories || (activeHub?.subCategories || []).map((n: string) => ({ name: n }));

  const allowedFormats = activeHub?.allowedTypes && activeHub.allowedTypes.length > 0
    ? formats.filter(f => activeHub.allowedTypes.includes(f.id))
    : formats;

  useEffect(() => {
    if (allowedFormats.length === 1) {
      setType(allowedFormats[0].id);
    } else if (allowedFormats.length > 1 && !allowedFormats.some(f => f.id === type)) {
      setType(allowedFormats[0].id);
    }
  }, [selectedHubId, hubs, joinedHubs, activeHub]);

  useEffect(() => {
    if (categoriesList && categoriesList.length > 0) {
      setCategory(categoriesList[0].name);
    } else {
      setCategory("");
    }
  }, [selectedHubId, hubs, joinedHubs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setPublishing(true);

    if (!selectedHubId && (hubs.length > 0 || joinedHubs.length > 0)) {
      setError("Please select a community hub to publish your resource.");
      setPublishing(false); return;
    }

    const tags = tagsInput.split(",").map(t => t.trim().toLowerCase()).filter(t => t.length > 0);

    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, type,
          language: type === "code" ? language : undefined,
          tags, content, description,
          creatorEmail: email, creatorName: name, licenseKey,
          hubId: selectedHubId || undefined,
          category: category || undefined,
          subCategory: category || undefined
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPublishSuccess(true);
        setTitle(""); setContent(""); setTagsInput(""); setLanguage(""); setDescription(""); setCategory("");
      } else {
        setError(data.error || "Failed to publish resource.");
      }
    } catch (err: any) { setError(err.message || "An unexpected error occurred."); }
    finally { setPublishing(false); }
  }

  // success screen follows



  /* ── Success screen ────────────────────────────── */
  if (publishSuccess) {
    return (
      <div className="px-6 lg:px-10 py-8 lg:py-10 max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className={`w-full max-w-md p-8 rounded-3xl border text-center space-y-4 ${dk
            ? 'bg-emerald-950/10 border-emerald-500/20'
            : 'bg-emerald-50/50 border-emerald-200'
          }`}
        >
          <div className={`inline-flex p-3 rounded-full ${dk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
            <CheckCircle2 size={36} />
          </div>
          <h3 className={`text-xl font-bold ${dk ? 'text-white' : 'text-[#111827]'}`}>Resource Published!</h3>
          <p className={`text-sm ${dk ? 'text-white/50' : 'text-[#6B7280]'}`}>
            Your resource has been added and is now available in the catalog.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={() => setPublishSuccess(false)}
              className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-all ${dk
                ? 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.1] text-white'
                : 'bg-white border-black/[0.06] hover:border-black/[0.1] text-[#111827]'
              }`}
            >
              Publish Another
            </button>
            <Link href="/resources"
              className="bg-gradient-to-r from-[#0077C0] to-[#009BF5] text-xs font-bold px-4 py-2.5 rounded-xl text-white hover:brightness-110 transition-all"
            >
              View Catalog
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className={`text-2xl lg:text-3xl font-black font-outfit tracking-tight ${dk ? 'text-white' : 'text-[#111827]'}`}>
          Create New Resource
        </h1>
        <p className={`text-sm mt-1 ${dk ? 'text-white/40' : 'text-[#6B7280]'}`}>
          Publish code snippets, links, or text to your community hub.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className={`p-6 rounded-2xl border space-y-5 ${dk
            ? 'bg-white/[0.015] border-white/[0.05]'
            : 'bg-white/60 border-black/[0.05] shadow-sm'
          }`}
        >
          {/* Target Hub & Category Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Hub */}
            <div className="space-y-1.5">
              <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>
                Target Hub
              </label>
              <select value={selectedHubId} onChange={e => setSelectedHubId(e.target.value)}
                className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer ${dk
                  ? 'bg-[#0b0b0b] border border-white/[0.06] focus:border-[#0077C0] text-white'
                  : 'bg-[#F9FAFB] border border-black/[0.08] focus:border-[#0077C0] focus:ring-2 focus:ring-[#0077C0]/10 text-[#111827]'
                }`}
              >
                {hubs.length === 0 && joinedHubs.length === 0 && <option value="">Public Catalog</option>}
                {hubs.map(h => <option key={h.id} value={h.id}>Hub: {h.title}</option>)}
                {joinedHubs.map(h => <option key={h.id} value={h.id}>Hub: {h.title}</option>)}
              </select>
            </div>

            {/* Target Category */}
            <div className="space-y-1.5">
              <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>
                Target Category
              </label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                disabled={!categoriesList || categoriesList.length === 0}
                className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer disabled:opacity-50 ${dk
                  ? 'bg-[#0b0b0b] border border-white/[0.06] focus:border-[#0077C0] text-white'
                  : 'bg-[#F9FAFB] border border-black/[0.08] focus:border-[#0077C0] focus:ring-2 focus:ring-[#0077C0]/10 text-[#111827]'
                }`}
              >
                {!categoriesList || categoriesList.length === 0 ? (
                  <option value="">No Categories Available</option>
                ) : (
                  categoriesList.map((cat: any) => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>
              Resource Title
            </label>
            <input type="text" required placeholder="e.g. macOS Setup Script" value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${dk
                ? 'bg-[#0b0b0b] border border-white/[0.06] focus:border-[#0077C0] text-white'
                : 'bg-[#F9FAFB] border border-black/[0.08] focus:border-[#0077C0] focus:ring-2 focus:ring-[#0077C0]/10 text-[#111827]'
              }`}
            />
          </div>

          {/* Format selector (conditional) */}
          {allowedFormats.length > 1 && (
            <div className="space-y-2">
              <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>
                Resource Format
              </label>
              <div className={`flex gap-1.5 p-1 rounded-xl border ${dk ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-[#F3F4F6] border-black/[0.04]'}`}>
                {allowedFormats.map(f => (
                  <button key={f.id} type="button" onClick={() => setType(f.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      type === f.id
                        ? 'bg-[#0077C0] text-white shadow-sm'
                        : dk ? 'text-white/40 hover:text-white/60' : 'text-[#6B7280] hover:text-[#374151]'
                    }`}
                  >
                    <f.icon size={14} /> <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Language (conditional) */}
          {type === "code" && (
            <div className="space-y-1.5">
              <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>
                Language
              </label>
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer ${dk
                  ? 'bg-[#0b0b0b] border border-white/[0.06] focus:border-[#0077C0] text-white'
                  : 'bg-[#F9FAFB] border border-black/[0.08] focus:border-[#0077C0] focus:ring-2 focus:ring-[#0077C0]/10 text-[#111827]'
                }`}
              >
                <option value="">Select Language</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="bash">Bash / Shell</option>
                <option value="powershell">PowerShell</option>
                <option value="yaml">YAML</option>
                <option value="json">JSON</option>
                <option value="cpp">C++</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="java">Java</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="other">Other / Plain Text</option>
              </select>
            </div>
          )}

          {/* Description & Tags Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Description */}
            <div className="space-y-1.5">
              <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>
                Description
              </label>
              <input type="text" placeholder="Short description of this resource" value={description}
                onChange={e => setDescription(e.target.value)}
                className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${dk
                  ? 'bg-[#0b0b0b] border border-white/[0.06] focus:border-[#0077C0] text-white'
                  : 'bg-[#F9FAFB] border border-black/[0.08] focus:border-[#0077C0] focus:ring-2 focus:ring-[#0077C0]/10 text-[#111827]'
                }`}
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>
                Tags
              </label>
              <div className="relative">
                <Tag className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${dk ? 'text-white/25' : 'text-[#9CA3AF]'}`} />
                <input type="text" placeholder="macos, setup, automation" value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all ${dk
                    ? 'bg-[#0b0b0b] border border-white/[0.06] focus:border-[#0077C0] text-white'
                    : 'bg-[#F9FAFB] border border-black/[0.08] focus:border-[#0077C0] focus:ring-2 focus:ring-[#0077C0]/10 text-[#111827]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Content Editor */}
          <div className="space-y-1.5">
            <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>
              Content
            </label>
            <textarea required rows={7}
              placeholder={
                type === "code" ? "# Paste your code script here..."
                : type === "link" ? "https://example.com/useful-resource"
                : "Paste your text snippet or instructions here..."
              }
              value={content} onChange={e => setContent(e.target.value)}
              className={`w-full rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all resize-none ${dk
                ? 'bg-[#0b0b0b] border border-white/[0.06] focus:border-[#0077C0] text-white'
                : 'bg-[#F9FAFB] border border-black/[0.08] focus:border-[#0077C0] focus:ring-2 focus:ring-[#0077C0]/10 text-[#111827]'
              }`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-xs ${dk
              ? 'bg-red-950/30 border border-red-900/50 text-red-300'
              : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              <AlertCircle size={14} /> <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={publishing}
            className="w-full bg-gradient-to-r from-[#0077C0] to-[#009BF5] hover:brightness-110 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-[#0077C0]/15 flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            {publishing ? "Publishing..." : "Publish Resource"}
          </button>
        </motion.div>


      </form>
    </div>
  );
}

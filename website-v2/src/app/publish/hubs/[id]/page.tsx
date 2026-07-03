"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Settings, Users, FileCode, Trash2, Check, X, Eye, Copy, Send, Lock, Unlock, Pencil
} from "lucide-react";
import { useCreator } from "../../context";

export default function HubManagementPage() {
  const params = useParams();
  const hubId = params.id as string;
  const { email, dk } = useCreator();

  /* ── State ─────────────────────────────────────── */
  const [hub, setHub] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [contributors, setContributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"resources" | "contributors" | "settings">("resources");
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  const [expandedResId, setExpandedResId] = useState<string | null>(null);
  const [showDeleteHubModal, setShowDeleteHubModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteCatModal, setShowDeleteCatModal] = useState(false);
  const [catToDeleteIdx, setCatToDeleteIdx] = useState<number | null>(null);
  const [deleteCatConfirmText, setDeleteCatConfirmText] = useState("");
  const [showDeleteTopicModal, setShowDeleteTopicModal] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<{ catIdx: number; topicIdx: number } | null>(null);
  const [deleteTopicConfirmText, setDeleteTopicConfirmText] = useState("");

  /* ── Settings state ────────────────────────────── */
  const [settingsVisibility, setSettingsVisibility] = useState<"public" | "private">("public");
  const [settingsAllowedTypes, setSettingsAllowedTypes] = useState<string[]>(["code", "link", "text"]);
  const [settingsCategories, setSettingsCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatTypes, setNewCatTypes] = useState<string[]>(["code", "link", "text"]);
  const [newCatLimit, setNewCatLimit] = useState("");
  const [newCatTopicsLimit, setNewCatTopicsLimit] = useState("");

  const [selectedCatIdx, setSelectedCatIdx] = useState<number | null>(null);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicLimit, setNewTopicLimit] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // ── Category edit state
  const [editCatIdx, setEditCatIdx] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatTypes, setEditCatTypes] = useState<string[]>([]);
  const [editCatLimit, setEditCatLimit] = useState("");
  const [editCatTopicsLimit, setEditCatTopicsLimit] = useState("");


  /* ── Fetch ─────────────────────────────────────── */
  const fetchHub = async () => {
    try {
      const res = await fetch("/api/hubs");
      const data = await res.json();
      if (res.ok && data.success) {
        const found = data.hubs.find((h: any) => h.id === hubId);
        if (found) {
          setHub(found);
          setSettingsVisibility(found.visibility || "public");
          setSettingsAllowedTypes(found.allowedTypes || ["code", "link", "text"]);
          setSettingsCategories(found.categories || (found.subCategories || []).map((n: string) => ({
            name: n, allowedTypes: found.allowedTypes || ["code", "link", "text"], topics: []
          })));
        }
      }
    } catch { /* noop */ }
  };

  const fetchResources = async () => {
    try {
      const res = await fetch(`/api/resources?hubId=${hubId}`);
      const data = await res.json();
      if (res.ok && data.success) setResources(data.resources);
    } catch { /* noop */ }
  };

  const fetchContributors = async () => {
    try {
      const res = await fetch(`/api/hubs/${hubId}/contributors`);
      const data = await res.json();
      if (res.ok && data.success) setContributors(data.contributors);
    } catch { /* noop */ }
  };

  useEffect(() => {
    Promise.all([fetchHub(), fetchResources(), fetchContributors()]).finally(() => setLoading(false));
  }, [hubId]);

  /* ── Actions ───────────────────────────────────── */
  const handleContributorAction = async (contributorEmail: string, action: "approve" | "reject") => {
    try {
      await fetch(`/api/hubs/${hubId}/contributors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: contributorEmail, requesterEmail: email })
      });
      fetchContributors();
    } catch { /* noop */ }
  };

  const handleDeleteResource = async (resId: string) => {
    if (!confirm("Delete this resource?")) return;
    try {
      const res = await fetch(`/api/resources/${resId}?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      if (res.ok) fetchResources();
    } catch { /* noop */ }
  };

  const handleDeleteHub = async () => {
    try {
      const res = await fetch(`/api/hubs?id=${hubId}&creatorEmail=${email}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) window.location.href = "/publish/hubs";
      else alert(data.error || "Failed to delete hub");
    } catch { /* noop */ }
  };

  const handleToggleLock = async (r: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/resources/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isLocked: !r.isLocked,
          requesterEmail: email
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchResources();
      } else {
        alert(data.error || "Failed to update lock state.");
      }
    } catch { /* noop */ }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/hubs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: hubId, creatorEmail: email,
          visibility: settingsVisibility,
          allowedTypes: settingsAllowedTypes,
          subCategories: settingsCategories.map((c: any) => c.name),
          categories: settingsCategories
        })
      });
      const data = await res.json();
      if (res.ok && data.success) { setHub(data.hub); fetchHub(); }
      else alert(data.error || "Failed to update settings");
    } catch { /* noop */ }
    finally { setSavingSettings(false); }
  };

  /* ── Helpers ───────────────────────────────────── */
  const pending = contributors.filter(c => c.status === "pending");
  const approved = contributors.filter(c => c.status === "approved");
  const isOwner = hub?.creatorEmail?.toLowerCase() === email.toLowerCase();

  const inputClass = dk
    ? 'bg-[#0b0b0b] border border-white/[0.06] focus:border-[#0077C0] text-white'
    : 'bg-[#F9FAFB] border border-black/[0.08] focus:border-[#0077C0] focus:ring-2 focus:ring-[#0077C0]/10 text-[#111827]';
  const cardClass = dk
    ? 'bg-white/[0.015] border-white/[0.05]'
    : 'bg-white/60 border-black/[0.05] shadow-sm';
  const tabClass = (t: string) => `px-4 py-2 rounded-lg text-xs font-bold transition-all ${
    activeTab === t
      ? 'bg-[#0077C0] text-white shadow-sm'
      : dk ? 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]' : 'text-[#6B7280] hover:text-[#374151] hover:bg-black/[0.03]'
  }`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 border-[#0077C0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="px-6 lg:px-10 py-8 text-center">
        <p className={`text-sm ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>Hub not found.</p>
        <Link href="/publish/hubs" className="text-[#0077C0] text-sm font-bold mt-2 inline-block hover:underline">← Back to Hubs</Link>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10 max-w-5xl mx-auto space-y-8">
      {/* Back + Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Link href="/publish/hubs"
          className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors ${dk ? 'text-white/35 hover:text-white/60' : 'text-[#9CA3AF] hover:text-[#6B7280]'}`}
        >
          <ArrowLeft size={14} /> Back to Hubs
        </Link>

        <div className={`p-6 rounded-2xl border ${cardClass} relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0077C0] to-[#009BF5]" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className={`text-xl lg:text-2xl font-black font-outfit tracking-tight ${dk ? 'text-white' : 'text-[#111827]'}`}>
                  {hub.title}
                </h1>
                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${hub.visibility === "private"
                  ? 'text-rose-500 border-rose-500/20 bg-rose-500/5'
                  : 'text-[#0077C0] border-[#0077C0]/20 bg-[#0077C0]/5'
                }`}>{hub.visibility || "public"}</span>
              </div>
              {hub.description && (
                <p className={`text-sm mt-1 ${dk ? 'text-white/40' : 'text-[#6B7280]'}`}>{hub.description}</p>
              )}
              <div className={`flex gap-3 text-[10px] font-mono mt-2 ${dk ? 'text-white/20' : 'text-[#D1D5DB]'}`}>
                <span>ID: {hub.id}</span>
                <span>·</span>
                <span>Created: {new Date(hub.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className={`flex gap-3 text-center ${dk ? 'text-white' : 'text-[#111827]'}`}>
              {[
                { n: resources.length, l: "Resources" },
                { n: approved.length, l: "Members" },
                { n: pending.length, l: "Pending" },
              ].map(s => (
                <div key={s.l} className={`px-4 py-2 rounded-xl border ${dk ? 'border-white/[0.04] bg-white/[0.015]' : 'border-black/[0.04] bg-white/50'}`}>
                  <p className="text-lg font-black font-outfit">{s.n}</p>
                  <p className={`text-[9px] uppercase tracking-wider font-bold ${dk ? 'text-white/30' : 'text-[#9CA3AF]'}`}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Bar */}
      <div className={`flex gap-1.5 p-1 rounded-xl border w-fit ${dk ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-[#F3F4F6] border-black/[0.04]'}`}>
        <button onClick={() => setActiveTab("resources")} className={tabClass("resources")}>
          <span className="flex items-center gap-1.5"><FileCode size={13} /> Resources</span>
        </button>
        {isOwner && (
          <button onClick={() => setActiveTab("contributors")} className={tabClass("contributors")}>
            <span className="flex items-center gap-1.5">
              <Users size={13} /> Contributors
              {pending.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {pending.length}
                </span>
              )}
            </span>
          </button>
        )}
        {isOwner && (
          <button onClick={() => setActiveTab("settings")} className={tabClass("settings")}>
            <span className="flex items-center gap-1.5"><Settings size={13} /> Settings</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {/* ── RESOURCES TAB ──────────────────────── */}
        {activeTab === "resources" && (
          <div className="space-y-3">
            {/* Breadcrumb nav */}
            {(hub.categories || (hub.subCategories || []).length > 0) && (selectedCategory || selectedTopic) && (
              <div className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border mb-4 text-xs font-semibold ${
                dk ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-black/[0.02] border-black/[0.04]'
              }`}>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedTopic(null);
                  }}
                  className="text-[#0077C0] hover:underline"
                >
                  Categories
                </button>
                {selectedCategory && (
                  <>
                    <span className="opacity-30">&bull;</span>
                    <button
                      onClick={() => setSelectedTopic(null)}
                      className="text-purple-500 hover:underline"
                    >
                      {selectedCategory.name}
                    </button>
                  </>
                )}
                {selectedTopic && (
                  <>
                    <span className="opacity-30">&bull;</span>
                    <span className="opacity-60">{selectedTopic.name}</span>
                  </>
                )}
              </div>
            )}

            {/* Flat list fallback if no categories exist */}
            {!(hub.categories && hub.categories.length > 0) ? (
              resources.length === 0 ? (
                <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${dk ? 'border-white/[0.04]' : 'border-black/[0.06]'}`}>
                  <FileCode size={28} className={`mx-auto mb-2 ${dk ? 'text-white/15' : 'text-[#D1D5DB]'}`} />
                  <p className={`text-sm ${dk ? 'text-white/30' : 'text-[#9CA3AF]'}`}>No resources in this hub yet.</p>
                  <Link href="/publish/new" className="inline-block mt-3 text-[#0077C0] text-xs font-bold hover:underline">
                    Create one →
                  </Link>
                </div>
              ) : (
                resources.map(r => (
                  <div key={r.id}
                    onClick={() => setExpandedResId(expandedResId === r.id ? null : r.id)}
                    className={`p-4 rounded-2xl border flex flex-col gap-3 cursor-pointer transition-all ${cardClass} ${
                      expandedResId === r.id ? 'ring-1 ring-[#0077C0]/20' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-sm font-bold ${dk ? 'text-white' : 'text-[#111827]'}`}>{r.title}</h4>
                          <span className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border ${dk
                            ? 'border-white/10 bg-white/5 text-white/60'
                            : 'border-black/[0.06] bg-black/[0.03] text-[#6B7280]'
                          }`}>{r.type}</span>
                        </div>
                        <div className={`flex items-center gap-3 text-[10px] font-mono ${dk ? 'text-white/50' : 'text-gray-500'}`}>
                          <span className="flex items-center gap-1"><Eye size={10} /> {r.views}</span>
                          <span className="flex items-center gap-1"><Copy size={10} /> {r.copies}</span>
                          <span className="flex items-center gap-1"><Send size={10} /> {r.sends}</span>
                          {r.creatorEmail && <span>· {r.creatorEmail}</span>}
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => handleToggleLock(r, e)}
                            className={`p-2 rounded-xl transition-all ${
                              r.isLocked
                                ? dk ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-amber-50 text-amber-600 border border-amber-200'
                                : dk ? 'hover:bg-white/10 text-white/40 hover:text-white/60' : 'hover:bg-black/5 text-black/40 hover:text-black/60'
                            }`}
                            title={r.isLocked ? "Unlock Resource" : "Lock Resource"}
                          >
                            {r.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteResource(r.id); }}
                            className={`p-2 rounded-xl transition-all ${dk
                              ? 'hover:bg-red-500/10 text-white/20 hover:text-red-400'
                              : 'hover:bg-red-50 text-[#9CA3AF] hover:text-red-500'
                            }`} title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    {expandedResId === r.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`p-3.5 rounded-xl border text-xs font-mono whitespace-pre-wrap break-all ${
                          dk ? 'bg-black/40 border-white/[0.06] text-white/90' : 'bg-black/[0.03] border-black/[0.06] text-black/90'
                        }`}
                      >
                        {r.type === "link" ? (
                          <a href={r.content} target="_blank" rel="noopener noreferrer" className="text-[#0077C0] hover:underline flex items-center gap-1">
                            {r.content}
                          </a>
                        ) : r.type === "code" ? (
                          <code className="block whitespace-pre overflow-x-auto text-[11px] leading-relaxed">
                            {r.content}
                          </code>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{r.content}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )
            ) : !selectedCategory ? (
              /* Level 2: Categories view */
              <div className="space-y-4">
                <div className="text-left">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${dk ? 'text-white/45' : 'text-[#6B7280]'}`}>Categories</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(hub.categories || []).map((cat: any) => {
                    const count = resources.filter(r => r.category?.toLowerCase() === cat.name.toLowerCase() || r.subCategory?.toLowerCase() === cat.name.toLowerCase()).length;
                    return (
                      <div key={cat.name} onClick={() => setSelectedCategory(cat)}
                        className={`group p-5 rounded-2xl border cursor-pointer flex flex-col justify-between min-h-[120px] transition-all duration-200 ${
                          dk
                            ? 'bg-white/[0.015] border-white/[0.05] hover:border-purple-500/30 hover:bg-[#0077C0]/[0.02]'
                            : 'bg-white/60 border-black/[0.05] shadow-sm hover:border-[#0077C0]/30 hover:bg-white/80'
                        }`}
                      >
                        <div>
                          <h4 className={`text-sm font-bold uppercase tracking-wider transition-colors ${dk ? 'text-white' : 'text-[#111827]'}`}>
                            {cat.name}
                          </h4>
                          <p className={`text-[11px] mt-1 opacity-60 ${dk ? 'text-white' : 'text-[#6B7280]'}`}>
                            Allowed: {cat.allowedTypes?.join(", ") || "All"}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                            dk ? 'border-purple-500/20 bg-purple-500/10 text-purple-400' : 'border-purple-500/15 bg-purple-500/[0.06] text-purple-600'
                          }`}>
                            {count} resource{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : !selectedTopic ? (
              /* Level 3: Topics view */
              <div className="space-y-4">
                <div className="text-left">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${dk ? 'text-white/45' : 'text-[#6B7280]'}`}>Topics</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Today's Date Topic */}
                  {(() => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const count = resources.filter(r => (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) && r.topic === todayStr).length;
                    return (
                      <div onClick={() => setSelectedTopic({ name: todayStr })}
                        className={`group p-5 rounded-2xl border cursor-pointer flex flex-col justify-between min-h-[120px] transition-all duration-200 ${
                          dk
                            ? 'bg-white/[0.015] border-white/[0.05] hover:border-emerald-500/30 hover:bg-[#0077C0]/[0.02]'
                            : 'bg-white/60 border-black/[0.05] shadow-sm hover:border-[#0077C0]/30 hover:bg-white/80'
                        }`}
                      >
                        <div>
                          <h4 className={`text-sm font-bold uppercase tracking-wider transition-colors ${dk ? 'text-white' : 'text-[#111827]'}`}>
                            Today
                          </h4>
                          <p className={`text-[11px] font-mono mt-1 opacity-60 ${dk ? 'text-white font-semibold' : 'text-[#6B7280] font-semibold'}`}>
                            {todayStr}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                            dk ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-600'
                          }`}>
                            {count} resource{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Custom Topics */}
                  {(selectedCategory.topics || []).map((topic: any) => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    if (topic.name === todayStr) return null;
                    const count = resources.filter(r => (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) && r.topic?.toLowerCase() === topic.name.toLowerCase()).length;
                    return (
                      <div key={topic.name} onClick={() => setSelectedTopic(topic)}
                        className={`group p-5 rounded-2xl border cursor-pointer flex flex-col justify-between min-h-[120px] transition-all duration-200 ${
                          dk
                            ? 'bg-white/[0.015] border-white/[0.05] hover:border-emerald-500/30 hover:bg-[#0077C0]/[0.02]'
                            : 'bg-white/60 border-black/[0.05] shadow-sm hover:border-[#0077C0]/30 hover:bg-white/80'
                        }`}
                      >
                        <div>
                          <h4 className={`text-sm font-bold uppercase tracking-wider transition-colors ${dk ? 'text-white' : 'text-[#111827]'}`}>
                            {topic.name}
                          </h4>
                          <p className={`text-[11px] mt-1 opacity-60 ${dk ? 'text-white' : 'text-[#6B7280]'}`}>
                            Custom topic
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                            dk ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-600'
                          }`}>
                            {count} resource{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* All Topics Shortcut Card */}
                  <div onClick={() => setSelectedTopic({ name: "All Topics" })}
                    className={`group p-5 rounded-2xl border border-dashed cursor-pointer flex flex-col justify-between min-h-[120px] transition-all duration-200 ${
                      dk
                        ? 'border-white/[0.1] bg-white/[0.005] hover:border-emerald-500/30 hover:bg-[#0077C0]/[0.02]'
                        : 'border-black/[0.1] bg-black/[0.005] shadow-sm hover:border-[#0077C0]/30 hover:bg-white/80'
                    }`}
                  >
                    <div>
                      <h4 className={`text-sm font-bold uppercase tracking-wider transition-colors ${dk ? 'text-white/70 group-hover:text-white' : 'text-gray-600 group-hover:text-black'}`}>
                        All Topics
                      </h4>
                      <p className={`text-[11px] mt-1 ${dk ? 'text-white/40' : 'text-[#6B7280]'}`}>
                        Show everything in {selectedCategory.name}
                      </p>
                    </div>
                    <div className="flex items-center justify-end mt-4">
                      <span className="text-[11px] font-bold text-[#0077C0] group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Level 4: Resources List */
              (() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const filteredRaw = resources.filter(r => {
                  const matchesCategory = r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase();
                  if (!matchesCategory) return false;

                  if (selectedTopic.name === "All Topics") {
                    // Exclude today's content from All Topics
                    if (r.topic === todayStr) return false;
                    return true;
                  }
                  return r.topic?.toLowerCase() === selectedTopic.name.toLowerCase();
                });

                // Sort by newest first (by createdAt date)
                const filtered = [...filteredRaw].sort((a, b) => {
                  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return timeB - timeA;
                });
                return filtered.length === 0 ? (
                  <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${dk ? 'border-white/[0.04]' : 'border-black/[0.06]'}`}>
                    <FileCode size={28} className={`mx-auto mb-2 ${dk ? 'text-white/15' : 'text-[#D1D5DB]'}`} />
                    <p className={`text-sm ${dk ? 'text-white/30' : 'text-[#9CA3AF]'}`}>No resources found under this topic.</p>
                    <Link href="/publish/new" className="inline-block mt-3 text-[#0077C0] text-xs font-bold hover:underline">
                      Create one →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map(r => (
                      <div key={r.id}
                        onClick={() => setExpandedResId(expandedResId === r.id ? null : r.id)}
                        className={`p-4 rounded-2xl border flex flex-col gap-3 cursor-pointer transition-all ${cardClass} ${
                          expandedResId === r.id ? 'ring-1 ring-[#0077C0]/20' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-sm font-bold ${dk ? 'text-white' : 'text-[#111827]'}`}>{r.title}</h4>
                              <span className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border ${dk
                                ? 'border-white/10 bg-white/5 text-white/60'
                                : 'border-black/[0.06] bg-black/[0.03] text-[#6B7280]'
                              }`}>{r.type}</span>
                            </div>
                            <div className={`flex items-center gap-3 text-[10px] font-mono ${dk ? 'text-white/50' : 'text-gray-500'}`}>
                              <span className="flex items-center gap-1"><Eye size={10} /> {r.views}</span>
                              <span className="flex items-center gap-1"><Copy size={10} /> {r.copies}</span>
                              <span className="flex items-center gap-1"><Send size={10} /> {r.sends}</span>
                              {r.creatorEmail && <span>· {r.creatorEmail}</span>}
                            </div>
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={(e) => handleToggleLock(r, e)}
                                className={`p-2 rounded-xl transition-all ${
                                  r.isLocked
                                    ? dk ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-amber-50 text-amber-600 border border-amber-200'
                                    : dk ? 'hover:bg-white/10 text-white/40 hover:text-white/60' : 'hover:bg-black/5 text-black/40 hover:text-black/60'
                                }`}
                                title={r.isLocked ? "Unlock Resource" : "Lock Resource"}
                              >
                                {r.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteResource(r.id); }}
                                className={`p-2 rounded-xl transition-all ${dk
                                  ? 'hover:bg-red-500/10 text-white/20 hover:text-red-400'
                                  : 'hover:bg-red-50 text-[#9CA3AF] hover:text-red-500'
                                }`} title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        {expandedResId === r.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={`p-3.5 rounded-xl border text-xs font-mono whitespace-pre-wrap break-all ${
                              dk ? 'bg-black/40 border-white/[0.06] text-white/90' : 'bg-black/[0.03] border-black/[0.06] text-black/90'
                            }`}
                          >
                            {r.type === "link" ? (
                              <a href={r.content} target="_blank" rel="noopener noreferrer" className="text-[#0077C0] hover:underline flex items-center gap-1">
                                {r.content}
                              </a>
                            ) : r.type === "code" ? (
                              <code className="block whitespace-pre overflow-x-auto text-[11px] leading-relaxed">
                                {r.content}
                              </code>
                            ) : (
                              <p className="whitespace-pre-wrap leading-relaxed">{r.content}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* ── CONTRIBUTORS TAB ───────────────────── */}
        {activeTab === "contributors" && isOwner && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pending */}
            <div className={`p-6 rounded-2xl border ${cardClass} space-y-4`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${dk ? 'text-amber-400' : 'text-amber-600'}`}>
                Pending Requests ({pending.length})
              </h3>
              {pending.length === 0 ? (
                <p className={`text-xs italic ${dk ? 'text-white/25' : 'text-[#9CA3AF]'}`}>No pending requests.</p>
              ) : (
                <div className="space-y-2">
                  {pending.map(r => (
                    <div key={r.contributorEmail}
                      className={`flex justify-between items-center p-3 rounded-xl border ${dk
                        ? 'bg-amber-500/[0.03] border-amber-500/10'
                        : 'bg-amber-50/50 border-amber-200/50'
                      }`}
                    >
                      <span className={`text-xs font-mono truncate max-w-[180px] ${dk ? 'text-white/80' : 'text-[#374151]'}`}>
                        {r.contributorEmail}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleContributorAction(r.contributorEmail, "approve")}
                          className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'}`}
                          title="Approve"
                        ><Check size={14} /></button>
                        <button onClick={() => handleContributorAction(r.contributorEmail, "reject")}
                          className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`}
                          title="Reject"
                        ><X size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active */}
            <div className={`p-6 rounded-2xl border ${cardClass} space-y-4`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${dk ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Active Contributors ({approved.length})
              </h3>
              {approved.length === 0 ? (
                <p className={`text-xs italic ${dk ? 'text-white/25' : 'text-[#9CA3AF]'}`}>Only you can contribute currently.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {approved.map(r => (
                    <div key={r.contributorEmail}
                      className={`flex justify-between items-center p-3 rounded-xl border ${dk
                        ? 'bg-white/[0.02] border-white/[0.04]'
                        : 'bg-white/50 border-black/[0.04]'
                      }`}
                    >
                      <span className={`text-xs font-mono truncate ${dk ? 'text-white/70' : 'text-[#374151]'}`}>
                        {r.contributorEmail}
                      </span>
                      <button onClick={() => handleContributorAction(r.contributorEmail, "reject")}
                        className={`text-[9px] font-bold transition-colors ${dk ? 'text-red-400/60 hover:text-red-400' : 'text-red-400 hover:text-red-600'}`}
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ───────────────────────── */}
        {activeTab === "settings" && isOwner && (
          <form onSubmit={handleSaveSettings} className={`p-6 rounded-2xl border ${cardClass} space-y-6`}>
            {/* Visibility & Allowed Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Visibility */}
              <div className="space-y-1.5">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>Hub Visibility</label>
                <select value={settingsVisibility} onChange={e => setSettingsVisibility(e.target.value as any)}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer ${inputClass}`}>
                  <option value="public">Public (Visible in public list)</option>
                  <option value="private">Private (Hidden from public list)</option>
                </select>
              </div>

              {/* Allowed Types */}
              <div className="space-y-2">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold block ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>
                  Allowed Resource Types
                </label>
                <div className="flex flex-row flex-wrap gap-6 pt-1">
                  {[
                    { id: "code", label: "Code / Script" },
                    { id: "link", label: "Link / URL" },
                    { id: "text", label: "Rich Text" }
                  ].map(t => (
                    <label key={t.id} className={`flex items-center gap-2.5 text-sm cursor-pointer select-none ${dk ? 'text-white/60 hover:text-white/80' : 'text-[#374151] hover:text-[#111827]'}`}>
                      <input type="checkbox" checked={settingsAllowedTypes.includes(t.id)}
                        onChange={() => {
                          if (settingsAllowedTypes.includes(t.id)) setSettingsAllowedTypes(settingsAllowedTypes.filter(x => x !== t.id));
                          else setSettingsAllowedTypes([...settingsAllowedTypes, t.id]);
                        }}
                        className="w-4 h-4 rounded accent-[#0077C0] cursor-pointer" />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className={`space-y-4 border-t pt-4 ${dk ? 'border-white/[0.04]' : 'border-black/[0.04]'}`}>
              <label className="text-[10px] uppercase tracking-[0.1em] font-black text-[#0077C0] block">
                Categories & Topics
              </label>

              {/* Add Category */}
              <div className={`p-4 rounded-xl border space-y-3 ${dk ? 'border-white/[0.04] bg-white/[0.01]' : 'border-black/[0.04] bg-[#F9FAFB]/50'}`}>
                <p className={`text-[9px] uppercase font-bold tracking-wider ${dk ? 'text-white/35' : 'text-[#9CA3AF]'}`}>Add Category</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input type="text" placeholder="Category name" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    className={`rounded-lg px-3 py-2 text-xs outline-none ${inputClass}`} />
                  <input type="number" placeholder="Resources / Day" value={newCatLimit} onChange={e => setNewCatLimit(e.target.value)}
                    className={`rounded-lg px-3 py-2 text-xs outline-none ${inputClass}`} />
                  <input type="number" placeholder="Topics / Day" value={newCatTopicsLimit} onChange={e => setNewCatTopicsLimit(e.target.value)}
                    className={`rounded-lg px-3 py-2 text-xs outline-none ${inputClass}`} />

                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <span className={`text-[9px] uppercase font-bold tracking-wider ${dk ? 'text-white/35' : 'text-[#9CA3AF]'}`}>Types:</span>
                  {["code", "link", "text"].map(t => (
                    <label key={t} className={`flex items-center gap-1.5 text-xs cursor-pointer select-none capitalize ${dk ? 'text-white/50' : 'text-[#6B7280]'}`}>
                      <input type="checkbox" checked={newCatTypes.includes(t)}
                        onChange={() => newCatTypes.includes(t) ? setNewCatTypes(newCatTypes.filter(x => x !== t)) : setNewCatTypes([...newCatTypes, t])}
                        className="w-3 h-3 rounded accent-[#0077C0] cursor-pointer" />
                      {t}
                    </label>
                  ))}
                </div>
                <button type="button" onClick={() => {
                  const n = newCatName.trim();
                  if (n && !settingsCategories.some(c => c.name.toLowerCase() === n.toLowerCase())) {
                    const lv = parseInt(newCatLimit), tv = parseInt(newCatTopicsLimit);
                    setSettingsCategories([...settingsCategories, {
                      name: n, allowedTypes: newCatTypes,
                      limit: isNaN(lv) ? undefined : lv,
                      topicsLimit: isNaN(tv) ? undefined : tv,
                      topics: []
                    }]);
                    setNewCatName(""); setNewCatLimit(""); setNewCatTopicsLimit("");
                    setNewCatTypes(["code", "link", "text"]);
                  }
                }} className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${dk
                  ? 'bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] text-white/70'
                  : 'bg-black/[0.03] hover:bg-black/[0.05] border border-black/[0.06] text-[#374151]'
                }`}>
                  Add Category
                </button>
              </div>

              {/* Category List */}
              <div className="space-y-2">
                {settingsCategories.length === 0 ? (
                  <p className={`text-xs italic ${dk ? 'text-white/25' : 'text-[#9CA3AF]'}`}>No categories defined yet.</p>
                ) : settingsCategories.map((cat: any, idx: number) => {
                  const isOpen = selectedCatIdx === idx;
                  return (
                    <div key={idx} className={`p-3 rounded-xl border space-y-2 ${isOpen
                      ? dk ? 'border-sky-500/20 bg-sky-950/[0.05]' : 'border-sky-500/20 bg-sky-50/30'
                      : dk ? 'border-white/[0.04] bg-white/[0.01]' : 'border-black/[0.04] bg-white/30'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div className="min-w-0">
                          <span className={`text-xs font-bold block truncate ${dk ? 'text-white' : 'text-[#111827]'}`}>{cat.name}</span>
                          <span className={`text-[9px] font-mono block truncate ${dk ? 'text-white/30' : 'text-[#9CA3AF]'}`}>
                            Types: {cat.allowedTypes?.join(", ")} | Resources/day: {cat.limit ?? "∞"}
                            {cat.topicsLimit != null ? ` | Topics/day: ${cat.topicsLimit}` : ""}

                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          <button type="button" onClick={() => setSelectedCatIdx(isOpen ? null : idx)}
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold ${dk
                              ? 'bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/70'
                              : 'bg-black/[0.03] border border-black/[0.06] text-[#6B7280] hover:text-[#374151]'
                            }`}
                          >
                            {isOpen ? "Hide" : `Topics (${cat.topics?.length || 0})`}
                          </button>
                          {/* Edit button */}
                          <button type="button" onClick={() => {
                            if (editCatIdx === idx) {
                              setEditCatIdx(null);
                            } else {
                              setEditCatIdx(idx);
                              setEditCatName(cat.name);
                              setEditCatTypes(cat.allowedTypes || []);
                              setEditCatLimit(cat.limit != null ? String(cat.limit) : "");
                              setEditCatTopicsLimit(cat.topicsLimit != null ? String(cat.topicsLimit) : "");

                            }
                          }} className={`p-1 rounded-lg ${
                            editCatIdx === idx
                              ? dk ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-sky-100 text-sky-600 border border-sky-300'
                              : dk ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 border border-white/[0.06]' : 'bg-black/[0.03] hover:bg-black/[0.06] text-[#9CA3AF] hover:text-[#374151] border border-black/[0.06]'
                          }`}>
                            <Pencil size={10} />
                          </button>
                          <button type="button" onClick={() => {
                            setCatToDeleteIdx(idx);
                            setDeleteCatConfirmText("");
                            setShowDeleteCatModal(true);
                          }} className={`p-1 rounded-lg ${dk ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-200'}`}>
                            <X size={10} />
                          </button>
                        </div>
                      </div>

                      {/* ── Inline Edit Form ── */}
                      {editCatIdx === idx && (
                        <div className={`mt-2 p-3 rounded-xl border space-y-3 ${dk ? 'border-sky-500/20 bg-sky-950/10' : 'border-sky-300 bg-sky-50/50'}`}>
                          {/* Header — shows what we're editing */}
                          <div className="flex items-center gap-2">
                            <Pencil size={9} className={dk ? 'text-sky-400' : 'text-sky-600'} />
                            <p className={`text-[9px] uppercase font-bold tracking-wider ${dk ? 'text-sky-400' : 'text-sky-600'}`}>
                              Editing: <span className={`normal-case ${dk ? 'text-white/80' : 'text-[#111827]'}`}>{cat.name}</span>
                            </p>
                          </div>

                          {/* Category name */}
                          <div className="space-y-1">
                            <label className={`text-[8px] font-bold uppercase tracking-wider ${dk ? 'text-white/35' : 'text-[#9CA3AF]'}`}>Category Name</label>
                            <input
                              type="text" placeholder="e.g. Frontend" value={editCatName}
                              onChange={e => setEditCatName(e.target.value)}
                              className={`w-full rounded-lg px-2 py-1.5 text-[10px] outline-none ${inputClass}`}
                            />
                          </div>

                          {/* Numeric limits */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className={`text-[8px] font-bold uppercase tracking-wider ${dk ? 'text-white/35' : 'text-[#9CA3AF]'}`}>Resources / Day</label>
                              <input
                                type="number" placeholder="∞" value={editCatLimit}
                                onChange={e => setEditCatLimit(e.target.value)}
                                className={`w-full rounded-lg px-2 py-1.5 text-[10px] outline-none ${inputClass}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className={`text-[8px] font-bold uppercase tracking-wider ${dk ? 'text-white/35' : 'text-[#9CA3AF]'}`}>Topics / Day</label>
                              <input
                                type="number" placeholder="∞" value={editCatTopicsLimit}
                                onChange={e => setEditCatTopicsLimit(e.target.value)}
                                className={`w-full rounded-lg px-2 py-1.5 text-[10px] outline-none ${inputClass}`}
                              />
                            </div>

                          </div>

                          {/* Allowed types */}
                          <div className="flex flex-wrap gap-1">
                            {["code", "link", "text", "image"].map(t => {
                              const active = editCatTypes.includes(t);
                              return (
                                <button key={t} type="button" onClick={() => {
                                  setEditCatTypes(prev => active ? prev.filter(x => x !== t) : [...prev, t]);
                                }} className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all ${
                                  active
                                    ? dk ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-sky-100 border-sky-400 text-sky-700'
                                    : dk ? 'bg-white/[0.03] border-white/[0.06] text-white/30' : 'bg-black/[0.03] border-black/[0.06] text-[#9CA3AF]'
                                }`}>{t}</button>
                              );
                            })}
                          </div>
                          <div className="flex gap-1.5 justify-end">
                            <button type="button" onClick={() => setEditCatIdx(null)}
                              className={`px-3 py-1 rounded-lg text-[9px] font-bold ${dk ? 'bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/70' : 'bg-black/[0.03] border border-black/[0.06] text-[#9CA3AF] hover:text-[#374151]'}`}
                            >Cancel</button>
                            <button type="button" onClick={() => {
                              const name = editCatName.trim();
                              if (!name) return;
                              const updated = [...settingsCategories];
                              updated[idx] = {
                                ...updated[idx],
                                name,
                                allowedTypes: editCatTypes,
                                limit: editCatLimit !== "" ? parseInt(editCatLimit) : undefined,
                                topicsLimit: editCatTopicsLimit !== "" ? parseInt(editCatTopicsLimit) : undefined,

                              };
                              setSettingsCategories(updated);
                              setEditCatIdx(null);
                            }} className={`px-3 py-1 rounded-lg text-[9px] font-bold ${dk ? 'bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:bg-sky-500/30' : 'bg-sky-100 border border-sky-300 text-sky-700 hover:bg-sky-200'}`}
                            >Save</button>
                          </div>
                        </div>
                      )}

                      {isOpen && (
                        <div className={`pl-3 border-l-2 space-y-2 mt-1 pt-1 ${dk ? 'border-purple-500/20' : 'border-purple-300'}`}>
                          <p className={`text-[9px] uppercase font-bold tracking-wider ${dk ? 'text-purple-400' : 'text-purple-600'}`}>Topics</p>
                          <div className="flex gap-1.5">
                            <input type="text" placeholder="Topic name" value={newTopicName}
                              onChange={e => setNewTopicName(e.target.value)}
                              className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] outline-none ${inputClass}`} />
                            <input type="number" placeholder="Limit" value={newTopicLimit}
                              onChange={e => setNewTopicLimit(e.target.value)}
                              className={`w-16 rounded-lg px-2 py-1.5 text-[10px] outline-none ${inputClass}`} />
                            <button type="button" onClick={() => {
                              const tn = newTopicName.trim();
                              if (tn) {
                                const lv = parseInt(newTopicLimit);
                                const updated = [...settingsCategories];
                                const topics = updated[idx].topics || [];
                                const tl = updated[idx].topicsLimit;
                                if (tl != null && topics.length >= tl) { alert(`Max topic limit of ${tl} reached.`); return; }
                                if (!topics.some((t: any) => t.name.toLowerCase() === tn.toLowerCase())) {
                                  topics.push({ name: tn, limit: isNaN(lv) ? undefined : lv });
                                  updated[idx].topics = topics;
                                  setSettingsCategories(updated);
                                  setNewTopicName(""); setNewTopicLimit("");
                                }
                              }
                            }} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold shrink-0 ${dk
                              ? 'bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/20 text-purple-300'
                              : 'bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-600'
                            }`}>Add</button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {(!cat.topics || cat.topics.length === 0) ? (
                              <p className={`text-[10px] italic ${dk ? 'text-white/25' : 'text-[#9CA3AF]'}`}>No topics.</p>
                            ) : cat.topics.map((t: any, ti: number) => (
                              <div key={ti} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] ${dk
                                ? 'bg-purple-500/5 border border-purple-500/15 text-purple-300'
                                : 'bg-purple-50 border border-purple-200 text-purple-600'
                              }`}>
                                <span>{t.name}{t.limit != null && ` (${t.limit})`}</span>
                                <button type="button" onClick={() => {
                                    setTopicToDelete({ catIdx: idx, topicIdx: ti });
                                    setDeleteTopicConfirmText("");
                                    setShowDeleteTopicModal(true);
                                  }} className={`shrink-0 ml-0.5 ${dk ? 'text-purple-400 hover:text-white' : 'text-purple-400 hover:text-purple-700'}`}>
                                  <X size={8} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save + Delete */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t pt-6 ${dk ? 'border-white/[0.04]' : 'border-black/[0.04]'}`}>
              <button type="submit" disabled={savingSettings || settingsAllowedTypes.length === 0}
                className="bg-gradient-to-r from-[#0077C0] to-[#009BF5] hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-lg shadow-[#0077C0]/15"
              >
                {savingSettings ? "Saving..." : "Save Settings"}
              </button>
              <button type="button" onClick={() => { setDeleteConfirmText(""); setShowDeleteHubModal(true); }}
                className={`flex items-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl border transition-all ${dk
                  ? 'text-red-400 border-red-500/15 hover:bg-red-500/10 hover:border-red-500/30'
                  : 'text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300'
                }`}
              >
                <Trash2 size={13} /> Delete Hub
              </button>
            </div>
          </form>
        )}
      </motion.div>

      {/* Delete Hub Verification Modal */}
      {showDeleteHubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
              dk ? 'bg-[#0f0f10] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-[#111827]'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500" />
            <h3 className="text-base font-extrabold font-outfit tracking-tight text-red-500 mb-2">Delete Hub Verification</h3>
            <p className={`text-xs mb-4 ${dk ? 'text-white/60' : 'text-[#6B7280]'}`}>
              This action cannot be undone. To verify, please type the hub name <span className="font-bold font-mono underline">{hub.title}</span> below:
            </p>
            <input
              type="text"
              placeholder={hub.title}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-xs outline-none mb-4 ${inputClass}`}
            />
            <div className="flex justify-end gap-2.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowDeleteHubModal(false)}
                className={`px-4 py-2.5 rounded-xl border transition-all ${
                  dk ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06] text-white/80' : 'bg-white border-black/[0.06] hover:bg-black/[0.02] text-[#374151]'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmText === hub.title) {
                    handleDeleteHub();
                    setShowDeleteHubModal(false);
                  }
                }}
                disabled={deleteConfirmText !== hub.title}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-30 text-white px-4 py-2.5 rounded-xl transition-all shadow-md"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Verification Modal */}
      {showDeleteCatModal && catToDeleteIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
              dk ? 'bg-[#0f0f10] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-[#111827]'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500" />
            <h3 className="text-base font-extrabold font-outfit tracking-tight text-red-500 mb-2">Delete Category Verification</h3>
            <p className={`text-xs mb-4 ${dk ? 'text-white/60' : 'text-[#6B7280]'}`}>
              This will remove the category. To verify, please type the category name <span className="font-bold font-mono underline">{settingsCategories[catToDeleteIdx]?.name}</span> below:
            </p>
            <input
              type="text"
              placeholder={settingsCategories[catToDeleteIdx]?.name}
              value={deleteCatConfirmText}
              onChange={(e) => setDeleteCatConfirmText(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-xs outline-none mb-4 ${inputClass}`}
            />
            <div className="flex justify-end gap-2.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteCatModal(false);
                  setCatToDeleteIdx(null);
                }}
                className={`px-4 py-2.5 rounded-xl border transition-all ${
                  dk ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06] text-white/80' : 'bg-white border-black/[0.06] hover:bg-black/[0.02] text-[#374151]'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteCatConfirmText === settingsCategories[catToDeleteIdx]?.name) {
                    const newCats = settingsCategories.filter((_: any, i: number) => i !== catToDeleteIdx);
                    setSettingsCategories(newCats);
                    if (selectedCatIdx === catToDeleteIdx) setSelectedCatIdx(null);
                    setShowDeleteCatModal(false);
                    setCatToDeleteIdx(null);
                  }
                }}
                disabled={deleteCatConfirmText !== settingsCategories[catToDeleteIdx]?.name}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-30 text-white px-4 py-2.5 rounded-xl transition-all shadow-md"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Topic Verification Modal */}
      {showDeleteTopicModal && topicToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
              dk ? 'bg-[#0f0f10] border-white/[0.08] text-white' : 'bg-white border-black/[0.08] text-[#111827]'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500" />
            <h3 className="text-base font-extrabold font-outfit tracking-tight text-red-500 mb-2">Delete Topic Verification</h3>
            <p className={`text-xs mb-4 ${dk ? 'text-white/60' : 'text-[#6B7280]'}`}>
              This will remove the topic. To verify, please type the topic name <span className="font-bold font-mono underline">{settingsCategories[topicToDelete.catIdx]?.topics[topicToDelete.topicIdx]?.name}</span> below:
            </p>
            <input
              type="text"
              placeholder={settingsCategories[topicToDelete.catIdx]?.topics[topicToDelete.topicIdx]?.name}
              value={deleteTopicConfirmText}
              onChange={(e) => setDeleteTopicConfirmText(e.target.value)}
              className={`w-full rounded-xl px-4 py-2.5 text-xs outline-none mb-4 ${inputClass}`}
            />
            <div className="flex justify-end gap-2.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteTopicModal(false);
                  setTopicToDelete(null);
                }}
                className={`px-4 py-2.5 rounded-xl border transition-all ${
                  dk ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06] text-white/80' : 'bg-white border-black/[0.06] hover:bg-black/[0.02] text-[#374151]'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetTopicName = settingsCategories[topicToDelete.catIdx]?.topics[topicToDelete.topicIdx]?.name;
                  if (deleteTopicConfirmText === targetTopicName) {
                    const updated = [...settingsCategories];
                    updated[topicToDelete.catIdx].topics = updated[topicToDelete.catIdx].topics.filter((_: any, i: number) => i !== topicToDelete.topicIdx);
                    setSettingsCategories(updated);
                    setShowDeleteTopicModal(false);
                    setTopicToDelete(null);
                  }
                }}
                disabled={deleteTopicConfirmText !== settingsCategories[topicToDelete.catIdx]?.topics[topicToDelete.topicIdx]?.name}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-30 text-white px-4 py-2.5 rounded-xl transition-all shadow-md"
              >
                Delete Topic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FolderPlus, Search, Users, ChevronRight, Plus, X, AlertCircle } from "lucide-react";
import { useCreator } from "../context";

export default function HubsPage() {
  const { email, name, licenseKey, dk } = useCreator();

  /* ── Hub data ──────────────────────────────────── */
  const [ownedHubs, setOwnedHubs] = useState<any[]>([]);
  const [joinedHubs, setJoinedHubs] = useState<any[]>([]);
  const [exploreHubs, setExploreHubs] = useState<any[]>([]);
  const [hubRequests, setHubRequests] = useState<{ [id: string]: any[] }>({});
  const [loading, setLoading] = useState(true);

  /* ── Create hub form ───────────────────────────── */
  const [showCreate, setShowCreate] = useState(false);
  const [hubTitle, setHubTitle] = useState("");
  const [hubDescription, setHubDescription] = useState("");
  const [hubVisibility, setHubVisibility] = useState<"public" | "private">("public");
  const [hubAllowedType, setHubAllowedType] = useState("all");
  const [creatingHub, setCreatingHub] = useState(false);
  const [hubError, setHubError] = useState("");

  /* ── Explore ───────────────────────────────────── */
  const [exploreQuery, setExploreQuery] = useState("");
  const [joiningHub, setJoiningHub] = useState(false);
  const [requestingHubId, setRequestingHubId] = useState("");

  /* ── Fetch hubs ────────────────────────────────── */
  const fetchAll = async () => {
    if (!email) return;
    try {
      const res = await fetch(`/api/hubs?contributorEmail=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const hubsList: any[] = data.hubs || [];
        setExploreHubs(hubsList);
        
        const owned = hubsList.filter((h: any) => h.creatorEmail.toLowerCase() === email.toLowerCase());
        setOwnedHubs(owned);
        owned.forEach((h: any) => fetchRequests(h.id));

        const joined = hubsList.filter((h: any) => h.creatorEmail.toLowerCase() !== email.toLowerCase() && h.myStatus === "approved");
        setJoinedHubs(joined);
      }
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  const fetchRequests = async (hubId: string) => {
    try {
      const res = await fetch(`/api/hubs/${hubId}/contributors`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHubRequests(prev => ({ ...prev, [hubId]: data.contributors }));
      }
    } catch { /* noop */ }
  };

  useEffect(() => { fetchAll(); }, [email]);

  /* ── Create hub ────────────────────────────────── */
  const handleCreateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    setHubError(""); setCreatingHub(true);
    try {
      const res = await fetch("/api/hubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: hubTitle,
          description: hubDescription,
          creatorEmail: email,
          creatorName: name,
          licenseKey,
          visibility: hubVisibility,
          allowedTypes: hubAllowedType === "all" ? ["code", "link", "text"] : [hubAllowedType]
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHubTitle(""); setHubDescription(""); setHubVisibility("public"); setShowCreate(false);
        fetchAll();
      } else { setHubError(data.error || "Failed to create hub"); }
    } catch (err: any) { setHubError(err.message || "Error creating hub"); }
    finally { setCreatingHub(false); }
  };

  /* ── Join hub ──────────────────────────────────── */
  const handleJoinRequest = async (hubId: string) => {
    setRequestingHubId(hubId); setJoiningHub(true);
    try {
      const res = await fetch(`/api/hubs/${hubId}/contributors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email })
      });
      if (res.ok) { alert("Contribution request submitted successfully!"); fetchAll(); }
    } catch { /* noop */ }
    finally { setJoiningHub(false); setRequestingHubId(""); }
  };

  /* ── Filtered explore list ─────────────────────── */
  const filteredExplore = exploreHubs.filter(h =>
    (h.title.toLowerCase().includes(exploreQuery.toLowerCase()) ||
      (h.description && h.description.toLowerCase().includes(exploreQuery.toLowerCase()))) &&
    h.creatorEmail.toLowerCase() !== email.toLowerCase() &&
    h.myStatus !== "approved"
  );

  const inputClass = dk
    ? 'bg-[#0b0b0b] border border-white/[0.06] focus:border-[#0077C0] text-white'
    : 'bg-[#F9FAFB] border border-black/[0.08] focus:border-[#0077C0] focus:ring-2 focus:ring-[#0077C0]/10 text-[#111827]';
  const cardClass = dk
    ? 'bg-white/[0.015] border-white/[0.05]'
    : 'bg-white/60 border-black/[0.05] shadow-sm';

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className={`text-2xl lg:text-3xl font-black font-outfit tracking-tight ${dk ? 'text-white' : 'text-[#111827]'}`}>
            Community Hubs
          </h1>
          <p className={`text-sm mt-1 ${dk ? 'text-white/40' : 'text-[#6B7280]'}`}>
            Create, manage, and discover shared resource repositories.
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${showCreate
            ? dk ? 'bg-white/[0.04] border border-white/[0.08] text-white' : 'bg-black/5 border border-black/[0.08] text-[#111827]'
            : 'bg-gradient-to-r from-[#0077C0] to-[#009BF5] text-white shadow-lg shadow-[#0077C0]/15 hover:brightness-110'
          }`}
        >
          {showCreate ? <X size={16} /> : <Plus size={16} />}
          <span>{showCreate ? "Cancel" : "Create Hub"}</span>
        </button>
      </motion.div>

      {/* Create Hub Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreateHub}
              className={`p-6 rounded-2xl border space-y-4 ${cardClass}`}
            >
              <h3 className={`text-xs font-bold uppercase tracking-wider ${dk ? 'text-[#0077C0]' : 'text-[#0077C0]'}`}>
                New Community Hub
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>Hub Title</label>
                  <input type="text" required placeholder="e.g. SysAdmin Tools" value={hubTitle}
                    onChange={e => setHubTitle(e.target.value)}
                    className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${inputClass}`} />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>Visibility</label>
                  <select value={hubVisibility} onChange={e => setHubVisibility(e.target.value as any)}
                    className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all cursor-pointer ${inputClass}`}>
                    <option value="public">Public (Listed in Catalog)</option>
                    <option value="private">Private (Hidden / Invite Only)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>Description</label>
                  <textarea rows={2} placeholder="Describe the purpose of this community repository..."
                    value={hubDescription} onChange={e => setHubDescription(e.target.value)}
                    className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all resize-none ${inputClass}`} />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${dk ? 'text-white/40' : 'text-[#9CA3AF]'}`}>Resource Format</label>
                  <select value={hubAllowedType} onChange={e => setHubAllowedType(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all cursor-pointer ${inputClass}`}
                  >
                    <option value="all">I don't know (Ask Every Time)</option>
                    <option value="code">Code / Script Only</option>
                    <option value="link">Link / URL Only</option>
                    <option value="text">Rich Text Only</option>
                  </select>
                </div>
              </div>
              {hubError && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-xs ${dk ? 'bg-red-950/30 border border-red-900/50 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                  <AlertCircle size={14} /> <span>{hubError}</span>
                </div>
              )}
              <button type="submit" disabled={creatingHub}
                className="bg-[#0077C0] hover:brightness-110 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all flex items-center gap-2"
              >
                <FolderPlus size={15} />
                <span>{creatingHub ? "Creating..." : "Create Hub"}</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two columns: My Hubs | Explore */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Left: My Repositories (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Owned Hubs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className={`text-xs font-bold uppercase tracking-wider ${dk ? 'text-white/50' : 'text-[#6B7280]'}`}>
                Hubs You Own
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${dk
                ? 'bg-[#0077C0]/10 text-[#0077C0] border-[#0077C0]/20'
                : 'bg-[#0077C0]/[0.06] text-[#0077C0] border-[#0077C0]/15'
              }`}>{ownedHubs.length}</span>
            </div>

            {loading ? (
              <div className={`py-8 text-center text-xs ${dk ? 'text-white/30' : 'text-[#9CA3AF]'}`}>Loading...</div>
            ) : ownedHubs.length === 0 ? (
              <div className={`py-8 text-center rounded-2xl border-2 border-dashed ${dk ? 'border-white/[0.04]' : 'border-black/[0.06]'}`}>
                <p className={`text-xs ${dk ? 'text-white/30' : 'text-[#9CA3AF]'}`}>No hubs created yet. Click "Create Hub" above.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {ownedHubs.map(h => {
                  const reqs = hubRequests[h.id] || [];
                  const pending = reqs.filter(r => r.status === "pending").length;
                  const approved = reqs.filter(r => r.status === "approved").length;
                  return (
                    <Link key={h.id} href={`/publish/hubs/${h.id}`}
                      className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${dk
                        ? 'bg-white/[0.015] border-white/[0.05] hover:border-[#0077C0]/30 hover:bg-[#0077C0]/[0.03]'
                        : 'bg-white/60 border-black/[0.05] hover:border-[#0077C0]/30 hover:bg-white/80 shadow-sm'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold truncate group-hover:text-[#0077C0] transition-colors ${dk ? 'text-white' : 'text-[#111827]'}`}>
                            {h.title}
                          </h4>
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${h.visibility === "private"
                            ? 'text-rose-500 border-rose-500/20 bg-rose-500/5'
                            : 'text-[#0077C0] border-[#0077C0]/20 bg-[#0077C0]/5'
                          }`}>{h.visibility || "public"}</span>
                          {pending > 0 && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                          )}
                        </div>
                        {h.description && (
                          <p className={`text-[11px] truncate mt-0.5 ${dk ? 'text-white/35' : 'text-[#9CA3AF]'}`}>{h.description}</p>
                        )}
                        <p className={`text-[10px] font-mono mt-1.5 ${dk ? 'text-white/20' : 'text-[#D1D5DB]'}`}>
                          {approved} contributor{approved !== 1 ? 's' : ''}{pending > 0 ? ` · ${pending} pending` : ''}
                        </p>
                      </div>
                      <ChevronRight size={16} className={`shrink-0 ${dk ? 'text-white/15 group-hover:text-[#0077C0]' : 'text-[#D1D5DB] group-hover:text-[#0077C0]'} transition-colors`} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Joined Hubs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className={`text-xs font-bold uppercase tracking-wider ${dk ? 'text-white/50' : 'text-[#6B7280]'}`}>
                Member Hubs
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${dk
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-emerald-500/[0.06] text-emerald-600 border-emerald-500/15'
              }`}>{joinedHubs.length}</span>
            </div>

            {joinedHubs.length === 0 ? (
              <p className={`text-xs italic py-4 text-center ${dk ? 'text-white/25' : 'text-[#9CA3AF]'}`}>
                No joined hubs yet. Explore and request to join public hubs.
              </p>
            ) : (
              <div className="space-y-2.5">
                {joinedHubs.map(h => (
                  <Link key={h.id} href={`/publish/hubs/${h.id}`}
                    className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${dk
                      ? 'bg-white/[0.015] border-white/[0.05] hover:border-emerald-500/30 hover:bg-emerald-500/[0.03]'
                      : 'bg-white/60 border-black/[0.05] hover:border-emerald-500/30 hover:bg-white/80 shadow-sm'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-sm font-bold truncate ${dk ? 'text-white group-hover:text-emerald-400' : 'text-[#111827] group-hover:text-emerald-600'} transition-colors`}>
                        {h.title}
                      </h4>
                      <p className={`text-[10px] mt-0.5 ${dk ? 'text-white/30' : 'text-[#9CA3AF]'}`}>
                        Owner: {h.creatorEmail}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${dk
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-emerald-500/[0.08] text-emerald-600'
                      }`}>Member</span>
                      <ChevronRight size={16} className={dk ? 'text-white/15' : 'text-[#D1D5DB]'} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Explore (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className={`text-xs font-bold uppercase tracking-wider ${dk ? 'text-white/50' : 'text-[#6B7280]'}`}>
            Explore Public Hubs
          </h2>

          <div className="relative">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${dk ? 'text-white/25' : 'text-[#9CA3AF]'}`} />
            <input type="text" placeholder="Search hubs..." value={exploreQuery}
              onChange={e => setExploreQuery(e.target.value)}
              className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all ${inputClass}`}
            />
          </div>

          {filteredExplore.length === 0 ? (
            <p className={`text-xs italic text-center py-8 ${dk ? 'text-white/25' : 'text-[#9CA3AF]'}`}>
              No other public hubs found.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredExplore.map(h => (
                <div key={h.id} className={`p-4 rounded-2xl border flex justify-between items-start gap-3 ${cardClass}`}>
                  <div className="min-w-0 flex-1">
                    <h4 className={`text-sm font-bold truncate ${dk ? 'text-white' : 'text-[#111827]'}`}>{h.title}</h4>
                    {h.description && (
                      <p className={`text-[11px] truncate mt-0.5 ${dk ? 'text-white/35' : 'text-[#9CA3AF]'}`}>{h.description}</p>
                    )}
                    <p className={`text-[9px] font-mono mt-1 ${dk ? 'text-[#0077C0]/60' : 'text-[#0077C0]'}`}>
                      Owner: {h.creatorEmail}
                    </p>
                  </div>
                  <button onClick={() => handleJoinRequest(h.id)}
                    disabled={(joiningHub && requestingHubId === h.id) || h.myStatus === "pending"}
                    className={`${h.myStatus === "pending" ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-[#0077C0] text-white hover:brightness-110'} disabled:opacity-50 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shrink-0`}
                  >
                    {joiningHub && requestingHubId === h.id ? "Sending..." : h.myStatus === "pending" ? "Pending" : "Join"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

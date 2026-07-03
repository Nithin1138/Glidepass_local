"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  PenSquare, Layers, Compass, ArrowRight, Users, FileCode, FolderOpen,
  Eye, Copy, Send, RefreshCw
} from "lucide-react";
import { useCreator } from "./context";

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 border-[#0077C0] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { email, name, dk, licenseKey } = useCreator();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "";

  const [ownedHubs, setOwnedHubs] = useState<any[]>([]);
  const [joinedHubs, setJoinedHubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Analytics states
  const [stats, setStats] = useState<any | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");

  const fetchAnalytics = async (quiet = false) => {
    if (!email) return;
    if (!quiet) setLoadingAnalytics(true);
    setAnalyticsError("");
    try {
      const res = await fetch(`/api/analytics?email=${encodeURIComponent(email)}&licenseKey=${encodeURIComponent(licenseKey || "")}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats);
        setResources(data.resources || []);
      } else {
        if (!quiet) setAnalyticsError(data.error || "Failed to load analytics.");
      }
    } catch (err: any) {
      if (!quiet) setAnalyticsError(err.message || "Failed to fetch analytics data.");
    } finally {
      if (!quiet) setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (currentView === "analytics" && email) {
      fetchAnalytics();
      const interval = setInterval(() => fetchAnalytics(true), 5000);
      return () => clearInterval(interval);
    }
  }, [currentView, email]);

  const fetchHubs = async (quiet = false) => {
    if (!email) return;
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`/api/hubs?contributorEmail=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const hubsList: any[] = data.hubs || [];
        setOwnedHubs(hubsList.filter((h: any) => h.creatorEmail.toLowerCase() === email.toLowerCase()));
        setJoinedHubs(hubsList.filter((h: any) => h.creatorEmail.toLowerCase() !== email.toLowerCase() && h.myStatus === "approved"));
      }
    } catch { /* noop */ }
    finally { if (!quiet) setLoading(false); }
  };

  useEffect(() => {
    if (email) {
      fetchHubs();
      const interval = setInterval(() => fetchHubs(true), 5000);
      return () => clearInterval(interval);
    }
  }, [email]);

  const totalHubs = ownedHubs.length + joinedHubs.length;
  const recentHubs = [...ownedHubs, ...joinedHubs].slice(0, 4);

  const cardClass = dk
    ? 'bg-white/[0.015] border-white/[0.05]'
    : 'bg-white/60 border-black/[0.05] shadow-sm';

  const quickActions = [
    {
      title: "Create Resource",
      desc: "Publish code, links, or text to your hub",
      icon: PenSquare,
      href: "/publish/new",
      color: "from-[#0077C0] to-[#009BF5]",
      iconBg: dk ? "bg-[#0077C0]/15 text-[#0077C0]" : "bg-[#0077C0]/10 text-[#0077C0]",
    },
    {
      title: "Manage Hubs",
      desc: "Create, configure, and organize your community hubs",
      icon: Layers,
      href: "/publish/hubs",
      color: "from-[#7C3AED] to-[#A78BFA]",
      iconBg: dk ? "bg-purple-500/15 text-purple-400" : "bg-purple-500/10 text-purple-600",
    },
    {
      title: "Browse Catalog",
      desc: "Explore the public resource discovery page",
      icon: Compass,
      href: "/resources",
      color: "from-[#059669] to-[#34D399]",
      iconBg: dk ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-500/10 text-emerald-600",
    },
  ];

  const statsList = [
    { label: "Hubs Owned", value: ownedHubs.length, icon: FolderOpen },
    { label: "Hubs Joined", value: joinedHubs.length, icon: Users },
    { label: "Total Workspaces", value: totalHubs, icon: FileCode },
  ];

  /* ── 1. Analytics View ── */
  if (currentView === "analytics") {
    return (
      <div className="px-6 lg:px-10 py-8 lg:py-10 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-6">
          <div>
            <h1 className={`text-3xl font-black font-outfit tracking-tight ${dk ? 'text-white' : 'text-[#111827]'}`}>Analytics</h1>
            <p className={`text-xs mt-1 ${dk ? 'text-white/40' : 'text-[#6B7280]'}`}>Real-time performance metrics for your published resources</p>
          </div>
          <button
            onClick={() => fetchAnalytics()}
            className={`p-2.5 rounded-xl border transition-all ${
              dk ? 'border-white/[0.08] hover:border-[#0077C0] bg-white/[0.01] text-white/70 hover:text-white' : 'border-black/[0.08] hover:border-[#0077C0] bg-white shadow-sm text-black/70 hover:text-black'
            }`}
            title="Refresh data"
          >
            <RefreshCw size={16} className={loadingAnalytics ? "animate-spin" : ""} />
          </button>
        </div>

        {analyticsError ? (
          <div className="p-8 rounded-3xl border border-red-900/50 bg-red-950/10 text-center space-y-4 max-w-md mx-auto">
            <p className="text-sm text-red-400">{analyticsError}</p>
          </div>
        ) : loadingAnalytics && !stats ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-[#0077C0] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <p className="text-xs text-[#9CA3AF]">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Resources", value: stats?.totalResources || 0, desc: "Total items published", icon: Layers },
                { label: "Views", value: stats?.totalViews || 0, desc: "Total catalog clicks", icon: Eye },
                { label: "Copies", value: stats?.totalCopies || 0, desc: "Direct clipboard copies", icon: Copy },
                { label: "Sends", value: stats?.totalSends || 0, desc: "Native device executions", icon: Send },
              ].map(s => (
                <div key={s.label} className={`p-6 rounded-2xl border ${cardClass} space-y-2`}>
                  <div className="flex items-center justify-between opacity-60">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${dk ? 'text-white' : 'text-[#6B7280]'}`}>{s.label}</span>
                    <s.icon size={16} />
                  </div>
                  <p className={`text-3xl font-extrabold font-outfit ${dk ? 'text-white' : 'text-[#111827]'}`}>{s.value}</p>
                  <p className={`text-[10px] opacity-55 ${dk ? 'text-white' : 'text-[#6B7280]'}`}>{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className={`border rounded-2xl overflow-hidden ${cardClass}`}>
              <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
                <h3 className={`font-bold font-outfit ${dk ? 'text-white' : 'text-[#111827]'}`}>Resource Performance</h3>
                <Link href="/publish/new" className="text-xs bg-[#0077C0] text-white px-3 py-1.5 rounded-lg font-bold hover:brightness-110 transition-all">
                  Publish New
                </Link>
              </div>

              {resources.length === 0 ? (
                <div className="p-12 text-center opacity-60 text-sm">
                  You have not published any resources yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className={`border-b border-white/[0.05] bg-black/[0.02] text-xs uppercase tracking-wider font-bold ${dk ? 'text-white/40' : 'text-[#6B7280]'}`}>
                        <th className="py-4 px-6">Title</th>
                        <th className="py-4 px-6">Type</th>
                        <th className="py-4 px-6 text-center">Views</th>
                        <th className="py-4 px-6 text-center">Copies</th>
                        <th className="py-4 px-6 text-center">Sends</th>
                        <th className="py-4 px-6 text-right">Published</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {resources.map((res) => (
                        <tr key={res.id} className="hover:bg-black/[0.01] transition-colors">
                          <td className={`py-4 px-6 font-semibold max-w-xs truncate ${dk ? 'text-white' : 'text-[#111827]'}`}>
                            {res.title}
                          </td>
                          <td className="py-4 px-6 text-xs">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${
                              dk ? 'bg-white/5 border-white/10 text-white/60' : 'bg-black/5 border-black/10 text-black/60'
                            }`}>
                              {res.type}
                              {res.language && ` (${res.language})`}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center font-mono text-[#0077C0] font-bold">{res.views}</td>
                          <td className="py-4 px-6 text-center font-mono text-emerald-500 font-bold">{res.copies}</td>
                          <td className="py-4 px-6 text-center font-mono text-sky-500 font-bold">{res.sends}</td>
                          <td className={`py-4 px-6 text-right text-xs opacity-60 ${dk ? 'text-white' : 'text-[#6B7280]'}`}>
                            {res.createdAt ? new Date(res.createdAt).toLocaleDateString() : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── 2. Dashboard View ── */
  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10 max-w-5xl mx-auto space-y-10">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className={`text-3xl lg:text-4xl font-black font-outfit tracking-tight ${dk ? 'text-white' : 'text-[#111827]'}`}>
          Welcome back, {name.split(" ")[0]}
        </h1>
        <p className={`text-sm mt-1.5 ${dk ? 'text-white/40' : 'text-[#6B7280]'}`}>
          Manage your resources and community hubs from here.
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {quickActions.map((a, i) => (
          <Link key={i} href={a.href}
            className={`group p-5 rounded-2xl border transition-all duration-200 hover:shadow-lg ${dk
              ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.04]'
              : 'bg-white/60 border-black/[0.05] hover:border-black/[0.1] hover:bg-white/80 shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${a.iconBg}`}>
              <a.icon size={20} />
            </div>
            <h3 className={`text-sm font-bold mb-1 ${dk ? 'text-white' : 'text-[#111827]'}`}>{a.title}</h3>
            <p className={`text-xs leading-relaxed ${dk ? 'text-white/40' : 'text-[#6B7280]'}`}>{a.desc}</p>
            <div className={`flex items-center gap-1 mt-3 text-[11px] font-semibold ${dk ? 'text-white/25 group-hover:text-[#0077C0]' : 'text-[#9CA3AF] group-hover:text-[#0077C0]'} transition-colors`}>
              <span>Open</span> <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-3 gap-4"
      >
        {statsList.map((s, i) => (
          <div key={i} className={`p-4 rounded-2xl border text-center ${dk
            ? 'bg-white/[0.015] border-white/[0.04]'
            : 'bg-white/50 border-black/[0.04]'
          }`}>
            <s.icon size={16} className={`mx-auto mb-2 ${dk ? 'text-white/25' : 'text-[#9CA3AF]'}`} />
            <p className={`text-2xl font-black font-outfit ${dk ? 'text-white' : 'text-[#111827]'}`}>
              {loading ? "–" : s.value}
            </p>
            <p className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${dk ? 'text-white/30' : 'text-[#9CA3AF]'}`}>
              {s.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Recent Hubs */}
      {!loading && recentHubs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-sm font-bold uppercase tracking-wider ${dk ? 'text-white/50' : 'text-[#6B7280]'}`}>
              Your Hubs
            </h2>
            <Link href="/publish/hubs" className="text-[11px] font-semibold text-[#0077C0] hover:underline">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentHubs.map(h => {
              const isOwned = h.creatorEmail.toLowerCase() === email.toLowerCase();
              return (
                <Link key={h.id} href={`/publish/hubs/${h.id}`}
                  className={`group p-4 rounded-2xl border transition-all duration-200 ${dk
                    ? 'bg-white/[0.015] border-white/[0.05] hover:border-[#0077C0]/30 hover:bg-[#0077C0]/[0.03]'
                    : 'bg-white/50 border-black/[0.04] hover:border-[#0077C0]/30 hover:bg-white/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-bold truncate group-hover:text-[#0077C0] transition-colors ${dk ? 'text-white' : 'text-[#111827]'}`}>
                          {h.title}
                        </h4>
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${h.visibility === "private"
                          ? 'text-rose-500 border-rose-500/20 bg-rose-500/5'
                          : 'text-[#0077C0] border-[#0077C0]/20 bg-[#0077C0]/5'
                        }`}>
                          {h.visibility || "public"}
                        </span>
                      </div>
                      {h.description && (
                        <p className={`text-[11px] truncate mt-1 ${dk ? 'text-white/35' : 'text-[#9CA3AF]'}`}>{h.description}</p>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 px-2 py-1 rounded-lg ${isOwned
                      ? dk ? 'bg-[#0077C0]/10 text-[#0077C0]' : 'bg-[#0077C0]/[0.08] text-[#0077C0]'
                      : dk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-500/[0.08] text-emerald-600'
                    }`}>
                      {isOwned ? "Owner" : "Member"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && recentHubs.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className={`text-center py-16 rounded-2xl border-2 border-dashed ${dk ? 'border-white/[0.04]' : 'border-black/[0.06]'}`}
        >
          <Layers size={32} className={`mx-auto mb-3 ${dk ? 'text-white/15' : 'text-[#D1D5DB]'}`} />
          <p className={`text-sm font-semibold ${dk ? 'text-white/30' : 'text-[#9CA3AF]'}`}>
            No hubs yet
          </p>
          <p className={`text-xs mt-1 ${dk ? 'text-white/20' : 'text-[#D1D5DB]'}`}>
            Create your first hub to start publishing resources.
          </p>
          <Link href="/publish/hubs" className="inline-block mt-4 bg-[#0077C0] text-white text-xs font-bold px-4 py-2 rounded-xl hover:brightness-110 transition-all">
            Create Hub
          </Link>
        </motion.div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ExternalLink, Zap, Sparkles, AlertCircle, Copy, Check, ChevronLeft, ArrowLeft, Users, Code, BookOpen, Sun, Moon } from "lucide-react";
import Link from "next/link";

interface Resource {
  id: string;
  title: string;
  type: string;
  language?: string;
  tags: string[];
  content: string;
  views: number;
  copies: number;
  sends: number;
  creatorName?: string;
  category?: string;
  subCategory?: string;
  topic?: string;
  createdAt?: string;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return dateStr;
};

function ResourcesPageContent() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const dk = theme === "dark";

  const cardBg = dk ? "bg-[#050505]" : "bg-[#EDEAE0]";
  const borderLight = dk ? "border-white/10" : "border-black/10";
  const clayBg = dk ? "clay-dark" : "clay-light";
  const textPrimary = dk ? "text-white" : "text-gray-900";
  const textSecondary = dk ? "text-[#A0AEC0]" : "text-gray-600";

  const [hubs, setHubs] = useState<any[]>([]);
  const [loadingHubs, setLoadingHubs] = useState(true);
  const [selectedHub, setSelectedHub] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  const [exploreQuery, setExploreQuery] = useState("");

  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceSearch, setResourceSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [loadingResources, setLoadingResources] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedResId, setExpandedResId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  
  // Reading mode & Report states
  const [readingResource, setReadingResource] = useState<Resource | null>(null);
  const [readingMode, setReadingMode] = useState<"normal" | "fullscreen">("normal");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = (newParams: {
    hub?: string | null;
    collection?: string | null;
    topic?: string | null;
    resource?: string | null;
  }) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null) {
        params.delete(key);
      } else if (val !== undefined) {
        params.set(key, val);
      }
    });
    router.push(`/resources?${params.toString()}`);
  };

  const selectHub = (hub: any | null) => {
    if (hub) {
      updateParams({ hub: hub.id, collection: null, topic: null, resource: null });
    } else {
      updateParams({ hub: null, collection: null, topic: null, resource: null });
    }
  };

  const selectCategory = (cat: any | null) => {
    if (cat) {
      updateParams({ collection: cat.name || cat.id, topic: null, resource: null });
    } else {
      updateParams({ collection: null, topic: null, resource: null });
    }
  };

  const selectTopic = (topic: any | null) => {
    if (topic) {
      updateParams({ topic: topic.name, resource: null });
    } else {
      updateParams({ topic: null, resource: null });
    }
  };

  const selectResource = (res: Resource | null) => {
    if (res) {
      updateParams({ resource: res.id });
    } else {
      updateParams({ resource: null });
    }
  };

  const handleBackNavigation = () => {
    if (readingResource) {
      selectResource(null);
    } else if (selectedTopic) {
      selectTopic(null);
    } else if (selectedCategory) {
      selectCategory(null);
    } else {
      selectHub(null);
    }
  };

  // Sync state from query parameters on mount & search param change
  useEffect(() => {
    if (hubs.length === 0) return;
    
    const hubId = searchParams.get("hub");
    if (hubId) {
      const foundHub = hubs.find(h => h.id === hubId);
      if (foundHub) {
        setSelectedHub(foundHub);
        
        const colVal = searchParams.get("collection");
        if (colVal && foundHub.categories) {
          const foundCol = foundHub.categories.find((c: any) => c.id === colVal || c.name === colVal);
          if (foundCol) {
            setSelectedCategory(foundCol);
            
            const topicVal = searchParams.get("topic");
            if (topicVal) {
              if (topicVal === "All Topics") {
                setSelectedTopic({ name: "All Topics" });
              } else {
                const foundTopic = (foundCol.topics || []).find((t: any) => t.name === topicVal);
                setSelectedTopic(foundTopic || { name: topicVal });
              }
            } else {
              setSelectedTopic(null);
            }
          } else {
            setSelectedCategory(null);
            setSelectedTopic(null);
          }
        } else {
          setSelectedCategory(null);
          setSelectedTopic(null);
        }
      } else {
        setSelectedHub(null);
        setSelectedCategory(null);
        setSelectedTopic(null);
      }
    } else {
      setSelectedHub(null);
      setSelectedCategory(null);
      setSelectedTopic(null);
    }
  }, [searchParams, hubs]);

  useEffect(() => {
    const resId = searchParams.get("resource");
    if (resId && resources.length > 0) {
      const foundRes = resources.find(r => r.id === resId);
      if (foundRes) {
        setReadingResource(foundRes);
      } else {
        setReadingResource(null);
      }
    } else {
      setReadingResource(null);
    }
  }, [searchParams, resources]);

  useEffect(() => {
    fetchHubs();
    const interval = setInterval(() => fetchHubs(true), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedHub) {
      fetchResources(selectedHub.id);
      const interval = setInterval(() => fetchResources(selectedHub.id, true), 5000);
      return () => clearInterval(interval);
    } else {
      setResources([]);
    }
  }, [selectedHub]);

  async function fetchHubs(quiet = false) {
    if (!quiet) setLoadingHubs(true);
    try {
      const res = await fetch("/api/hubs");
      const data = await res.json();
      if (data.success) {
        // Only show public hubs in discovery catalog
        setHubs((data.hubs || []).filter((h: any) => h.visibility !== "private"));
      }
    } catch (e) {
      console.error("Failed to load hubs", e);
    } finally {
      if (!quiet) setLoadingHubs(false);
    }
  }

  async function fetchResources(hubId: string, quiet = false) {
    if (!quiet) setLoadingResources(true);
    try {
      const res = await fetch(`/api/resources?hubId=${hubId}`);
      const data = await res.json();
      if (data.success) {
        setResources(data.resources || []);
      }
    } catch (e) {
      console.error("Failed to load resources", e);
    } finally {
      if (!quiet) setLoadingResources(false);
    }
  }

  async function handleCopy(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      
      // Increment copy metric in backend
      await fetch(`/api/resources/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy" }),
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSendToLanpad(res: Resource) {
    setSendingId(res.id);
    try {
      await fetch(`/api/resources/${res.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sends" }),
      });

      const response = await fetch("http://127.0.0.1:8000/receive_resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: res.title,
          content: res.content,
          type: res.type,
          language: res.language,
        }),
        mode: "cors"
      });

      if (response.ok) {
        alert(`Successfully sent '${res.title}' to paired LANpad! Redirecting to Control Center...`);
        const params = new URLSearchParams();
        params.append("code", res.content);
        params.append("title", res.title);
        if (res.language) {
          params.append("language", res.language);
        }
        window.location.href = `http://localhost:8000/center?${params.toString()}`;
      } else {
        alert("Failed to send. Ensure your desktop application uvicorn server is running locally on port 8000.");
      }
    } catch (e) {
      alert("Pairing bridge offline. Please keep uvicorn active or use standard Copy.");
    } finally {
      setSendingId(null);
    }
  }

  async function handleReportSubmit() {
    if (!readingResource) return;
    setReporting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: "resource",
          target_id: readingResource.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      if (res.ok) {
        alert("Thank you. Report received and flagged for administrator moderation.");
        setShowReportModal(false);
        setReportDetails("");
      } else {
        alert("Failed to submit report. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Error submitting report.");
    } finally {
      setReporting(false);
    }
  }

  const filteredHubs = hubs.filter((h) => {
    const q = exploreQuery.toLowerCase();
    return (
      h.title.toLowerCase().includes(q) ||
      (h.description && h.description.toLowerCase().includes(q)) ||
      h.id.toLowerCase().includes(q)
    );
  });

  const filteredResources = resources.filter((r) => {
    // Category filter
    const matchesCategory = selectedCategory
      ? r.category?.toLowerCase() === selectedCategory.name.toLowerCase() ||
        r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()
      : true;

    // Topic filter
    const matchesTopic = selectedTopic
      ? selectedTopic.name === "All Topics"
        ? true
        : r.topic?.toLowerCase() === selectedTopic.name.toLowerCase()
      : true;

    // Search query filter
    const matchesSearch = resourceSearch
      ? r.title.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        r.content.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        r.tags.some((t) => t.toLowerCase().includes(resourceSearch.toLowerCase()))
      : true;

    // Type filter
    const matchesType = typeFilter ? r.type === typeFilter : true;

    // Language filter
    const matchesLang = langFilter ? r.language === langFilter : true;

    return matchesCategory && matchesTopic && matchesSearch && matchesType && matchesLang;
  });

  // Sort resources
  const sortedResources = [...filteredResources].sort((a, b) => {
    if (sortBy === "views") {
      return b.views - a.views;
    } else if (sortBy === "sends") {
      return b.sends - a.sends;
    } else if (sortBy === "copies") {
      return b.copies - a.copies;
    } else {
      // default: recent
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    }
  });

  return (
    <div className={`h-[100dvh] flex flex-col ${cardBg} ${textPrimary} font-sans antialiased relative overflow-hidden transition-colors duration-200`}>
      {/* Decorative glow */}
      {dk && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,119,192,0.08)_0,transparent_60%)] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(199,238,255,0.05)_0,transparent_60%)] pointer-events-none" />
        </>
      )}

      {/* ── NAV ── */}
      <header className={`shrink-0 border-b ${borderLight} backdrop-blur-md z-50 ${dk ? "bg-[#050505]/80" : "bg-[#EDEAE0]/80"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedHub ? (
              <button
                onClick={handleBackNavigation}
                className={`flex items-center gap-1.5 text-[10px] font-bold ${textSecondary} hover:text-sky-500 transition-colors cursor-pointer`}
              >
                <ArrowLeft size={13} /> Back
              </button>
            ) : (
              <Link href="/" className={`flex items-center gap-1.5 text-[10px] font-bold ${textSecondary} hover:text-sky-500 transition-colors`}>
                <ArrowLeft size={13} /> Home
              </Link>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dk ? "border-sky-400/20 bg-sky-400/5 text-sky-400" : "border-sky-600/20 bg-sky-600/5 text-sky-600"}`}>
              Resources
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`p-2 rounded-xl border ${borderLight} hover:bg-white/5 transition-colors cursor-pointer`}
              title="Toggle Theme"
            >
              {dk ? <Sun size={13} className="text-white/60" /> : <Moon size={13} className="text-gray-700" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── BREADCRUMB PILL BAR (layers 2/3/4) ── */}
      {selectedHub && (
        <div className={`shrink-0 border-b ${borderLight} ${dk ? "bg-[#050505]/70" : "bg-[#EDEAE0]/70"} backdrop-blur-md z-30`}>
          <div className="w-full max-w-7xl mx-auto px-3 md:px-6 h-10 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={handleBackNavigation}
              className="flex items-center gap-1 shrink-0 text-[10px] font-bold text-sky-500 hover:opacity-75 transition-all"
            >
              <ArrowLeft size={11} />
              <span className="hidden sm:inline">Hubs</span>
              <span className="sm:hidden">←</span>
            </button>
            <span className={`${dk ? "text-white/20" : "text-black/20"} shrink-0`}>›</span>
            <button
              onClick={() => updateParams({ collection: null, topic: null, resource: null })}
              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                !selectedCategory ? `${dk ? "bg-white/10 text-white" : "bg-black/10 text-black"}` : `${dk ? "text-white/50 hover:text-white" : "text-black/50 hover:text-black"}`
              }`}
            >
              {selectedHub.title.length > 14 ? selectedHub.title.slice(0, 14) + "…" : selectedHub.title}
            </button>
            {selectedCategory && (
              <>
                <span className={`${dk ? "text-white/20" : "text-black/20"} shrink-0`}>›</span>
                <button
                  onClick={() => selectTopic(null)}
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    !selectedTopic ? `${dk ? "bg-purple-400/15 text-purple-300" : "bg-purple-500/10 text-purple-600"}` : `${dk ? "text-white/50 hover:text-purple-300" : "text-black/50 hover:text-purple-600"}`
                  }`}
                >
                  {selectedCategory.name.length > 12 ? selectedCategory.name.slice(0, 12) + "…" : selectedCategory.name}
                </button>
              </>
            )}
            {selectedTopic && (
              <>
                <span className={`${dk ? "text-white/20" : "text-black/20"} shrink-0`}>›</span>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  dk ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-500/10 text-emerald-600"
                }`}>
                  {selectedTopic.name.length > 12 ? selectedTopic.name.slice(0, 12) + "…" : selectedTopic.name}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <main className="flex-1 min-h-0 flex flex-col w-full max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          {!selectedHub ? (
            /* ==================== LAYER 1: HUB SELECTOR ==================== */
            <motion.div
              key="hub-select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 min-h-0 flex flex-col gap-3"
            >
              {/* Header + Search */}
              <div className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${borderLight} ${dk ? "bg-white/[0.03] text-[#C7EEFF]" : "bg-black/[0.03] text-sky-600"} text-[10px] font-bold mb-1`}>
                    <Sparkles size={10} /> Discovery Browser
                  </div>
                  <h1 className={`text-lg md:text-2xl font-extrabold tracking-tight font-outfit ${textPrimary}`}>Community Hubs</h1>
                  <p className={`text-[10px] md:text-xs ${textSecondary} mt-0.5`}>Browse public hubs to explore code, templates and resources.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textSecondary}`} />
                  <input
                    type="text"
                    placeholder="Search hubs…"
                    value={exploreQuery}
                    onChange={(e) => setExploreQuery(e.target.value)}
                    className={`w-full text-xs rounded-xl pl-9 pr-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${dk ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-gray-900"}`}
                  />
                </div>
              </div>

              {/* Hub Cards */}
              <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                {loadingHubs ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 rounded-full border-2 border-t-[#0077C0] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  </div>
                ) : filteredHubs.length === 0 ? (
                  <div className={`text-center py-16 border border-dashed ${borderLight} rounded-3xl`}>
                    <Users className={`w-8 h-8 mx-auto ${textSecondary} mb-3`} />
                    <p className={`text-xs ${textSecondary}`}>No public hubs found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {filteredHubs.map((hub) => (
                      <div
                        key={hub.id}
                        onClick={() => selectHub(hub)}
                        className={`group rounded-[20px] border ${borderLight} ${clayBg} hover:border-[#0077C0]/40 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0077C0]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="p-4 flex-1">
                          <div className="space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <h3 className={`font-bold group-hover:text-sky-500 transition-colors text-sm uppercase tracking-wide ${textPrimary} truncate flex-1`}>{hub.title}</h3>
                              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${dk ? "border-[#0077C0]/20 bg-[#0077C0]/5 text-[#C7EEFF]" : "border-[#0077C0]/40 bg-[#0077C0]/10 text-[#0077C0]"}`}>{hub.id}</span>
                            </div>
                            {hub.description && <p className={`text-[10px] ${textSecondary} line-clamp-2 leading-relaxed`}>{hub.description}</p>}
                          </div>
                        </div>
                        <div className={`px-4 py-3 border-t ${borderLight} bg-black/[0.015] flex items-center justify-between gap-3`}>
                          <span className={`text-[9px] ${textSecondary} truncate`}>{hub.creatorName || "Anonymous"}</span>
                          <span className="text-[10px] font-bold text-[#0077C0] group-hover:translate-x-0.5 transition-transform">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

          ) : (
            /* ==================== LAYERS 2 / 3 / 4 ==================== */
            <motion.div
              key="hub-conduit-flow"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 min-h-0 flex flex-col gap-3"
            >
              {/* LAYER 2: Category */}
              {selectedHub.categories && selectedHub.categories.length > 0 && !selectedCategory ? (
                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                  <p className={`text-[9px] font-bold uppercase tracking-widest text-[#0077C0] mb-3`}>Step 2 · Select Collection in {selectedHub.title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedHub.categories.map((cat: any) => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      const hasTodayResource = resources.some(r =>
                        !(r as any).isDeleted &&
                        (r.category?.toLowerCase() === cat.name.toLowerCase() || r.subCategory?.toLowerCase() === cat.name.toLowerCase()) &&
                        r.topic === todayStr
                      );
                      const isTodayInCustomTopics = (cat.topics || []).some((t: any) => t.name === todayStr);

                      // Calculate date range of topics in this category
                      const topicDates = (cat.topics || [])
                        .map((t: any) => t.name)
                        .filter((name: string) => /^\d{4}-\d{2}-\d{2}$/.test(name))
                        .sort();
                      
                      let dateRangeStr = "No active topics";
                      if (topicDates.length > 0) {
                        const minDate = topicDates[0];
                        const maxDate = topicDates[topicDates.length - 1];
                        dateRangeStr = minDate === maxDate ? minDate : `${minDate} ➔ ${maxDate}`;
                      }

                      const topicsCount = (cat.topics?.length || 0) + (hasTodayResource && !isTodayInCustomTopics ? 1 : 0);

                      return (
                        <div
                          key={cat.name}
                          onClick={() => selectCategory(cat)}
                          className={`group rounded-[22px] border ${borderLight} ${dk ? "bg-[#090b0e] hover:bg-[#0e1116]" : "bg-white"} hover:border-sky-400/30 transition-all cursor-pointer flex flex-col justify-between min-h-[130px] relative overflow-hidden`}
                        >
                          <div className="p-4 flex-1">
                            <div className="space-y-3">
                              {/* Collection Badge */}
                              <div className="flex">
                                <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  dk ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" : "bg-sky-50 text-sky-700 border border-sky-200"
                                }`}>
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                                  Collection
                                </span>
                              </div>

                              {/* Title */}
                              <h4 className={`text-sm md:text-base font-extrabold tracking-tight ${textPrimary} leading-tight`}>
                                {cat.name}
                              </h4>

                              {/* Date range */}
                              <div className={`flex items-center gap-1.5 text-[9px] md:text-[10px] ${textSecondary}`}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                                <span>{dateRangeStr}</span>
                              </div>
                            </div>
                          </div>

                          {/* Topics Count Footer */}
                          <div className={`px-4 py-3 border-t ${dk ? "border-white/[0.06]" : "border-black/[0.06]"} bg-black/[0.015] flex justify-between items-center`}>
                            <div className={`flex items-center gap-1.5 text-[9px] md:text-[10px] ${textSecondary}`}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                              <span>{topicsCount} {topicsCount === 1 ? "Topic" : "Topics"}</span>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all"><path d="m9 18 6-6-6-6"/></svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              ) : selectedHub.categories && selectedHub.categories.length > 0 && selectedCategory && !selectedTopic ? (
                /* LAYER 3: Topic */
                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-4">
                  <p className={`text-[9px] font-bold uppercase tracking-widest text-emerald-500`}>Step 3 · Select Topic in {selectedCategory.name}</p>
                  
                  {/* Today Card Section */}
                  {(() => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const todayTopic = (selectedCategory.topics || []).find((t: any) => t.name === todayStr);
                    const count = resources.filter(r => (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) && r.topic === todayStr).length;
                    
                    return (
                      <div
                        onClick={() => selectTopic({ name: todayStr })}
                        className={`group rounded-[22px] border border-emerald-500/50 ${dk ? "bg-[#090b0e] hover:bg-[#0e1116]" : "bg-white"} transition-all cursor-pointer flex flex-col justify-between min-h-[130px] relative overflow-hidden`}
                      >
                        <div className="p-4 flex-1">
                          <div className="space-y-3">
                            {/* Badge: Category */}
                            <div className="flex">
                              <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                                {selectedCategory.name}
                              </span>
                            </div>

                            {/* Title */}
                            <h4 className={`text-sm md:text-base font-extrabold tracking-tight ${textPrimary} group-hover:text-emerald-400 transition-colors leading-tight`}>
                              {/^\d{4}-\d{2}-\d{2}$/.test(todayTopic?.title || "") ? formatDate(todayTopic.title) : (todayTopic?.title || "Today's Content")}
                            </h4>

                            {/* Date */}
                            <div className={`flex items-center gap-1.5 text-[9px] md:text-[10px] ${textSecondary}`}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                              <span>{formatDate(todayStr)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer: Snippet Count & Arrow */}
                        <div className={`px-4 py-3 border-t ${dk ? "border-emerald-500/20" : "border-emerald-500/30"} bg-emerald-500/[0.02] flex justify-between items-center`}>
                          <div className={`flex items-center gap-1.5 text-[9px] md:text-[10px] ${textSecondary}`}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                            <span>{count} {count === 1 ? "Resource Available" : "Resources Available"}</span>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all"><path d="m9 18 6-6-6-6"/></svg>
                        </div>
                      </div>
                    );
                  })()}

                  {/* All Other Topics Grid */}
                  <div className="flex flex-col gap-4 pt-2">
                    {(() => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      const resourceTopics = Array.from(new Set(resources
                        .filter(r => 
                          (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() ||
                           r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) &&
                          r.topic && 
                          /^\d{4}-\d{2}-\d{2}$/.test(r.topic)
                        )
                        .map(r => r.topic)
                      ));
                      const allTopicNames = Array.from(new Set([
                        ...(selectedCategory.topics || []).map((t: any) => t.name),
                        ...resourceTopics
                      ]));
                      const sortedPastTopics = allTopicNames
                        .filter(name => name !== todayStr)
                        .map(name => {
                          const existing = (selectedCategory.topics || []).find((t: any) => t.name === name);
                          return existing || { name, title: name };
                        })
                        .sort((a, b) => b.name.localeCompare(a.name));

                      return sortedPastTopics.map((topic: any) => {
                        const count = resources.filter(r => (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) && r.topic?.toLowerCase() === topic.name.toLowerCase()).length;
                        const displayTitle = /^\d{4}-\d{2}-\d{2}$/.test(topic.title || "") ? formatDate(topic.title) : (topic.title || formatDate(topic.name));

                        return (
                          <div
                            key={topic.name}
                            onClick={() => selectTopic(topic)}
                            className={`group rounded-[22px] border ${borderLight} ${dk ? "bg-[#090b0e] hover:bg-[#0e1116]" : "bg-white"} hover:border-emerald-400/30 transition-all cursor-pointer flex flex-col justify-between min-h-[130px] relative overflow-hidden`}
                          >
                            <div className="p-4 flex-1">
                              <div className="space-y-3">
                                {/* Badge: Category */}
                                <div className="flex">
                                  <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                    dk ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" : "bg-sky-50 text-sky-700 border border-sky-200"
                                  }`}>
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                                    {selectedCategory.name}
                                  </span>
                                </div>

                                {/* Title */}
                                <h4 className={`text-sm md:text-base font-extrabold tracking-tight ${textPrimary} leading-tight`}>
                                  {displayTitle}
                                </h4>

                                {/* Date */}
                                <div className={`flex items-center gap-1.5 text-[9px] md:text-[10px] ${textSecondary}`}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                                  <span>{formatDate(topic.name)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Footer */}
                            <div className={`px-4 py-3 border-t ${dk ? "border-white/[0.06]" : "border-black/[0.06]"} bg-black/[0.015] flex justify-between items-center`}>
                              <div className={`flex items-center gap-1.5 text-[9px] md:text-[10px] ${textSecondary}`}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                                <span>{count} {count === 1 ? "Resource Available" : "Resources Available"}</span>
                              </div>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" strokeLinecap="round" strokeLinejoin="round" className="text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all"><path d="m9 18 6-6-6-6"/></svg>
                            </div>
                          </div>
                        );
                      });
                    })()}

                    {/* All Topics */}
                    <div
                      onClick={() => selectTopic({ name: "All Topics" })}
                      className={`group rounded-[22px] border border-dashed ${borderLight} ${dk ? "bg-white/[0.01] hover:bg-white/[0.03]" : "bg-black/[0.01] hover:bg-black/[0.02]"} hover:border-sky-400/30 transition-all cursor-pointer flex flex-col justify-between min-h-[130px] relative overflow-hidden`}
                    >
                      <div className="p-4 flex-1">
                        <div className="space-y-3">
                          <div className="flex">
                            <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              dk ? "bg-white/10 text-white/70" : "bg-black/5 text-black/70"
                            }`}>
                              All
                            </span>
                          </div>
                          <h4 className={`text-sm md:text-base font-extrabold tracking-tight ${textSecondary} group-hover:text-sky-500 transition-colors leading-tight`}>
                            All Topics
                          </h4>
                          <p className={`text-[9px] md:text-[10px] ${textSecondary}`}>Show all in {selectedCategory.name}</p>
                        </div>
                      </div>
                      <div className={`px-4 py-3 border-t border-dashed ${dk ? "border-white/[0.06]" : "border-black/[0.06]"} bg-black/[0.015] flex justify-end`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all"><path d="m9 18 6-6-6-6"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

              ) : (
                /* LAYER 4: Resources */
                <div className="flex-1 min-h-0 flex flex-col gap-3">
                  {/* Filter toolbar */}
                  <div className="shrink-0 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[140px]">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textSecondary}`} />
                      <input
                        type="text"
                        placeholder="Search resources…"
                        value={resourceSearch}
                        onChange={(e) => setResourceSearch(e.target.value)}
                        className={`w-full text-xs rounded-xl pl-9 pr-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${dk ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-gray-900"}`}
                      />
                    </div>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className={`text-xs border ${borderLight} ${dk ? "bg-black/40 text-white" : "bg-white text-gray-900"} rounded-xl px-3 py-2.5 outline-none cursor-pointer`}
                    >
                      <option value="">All Types</option>
                      <option value="code">Code</option>
                      <option value="link">Links</option>
                      <option value="text">Text</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={`text-xs border ${borderLight} ${dk ? "bg-black/40 text-white" : "bg-white text-gray-900"} rounded-xl px-3 py-2.5 outline-none cursor-pointer`}
                    >
                      <option value="recent">Recent</option>
                      <option value="views">Views</option>
                      <option value="sends">Sent</option>
                      <option value="copies">Copied</option>
                    </select>
                  </div>

                  {/* Resource list */}
                  <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                    {loadingResources ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 rounded-full border-2 border-t-[#0077C0] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                      </div>
                    ) : sortedResources.length === 0 ? (
                      <div className={`text-center py-16 border border-dashed ${borderLight} rounded-3xl`}>
                        <Code className={`w-8 h-8 mx-auto ${textSecondary} mb-3`} />
                        <p className={`text-xs ${textSecondary}`}>No resources match your filters.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {sortedResources.map((res, idx) => (
                          <div
                            key={res.id}
                            onClick={() => setExpandedResId(expandedResId === res.id ? null : res.id)}
                            className={`rounded-[20px] border ${borderLight} ${
                              dk
                                ? "bg-[#090b0e] hover:bg-[#0e1116] hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                                : "bg-white hover:bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                            } hover:border-sky-500/30 hover:-translate-y-[1px] transition-all duration-200 cursor-pointer overflow-hidden`}
                          >
                            {/* Top row */}
                            <div className="p-4 flex items-center justify-between gap-3">
                              {/* Title / Snippet Num */}
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className={`px-2 py-0.5 text-[9px] font-extrabold font-mono rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20 shrink-0`}>
                                  #{idx + 1}
                                </span>
                                <h4 className={`text-xs md:text-sm font-extrabold truncate ${textPrimary}`}>
                                  {res.title}
                                </h4>
                              </div>

                              {/* Action Items & Language */}
                              <div className="flex items-center gap-2 shrink-0">
                                {/* Copy Button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopy(res.id, res.content); }}
                                  className={`p-1.5 rounded-lg text-gray-400 hover:text-sky-500 ${dk ? "hover:bg-white/5" : "hover:bg-black/5"} transition-all`}
                                  title="Copy content"
                                >
                                  {copiedId === res.id ? (
                                    <Check size={13} className="text-emerald-400" />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>

                                {/* Open Details Modal Icon Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectResource(res);
                                    setReadingMode("normal");
                                  }}
                                  className={`p-1.5 rounded-lg text-gray-400 hover:text-sky-500 ${dk ? "hover:bg-white/5" : "hover:bg-black/5"} transition-all`}
                                  title="Open details view"
                                >
                                  <BookOpen size={13} />
                                </button>

                                {/* Lang Badge */}
                                {res.language && (
                                  <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                    dk ? "bg-white/10 text-white/70" : "bg-black/5 text-black/70"
                                  }`}>
                                    {res.language}
                                  </span>
                                )}

                                {/* Chevron Expand Icon */}
                                <div className="p-1 text-gray-400">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${expandedResId === res.id ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
                                </div>
                              </div>
                            </div>

                            {/* Expanded code preview */}
                            <AnimatePresence>
                              {expandedResId === res.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4">
                                    <div className="rounded-[16px] border border-white/[0.05] bg-black p-4 overflow-hidden">
                                      <pre className="text-[11px] font-mono overflow-x-auto text-[#a5d6ff] text-left max-h-60 scrollbar-none leading-relaxed">
                                        <code>{res.content}</code>
                                      </pre>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Bottom row */}
                            <div className={`px-4 py-3 border-t ${borderLight} bg-white/[0.01] flex items-center justify-between gap-3`}>
                              <span className={`inline-flex items-center gap-1 text-[10px] ${textSecondary}`}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-60"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <span>by: <strong className={textPrimary}>{res.creatorName || "Anonymous"}</strong></span>
                              </span>

                              {/* Command Center button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSendToLanpad(res); }}
                                disabled={sendingId === res.id}
                                className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-[#0077C0] hover:from-sky-400 hover:to-[#008be0] active:scale-[0.97] text-white text-[9px] font-extrabold uppercase px-3.5 py-1.5 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50`}
                              >
                                <Zap size={10} className={sendingId === res.id ? "animate-pulse" : ""} />
                                Command Center
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* READING MODE MODAL */}
      <AnimatePresence>
        {readingResource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 ${
              dk ? "bg-black/85 backdrop-blur-md" : "bg-black/40 backdrop-blur-sm"
            }`}
            onClick={() => selectResource(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className={`flex flex-col transition-all duration-300 relative border ${
                dk ? "bg-[#05070a] border-white/10 text-white" : "bg-[#EDEAE0] border-black/10 text-gray-900"
              } ${
                readingMode === "fullscreen" 
                  ? "w-screen h-screen rounded-none border-none" 
                  : "w-full max-w-4xl h-[85vh] rounded-[24px]"
              }`}
            >
              {/* Floating Fullscreen Controls */}
              {readingMode === "fullscreen" && (
                <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/20 p-2 rounded-2xl">
                  {/* Zoom controls */}
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.15))}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                    title="Zoom In"
                  >
                    A+
                  </button>
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.15))}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                    title="Zoom Out"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                  
                  {/* Exit Fullscreen */}
                  <button
                    onClick={() => setReadingMode("normal")}
                    className="p-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold transition-all flex items-center gap-1"
                  >
                    Exit Fullscreen
                  </button>
                </div>
              )}

              {/* Header (Only in Normal mode) */}
              {readingMode === "normal" && (
                <div className={`p-4 md:p-5 border-b flex items-center justify-between gap-4 shrink-0 ${
                  dk ? "border-white/10 bg-black/30" : "border-black/10 bg-black/5"
                }`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[9px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {readingResource.type}
                      </span>
                      {readingResource.language && (
                        <span className={`text-[9px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                          dk ? "bg-white/5 text-white/70 border-white/10" : "bg-black/5 text-gray-700 border-black/10"
                        }`}>
                          {readingResource.language}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-sm md:text-lg font-extrabold truncate leading-tight ${textPrimary}`}>
                      {readingResource.title}
                    </h3>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Zoom In/Out */}
                    <div className={`flex items-center gap-1 border rounded-xl px-1.5 py-0.5 ${
                      dk ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"
                    }`}>
                      <button
                        onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.15))}
                        className={`p-1 text-[10px] font-extrabold rounded hover:bg-white/10 ${dk ? "text-white" : "text-black"}`}
                        title="Zoom In"
                      >
                        A+
                      </button>
                      <span className={`text-[9px] px-1 font-mono ${dk ? "text-gray-400" : "text-gray-600"}`}>
                        {Math.round(zoomLevel * 100)}%
                      </span>
                      <button
                        onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.15))}
                        className={`p-1 text-[10px] font-extrabold rounded hover:bg-white/10 ${dk ? "text-white" : "text-black"}`}
                        title="Zoom Out"
                      >
                        A-
                      </button>
                    </div>

                    {/* Copy */}
                    <button
                      onClick={() => handleCopy(readingResource.id, readingResource.content)}
                      className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                        dk ? "border-white/10 hover:bg-white/10 text-sky-400" : "border-black/10 hover:bg-black/5 text-sky-600"
                      }`}
                    >
                      {copiedId === readingResource.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      <span className="hidden sm:inline">{copiedId === readingResource.id ? "Copied" : "Copy"}</span>
                    </button>

                    {/* Mode Toggle */}
                    <button
                      onClick={() => setReadingMode("fullscreen")}
                      className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                        dk ? "border-white/10 hover:bg-white/10 text-white" : "border-black/10 hover:bg-black/5 text-gray-800"
                      }`}
                      title="Fullscreen Mode"
                    >
                      <Sparkles size={14} className="text-yellow-500" />
                      <span className="hidden sm:inline">Fullscreen</span>
                    </button>

                    {/* Close */}
                    <button
                      onClick={() => selectResource(null)}
                      className={`p-2 rounded-xl border transition-all text-xs font-bold ${
                        dk ? "border-white/10 hover:bg-white/10 text-gray-400 hover:text-white" : "border-black/10 hover:bg-black/5 text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Content Body */}
              <div className={`flex-1 min-h-0 overflow-y-auto p-4 md:p-6 ${
                dk ? "bg-black" : "bg-white"
              }`}>
                <pre 
                  style={{ fontSize: `${zoomLevel * 12}px` }}
                  className={`font-mono leading-relaxed whitespace-pre-wrap select-text break-all transition-all duration-150 ${
                    dk ? "text-[#a5d6ff]" : "text-gray-800"
                  }`}
                >
                  <code>{readingResource.content}</code>
                </pre>
              </div>

              {/* Footer (Only in Normal mode) */}
              {readingMode === "normal" && (
                <div className={`p-4 md:p-5 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 text-xs ${
                  dk ? "border-white/10 bg-black/40 text-gray-400" : "border-black/10 bg-black/5 text-gray-600"
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span>contributed by:</span>
                      <strong className={textPrimary}>{readingResource.creatorName || "Anonymous"}</strong>
                    </div>
                    {selectedHub && (
                      <div className="flex items-center gap-1.5 text-[11px] opacity-80">
                        <span>hub creator:</span>
                        <strong className={textPrimary}>{selectedHub.creatorName || "Anonymous"}</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    {/* Report Button */}
                    <button
                      onClick={() => {
                        setReportReason("spam");
                        setReportDetails("");
                        setShowReportModal(true);
                      }}
                      className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all text-xs"
                    >
                      <AlertCircle size={13} />
                      Report Abuse
                    </button>

                    {/* Command Center */}
                    <button
                      onClick={() => handleSendToLanpad(readingResource)}
                      disabled={sendingId === readingResource.id}
                      className="bg-[#0077C0] hover:bg-[#0095f0] text-white font-bold px-4 py-2 rounded-xl shadow transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
                    >
                      <Zap size={13} className={sendingId === readingResource.id ? "animate-pulse" : ""} />
                      Command Center
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT SUBMIT OVERLAY MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md bg-[#090b0e] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl"
            >
              <h3 className="text-lg font-bold text-white">Report Inappropriate Content</h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1.5">Reason for Report</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-black border border-white/15 rounded-xl p-3 outline-none text-white focus:border-red-500"
                  >
                    <option value="spam">Spam / Advertising</option>
                    <option value="abuse">Harmful or Dangerous Code</option>
                    <option value="copyright">Copyright Infringement</option>
                    <option value="other">Other Violation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1.5">Details (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details about why this content is violating policies..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full bg-black border border-white/15 rounded-xl p-3 outline-none text-white focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 text-xs">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportSubmit}
                  disabled={reporting}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all disabled:opacity-50"
                >
                  {reporting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#EDEAE0]">
        <div className="w-6 h-6 border-2 border-[#0077C0] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResourcesPageContent />
    </Suspense>
  );
}


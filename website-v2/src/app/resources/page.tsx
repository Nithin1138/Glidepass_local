"use client";

import React, { useState, useEffect } from "react";
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

export default function ResourcesPage() {
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

  useEffect(() => {
    fetchHubs();
  }, []);

  useEffect(() => {
    if (selectedHub) {
      fetchResources(selectedHub.id);
    } else {
      setResources([]);
    }
  }, [selectedHub]);

  async function fetchHubs() {
    setLoadingHubs(true);
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
      setLoadingHubs(false);
    }
  }

  async function fetchResources(hubId: string) {
    setLoadingResources(true);
    try {
      const res = await fetch(`/api/resources?hubId=${hubId}`);
      const data = await res.json();
      if (data.success) {
        setResources(data.resources || []);
      }
    } catch (e) {
      console.error("Failed to load resources", e);
    } finally {
      setLoadingResources(false);
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
    <div className={`min-h-screen ${cardBg} ${textPrimary} ${theme} font-sans antialiased selection:bg-[#C7EEFF]/20 selection:text-[#C7EEFF] relative overflow-hidden transition-colors duration-200`}>
      {/* Decorative gradient glow */}
      {dk && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,119,192,0.08)_0,transparent_60%)] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(199,238,255,0.05)_0,transparent_60%)] pointer-events-none" />
        </>
      )}

      {/* Header */}
      <header className={`border-b ${borderLight} backdrop-blur-md sticky top-0 z-50 ${dk ? "bg-[#050505]/80" : "bg-[#EDEAE0]/80"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className={`text-xl font-bold tracking-tight ${dk ? "bg-gradient-to-r from-white via-[#C7EEFF] to-[#0077C0] bg-clip-text text-transparent" : "text-gray-900"} font-outfit`}>
              LANpad
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-6">
              <Link href="/" className={`text-sm ${textSecondary} hover:text-sky-500 transition-colors`}>
                Home
              </Link>
            </nav>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`p-2 rounded-xl border ${borderLight} hover:bg-white/5 transition-colors cursor-pointer`}
              title="Toggle Theme"
            >
              {dk ? (
                <Sun size={14} className="text-white/60" />
              ) : (
                <Moon size={14} className="text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">
          {!selectedHub ? (
            /* ==================== STEP 1: HUB SELECTOR ==================== */
            <motion.div
              key="hub-select"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Split Header: Text Left, Search Right */}
              <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b ${borderLight}`}>
                <div className="space-y-3 text-left">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${borderLight} ${dk ? "bg-white/[0.03] text-[#C7EEFF]" : "bg-black/[0.03] text-sky-600"} text-xs font-bold`}>
                    <Sparkles size={12} />
                    Step 1: Select Community Hub
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-outfit">
                    Resource Discovery
                  </h1>
                  <p className={`text-sm ${textSecondary} max-w-xl`}>
                    Choose a shared community hub below to explore organized code categories, templates, and active resources.
                  </p>
                </div>

                {/* Hub search bar at right */}
                <div className="relative max-w-xs w-full shrink-0">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary} w-4 h-4`} />
                  <input
                    type="text"
                    placeholder="Search shared hubs..."
                    value={exploreQuery}
                    onChange={(e) => setExploreQuery(e.target.value)}
                    className={`w-full bg-[#0b0b0b] ${dk ? "text-white" : "text-gray-900 bg-white"} border ${borderLight} focus:border-[#0077C0] rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all`}
                  />
                </div>
              </div>

              {/* Hub Cards List */}
              {loadingHubs ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-t-[#0077C0] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <p className={`text-xs ${textSecondary}`}>Loading available hubs...</p>
                </div>
              ) : filteredHubs.length === 0 ? (
                <div className={`text-center py-20 border border-dashed ${borderLight} rounded-3xl`}>
                  <Users className={`w-10 h-10 mx-auto ${textSecondary} mb-4`} />
                  <h3 className="font-bold mb-1">No community hubs found</h3>
                  <p className={`text-xs ${textSecondary}`}>Try adjusting your search query.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredHubs.map((hub) => (
                    <div
                      key={hub.id}
                      onClick={() => {
                        setSelectedHub(hub);
                        setSelectedCategory(null);
                        setSelectedTopic(null);
                      }}
                      className={`group p-6 rounded-2xl border ${borderLight} ${clayBg} hover:scale-[1.02] transition-all cursor-pointer flex flex-col justify-between min-h-[160px] relative overflow-hidden`}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0077C0]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold group-hover:text-sky-500 transition-colors text-lg truncate max-w-[200px]">
                            {hub.title}
                          </h3>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${dk ? "border-[#0077C0]/20 bg-[#0077C0]/5 text-[#C7EEFF]" : "border-[#0077C0]/40 bg-[#0077C0]/10 text-[#0077C0]"}`}>
                            {hub.id}
                          </span>
                        </div>
                        {hub.description && (
                          <p className={`text-xs ${textSecondary} line-clamp-2 leading-relaxed`}>
                            {hub.description}
                          </p>
                        )}
                      </div>

                      <div className={`pt-4 flex items-center justify-between border-t ${borderLight}`}>
                        <span className={`text-[10px] ${textSecondary}`}>
                          Owner: {hub.creatorName || "Anonymous"}
                        </span>
                        <span className="text-xs font-bold text-[#0077C0] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Enter Hub &rarr;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            /* ==================== STEPS 2, 3, 4: HUB CONDUIT FLOW ==================== */
            <motion.div
              key="hub-conduit-flow"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Back / Breadcrumbs Navigation bar */}
              <div className={`flex flex-wrap items-center gap-3 pb-4 border-b ${borderLight}`}>
                <button
                  onClick={() => {
                    setSelectedHub(null);
                    setSelectedCategory(null);
                    setSelectedTopic(null);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#0077C0] hover:opacity-75 transition-all cursor-pointer bg-transparent border-0 outline-none"
                >
                  <ArrowLeft size={14} /> Switch Hubs
                </button>
                {selectedCategory && (
                  <>
                    <span className="text-white/30">&bull;</span>
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setSelectedTopic(null);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-purple-500 hover:opacity-75 transition-all cursor-pointer bg-transparent border-0 outline-none"
                    >
                      <ChevronLeft size={14} /> Category: {selectedCategory.name}
                    </button>
                  </>
                )}
                {selectedTopic && (
                  <>
                    <span className="text-white/30">&bull;</span>
                    <button
                      onClick={() => setSelectedTopic(null)}
                      className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:opacity-75 transition-all cursor-pointer bg-transparent border-0 outline-none"
                    >
                      <ChevronLeft size={14} /> Topic: {selectedTopic.name}
                    </button>
                  </>
                )}
                <span className={`text-white/30 ml-auto`}>&bull;</span>
                <span className={`text-[10px] font-mono ${textSecondary}`}>Active Hub: {selectedHub.title}</span>
              </div>

              {/* STEP 2: Category Selector */}
              {selectedHub.categories && selectedHub.categories.length > 0 && !selectedCategory ? (
                <div className="space-y-6">
                  <div className="text-left space-y-1">
                    <h2 className="text-xl font-bold font-outfit uppercase tracking-wide">Step 2: Choose Category</h2>
                    <p className={`text-xs ${textSecondary}`}>Select a sub-category context within {selectedHub.title}.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedHub.categories.map((cat: any) => {
                      const count = resources.filter(r => r.category?.toLowerCase() === cat.name.toLowerCase() || r.subCategory?.toLowerCase() === cat.name.toLowerCase()).length;
                      return (
                        <div
                          key={cat.name}
                          onClick={() => {
                            setSelectedCategory(cat);
                            setSelectedTopic(null);
                          }}
                          className={`group p-6 rounded-2xl border ${borderLight} ${clayBg} hover:scale-[1.02] transition-all cursor-pointer flex flex-col justify-between min-h-[140px] relative overflow-hidden`}
                        >
                          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="space-y-2">
                            <h4 className="font-bold group-hover:text-purple-500 transition-colors text-base uppercase tracking-wider">
                              {cat.name}
                            </h4>
                            <p className={`text-xs ${textSecondary} leading-relaxed`}>
                              Browse configurations. Allowed: {cat.allowedTypes?.join(", ") || "All"}.
                            </p>
                          </div>
                          <div className={`pt-4 flex items-center justify-between border-t ${borderLight}`}>
                            <span className="text-[10px] text-purple-500 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">
                              {count} resources
                            </span>
                            <span className="text-xs font-bold text-purple-500 group-hover:translate-x-1 transition-transform">
                              Select Category &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : selectedHub.categories && selectedHub.categories.length > 0 && selectedCategory && !selectedTopic ? (
                /* STEP 3: Topic Selector */
                <div className="space-y-6">
                  <div className="text-left space-y-1">
                    <h2 className="text-xl font-bold font-outfit uppercase tracking-wide">Step 3: Choose Topic</h2>
                    <p className={`text-xs ${textSecondary}`}>Filter down into sub-categories by date or topic within {selectedCategory.name}.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Today's Date Topic */}
                    {(() => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      const count = resources.filter(r => (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) && r.topic === todayStr).length;
                      return (
                        <div
                          onClick={() => setSelectedTopic({ name: todayStr })}
                          className={`group p-6 rounded-2xl border ${borderLight} ${clayBg} hover:scale-[1.02] transition-all cursor-pointer flex flex-col justify-between min-h-[140px] relative overflow-hidden`}
                        >
                          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="space-y-2">
                            <h4 className="font-bold group-hover:text-emerald-500 transition-colors text-base uppercase tracking-wider">
                              Today's Date
                            </h4>
                            <p className={`text-xs ${textSecondary} leading-relaxed font-mono`}>
                              {todayStr}
                            </p>
                          </div>
                          <div className={`pt-4 flex items-center justify-between border-t ${borderLight}`}>
                            <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                              {count} resources
                            </span>
                            <span className="text-xs font-bold text-emerald-500 group-hover:translate-x-1 transition-transform">
                              Select Topic &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Creator Custom Topics */}
                    {(selectedCategory.topics || []).map((topic: any) => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      if (topic.name === todayStr) return null; // Avoid duplicates
                      const count = resources.filter(r => (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) && r.topic?.toLowerCase() === topic.name.toLowerCase()).length;
                      return (
                        <div
                          key={topic.name}
                          onClick={() => setSelectedTopic(topic)}
                          className={`group p-6 rounded-2xl border ${borderLight} ${clayBg} hover:scale-[1.02] transition-all cursor-pointer flex flex-col justify-between min-h-[140px] relative overflow-hidden`}
                        >
                          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="space-y-2">
                            <h4 className="font-bold group-hover:text-emerald-500 transition-colors text-base uppercase tracking-wider">
                              {topic.name}
                            </h4>
                            <p className={`text-xs ${textSecondary} leading-relaxed`}>
                              Explore resources filed under this custom topic.
                            </p>
                          </div>
                          <div className={`pt-4 flex items-center justify-between border-t ${borderLight}`}>
                            <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                              {count} resources
                            </span>
                            <span className="text-xs font-bold text-emerald-500 group-hover:translate-x-1 transition-transform">
                              Select Topic &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* All Topics option */}
                    <div
                      onClick={() => setSelectedTopic({ name: "All Topics" })}
                      className={`group p-6 rounded-2xl border ${borderLight} ${clayBg} hover:scale-[1.02] transition-all cursor-pointer flex flex-col justify-between min-h-[140px] relative overflow-hidden`}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="space-y-2">
                        <h4 className="font-bold group-hover:text-sky-500 transition-colors text-base uppercase tracking-wider">
                          All Topics
                        </h4>
                        <p className={`text-xs ${textSecondary} leading-relaxed`}>
                          View all topics inside the {selectedCategory.name} category.
                        </p>
                      </div>
                      <div className={`pt-4 flex items-center justify-between border-t ${borderLight}`}>
                        <span className="text-[10px] text-sky-500 bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/20">
                          {resources.filter(r => r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()).length} resources
                        </span>
                        <span className="text-xs font-bold text-sky-500 group-hover:translate-x-1 transition-transform">
                          Browse All &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* STEP 4: Resource Catalog Grid view */
                <div className="space-y-6">
                  {/* Filter bar */}
                  <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                    <div className="flex-1 relative w-full">
                      <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary} w-4 h-4`} />
                      <input
                        type="text"
                        placeholder="Search resources..."
                        value={resourceSearch}
                        onChange={(e) => setResourceSearch(e.target.value)}
                        className={`w-full ${dk ? "bg-black/40 text-white" : "bg-white text-gray-900"} border ${borderLight} focus:border-[#0077C0] rounded-full pl-11 pr-5 py-3 text-sm outline-none transition-all shadow-sm`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      {/* Type Filter */}
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className={`border ${borderLight} ${dk ? "bg-black/40 text-white" : "bg-white text-gray-900"} text-sm rounded-full px-5 py-3 outline-none cursor-pointer hover:border-[#0077C0] transition-colors shadow-sm`}
                      >
                        <option value="">All Types</option>
                        <option value="code">Code Snippets</option>
                        <option value="link">Links</option>
                        <option value="text">Rich Text</option>
                      </select>

                      {/* Sort */}
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={`border ${borderLight} ${dk ? "bg-black/40 text-white" : "bg-white text-gray-900"} text-sm rounded-full px-5 py-3 outline-none cursor-pointer hover:border-[#0077C0] transition-colors shadow-sm`}
                      >
                        <option value="recent">Most Recent</option>
                        <option value="views">Most Viewed</option>
                        <option value="sends">Most Sent</option>
                        <option value="copies">Most Copied</option>
                      </select>
                    </div>
                  </div>

                  {/* List of Resource cards */}
                  {loadingResources ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-t-[#0077C0] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                      <p className={`text-xs ${textSecondary}`}>Loading resources...</p>
                    </div>
                  ) : sortedResources.length === 0 ? (
                    <div className={`text-center py-20 border border-dashed ${borderLight} rounded-3xl`}>
                      <AlertCircle className={`w-10 h-10 mx-auto ${textSecondary} mb-4`} />
                      <h3 className="font-bold mb-1">No resources found</h3>
                      <p className={`text-xs ${textSecondary}`}>No snippets are matching the current filters.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {sortedResources.map((res, idx) => (
                        <div
                          key={res.id}
                          onClick={() => setExpandedResId(expandedResId === res.id ? null : res.id)}
                          className={`group p-1.5 rounded-[24px] border ${borderLight} ${clayBg} hover:border-[#0077C0]/40 transition-all cursor-pointer relative overflow-hidden`}
                        >
                          <div className={`p-4 rounded-[18px] ${dk ? "bg-black/40" : "bg-white/60"} flex flex-col space-y-3.5`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-lg text-[10px] font-bold mt-0.5 bg-[#0077C0]/10 text-sky-400">{idx + 1}</span>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <h4 className="text-sm font-bold truncate">{res.title}</h4>
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    <span className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border ${borderLight} ${dk ? "bg-white/5 text-white/60" : "bg-black/5 text-gray-700"}`}>{res.type}</span>
                                    {res.language && (
                                      <span className="text-[8px] font-mono uppercase px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-500">{res.language}</span>
                                    )}
                                    {res.tags.map(t => (
                                      <span key={t} className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border ${borderLight} ${dk ? "bg-white/[0.02] text-white/40" : "bg-black/[0.02] text-gray-500"}`}>#{t}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSendToLanpad(res); }}
                                  disabled={sendingId === res.id}
                                  className={`p-1.5 rounded-xl border ${borderLight} hover:bg-white/5 transition-all cursor-pointer bg-transparent outline-none flex items-center justify-center`}
                                  title="Send to LANpad"
                                >
                                  <Zap size={12} className={sendingId === res.id ? "animate-pulse text-amber-500" : "text-amber-500"} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopy(res.id, res.content); }}
                                  className={`p-1.5 rounded-xl border ${borderLight} hover:bg-white/5 transition-all cursor-pointer bg-transparent outline-none`}
                                  title="Copy Content"
                                >
                                  {copiedId === res.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-sky-500" />}
                                </button>
                                <Link
                                  href={`/resources/${res.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`p-1.5 rounded-xl border ${borderLight} hover:bg-white/5 transition-all flex items-center justify-center`}
                                  title="View Details"
                                >
                                  <ExternalLink size={12} />
                                </Link>
                              </div>
                            </div>

                            <AnimatePresence>
                              {expandedResId === res.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden mt-3"
                                >
                                  <div className="rounded-xl overflow-hidden border border-white/10 relative">
                                    <div className="absolute top-0 left-0 right-0 h-6 flex items-center px-3 border-b border-white/5 bg-black/60">
                                      <div className="flex gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                                      </div>
                                    </div>
                                    <pre className="text-[11px] font-mono p-3 pt-8 overflow-x-auto bg-[#0d1117] text-[#c9d1d9] text-left">
                                      <code>{res.content}</code>
                                    </pre>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className={`text-[10px] ${textSecondary} flex items-center justify-between pt-2 border-t ${borderLight}`}>
                              <span>By {res.creatorName || "Anonymous"}</span>
                              <span className="text-[9px] uppercase tracking-wider opacity-60">Click card to expand/collapse</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

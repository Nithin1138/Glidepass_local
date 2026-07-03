"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import dynamic from "next/dynamic";

const MagicRings = dynamic(() => import("../../components/MagicRings"), { ssr: false });
import {
  LogOut, Plus, Trash2, Calendar, Check, X, ChevronLeft, ArrowLeft,
  FileCode, Settings, Layout, Code, BookOpen, CheckCircle, AlertCircle, Sun, Moon, Copy, Edit, Lock, Unlock, Search, Users, ShieldCheck, Tag, Upload
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PALETTE TOKENS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const P = {
  white: "#FAFAFA",
  sky: "#C7EEFF",
  blue: "#0077C0",
  black: "#050505",
  error: "#C62828",
} as const;

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
  isDeleted: boolean;
  isLocked?: boolean;
  createdAt?: string;
  creatorEmail?: string;
  creatorName?: string;
  hubId?: string;
  subCategory?: string;
  category?: string;
  topic?: string;
}

export default function Page() {
  return (
    <SessionProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-[#050505] text-[#FAFAFA] flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin border-[#0077C0]" />
          <span className="text-xs font-black uppercase tracking-widest text-[#0077C0] animate-pulse">Loading Dashboard...</span>
        </div>
      }>
        <ContributorsDashboard />
      </Suspense>
    </SessionProvider>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HUB CARD COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function HubCard({ h, isOwner, isApproved, isPending, pinned, onPin, joiningHub, requestingHubId, onJoin, onEnter, clayBg, gradientLine, textPrimary, textSecondary, textMuted, dk }: {
  h: any; isOwner: boolean; isApproved: boolean; isPending: boolean;
  pinned: boolean; onPin: (id: string, e: React.MouseEvent) => void;
  joiningHub: boolean; requestingHubId: string;
  onJoin: (id: string) => void; onEnter: () => void;
  clayBg: string; gradientLine: string; textPrimary: string; textSecondary: string; textMuted: string; dk: boolean;
}) {
  const borderLight = dk ? "border-white/10" : "border-black/10";
  return (
    <div className={`p-4 rounded-[20px] border ${clayBg} flex flex-col justify-between transition-all group relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine} opacity-0 group-hover:opacity-100 transition-opacity`} />

      {/* Header row */}
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <h3 className={`text-sm font-extrabold uppercase tracking-wide ${textPrimary} truncate`}>{h.title}</h3>
          <span className={`text-[8px] font-bold uppercase self-start px-1.5 rounded border ${
            h.visibility === "private" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-sky-400 bg-sky-500/10 border-sky-500/20"
          }`}>{h.visibility || "public"}</span>
        </div>
        {/* Pin Button */}
        <button
          onClick={(e) => onPin(h.id, e)}
          className={`p-1.5 rounded-lg border transition-all shrink-0 ${
            pinned
              ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
              : `${borderLight} ${dk ? "text-white/30 hover:text-amber-400 hover:border-amber-400/30" : "text-black/30 hover:text-amber-500 hover:border-amber-400/30"}`
          }`}
          title={pinned ? "Unpin hub" : "Pin hub"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
          </svg>
        </button>
      </div>

      {h.description && <p className={`text-[10px] ${textSecondary} line-clamp-2 leading-relaxed mb-1`}>{h.description}</p>}
      <p className={`text-[9px] ${textMuted} font-mono truncate mb-3`}>{h.id}</p>

      {/* Action button */}
      {isApproved ? (
        <button onClick={onEnter} className="w-full bg-[#0077C0] text-white font-bold py-2 px-3 rounded-xl text-xs shadow-md transition-all active:scale-[0.98]">
          Enter Hub{isOwner ? " (Owner)" : ""}
        </button>
      ) : isPending ? (
        <button disabled className="w-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold py-2 px-3 rounded-xl text-xs cursor-not-allowed">
          Pending
        </button>
      ) : (
        <button
          onClick={() => onJoin(h.id)}
          disabled={joiningHub && requestingHubId === h.id}
          className={`w-full border font-bold py-2 px-3 rounded-xl text-xs transition-all ${dk ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-black/5 hover:bg-black/10 border-black/10 text-black"}`}
        >
          {joiningHub && requestingHubId === h.id ? "Requesting…" : "Request Join"}
        </button>
      )}
    </div>
  );
}

function ContributorsDashboard() {

  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  // Theme settings
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const dk = theme === "dark";

  // localStorage-based session for email/password onboarding path
  const [localSession, setLocalSession] = useState<{ email: string; name: string; role: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("glidepass-theme");
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
      }
      // Read contributor session set by the provider onboarding page
      const raw = localStorage.getItem("glidepass-contributor-user");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.email && parsed?.role === "Contributor") {
            setLocalSession(parsed);
          }
        } catch (_) {}
      }
    }
  }, []);

  // Merged effective session: prefer NextAuth, fall back to localStorage
  const effectiveSession = React.useMemo(() => {
    return session ?? (localSession ? { user: { email: localSession.email, name: localSession.name, image: null } } : null);
  }, [session, localSession]);
  const effectiveStatus = (status !== "loading" || localSession) ? (effectiveSession ? "authenticated" : "unauthenticated") : "loading";

  // active verification for suspended or deleted accounts
  useEffect(() => {
    const email = session?.user?.email || localSession?.email;
    if (email) {
      fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}&t=${Date.now()}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.exists || data.suspended) {
            // Clear local session too
            localStorage.removeItem("glidepass-contributor-user");
            setLocalSession(null);
            if (session) signOut({ callbackUrl: "/provider" });
            else window.location.href = "/provider";
          }
        })
        .catch((e) => console.error("Session verification failed:", e));
    }
  }, [session, localSession]);

  const gradientLine = "bg-gradient-to-r from-transparent via-[rgba(199,238,255,0.4)] to-transparent";

  // Toast notification
  const [toast, setToast] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast({ type: null, msg: "" }), 4000);
  };

  const [hubs, setHubs] = useState<any[]>([]);
  const [exploreQuery, setExploreQuery] = useState("");
  const [loadingHubs, setLoadingHubs] = useState(false);
  const [selectedHub, setSelectedHub] = useState<any | null>(null);

  // Pinned hub IDs, persisted in localStorage
  const [pinnedHubIds, setPinnedHubIds] = useState<string[]>([]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("glidepass-pinned-hubs");
        if (raw) setPinnedHubIds(JSON.parse(raw));
      } catch (_) {}
    }
  }, []);
  const togglePin = (hubId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedHubIds(prev => {
      const next = prev.includes(hubId) ? prev.filter(id => id !== hubId) : [...prev, hubId];
      localStorage.setItem("glidepass-pinned-hubs", JSON.stringify(next));
      return next;
    });
  };


  // Resources inside selected hub
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceSearch, setResourceSearch] = useState("");

  // Term acceptance & requests state

  const [requestingHubId, setRequestingHubId] = useState("");
  const [joiningHub, setJoiningHub] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [expandedResId, setExpandedResId] = useState<string | null>(null);
  const [copiedResId, setCopiedResId] = useState<string | null>(null);

  // Form fields
  const [resTitle, setResTitle] = useState("");
  const [resType, setResType] = useState("code");
  const [resLanguage, setResLanguage] = useState("");
  const [resTags, setResTags] = useState("");
  const [resDescription, setResDescription] = useState("");

  const sortedLanguages = React.useMemo(() => {
    const defaultLanguages = [
      { id: "python", name: "Python" },
      { id: "javascript", name: "JavaScript" },
      { id: "typescript", name: "TypeScript" },
      { id: "bash", name: "Bash / Shell" },
      { id: "powershell", name: "PowerShell" },
      { id: "yaml", name: "YAML" },
      { id: "json", name: "JSON" },
      { id: "cpp", name: "C++" },
      { id: "go", name: "Go" },
      { id: "rust", name: "Rust" },
      { id: "java", name: "Java" },
      { id: "html", name: "HTML" },
      { id: "css", name: "CSS" },
      { id: "other", name: "Other / Plain Text" }
    ];

    const langCounts: Record<string, number> = {};
    resources.forEach(r => {
      if (r.language) {
        const langLower = r.language.toLowerCase();
        langCounts[langLower] = (langCounts[langLower] || 0) + 1;
      }
    });

    return [...defaultLanguages].sort((a, b) => {
      const countA = langCounts[a.id] || 0;
      const countB = langCounts[b.id] || 0;
      return countB - countA;
    });
  }, [resources]);
  const [resContent, setResContent] = useState("");
  const [resSubCategory, setResSubCategory] = useState("");
  const [selectedSubCategoryTab, setSelectedSubCategoryTab] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Edit fields
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("code");
  const [editLanguage, setEditLanguage] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTopic, setEditTopic] = useState("");

  const allowedFormats = selectedCategory?.allowedTypes || selectedHub?.allowedTypes || ["code", "link", "text"];

  // Fetch Hubs with user relationship status
  const fetchHubs = async () => {
    if (!effectiveSession?.user?.email) return;
    setLoadingHubs(true);
    try {
      const res = await fetch(`/api/hubs?contributorEmail=${effectiveSession.user.email}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHubs(data.hubs);
      }
    } catch (e) {
      console.error(e);
      showToast("error", "Failed to fetch community hubs.");
    } finally {
      setLoadingHubs(false);
    }
  };

  // Fetch resources inside the active hub
  const fetchResources = async (hubId: string, quiet = false) => {
    if (!quiet) setLoadingResources(true);
    try {
      const res = await fetch(`/api/resources?hubId=${hubId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setResources(data.resources);
      }
    } catch (e) {
      console.error(e);
      showToast("error", "Failed to fetch hub resources.");
    } finally {
      if (!quiet) setLoadingResources(false);
    }
  };

  useEffect(() => {
    if (effectiveStatus === "authenticated" && effectiveSession?.user?.email) {
      fetchHubs();
    }
  }, [effectiveStatus, effectiveSession?.user?.email]);


  useEffect(() => {
    if (selectedHub) {
      fetchResources(selectedHub.id);
      const interval = setInterval(() => {
        fetchResources(selectedHub.id, true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedHub]);

  const handleJoinRequest = async (hubId: string) => {
    if (!effectiveSession?.user?.email) return;

    setRequestingHubId(hubId);
    setJoiningHub(true);
    try {
      const res = await fetch(`/api/hubs/${hubId}/contributors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          email: effectiveSession?.user?.email
        })
      });
      if (res.ok) {
        showToast("success", "Request sent successfully!");
        fetchHubs();
      } else {
        showToast("error", "Failed to submit request.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setJoiningHub(false);
      setRequestingHubId("");
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle || !resContent || !selectedHub) {
      return showToast("error", "Missing required fields.");
    }
    setPublishing(true);

    const tags = resTags
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: resTitle,
          type: resType,
          language: resType === "code" ? resLanguage : undefined,
          tags,
          content: resContent,
          description: resDescription,
          creatorEmail: effectiveSession?.user?.email || "anonymous",
          creatorName: effectiveSession?.user?.name || "Anonymous",

          hubId: selectedHub.id,
          category: selectedCategory ? selectedCategory.name : undefined,
          topic: (() => {
            const todayStr = new Date().toISOString().split("T")[0];
            if (!selectedTopic || selectedTopic.name === "All Topics") {
              return todayStr;
            }
            return selectedTopic.name;
          })()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", "Resource published successfully!");
        setResTitle("");
        setResContent("");
        setResTags("");
        setResDescription("");
        // Do not reset resLanguage to keep the last used language
        setResSubCategory("");
        setShowAddModal(false);
        fetchResources(selectedHub.id);
      } else {
        showToast("error", data.error || "Failed to publish resource.");
      }
    } catch (err: any) {
      showToast("error", err.message || "An unexpected error occurred.");
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteResource = async (resId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      const emailParam = effectiveSession?.user?.email || "";
      const res = await fetch(`/api/resources/${resId}?email=${encodeURIComponent(emailParam)}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", "Resource deleted successfully.");
        if (selectedHub) fetchResources(selectedHub.id);
      } else {
        showToast("error", data.error || "Failed to delete resource.");
      }
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "An unexpected error occurred.");
    }
  };

  const handleCopyCode = (qId: string, code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedResId(qId);
    showToast("success", "Code copied to clipboard!");
    setTimeout(() => setCopiedResId(null), 2000);
  };

  const handleToggleLock = async (r: Resource, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/resources/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isLocked: !r.isLocked
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", `Resource ${!r.isLocked ? "locked" : "unlocked"} successfully!`);
        fetchResources(selectedHub.id);
      } else {
        showToast("error", data.error || "Failed to update lock state.");
      }
    } catch (e) {
      console.error(e);
      showToast("error", "Error updating lock state.");
    }
  };

  const openEditModal = (r: Resource, e: React.MouseEvent) => {
    e.stopPropagation();
    if (r.isLocked) {
      showToast("error", "Resource is locked. Unlock it first to edit.");
      return;
    }
    setEditingResource(r);
    setEditTitle(r.title);
    setEditType(r.type);
    setEditLanguage(r.language || "");
    setEditTags(r.tags.join(", "));
    setEditContent(r.content);
    setEditCategory(r.category || r.subCategory || "");
    setEditTopic(r.topic || "");
    setShowEditModal(true);
  };

  const handleUpdateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource || !selectedHub) return;
    setPublishing(true);

    const tags = editTags
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    try {
      const res = await fetch(`/api/resources/${editingResource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          type: editType,
          language: editType === "code" ? editLanguage : undefined,
          tags,
          content: editContent,
          category: editCategory || undefined,
          topic: editTopic || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", "Resource updated successfully!");
        setShowEditModal(false);
        setEditingResource(null);
        fetchResources(selectedHub.id);
      } else {
        showToast("error", data.error || "Failed to update resource.");
      }
    } catch (err: any) {
      showToast("error", err.message || "An unexpected error occurred.");
    } finally {
      setPublishing(false);
    }
  };

  // Filter public hubs for list
  const filteredHubs = hubs.filter(h =>
    h.title.toLowerCase().includes(exploreQuery.toLowerCase()) ||
    h.id.toLowerCase().includes(exploreQuery.toLowerCase()) ||
    (h.description && h.description.toLowerCase().includes(exploreQuery.toLowerCase()))
  );

  // Filter resources inside selected hub
  const filteredResourcesRaw = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      r.content.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      r.tags.some(t => t.toLowerCase().includes(resourceSearch.toLowerCase()));

    if (!matchesSearch) return false;

    // Level 2 Category check
    if (selectedCategory) {
      const catName = selectedCategory.name.toLowerCase();
      const rCat = r.category?.toLowerCase();
      const rSubCat = r.subCategory?.toLowerCase();
      if (rCat !== catName && rSubCat !== catName) return false;
    }

    // Level 3 Topic check
    if (selectedTopic) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (selectedTopic.name === "All Topics") {
        // Exclude today's content from All Topics
        if (r.topic === todayStr) return false;
        return true;
      }
      if (r.topic?.toLowerCase() !== selectedTopic.name.toLowerCase()) return false;
    }

    return true;
  });

  // Sort resources: newest first
  const filteredResources = [...filteredResourcesRaw].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const cardBg = dk ? "bg-[#08080c]" : "bg-[#F4F6F8]";
  const clayBg = dk ? "clay-dark" : "clay-light";
  const textPrimary = dk ? "text-white" : "text-black";
  const textSecondary = dk ? "text-white/60" : "text-black/60";
  const textMuted = dk ? "text-white/40" : "text-black/40";
  const borderLight = dk ? "border-white/10" : "border-black/10";
  const inputBg = dk ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10";

  // ─── UNAUTHENTICATED STATE — redirect to /provider ───
  if (effectiveStatus === "unauthenticated") {
    if (typeof window !== "undefined") {
      window.location.replace("/provider");
    }
    return (
      <div className={`min-h-screen ${cardBg} flex items-center justify-center`}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
      </div>
    );
  }

  // ─── AUTHENTICATED STATE ───
  if (effectiveStatus === "loading") {

    return (
      <div className={`min-h-screen ${cardBg} flex items-center justify-center`}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] flex flex-col ${cardBg} ${textPrimary} ${theme} font-inter relative overflow-hidden`}>
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <motion.div animate={{ x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 20, repeat: Infinity }} className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <motion.div animate={{ x: [0, -50, 0], y: [0, -30, 0] }} transition={{ duration: 15, repeat: Infinity }} className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-sky-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Navigation Bar */}
      <nav className={`shrink-0 border-b ${borderLight} backdrop-blur-xl ${dk ? 'bg-black/50' : 'bg-white/50'} z-45`}>
        <div className="px-4 md:px-12 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 font-outfit font-black tracking-tighter truncate">
            <div className={`shrink-0 w-8 h-8 rounded-lg overflow-hidden border ${dk ? 'border-white/10' : 'border-black/10'} ${dk ? 'bg-black' : 'bg-white'} flex items-center justify-center`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="LANpad Logo"
                className={`w-[120%] h-[120%] object-contain scale-125 transition-all duration-500 ${dk ? 'invert' : ''}`}
              />
            </div>
            <span className={`text-base md:text-lg bg-clip-text text-transparent bg-gradient-to-r ${dk ? 'from-white to-white/60' : 'from-black to-black/60'} truncate`}>
              LANpad <span className="text-blue-400 font-mono text-[10px] tracking-widest uppercase ml-2 px-2 py-0.5 rounded border border-blue-400/30 bg-blue-400/10">Contributors</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className={`hidden md:block text-xs font-mono ${dk ? 'text-white/50' : 'text-black/50'}`}>{effectiveSession?.user?.email}</span>

            <button
              onClick={() => {
                const nextTheme = theme === "dark" ? "light" : "dark";
                setTheme(nextTheme);
                localStorage.setItem("glidepass-theme", nextTheme);
              }}
              className={`p-2 rounded-xl border ${borderLight} hover:bg-white/5 transition-colors`}
              title="Toggle Theme"
            >
              {dk ? (
                <Sun size={14} className="text-white/60" />
              ) : (
                <Moon size={14} className="text-black/60" />
              )}
            </button>
            <button onClick={() => {
                localStorage.removeItem("glidepass-contributor-user");
                if (session) signOut({ callbackUrl: "/provider" });
                else window.location.href = "/provider";
              }} className={`p-2 rounded-xl border ${borderLight} hover:bg-white/5 transition-colors`}>
              <LogOut size={14} className={dk ? "text-white/60" : "text-black/60"} />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── LAYER BREADCRUMB (mobile-friendly sticky pill bar) ─── */}
      {selectedHub && (
        <div className={`shrink-0 border-b ${borderLight} ${dk ? 'bg-black/70' : 'bg-white/70'} backdrop-blur-md z-30`}>
          <div className="w-full max-w-7xl mx-auto px-3 md:px-12 h-10 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {/* Layer 1 */}
            <button
              onClick={() => {
                if (selectedTopic) {
                  setSelectedTopic(null);
                } else if (selectedCategory) {
                  setSelectedCategory(null);
                } else {
                  setSelectedHub(null);
                  setResources([]);
                }
              }}
              className="flex items-center gap-1 shrink-0 text-[10px] font-bold text-sky-400 hover:opacity-75 transition-all"
            >
              <ArrowLeft size={11} />
              <span className="hidden sm:inline">Hubs</span>
              <span className="sm:hidden">←</span>
            </button>
            <span className="text-white/20 shrink-0">›</span>
            {/* Layer 2: Hub */}
            <button
              onClick={() => { setSelectedCategory(null); setSelectedTopic(null); }}
              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                !selectedCategory ? `${dk ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}` : 'text-white/50 hover:text-white'
              }`}
            >
              {selectedHub.title.length > 14 ? selectedHub.title.slice(0, 14) + "…" : selectedHub.title}
            </button>
            {selectedCategory && (
              <>
                <span className="text-white/20 shrink-0">›</span>
                {/* Layer 3: Category */}
                <button
                  onClick={() => setSelectedTopic(null)}
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    !selectedTopic ? 'bg-purple-400/15 text-purple-300' : 'text-white/50 hover:text-purple-300'
                  }`}
                >
                  {selectedCategory.name.length > 12 ? selectedCategory.name.slice(0, 12) + "…" : selectedCategory.name}
                </button>
              </>
            )}
            {selectedTopic && (
              <>
                <span className="text-white/20 shrink-0">›</span>
                {/* Layer 4: Topic → Resources */}
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/15 text-emerald-300">
                  {selectedTopic.name.length > 12 ? selectedTopic.name.slice(0, 12) + "…" : selectedTopic.name}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col relative w-full max-w-7xl mx-auto px-3 md:px-12 py-4 md:py-6 overflow-hidden">
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
              {/* Header + Search row */}
              <div className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className={`text-lg md:text-2xl font-black font-outfit uppercase tracking-wide ${textPrimary}`}>Community Hubs</h2>
                  <p className={`text-[10px] md:text-xs ${textSecondary} mt-0.5`}>Select a hub to browse and submit resources.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search hubs…"
                    value={exploreQuery}
                    onChange={(e) => setExploreQuery(e.target.value)}
                    className={`w-full text-xs rounded-xl pl-9 pr-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                  />
                </div>
              </div>

              {/* Hub Cards */}
              <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                {loadingHubs ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
                  </div>
                ) : filteredHubs.length === 0 ? (
                  <div className={`py-16 text-center rounded-[24px] border border-dashed ${borderLight}`}>
                    <Users size={28} className="mx-auto mb-3 opacity-30 text-sky-400" />
                    <p className={`text-xs ${textSecondary}`}>No hubs match your search.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Pinned hubs section */}
                    {pinnedHubIds.length > 0 && filteredHubs.some(h => pinnedHubIds.includes(h.id)) && (
                      <div className="mb-1">
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${textMuted} mb-2 flex items-center gap-1.5`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                          Pinned
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {filteredHubs.filter(h => pinnedHubIds.includes(h.id)).map((h: any) => {
                            const isOwner = h.creatorEmail.toLowerCase() === effectiveSession?.user?.email?.toLowerCase();
                            const isApproved = isOwner || h.myStatus === "approved";
                            const isPending = h.myStatus === "pending";
                            return (
                              <HubCard
                                key={h.id} h={h} isOwner={isOwner} isApproved={isApproved} isPending={isPending}
                                pinned={true} onPin={togglePin}
                                joiningHub={joiningHub} requestingHubId={requestingHubId}
                                onJoin={handleJoinRequest}
                                onEnter={() => { setSelectedHub(h); setSelectedCategory(null); setSelectedTopic(null); }}
                                clayBg={clayBg} gradientLine={gradientLine} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} dk={dk}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* All / remaining hubs */}
                    {filteredHubs.some(h => !pinnedHubIds.includes(h.id)) && (
                      <div>
                        {pinnedHubIds.length > 0 && filteredHubs.some(h => pinnedHubIds.includes(h.id)) && (
                          <p className={`text-[9px] font-bold uppercase tracking-widest ${textMuted} mb-2`}>All Hubs</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {filteredHubs.filter(h => !pinnedHubIds.includes(h.id)).map((h: any) => {
                            const isOwner = h.creatorEmail.toLowerCase() === effectiveSession?.user?.email?.toLowerCase();
                            const isApproved = isOwner || h.myStatus === "approved";
                            const isPending = h.myStatus === "pending";
                            return (
                              <HubCard
                                key={h.id} h={h} isOwner={isOwner} isApproved={isApproved} isPending={isPending}
                                pinned={false} onPin={togglePin}
                                joiningHub={joiningHub} requestingHubId={requestingHubId}
                                onJoin={handleJoinRequest}
                                onEnter={() => { setSelectedHub(h); setSelectedCategory(null); setSelectedTopic(null); }}
                                clayBg={clayBg} gradientLine={gradientLine} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} dk={dk}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

          ) : (
            /* ==================== LAYERS 2 / 3 / 4 ==================== */
            <motion.div
              key="hub-dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 min-h-0 flex flex-col gap-3"
            >
              {/* Toolbar: search + add (always visible) */}
              <div className="shrink-0 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search resources…"
                    value={resourceSearch}
                    onChange={(e) => setResourceSearch(e.target.value)}
                    className={`w-full text-xs rounded-xl pl-9 pr-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                  />
                </div>
                <button
                  onClick={() => {
                    const allowed = selectedCategory?.allowedTypes || selectedHub?.allowedTypes || ["code", "link", "text"];
                    setResType(allowed[0] || "code");
                    if (selectedCategory && selectedHub?.subCategories) {
                      const matchedSubCat = selectedHub.subCategories.find(
                        (sc: string) => sc.toLowerCase() === selectedCategory.name.toLowerCase()
                      );
                      if (matchedSubCat) {
                        setResSubCategory(matchedSubCat);
                      }
                    }
                    setShowAddModal(true);
                  }}
                  className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer shrink-0"
                  style={{ background: P.blue }}
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">Add Resource</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>

              {/* 4-Layer Content */}
              {selectedHub.categories && selectedHub.categories.length > 0 && !selectedCategory ? (
                /* ── LAYER 2: Category Grid ── */
                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                  <p className={`text-[9px] font-bold uppercase tracking-widest text-[#0077C0] mb-3`}>Step 2 · Select Category</p>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {selectedHub.categories.map((cat: any) => {
                      const count = resources.filter(r => r.category?.toLowerCase() === cat.name.toLowerCase() || r.subCategory?.toLowerCase() === cat.name.toLowerCase()).length;
                      return (
                        <div
                          key={cat.name}
                          onClick={() => { setSelectedCategory(cat); setSelectedTopic(null); }}
                          className={`p-3.5 md:p-5 rounded-[18px] md:rounded-[24px] border ${borderLight} ${dk ? 'bg-white/[0.02] hover:bg-white/[0.05]' : 'bg-black/[0.02] hover:bg-black/[0.04]'} hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between min-h-[100px] md:min-h-[130px] relative overflow-hidden`}
                        >
                          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="space-y-1">
                            <h4 className={`text-[11px] md:text-sm font-extrabold uppercase tracking-wider ${textPrimary} group-hover:text-sky-400 transition-colors leading-tight`}>{cat.name}</h4>
                            <p className={`text-[9px] md:text-[11px] ${textSecondary} leading-relaxed hidden sm:block`}>
                              {cat.allowedTypes?.join(", ") || "All types"}
                            </p>
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-[8px] font-mono text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20">{count}</span>
                            <span className="text-[9px] font-bold text-sky-400 group-hover:translate-x-0.5 transition-transform">→</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              ) : selectedHub.categories && selectedHub.categories.length > 0 && selectedCategory && !selectedTopic ? (
                /* ── LAYER 3: Topic Grid ── */
                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                  <p className={`text-[9px] font-bold uppercase tracking-widest text-purple-400 mb-3`}>Step 3 · Select Topic in {selectedCategory.name}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {/* Today */}
                    {(() => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      const count = resources.filter(r => (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) && r.topic === todayStr).length;
                      const topicConfig = selectedCategory.topics?.find((t: any) => t.name === todayStr);
                      return (
                        <div
                          onClick={() => setSelectedTopic({ name: todayStr, limit: topicConfig?.limit })}
                          className={`p-3.5 md:p-5 rounded-[18px] md:rounded-[24px] border ${borderLight} ${dk ? 'bg-white/[0.02] hover:bg-white/[0.05]' : 'bg-black/[0.02] hover:bg-black/[0.04]'} hover:border-purple-400/30 transition-all cursor-pointer group flex flex-col justify-between min-h-[100px] md:min-h-[130px] relative overflow-hidden`}
                        >
                          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="space-y-1">
                            <h4 className={`text-[11px] md:text-sm font-extrabold uppercase tracking-wider ${textPrimary} group-hover:text-purple-400 transition-colors leading-tight`}>Today</h4>
                            <p className={`text-[9px] md:text-[11px] font-mono ${textMuted}`}>{todayStr}</p>
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-[8px] font-mono text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded border border-purple-400/20">{count}</span>
                            <span className="text-[9px] font-bold text-purple-400 group-hover:translate-x-0.5 transition-transform">→</span>
                          </div>
                        </div>
                      );
                    })()}

                    {(selectedCategory.topics || []).map((topic: any) => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      if (topic.name === todayStr) return null;
                      const count = resources.filter(r => (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) && r.topic?.toLowerCase() === topic.name.toLowerCase()).length;
                      return (
                        <div
                          key={topic.name}
                          onClick={() => setSelectedTopic(topic)}
                          className={`p-3.5 md:p-5 rounded-[18px] md:rounded-[24px] border ${borderLight} ${dk ? 'bg-white/[0.02] hover:bg-white/[0.05]' : 'bg-black/[0.02] hover:bg-black/[0.04]'} hover:border-purple-400/30 transition-all cursor-pointer group flex flex-col justify-between min-h-[100px] md:min-h-[130px] relative overflow-hidden`}
                        >
                          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="space-y-1">
                            <h4 className={`text-[11px] md:text-sm font-extrabold uppercase tracking-wider ${textPrimary} group-hover:text-purple-400 transition-colors leading-tight`}>{topic.name}</h4>
                            <p className={`text-[9px] md:text-[11px] ${textSecondary} leading-relaxed hidden sm:block`}>
                              {topic.limit ? `Limit: ${topic.limit}` : "Browse files"}
                            </p>
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-[8px] font-mono text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded border border-purple-400/20">{count}</span>
                            <span className="text-[9px] font-bold text-purple-400 group-hover:translate-x-0.5 transition-transform">→</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* All topics shortcut */}
                    <div
                      onClick={() => setSelectedTopic({ name: "All Topics" })}
                      className={`p-3.5 md:p-5 rounded-[18px] md:rounded-[24px] border border-dashed ${borderLight} ${dk ? 'bg-white/[0.01] hover:bg-white/[0.03]' : 'bg-black/[0.01] hover:bg-black/[0.02]'} hover:border-sky-400/30 transition-all cursor-pointer group flex flex-col justify-between min-h-[100px] md:min-h-[130px] relative overflow-hidden`}
                    >
                      <div className="space-y-1">
                        <h4 className={`text-[11px] md:text-sm font-extrabold uppercase tracking-wider ${textMuted} group-hover:text-sky-400 transition-colors leading-tight`}>All Topics</h4>
                        <p className={`text-[9px] ${textMuted} hidden sm:block`}>Show everything in {selectedCategory.name}</p>
                      </div>
                      <div className="flex justify-end pt-2">
                        <span className="text-[9px] font-bold text-sky-400 group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                    </div>
                  </div>
                </div>

              ) : (
                /* ── LAYER 4: Resources ── */
                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                  {loadingResources ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
                    </div>
                  ) : filteredResources.length === 0 ? (
                    <div className={`py-16 text-center rounded-[24px] border border-dashed ${borderLight}`}>
                      <Code size={28} className="mx-auto mb-3 opacity-30 text-sky-400" />
                      <p className={`text-xs ${textSecondary}`}>No resources found.</p>
                      <p className={`text-[10px] ${textMuted} mt-1`}>Try a different filter or add the first resource.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {filteredResources.map((r, idx) => (
                        <div
                          key={r.id}
                          onClick={() => setExpandedResId(expandedResId === r.id ? null : r.id)}
                          className={`rounded-[20px] border ${borderLight} ${clayBg} relative overflow-hidden cursor-pointer hover:border-white/20 transition-all`}
                        >
                          <div className={`p-3 md:p-4 rounded-[18px] ${dk ? 'bg-black/40' : 'bg-white/40'} flex flex-col space-y-2.5`}>
                            {/* Title row */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <span className="w-5 h-5 md:w-6 md:h-6 shrink-0 flex items-center justify-center rounded-lg text-[9px] md:text-[10px] font-bold mt-0.5 bg-[#0077C0]/10 text-sky-400">{idx + 1}</span>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <h4 className={`text-xs md:text-sm font-bold ${textPrimary} truncate`}>{r.title}</h4>
                                  {/* Tags on mobile: compact horizontal scroll */}
                                  <div className="flex flex-nowrap gap-1 mt-1 overflow-x-auto scrollbar-none">
                                    <span className={`shrink-0 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${borderLight} ${dk ? 'bg-white/5 text-white/60' : 'bg-black/5 text-black/60'}`}>{r.type}</span>
                                    {(r.category || r.subCategory) && (
                                      <span className="shrink-0 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border border-purple-500/20 bg-purple-500/10 text-purple-400">{r.category || r.subCategory}</span>
                                    )}
                                    {r.topic && (
                                      <span className="shrink-0 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">{r.topic}</span>
                                    )}
                                    {r.language && (
                                      <span className="shrink-0 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400">{r.language}</span>
                                    )}
                                    {r.tags.slice(0, 2).map(t => (
                                      <span key={t} className={`shrink-0 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${borderLight} ${dk ? 'bg-white/[0.02] text-white/40' : 'bg-black/[0.02] text-black/40'}`}>#{t}</span>
                                    ))}
                                    {r.tags.length > 2 && <span className={`shrink-0 text-[8px] ${textMuted} px-1`}>+{r.tags.length - 2}</span>}
                                  </div>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={(e) => openEditModal(r, e)}
                                  className={`p-1.5 rounded-lg border ${borderLight} hover:bg-white/5 transition-all ${r.isLocked ? "opacity-40 cursor-not-allowed" : ""}`}
                                  title={r.isLocked ? "Locked" : "Edit"}
                                >
                                  <Edit size={11} className={r.isLocked ? "text-gray-400" : "text-sky-400"} />
                                </button>
                                {(r.creatorEmail?.toLowerCase() === effectiveSession?.user?.email?.toLowerCase() ||
                                  selectedHub?.creatorEmail?.toLowerCase() === effectiveSession?.user?.email?.toLowerCase()) && (
                                  <button
                                    onClick={(e) => handleToggleLock(r, e)}
                                    className={`p-1.5 rounded-lg border ${borderLight} hover:bg-white/5 transition-all`}
                                    title={r.isLocked ? "Unlock" : "Lock"}
                                  >
                                    {r.isLocked ? <Lock size={11} className="text-amber-500" /> : <Unlock size={11} className="text-emerald-500" />}
                                  </button>
                                )}
                                {selectedHub?.creatorEmail?.toLowerCase() === effectiveSession?.user?.email?.toLowerCase() && (
                                  <button
                                    onClick={(e) => handleDeleteResource(r.id, e)}
                                    className="p-1.5 rounded-lg border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 size={11} className="text-red-400" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Expanded content */}
                            <AnimatePresence>
                              {expandedResId === r.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="rounded-xl overflow-hidden border border-white/10 relative">
                                    <div className="absolute top-0 left-0 right-0 h-6 flex items-center px-3 border-b border-white/5 bg-black/60">
                                      <div className="flex gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                                      </div>
                                    </div>
                                    <pre className="text-[10px] md:text-[11px] font-mono p-3 pt-8 overflow-x-auto bg-[#0d1117] text-[#c9d1d9] max-h-60">
                                      <code>{r.content}</code>
                                    </pre>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
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

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toast.type && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl text-xs font-bold ${toast.type === "success" ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" : "bg-red-950/20 border-red-500/30 text-red-400"
              }`}
          >
            {toast.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD RESOURCE MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg p-1.5 rounded-[32px] border border-white/10 bg-black shadow-2xl z-10"
            >
              <div className="p-6 rounded-[28px] bg-[#050505] space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#0077C0]">Add Hub Resource</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-white/5 border border-white/10">
                    <X size={14} />
                  </button>
                </div>

                <form onSubmit={handleAddResource} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Resource Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Docker Compose File"
                      value={resTitle}
                      onChange={(e) => setResTitle(e.target.value)}
                      className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 bg-white/5 border-white/10`}
                    />
                  </div>

                  {allowedFormats.length > 1 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Resource Type</label>
                        <select
                          value={resType}
                          onChange={(e) => setResType(e.target.value)}
                          className="w-full text-xs rounded-xl px-3 py-2.5 border focus:outline-none bg-white/5 border-white/10"
                        >
                          {allowedFormats.includes("code") && <option value="code">Code / Script</option>}
                          {allowedFormats.includes("link") && <option value="link">Link / URL</option>}
                          {allowedFormats.includes("text") && <option value="text">Rich Text</option>}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Language (if Code)</label>
                        <select
                          disabled={resType !== "code"}
                          value={resLanguage}
                          onChange={(e) => setResLanguage(e.target.value)}
                          className="w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none bg-white/5 border-white/10 disabled:opacity-40 cursor-pointer"
                        >
                          <option value="">Select Language</option>
                          {sortedLanguages.map(lang => (
                            <option key={lang.id} value={lang.id}>{lang.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    resType === "code" && (
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Language</label>
                        <select
                          value={resLanguage}
                          onChange={(e) => setResLanguage(e.target.value)}
                          className="w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none bg-white/5 border-white/10 cursor-pointer"
                        >
                          <option value="">Select Language</option>
                          {sortedLanguages.map(lang => (
                            <option key={lang.id} value={lang.id}>{lang.name}</option>
                          ))}
                        </select>
                      </div>
                    )
                  )}

                  {selectedHub?.subCategories && selectedHub.subCategories.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Sub-category</label>
                      <select
                        value={resSubCategory}
                        onChange={(e) => setResSubCategory(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3 py-2.5 border focus:outline-none bg-white/5 border-white/10`}
                      >
                        <option value="">-- Select Sub-category (Optional) --</option>
                        {selectedHub.subCategories.map((cat: string) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Description</label>
                      <input
                        type="text"
                        placeholder="Short description"
                        value={resDescription}
                        onChange={(e) => setResDescription(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none bg-white/5 border-white/10`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Tags (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. docker, compose, web"
                        value={resTags}
                        onChange={(e) => setResTags(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none bg-white/5 border-white/10`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Content</label>
                    <textarea
                      required
                      rows={6}
                      placeholder="Paste your configuration code, link, or text..."
                      value={resContent}
                      onChange={(e) => setResContent(e.target.value)}
                      className={`w-full text-xs font-mono rounded-xl p-3 border focus:outline-none resize-none bg-[#0d1117] border-white/10 text-sky-400`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={publishing}
                    className="w-full bg-gradient-to-r from-[#0077C0] to-[#009BF5] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Upload size={14} />
                    {publishing ? "Publishing..." : "Add to Hub"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* EDIT RESOURCE MODAL */}
      <AnimatePresence>
        {showEditModal && editingResource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg p-1.5 rounded-[32px] border border-white/10 bg-black shadow-2xl z-10"
            >
              <div className="p-6 rounded-[28px] bg-[#050505] space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#0077C0]">Edit Hub Resource</h3>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingResource(null);
                    }}
                    className="p-1 rounded hover:bg-white/5 border border-white/10"
                  >
                    <X size={14} />
                  </button>
                </div>

                <form onSubmit={handleUpdateResource} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Resource Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Docker Compose File"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 bg-white/5 border-white/10`}
                    />
                  </div>

                  {allowedFormats.length > 1 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Resource Type</label>
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          className="w-full text-xs rounded-xl px-3 py-2.5 border focus:outline-none bg-white/5 border-white/10"
                        >
                          {allowedFormats.includes("code") && <option value="code">Code / Script</option>}
                          {allowedFormats.includes("link") && <option value="link">Link / URL</option>}
                          {allowedFormats.includes("text") && <option value="text">Rich Text</option>}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Language (if Code)</label>
                        <select
                          disabled={editType !== "code"}
                          value={editLanguage}
                          onChange={(e) => setEditLanguage(e.target.value)}
                          className="w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none bg-white/5 border-white/10 disabled:opacity-40 cursor-pointer"
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
                    </div>
                  ) : (
                    editType === "code" && (
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Language</label>
                        <select
                          value={editLanguage}
                          onChange={(e) => setEditLanguage(e.target.value)}
                          className="w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none bg-white/5 border-white/10 cursor-pointer"
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
                    )
                  )}

                  {selectedHub?.subCategories && selectedHub.subCategories.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Sub-category</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3 py-2.5 border focus:outline-none bg-white/5 border-white/10`}
                      >
                        <option value="">-- Select Sub-category (Optional) --</option>
                        {selectedHub.subCategories.map((cat: string) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. docker, compose, web"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none bg-white/5 border-white/10`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Content</label>
                    <textarea
                      required
                      rows={6}
                      placeholder="Paste your configuration code, link, or text..."
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className={`w-full text-xs font-mono rounded-xl p-3 border focus:outline-none resize-none bg-[#0d1117] border-white/10 text-sky-400`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={publishing}
                    className="w-full bg-gradient-to-r from-[#0077C0] to-[#009BF5] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Upload size={14} />
                    {publishing ? "Saving Changes..." : "Save Changes"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

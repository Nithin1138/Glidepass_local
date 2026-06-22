"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
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
      <ContributorsDashboard />
    </SessionProvider>
  );
}

function ContributorsDashboard() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  // Theme settings
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const dk = theme === "dark";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("glidepass-theme");
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
      }
    }
  }, []);

  const gradientLine = "bg-gradient-to-r from-transparent via-[rgba(199,238,255,0.4)] to-transparent";

  // Toast notification
  const [toast, setToast] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast({ type: null, msg: "" }), 4000);
  };

  // Hubs lists & states
  const [hubs, setHubs] = useState<any[]>([]);
  const [exploreQuery, setExploreQuery] = useState("");
  const [loadingHubs, setLoadingHubs] = useState(false);
  const [selectedHub, setSelectedHub] = useState<any | null>(null);

  // Resources inside selected hub
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceSearch, setResourceSearch] = useState("");

  // Term acceptance & requests state
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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
    if (!session?.user?.email) return;
    setLoadingHubs(true);
    try {
      const res = await fetch(`/api/hubs?contributorEmail=${session.user.email}`);
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
    if (status === "authenticated" && session?.user?.email) {
      fetchHubs();
    }
  }, [status, session]);

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
    if (!session?.user?.email) return;
    setRequestingHubId(hubId);
    setJoiningHub(true);
    try {
      const res = await fetch(`/api/hubs/${hubId}/contributors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          email: session.user.email
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
          creatorEmail: session?.user?.email || "anonymous",
          creatorName: session?.user?.name || "Anonymous",
          hubId: selectedHub.id,
          category: selectedCategory ? selectedCategory.name : undefined,
          topic: selectedTopic ? selectedTopic.name : undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", "Resource published successfully!");
        setResTitle("");
        setResContent("");
        setResTags("");
        setResDescription("");
        setResLanguage("");
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
      const res = await fetch(`/api/resources/${resId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("success", "Resource deleted successfully.");
        if (selectedHub) fetchResources(selectedHub.id);
      }
    } catch (e) {
      console.error(e);
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
  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      r.content.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      r.tags.some(t => t.toLowerCase().includes(resourceSearch.toLowerCase()));

    if (!matchesSearch) return false;

    // Level 2 Category check
    if (selectedCategory) {
      if (r.category?.toLowerCase() !== selectedCategory.name.toLowerCase() && r.subCategory?.toLowerCase() !== selectedCategory.name.toLowerCase()) return false;
    }

    // Level 3 Topic check
    if (selectedTopic) {
      if (selectedTopic.name === "All Topics") return true;
      if (r.topic?.toLowerCase() !== selectedTopic.name.toLowerCase()) return false;
    }

    return true;
  });

  const cardBg = dk ? "bg-[#08080c]" : "bg-[#F4F6F8]";
  const clayBg = dk ? "clay-dark" : "clay-light";
  const textPrimary = dk ? "text-white" : "text-black";
  const textSecondary = dk ? "text-white/60" : "text-black/60";
  const textMuted = dk ? "text-white/40" : "text-black/40";
  const borderLight = dk ? "border-white/10" : "border-black/10";
  const inputBg = dk ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10";

  // ─── UNAUTHENTICATED STATE ───
  if (status === "unauthenticated") {
    return (
      <div className={`h-[100dvh] ${cardBg} ${textPrimary} font-inter flex flex-col items-center justify-between relative overflow-hidden py-6 md:py-12 px-4 transition-colors duration-200`}>
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-400/10 blur-[120px] rounded-full mix-blend-screen" />
        </div>
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <MagicRings
            color="#0077c0"
            colorTwo="#c7eeff"
            ringCount={8}
            speed={0.8}
            attenuation={12}
            lineThickness={1.5}
            baseRadius={0.25}
            radiusStep={0.08}
            scaleRate={0.08}
            opacity={dk ? 0.35 : 0.15}
            blur={0}
            noiseAmount={0.05}
            followMouse={true}
            mouseInfluence={0.15}
            hoverScale={1.1}
            parallax={0.03}
          />
        </div>

        <div className="relative z-10 shrink-0 mb-1 md:mb-4">
          <div className={`inline-flex items-center justify-center rounded-2xl overflow-hidden border ${borderLight} shadow-2xl w-14 h-14 md:w-20 md:h-20 ${dk ? 'bg-white/5' : 'bg-black/5'} backdrop-blur-xl`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="LANpad Logo" className={`w-[85%] h-[85%] object-contain scale-[1.05] transition-all duration-500 ${dk ? 'invert hue-rotate-180 brightness-110 contrast-125' : ''}`} />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-5xl w-full flex-1 flex flex-col justify-center items-center text-center min-h-0"
        >
          <h1 className={`text-3xl md:text-6xl font-black tracking-tighter mb-2 md:mb-4 bg-clip-text text-transparent bg-gradient-to-r ${dk ? 'from-white to-white/60' : 'from-black to-black/60'}`}>
            Contribute to LANpad
          </h1>

          <p className={`text-xs md:text-lg ${textSecondary} mb-4 md:mb-8 leading-relaxed max-w-2xl mx-auto px-4`}>
            A community effort to share and discover custom macros, setup scripts, and text files.
          </p>

          <div className="w-full flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-6 px-4 md:px-0 py-1 mb-4 md:mb-8 min-h-0 shrink-0">
            <div className={`p-3 md:p-6 rounded-xl md:rounded-3xl ${clayBg} flex flex-col text-left justify-start transition-all`}>
              <h3 className={`font-bold mb-0.5 md:mb-2 flex items-center gap-1.5 md:gap-2 text-[11px] md:text-base ${textPrimary}`}><BookOpen size={13} className="text-sky-400 shrink-0 md:w-5 md:h-5" /> What is Contribute?</h3>
              <p className={`text-[9px] md:text-sm ${textSecondary} leading-relaxed`}>Submit resources directly to custom community hubs for real-time local syncs.</p>
            </div>
            <div className={`p-3 md:p-6 rounded-xl md:rounded-3xl ${clayBg} flex flex-col text-left justify-start transition-all`}>
              <h3 className={`font-bold mb-0.5 md:mb-2 flex items-center gap-1.5 md:gap-2 text-[11px] md:text-base ${textPrimary}`}><Layout size={13} className="text-blue-400 shrink-0 md:w-5 md:h-5" /> Hub Isolation</h3>
              <p className={`text-[9px] md:text-sm ${textSecondary} leading-relaxed`}>Separate resource libraries to keep configurations clean and organized by communities.</p>
            </div>
            <div className={`p-3 md:p-6 rounded-xl md:rounded-3xl ${clayBg} flex flex-col text-left justify-start transition-all`}>
              <h3 className={`font-bold mb-0.5 md:mb-2 flex items-center gap-1.5 md:gap-2 text-[11px] md:text-base ${textPrimary}`}><Users size={13} className="text-rose-400 shrink-0 md:w-5 md:h-5" /> Hub Management</h3>
              <p className={`text-[9px] md:text-sm ${textSecondary} leading-relaxed`}>Request access to any community hub, and publish files directly once approved.</p>
            </div>
          </div>

          <div className={`flex items-start md:items-center gap-3 text-left max-w-md md:max-w-xl mx-auto p-3.5 md:p-5 rounded-xl md:rounded-2xl border ${borderLight} ${dk ? 'bg-white/[0.02]' : 'bg-black/[0.02]'} mb-4 md:mb-8`}>
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-3.5 h-3.5 md:w-4 md:h-4 rounded border-white/20 bg-white/5 accent-blue-500 shrink-0 cursor-pointer mt-0.5 md:mt-0"
            />
            <label htmlFor="terms" className={`text-[10px] md:text-sm ${textSecondary} cursor-pointer select-none leading-normal`}>
              I agree to provide accurate and safe configuration files, and understand that contributions are monitored by hub owners.
            </label>
          </div>

          <button
            onClick={() => signIn("google")}
            disabled={!acceptedTerms}
            className={`group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 md:gap-3.5 px-6 py-3.5 md:px-10 md:py-4.5 ${dk ? 'bg-white text-black hover:shadow-white/20' : 'bg-black text-white hover:shadow-black/20'} rounded-full font-black uppercase tracking-wider text-xs md:text-sm transition-all shadow-xl shrink-0
              ${acceptedTerms ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed grayscale'}`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" className="md:w-5 md:h-5" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
              </g>
            </svg>
            Sign in with Google
          </button>
        </motion.div>

        <div className="relative z-10 shrink-0 mt-2 md:mt-6">
          <Link href="/" className="transition-colors text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ─── AUTHENTICATED STATE ───
  if (status === "loading") {
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
            <span className={`hidden md:block text-xs font-mono ${dk ? 'text-white/50' : 'text-black/50'}`}>{session?.user?.email}</span>
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
            <button onClick={() => signOut()} className={`p-2 rounded-xl border ${borderLight} hover:bg-white/5 transition-colors`}>
              <LogOut size={14} className={dk ? "text-white/60" : "text-black/60"} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col relative w-full max-w-7xl mx-auto px-4 md:px-12 py-6">
        <AnimatePresence mode="wait">
          {!selectedHub ? (
            /* ==================== SCREEN 1: HUB SELECTOR / SEARCH ==================== */
            <motion.div
              key="hub-select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 min-h-0 flex flex-col space-y-5"
            >
              <div className="shrink-0">
                <h2 className="text-2xl font-black font-outfit uppercase tracking-wide">Select Community Hub</h2>
                <p className="text-xs text-white/60 mt-1">Choose a community hub to view configurations and submit resources.</p>
              </div>

              {/* Search bar */}
              <div className="shrink-0 relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search hubs by name, description, or id..."
                  value={exploreQuery}
                  onChange={(e) => setExploreQuery(e.target.value)}
                  className={`w-full text-xs rounded-xl pl-10 pr-4 py-3 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 bg-white/5 border-white/10`}
                />
              </div>

              {/* Hub Cards List */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {loadingHubs ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
                  </div>
                ) : filteredHubs.length === 0 ? (
                  <div className="py-20 text-center rounded-[28px] border border-dashed border-white/10">
                    <Users size={32} className="mx-auto mb-3 opacity-30 text-sky-400" />
                    <p className="text-xs text-white/60">No community hubs match your search query.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredHubs.map((h: any) => {
                      const isOwner = h.creatorEmail.toLowerCase() === session?.user?.email?.toLowerCase();
                      const isApproved = isOwner || h.myStatus === "approved";
                      const isPending = h.myStatus === "pending";

                      return (
                        <div
                          key={h.id}
                          className={`p-5 rounded-[24px] border ${clayBg} flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg transition-all group relative overflow-hidden`}
                        >
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine} opacity-0 group-hover:opacity-100 transition-opacity`} />

                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col gap-1 min-w-0">
                                <h3 className={`text-base font-extrabold uppercase tracking-wide ${textPrimary} truncate max-w-[180px]`}>{h.title}</h3>
                                <span className={`text-[8px] font-bold uppercase self-start px-1.5 py-0.25 rounded border ${h.visibility === "private"
                                    ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                                    : "text-sky-400 bg-sky-500/10 border-sky-500/20"
                                  }`}>
                                  {h.visibility || "public"}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-sky-400 px-2 py-0.5 rounded border border-sky-400/20 bg-sky-400/5">{h.id}</span>
                            </div>
                            {h.description && <p className={`text-xs ${textSecondary} line-clamp-2 leading-relaxed`}>{h.description}</p>}
                            <p className={`text-[10px] ${textMuted} font-mono`}>Owner: {h.creatorEmail}</p>
                          </div>

                          <div className="pt-5 mt-auto flex justify-end">
                            {isApproved ? (
                              <button
                                onClick={() => {
                                  setSelectedHub(h);
                                  setSelectedCategory(null);
                                  setSelectedTopic(null);
                                }}
                                className="w-full bg-[#0077C0] text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md transition-all active:scale-[0.98]"
                              >
                                Enter Hub {isOwner && "(Owner)"}
                              </button>
                            ) : isPending ? (
                              <button
                                disabled
                                className="w-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold py-2 px-4 rounded-xl text-xs cursor-not-allowed"
                              >
                                Request Pending
                              </button>
                            ) : (
                              <button
                                onClick={() => handleJoinRequest(h.id)}
                                disabled={joiningHub && requestingHubId === h.id}
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all"
                              >
                                {joiningHub && requestingHubId === h.id ? "Submitting..." : "Request to Join"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ==================== SCREEN 2: HUB DASHBOARD ==================== */
            <motion.div
              key="hub-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 min-h-0 flex flex-col space-y-4"
            >
              {/* Header and Switch Hub Button */}
              <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedHub(null);
                        setResources([]);
                        setSelectedCategory(null);
                        setSelectedTopic(null);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:opacity-75 transition-all"
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
                          className="flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:opacity-75 transition-all"
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
                          className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:opacity-75 transition-all"
                        >
                          <ChevronLeft size={14} /> Topic: {selectedTopic.name}
                        </button>
                      </>
                    )}
                    <span className="text-white/30">&bull;</span>
                    <span className="text-[10px] font-mono text-white/50">Hub: {selectedHub.id}</span>
                  </div>
                  <h2 className="text-2xl font-black font-outfit uppercase tracking-wide text-white">{selectedHub.title}</h2>
                  {selectedHub.description && <p className="text-xs text-white/60">{selectedHub.description}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Search resources..."
                      value={resourceSearch}
                      onChange={(e) => setResourceSearch(e.target.value)}
                      className={`text-xs rounded-xl pl-8 pr-3.5 py-2 border focus:outline-none bg-white/5 border-white/10`}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const allowed = selectedCategory?.allowedTypes || selectedHub?.allowedTypes || ["code", "link", "text"];
                      setResType(allowed[0] || "code");
                      setShowAddModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
                    style={{ background: P.blue }}
                  >
                    <Plus size={13} /> Add Resource
                  </button>
                </div>
              </div>

              {/* 4-Layer Step Selection Flow */}
              {selectedHub.categories && selectedHub.categories.length > 0 && !selectedCategory ? (
                /* Step 2: Category Selector Grid */
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <div className="py-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#0077C0] mb-4">Categories</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedHub.categories.map((cat: any) => {
                        const count = resources.filter(r => r.category?.toLowerCase() === cat.name.toLowerCase() || r.subCategory?.toLowerCase() === cat.name.toLowerCase()).length;
                        return (
                          <div
                            key={cat.name}
                            onClick={() => {
                              setSelectedCategory(cat);
                              setSelectedTopic(null);
                            }}
                            className="p-5 rounded-[24px] border border-white/[0.08] bg-white/[0.02] hover:border-white/20 transition-all hover:bg-white/[0.04] cursor-pointer group flex flex-col justify-between min-h-[130px] relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="space-y-1.5">
                              <h4 className="text-sm font-extrabold uppercase tracking-wider text-white group-hover:text-sky-400 transition-colors">{cat.name}</h4>
                              <p className="text-[11px] text-white/55 leading-relaxed">
                                Browse configurations. Types: {cat.allowedTypes?.join(", ") || "All"}.
                                {cat.limit ? ` Limit: ${cat.limit} items.` : ""}
                              </p>
                            </div>
                            <div className="flex justify-between items-center pt-3">
                              <span className="text-[9px] font-mono text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">
                                {count} items
                              </span>
                              <span className="text-xs font-bold text-sky-400 group-hover:translate-x-1 transition-transform">Select Category &rarr;</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : selectedHub.categories && selectedHub.categories.length > 0 && selectedCategory && !selectedTopic ? (
                /* Step 3: Topic Selector Grid */
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <div className="py-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-purple-400 mb-4">Topics inside {selectedCategory.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Today's Date Topic */}
                      {(() => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const count = resources.filter(r => (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) && r.topic === todayStr).length;
                        const topicConfig = selectedCategory.topics?.find((t: any) => t.name === todayStr);
                        const limitStr = topicConfig?.limit ? ` (Limit: ${topicConfig.limit})` : "";
                        return (
                          <div
                            onClick={() => setSelectedTopic({ name: todayStr, limit: topicConfig?.limit })}
                            className="p-5 rounded-[24px] border border-white/[0.08] bg-white/[0.02] hover:border-white/20 transition-all hover:bg-white/[0.04] cursor-pointer group flex flex-col justify-between min-h-[130px] relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="space-y-1.5">
                              <h4 className="text-sm font-extrabold uppercase tracking-wider text-white group-hover:text-purple-400 transition-colors">Today's Date</h4>
                              <p className="text-[11px] text-[#A0AEC0] leading-relaxed font-mono font-bold">{todayStr}{limitStr}</p>
                            </div>
                            <div className="flex justify-between items-center pt-3">
                              <span className="text-[9px] font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">
                                {count} items
                              </span>
                              <span className="text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">Enter Topic &rarr;</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Custom Topics defined by Creator */}
                      {(selectedCategory.topics || []).map((topic: any) => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        if (topic.name === todayStr) return null; // Avoid duplicate cards
                        const count = resources.filter(r => (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) && r.topic?.toLowerCase() === topic.name.toLowerCase()).length;
                        return (
                          <div
                            key={topic.name}
                            onClick={() => setSelectedTopic(topic)}
                            className="p-5 rounded-[24px] border border-white/[0.08] bg-white/[0.02] hover:border-white/20 transition-all hover:bg-white/[0.04] cursor-pointer group flex flex-col justify-between min-h-[130px] relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="space-y-1.5">
                              <h4 className="text-sm font-extrabold uppercase tracking-wider text-white group-hover:text-purple-400 transition-colors">{topic.name}</h4>
                              <p className="text-[11px] text-[#A0AEC0] leading-relaxed">Browse files. {topic.limit ? ` Limit: ${topic.limit} items.` : ""}</p>
                            </div>
                            <div className="flex justify-between items-center pt-3">
                              <span className="text-[9px] font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">
                                {count} items
                              </span>
                              <span className="text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">Enter Topic &rarr;</span>
                            </div>
                          </div>
                        );
                      })}

                      {/* All Topics Option */}
                      <div
                        onClick={() => setSelectedTopic({ name: "All Topics" })}
                        className="p-5 rounded-[24px] border border-white/[0.08] bg-white/[0.02] hover:border-white/20 transition-all hover:bg-white/[0.04] cursor-pointer group flex flex-col justify-between min-h-[130px] relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-extrabold uppercase tracking-wider text-white group-hover:text-sky-400 transition-colors">All Topics</h4>
                          <p className="text-[11px] text-[#A0AEC0] leading-relaxed">View all resource topics filed under <strong>{selectedCategory.name}</strong>.</p>
                        </div>
                        <div className="flex justify-between items-center pt-3">
                          <span className="text-[9px] font-mono text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">
                            {resources.filter(r => r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()).length} items
                          </span>
                          <span className="text-xs font-bold text-sky-400 group-hover:translate-x-1 transition-transform">Browse All &rarr;</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Step 4: Resources cards list */
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                    {loadingResources ? (
                      <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
                      </div>
                    ) : filteredResources.length === 0 ? (
                      <div className={`py-20 text-center rounded-[28px] border border-dashed ${borderLight}`}>
                        <Code size={32} className="mx-auto mb-3 opacity-30 text-sky-400" />
                        <p className={`text-xs ${textSecondary}`}>No resources found in this community hub.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {filteredResources.map((r, idx) => (
                          <div
                            key={r.id}
                            onClick={() => setExpandedResId(expandedResId === r.id ? null : r.id)}
                            className={`p-1.5 rounded-[24px] border ${borderLight} ${clayBg} relative overflow-hidden cursor-pointer hover:border-white/20 transition-all`}
                          >
                            <div className={`p-4 rounded-[18px] ${dk ? 'bg-black/40' : 'bg-white/40'} flex flex-col space-y-3.5`}>
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-lg text-[10px] font-bold mt-0.5 bg-[#0077C0]/10 text-sky-400">{idx + 1}</span>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <h4 className={`text-sm font-bold ${textPrimary} truncate`}>{r.title}</h4>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      <span className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border ${borderLight} ${dk ? 'bg-white/5 text-white/60' : 'bg-black/5 text-black/60'}`}>{r.type}</span>
                                      {(r.category || r.subCategory) && (
                                        <span className="text-[8px] font-mono uppercase px-2 py-0.5 rounded border border-purple-500/20 bg-purple-500/10 text-purple-400">
                                          {r.category || r.subCategory}
                                        </span>
                                      )}
                                      {r.topic && (
                                        <span className="text-[8px] font-mono uppercase px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                          {r.topic}
                                        </span>
                                      )}
                                      {r.language && (
                                        <span className="text-[8px] font-mono uppercase px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400">{r.language}</span>
                                      )}
                                      {r.tags.map(t => (
                                        <span key={t} className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border ${borderLight} ${dk ? 'bg-white/[0.02] text-white/40' : 'bg-black/[0.02] text-black/40'}`}>#{t}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                  {/* Edit Button Icon */}
                                  <button
                                    onClick={(e) => openEditModal(r, e)}
                                    className={`p-1.5 rounded-xl border ${borderLight} hover:bg-black/5 dark:hover:bg-white/5 transition-all ${
                                      r.isLocked ? "opacity-40 cursor-not-allowed" : ""
                                    }`}
                                    title={r.isLocked ? "Locked - Cannot Edit" : "Edit Resource"}
                                  >
                                    <Edit size={12} className={r.isLocked ? "text-gray-400" : "text-sky-400"} />
                                  </button>

                                  {/* Lock/Unlock Toggle Icon (only for creator, hub owner or admins) */}
                                  {(r.creatorEmail?.toLowerCase() === session?.user?.email?.toLowerCase() ||
                                    selectedHub?.creatorEmail?.toLowerCase() === session?.user?.email?.toLowerCase()
                                  ) && (
                                    <button
                                      onClick={(e) => handleToggleLock(r, e)}
                                      className={`p-1.5 rounded-xl border ${borderLight} hover:bg-black/5 dark:hover:bg-white/5 transition-all`}
                                      title={r.isLocked ? "Unlock Resource" : "Lock Resource"}
                                    >
                                      {r.isLocked ? (
                                        <Lock size={12} className="text-amber-500" />
                                      ) : (
                                        <Unlock size={12} className="text-emerald-500" />
                                      )}
                                    </button>
                                  )}

                                  {/* Delete button: strictly restricted to hub owners/admins only */}
                                  {selectedHub?.creatorEmail?.toLowerCase() === session?.user?.email?.toLowerCase() && (
                                    <button
                                      onClick={(e) => handleDeleteResource(r.id, e)}
                                      className="p-1.5 rounded-xl border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                                      title="Delete Resource"
                                    >
                                      <Trash2 size={12} className="text-red-400" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <AnimatePresence>
                                {expandedResId === r.id && (
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
                                      <pre className="text-[11px] font-mono p-3 pt-8 overflow-x-auto bg-[#0d1117] text-[#c9d1d9]">
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
                </>
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
                    resType === "code" && (
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold tracking-wider text-white/60">Language</label>
                        <select
                          value={resLanguage}
                          onChange={(e) => setResLanguage(e.target.value)}
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

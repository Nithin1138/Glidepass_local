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
  description?: string;
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
  const borderLight = dk ? "border-zinc-900" : "border-black/10";
  return (
    <div className={`p-5 rounded-[24px] border ${dk ? "border-zinc-900 bg-[#09090b] hover:border-zinc-800" : "border-black/10 bg-white/80"} flex flex-col justify-between transition-all duration-300 group relative overflow-hidden`}>
      {/* Top edge highlight glow on hover */}
      <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-[#0077C0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Header row */}
      <div className="flex justify-between items-center gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={`text-sm font-extrabold uppercase tracking-wide ${textPrimary} truncate`}>{h.title}</h3>
          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border shrink-0 ${
            h.visibility === "private" ? "text-rose-400 bg-rose-500/10 border-rose-500/25" : "text-sky-400 bg-sky-500/10 border-sky-500/25"
          }`}>{h.visibility || "public"}</span>
        </div>
        {/* Pin Button */}
        <button
          onClick={(e) => onPin(h.id, e)}
          className={`p-1.5 rounded-lg border transition-all shrink-0 ${
            pinned
              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
              : `${borderLight} ${dk ? "border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:text-amber-400 hover:border-amber-400/30" : "text-black/30 hover:text-amber-500 hover:border-amber-400/30"}`
          }`}
          title={pinned ? "Unpin hub" : "Pin hub"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
          </svg>
        </button>
      </div>

      {/* Description & ID Row */}
      <div className="flex justify-between items-end gap-3 mt-1.5 mb-3.5">
        <div className="min-w-0 flex-1">
          {h.description ? (
            <p className={`text-[10px] ${textSecondary} line-clamp-2 leading-relaxed font-medium`}>{h.description}</p>
          ) : (
            <p className={`text-[10px] text-zinc-600 italic`}>No description provided</p>
          )}
        </div>
        <span className={`text-[8.5px] ${textMuted} font-mono bg-zinc-900/40 border border-zinc-800/80 px-2 py-0.5 rounded-md select-all shrink-0`}>
          {h.id}
        </span>
      </div>

      {/* Action button */}
      {isApproved ? (
        <button
          onClick={onEnter}
          className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 bg-[#0077C0]/10 border border-[#0077C0]/35 text-sky-400 hover:bg-[#0077C0] hover:text-white hover:border-[#0077C0] hover:shadow-[0_0_12px_rgba(0,119,192,0.25)] active:scale-[0.98]"
        >
          Enter Hub{isOwner ? " (Owner)" : ""}
        </button>
      ) : isPending ? (
        <button
          disabled
          className="w-full mt-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold py-2 px-3 rounded-xl text-xs cursor-not-allowed"
        >
          Pending
        </button>
      ) : (
        <button
          onClick={() => onJoin(h.id)}
          disabled={joiningHub && requestingHubId === h.id}
          className={`w-full mt-2 border font-bold py-2 px-3 rounded-xl text-xs transition-all duration-300 ${
            dk
              ? "bg-white/5 hover:bg-[#0077C0] hover:text-white border-zinc-800 text-zinc-300 hover:border-[#0077C0]"
              : "bg-black/5 hover:bg-black/10 border-black/10 text-black"
          }`}
        >
          {joiningHub && requestingHubId === h.id ? "Requesting…" : "Request Join"}
        </button>
      )}
    </div>
  );
}
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return dateStr;
};

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
          } else {
            if (data.sayMyName !== undefined) {
              setSayMyName(data.sayMyName);
            }
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
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [topicDate, setTopicDate] = useState(() => new Date().toISOString().split("T")[0]);
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
      { id: "c", name: "C" },
      { id: "cpp", name: "C++" },
      { id: "javascript", name: "JavaScript" },
      { id: "typescript", name: "TypeScript" },
      { id: "bash", name: "Bash / Shell" },
      { id: "powershell", name: "PowerShell" },
      { id: "yaml", name: "YAML" },
      { id: "json", name: "JSON" },
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
  const [resDate, setResDate] = useState(() => new Date().toISOString().split("T")[0]);
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
  const [editReason, setEditReason] = useState("");
  const [sayMyName, setSayMyName] = useState(true);

  const toggleSayMyName = async () => {
    const nextVal = !sayMyName;
    setSayMyName(nextVal);
    const email = effectiveSession?.user?.email;
    if (email) {
      try {
        await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, sayMyName: nextVal })
        });
      } catch (e) {
        console.error("Failed to update sayMyName:", e);
      }
    }
  };

  const allowedFormats = selectedCategory?.allowedTypes || selectedHub?.allowedTypes || ["code", "link", "text"];

  const isAddDisabled = React.useMemo(() => {
    if (!selectedCategory) return false;
    if (!selectedTopic) {
      // Add Topic button
      if (selectedCategory.topicsLimit === undefined || selectedCategory.topicsLimit === null) return false;
      const dbTopicNames = resources
        .filter(r => 
          (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() ||
           r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) &&
          r.topic
        )
        .map(r => r.topic);
      const allTopicNames = Array.from(new Set([
        ...dbTopicNames,
        ...(selectedCategory.topics || []).map((t: any) => t.name),
      ]));
      const todayStr = new Date().toISOString().split("T")[0];
      const todayTopicNames = allTopicNames.filter(name => {
        if (name === todayStr) return true;
        const topicResources = resources.filter(r => 
          (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() ||
           r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) &&
          r.topic?.toLowerCase() === name.toLowerCase()
        );
        return topicResources.some(r => r.createdAt && r.createdAt.startsWith(todayStr));
      });
      return todayTopicNames.length >= selectedCategory.topicsLimit;
    } else {
      // Add Resource button
      if (selectedTopic.name === "All Topics") return true; // Can't add resource to "All Topics" directly without a specific topic date
      let limit = selectedTopic.limit;
      if (limit === undefined && selectedCategory.resourcesPerTopic !== undefined) {
        limit = selectedCategory.resourcesPerTopic;
      }
      if (limit === undefined || limit === null) return false;
      // Count resources in the current topic
      const count = resources.filter(r => 
        (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() ||
         r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) &&
        r.topic?.toLowerCase() === selectedTopic.name.toLowerCase()
      ).length;
      return count >= limit;
    }
  }, [selectedCategory, selectedTopic, resources]);

  const addBtnText = React.useMemo(() => {
    if (!selectedCategory) return "";
    if (!selectedTopic) {
      if (isAddDisabled) {
        return `Capped (${selectedCategory.topicsLimit} Max)`;
      }
      return "Add Topic";
    } else {
      if (isAddDisabled) {
        let limit = selectedTopic.limit;
        if (limit === undefined && selectedCategory.resourcesPerTopic !== undefined) {
          limit = selectedCategory.resourcesPerTopic;
        }
        return `Capped (${limit} Max)`;
      }
      return "Add Resource";
    }
  }, [selectedCategory, selectedTopic, isAddDisabled]);

  // Fetch Hubs with user relationship status
  const fetchHubs = async (quiet = false) => {
    if (!effectiveSession?.user?.email) return;
    if (!quiet) setLoadingHubs(true);
    try {
      const res = await fetch(`/api/hubs?contributorEmail=${effectiveSession.user.email}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHubs(data.hubs);
      }
    } catch (e) {
      console.error(e);
      if (!quiet) showToast("error", "Failed to fetch community hubs.");
    } finally {
      if (!quiet) setLoadingHubs(false);
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
      const interval = setInterval(() => {
        fetchHubs(true);
      }, 5000);
      return () => clearInterval(interval);
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
          creatorName: sayMyName ? (effectiveSession?.user?.name || "Anonymous") : "Anonymous",

          hubId: selectedHub.id,
          category: resSubCategory || (selectedCategory ? selectedCategory.name : undefined),
          subCategory: resSubCategory || (selectedCategory ? selectedCategory.name : undefined),
          topic: resDate
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // If this is a pending/temporary topic, save it to the hub categories now!
        if (selectedTopic && selectedTopic.isPending) {
          try {
            const updatedCategories = selectedHub.categories.map((cat: any) => {
              if (cat.name.toLowerCase() === selectedCategory.name.toLowerCase()) {
                const topics = cat.topics || [];
                // Check if topic name already exists to avoid duplicates
                if (!topics.some((t: any) => t.name.toLowerCase() === selectedTopic.name.toLowerCase())) {
                  return {
                    ...cat,
                    topics: [...topics, {
                      name: selectedTopic.name,
                      title: selectedTopic.title || selectedTopic.name,
                      description: selectedTopic.description || ""
                    }]
                  };
                }
              }
              return cat;
            });

            const hubRes = await fetch("/api/hubs", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: selectedHub.id,
                creatorEmail: effectiveSession?.user?.email || "anonymous",
                categories: updatedCategories
              })
            });
            const hubData = await hubRes.json();
            if (hubRes.ok && hubData.success) {
              const updatedHub = hubData.hub;
              setSelectedHub(updatedHub);
              const updatedCat = updatedHub.categories.find(
                (c: any) => c.name.toLowerCase() === selectedCategory.name.toLowerCase()
              );
              if (updatedCat) {
                setSelectedCategory(updatedCat);
                const savedTopic = updatedCat.topics?.find(
                  (t: any) => t.name.toLowerCase() === selectedTopic.name.toLowerCase()
                );
                if (savedTopic) {
                  setSelectedTopic(savedTopic); // Clear the isPending flag
                } else {
                  setSelectedTopic({ name: selectedTopic.name, title: selectedTopic.title, description: selectedTopic.description });
                }
              }
            }
          } catch (hubErr) {
            console.error("Failed to save topic config to hub:", hubErr);
          }
        }

        showToast("success", "Resource published successfully!");
        setResTitle("");
        setResContent("");
        setResTags("");
        setResDescription("");
        // Do not reset resLanguage to keep the last used language
        setResSubCategory("");
        setResDate(new Date().toISOString().split("T")[0]);
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

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicDate) {
      return showToast("error", "Date is required.");
    }

    // Limit check for topics in category
    if (selectedCategory && selectedCategory.topicsLimit !== undefined && selectedCategory.topicsLimit !== null) {
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

      const todayStr = new Date().toISOString().split("T")[0];
      const todayTopicNames = allTopicNames.filter(name => {
        if (name === todayStr) return true;
        const topicResources = resources.filter(r => 
          (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() ||
           r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) &&
          r.topic?.toLowerCase() === name.toLowerCase()
        );
        return topicResources.some(r => r.createdAt && r.createdAt.startsWith(todayStr));
      });

      const isTopicActiveToday = topicDate === todayStr || resources.some(r => 
        (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() ||
         r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) &&
        r.topic?.toLowerCase() === topicDate.toLowerCase() &&
        r.createdAt && r.createdAt.startsWith(todayStr)
      );

      if (!isTopicActiveToday && todayTopicNames.length >= selectedCategory.topicsLimit) {
        return showToast("error", `Daily topics limit reached for collection "${selectedCategory.name}". Only ${selectedCategory.topicsLimit} unique topics allowed per day.`);
      }
    }

    const newPendingTopic = {
      name: topicDate,
      title: topicTitle || topicDate,
      description: topicDescription,
      isPending: true
    };

    setSelectedTopic(newPendingTopic);
    setShowAddTopicModal(false);
    showToast("success", "Topic created! Add resource details below to save it.");

    // Prefill Add Resource fields for this topic
    const allowed = selectedCategory?.allowedTypes || selectedHub?.allowedTypes || ["code", "link", "text"];
    setResType(allowed[0] || "code");
    setResSubCategory(selectedCategory.name);
    setResDate(topicDate);
    setResTitle("");
    setResContent("");
    setResTags("");
    setResDescription("");
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
    setEditReason("");
    setShowEditModal(true);
  };

  const handleUpdateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource || !selectedHub) return;
    if (!editReason) {
      showToast("error", "Reason for edit is required.");
      return;
    }
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
          topic: editTopic || undefined,
          reason: editReason
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
        // Show all resources in collection (including today)
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
  const textPrimary = dk ? "text-white" : "text-zinc-900";
  const textSecondary = dk ? "text-white/60" : "text-zinc-650";
  const textMuted = dk ? "text-white/40" : "text-zinc-450";
  const borderLight = dk ? "border-white/10" : "border-black/10";
  const inputBg = dk ? "bg-white/5 border-white/10 text-zinc-100" : "bg-white border-black/10 text-zinc-900";
  const cardInnerBg = dk ? "bg-[#09090b]" : "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.02)]";
  const cardInnerHover = dk ? "hover:border-zinc-800" : "hover:border-zinc-350 hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)]";
  const cardBorder = dk ? "border-zinc-900" : "border-black/[0.08]";

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
            <span className={`text-base md:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r ${dk ? 'from-white to-white/60' : 'from-black to-black/60'} truncate`}>
              LANpad
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Email — desktop only */}
            <span className={`hidden lg:block text-xs font-mono truncate max-w-[160px] ${dk ? 'text-white/40' : 'text-black/40'}`}>{effectiveSession?.user?.email}</span>

            {/* SAY MY NAME Toggle */}
            <div className={`flex items-center gap-2 px-2.5 rounded-xl border ${borderLight} h-[32px] ${dk ? 'bg-[#09090b]' : 'bg-black/5'}`}>
              <span className={`text-[8px] sm:text-[9px] font-mono tracking-wider font-bold uppercase ${dk ? 'text-zinc-400' : 'text-gray-500'}`}>
                SAY MY NAME
              </span>
              <button
                onClick={toggleSayMyName}
                className={`relative w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer duration-300 focus:outline-none ${
                  sayMyName ? 'bg-blue-500' : (dk ? 'bg-zinc-700' : 'bg-gray-300')
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-md ${
                    sayMyName ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => {
                const nextTheme = theme === "dark" ? "light" : "dark";
                setTheme(nextTheme);
                localStorage.setItem("glidepass-theme", nextTheme);
              }}
              className={`p-2 rounded-xl border ${borderLight} ${dk ? 'hover:bg-white/5' : 'hover:bg-black/5'} transition-colors`}
              title="Toggle Theme"
            >
              {dk ? (
                <Sun size={14} className="text-white/60" />
              ) : (
                <Moon size={14} className="text-black/60" />
              )}
            </button>

            {/* Logout */}
            <button
              onClick={() => {
                localStorage.removeItem("glidepass-contributor-user");
                if (session) signOut({ callbackUrl: "/provider" });
                else window.location.href = "/provider";
              }}
              className={`p-2 rounded-xl border ${borderLight} ${dk ? 'hover:bg-white/5' : 'hover:bg-black/5'} transition-colors`}
              title="Logout"
            >
              <LogOut size={14} className={dk ? "text-white/60" : "text-black/60"} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col relative w-full max-w-7xl mx-auto px-3 md:px-12 py-4 md:py-6 overflow-hidden">
        {selectedHub && (
          <div className={`shrink-0 mb-5 pb-4 border-b ${borderLight} relative flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
            {/* Left side: Breadcrumb navigation pathway */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono tracking-wide text-zinc-500 uppercase">
              <button
                onClick={() => {
                  setSelectedHub(null);
                  setResources([]);
                  setSelectedCategory(null);
                  setSelectedTopic(null);
                }}
                className="hover:text-sky-400 transition-colors cursor-pointer"
              >
                Hubs
              </button>
              
              <svg className="w-2.5 h-2.5 text-zinc-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>

              <button
                onClick={() => { setSelectedCategory(null); setSelectedTopic(null); }}
                className={`hover:text-sky-400 transition-colors cursor-pointer ${!selectedCategory ? `${textPrimary} font-bold` : ''}`}
              >
                {selectedHub.title}
              </button>

              {selectedCategory && (
                <>
                  <svg className="w-2.5 h-2.5 text-zinc-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className={`hover:text-sky-400 transition-colors cursor-pointer ${!selectedTopic ? `${textPrimary} font-bold` : ''}`}
                  >
                    {selectedCategory.name}
                  </button>
                </>
              )}

              {selectedTopic && (
                <>
                  <svg className="w-2.5 h-2.5 text-zinc-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  <span className={`${textPrimary} font-bold px-2 py-0.5 rounded-md ${dk ? 'bg-zinc-900 border-zinc-800/80' : 'bg-black/5 border-black/10'}`}>
                    {(() => {
                      const hasCustomTitle = selectedTopic.title && selectedTopic.title !== selectedTopic.name;
                      return selectedTopic.name === "All Topics" 
                        ? "All Topics" 
                        : (hasCustomTitle ? selectedTopic.title : formatDate(selectedTopic.name));
                    })()}
                  </span>
                </>
              )}
            </div>

            {/* Right side: Search + Add Button */}
            {selectedCategory && (
              <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end shrink-0">
                <div className="relative w-full md:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search resources…"
                    value={resourceSearch}
                    onChange={(e) => setResourceSearch(e.target.value)}
                    className={`w-full text-xs rounded-xl pl-9 pr-3 h-[34px] border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                  />
                </div>
                <button
                  disabled={isAddDisabled}
                  onClick={() => {
                    if (!selectedTopic) {
                      // Create Topic Modal
                      setTopicTitle("");
                      setTopicDescription("");
                      setTopicDate(new Date().toISOString().split("T")[0]);
                      setShowAddTopicModal(true);
                    } else {
                      // Create Resource Modal
                      const allowed = selectedCategory?.allowedTypes || selectedHub?.allowedTypes || ["code", "link", "text"];
                      setResType(allowed[0] || "code");
                      setResSubCategory(selectedCategory.name);
                      setResDate(selectedTopic.name);
                      setShowAddModal(true);
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 px-4 h-[34px] rounded-xl font-bold text-xs shadow-sm transition-all whitespace-nowrap shrink-0 border ${
                    isAddDisabled 
                      ? (dk 
                          ? 'bg-zinc-900/80 text-zinc-650 border-zinc-800/80 cursor-not-allowed' 
                          : 'bg-zinc-200/70 text-zinc-450 border-zinc-300/50 cursor-not-allowed'
                        ) 
                      : 'text-white active:scale-[0.98] cursor-pointer border-transparent'
                  }`}
                  style={{ background: isAddDisabled ? undefined : P.blue }}
                >
                  <Plus size={13} />
                  <span>{addBtnText}</span>
                </button>
              </div>
            )}

            {/* Premium blue gradient accent line overlaying the border bottom */}
            <div className="absolute bottom-0 left-0 w-16 h-[1.5px] bg-[#0077C0]" />
          </div>
        )}
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
              {/* 4-Layer Content */}
              {selectedHub.categories && selectedHub.categories.length > 0 && !selectedCategory ? (
                /* ── LAYER 2: Category Grid ── */
                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {selectedHub.categories.map((cat: any) => {
                      // Resources count
                      const resourcesCount = resources.filter(r => 
                        !r.isDeleted && 
                        (r.category?.toLowerCase() === cat.name.toLowerCase() || r.subCategory?.toLowerCase() === cat.name.toLowerCase())
                      ).length;

                      // Sessions / Unique topic dates count
                      const resourceTopics = Array.from(new Set(resources
                        .filter(r => 
                          !r.isDeleted && 
                          (r.category?.toLowerCase() === cat.name.toLowerCase() || r.subCategory?.toLowerCase() === cat.name.toLowerCase()) &&
                          r.topic && /^\d{4}-\d{2}-\d{2}$/.test(r.topic)
                        )
                        .map(r => r.topic)
                      ));
                      const allTopicNames = Array.from(new Set([
                        ...(cat.topics || []).map((t: any) => t.name),
                        ...resourceTopics
                      ]));
                      const sessionsCount = allTopicNames.length;

                      // Check if today's topic is created
                      const todayStr = new Date().toISOString().split("T")[0];
                      const hasTodayTopic = allTopicNames.includes(todayStr);

                      return (
                        <div
                          key={cat.name}
                          onClick={() => { setSelectedCategory(cat); setSelectedTopic(null); }}
                          className={`relative p-5 md:p-6 rounded-[22px] border ${cardBorder} ${cardInnerBg} ${cardInnerHover} transition-all duration-300 cursor-pointer group flex items-center justify-between min-h-[90px] overflow-hidden`}
                        >
                          {/* Top edge highlight glow on hover */}
                          <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <h4 className={`text-base md:text-lg font-black uppercase tracking-tight ${textPrimary} leading-tight truncate`}>
                              {cat.name}
                            </h4>
                            <p className={`text-[10px] md:text-xs font-mono ${textMuted} flex items-center gap-1.5`}>
                              <span>{sessionsCount} Session{sessionsCount !== 1 ? 's' : ''}</span>
                              <span className="opacity-45">•</span>
                              <span>{resourcesCount} Code{resourcesCount !== 1 ? 's' : ''}</span>
                            </p>
                          </div>
                          
                          {/* Glowing Status Dot */}
                          <div className="flex items-center shrink-0 ml-4">
                            <span 
                              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                                hasTodayTopic 
                                  ? 'bg-[#10b981] shadow-[0_0_12px_#10b981]' 
                                  : 'bg-[#ef4444] shadow-[0_0_12px_#ef4444]'
                              }`}
                              title={hasTodayTopic ? "Today's Topic Created" : "Today's Topic Not Created"}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              ) : selectedHub.categories && selectedHub.categories.length > 0 && selectedCategory && !selectedTopic ? (
                /* ── LAYER 3: Topic Grid ── */
                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                  {(() => {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const resourceTopics = Array.from(new Set(resources
                      .filter(r => 
                        !r.isDeleted &&
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
                    const sortedTopics = allTopicNames
                      .map(name => {
                        const existing = (selectedCategory.topics || []).find((t: any) => t.name === name);
                        return existing || { name, title: name };
                      })
                      .sort((a, b) => b.name.localeCompare(a.name));

                    const totalCategoryResources = resources.filter(r => 
                      !r.isDeleted && 
                      (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase())
                    ).length;

                    return (
                      <div className="space-y-4">
                        {/* Header Details */}
                        <div className="mb-5">
                          <p className="text-[10px] md:text-xs font-mono text-[#52525b]">
                            {sortedTopics.length} Topic{sortedTopics.length !== 1 ? 's' : ''} &nbsp;•&nbsp; {totalCategoryResources} Resource{totalCategoryResources !== 1 ? 's' : ''} Contributed
                          </p>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {sortedTopics.map((topic: any) => {
                            const count = resources.filter(r => (r.category?.toLowerCase() === selectedCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedCategory.name.toLowerCase()) && r.topic?.toLowerCase() === topic.name.toLowerCase()).length;
                            
                            // Check limit
                            let limit = topic.limit;
                            if (limit === undefined && selectedCategory.resourcesPerTopic !== undefined) {
                              limit = selectedCategory.resourcesPerTopic;
                            }
                            const isCapped = limit !== undefined && limit !== null && count >= limit;

                            // Title if have, otherwise date
                            const hasCustomTitle = topic.title && topic.title !== topic.name;
                            const displayTitle = hasCustomTitle ? topic.title : (topic.name === todayStr ? "Today" : formatDate(topic.name));

                            return (
                              <div
                                key={topic.name}
                                onClick={() => setSelectedTopic({ name: topic.name, limit: topic.limit })}
                                className={`relative p-4.5 rounded-[20px] border ${cardBorder} ${cardInnerBg} ${cardInnerHover} transition-all duration-300 cursor-pointer group flex flex-col justify-between h-[112px] overflow-hidden`}
                              >
                                {/* Top edge highlight glow on hover */}
                                <div className="absolute top-0 left-5 right-5 h-[1.5px] bg-gradient-to-r from-transparent via-[#0077C0]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                {/* Top row: Date and Capped status */}
                                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[9px] font-mono ${textMuted}`}>
                                      {formatDate(topic.name)}
                                    </span>
                                  </div>
                                  {isCapped && (
                                    <span className="px-2 py-0.5 text-[8px] font-bold uppercase rounded-full border border-red-900/30 bg-red-950/20 text-red-500 font-mono">
                                      Capped (Max {limit})
                                    </span>
                                  )}
                                </div>

                                {/* Middle row: Title */}
                                <div className="mb-2">
                                  <h4 className={`text-xs md:text-[13px] font-bold ${textPrimary} leading-tight truncate`}>
                                    {displayTitle}
                                  </h4>
                                </div>

                                {/* Bottom row: count */}
                                <div className={`text-[9px] md:text-[10px] font-mono ${textSecondary}`}>
                                  <span>{count} Resource{count !== 1 ? 's' : ''} Contributed</span>
                                </div>
                              </div>
                            );
                          })}

                          {/* All Topics Shortcut Card */}
                          <div
                            onClick={() => setSelectedTopic({ name: "All Topics" })}
                            className={`relative p-4.5 rounded-[20px] border border-dashed ${dk ? 'border-zinc-800 bg-zinc-950/20 hover:border-sky-500/40' : 'border-black/10 bg-black/[0.02] hover:border-sky-500/40'} hover:bg-[#0077C0]/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-[112px] overflow-hidden`}
                          >
                            {/* Top edge highlight glow on hover */}
                            <div className="absolute top-0 left-5 right-5 h-[1.5px] bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="flex items-center justify-between mb-2.5">
                              <span className={`px-1.5 py-0.5 text-[8px] font-bold tracking-wider rounded ${dk ? 'bg-zinc-800/40 border-zinc-700/20 text-zinc-400' : 'bg-black/5 border-black/10 text-gray-500'} uppercase font-mono`}>
                                ALL
                              </span>
                            </div>
                            <div className="mb-2">
                              <h4 className={`text-xs md:text-[13px] font-bold ${dk ? 'text-zinc-400 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-700'} leading-tight`}>
                                All Topics
                              </h4>
                            </div>
                            <div className={`text-[9px] md:text-[10px] font-mono ${textMuted}`}>
                              <span>Show everything in {selectedCategory.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              ) : (
                /* ── LAYER 4: Resources ── */
                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 flex flex-col gap-4">
                  {/* Topic Detail Header */}
                  {selectedTopic && (
                    <div className={`relative shrink-0 p-4 rounded-[20px] border ${cardBorder} ${cardInnerBg} flex items-center justify-between select-none flex-wrap w-full overflow-hidden`}>
                      {/* Permanent top edge glow line highlight */}
                      <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-[#0077C0] to-transparent" />
                      <div className="flex items-center gap-3.5 flex-wrap w-full">
                        {(() => {
                          if (selectedTopic.name === "All Topics") {
                            return (
                              <div className={`flex items-center gap-2 flex-wrap ${textSecondary} font-mono text-[10px]`}>
                                <span>All Topics View</span>
                              </div>
                            );
                          }

                          const hasCustomTitle = selectedTopic.title && selectedTopic.title !== selectedTopic.name;
                          let limit = selectedTopic.limit;
                          if (limit === undefined && selectedCategory.resourcesPerTopic !== undefined) {
                            limit = selectedCategory.resourcesPerTopic;
                          }
                          const isCapped = limit !== undefined && limit !== null && filteredResources.length >= limit;

                          return (
                            <div className={`flex items-center gap-2 flex-wrap ${textSecondary} font-mono text-[10px] w-full`}>
                              {hasCustomTitle && (
                                <>
                                  <span>{formatDate(selectedTopic.name)}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>
                                {filteredResources.length} Resource{filteredResources.length !== 1 ? 's' : ''}
                              </span>
                              {isCapped && (
                                <>
                                  <span>•</span>
                                  <span className="px-2 py-0.5 text-[8px] font-bold uppercase rounded-full border border-red-950/20 bg-red-950/20 text-red-500 font-mono">
                                    CAPPED (MAX {limit})
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {loadingResources ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
                    </div>
                  ) : filteredResources.length === 0 ? (
                    <div className="py-24 text-center rounded-[24px] border border-dashed border-zinc-900 bg-zinc-950/10 flex flex-col items-center justify-center">
                      <Code size={36} className="mb-4 opacity-25 text-[#0077C0]" />
                      <p className="text-sm text-zinc-400">No resources in this topic.</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        Click <span className="text-[#0077C0] font-semibold">"Add Resource"</span> to start contributing.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {filteredResources.map((r, idx) => (
                        <div
                          key={r.id}
                          onClick={() => setExpandedResId(expandedResId === r.id ? null : r.id)}
                          className={`relative p-4 rounded-[20px] border ${cardBorder} ${cardInnerBg} ${cardInnerHover} transition-all duration-300 cursor-pointer group flex flex-col justify-between overflow-hidden`}
                        >
                          {/* Top edge highlight glow on hover */}
                          <div className="absolute top-0 left-5 right-5 h-[1.5px] bg-gradient-to-r from-transparent via-[#0077C0]/85 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          <div className="flex items-center justify-between gap-3 w-full">
                            {/* Left side: Circular index and Title/Description */}
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full border ${dk ? 'bg-zinc-900 border-zinc-800/80 text-zinc-400' : 'bg-black/5 border-black/10 text-zinc-650'} text-xs font-extrabold font-mono`}>
                                {idx + 1}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <h4 className={`text-sm font-bold ${textPrimary} leading-tight truncate`}>
                                  {r.title}
                                </h4>
                                {r.description && r.description.trim() !== "" && (
                                  <p className={`text-[10px] font-mono ${textSecondary} mt-0.5 leading-tight truncate`}>
                                    {r.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right side: Action buttons & Language Badge */}
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              {/* Copy Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(r.content);
                                  showToast("success", "Copied to clipboard!");
                                }}
                                className={`p-1.5 rounded-lg border ${dk ? 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:text-white hover:bg-zinc-800' : 'border-black/10 bg-black/5 text-gray-500 hover:text-gray-800 hover:bg-black/10'} transition-all cursor-pointer`}
                                title="Copy content"
                              >
                                <Copy size={11} />
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={(e) => openEditModal(r, e)}
                                className={`p-1.5 rounded-lg border ${dk ? 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:text-white hover:bg-zinc-800' : 'border-black/10 bg-black/5 text-gray-500 hover:text-gray-800 hover:bg-black/10'} transition-all cursor-pointer ${r.isLocked ? "opacity-40 cursor-not-allowed" : ""}`}
                                title={r.isLocked ? "Locked" : "Edit"}
                              >
                                <Edit size={11} />
                              </button>

                              {/* Lock / Unlock */}
                              {(selectedHub?.creatorEmail?.toLowerCase() === effectiveSession?.user?.email?.toLowerCase()) && (
                                <button
                                  onClick={(e) => handleToggleLock(r, e)}
                                  className={`p-1.5 rounded-lg border ${dk ? 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800' : 'border-black/10 bg-black/5 hover:bg-black/10'} transition-all cursor-pointer`}
                                  title={r.isLocked ? "Unlock" : "Lock"}
                                >
                                  {r.isLocked ? <Lock size={11} className="text-amber-500" /> : <Unlock size={11} className="text-emerald-500" />}
                                </button>
                              )}

                              {/* Delete */}
                              {selectedHub?.creatorEmail?.toLowerCase() === effectiveSession?.user?.email?.toLowerCase() && (
                                <button
                                  onClick={(e) => handleDeleteResource(r.id, e)}
                                  className="p-1.5 rounded-lg border border-red-950/20 bg-red-950/10 text-red-400 hover:bg-red-950/20 hover:border-red-900/30 transition-all cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}

                              {/* Language Badge */}
                              {r.language && (
                                <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-bold ${dk ? 'bg-zinc-900 border border-zinc-800 text-zinc-400' : 'bg-black/5 border border-black/10 text-gray-500'} uppercase font-mono`}>
                                  {r.language}
                                </span>
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
                                  className="overflow-hidden mt-3.5"
                                >
                                  <div className="rounded-xl overflow-hidden border border-white/10 relative">
                                    <div className="absolute top-0 left-0 right-0 h-6 flex items-center px-3 border-b border-white/5 bg-black/60">
                                      <div className="flex gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                                      </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <pre className="text-[10px] md:text-[11px] font-mono p-3 pt-8 bg-[#0d1117] text-[#c9d1d9] max-h-60 min-w-0">
                                        <code>{r.content}</code>
                                      </pre>
                                    </div>
                                  </div>
                                  <div className={`flex items-center justify-between mt-2 px-1 text-[9px] font-mono ${textMuted}`}>
                                    <span>Contributor: <strong className={textSecondary}>{r.creatorName || "Anonymous"}</strong></span>
                                    {r.createdAt && (
                                      <span>Shared: {new Date(r.createdAt).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                          </AnimatePresence>
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
            className={`fixed bottom-6 right-4 md:right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl text-xs font-bold max-w-[calc(100vw-2rem)] ${
              toast.type === "success"
                ? (dk ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-800")
                : (dk ? "bg-red-950/20 border-red-500/30 text-red-400" : "bg-rose-50 border-rose-200 text-rose-800")
            }`}
          >
            {toast.type === "success" ? <CheckCircle size={14} className={dk ? "" : "text-emerald-600"} /> : <AlertCircle size={14} className={dk ? "" : "text-rose-600"} />}
            <span className="truncate">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD RESOURCE MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
              className={`relative w-full sm:max-w-2xl p-1.5 rounded-t-[32px] sm:rounded-[32px] border ${borderLight} ${dk ? 'bg-black' : 'bg-white'} shadow-2xl z-10`}
            >
              <div className={`p-6 rounded-t-[28px] sm:rounded-[28px] ${dk ? "bg-[#050505]" : "bg-white"} max-h-[85vh] overflow-y-auto space-y-4 pb-12 sm:pb-6`}>
                <div className={`flex justify-between items-center pb-2 border-b ${borderLight}`}>
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#0077C0]">Add Hub Resource</h3>
                  <button onClick={() => setShowAddModal(false)} className={`p-1 rounded hover:bg-white/5 border ${borderLight}`}>
                    <X size={14} />
                  </button>
                </div>

                <form onSubmit={handleAddResource} className="space-y-4">
                  {/* Title and Language Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={resType === "code" ? "md:col-span-2 space-y-1" : "md:col-span-3 space-y-1"}>
                      <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>Resource Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Docker Compose File"
                        value={resTitle}
                        onChange={(e) => setResTitle(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3.5 h-[38px] border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                      />
                    </div>

                    {resType === "code" && (
                      <div className="md:col-span-1 space-y-1">
                        <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>Language</label>
                        <select
                          value={resLanguage}
                          onChange={(e) => setResLanguage(e.target.value)}
                          className={`w-full text-xs rounded-xl px-3.5 h-[38px] border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg} cursor-pointer`}
                        >
                          <option value="">Select Language</option>
                          {sortedLanguages.map(lang => (
                            <option key={lang.id} value={lang.id}>{lang.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {allowedFormats.length > 1 && (
                    <div className="space-y-1">
                      <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>Resource Type</label>
                      <select
                        value={resType}
                        onChange={(e) => setResType(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3.5 h-[38px] border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg} cursor-pointer`}
                      >
                        {allowedFormats.includes("code") && <option value="code">Code / Script</option>}
                        {allowedFormats.includes("link") && <option value="link">Link / URL</option>}
                        {allowedFormats.includes("text") && <option value="text">Rich Text</option>}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>
                        {resType === "code" ? "Comments (Optional)" : "Description"}
                      </label>
                      <input
                        type="text"
                        placeholder={resType === "code" ? "e.g. Added error handling helper" : "Short description"}
                        value={resDescription}
                        onChange={(e) => setResDescription(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>Tags (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. docker, compose, web"
                        value={resTags}
                        onChange={(e) => setResTags(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>Content</label>
                    <textarea
                      required
                      rows={8}
                      placeholder={resType === "code" ? "Paste your source code here..." : "Paste your configuration code, link, or text..."}
                      value={resContent}
                      onChange={(e) => setResContent(e.target.value)}
                      className={`w-full text-xs font-mono rounded-xl p-3.5 border focus:outline-none ${dk ? 'bg-[#09090b]' : 'bg-white'} ${borderLight} ${textPrimary} focus:border-[#0077C0] focus:ring-1 focus:ring-[#0077C0]/20 resize-y`}
                    />
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className={`px-4 py-2.5 rounded-xl border ${borderLight} bg-transparent hover:bg-black/5 dark:hover:bg-white/5 ${dk ? 'text-zinc-300' : 'text-zinc-700'} font-semibold text-xs transition-all duration-300 cursor-pointer`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={publishing}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-white font-bold text-xs bg-[#0077C0] hover:bg-[#0082D2] disabled:opacity-50 active:scale-[0.98] shadow-md transition-all cursor-pointer"
                    >
                      {publishing ? "Publishing..." : "Add to Hub"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD TOPIC MODAL */}
      <AnimatePresence>
        {showAddTopicModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
              className={`relative w-full sm:max-w-xl p-6 rounded-t-[28px] sm:rounded-[28px] border ${borderLight} ${dk ? 'bg-[#09090b]' : 'bg-white'} shadow-2xl z-10`}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-base font-black tracking-tight ${textPrimary} font-outfit uppercase`}>
                  Create Topic
                </h3>
                <button
                  onClick={() => setShowAddTopicModal(false)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl border ${borderLight} hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateTopic} className="space-y-5">
                <div className="space-y-2">
                  <label className={`text-[9px] uppercase font-black tracking-widest ${textSecondary}`}>
                    Topic Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={topicDate}
                      onChange={(e) => setTopicDate(e.target.value)}
                      className={`w-full text-xs rounded-2xl px-4 py-3.5 border ${borderLight} ${inputBg} outline-none`}
                    />
                  </div>
                </div>

                {/* Optional Title */}
                <div className="space-y-2">
                  <label className={`text-[9px] uppercase font-black tracking-widest ${textSecondary}`}>
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Morning Batch"
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                    className={`w-full text-xs rounded-2xl px-4 py-3.5 border ${borderLight} ${inputBg} placeholder-zinc-500 outline-none`}
                  />
                </div>

                {/* Description */}
                <input type="hidden" value={topicDescription} />

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-[#0077C0] hover:bg-[#008be0] active:scale-[0.99] text-white font-bold py-3.5 rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  <Check size={14} strokeWidth={3} />
                  Create Topic
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT RESOURCE MODAL */}
      <AnimatePresence>
        {showEditModal && editingResource && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
              className={`relative w-full sm:max-w-2xl p-1.5 rounded-t-[32px] sm:rounded-[32px] border ${borderLight} ${dk ? 'bg-black' : 'bg-white'} shadow-2xl z-10`}
            >
              <div className={`p-6 rounded-t-[28px] sm:rounded-[28px] ${dk ? "bg-[#050505]" : "bg-white"} max-h-[85vh] overflow-y-auto space-y-4 pb-12 sm:pb-6`}>
                <div className={`flex justify-between items-center pb-2 border-b ${borderLight}`}>
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#0077C0]">Edit Hub Resource</h3>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingResource(null);
                    }}
                    className={`p-1 rounded hover:bg-white/5 border ${borderLight}`}
                  >
                    <X size={14} />
                  </button>
                </div>

                <form onSubmit={handleUpdateResource} className="space-y-4">
                  {/* Title and Language Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={editType === "code" ? "md:col-span-2 space-y-1" : "md:col-span-3 space-y-1"}>
                      <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>Resource Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Docker Compose File"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3.5 h-[38px] border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                      />
                    </div>

                    {editType === "code" && (
                      <div className="md:col-span-1 space-y-1">
                        <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>Language</label>
                        <select
                          value={editLanguage}
                          onChange={(e) => setEditLanguage(e.target.value)}
                          className={`w-full text-xs rounded-xl px-3.5 h-[38px] border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg} cursor-pointer`}
                        >
                          <option value="">Select Language</option>
                          {sortedLanguages.map(lang => (
                            <option key={lang.id} value={lang.id}>{lang.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {allowedFormats.length > 1 && (
                    <div className="space-y-1">
                      <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>Resource Type</label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3.5 h-[38px] border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg} cursor-pointer`}
                      >
                        {allowedFormats.includes("code") && <option value="code">Code / Script</option>}
                        {allowedFormats.includes("link") && <option value="link">Link / URL</option>}
                        {allowedFormats.includes("text") && <option value="text">Rich Text</option>}
                      </select>
                    </div>
                  )}

                  {/* Collection and Reason for Edit Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedHub?.subCategories && selectedHub.subCategories.length > 0 ? (
                      <div className="space-y-1">
                        <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>Collection</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className={`w-full text-xs rounded-xl px-3.5 h-[38px] border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg} cursor-pointer`}
                        >
                          <option value="">-- Select Collection (Optional) --</option>
                          {selectedHub.subCategories.map((cat: string) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="hidden md:block" />
                    )}

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold tracking-wider text-red-500 font-extrabold">Reason for Edit (Required)</label>
                      <select
                        required
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3.5 h-[38px] border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg} cursor-pointer`}
                      >
                        <option value="">Select a reason...</option>
                        <option value="Optimized code">Optimized code</option>
                        <option value="Error solved">Error solved</option>
                        <option value="All test cases passed">All test cases passed</option>
                        <option value="More test cases passed than previous one">More test cases passed than previous one</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>
                        {editType === "code" ? "Comments (Optional)" : "Description"}
                      </label>
                      <input
                        type="text"
                        placeholder={editType === "code" ? "Optional comments" : "Short description"}
                        value={resDescription}
                        onChange={(e) => setResDescription(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>Tags (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. docker, compose, web"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[9px] uppercase font-bold tracking-wider ${textSecondary}`}>Content</label>
                    <textarea
                      required
                      rows={8}
                      placeholder={editType === "code" ? "Paste your source code here..." : "Paste your configuration code, link, or text..."}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className={`w-full text-xs font-mono rounded-xl p-3.5 border focus:outline-none ${dk ? 'bg-[#09090b]' : 'bg-white'} ${borderLight} ${textPrimary} focus:border-[#0077C0] focus:ring-1 focus:ring-[#0077C0]/20 resize-y`}
                    />
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingResource(null);
                      }}
                      className={`px-4 py-2.5 rounded-xl border ${borderLight} bg-transparent hover:bg-black/5 dark:hover:bg-white/5 ${dk ? 'text-zinc-300' : 'text-zinc-700'} font-semibold text-xs transition-all duration-300 cursor-pointer`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={publishing}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-white font-bold text-xs bg-[#0077C0] hover:bg-[#0082D2] disabled:opacity-50 active:scale-[0.98] shadow-md transition-all cursor-pointer"
                    >
                      {publishing ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Copy, 
  Check, 
  Plus, 
  Users, 
  Lock, 
  Unlock, 
  Clock, 
  ArrowLeft, 
  Sun, 
  Moon, 
  LogOut, 
  Clipboard,
  Sparkles,
  RefreshCw
} from "lucide-react";
import Link from "next/link";

interface ClipboardRoom {
  code: string;
  expiresAt: string;
  durationMins: number;
  allowAllMembersToAdd: boolean;
  hostSessionId: string;
}

interface ClipboardItem {
  id: string;
  roomCode: string;
  title: string;
  content: string;
  createdAt?: string;
}

export default function ClipboardPage() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const dk = theme === "dark";

  const cardBg = dk ? "bg-[#050505]" : "bg-[#EDEAE0]";
  const borderLight = dk ? "border-white/10" : "border-black/10";
  const clayBg = dk ? "clay-dark" : "clay-light";
  const textPrimary = dk ? "text-white" : "text-gray-900";
  const textSecondary = dk ? "text-[#A0AEC0]" : "text-gray-600";

  // Session ID for host checking
  const [sessionId, setSessionId] = useState("");

  // Navigation / State
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState<ClipboardRoom | null>(null);
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Create Room States
  const [durationMins, setDurationMins] = useState(60);
  const [allowAllMembers, setAllowAllMembers] = useState(true);

  // Add Item States
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  // Copy states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  // Expiration countdown
  const [timeLeft, setTimeLeft] = useState("");

  // Initialize Session ID
  useEffect(() => {
    let storedSessionId = localStorage.getItem("glidepass_clipboard_session_id");
    if (!storedSessionId) {
      storedSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("glidepass_clipboard_session_id", storedSessionId);
    }
    setSessionId(storedSessionId);

    // Read room code from URL hash if present
    const hash = window.location.hash.replace("#", "");
    if (hash && hash.length === 6) {
      joinRoom(hash);
    }
  }, []);

  // Poll for new clipboard items when inside a room
  useEffect(() => {
    if (!currentRoom) return;

    // Initial fetch
    fetchRoomDetails(currentRoom.code);

    const interval = setInterval(() => {
      fetchRoomDetails(currentRoom.code, true);
    }, 4000);

    return () => clearInterval(interval);
  }, [currentRoom?.code]);

  // Countdown timer effect
  useEffect(() => {
    if (!currentRoom) return;

    const updateTimer = () => {
      const difference = new Date(currentRoom.expiresAt).getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft("Expired");
        handleLeaveRoom();
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(" "));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentRoom]);

  const fetchRoomDetails = async (code: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clipboard?code=${code}`);
      const data = await res.json();
      if (data.success) {
        setCurrentRoom(data.room);
        setItems(data.items || []);
        // Update URL hash
        window.location.hash = code;
      } else {
        setError(data.error || "Failed to load room");
        if (!isSilent) handleLeaveRoom();
      }
    } catch (e: any) {
      console.error(e);
      if (!isSilent) setError("Connection error. Please try again.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          durationMins,
          allowAllMembersToAdd: allowAllMembers,
          hostSessionId: sessionId
        })
      });
      const data = await res.json();
      if (data.success) {
        // Fetch new room details
        await fetchRoomDetails(data.code);
      } else {
        setError(data.error || "Failed to create room");
      }
    } catch (e: any) {
      console.error(e);
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (code: string) => {
    if (!code) return;
    await fetchRoomDetails(code);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    joinRoom(roomCodeInput.trim().toUpperCase());
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom || !newContent.trim()) return;

    setAddingItem(true);
    setError("");
    try {
      const res = await fetch("/api/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-item",
          roomCode: currentRoom.code,
          title: newTitle.trim() || "Untitled Item",
          content: newContent,
          sessionId
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewTitle("");
        setNewContent("");
        // Reload items list
        fetchRoomDetails(currentRoom.code);
      } else {
        setError(data.error || "Failed to add item");
      }
    } catch (e: any) {
      console.error(e);
      setError("Failed to save clipboard item.");
    } finally {
      setAddingItem(false);
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setItems([]);
    window.location.hash = "";
  };

  const copyRoomCode = () => {
    if (!currentRoom) return;
    const url = `${window.location.origin}/clipboard#${currentRoom.code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyItemContent = (itemId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemId(itemId);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  const isHost = currentRoom && currentRoom.hostSessionId === sessionId;
  const canAddItems = currentRoom && (currentRoom.allowAllMembersToAdd || isHost);

  return (
    <div className={`h-[100dvh] flex flex-col ${cardBg} ${textPrimary} font-sans antialiased relative overflow-hidden transition-colors duration-200`}>
      {/* Decorative glow */}
      {dk && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0,transparent_60%)] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.05)_0,transparent_60%)] pointer-events-none" />
        </>
      )}

      {/* ── NAV ── */}
      <header className={`shrink-0 border-b ${borderLight} backdrop-blur-md z-50 ${dk ? "bg-[#050505]/80" : "bg-[#EDEAE0]/80"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className={`flex items-center gap-1.5 text-[10px] font-bold ${textSecondary} hover:text-indigo-500 transition-colors`}>
              <ArrowLeft size={13} /> Home
            </Link>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dk ? "border-indigo-400/20 bg-indigo-400/5 text-indigo-400" : "border-indigo-600/20 bg-indigo-600/5 text-indigo-600"}`}>
              Temporary Clipboard
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

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 z-10">
        <div className="max-w-4xl mx-auto h-full flex flex-col justify-start">
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-between"
            >
              <span>{error}</span>
              <button onClick={() => setError("")} className="font-bold hover:underline">Dismiss</button>
            </motion.div>
          )}

          {!currentRoom ? (
            /* ──────── DASHBOARD: CREATE OR JOIN ──────── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto max-w-3xl w-full mx-auto pb-10">
              
              {/* Join Room */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-6 rounded-[28px] border ${borderLight} ${clayBg} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Clipboard size={18} />
                    </div>
                    <h2 className="text-lg font-bold font-outfit">Join Room</h2>
                  </div>
                  <p className={`text-xs ${textSecondary} mb-6 leading-relaxed`}>
                    Enter a 6-character room code to join an active online clipboard. Access shared snippets instantly.
                  </p>

                  <form onSubmit={handleJoinSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold mb-2">Room Code</label>
                      <input 
                        type="text" 
                        placeholder="e.g. AB12CD"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        maxLength={6}
                        className={`w-full px-4 py-3 rounded-2xl border ${borderLight} bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase font-mono tracking-widest text-center text-lg`}
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading || !roomCodeInput.trim()}
                      className="w-full py-3 rounded-2xl font-bold text-xs bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      {loading ? "Joining..." : "Join Clipboard"}
                    </button>
                  </form>
                </div>
              </motion.div>

              {/* Create Room */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-6 rounded-[28px] border ${borderLight} ${clayBg} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <Sparkles size={18} />
                    </div>
                    <h2 className="text-lg font-bold font-outfit">Create Temporary Room</h2>
                  </div>
                  <p className={`text-xs ${textSecondary} mb-6 leading-relaxed`}>
                    Instantly provision a private, time-based web clipboard. Share text or code across devices without signing in.
                  </p>

                  <form onSubmit={handleCreateRoom} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold mb-2">Expiration Duration</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "30 Mins", value: 30 },
                          { label: "1 Hour", value: 60 },
                          { label: "2 Hours", value: 120 }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setDurationMins(opt.value)}
                            className={`py-2 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                              durationMins === opt.value
                                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500"
                                : `${borderLight} bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10`
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold mb-2">Write Permission</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAllowAllMembers(true)}
                          className={`py-2 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            allowAllMembers
                              ? "bg-indigo-500/10 text-indigo-500 border-indigo-500"
                              : `${borderLight} bg-black/5 dark:bg-white/5 hover:bg-black/10`
                          }`}
                        >
                          <Users size={12} /> Everyone Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllowAllMembers(false)}
                          className={`py-2 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            !allowAllMembers
                              ? "bg-indigo-500/10 text-indigo-500 border-indigo-500"
                              : `${borderLight} bg-black/5 dark:bg-white/5 hover:bg-black/10`
                          }`}
                        >
                          <Lock size={12} /> Host Only
                        </button>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-2xl font-bold text-xs bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? "Generating..." : "Generate Room"}
                    </button>
                  </form>
                </div>
              </motion.div>

            </div>
          ) : (
            /* ──────── INSIDE ACTIVE ROOM ──────── */
            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
              
              {/* Sidebar Info & Controls */}
              <div className="w-full md:w-80 shrink-0 space-y-4">
                <div className={`p-5 rounded-[24px] border ${borderLight} ${clayBg} space-y-4`}>
                  
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">Active Clipboard</div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black font-mono tracking-wider">{currentRoom.code}</h2>
                      <button 
                        onClick={copyRoomCode}
                        className={`p-1.5 rounded-lg border ${borderLight} hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer`}
                        title="Copy Share Link"
                      >
                        {copiedCode ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-black/10 dark:bg-white/10" />

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className={`text-[10px] font-bold ${textSecondary} uppercase`}>Expires In</div>
                      <div className="font-bold flex items-center gap-1 mt-0.5">
                        <Clock size={12} className="text-amber-500" />
                        {timeLeft}
                      </div>
                    </div>
                    <div>
                      <div className={`text-[10px] font-bold ${textSecondary} uppercase`}>Your Role</div>
                      <div className="font-bold mt-0.5">{isHost ? "Room Host 👑" : "Member"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <div className={`text-[10px] font-bold ${textSecondary} uppercase`}>Permissions</div>
                      <div className="font-bold flex items-center gap-1 mt-0.5">
                        {currentRoom.allowAllMembersToAdd ? (
                          <>
                            <Unlock size={12} className="text-emerald-500" />
                            <span>Everyone can add items</span>
                          </>
                        ) : (
                          <>
                            <Lock size={12} className="text-rose-500" />
                            <span>Only host can add items</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={handleLeaveRoom}
                      className="w-full py-2.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <LogOut size={13} />
                      Leave Room
                    </button>
                  </div>

                </div>

                {/* Add Item Form (Visible if allowed) */}
                {canAddItems ? (
                  <div className={`p-5 rounded-[24px] border ${borderLight} ${clayBg} space-y-4`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Add to Clipboard</div>
                    
                    <form onSubmit={handleAddItem} className="space-y-3">
                      <div>
                        <input 
                          type="text" 
                          placeholder="Title (e.g. Terminal Command)" 
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className={`w-full px-3 py-2 text-xs rounded-xl border ${borderLight} bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                        />
                      </div>
                      <div>
                        <textarea 
                          rows={4}
                          placeholder="Paste content here..." 
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          required
                          className={`w-full px-3 py-2 text-xs rounded-xl border ${borderLight} bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono`}
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={addingItem || !newContent.trim()}
                        className="w-full py-2 rounded-xl bg-indigo-500 text-white font-bold text-xs hover:bg-indigo-600 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Plus size={14} />
                        {addingItem ? "Adding..." : "Add Item"}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className={`p-4 rounded-[20px] border border-amber-500/20 bg-amber-500/5 text-amber-500 text-xs flex items-center gap-2`}>
                    <Lock size={14} />
                    <span>Only the room host can add new clipboard items.</span>
                  </div>
                )}
              </div>

              {/* Items Feed */}
              <div className="flex-1 flex flex-col min-h-0 min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    Clipboard Feed ({items.length})
                    <button 
                      onClick={() => fetchRoomDetails(currentRoom.code)}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer"
                      title="Reload feed"
                    >
                      <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                  <AnimatePresence initial={false}>
                    {items.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`h-40 rounded-2xl border ${borderLight} border-dashed flex flex-col items-center justify-center gap-2 text-xs ${textSecondary}`}
                      >
                        <Clipboard size={20} className="stroke-[1.5]" />
                        <span>This room's clipboard is empty.</span>
                      </motion.div>
                    ) : (
                      items.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`p-4 rounded-2xl border ${borderLight} ${clayBg} group relative flex flex-col justify-between`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <h3 className="text-xs font-bold text-indigo-500 font-outfit uppercase tracking-wider">{item.title}</h3>
                              <button
                                onClick={() => copyItemContent(item.id, item.content)}
                                className={`p-1.5 rounded-lg border ${borderLight} bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:border-indigo-500/50 transition-all cursor-pointer shrink-0`}
                                title="Copy Content"
                              >
                                {copiedItemId === item.id ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <Copy size={12} className="text-gray-400 hover:text-white" />
                                )}
                              </button>
                            </div>
                            <pre className="text-xs font-mono bg-black/20 dark:bg-black/40 border border-white/5 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap break-all max-h-64 scrollbar-none select-all text-gray-300">
                              {item.content}
                            </pre>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}

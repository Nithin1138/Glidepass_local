"use client";

import React, { useState, useEffect } from "react";
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

  const cardBg = dk ? "bg-[#08080c]" : "bg-[#EDEAE0]";
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
    <div className={`min-h-screen flex flex-col ${cardBg} ${textPrimary} font-sans antialiased relative overflow-x-hidden transition-colors duration-200`}>
      {/* Mesh gradients matching landing page */}
      {dk && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(242,133,0,0.08)_0,transparent_60%)]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(70,143,234,0.06)_0,transparent_60%)]" />
        </div>
      )}

      {/* ── NAV ── */}
      <header className={`shrink-0 border-b ${borderLight} backdrop-blur-md z-50 ${dk ? "bg-[#08080c]/85" : "bg-[#EDEAE0]/85"} sticky top-0`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className={`flex items-center gap-1.5 text-[10px] font-bold ${textSecondary} hover:text-[#468FEA] transition-colors`}>
              <ArrowLeft size={13} /> Home
            </Link>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dk ? "border-[#468FEA]/20 bg-[#468FEA]/5 text-[#468FEA]" : "border-[#468FEA]/30 bg-[#468FEA]/5 text-[#468FEA]"}`}>
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
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 z-10 flex flex-col justify-start">
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError("")} className="font-bold hover:underline">Dismiss</button>
          </motion.div>
        )}

        {!currentRoom ? (
          /* ──────── DASHBOARD: CREATE OR JOIN ──────── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full py-4 md:py-8 my-auto">
            
            {/* Join Room */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 md:p-8 rounded-[32px] border ${borderLight} ${clayBg} flex flex-col justify-between shadow-xl`}
            >
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2.5 rounded-xl bg-[#468FEA]/10 text-[#468FEA]">
                    <Clipboard size={20} />
                  </div>
                  <h2 className="text-xl font-bold font-outfit">Join Room</h2>
                </div>
                <p className={`text-xs ${textSecondary} mb-8 leading-relaxed`}>
                  Enter a 6-character room code to join an active online clipboard. Access shared snippets instantly.
                </p>

                <form onSubmit={handleJoinSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold mb-2 text-[#468FEA]">Room Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. AB12CD"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      maxLength={6}
                      className={`w-full px-4 py-3 rounded-2xl border ${borderLight} bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-[#468FEA] uppercase font-mono tracking-widest text-center text-lg`}
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={loading || !roomCodeInput.trim()}
                    className="w-full py-3.5 rounded-2xl font-bold text-xs bg-[#468FEA] text-white hover:bg-[#3b7dc9] transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {loading ? "Joining..." : "Join Clipboard"}
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Create Room */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 md:p-8 rounded-[32px] border ${borderLight} ${clayBg} flex flex-col justify-between shadow-xl`}
            >
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2.5 rounded-xl bg-[#F28500]/10 text-[#F28500]">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="text-xl font-bold font-outfit">Create Temporary Room</h2>
                </div>
                <p className={`text-xs ${textSecondary} mb-8 leading-relaxed`}>
                  Instantly provision a private, time-based web clipboard. Share text or code across devices without signing in.
                </p>

                <form onSubmit={handleCreateRoom} className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold mb-2 text-[#F28500]">Expiration Duration</label>
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
                              ? "bg-[#F28500]/10 text-[#F28500] border-[#F28500]"
                              : `${borderLight} bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10`
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold mb-2 text-[#F28500]">Write Permission</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAllowAllMembers(true)}
                        className={`py-2 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          allowAllMembers
                            ? "bg-[#F28500]/10 text-[#F28500] border-[#F28500]"
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
                            ? "bg-[#F28500]/10 text-[#F28500] border-[#F28500]"
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
                    className="w-full py-3.5 rounded-2xl font-bold text-xs bg-[#F28500] text-white hover:bg-[#d97700] transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Generating..." : "Generate Room"}
                  </button>
                </form>
              </div>
            </motion.div>

          </div>
        ) : (
          /* ──────── INSIDE ACTIVE ROOM ──────── */
          <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 w-full min-h-0">
            
            {/* Sidebar Info & Controls */}
            <div className="w-full lg:w-80 shrink-0 space-y-4 lg:sticky lg:top-20 h-fit">
              <div className={`p-6 rounded-[28px] border ${borderLight} ${clayBg} space-y-5 shadow-lg`}>
                
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#F28500] mb-1.5">Active Clipboard</div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black font-mono tracking-wider">{currentRoom.code}</h2>
                    <button 
                      onClick={copyRoomCode}
                      className={`p-2 rounded-xl border ${borderLight} hover:bg-black/5 dark:hover:bg-white/5 hover:border-[#468FEA] transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-bold`}
                      title="Copy Share Link"
                    >
                      {copiedCode ? (
                        <>
                          <Check size={12} className="text-emerald-500" />
                          <span className="text-emerald-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} className="text-gray-400" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="h-px bg-black/10 dark:bg-white/10" />

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className={`text-[10px] font-bold ${textSecondary} uppercase`}>Expires In</div>
                    <div className="font-bold flex items-center gap-1 mt-1 text-[#F28500]">
                      <Clock size={12} />
                      {timeLeft}
                    </div>
                  </div>
                  <div>
                    <div className={`text-[10px] font-bold ${textSecondary} uppercase`}>Your Role</div>
                    <div className="font-bold mt-1">{isHost ? "Room Host 👑" : "Member"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div>
                    <div className={`text-[10px] font-bold ${textSecondary} uppercase`}>Permissions</div>
                    <div className="font-bold flex items-center gap-1.5 mt-1">
                      {currentRoom.allowAllMembersToAdd ? (
                        <>
                          <Unlock size={12} className="text-emerald-500" />
                          <span className="text-emerald-500">Everyone can add items</span>
                        </>
                      ) : (
                        <>
                          <Lock size={12} className="text-[#F28500]" />
                          <span className="text-[#F28500]">Only host can add items</span>
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
                <div className={`p-6 rounded-[28px] border ${borderLight} ${clayBg} space-y-4 shadow-lg`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#468FEA]">Add to Clipboard</div>
                  
                  <form onSubmit={handleAddItem} className="space-y-4">
                    <div>
                      <input 
                        type="text" 
                        placeholder="Title (e.g. Command, Draft)" 
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className={`w-full px-3 py-2.5 text-xs rounded-xl border ${borderLight} bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-[#468FEA]`}
                      />
                    </div>
                    <div>
                      <textarea 
                        rows={5}
                        placeholder="Paste content here..." 
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        required
                        className={`w-full px-3 py-2.5 text-xs rounded-xl border ${borderLight} bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-[#468FEA] font-mono`}
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={addingItem || !newContent.trim()}
                      className="w-full py-2.5 rounded-xl bg-[#468FEA] text-white font-bold text-xs hover:bg-[#3b7dc9] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Plus size={14} />
                      {addingItem ? "Adding..." : "Add Item"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className={`p-4 rounded-[20px] border border-[#F28500]/20 bg-[#F28500]/5 text-[#F28500] text-xs flex items-center gap-2`}>
                  <Lock size={14} />
                  <span>Only the room host can add new clipboard items.</span>
                </div>
              )}
            </div>

            {/* Items Feed - Spans full remaining page width */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2 select-none">
                  Clipboard Feed ({items.length})
                  <button 
                    onClick={() => fetchRoomDetails(currentRoom.code)}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer"
                    title="Reload feed"
                  >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin pb-10">
                <AnimatePresence initial={false}>
                  {items.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`h-60 rounded-3xl border ${borderLight} border-dashed flex flex-col items-center justify-center gap-3 text-xs ${textSecondary}`}
                    >
                      <Clipboard size={24} className="stroke-[1.5] text-[#F28500]/40" />
                      <span>This room's clipboard is empty.</span>
                    </motion.div>
                  ) : (
                    items.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-5 rounded-[28px] border ${borderLight} ${clayBg} group relative flex flex-col justify-between shadow-md hover:shadow-lg transition-all`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <h3 className="text-xs font-black text-[#F28500] font-outfit uppercase tracking-wider">{item.title}</h3>
                            <button
                              onClick={() => copyItemContent(item.id, item.content)}
                              className={`px-3 py-1.5 rounded-xl border ${borderLight} bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:border-[#468FEA] transition-all cursor-pointer shrink-0 flex items-center gap-1.5 text-[10px] font-bold`}
                              title="Copy Content"
                            >
                              {copiedItemId === item.id ? (
                                <>
                                  <Check size={12} className="text-emerald-500" />
                                  <span className="text-emerald-500">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} className="text-gray-400 group-hover:text-white" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="text-xs font-mono bg-black/25 dark:bg-black/45 border border-white/5 p-4 rounded-2xl overflow-x-auto whitespace-pre-wrap break-all max-h-96 scrollbar-none select-all text-gray-300">
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

      </main>
    </div>
  );
}

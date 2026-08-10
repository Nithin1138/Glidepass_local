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
  RefreshCw,
  Trash2,
  FileText,
  File,
  Image as ImageIcon,
  Archive,
  Download,
  UploadCloud,
  X,
  FileSpreadsheet,
  FileCode,
  Search,
  Pen,
  Edit3,
  Send,
  Bot,
  User,
  RotateCcw
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
  content: string; // Plain text or JSON string for files: { isFile: true, fileName: string, fileType: string, fileSize: number, data: string }
  creatorSessionId?: string;
  createdAt?: string;
}

function FormattedMarkdown({ content, dk }: { content: string; dk: boolean }) {
  const parseInlineMarkdown = (text: string) => {
    const tokens = [];
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let lastIdx = 0;
    let m;

    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIdx) {
        tokens.push(text.substring(lastIdx, m.index));
      }
      const val = m[0];
      if (val.startsWith('**') && val.endsWith('**')) {
        tokens.push(
          <strong key={m.index} className={`font-extrabold ${dk ? "text-purple-300" : "text-purple-950 font-bold"}`}>
            {val.slice(2, -2)}
          </strong>
        );
      } else if (val.startsWith('`') && val.endsWith('`')) {
        tokens.push(
          <code key={m.index} className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${dk ? "bg-white/10 text-emerald-300" : "bg-purple-100 text-purple-900"}`}>
            {val.slice(1, -1)}
          </code>
        );
      }
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < text.length) {
      tokens.push(text.substring(lastIdx));
    }
    return tokens;
  };

  const renderFormattedText = (rawText: string) => {
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: rawText.substring(lastIndex, match.index) });
      }
      parts.push({ type: 'codeblock', value: match[1].trim() });
      lastIndex = codeBlockRegex.lastIndex;
    }
    if (lastIndex < rawText.length) {
      parts.push({ type: 'text', value: rawText.substring(lastIndex) });
    }

    return parts.map((part, pIdx) => {
      if (part.type === 'codeblock') {
        return (
          <div key={pIdx} className={`my-2.5 p-3 rounded-xl font-mono text-xs overflow-x-auto border ${dk ? "bg-black/70 border-white/10 text-emerald-400" : "bg-slate-900 border-slate-800 text-emerald-300 shadow-inner"}`}>
            <pre><code>{part.value}</code></pre>
          </div>
        );
      }

      const lines = part.value.split('\n');
      return (
        <div key={pIdx} className="space-y-2">
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lIdx} className="h-1" />;

            if (/^#{1,3}\s+/.test(trimmed)) {
              const headingText = trimmed.replace(/^#{1,3}\s+/, '');
              return (
                <h4 key={lIdx} className={`font-bold text-sm md:text-base mt-3 mb-1 tracking-wide ${dk ? "text-purple-300 border-b border-purple-500/20 pb-1" : "text-purple-900 border-b border-purple-200 pb-1"}`}>
                  {parseInlineMarkdown(headingText)}
                </h4>
              );
            }

            if (/^[-*•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
              const listText = trimmed.replace(/^([-*•]|\d+\.)\s+/, '');
              return (
                <div key={lIdx} className="flex items-start gap-2.5 pl-1 my-1">
                  <span className="text-purple-500 font-bold shrink-0 mt-0.5">•</span>
                  <div className="flex-1 leading-relaxed">{parseInlineMarkdown(listText)}</div>
                </div>
              );
            }

            return (
              <p key={lIdx} className="leading-relaxed">
                {parseInlineMarkdown(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return <div className="text-xs md:text-sm">{renderFormattedText(content)}</div>;
}

export default function ClipboardPage() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("glidepass_theme") as "dark" | "light";
      return savedTheme || "light";
    }
    return "light";
  });
  const dk = theme === "dark";

  const cardBg = dk ? "bg-[#0d0d14]" : "bg-[#EDEAE0]";
  const borderLight = dk ? "border-white/10" : "border-black/10";
  const clayBg = dk ? "clay-dark" : "clay-light";
  const cardDark = dk ? "bg-[#111118] border-white/8" : "";
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
  const [uploadMode, setUploadMode] = useState<"text" | "file">("text");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // File Upload States
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy/Expand states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [editingContentItemId, setEditingContentItemId] = useState<string | null>(null);
  const [editContentInput, setEditContentInput] = useState("");

  // AI Interactive Chat States
  interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
  }
  const [activeAiItemId, setActiveAiItemId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Expiration countdown
  const [timeLeft, setTimeLeft] = useState("");

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "text" | "image" | "file">("all");
  const [activeUsers, setActiveUsers] = useState(1);
  const [hasExtended, setHasExtended] = useState(false);
  const [isInitializingRoom, setIsInitializingRoom] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash.length === 6) return true;
      // Fallback: check if we have a persisted active room in local storage
      const savedRoom = localStorage.getItem("glidepass_active_room_code");
      if (savedRoom && savedRoom.length === 6) return true;
    }
    return false;
  });

  // Recent Rooms States
  interface RecentRoom {
    code: string;
    expiresAt: string;
  }
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);

  const saveRecentRoom = (code: string, expiresAt: string) => {
    try {
      const stored = localStorage.getItem("glidepass_recent_rooms");
      let list: RecentRoom[] = stored ? JSON.parse(stored) : [];
      list = list.filter(r => r.code !== code);
      list.unshift({ code, expiresAt });
      list = list.slice(0, 8); // Keep last 8 rooms
      localStorage.setItem("glidepass_recent_rooms", JSON.stringify(list));
      setRecentRooms(list);
    } catch (e) {}
  };

  // Sync theme changes to localStorage
  useEffect(() => {
    localStorage.setItem("glidepass_theme", theme);
  }, [theme]);

  // Initialize Session ID and Theme
  useEffect(() => {
    let storedSessionId = localStorage.getItem("glidepass_clipboard_session_id");
    if (!storedSessionId) {
      storedSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("glidepass_clipboard_session_id", storedSessionId);
    }
    setSessionId(storedSessionId);


    // Load recent rooms
    try {
      const storedRecent = localStorage.getItem("glidepass_recent_rooms");
      if (storedRecent) {
        setRecentRooms(JSON.parse(storedRecent));
      }
    } catch (e) {}

    // Read room code from URL hash if present
    const hash = window.location.hash.replace("#", "");
    if (hash && hash.length === 6) {
      joinRoom(hash);
    } else {
      // Fallback: check if there's a saved active room code in localStorage
      const savedRoom = localStorage.getItem("glidepass_active_room_code");
      if (savedRoom && savedRoom.length === 6) {
        joinRoom(savedRoom);
      } else {
        setIsInitializingRoom(false);
      }
    }
  }, []);

  // Synchronize hasExtended state when entering/updating room
  useEffect(() => {
    if (currentRoom) {
      setHasExtended(localStorage.getItem(`extended_${currentRoom.code}`) === "true");
    }
  }, [currentRoom?.code]);

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

  // Listen to clipboard paste events for quick file upload
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!currentRoom || !canAddItems) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            setUploadMode("file");
            stageFiles([file]);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [currentRoom, sessionId, currentRoom?.allowAllMembersToAdd]);

  const fetchRoomDetails = async (code: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clipboard?code=${code}&sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setCurrentRoom(data.room);
        setItems(data.items || []);
        if (data.activeUsersCount !== undefined) {
          setActiveUsers(data.activeUsersCount);
        }
        window.history.replaceState(null, "", `/clipboard#${code}`);
        localStorage.setItem("glidepass_active_room_code", code); // Save active room code
        saveRecentRoom(data.room.code, data.room.expiresAt);
      } else {
        setError(data.error || "Failed to load room");
        if (!isSilent) handleLeaveRoom();
      }
    } catch (e: any) {
      console.error(e);
      if (!isSilent) setError("Connection error. Please try again.");
    } finally {
      if (!isSilent) setLoading(false);
      setIsInitializingRoom(false);
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

  const toggleRoomPermissions = async () => {
    if (!currentRoom || !isHost) return;
    try {
      const nextVal = !currentRoom.allowAllMembersToAdd;
      const res = await fetch("/api/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-permissions",
          roomCode: currentRoom.code,
          allowAllMembersToAdd: nextVal,
          sessionId
        })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentRoom(prev => prev ? { ...prev, allowAllMembersToAdd: nextVal } : null);
      } else {
        setError(data.error || "Failed to update permissions");
      }
    } catch (e) {
      setError("Network error updating permissions");
    }
  };

  const extendRoomTime = async (minutes: number) => {
    if (!currentRoom || !isHost || hasExtended) return;
    try {
      const res = await fetch("/api/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extend-room",
          roomCode: currentRoom.code,
          minutes,
          sessionId
        })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentRoom(prev => prev ? { ...prev, expiresAt: data.expiresAt } : null);
        localStorage.setItem(`extended_${currentRoom.code}`, "true");
        setHasExtended(true);
      } else {
        setError(data.error || "Failed to extend room time");
      }
    } catch (e) {
      setError("Network error extending room time");
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    joinRoom(roomCodeInput.trim().toUpperCase());
  };

  // Convert staged files and stage them
  const stageFiles = (files: FileList | File[]) => {
    const limitBytes = 25 * 1024 * 1024;
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (file.size > limitBytes) {
        setError(`File "${file.name}" exceeds 25MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setStagedFiles(prev => [...prev, ...validFiles]);
      setError("");
      if (!newTitle) {
        setNewTitle(validFiles.length === 1 ? validFiles[0].name : `${validFiles.length} files staged`);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      stageFiles(e.target.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadMode("file");
      stageFiles(e.dataTransfer.files);
    }
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles(prev => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (updated.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return updated;
    });
  };

  const clearStagedFiles = () => {
    setStagedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Direct Clipboard Paste handler (Text, Images, Files)
  const handlePasteClipboard = async () => {
    try {
      setError("");
      if (navigator.clipboard && navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          const pastedFiles: File[] = [];
          let pastedText = "";

          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith("image/") || type.startsWith("application/")) {
                const blob = await item.getType(type);
                const ext = type.split("/")[1] || "png";
                const file = new window.File([blob], `clipboard_${Date.now()}.${ext}`, { type });
                pastedFiles.push(file);
              } else if (type === "text/plain") {
                const blob = await item.getType(type);
                pastedText = await blob.text();
              }
            }
          }

          if (pastedFiles.length > 0) {
            setUploadMode("file");
            stageFiles(pastedFiles);
            return;
          } else if (pastedText) {
            setUploadMode("text");
            setNewContent(pastedText);
            return;
          }
        } catch (clipErr) {
          // Fallback to readText if read() permission is denied
        }
      }

      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUploadMode("text");
          setNewContent(text);
          return;
        }
      }

      setError("No content found in clipboard or clipboard access denied.");
    } catch (err: any) {
      console.error(err);
      setError("Failed to read clipboard. You can paste using Ctrl+V.");
    }
  };

  const uploadSingleFile = (file: File, displayTitle: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const uploadId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const CHUNK_SIZE = 2 * 1024 * 1024;
      const totalSize = file.size;
      const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));
      let currentChunk = 0;

      const uploadNextChunk = () => {
        const start = currentChunk * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const chunk = file.slice(start, end);

        const queryParams = new URLSearchParams({
          roomCode: currentRoom!.code,
          title: displayTitle,
          sessionId: sessionId,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: totalSize.toString(),
          uploadId: uploadId,
          chunkIndex: currentChunk.toString(),
          totalChunks: totalChunks.toString()
        });

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/clipboard/upload?${queryParams.toString()}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const bytesDone = currentChunk * CHUNK_SIZE + event.loaded;
            setUploadProgress(Math.min(98, Math.round((bytesDone / totalSize) * 100)));
          }
        };

        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && data.success) {
              if (currentChunk < totalChunks - 1) {
                currentChunk++;
                uploadNextChunk();
              } else {
                setUploadProgress(100);
                resolve(true);
              }
            } else {
              setError(data.error || `Upload failed for ${file.name}`);
              resolve(false);
            }
          } catch (e) {
            setError(`Upload error for ${file.name}`);
            resolve(false);
          }
        };

        xhr.onerror = () => {
          setError(`Network error uploading ${file.name}`);
          resolve(false);
        };

        xhr.send(chunk);
      };

      uploadNextChunk();
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom) return;

    setAddingItem(true);
    setError("");

    let finalTitle = newTitle.trim();

    if (uploadMode === "text") {
      if (!newContent.trim()) {
        setAddingItem(false);
        return;
      }
      if (!finalTitle) finalTitle = "Text Snippet";

      try {
        const res = await fetch("/api/clipboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add-item",
            roomCode: currentRoom.code,
            title: finalTitle,
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
      } catch (err: any) {
        console.error(err);
        setError("Failed to save clipboard item: " + (err.message || "Unknown error"));
      } finally {
        setAddingItem(false);
      }
    } else {
      if (stagedFiles.length === 0) {
        setError("Please select, drop, or paste files to upload.");
        setAddingItem(false);
        return;
      }

      for (let i = 0; i < stagedFiles.length; i++) {
        const file = stagedFiles[i];
        const itemTitle = stagedFiles.length === 1 && finalTitle ? finalTitle : file.name;
        const success = await uploadSingleFile(file, itemTitle);
        if (!success) break;
      }

      setAddingItem(false);
      setUploadProgress(null);
      setNewTitle("");
      setNewContent("");
      clearStagedFiles();
      fetchRoomDetails(currentRoom.code);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!currentRoom) return;
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch("/api/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-item",
          itemId,
          roomCode: currentRoom.code,
          sessionId
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchRoomDetails(currentRoom.code);
      } else {
        setError(data.error || "Failed to delete item");
      }
    } catch (e: any) {
      console.error(e);
      setError("Failed to delete clipboard item.");
    }
  };

  const handleEditTitleSubmit = async (itemId: string) => {
    if (!currentRoom) return;
    if (!editTitleInput.trim()) {
      setEditingItemId(null);
      return;
    }
    try {
      const res = await fetch("/api/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit-item",
          itemId,
          roomCode: currentRoom.code,
          sessionId,
          title: editTitleInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingItemId(null);
        fetchRoomDetails(currentRoom.code, true);
      } else {
        setError(data.error || "Failed to update item title");
      }
    } catch (e: any) {
      console.error(e);
      setError("Failed to update clipboard item title.");
    }
  };

  const handleEditContentSubmit = async (itemId: string) => {
    if (!currentRoom) return;
    if (editContentInput.trim() === "") {
      setEditingContentItemId(null);
      return;
    }
    try {
      const res = await fetch("/api/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit-item-content",
          itemId,
          roomCode: currentRoom.code,
          sessionId,
          content: editContentInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingContentItemId(null);
        fetchRoomDetails(currentRoom.code, true);
      } else {
        setError(data.error || "Failed to update item content");
      }
    } catch (e: any) {
      console.error(e);
      setError("Failed to update clipboard item content.");
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleAskAi = async (itemId: string, promptText: string) => {
    if (!promptText.trim() || aiLoading) return;
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2),
      role: "user",
      content: promptText.trim()
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setAiPrompt("");
    setAiLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/clipboard/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          prompt: promptText.trim(),
          history: chatMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2),
            role: "assistant",
            content: data.response
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2),
            role: "assistant",
            content: `**Error:** ${data.error || "Failed to generate AI response."}`
          }
        ]);
      }
    } catch (e: any) {
      console.error(e);
      setChatMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2),
          role: "assistant",
          content: "**Error:** Network request failed. Please try again."
        }
      ]);
    } finally {
      setAiLoading(false);
      scrollToBottom();
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setItems([]);
    clearStagedFiles();
    localStorage.removeItem("glidepass_active_room_code"); // Clear active room on exit/expiry
    window.history.replaceState(null, "", window.location.pathname);
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

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Helper to parse file item data
  const parseFileItem = (content: string) => {
    try {
      if (content.startsWith('{"isFile":true')) {
        return JSON.parse(content) as { isFile: boolean; fileName: string; fileType: string; fileSize: number; data: string };
      }
    } catch (e) {}
    return null;
  };

  // Get matching file icon
  const getFileIcon = (fileType: string, fileName: string) => {
    const lowerType = fileType.toLowerCase();
    const extension = fileName.split('.').pop()?.toLowerCase() || "";

    if (lowerType.startsWith("image/")) return <ImageIcon size={28} className="text-[#F28500]" />;
    if (lowerType.includes("pdf") || extension === "pdf") return <FileText size={28} className="text-rose-500" />;
    if (lowerType.includes("zip") || lowerType.includes("tar") || ["zip", "tar", "gz", "rar", "7z"].includes(extension)) {
      return <Archive size={28} className="text-amber-500" />;
    }
    if (lowerType.includes("spreadsheet") || lowerType.includes("excel") || ["xls", "xlsx", "csv"].includes(extension)) {
      return <FileSpreadsheet size={28} className="text-emerald-500" />;
    }
    if (lowerType.includes("javascript") || lowerType.includes("typescript") || lowerType.includes("html") || ["js", "ts", "html", "css", "py", "cpp", "json"].includes(extension)) {
      return <FileCode size={28} className="text-[#468FEA]" />;
    }
    return <File size={28} className="text-gray-400" />;
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
        <div className="w-full px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className={`flex items-center gap-1.5 text-[10px] font-bold ${textSecondary} hover:text-[#468FEA] transition-colors`}>
              <ArrowLeft size={13} /> Back
            </Link>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dk ? "border-[#468FEA]/20 bg-[#468FEA]/5 text-[#468FEA]" : "border-[#468FEA]/30 bg-[#468FEA]/5 text-[#468FEA]"}`}>
              <span className="hidden sm:inline">Temporary </span>Clipboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Recent Rooms Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                className={`p-2 rounded-xl border ${borderLight} hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1.5`}
                title="Recent Rooms"
              >
                <Clock size={13} className="text-gray-400" />
                <span>Recent</span>
              </button>

              {showRecentDropdown && (
                <>
                  {/* Backdrop to close on click outside */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowRecentDropdown(false)}
                  />
                  <div className={`absolute right-0 mt-2 w-56 rounded-2xl border ${borderLight} ${dk ? "bg-[#090b0e] shadow-2xl" : "bg-[#EDEAE0] shadow-xl"} p-2.5 z-50`}>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2 px-1 select-none">
                      Recent Rooms
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-none">
                      {recentRooms.length === 0 ? (
                        <div className="text-gray-500 text-xs py-3 text-center">No recent rooms</div>
                      ) : (
                        recentRooms.map((room) => {
                          const expirationTime = new Date(room.expiresAt).getTime();
                          const isActive = Date.now() < expirationTime;

                          return (
                            <button
                              key={room.code}
                              disabled={!isActive}
                              onClick={() => {
                                setShowRecentDropdown(false);
                                joinRoom(room.code);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs ${
                                isActive 
                                  ? "hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-gray-900 dark:text-white" 
                                  : "opacity-40 cursor-not-allowed text-gray-500 dark:text-gray-600"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#F28500]">{room.code}</span>
                              </div>
                              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isActive
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              }`}>
                                {isActive ? "ACTIVE" : "EXPIRED"}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

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
      <main className="flex-1 w-full px-4 md:px-8 py-6 z-10 flex flex-col justify-start">
        
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

        {isInitializingRoom ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 my-auto">
            <div className="w-10 h-10 border-4 border-[#468FEA]/20 border-t-[#468FEA] rounded-full animate-spin mb-4" />
            <p className={`text-xs ${textSecondary} font-bold animate-pulse`}>Loading Clipboard Room...</p>
          </div>
        ) : !currentRoom ? (
          /* ──────── DASHBOARD: CREATE OR JOIN ──────── */
          <div className="max-w-5xl mx-auto w-full my-auto py-3 md:py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full">
            
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
                  Enter a 6-character room code to join an active online clipboard. Access shared snippets and files instantly.
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
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "30 Mins", value: 30 },
                        { label: "1 Hour", value: 60 },
                        { label: "2 Hours", value: 120 },
                        { label: "6 Hours", value: 360 }
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
          </div>
        ) : (
          /* ──────── INSIDE ACTIVE ROOM ──────── */
          <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 w-full min-h-0">
            
            {/* Sidebar Info & Controls */}
            <div className="w-full lg:w-96 shrink-0 space-y-4 lg:sticky lg:top-20 h-fit">
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

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className={`text-[10px] font-bold ${textSecondary} uppercase`}>Expires In</div>
                    <div className="font-bold flex items-center gap-1 mt-1 text-[#F28500]">
                      <Clock size={12} />
                      {timeLeft}
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {!hasExtended ? (
                          <button
                            onClick={() => extendRoomTime(30)}
                            className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#F28500]/10 text-[#F28500] hover:bg-[#F28500]/20 transition-all border border-[#F28500]/20 cursor-pointer animate-pulse"
                            title="Extend room by 30 mins"
                          >
                            +30m
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#468FEA]/10 text-[#468FEA] border border-[#468FEA]/20 select-none whitespace-nowrap">
                            Extended ✓
                          </span>
                        )}
                        <button
                          onClick={() => alert("Custom extensions beyond 24 hours require a premium subscription to cover production and cloud resource costs.")}
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/5 dark:bg-white/5 text-gray-400 hover:text-white transition-all border border-transparent cursor-pointer"
                          title="Request custom extension duration"
                        >
                          Custom
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className={`text-[10px] font-bold ${textSecondary} uppercase`}>Active Users</div>
                    <div className="font-bold flex items-center gap-1 mt-1 text-emerald-500">
                      <Users size={12} />
                      <span>{activeUsers} active</span>
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
                    {isHost ? (
                      <button
                        onClick={toggleRoomPermissions}
                        className="font-bold flex items-center gap-1.5 mt-1 hover:opacity-80 transition-opacity text-left cursor-pointer"
                        title="Click to toggle permissions"
                      >
                        {currentRoom.allowAllMembersToAdd ? (
                          <>
                            <Unlock size={12} className="text-emerald-500" />
                            <span className="text-emerald-500">Everyone can add (Toggle)</span>
                          </>
                        ) : (
                          <>
                            <Lock size={12} className="text-[#F28500]" />
                            <span className="text-[#F28500]">Only host can add (Toggle)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="font-bold flex items-center gap-1.5 mt-1">
                        {currentRoom.allowAllMembersToAdd ? (
                          <>
                            <Unlock size={12} className="text-emerald-500" />
                            <span className="text-emerald-500">Everyone can add</span>
                          </>
                        ) : (
                          <>
                            <Lock size={12} className="text-[#F28500]" />
                            <span className="text-[#F28500]">Only host can add</span>
                          </>
                        )}
                      </div>
                    )}
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
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#468FEA]">Add to Clipboard</div>
                      
                      {/* Direct Paste Clipboard Button */}
                      <button
                        type="button"
                        onClick={handlePasteClipboard}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[9px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Paste text, copied images, or files directly from system clipboard"
                      >
                        <Clipboard size={11} />
                        <span>Paste Clipboard</span>
                      </button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-black/5 dark:bg-white/5 p-0.5 text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => { setUploadMode("text"); setError(""); }}
                        className={`px-2 py-1 rounded transition-all cursor-pointer ${uploadMode === "text" ? "bg-[#468FEA] text-white" : "text-gray-400"}`}
                      >
                        Text/Code
                      </button>
                      <button
                        type="button"
                        onClick={() => { setUploadMode("file"); setError(""); }}
                        className={`px-2 py-1 rounded transition-all cursor-pointer ${uploadMode === "file" ? "bg-[#F28500] text-white" : "text-gray-400"}`}
                      >
                        File/Image ({stagedFiles.length})
                      </button>
                    </div>
                  </div>
                  
                  <form onSubmit={handleAddItem} className="space-y-4">
                    <div>
                      <input 
                        type="text" 
                        placeholder={uploadMode === "text" ? "Title (optional)" : "File Display Title (optional)"}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className={`w-full px-3 py-2.5 text-xs rounded-xl border ${borderLight} bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-[#468FEA]`}
                      />
                    </div>

                    {uploadMode === "text" ? (
                      <div>
                        <textarea 
                          rows={5}
                          placeholder="Paste content here or click 'Paste Clipboard' above..." 
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          required
                          className={`w-full px-3 py-2.5 text-xs rounded-xl border ${borderLight} bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-[#468FEA] font-mono`}
                        />
                      </div>
                    ) : (
                      /* File Drag-and-drop zone */
                      <div className="space-y-3">
                        <div 
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                            dragActive 
                              ? "border-[#F28500] bg-[#F28500]/5 shadow-[0_0_15px_rgba(242,133,0,0.1)]" 
                              : `${borderLight} hover:border-[#468FEA]/50 bg-black/5 dark:bg-white/5`
                          }`}
                        >
                          <input 
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="*/*"
                            multiple
                          />
                          <UploadCloud size={28} className={dragActive ? "text-[#F28500]" : "text-gray-400"} />
                          <div className="text-[10px] font-bold">
                            Drag & drop file(s) or <span className="text-[#468FEA] hover:underline">browse multiple</span>
                          </div>
                          <div className="text-[8px] text-gray-500 leading-normal">
                            Supports PDF, DOCX, ZIP, PNG, JPG, etc. Select multiple images/files or paste directly!
                          </div>
                        </div>

                        {stagedFiles.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[9px] font-bold text-gray-400">
                              <span>Staged Items ({stagedFiles.length})</span>
                              <button
                                type="button"
                                onClick={clearStagedFiles}
                                className="hover:text-rose-500 transition-colors cursor-pointer"
                              >
                                Clear All
                              </button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                              {stagedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {getFileIcon(file.type, file.name)}
                                    <div className="min-w-0">
                                      <div className="text-[10px] font-bold truncate">{file.name}</div>
                                      <div className="text-[8px] text-gray-500">{formatBytes(file.size)}</div>
                                    </div>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => removeStagedFile(idx)}
                                    className="p-1 hover:bg-rose-500/10 text-gray-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {uploadProgress !== null && (
                      <div className="space-y-1.5 py-1">
                        <div className="flex justify-between text-[9px] font-bold text-gray-500 font-mono">
                          <span>Uploading File...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#F28500] transition-all duration-150 rounded-full" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={addingItem || (uploadMode === "text" ? !newContent.trim() : stagedFiles.length === 0)}
                      className={`w-full py-2.5 rounded-xl text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                        uploadMode === "text" ? "bg-[#468FEA] hover:bg-[#3b7dc9]" : "bg-[#F28500] hover:bg-[#d97700]"
                      }`}
                    >
                      <Plus size={14} />
                      {addingItem ? "Uploading..." : uploadMode === "text" ? "Add Text" : "Upload File"}
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
            {(() => {
              const filteredItems = items.filter((item) => {
                // 1. Search filter
                const matchesSearch = 
                  item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  item.content.toLowerCase().includes(searchQuery.toLowerCase());

                if (!matchesSearch) return false;

                // 2. Category filter
                const fileItem = parseFileItem(item.content);
                if (filterCategory === "all") return true;
                if (filterCategory === "text") return !fileItem;
                
                if (fileItem) {
                  if (filterCategory === "image") {
                    return fileItem.fileType.startsWith("image/");
                  }
                  if (filterCategory === "file") {
                    return !fileItem.fileType.startsWith("image/");
                  }
                }
                return false;
              });

              return (
                <div className="flex-1 flex flex-col min-h-0 min-w-0">
                  {/* Top Feed Header / Actions / Search - All in One Row */}
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                    {/* Left: Title & Pills Group */}
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2 select-none shrink-0">
                        Clipboard Feed ({filteredItems.length})
                        <button 
                          onClick={() => fetchRoomDetails(currentRoom.code)}
                          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer"
                          title="Reload feed"
                        >
                          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                        </button>
                      </div>

                      {/* Filter Categories Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: "all", label: "All Items" },
                          { id: "text", label: "Texts" },
                          { id: "image", label: "Images" },
                          { id: "file", label: "Files" },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setFilterCategory(cat.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                              filterCategory === cat.id
                                ? "bg-[#F28500]/10 text-[#F28500] border-[#F28500]/30"
                                : `${borderLight} bg-black/5 dark:bg-white/5 text-gray-500 hover:text-white hover:bg-black/10`
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right: Search Input */}
                    <div className="relative w-full md:w-56 shrink-0">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search size={12} className="text-gray-400" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border ${borderLight} bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-[#468FEA]`}
                      />
                    </div>
                  </div>

                  {/* Feed Scrollable List */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin pb-10">
                    <AnimatePresence initial={false}>
                      {filteredItems.length === 0 ? (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`h-60 rounded-3xl border ${borderLight} border-dashed flex flex-col items-center justify-center gap-3 text-xs ${textSecondary}`}
                        >
                          <Clipboard size={24} className="stroke-[1.5] text-[#F28500]/40" />
                          <span>No items found matching your filters.</span>
                        </motion.div>
                      ) : (
                        filteredItems.map((item) => {
                          const fileItem = parseFileItem(item.content);
                          const isExpanded = !!expandedItems[item.id];

                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleExpand(item.id)}
                              className={`rounded-[18px] border ${borderLight} ${dk ? "bg-[#090b0e] hover:bg-[#0e1116]" : "bg-black/[0.015] hover:bg-black/[0.03]"} transition-all cursor-pointer overflow-hidden`}
                            >
                              {/* Top row */}
                              <div className="p-4 flex items-center justify-between gap-3">
                                {/* Title / Info */}
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-[#F28500] font-mono text-[11px] font-bold shrink-0">&gt;_</span>
                                  {editingItemId === item.id ? (
                                    <input
                                      type="text"
                                      autoFocus
                                      value={editTitleInput}
                                      onChange={(e) => setEditTitleInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleEditTitleSubmit(item.id);
                                        } else if (e.key === "Escape") {
                                          setEditingItemId(null);
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`text-xs md:text-sm font-bold bg-transparent border-b border-[#468FEA] focus:outline-none ${textPrimary} w-full max-w-[200px]`}
                                    />
                                  ) : (
                                    <h4 className={`text-xs md:text-sm font-bold truncate ${textPrimary}`}>
                                      {item.title}
                                    </h4>
                                  )}
                                  {fileItem && (
                                    <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                                      dk ? "bg-white/10 text-white/70" : "bg-black/5 text-black/70"
                                    }`}>
                                      FILE • {formatBytes(fileItem.fileSize)}
                                    </span>
                                  )}
                                </div>

                                {/* Action Items */}
                                <div className="flex items-center gap-3 shrink-0">
                                  {fileItem ? (
                                    <a
                                      href={fileItem.data && fileItem.data.startsWith("data:")
                                        ? fileItem.data
                                        : `/api/clipboard/download?id=${item.id}`}
                                      download={fileItem.fileName}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-gray-400 hover:text-white transition-colors"
                                      title="Download file"
                                    >
                                      <Download size={13} className="text-[#F28500]" />
                                    </a>
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); copyItemContent(item.id, item.content); }}
                                      className="text-gray-400 hover:text-white transition-colors"
                                      title="Copy content"
                                    >
                                      {copiedItemId === item.id ? (
                                        <Check size={13} className="text-[#468FEA]" />
                                      ) : (
                                        <Copy size={13} />
                                      )}
                                    </button>
                                  )}

                                  {(canAddItems || isHost) && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveAiItemId(item.id);
                                          setChatMessages([]);
                                          setAiPrompt("");
                                        }}
                                        className="text-gray-400 hover:text-purple-500 transition-colors shrink-0"
                                        title="Ask AI"
                                      >
                                        <Sparkles size={13} />
                                      </button>
                                      {editingItemId === item.id ? (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleEditTitleSubmit(item.id); }}
                                          className="text-[#468FEA] hover:text-[#3b7dc9] transition-colors shrink-0"
                                          title="Save Title"
                                        >
                                          <Check size={13} />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setEditTitleInput(item.title);
                                            setEditingItemId(item.id); 
                                          }}
                                          className="text-gray-400 hover:text-emerald-500 transition-colors shrink-0"
                                          title="Edit Title"
                                        >
                                          <Pen size={13} />
                                        </button>
                                      )}
                                      {!fileItem && (item.creatorSessionId === sessionId || isHost) && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (editingContentItemId === item.id) {
                                              handleEditContentSubmit(item.id);
                                            } else {
                                              setEditContentInput(item.content);
                                              setEditingContentItemId(item.id);
                                              if (!isExpanded) toggleExpand(item.id);
                                            }
                                          }}
                                          className={`${editingContentItemId === item.id ? "text-[#468FEA] hover:text-[#3b7dc9]" : "text-gray-400 hover:text-emerald-500"} transition-colors shrink-0`}
                                          title={editingContentItemId === item.id ? "Save Content" : "Edit Content"}
                                        >
                                          {editingContentItemId === item.id ? <Check size={13} /> : <Edit3 size={13} />}
                                        </button>
                                      )}
                                    </>
                                  )}

                                  {isHost && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                      className="text-gray-400 hover:text-rose-500 transition-colors shrink-0"
                                      title="Delete Item"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}

                                  {/* Chevron Expand Icon */}
                                  <svg 
                                    width="10" 
                                    height="10" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2.5" 
                                    className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  >
                                    <path d="m6 9 6 6 6-6"/>
                                  </svg>
                                </div>
                              </div>

                              {/* Expanded code preview */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-4">
                                      {fileItem ? (
                                        <div className={`rounded-[16px] border p-4 ${
                                          dk ? "border-[#F28500]/25 bg-black/40" : "border-[#F28500]/20 bg-[#F28500]/5"
                                        }`}>
                                          {fileItem.fileType.startsWith("image/") ? (
                                            <div className={`flex flex-col items-center justify-center rounded-xl overflow-hidden max-h-96 p-1 ${
                                              dk ? "bg-black/30" : "bg-[#F28500]/10"
                                            }`}>
                                              <img 
                                                src={fileItem.data && fileItem.data.startsWith("data:")
                                                  ? fileItem.data
                                                  : `/api/clipboard/download?id=${item.id}`}
                                                alt={fileItem.fileName}
                                                className="max-h-80 max-w-full object-contain rounded-lg shadow-sm"
                                              />
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-3">
                                              <div className={`p-3 rounded-xl border ${
                                                dk ? "bg-white/5 border-white/5" : "bg-white/60 border-[#F28500]/20"
                                              }`}>
                                                {getFileIcon(fileItem.fileType, fileItem.fileName)}
                                              </div>
                                              <div className="min-w-0">
                                                <div className={`text-xs font-bold font-mono truncate ${
                                                  dk ? "text-white" : "text-gray-900"
                                                }`}>{fileItem.fileName}</div>
                                                <div className={`text-[10px] font-mono mt-0.5 ${
                                                  dk ? "text-gray-400" : "text-gray-600"
                                                }`}>{fileItem.fileType || "Unknown Type"}</div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className={`rounded-[16px] border p-4 overflow-hidden ${
                                          dk ? "border-[#468FEA]/25 bg-black/40" : "border-[#468FEA]/20 bg-[#468FEA]/5"
                                        }`}>
                                          {editingContentItemId === item.id ? (
                                            <div className="flex flex-col gap-2">
                                              <textarea
                                                autoFocus
                                                value={editContentInput}
                                                onChange={(e) => setEditContentInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                                    e.preventDefault();
                                                    handleEditContentSubmit(item.id);
                                                  } else if (e.key === "Escape") {
                                                    setEditingContentItemId(null);
                                                  }
                                                }}
                                                className={`w-full h-32 p-3 text-[11px] font-mono rounded-xl border focus:outline-none resize-none ${
                                                  dk ? "bg-black/50 border-[#468FEA]/40 text-[#a5d6ff]" : "bg-white/80 border-[#468FEA]/30 text-gray-800"
                                                }`}
                                              />
                                              <div className="flex justify-end gap-2 mt-1">
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); setEditingContentItemId(null); }}
                                                  className={`px-3 py-1 text-xs rounded border transition-colors ${dk ? "border-gray-600 text-gray-400 hover:bg-gray-800" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); handleEditContentSubmit(item.id); }}
                                                  className="px-3 py-1 text-xs rounded bg-[#468FEA] text-white hover:bg-[#3b7dc9] transition-colors"
                                                >
                                                  Save (Cmd+Enter)
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <pre className={`theme-adaptive text-[11px] font-mono overflow-x-auto text-left max-h-60 scrollbar-none leading-relaxed select-all ${
                                              dk ? "text-[#a5d6ff]" : "text-gray-800"
                                            }`}>
                                              <code className="theme-adaptive">{item.content}</code>
                                            </pre>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

      </main>

      {/* Interactive AI Chat Modal */}
      <AnimatePresence>
        {activeAiItemId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md"
            onClick={() => setActiveAiItemId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[720px] ${cardBg} border ${borderLight}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 px-5 border-b border-white/10 bg-black/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className={`font-bold text-base md:text-lg ${textPrimary}`}>LANpad AI Assistant</h3>
                    <p className={`text-[11px] truncate max-w-[280px] sm:max-w-md ${textSecondary}`}>
                      Context: {items.find(i => i.id === activeAiItemId)?.title || "Clipboard Item"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {chatMessages.length > 0 && (
                    <button
                      onClick={() => setChatMessages([])}
                      className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Clear chat thread"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setActiveAiItemId(null)}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Chat Thread Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 min-h-0 scrollbar-thin">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="p-4 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                      <Sparkles size={36} />
                    </div>
                    <div>
                      <h4 className={`font-bold text-base ${textPrimary}`}>How can I help with this clipboard item?</h4>
                      <p className={`text-xs mt-1 max-w-sm ${textSecondary}`}>
                        Ask any question or pick a quick suggestion below:
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 max-w-md pt-2">
                      {["Explain this item", "Summarize key points", "Fix grammar & tone", "Extract key technical details"].map((q) => (
                        <button
                          key={q}
                          onClick={() => handleAskAi(activeAiItemId, q)}
                          className={`text-xs px-3.5 py-2 rounded-xl border font-medium transition-all ${
                            dk 
                              ? "border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200" 
                              : "border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 mt-1">
                            <Sparkles size={16} />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                            msg.role === "user"
                              ? "bg-purple-600 text-white rounded-tr-none"
                              : `${dk ? "bg-white/5 border border-white/10 text-gray-100" : "bg-white border border-gray-200 text-gray-900"} rounded-tl-none`
                          }`}
                        >
                          {msg.role === "user" ? (
                            <div className="text-xs md:text-sm font-medium whitespace-pre-wrap">{msg.content}</div>
                          ) : (
                            <FormattedMarkdown content={msg.content} dk={dk} />
                          )}
                        </div>

                        {msg.role === "user" && (
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
                            <User size={16} />
                          </div>
                        )}
                      </div>
                    ))}

                    {aiLoading && (
                      <div className="flex gap-3 justify-start items-center">
                        <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                          <Sparkles size={16} className="animate-spin" />
                        </div>
                        <div className={`rounded-2xl px-4 py-3 border text-xs font-medium ${
                          dk ? "bg-white/5 border-white/10 text-purple-300" : "bg-purple-50 border-purple-200 text-purple-900"
                        }`}>
                          <span className="inline-flex gap-1 items-center">
                            AI is analyzing...
                            <span className="animate-pulse">●</span>
                            <span className="animate-pulse delay-100">●</span>
                            <span className="animate-pulse delay-200">●</span>
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 md:p-4 border-t border-white/10 bg-black/10 flex flex-col gap-2">
                {chatMessages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {["Explain more", "Summarize", "Key takeaways"].map((chip) => (
                      <button
                        key={chip}
                        disabled={aiLoading}
                        onClick={() => handleAskAi(activeAiItemId, chip)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                          dk ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-300" : "border-black/10 bg-black/5 hover:bg-black/10 text-gray-700"
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ask a question or follow-up..."
                    className={`flex-1 p-3 px-4 rounded-2xl border text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
                      dk ? "bg-black/40 border-white/10 text-white placeholder:text-gray-500" : "bg-white border-black/10 text-gray-900 placeholder:text-gray-400"
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAskAi(activeAiItemId, aiPrompt);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleAskAi(activeAiItemId, aiPrompt)}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className={`px-4 rounded-2xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 ${
                      aiLoading || !aiPrompt.trim()
                        ? "bg-gray-500/30 text-gray-400 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                    }`}
                  >
                    <span>Send</span>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

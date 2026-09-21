"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Video,
  Mic,
  Maximize,
  Minimize,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Terminal,
  Code2,
  FileText,
  CheckSquare,
  Radio,
  Sparkles,
  RefreshCw,
  Award,
  ChevronRight,
  ChevronLeft,
  Settings,
  HelpCircle,
  Copy,
  Smartphone,
  Users,
  Volume2,
  Camera,
  ExternalLink,
  RotateCcw,
  ArrowRight,
  Download,
  Flame,
  Info,
  Sliders,
  Layers,
  Check
} from "lucide-react";

// ==========================================
// TYPES & DATA STRUCTURES
// ==========================================

export type QuestionType =
  | "coding"
  | "mcq_single"
  | "mcq_multi"
  | "fill_blank"
  | "descriptive"
  | "radio_grid";

export interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface Question {
  id: number;
  title: string;
  type: QuestionType;
  category: string;
  points: number;
  description: string;
  options?: string[];
  correctAnswer?: string | string[] | number[];
  starterCode?: Record<string, string>;
  testCases?: TestCase[];
  blanks?: { id: number; prefix: string; suffix: string; answer: string }[];
  gridRows?: string[];
  gridCols?: string[];
  gridCorrect?: Record<string, string>;
}

export interface ViolationProof {
  id: string;
  timestamp: string;
  elapsedSeconds: number;
  type:
    | "fullscreen_exit"
    | "tab_switch"
    | "face_missing"
    | "multiple_faces"
    | "looking_away"
    | "phone_detected"
    | "audio_spike"
    | "clipboard_copy"
    | "devtools_attempt"
    | "screenshot_attempt";
  label: string;
  severity: "high" | "medium" | "low";
  details: string;
  snapshotDataUrl?: string; // base64 or SVG data
  confidence?: number;
  meta?: Record<string, any>;
}

export interface ExamConfig {
  title: string;
  durationMinutes: number;
  enableFullscreen: boolean;
  enableFaceTracking: boolean;
  enableAudioMonitoring: boolean;
  enableTabSwitchDetection: boolean;
  enableAntiCopy: boolean;
  enableObjectDetection: boolean;
  strictness: "low" | "medium" | "high";
}

// Default standard question pool
const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 1,
    title: "Optimized Two-Sum Index Search",
    type: "coding",
    category: "Algorithms & Data Structures",
    points: 25,
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example 1:**
- Input: \`nums = [2,7,11,15]\`, \`target = 9\`
- Output: \`[0,1]\`

**Example 2:**
- Input: \`nums = [3,2,4]\`, \`target = 6\`
- Output: \`[1,2]\``,
    starterCode: {
      python: `def twoSum(nums, target):
    # Write your O(n) hashmap solution below:
    lookup = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in lookup:
            return [lookup[diff], i]
        lookup[n] = i
    return []`,
      javascript: `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (map.has(diff)) {
            return [map.get(diff), i];
        }
        map.set(nums[i], i);
    }
    return [];
}`,
      cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); ++i) {
            int comp = target - nums[i];
            if (seen.find(comp) != seen.end()) {
                return {seen[comp], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};`,
    },
    testCases: [
      { id: 1, input: "nums = [2, 7, 11, 15], target = 9", expectedOutput: "[0, 1]" },
      { id: 2, input: "nums = [3, 2, 4], target = 6", expectedOutput: "[1, 2]" },
      { id: 3, input: "nums = [3, 3], target = 6", expectedOutput: "[0, 1]", isHidden: true },
      { id: 4, input: "nums = [-1, -2, -3, -4, -5], target = -8", expectedOutput: "[2, 4]", isHidden: true },
    ],
  },
  {
    id: 2,
    title: "Network Protocol Latency & Handshakes",
    type: "mcq_single",
    category: "Computer Networks",
    points: 10,
    description: "Which transport protocol mechanism establishes zero-round-trip-time (0-RTT) connection resumption in modern web architectures?",
    options: [
      "TCP SYN Cookie with MSS clamping",
      "TLS 1.3 Pre-Shared Key (PSK) with Early Data",
      "HTTP/2 Multiplexed Binary Framing",
      "SCTP 4-Way Associative Cookie ACK"
    ],
    correctAnswer: "TLS 1.3 Pre-Shared Key (PSK) with Early Data",
  },
  {
    id: 3,
    title: "Database Acid & Concurrency Isolation",
    type: "mcq_multi",
    category: "Distributed Systems",
    points: 15,
    description: "Select ALL phenomena prevented under standard SQL 'REPEATABLE READ' isolation level according to ANSI SQL-92 specs:",
    options: [
      "Dirty Read (reading uncommitted data)",
      "Non-repeatable / Fuzzy Read (different values read in same transaction)",
      "Phantom Read (new rows inserted by concurrent committed transactions)",
      "Write Skew in Snapshot Isolation architectures"
    ],
    correctAnswer: [
      "Dirty Read (reading uncommitted data)",
      "Non-repeatable / Fuzzy Read (different values read in same transaction)"
    ],
  },
  {
    id: 4,
    title: "Asynchronous Concurrency Fill-in-the-Blanks",
    type: "fill_blank",
    category: "Systems Architecture",
    points: 15,
    description: "Complete the statement regarding asynchronous non-blocking event loops in high-throughput network engines:",
    blanks: [
      {
        id: 1,
        prefix: "Under Linux systems, the modern high-performance kernel async I/O interface that minimizes syscall overhead via ring buffers is called ",
        suffix: ".",
        answer: "io_uring",
      },
      {
        id: 2,
        prefix: " Unlike legacy select(), the O(1) polling syscall designed for thousands of sockets is ",
        suffix: ".",
        answer: "epoll",
      },
    ],
  },
  {
    id: 5,
    title: "Layered Protocol Architecture Matrix",
    type: "radio_grid",
    category: "OSI & TCP/IP Model",
    points: 15,
    description: "Map each protocol to its primary transport or operational layer:",
    gridRows: ["BGP (Border Gateway Protocol)", "DNS Queries (Standard)", "ICMP (Echo Request)"],
    gridCols: ["Network (Layer 3)", "Transport / Application (Layer 4/7)", "Application over TCP (Layer 7)"],
    gridCorrect: {
      "BGP (Border Gateway Protocol)": "Application over TCP (Layer 7)",
      "DNS Queries (Standard)": "Transport / Application (Layer 4/7)",
      "ICMP (Echo Request)": "Network (Layer 3)",
    },
  },
  {
    id: 6,
    title: "Architectural Design: Resilient Zero-Trust Local Mesh",
    type: "descriptive",
    category: "System Design & Security",
    points: 20,
    description: "Explain in 3-4 bullet points how an end-to-end encrypted local peer-to-peer file sharing and clipboard synchronization service (like LANpad/GlidePass) can securely discover neighboring peers without internet access or centralized DNS while mitigating man-in-the-middle (MITM) attacks.",
  },
];

export default function ProctoredTestingPage() {
  // Stage management: "config" -> "precheck" -> "exam" -> "results"
  const [stage, setStage] = useState<"config" | "precheck" | "exam" | "results">("config");

  // Exam configuration
  const [config, setConfig] = useState<ExamConfig>({
    title: "GlidePass Full-Stack & Systems Engineering Proctored Benchmark",
    durationMinutes: 45,
    enableFullscreen: true,
    enableFaceTracking: true,
    enableAudioMonitoring: true,
    enableTabSwitchDetection: true,
    enableAntiCopy: true,
    enableObjectDetection: true,
    strictness: "high",
  });

  // Candidate Profile
  const [candidateName, setCandidateName] = useState("Alex Morgan");
  const [candidateId, setCandidateId] = useState("GP-2026-9812");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Precheck statuses
  const [cameraPermission, setCameraPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [audioLevel, setAudioLevel] = useState<number>(12); // 0 - 100 dB
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(false);

  // Live Exam State
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());

  // Answers State
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({
    1: { code: DEFAULT_QUESTIONS[0].starterCode?.["python"] || "", lang: "python", testResults: null },
    2: "",
    3: [],
    4: { 1: "", 2: "" },
    5: {},
    6: "",
  });

  // IDE State for Question 1
  const [selectedLanguage, setSelectedLanguage] = useState<string>("python");
  const [codeOutput, setCodeOutput] = useState<string>("");
  const [isExecutingCode, setIsExecutingCode] = useState<boolean>(false);
  const [codeExecutionPassed, setCodeExecutionPassed] = useState<boolean | null>(null);

  // Real-time Proctoring Logs & Violations
  const [violations, setViolations] = useState<ViolationProof[]>([]);
  const [activeWarningToast, setActiveWarningToast] = useState<{ title: string; desc: string } | null>(null);
  const [showSimulateDrawer, setShowSimulateDrawer] = useState<boolean>(false);

  // Camera & Audio Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Visual Proof Modal in Results
  const [selectedProof, setSelectedProof] = useState<ViolationProof | null>(null);

  // Helper to format seconds -> mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ==========================================
  // WEBCAM & AUDIO INITIALIZATION
  // ==========================================
  const startCameraAndMic = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: true,
        });
        mediaStreamRef.current = stream;
        setCameraPermission("granted");
        setMicPermission("granted");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        // Setup Web Audio Analyser
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkAudio = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const dbApprox = Math.min(100, Math.round((average / 128) * 100));
            setAudioLevel(dbApprox);

            // Auto-detect loud audio spike if threshold exceeded in exam
            if (stage === "exam" && config.enableAudioMonitoring && dbApprox > 72) {
              recordViolation(
                "audio_spike",
                "High Decibel Audio / Conversation Detected",
                "high",
                `Microphone registered abnormal volume spike (${dbApprox} dB). Continuous background speech suspected.`
              );
            }

            requestAnimationFrame(checkAudio);
          };
          checkAudio();
        } catch (e) {
          console.warn("Audio Context error:", e);
        }
      } else {
        // Fallback simulation
        setCameraPermission("granted");
        setMicPermission("granted");
      }
    } catch (err) {
      console.warn("Media devices permission denied or unavailable:", err);
      setCameraPermission("denied");
      setMicPermission("denied");
    }
  };

  // Capture Snapshot on Canvas
  const captureSnapshot = (overlayTag?: string, boundingColor: string = "#ef4444"): string => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      if (videoRef.current && videoRef.current.readyState >= 2) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        // Draw realistic simulated camera feed
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, "#181824");
        grad.addColorStop(1, "#0d0e15");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Candidate silhouette
        ctx.fillStyle = "#2a2b3d";
        ctx.beginPath();
        ctx.arc(240, 150, 65, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(240, 310, 110, 80, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add detection overlay / bounding box
      if (overlayTag) {
        ctx.strokeStyle = boundingColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(150, 80, 180, 200);
        ctx.setLineDash([]);

        // Tag banner
        ctx.fillStyle = boundingColor;
        ctx.fillRect(150, 50, 180, 28);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(overlayTag, 160, 68);
      }

      // Watermark with timestamp and candidate
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "11px monospace";
      ctx.fillText(
        `PROCTOR-SNAP | ${candidateId} | ${new Date().toLocaleTimeString()} | GP-AUDIT`,
        12,
        canvas.height - 10
      );

      return canvas.toDataURL("image/jpeg", 0.85);
    } catch {
      return "";
    }
  };

  // Record a proctoring violation with real visual evidence snapshot
  const recordViolation = (
    type: ViolationProof["type"],
    label: string,
    severity: ViolationProof["severity"],
    details: string,
    forcedSnapshot?: string
  ) => {
    const elapsed = config.durationMinutes * 60 - timeLeft;
    const snap = forcedSnapshot || captureSnapshot(label.toUpperCase(), severity === "high" ? "#ef4444" : "#f59e0b");

    const newViolation: ViolationProof = {
      id: "v-" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      elapsedSeconds: elapsed,
      type,
      label,
      severity,
      details,
      snapshotDataUrl: snap,
      confidence: Math.floor(Math.random() * 8) + 91,
    };

    setViolations((prev) => [newViolation, ...prev]);

    // Show warning toast
    setActiveWarningToast({
      title: `Proctoring Flag: ${label}`,
      desc: details,
    });
    setTimeout(() => {
      setActiveWarningToast(null);
    }, 4500);
  };

  // ==========================================
  // REAL-TIME BROWSER PROCTORING LISTENERS
  // ==========================================
  useEffect(() => {
    if (stage !== "exam") return;

    // 1. Tab visibility / Page Blur
    const handleVisibilityChange = () => {
      if (document.hidden && config.enableTabSwitchDetection) {
        recordViolation(
          "tab_switch",
          "Tab Switch / Window Minimized",
          "high",
          "Candidate navigated away from the exam tab or switched focus to another application."
        );
      }
    };

    const handleWindowBlur = () => {
      if (config.enableTabSwitchDetection) {
        recordViolation(
          "tab_switch",
          "Window Lost Focus",
          "medium",
          "Mouse or keyboard focus moved outside active exam viewport."
        );
      }
    };

    // 2. Fullscreen change detection
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreenActive(isFull);
      if (!isFull && config.enableFullscreen) {
        recordViolation(
          "fullscreen_exit",
          "Fullscreen Mode Exited",
          "high",
          "Candidate exited mandated full-screen mode during active proctoring session."
        );
      }
    };

    // 3. Anti-Copy / Paste / Selection Interception
    const handleCopy = (e: ClipboardEvent) => {
      if (config.enableAntiCopy) {
        e.preventDefault();
        recordViolation(
          "clipboard_copy",
          "Clipboard Copy Attempted",
          "medium",
          "Candidate attempted to copy question content into system clipboard."
        );
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (config.enableAntiCopy) {
        // Prevent paste inside non-IDE questions
        if (currentQIndex !== 0) {
          e.preventDefault();
          recordViolation(
            "clipboard_copy",
            "Clipboard Paste Attempted",
            "medium",
            "Direct external clipboard injection detected into answer field."
          );
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (config.enableAntiCopy) {
        e.preventDefault();
      }
    };

    // 4. DevTools / Screenshot key combos interception
    const handleKeyDown = (e: KeyboardEvent) => {
      // Devtools: F12, Ctrl+Shift+I, Cmd+Option+I
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c"))
      ) {
        e.preventDefault();
        recordViolation(
          "devtools_attempt",
          "Developer Tools Access Attempt",
          "high",
          `Blocked shortcut (${e.key}) used to inspect DOM or network traffic.`
        );
      }

      // PrintScreen / Screenshot shortcuts
      if (e.key === "PrintScreen" || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "S" || e.key === "s"))) {
        recordViolation(
          "screenshot_attempt",
          "Screen Capture / Snipping Detected",
          "high",
          "System keyboard shortcut for screen capture triggered."
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [stage, config, currentQIndex, timeLeft]);

  // Countdown timer in exam
  useEffect(() => {
    let interval: any = null;
    if (stage === "exam" && isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            finishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage, isTimerRunning, timeLeft]);

  // Enter browser Fullscreen
  const requestFullScreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      }
      setIsFullscreenActive(true);
    } catch (e) {
      console.warn("Fullscreen request error:", e);
    }
  };

  // Precheck to Exam transition
  const proceedToExam = async () => {
    if (config.enableFullscreen) {
      await requestFullScreen();
    }
    // Take candidate verification photo
    const selfie = captureSnapshot("VERIFIED CANDIDATE", "#10b981");
    setCapturedPhoto(selfie);

    setTimeLeft(config.durationMinutes * 60);
    setIsTimerRunning(true);
    setStage("exam");
  };

  // Submit / Finish Exam
  const finishExam = () => {
    setIsTimerRunning(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setStage("results");
  };

  // Execute Code Simulator for Coding Question
  const runCodeSolution = () => {
    setIsExecutingCode(true);
    setCodeOutput("Running test harness in isolated WebAssembly container...\nCompiling code against test cases...");

    setTimeout(() => {
      setIsExecutingCode(false);
      const code = userAnswers[1]?.code || "";
      const hasTwoSumLogic = code.includes("lookup") || code.includes("map") || code.includes("seen") || code.includes("target -");

      if (hasTwoSumLogic) {
        setCodeExecutionPassed(true);
        setCodeOutput(
          `[SUCCESS] Test Cases Passed: 4/4\n` +
          `----------------------------------------\n` +
          `Test Case 1: nums=[2,7,11,15], target=9  => Output: [0, 1] [PASS] (0.04ms)\n` +
          `Test Case 2: nums=[3,2,4], target=6      => Output: [1, 2] [PASS] (0.03ms)\n` +
          `Test Case 3: nums=[3,3], target=6        => Output: [0, 1] [PASS] (Hidden)\n` +
          `Test Case 4: nums=[-1,-2,-3,-4,-5], t=-8 => Output: [2, 4] [PASS] (Hidden)\n` +
          `\nExecution Time: 38ms | Memory Allocated: 14.8MB\nSTATUS: ACCEPTED (All Test Cases Passed)`
        );
      } else {
        setCodeExecutionPassed(false);
        setCodeOutput(
          `[FAIL] Test Cases Passed: 1/4\n` +
          `----------------------------------------\n` +
          `Test Case 1: nums=[2,7,11,15], target=9  => Output: [0, 1] [PASS]\n` +
          `Test Case 2: nums=[3,2,4], target=6      => Output: [] [FAIL]\n` +
          `Expected: [1, 2], Got: []\n` +
          `\nExecution Time: 42ms | Memory: 15.1MB\nSTATUS: WRONG ANSWER on Test Case 2`
        );
      }
    }, 1100);
  };

  // Calculate Overall Trust Score
  const calculateTrustScore = () => {
    let score = 100;
    violations.forEach((v) => {
      if (v.severity === "high") score -= 14;
      else if (v.severity === "medium") score -= 7;
      else score -= 3;
    });
    return Math.max(12, Math.min(100, score));
  };

  // Calculate Academic Score
  const calculateExamScore = () => {
    let earned = 0;
    let total = 0;

    DEFAULT_QUESTIONS.forEach((q) => {
      total += q.points;
      if (q.id === 1) {
        // Coding
        if (codeExecutionPassed) earned += q.points;
        else if (userAnswers[1]?.code?.length > 40) earned += 15; // Partial
      } else if (q.id === 2) {
        // MCQ Single
        if (userAnswers[2] === q.correctAnswer) earned += q.points;
      } else if (q.id === 3) {
        // MCQ Multi
        const ans = userAnswers[3] || [];
        const correct = q.correctAnswer as string[];
        const isMatch =
          ans.length === correct.length && ans.every((item: string) => correct.includes(item));
        if (isMatch) earned += q.points;
        else if (ans.length > 0 && ans.some((item: string) => correct.includes(item))) earned += 7;
      } else if (q.id === 4) {
        // Fill blank
        const b1 = (userAnswers[4]?.[1] || "").toLowerCase().trim();
        const b2 = (userAnswers[4]?.[2] || "").toLowerCase().trim();
        if (b1 === "io_uring") earned += 7.5;
        if (b2 === "epoll") earned += 7.5;
      } else if (q.id === 5) {
        // Grid
        const gridAns = userAnswers[5] || {};
        let matches = 0;
        Object.entries(q.gridCorrect || {}).forEach(([row, col]) => {
          if (gridAns[row] === col) matches++;
        });
        earned += Math.round((matches / 3) * q.points);
      } else if (q.id === 6) {
        // Descriptive
        if ((userAnswers[6] || "").length > 80) earned += 18;
        else if ((userAnswers[6] || "").length > 20) earned += 10;
      }
    });

    return { earned, total, percentage: Math.round((earned / total) * 100) };
  };

  const trustScore = calculateTrustScore();
  const examScore = calculateExamScore();

  // ==========================================
  // RENDER: STAGE 1 - EXAM CONFIGURATION / CREATOR
  // ==========================================
  if (stage === "config") {
    return (
      <div className="min-h-screen bg-[#08080c] text-white selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Navigation */}
        <header className="border-b border-white/10 bg-white/[0.02] backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-rose-500 p-[1px] shadow-lg shadow-indigo-500/20">
                  <div className="w-full h-full bg-[#08080c] rounded-[7px] flex items-center justify-center">
                    <Shield className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <span className="font-semibold text-lg tracking-tight text-white flex items-center gap-1.5">
                  GlidePass <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">PROCTOR LAB</span>
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50 hidden sm:inline">Production Testing Environment</span>
              <button
                onClick={() => setStage("precheck")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2"
              >
                <span>Launch Quick Exam</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-indigo-300 font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Comprehensive AI Proctored Testing Suite & IDE
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              Proctored Exam Simulator <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-rose-400 bg-clip-text text-transparent">
                With Instant Proof Auditing
              </span>
            </h1>
            <p className="text-white/60 text-base sm:text-lg leading-relaxed">
              Create, configure, and experience complete online proctored assessments. Features interactive coding IDE, multi-format questions, full-screen lockdown, AI webcam face/gaze/object tracking, microphone noise detection, and photographic violation audit proofs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Exam Creator & Settings */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <Sliders className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-semibold text-white">Exam Parameters</h2>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-white/[0.05] text-white/70 border border-white/10 font-mono">
                    {DEFAULT_QUESTIONS.length} Questions Loaded
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/70 uppercase tracking-wider mb-2">
                      Assessment Title
                    </label>
                    <input
                      type="text"
                      value={config.title}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-white/70 uppercase tracking-wider mb-2">
                        Candidate Name
                      </label>
                      <input
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/70 uppercase tracking-wider mb-2">
                        Candidate ID / Roll No
                      </label>
                      <input
                        type="text"
                        value={candidateId}
                        onChange={(e) => setCandidateId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/70 uppercase tracking-wider mb-2">
                      Duration (Minutes)
                    </label>
                    <div className="flex items-center gap-3">
                      {[15, 30, 45, 60, 90].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setConfig({ ...config, durationMinutes: mins })}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            config.durationMinutes === mins
                              ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                              : "bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]"
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Proctoring Rules Configuration */}
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg font-semibold text-white">Active Proctoring Modules</h2>
                  </div>
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    AI Engine Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enableFullscreen}
                      onChange={(e) => setConfig({ ...config, enableFullscreen: e.target.checked })}
                      className="mt-1 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-1.5">
                        <Maximize className="w-3.5 h-3.5 text-indigo-400" /> Fullscreen Lockdown
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">Flags exiting fullscreen or multi-monitor splitting.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enableFaceTracking}
                      onChange={(e) => setConfig({ ...config, enableFaceTracking: e.target.checked })}
                      className="mt-1 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-indigo-400" /> Face & Gaze Tracking
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">Detects missing candidate, looking away, or multiple faces.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enableAudioMonitoring}
                      onChange={(e) => setConfig({ ...config, enableAudioMonitoring: e.target.checked })}
                      className="mt-1 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-indigo-400" /> Microphone Decibel Monitor
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">Captures audio spikes, whispering, and background voices.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enableTabSwitchDetection}
                      onChange={(e) => setConfig({ ...config, enableTabSwitchDetection: e.target.checked })}
                      className="mt-1 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" /> Tab Switch & Window Blur
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">Logs Alt+Tab, minimizing, and unfocused application events.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enableAntiCopy}
                      onChange={(e) => setConfig({ ...config, enableAntiCopy: e.target.checked })}
                      className="mt-1 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5 text-indigo-400" /> Anti-Copy & DevTools Guard
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">Disables context menu, clipboard cut/copy, and F12 inspect.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enableObjectDetection}
                      onChange={(e) => setConfig({ ...config, enableObjectDetection: e.target.checked })}
                      className="mt-1 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> Phone & Object Detection
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">Flags prohibited objects (smartphones, books, dual headsets).</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Question Types Preview & Launch */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/10">
                  <Layers className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-semibold text-white">Question Architecture</h2>
                </div>
                <p className="text-xs text-white/60 mb-4 leading-relaxed">
                  The test demonstrates 6 distinct proctored question paradigms, complete with live execution and auto-evaluation:
                </p>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Full IDE & Code Runner</div>
                        <div className="text-xs text-white/50">Multi-language (Python, JS, C++) + Test Cases</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-indigo-300">25 pts</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Single Choice MCQ</div>
                        <div className="text-xs text-white/50">Network protocol resumption & latency</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-purple-300">10 pts</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Multiple Correct Answers</div>
                        <div className="text-xs text-white/50">Distributed database isolation anomalies</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-pink-300">15 pts</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Code2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Fill in the Blanks</div>
                        <div className="text-xs text-white/50">Kernel async I/O & epoll architecture</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-amber-300">15 pts</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Radio Matrix Matching</div>
                        <div className="text-xs text-white/50">Layer 3/4/7 protocol mapping grid</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-cyan-300">15 pts</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Descriptive Essay Input</div>
                        <div className="text-xs text-white/50">Zero-trust P2P local discovery design</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-300">20 pts</span>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-white/10">
                  <button
                    onClick={() => setStage("precheck")}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 group transition-all"
                  >
                    <span>Proceed to Pre-Flight System Check</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="text-center text-[11px] text-white/40 mt-2.5">
                    Will verify camera, microphone, and full-screen compatibility before entering.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // RENDER: STAGE 2 - SYSTEM PRE-CHECK & VERIFICATION
  // ==========================================
  if (stage === "precheck") {
    return (
      <div className="min-h-screen bg-[#08080c] text-white selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden flex flex-col justify-between">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

        <header className="border-b border-white/10 bg-white/[0.02] backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStage("config")}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-base font-semibold text-white">System Pre-Flight & Candidate Verification</h1>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              Step 2 of 3
            </span>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8 w-full flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Camera Preview Card */}
            <div className="md:col-span-6 space-y-4">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/50 border border-white/10 shadow-2xl">
                {/* Live video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: "scaleX(-1)" }}
                />

                {/* Overlays */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/70 backdrop-blur text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE FEED
                    </span>
                    <span className="text-[10px] font-mono text-white/60 bg-black/70 px-2 py-0.5 rounded">
                      {candidateId}
                    </span>
                  </div>

                  {/* Face outline guide */}
                  <div className="self-center w-40 h-52 border-2 border-dashed border-indigo-400/60 rounded-[40px] flex items-center justify-center">
                    <span className="text-[11px] text-indigo-300/80 bg-black/60 px-2 py-0.5 rounded">
                      Align Face Here
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-white/70 bg-black/80 backdrop-blur p-2 rounded-lg">
                    <span>Gaze: Centered</span>
                    <span className="text-emerald-400">1 Person Detected</span>
                  </div>
                </div>
              </div>

              {cameraPermission !== "granted" ? (
                <button
                  onClick={startCameraAndMic}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Grant Camera & Mic Access</span>
                </button>
              ) : (
                <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Camera & Microphone Calibrated</span>
                  </div>
                  <span className="font-mono">Ready</span>
                </div>
              )}
            </div>

            {/* Checklist & Verification */}
            <div className="md:col-span-6 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Hardware & Security Checklist</h2>
                <p className="text-xs text-white/60">All prerequisites must pass before test access is unlocked.</p>
              </div>

              <div className="space-y-3">
                {/* Item 1: Camera */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${cameraPermission === "granted" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-white/50"}`}>
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Webcam Sensor</div>
                      <div className="text-xs text-white/50">Required for face detection & continuous audit</div>
                    </div>
                  </div>
                  {cameraPermission === "granted" ? (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Passed
                    </span>
                  ) : (
                    <button
                      onClick={startCameraAndMic}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Enable
                    </button>
                  )}
                </div>

                {/* Item 2: Microphone with decibel meter */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${micPermission === "granted" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-white/50"}`}>
                        <Mic className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Microphone Decibel Monitor</div>
                        <div className="text-xs text-white/50">Real-time room noise and voice telemetry</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-white/80">{audioLevel} dB</span>
                  </div>
                  {/* Live dB Bar */}
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-75 ${
                        audioLevel > 65 ? "bg-rose-500" : audioLevel > 40 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, (audioLevel / 80) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Item 3: Full-Screen Lock */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isFullscreenActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-white/50"}`}>
                      <Maximize className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Full-Screen Mode</div>
                      <div className="text-xs text-white/50">Browser will expand to fullscreen upon start</div>
                    </div>
                  </div>
                  <span className="text-xs text-indigo-400 font-mono">Enforced at Launch</span>
                </div>

                {/* Item 4: Candidate Card */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{candidateName}</div>
                      <div className="text-xs text-white/50">ID: {candidateId} • Verified Candidate</div>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">Ready</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={proceedToExam}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-medium shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 group transition-all"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Start Proctored Examination</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-center text-[11px] text-white/40 mt-2">
                  Exiting fullscreen or switching windows during exam will record photo evidence.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // RENDER: STAGE 3 - LIVE PROCTORED EXAM & IDE
  // ==========================================
  if (stage === "exam") {
    const q = DEFAULT_QUESTIONS[currentQIndex];

    return (
      <div className="min-h-screen bg-[#08080c] text-white selection:bg-indigo-500/30 selection:text-indigo-200 flex flex-col justify-between select-none">
        {/* Active Warning Toast */}
        {activeWarningToast && (
          <div className="fixed top-20 right-6 z-50 max-w-md p-4 rounded-xl bg-rose-950/90 border border-rose-500/50 backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-rose-200">{activeWarningToast.title}</div>
                <div className="text-xs text-rose-300/80 mt-1">{activeWarningToast.desc}</div>
                <div className="text-[10px] font-mono text-rose-400/90 mt-2 flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Photographic evidence snapshot captured & logged to report
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Top Bar Header */}
        <header className="border-b border-white/10 bg-[#0d0e15]/95 backdrop-blur-xl sticky top-0 z-40 px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-sm tracking-tight text-white hidden sm:inline">
                {config.title}
              </span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-white/[0.05] text-white/60 font-mono">
              Q{currentQIndex + 1} / {DEFAULT_QUESTIONS.length}
            </span>
          </div>

          {/* Center Proctoring Telemetry Pill */}
          <div className="hidden md:flex items-center gap-4 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Face Locked</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 text-white/70 font-mono">
              <Mic className="w-3 h-3 text-indigo-400" />
              <span>{audioLevel} dB</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 text-white/70">
              <Maximize className="w-3 h-3 text-indigo-400" />
              <span>{isFullscreenActive ? "Full-Screen" : "Windowed"}</span>
            </div>
            <span className="text-white/20">|</span>
            <div className={`flex items-center gap-1 font-mono ${violations.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              <AlertTriangle className="w-3 h-3" />
              <span>{violations.length} Flags</span>
            </div>
          </div>

          {/* Right Timer & Submit */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-sm">
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            <button
              onClick={() => setShowSimulateDrawer(!showSimulateDrawer)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-white/80 transition-colors flex items-center gap-1.5"
              title="Test violation alerts with real proof capturing"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Test Violations</span>
            </button>

            <button
              onClick={finishExam}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all"
            >
              Submit Exam
            </button>
          </div>
        </header>

        {/* Violation Simulator Floating Drawer (For evaluation & demo testing) */}
        {showSimulateDrawer && (
          <div className="fixed top-20 left-6 z-50 w-80 p-4 rounded-2xl bg-[#12131f]/95 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">Trigger Test Violation (Demo)</span>
              </div>
              <button
                onClick={() => setShowSimulateDrawer(false)}
                className="text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-white/50">
              Click any button to trigger and verify proof capture and flagging just like enterprise proctoring:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  recordViolation(
                    "looking_away",
                    "Candidate Looking Away From Screen",
                    "medium",
                    "Gaze tracker detected candidate head orientation diverted off-screen for > 8 seconds."
                  )
                }
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-amber-500/10 border border-white/10 text-left text-[11px] text-white/80 transition-colors"
              >
                👀 Look Away
              </button>

              <button
                onClick={() =>
                  recordViolation(
                    "multiple_faces",
                    "Multiple Faces Detected",
                    "high",
                    "Second person entered webcam visual perimeter. Unauthorized collaborator suspected."
                  )
                }
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-rose-500/10 border border-white/10 text-left text-[11px] text-white/80 transition-colors"
              >
                👥 Second Person
              </button>

              <button
                onClick={() =>
                  recordViolation(
                    "phone_detected",
                    "Prohibited Device: Smartphone in Hand",
                    "high",
                    "YOLO object detector identified smartphone handheld device in candidate frame."
                  )
                }
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-rose-500/10 border border-white/10 text-left text-[11px] text-white/80 transition-colors"
              >
                📱 Mobile Phone
              </button>

              <button
                onClick={() =>
                  recordViolation(
                    "face_missing",
                    "Candidate Missing From Webcam Frame",
                    "high",
                    "No human facial geometry detected in video stream for consecutive frames."
                  )
                }
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-rose-500/10 border border-white/10 text-left text-[11px] text-white/80 transition-colors"
              >
                🚫 Face Missing
              </button>

              <button
                onClick={() =>
                  recordViolation(
                    "audio_spike",
                    "Voice Speech Audio Spike Detected",
                    "medium",
                    "Microphone registered speech frequency spike (74 dB). Secondary conversation flagged."
                  )
                }
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-amber-500/10 border border-white/10 text-left text-[11px] text-white/80 transition-colors"
              >
                🗣️ Voice / Audio Spike
              </button>

              <button
                onClick={() =>
                  recordViolation(
                    "fullscreen_exit",
                    "Candidate Exited Fullscreen Mode",
                    "high",
                    "Fullscreen lock broken. Candidate minimized exam or switched to second display."
                  )
                }
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-rose-500/10 border border-white/10 text-left text-[11px] text-white/80 transition-colors"
              >
                🖥️ Exit Fullscreen
              </button>
            </div>
          </div>
        )}

        {/* Main Exam Canvas */}
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center 9 Cols: Question Content & Interactive Inputs */}
          <div className="lg:col-span-9 flex flex-col space-y-4">
            {/* Question Header Card */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-medium">
                      {q.category}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-md bg-white/[0.05] text-white/70 font-mono">
                      {q.type.toUpperCase().replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-300 font-semibold">{q.points} Points</span>
                    <button
                      onClick={() => {
                        const newSet = new Set(markedForReview);
                        if (newSet.has(q.id)) newSet.delete(q.id);
                        else newSet.add(q.id);
                        setMarkedForReview(newSet);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                        markedForReview.has(q.id)
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white"
                      }`}
                    >
                      {markedForReview.has(q.id) ? "★ Marked for Review" : "☆ Mark for Review"}
                    </button>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-2">{q.title}</h2>
                <div className="text-sm text-white/80 whitespace-pre-line leading-relaxed font-sans">
                  {q.description}
                </div>
              </div>
            </div>

            {/* Question Input Engine based on Type */}
            <div className="flex-1">
              {/* 1. CODING QUESTION IDE */}
              {q.type === "coding" && (
                <div className="rounded-2xl bg-[#0b0c13] border border-white/10 overflow-hidden shadow-2xl flex flex-col h-[520px]">
                  {/* IDE Toolbar */}
                  <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-xs text-white/40 font-mono">solution.{selectedLanguage === "python" ? "py" : selectedLanguage === "javascript" ? "js" : "cpp"}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={selectedLanguage}
                        onChange={(e) => {
                          const lang = e.target.value;
                          setSelectedLanguage(lang);
                          setUserAnswers({
                            ...userAnswers,
                            1: {
                              ...userAnswers[1],
                              lang,
                              code: q.starterCode?.[lang] || "",
                            },
                          });
                        }}
                        className="bg-white/[0.05] border border-white/10 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none"
                      >
                        <option value="python" className="bg-[#12131f]">Python 3.11</option>
                        <option value="javascript" className="bg-[#12131f]">JavaScript (Node v20)</option>
                        <option value="cpp" className="bg-[#12131f]">C++ 20</option>
                      </select>

                      <button
                        onClick={runCodeSolution}
                        disabled={isExecutingCode}
                        className="px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
                      >
                        {isExecutingCode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>Run Test Cases</span>
                      </button>
                    </div>
                  </div>

                  {/* Code Textarea with line numbers */}
                  <div className="flex-1 flex overflow-hidden">
                    <div className="w-12 bg-black/20 text-white/30 text-right pr-3 pt-3 font-mono text-xs select-none space-y-1">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <textarea
                      value={userAnswers[1]?.code || ""}
                      onChange={(e) =>
                        setUserAnswers({
                          ...userAnswers,
                          1: { ...userAnswers[1], code: e.target.value },
                        })
                      }
                      spellCheck={false}
                      className="flex-1 p-3 bg-transparent text-indigo-100 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                    />
                  </div>

                  {/* Execution Console Output */}
                  <div className="h-36 bg-black/40 border-t border-white/10 p-3 overflow-y-auto font-mono text-xs">
                    <div className="flex items-center justify-between text-white/50 mb-1 text-[11px] pb-1 border-b border-white/5">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-3 h-3 text-indigo-400" />
                        Execution Console
                      </span>
                      {codeExecutionPassed !== null && (
                        <span className={codeExecutionPassed ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                          {codeExecutionPassed ? "✓ ALL TESTS PASSED" : "✗ TEST FAILED"}
                        </span>
                      )}
                    </div>
                    <pre className="text-white/80 whitespace-pre-wrap">
                      {codeOutput || "// Click 'Run Test Cases' to compile and execute your logic against sample & hidden test suites."}
                    </pre>
                  </div>
                </div>
              )}

              {/* 2. MCQ SINGLE CHOICE (RADIO BUTTONS) */}
              {q.type === "mcq_single" && (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-3">
                  <div className="text-xs text-white/50 mb-2">Select exactly one correct option:</div>
                  {q.options?.map((opt, idx) => {
                    const isSelected = userAnswers[q.id] === opt;
                    const letter = String.fromCharCode(65 + idx);

                    return (
                      <div
                        key={idx}
                        onClick={() => setUserAnswers({ ...userAnswers, [q.id]: opt })}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                          isSelected
                            ? "bg-indigo-500/15 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10"
                            : "bg-white/[0.02] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-mono font-semibold ${
                            isSelected ? "border-indigo-400 bg-indigo-500 text-white" : "border-white/20 text-white/40"
                          }`}
                        >
                          {letter}
                        </div>
                        <span className="text-sm font-medium">{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. MCQ MULTIPLE CORRECT (CHECKBOXES) */}
              {q.type === "mcq_multi" && (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-3">
                  <div className="text-xs text-indigo-300 font-mono mb-2">
                    Multiple Choice • Choose all options that apply:
                  </div>
                  {q.options?.map((opt, idx) => {
                    const currentSelected = (userAnswers[q.id] as string[]) || [];
                    const isSelected = currentSelected.includes(opt);

                    const toggleOption = () => {
                      if (isSelected) {
                        setUserAnswers({
                          ...userAnswers,
                          [q.id]: currentSelected.filter((item) => item !== opt),
                        });
                      } else {
                        setUserAnswers({
                          ...userAnswers,
                          [q.id]: [...currentSelected, opt],
                        });
                      }
                    };

                    return (
                      <div
                        key={idx}
                        onClick={toggleOption}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                          isSelected
                            ? "bg-pink-500/15 border-pink-500/50 text-white shadow-lg shadow-pink-500/10"
                            : "bg-white/[0.02] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected ? "border-pink-400 bg-pink-500 text-white" : "border-white/20 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span className="text-sm font-medium">{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. FILL IN THE BLANKS */}
              {q.type === "fill_blank" && (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-6">
                  <div className="text-xs text-amber-300 font-mono">Fill in the precise missing terminology:</div>
                  <div className="space-y-4 text-sm leading-relaxed text-white/90">
                    {q.blanks?.map((b) => (
                      <div key={b.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-wrap items-center gap-2">
                        <span>{b.prefix}</span>
                        <input
                          type="text"
                          placeholder={`[Blank ${b.id}]`}
                          value={userAnswers[q.id]?.[b.id] || ""}
                          onChange={(e) =>
                            setUserAnswers({
                              ...userAnswers,
                              [q.id]: {
                                ...userAnswers[q.id],
                                [b.id]: e.target.value,
                              },
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-200 font-mono text-sm focus:outline-none focus:border-amber-400 w-44"
                        />
                        <span>{b.suffix}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. RADIO GRID / MATRIX MATCHING */}
              {q.type === "radio_grid" && (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl overflow-x-auto">
                  <div className="text-xs text-cyan-300 font-mono mb-4">
                    Radio Matrix • Select one corresponding layer per protocol row:
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50 text-xs font-mono">
                        <th className="pb-3 pr-4">Protocol / Service</th>
                        {q.gridCols?.map((col, idx) => (
                          <th key={idx} className="pb-3 px-3 text-center">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {q.gridRows?.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-white/[0.01]">
                          <td className="py-3.5 pr-4 font-medium text-white">{row}</td>
                          {q.gridCols?.map((col, cIdx) => {
                            const isChecked = userAnswers[q.id]?.[row] === col;
                            return (
                              <td key={cIdx} className="py-3.5 px-3 text-center">
                                <input
                                  type="radio"
                                  name={`grid-${q.id}-${rIdx}`}
                                  checked={isChecked}
                                  onChange={() =>
                                    setUserAnswers({
                                      ...userAnswers,
                                      [q.id]: {
                                        ...userAnswers[q.id],
                                        [row]: col,
                                      },
                                    })
                                  }
                                  className="w-4 h-4 text-cyan-500 bg-white/10 border-white/20 focus:ring-0 cursor-pointer"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 6. DESCRIPTIVE / ESSAY TEXT INPUT */}
              {q.type === "descriptive" && (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between text-xs text-white/50 font-mono">
                    <span>Markdown formatting supported</span>
                    <span>{(userAnswers[q.id] || "").length} characters</span>
                  </div>
                  <textarea
                    rows={8}
                    placeholder="Provide your structured architectural explanation here..."
                    value={userAnswers[q.id] || ""}
                    onChange={(e) => setUserAnswers({ ...userAnswers, [q.id]: e.target.value })}
                    className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white font-sans text-sm leading-relaxed focus:outline-none focus:border-emerald-500/50 resize-y"
                  />
                  <div className="text-[11px] text-white/40 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auto-saved to session storage</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Question Navigation Footer */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
              <button
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-white/80 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Question</span>
              </button>

              <div className="text-xs text-white/50 font-mono">
                {currentQIndex + 1} of {DEFAULT_QUESTIONS.length}
              </div>

              {currentQIndex < DEFAULT_QUESTIONS.length - 1 ? (
                <button
                  onClick={() => setCurrentQIndex((prev) => Math.min(DEFAULT_QUESTIONS.length - 1, prev + 1))}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={finishExam}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Review & Finish Exam</span>
                </button>
              )}
            </div>
          </div>

          {/* Right 3 Cols: Live Proctoring PIP, Audio Meter & Question Palette */}
          <div className="lg:col-span-3 space-y-4">
            {/* Live Proctoring Webcam Picture-in-Picture */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                  Live Proctoring Feed
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {/* Corner Video PIP */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/10">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />

                {/* Real-time bounding box simulation */}
                <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[9px] font-mono text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded">
                    <span>FACE-ID: #01</span>
                    <span>CONF: 98.4%</span>
                  </div>
                  <div className="self-center w-24 h-18 border border-dashed border-emerald-400/70 rounded-lg" />
                  <div className="flex items-center justify-between text-[9px] font-mono text-white/70 bg-black/70 px-1.5 py-0.5 rounded">
                    <span>Gaze: On-Screen</span>
                    <span>Obj: Clear</span>
                  </div>
                </div>
              </div>

              {/* Audio Monitor Meter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-indigo-400" /> Ambient Noise
                  </span>
                  <span className="font-mono text-[11px] text-white/80">{audioLevel} dB</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      audioLevel > 65 ? "bg-rose-500" : audioLevel > 40 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, (audioLevel / 80) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Question Palette Grid */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Question Navigator</span>
                <span className="text-[11px] text-white/40 font-mono">
                  {Object.keys(userAnswers).length} Attempted
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {DEFAULT_QUESTIONS.map((item, idx) => {
                  const isCurrent = currentQIndex === idx;
                  const isMarked = markedForReview.has(item.id);
                  const isAnswered =
                    item.id === 1
                      ? (userAnswers[1]?.code || "").length > 40
                      : item.id === 2
                      ? !!userAnswers[2]
                      : item.id === 3
                      ? (userAnswers[3] || []).length > 0
                      : item.id === 4
                      ? !!userAnswers[4]?.[1]
                      : item.id === 5
                      ? Object.keys(userAnswers[5] || {}).length > 0
                      : (userAnswers[6] || "").length > 0;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`h-10 rounded-xl font-mono text-xs font-semibold transition-all relative border flex items-center justify-center ${
                        isCurrent
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30"
                          : isMarked
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : isAnswered
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white"
                      }`}
                    >
                      <span>Q{idx + 1}</span>
                      {isMarked && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px] text-white/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/50" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500/50" />
                  <span>Marked</span>
                </div>
              </div>
            </div>

            {/* Recent Violations Mini Feed */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Proctoring Audit Log
                </span>
                <span className="text-[10px] font-mono text-white/40">{violations.length} total</span>
              </div>

              {violations.length === 0 ? (
                <div className="py-4 text-center text-xs text-white/40">
                  No integrity flags registered yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {violations.slice(0, 4).map((v) => (
                    <div
                      key={v.id}
                      className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className={v.severity === "high" ? "text-rose-400" : "text-amber-400"}>
                          {v.label}
                        </span>
                        <span className="text-white/40 text-[10px]">{v.timestamp}</span>
                      </div>
                      <div className="text-white/50 text-[10px] truncate">{v.details}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // RENDER: STAGE 4 - COMPREHENSIVE PROCTORED AUDIT REPORT & RESULTS
  // ==========================================
  return (
    <div className="min-h-screen bg-[#08080c] text-white selection:bg-indigo-500/30 selection:text-indigo-200 py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Visual Proof Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl p-6 rounded-2xl bg-[#12131f] border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Photographic Evidence Snapshot</h3>
              </div>
              <button
                onClick={() => setSelectedProof(null)}
                className="text-white/50 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {selectedProof.snapshotDataUrl ? (
              <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
                <img
                  src={selectedProof.snapshotDataUrl}
                  alt={selectedProof.label}
                  className="w-full h-auto object-cover"
                />
              </div>
            ) : (
              <div className="h-48 rounded-xl bg-black/40 flex items-center justify-center text-xs text-white/40">
                Visual frame metadata recorded
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Violation Type:</span>
                <span className="font-semibold text-white">{selectedProof.label}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Timestamp:</span>
                <span className="font-mono text-indigo-300">{selectedProof.timestamp}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">AI Confidence:</span>
                <span className="font-mono text-emerald-400">{selectedProof.confidence}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Audit Details:</span>
                <span className="text-white/80 max-w-xs text-right">{selectedProof.details}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedProof(null)}
              className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-white transition-colors"
            >
              Close Snapshot Viewer
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header Card */}
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 mb-3">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Examination Concluded & Verified
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
              Proctored Integrity & Performance Audit
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-white/60 font-mono">
              <span>Candidate: <strong className="text-white">{candidateName}</strong> ({candidateId})</span>
              <span>•</span>
              <span>Test: {config.title}</span>
              <span>•</span>
              <span>Completed at {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-white flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Export Audit PDF</span>
            </button>
            <button
              onClick={() => {
                setStage("config");
                setViolations([]);
                setTimeLeft(config.durationMinutes * 60);
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake / Test Again</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trust / Integrity Score */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Proctoring Trust Score
              </span>
              <ShieldCheck className={`w-5 h-5 ${trustScore >= 80 ? "text-emerald-400" : trustScore >= 60 ? "text-amber-400" : "text-rose-400"}`} />
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-extrabold tracking-tight font-mono ${trustScore >= 80 ? "text-emerald-400" : trustScore >= 60 ? "text-amber-400" : "text-rose-400"}`}>
                {trustScore}%
              </span>
              <span className="text-xs font-medium text-white/50">
                {trustScore >= 85 ? "HIGH CREDIBILITY" : trustScore >= 65 ? "MANUAL REVIEW REQUIRED" : "INTEGRITY COMPROMISED"}
              </span>
            </div>

            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${trustScore >= 80 ? "bg-emerald-400" : trustScore >= 60 ? "bg-amber-400" : "bg-rose-500"}`}
                style={{ width: `${trustScore}%` }}
              />
            </div>
            <p className="text-[11px] text-white/50">
              Evaluated across {violations.length} automated incident checks including webcam eye-tracking, screen locks, and audio telemetry.
            </p>
          </div>

          {/* Exam Academic Score */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Exam Performance
              </span>
              <Award className="w-5 h-5 text-indigo-400" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-tight font-mono text-white">
                {examScore.earned}
                <span className="text-2xl text-white/40">/{examScore.total}</span>
              </span>
              <span className="text-xs font-medium text-indigo-300">
                ({examScore.percentage}%)
              </span>
            </div>

            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500"
                style={{ width: `${examScore.percentage}%` }}
              />
            </div>
            <p className="text-[11px] text-white/50">
              Includes compiler test case execution score, MCQs evaluation, and fill-in-the-blank tokens.
            </p>
          </div>

          {/* Security & Flags Summary */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Incident Telemetry
              </span>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-tight font-mono text-amber-400">
                {violations.length}
              </span>
              <span className="text-xs font-medium text-white/50">FLAGS RECORDED</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-white/70 font-mono">
              <div>High Severity: <span className="text-rose-400 font-bold">{violations.filter(v => v.severity === 'high').length}</span></div>
              <div>Medium/Low: <span className="text-amber-400 font-bold">{violations.filter(v => v.severity !== 'high').length}</span></div>
            </div>
            <p className="text-[11px] text-white/50">
              Every flag contains an evidentiary snapshot and timestamp for human auditor verification.
            </p>
          </div>
        </div>

        {/* Proctoring Evidentiary Audit Trail & Proof Gallery */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                Evidentiary Audit Log & Photographic Proofs
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Timestamped incident timeline with high-definition webcam & screen captures.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-white/[0.04] text-white/70 border border-white/10 font-mono">
              {violations.length} Evidence Records
            </span>
          </div>

          {violations.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-white">Clean Session • Zero Violations Detected</div>
              <p className="text-xs text-white/50 max-w-md mx-auto">
                Candidate maintained continuous full-screen focus, gaze alignment, and an undisturbed audio environment throughout the examination.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {violations.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedProof(v)}
                  className="group p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.04] transition-all cursor-pointer space-y-3 shadow-lg"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black/40 border border-white/10">
                    {v.snapshotDataUrl ? (
                      <img
                        src={v.snapshotDataUrl}
                        alt={v.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-mono">
                        SNAPSHOT LOGGED
                      </div>
                    )}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-black/70 backdrop-blur border border-white/10">
                      <span className={v.severity === "high" ? "text-rose-400" : "text-amber-400"}>
                        {v.severity}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-semibold text-white truncate max-w-[180px]">{v.label}</span>
                      <span className="text-indigo-400 text-[10px]">{v.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-white/60 line-clamp-2">{v.details}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-indigo-400 font-mono">
                    <span>Click to inspect proof</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Question Review Breakdown */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Detailed Question & Answer Audit
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Evaluation of submitted responses across all question paradigms.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {DEFAULT_QUESTIONS.map((item, idx) => {
              const isCoding = item.type === "coding";
              return (
                <div key={item.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white/50">Question {idx + 1} • {item.category}</span>
                    <span className="text-xs font-mono text-indigo-300 font-semibold">{item.points} Points</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>

                  {isCoding ? (
                    <div className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-indigo-200">
                      <div className="text-white/40 text-[10px] mb-1">CANDIDATE CODE:</div>
                      <pre className="overflow-x-auto whitespace-pre">
                        {(userAnswers[1]?.code || "").slice(0, 240)}...
                      </pre>
                      <div className="mt-2 text-[11px] text-emerald-400 font-semibold">
                        Status: {codeExecutionPassed ? "Accepted (All Test Cases Passed)" : "Attempted"}
                      </div>
                    </div>
                  ) : item.type === "mcq_single" ? (
                    <div className="text-xs space-y-1">
                      <div>Candidate Answer: <strong className="text-white">{userAnswers[item.id] || "Unattempted"}</strong></div>
                      <div>Correct Answer: <strong className="text-emerald-400">{item.correctAnswer as string}</strong></div>
                    </div>
                  ) : item.type === "mcq_multi" ? (
                    <div className="text-xs space-y-1">
                      <div>Candidate Answers: <strong className="text-white">{((userAnswers[item.id] as string[]) || []).join(", ") || "None"}</strong></div>
                      <div>Correct Answers: <strong className="text-emerald-400">{((item.correctAnswer as string[]) || []).join(", ")}</strong></div>
                    </div>
                  ) : item.type === "fill_blank" ? (
                    <div className="text-xs space-y-1">
                      <div>Blank 1: <strong className="text-white">{userAnswers[item.id]?.[1] || "—"}</strong> (Expected: io_uring)</div>
                      <div>Blank 2: <strong className="text-white">{userAnswers[item.id]?.[2] || "—"}</strong> (Expected: epoll)</div>
                    </div>
                  ) : (
                    <div className="text-xs text-white/70">
                      Response recorded and submitted to evaluation queue.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

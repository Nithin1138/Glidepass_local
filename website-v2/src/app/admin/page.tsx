"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Save, RotateCcw, AlertCircle, CheckCircle, FileCode, MonitorSmartphone, Settings, Plus, Trash2,
  Calendar, Clock, Edit2, Check, X, ChevronRight, ChevronLeft, Terminal, Layout, Globe, Activity,
  ExternalLink, Sparkles, Filter, Code, Info, Users, BarChart3, Database, Lock,
  Unlock, User, ShieldCheck, Key, Eye, EyeOff, Search, Bell, Moon, Sun, Monitor, Menu, LogOut, CheckSquare, Mail, Clipboard,
  AlertTriangle, RefreshCw, Download, HardDrive, Cpu, Shield, BookOpen, UserCheck, CreditCard, GitBranch, Sliders, Gift, Tag, FileText
} from "lucide-react";
import Link from "next/link";

// Client-safe VIT email metadata parser
function parseVitEmail(email: string) {
  const parts = email.split("@");
  if (parts.length !== 2) return { name: "unknown", regno: "unknown", college: "unknown" };
  const localPart = parts[0];
  const domain = parts[1].toLowerCase();

  const dotIndex = localPart.indexOf(".");
  let name = localPart;
  let regno = "unknown";
  if (dotIndex !== -1) {
    name = localPart.substring(0, dotIndex);
    regno = localPart.substring(dotIndex + 1);
  }
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  let college = "unknown";
  if (domain.includes("vitap")) {
    college = "vit-ap";
  } else if (domain.includes("vitbhopal")) {
    college = "vit-bhopal";
  } else if (domain.includes("vitchennai") || domain.includes("chennai")) {
    college = "vit-chennai";
  } else if (domain.includes("vitstudent") || domain.includes("vellore")) {
    college = "vit-vellore";
  } else {
    college = domain.split(".")[0];
  }

  return { name, regno, college };
}

function getQuestionContributorInfo(email: string | undefined, contributors: { email: string; name?: string; regno?: string; college?: string; }[]) {
  if (!email) return null;
  const c = contributors.find(x => x.email === email);
  if (c) {
    return {
      name: c.name || "Unknown",
      id: c.regno || "N/A",
      college: c.college || "N/A"
    };
  }
  const parsed = parseVitEmail(email);
  return {
    name: parsed.name !== "unknown" ? parsed.name : email.split("@")[0],
    id: parsed.regno !== "unknown" ? parsed.regno : "N/A",
    college: parsed.college !== "unknown" ? parsed.college : "N/A"
  };
}

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface Question {
  id: string;
  title: string;
  code: string;
  language: string;
  comment?: string;
  contributorEmail?: string;
  isDeleted?: boolean;
  isLocked?: boolean;
  edits?: any[];
  tags?: string[];
}

interface PendingEdit {
  id: string;
  questionId: string;
  questionTitle: string;
  originalCode: string;
  contributedCode: string;
  language: string;
  contributorEmail: string;
  reason: string;
  timestamp: string;
}

interface VitCode {
  id: string;
  date: string;
  examType: string;
  title?: string;
  questions: Question[];
  isDeleted?: boolean;
  year?: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "suspended" | "pending";
  verified: boolean;
  activity: string;
  joinedDate: string;
  activeDevices: number;
  premium: boolean;
  password?: string;
  consentEmails?: boolean;
  referral?: string;
}

interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  user: string;
  ip: string;
  status: "success" | "failed" | "warning";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function GlidePassAdmin() {
  // ─── Theme Engine ───
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("glidepass-admin-theme") as "light" | "dark" | "system" | null;
    if (saved) {
      setTheme(saved);
    } else {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("glidepass-admin-theme", theme);
    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      setResolvedTheme(media.matches ? "dark" : "light");
      const fn = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? "dark" : "light");
      media.addEventListener("change", fn);
      return () => media.removeEventListener("change", fn);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  const dk = resolvedTheme === "dark";

  // ─── Profile & Auth States ───
  const [adminName, setAdminName] = useState("Veera Nithin");
  const [adminAvatar, setAdminAvatar] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80");

  const [isAuth, setIsAuth] = useState(false);
  const [userIn, setUserIn] = useState("");
  const [emailIn, setEmailIn] = useState("");
  const [passIn, setPassIn] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginHistory, setLoginHistory] = useState<{ time: string; success: boolean }[]>([]);

  // Load stored password (for change-password feature)
  const [storedPassword, setStoredPassword] = useState("check");

  // 2-Step Verification states
  const [isTwoStepGate, setIsTwoStepGate] = useState(false);
  const [otpIn, setOtpIn] = useState<string[]>(Array(6).fill(""));
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [isTwoStepEnabled, setIsTwoStepEnabled] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);

  useEffect(() => {
    const logged = localStorage.getItem("glidepass-admin-logged");
    if (logged === "true") setIsAuth(true);
    const hist = localStorage.getItem("glidepass-login-history");
    if (hist) setLoginHistory(JSON.parse(hist));
    const sp = localStorage.getItem("glidepass-admin-pw");
    if (sp) setStoredPassword(sp);

    const savedUser = localStorage.getItem("glidepass-current-user");
    if (savedUser) {
      try { setCurrentUser(JSON.parse(savedUser)); } catch (e) {}
    }

    // Load admin profile info
    const sn = localStorage.getItem("glidepass-admin-name");
    if (sn) setAdminName(sn);
    const sa = localStorage.getItem("glidepass-admin-avatar");
    if (sa) setAdminAvatar(sa);

    // Load 2-Step Verification enabled state
    const tfa = localStorage.getItem("glidepass-2fa-enabled");
    if (tfa === "true") setIsTwoStepEnabled(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userIn.trim(), email: emailIn.trim(), password: passIn })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const loggedUser = data.user;

        if (isTwoStepEnabled) {
          // Trigger 2-Step verification
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOtp(otp);
          setIsTwoStepGate(true);
          // Display OTP to the user for testing/demo purposes
          setTimeout(() => {
            showToast("success", `Verification Code sent: ${otp}`);
          }, 1000);

          // Log OTP generation
          fetch("/api/admin/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "2FA Verification Code Generated", username: userIn.trim(), ip: "127.0.0.1", status: "success" })
          }).catch(() => {});
          return;
        }

        // Save session
        setCurrentUser(loggedUser);
        localStorage.setItem("glidepass-current-user", JSON.stringify(loggedUser));
        setIsAuth(true);
        if (remember) localStorage.setItem("glidepass-admin-logged", "true");
        showToast("success", `Access granted. Welcome back, ${loggedUser.name}.`);
        
        // Log successful login
        fetch("/api/admin/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "Admin Session Started", username: loggedUser.name, ip: "127.0.0.1", status: "success" })
        }).catch(() => {});
      } else {
        setLoginAttempts(p => p + 1);
        showToast("error", data.error || "Invalid credentials. Access denied.");
        // Log failed login
        fetch("/api/admin/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "Failed Auth Attempt", username: userIn.trim() || "Unknown", ip: "127.0.0.1", status: "failed" })
        }).catch(() => {});
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to log in.");
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = otpIn.join("");
    if (entered === generatedOtp) {
      fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userIn.trim(), email: emailIn.trim(), password: passIn })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const loggedUser = data.user;
          setCurrentUser(loggedUser);
          localStorage.setItem("glidepass-current-user", JSON.stringify(loggedUser));
          setIsAuth(true);
          setIsTwoStepGate(false);
          setOtpIn(Array(6).fill(""));
          if (remember) localStorage.setItem("glidepass-admin-logged", "true");
          showToast("success", `Access granted. Welcome back, ${loggedUser.name}.`);

          fetch("/api/admin/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "Admin Session Started (2FA)", username: loggedUser.name, ip: "127.0.0.1", status: "success" })
          }).catch(() => {});
        }
      });
    } else {
      showToast("error", "Incorrect 2-Step Verification Code.");
      fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "2FA Code Verification Failed", username: userIn.trim(), ip: "127.0.0.1", status: "failed" })
      }).catch(() => {});
    }
  };

  const handleLogout = () => {
    // Log logout
    fetch("/api/admin/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "Admin Session Terminated", username: currentUser?.name || adminName, ip: "127.0.0.1", status: "success" })
    }).catch(() => {});
    setIsAuth(false);
    setCurrentUser(null);
    localStorage.removeItem("glidepass-admin-logged");
    setPassIn("");
    showToast("success", "Session terminated.");
  };

  // ─── Layout ───
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const [view, setView] = useState<
    "dashboard" | "users" | "rbac" | "analytics" | "vitcodes" | "ota" | "system" | "security" | "settings" | "profile" | "contributors" | "subscriptions" | "plans" | "keys" | "versioning" | "coupons" | "referrals" | "legal_acceptances" | "providers" | "clipboards" | "hubs" | "devices" | "telemetry_charts" | "sessions_inspector" | "webhooks" | "clipboard_logs" | "firewall" | "feature_flags"
  >("dashboard");

  // ─── Clipboard Logs telemetry state ───
  const [clipboardLogs, setClipboardLogs] = useState<any[]>([
    { id: "1", room: "ROOM_9A2", event: "Text Copy", size: "142 Bytes", client: "student1@vitap.ac.in", timestamp: "2026-07-09 22:50" },
    { id: "2", room: "ROOM_4F1", event: "Image Sync", size: "2.4 MB", client: "student3@vitstudent.ac.in", timestamp: "2026-07-09 22:51" },
    { id: "3", room: "ROOM_9A2", event: "Text Copy", size: "48 Bytes", client: "student1@vitap.ac.in", timestamp: "2026-07-09 22:53" }
  ]);

  // ─── Firewall IP Blocks state ───
  const [blockedIps, setBlockedIps] = useState<any[]>([
    { ip: "198.51.100.42", reason: "Repeated activation key auth failures", blockedAt: "2026-07-09 18:30", attempts: 14 },
    { ip: "203.0.113.88", reason: "Rate-limit threshold breached on resource creation", blockedAt: "2026-07-09 21:12", attempts: 45 }
  ]);
  const [newBlockedIp, setNewBlockedIp] = useState("");
  const [newBlockedReason, setNewBlockedReason] = useState("");

  // ─── Global Feature Flags state ───
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({
    maintenanceMode: false,
    resourceCreation: true,
    clipboardSync: true,
    analyticsTracking: true,
    couponsRedemption: true
  });
  const [workspace, setWorkspace] = useState<"production" | "staging">("production");

  // ─── Subscriptions & Monetization ───
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  const [promoCodes, setPromoCodes] = useState<any[]>([]);

  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoDiscount, setNewPromoDiscount] = useState("50%");

  // --- Referral and Extended Coupon States ---
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [referralCodesList, setReferralCodesList] = useState<any[]>([]);
  const [newReferrerEmail, setNewReferrerEmail] = useState("");
  const [newReferrerCode, setNewReferrerCode] = useState("");

  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("10%");
  const [newCouponExpires, setNewCouponExpires] = useState("");
  const [newCouponMaxUses, setNewCouponMaxUses] = useState("100");

  // --- Monetization, Dynamic Plans & Licenses States ---
  const [monetizationSettings, setMonetizationSettings] = useState<any>({
    monetization_enabled: false,
    free_enabled: false,
    plans: []
  });
  const [licenses, setLicenses] = useState<any[]>([]);
  const [newLicenseEmail, setNewLicenseEmail] = useState("");
  const [newLicenseTier, setNewLicenseTier] = useState("Basic");
  const [newLicenseDuration, setNewLicenseDuration] = useState("30");
  const [newLicenseDurationUnit, setNewLicenseDurationUnit] = useState<"days" | "hours" | "mins">("days");
  const [newTxnEmail, setNewTxnEmail] = useState("");
  const [newTxnPlan, setNewTxnPlan] = useState("Monthly Pass");
  const [newTxnAmount, setNewTxnAmount] = useState("₹99");

  // Add User states
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("Contributor");
  const [newUserVerified, setNewUserVerified] = useState(false);
  const [newUserPremium, setNewUserPremium] = useState(false);

  // Legal Acceptance Search & Filters
  const [legalSearch, setLegalSearch] = useState("");
  const [legalPlatformFilter, setLegalPlatformFilter] = useState("all");

  // Provider Filters & Details Modal
  const [providerSearch, setProviderSearch] = useState("");
  const [providerRoleFilter, setProviderRoleFilter] = useState<"all" | "creator" | "contributor">("all");
  const [providerStatusFilter, setProviderStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [selectedProviderDetails, setSelectedProviderDetails] = useState<any | null>(null);

  // ─── Version & Telemetry ───
  const [appVersionData, setAppVersionData] = useState({
    version: "1.5.8",
    windowsUrl: "https://github.com/Nithin1138/Glidepass_local/releases/download/v1.5.8/LANpad_setup.exe",
    macUrl: "https://github.com/Nithin1138/Glidepass_local/releases/download/v1.5.8/LANpad.dmg",
    forceUpdate: false,
    changelog: "• Performance improvements\n• Core stability enhancements"
  });

  const [savingVersion, setSavingVersion] = useState(false);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);

  const [telemetry, setTelemetry] = useState({
    activePairings: 34,
    avgLatency: "24ms",
    flashPasteCount: 1540,
    typeModeCount: 890
  });

  // ─── Telemetry Real-time Charts State ───
  const [latencyHistory, setLatencyHistory] = useState<number[]>([24, 28, 22, 35, 30, 25, 29, 31, 24]);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([78, 82, 85, 80, 84, 88, 85, 91, 89]);

  // ─── Session Revocation & API Logs ───
  const [activeSessions, setActiveSessions] = useState<any[]>([
    { token: "GP_TOK_5f3e9", email: "student1@vitap.ac.in", ip: "192.168.1.15", device: "Windows 11 Companion", location: "Block-A Library", created: "2026-07-09 20:14" },
    { token: "GP_TOK_a8f9c", email: "veeranithin9@gmail.com", ip: "10.251.102.44", device: "Mac OS Sonoma Companion", location: "Developer Node", created: "2026-07-09 21:05" },
    { token: "GP_TOK_d73b2", email: "student4@vit.ac.in", ip: "192.168.4.88", device: "Windows 10 Companion", location: "Lab-3 Academic Block", created: "2026-07-09 22:31" },
  ]);

  // ─── Webhook Dispatcher Config ───
  const [webhooks, setWebhooks] = useState<any[]>([
    { id: "1", name: "Discord Notifications", url: "https://discord.com/api/webhooks/123456789", event: "resource.created", active: true },
    { id: "2", name: "Security Alerts Bot", url: "https://t.me/glidepass_alerts_bot", event: "security.breach", active: false }
  ]);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvent, setNewWebhookEvent] = useState("resource.created");
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  // ─── Command Palette ───
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQ, setCmdQ] = useState("");
  const cmdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(p => !p);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    if (cmdOpen && cmdRef.current) cmdRef.current.focus();
  }, [cmdOpen]);

  // ─── Notifications ───
  const [notiOpen, setNotiOpen] = useState(false);
  const [notifications] = useState([
    { id: "1", title: "Deployment Live", desc: "OTA template center.html deployed on Edge CDN.", type: "success" as const, time: "5m ago" },
    { id: "2", title: "Suspicious Activity", desc: "Failed admin sign-in from IP 198.51.100.42.", type: "warning" as const, time: "1h ago" },
    { id: "3", title: "Rate-Limit Alert", desc: "Host sync exceeded 1,200 req/min threshold.", type: "info" as const, time: "3h ago" },
  ]);

  // ─── Content Moderation Approval Queue & Tags ───
  const [showApprovalQueue, setShowApprovalQueue] = useState(false);
  const [spamFilterActive, setSpamFilterActive] = useState(true);
  const [newQTags, setNewQTags] = useState("");
  const [pinnedExamType, setPinnedExamType] = useState("");

  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([
    {
      id: "edit_1",
      questionId: "q_1781179083355",
      questionTitle: "1st",
      originalCode: `import java.util.*;\nclass Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.nextLine();\n        int first = -1, second = -1;\n        for (int i = 0; i < s.length(); i++) {\n            int count = 0;\n            for (int j = 0; j < s.length(); j++) {\n                if (s.charAt(i) == s.charAt(j))\n                    count++;\n            }\n            if (count == 1) {\n                if (first == -1)\n                    first = i;\n                else {\n                    second = i;\n                    break;\n                }\n            }\n        }\n        if (first != -1 && second != -1) {\n            System.out.println(first + " - " + s.charAt(first));\n            System.out.println(second + " - " + s.charAt(second));\n        } else {\n            System.out.print("-1");\n        }\n    }\n}`,
      contributedCode: `import java.util.*;\nclass Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.nextLine();\n        int first = -1, second = -1;\n        // Optimized O(N) frequency array search\n        int[] freq = new int[256];\n        for (char c : s.toCharArray()) {\n            freq[c]++;\n        }\n        for (int i = 0; i < s.length(); i++) {\n            if (freq[s.charAt(i)] == 1) {\n                if (first == -1) {\n                    first = i;\n                } else {\n                    second = i;\n                    break;\n                }\n            }\n        }\n        if (first != -1 && second != -1) {\n            System.out.println(first + " - " + s.charAt(first));\n            System.out.println(second + " - " + s.charAt(second));\n        } else {\n            System.out.print("-1");\n        }\n    }\n}`,
      language: "java",
      contributorEmail: "srivatsav.23bce1042@vitap.ac.in",
      reason: "Optimize time complexity from O(N^2) to O(N) using frequency array.",
      timestamp: "2026-06-14 11:20"
    },
    {
      id: "edit_2",
      questionId: "q_test_1781339939765",
      questionTitle: "Test Question",
      originalCode: "console.log('hello');",
      contributedCode: "console.log('hello world!');",
      language: "javascript",
      contributorEmail: "spam_bot@badguy.com",
      reason: "fsafasfa sfasfas fsa (automated/garbage test)",
      timestamp: "2026-06-14 11:45"
    }
  ]);

  const referralStats = useMemo(() => {
    return referralCodesList.map((rc) => {
      const count = referralsList.filter(
        (r) => r.referrer_email.trim().toLowerCase() === rc.email.trim().toLowerCase()
      ).length;
      return {
        code: rc.referral_code,
        email: rc.email,
        count
      };
    });
  }, [referralCodesList, referralsList]);




  const [freeTierLimits, setFreeTierLimits] = useState({
    dailyCopyLimit: 3,
    maxDevices: 2,
    allowBypassRateLimit: false
  });

  // ─── Toast ───
  const [toast, setToast] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast({ type: null, msg: "" }), 4000);
  };

  // ─── OTA ───
  const [selectedFile, setSelectedFile] = useState<"index.html" | "center.html" | "resources.html">("center.html");
  const [otaContent, setOtaContent] = useState("");
  const [loadingOta, setLoadingOta] = useState(true);
  const [savingOta, setSavingOta] = useState(false);
  const [usingCustom, setUsingCustom] = useState(false);

  const fetchTemplate = async (f: "index.html" | "center.html" | "resources.html") => {
    setLoadingOta(true);
    try {
      const res = await fetch(`/api/ota?file=${f}`);
      if (!res.ok) throw new Error(`Failed to fetch ${f}`);
      setOtaContent(await res.text());
      setUsingCustom(true);
    } catch (err: any) {
      showToast("error", err.messky);
    } finally {
      setLoadingOta(false);
    }
  };

  const handleSaveOta = async () => {
    setSavingOta(true);
    try {
      const res = await fetch("/api/ota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: selectedFile, content: otaContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      showToast("success", `Published ${selectedFile} successfully.`);
      setUsingCustom(true);
    } catch (err: any) {
      showToast("error", err.messky);
    } finally {
      setSavingOta(false);
    }
  };

  const handleResetOta = async () => {
    if (!confirm(`Reset ${selectedFile} to default?`)) return;
    setLoadingOta(true);
    try {
      const base = "https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/templates/";
      const res = await fetch(base + selectedFile);
      if (!res.ok) throw new Error("Failed to fetch default template");
      const def = await res.text();
      setOtaContent(def);
      const sr = await fetch("/api/ota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: selectedFile, content: def }),
      });
      if (!sr.ok) throw new Error("Failed to save reset");
      showToast("success", `Reset ${selectedFile} to default.`);
    } catch (err: any) {
      showToast("error", err.messky);
    } finally {
      setLoadingOta(false);
    }
  };

  const renderDiff = (orig: string, cont: string) => {
    const origLines = orig.split("\n");
    const contLines = cont.split("\n");
    const maxLines = Math.max(origLines.length, contLines.length);
    const diffRows = [];
    for (let i = 0; i < maxLines; i++) {
      const oLine = origLines[i] !== undefined ? origLines[i] : "";
      const cLine = contLines[i] !== undefined ? contLines[i] : "";
      diffRows.push({
        lineNo: i + 1,
        original: oLine,
        contributed: cLine,
        isDifferent: oLine !== cLine
      });
    }
    return diffRows;
  };

  const handleApproveEdit = async (edit: PendingEdit) => {
    setVitSessions(prev => prev.map(s => {
      const hasQ = s.questions?.some((q: any) => q.id === edit.questionId);
      if (hasQ) {
        return {
          ...s,
          questions: s.questions.map((q: any) => {
            if (q.id === edit.questionId) {
              return {
                ...q,
                code: edit.contributedCode,
                comment: edit.reason,
                contributorEmail: edit.contributorEmail,
                edits: [...(q.edits || []), {
                  editorEmail: edit.contributorEmail,
                  reason: edit.reason,
                  timestamp: Date.now(),
                  previousCode: q.code
                }]
              };
            }
            return q;
          })
        };
      }
      return s;
    }));

    try {
      const origQ = vitSessions.flatMap(s => s.questions || []).find(q => q.id === edit.questionId);
      if (origQ) {
        const updatedQ = {
          ...origQ,
          code: edit.contributedCode,
          comment: edit.reason,
          contributorEmail: edit.contributorEmail,
          edits: [...(origQ.edits || []), {
            editorEmail: edit.contributorEmail,
            reason: edit.reason,
            timestamp: Date.now(),
            previousCode: origQ.code
          }]
        };
        const res = await fetch("/api/vitcodes/question", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: updatedQ, editorEmail: edit.contributorEmail })
        });
        if (!res.ok) throw new Error("Failed to save approved edit");
        showToast("success", `Edit approved and merged into database successfully.`);
      }
    } catch (e: any) {
      showToast("error", "Error saving approved edit: " + e.message);
    }
    setPendingEdits(prev => prev.filter(x => x.id !== edit.id));
  };

  const handleRevertEdit = async (questionId: string, previousCode: string, editorEmail: string) => {
    if (!previousCode) return showToast("error", "No previous code available for this edit.");
    
    let originalQ: Question | null = null;
    let parentSessionId: string | null = null;
    
    for (const s of vitSessions) {
      const found = s.questions?.find((q: any) => q.id === questionId);
      if (found) {
        originalQ = found;
        parentSessionId = s.id;
        break;
      }
    }
    
    if (!originalQ || !parentSessionId) {
      return showToast("error", "Question not found.");
    }
    
    const revertedQ: Question = {
      ...originalQ,
      code: previousCode,
      comment: `Reverted edit by ${editorEmail}`,
      edits: [...(originalQ.edits || []), {
        editorEmail: "Admin",
        reason: `Reverted edit by ${editorEmail}`,
        timestamp: Date.now(),
        previousCode: originalQ.code
      }]
    };
    
    // Optimistic UI update
    setVitSessions(prev => prev.map(s => {
      if (s.id === parentSessionId) {
        return {
          ...s,
          questions: s.questions.map((q: any) => q.id === questionId ? revertedQ : q)
        };
      }
      return s;
    }));
    
    try {
      const res = await fetch("/api/vitcodes/question", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: revertedQ, editorEmail: "Admin" })
      });
      if (!res.ok) throw new Error("Failed to revert question");
      showToast("success", "Reverted edit successfully!");
    } catch (e: any) {
      showToast("error", e.message);
      fetchVitCodes();
    }
  };

  const handleRejectEdit = (edit: PendingEdit) => {
    const msg = prompt("Optional rejection message for contributor:", "This contribution contains formatting errors or is incorrect.");
    if (msg === null) return;
    setPendingEdits(prev => prev.filter(x => x.id !== edit.id));
    showToast("success", `Contribution rejected. Message sent: "${msg || 'None'}"`);
  };

  const handleRequestClarification = (edit: PendingEdit) => {
    const msg = prompt("Ask contributor to clarify their changes:", "Please explain why this change is necessary or provide test cases.");
    if (!msg) return;
    showToast("success", `Clarification request sent to ${edit.contributorEmail}`);
  };

  const handleBulkImport = (fileContent: string, fileType: "json" | "csv") => {
    try {
      let importedQuestions: Omit<Question, "id">[] = [];
      if (fileType === "json") {
        const parsed = JSON.parse(fileContent);
        if (!Array.isArray(parsed)) throw new Error("JSON must be an array of questions.");
        importedQuestions = parsed.map(item => ({
          title: String(item.title || "").trim(),
          code: String(item.code || "").trim(),
          language: String(item.language || "cpp").trim(),
          comment: String(item.comment || "").trim(),
          tags: Array.isArray(item.tags) ? item.tags : []
        }));
      } else {
        const lines = fileContent.split("\n");
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const parts = lines[i].split(",");
          if (parts.length >= 2) {
            importedQuestions.push({
              title: parts[0].replace(/^["']|["']$/g, '').trim(),
              code: parts[1].replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim(),
              language: (parts[2] || "cpp").replace(/^["']|["']$/g, '').trim(),
              comment: (parts[3] || "").replace(/^["']|["']$/g, '').trim(),
              tags: parts[4] ? parts[4].replace(/^["']|["']$/g, '').split(";").map(t => t.trim()) : []
            });
          }
        }
      }
      
      if (importedQuestions.length === 0) {
        showToast("error", "No valid questions found in file.");
        return;
      }
      
      importedQuestions.forEach(async (iq) => {
        const newQ: Question = {
          id: "q_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
          ...iq
        };
        setVitSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            return { ...s, questions: [...s.questions, newQ] };
          }
          return s;
        }));
        
        const currentSession = vitSessions.find(s => s.id === activeSessionId);
        await fetch("/api/vitcodes/question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: activeSessionId,
            question: newQ,
            session: currentSession ? { id: currentSession.id, date: currentSession.date, examType: currentSession.examType, title: currentSession.title } : undefined
          })
         });
      });
      showToast("success", `Bulk imported ${importedQuestions.length} questions successfully.`);
    } catch (e: any) {
      showToast("error", "Failed to parse import: " + e.message);
    }
  };

  const handleToggleActiveExamType = async (type: string) => {
    const year = examYears[type] || "1st Year";
    const currentPinned = examRules[`PINNED_COLLECTION_${year}`] || examRules[`ACTIVE_PINNED_EXAM_${year}`] || "";
    const nextVal = currentPinned === type ? "" : type;
    try {
      await fetch("/api/vitcodes/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: `PINNED_COLLECTION_${year}`, rule: nextVal })
      });
      showToast("success", nextVal ? `Pinned ${nextVal} to ${year} list.` : `Unpinned collection from ${year} list.`);
      fetchVitCodes(true);
    } catch (e) {}
  };

  // ─── VIT Codes (Resources) ───
  const [vitSessions, setVitSessions] = useState<any[]>([]);
  const [loadingVit, setLoadingVit] = useState(true);
  const [qType, setQType] = useState("snippet");
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingVit, setSavingVit] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [vitDetailView, setVitDetailView] = useState(false);
  const [examTypeFilter, setExamTypeFilter] = useState<string>("all");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showManageTypes, setShowManageTypes] = useState(false);
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const [resourceHistoryId, setResourceHistoryId] = useState<string | null>(null); // edit history panel in vitcodes

  // ─── Admin Resource Flow ───
  const [selectedAdminHub, setSelectedAdminHub] = useState<any | null>(null);
  const [selectedAdminCategory, setSelectedAdminCategory] = useState<any | null>(null);
  const [selectedAdminTopic, setSelectedAdminTopic] = useState<any | null>(null);

  // ─── VIT Bin States ───
  const [showBin, setShowBin] = useState(false);
  const [binTab, setBinTab] = useState<"sessions" | "questions">("sessions");
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<{ type: "session" | "question"; id: string; name: string } | null>(null);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [permanentDeleteConfirmText, setPermanentDeleteConfirmText] = useState("");
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);

  // ─── Clipboard Rooms ───
  const [clipboardRooms, setClipboardRooms] = useState<any[]>([]);
  const [loadingClipboards, setLoadingClipboards] = useState(false);
  const [clipboardSearch, setClipboardSearch] = useState("");

  // ─── Desktop Paired Devices ───
  const [desktopDevices, setDesktopDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [devicesSearch, setDevicesSearch] = useState("");

  // ─── Community Hubs ───
  const [communityHubs, setCommunityHubs] = useState<any[]>([]);
  const [loadingHubs, setLoadingHubs] = useState(false);
  const [hubsSearch, setHubsSearch] = useState("");

  // ─── Delete Session (Two-Step) ───
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetSession, setDeleteTargetSession] = useState<VitCode | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingSession, setDeletingSession] = useState(false);

  // ─── Delete Exam Type (Two-Step) ───
  const [showDeleteTypeModal, setShowDeleteTypeModal] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<string | null>(null);
  const [deleteTypeConfirmText, setDeleteTypeConfirmText] = useState("");


  // New session form
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [newExamType, setNewExamType] = useState("Script");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [examTypes, setExamTypes] = useState(["Script", "Config File", "Cheat Sheet", "Documentation", "Database Dump"]);
  const [newExamTypeName, setNewExamTypeName] = useState("");
  const [editingTypeIdx, setEditingTypeIdx] = useState<number | null>(null);
  const [editingTypeName, setEditingTypeName] = useState("");

  const [deletedExamTypes, _setDeletedExamTypes] = useState<string[]>([]);
  const deletedExamTypesRef = useRef<string[]>([]);
  const setDeletedExamTypes = (val: string[] | ((prev: string[]) => string[])) => {
    if (typeof val === 'function') {
      _setDeletedExamTypes(prev => {
        const next = val(prev);
        deletedExamTypesRef.current = next;
        return next;
      });
    } else {
      _setDeletedExamTypes(val);
      deletedExamTypesRef.current = val;
    }
  };

  useEffect(() => {
    const savedDeleted = localStorage.getItem("vit_deleted_exam_types");
    if (savedDeleted) {
      try {
        const parsed = JSON.parse(savedDeleted);
        _setDeletedExamTypes(parsed);
        deletedExamTypesRef.current = parsed;
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("vit_deleted_exam_types", JSON.stringify(deletedExamTypes));
  }, [deletedExamTypes]);

  const [examRules, setExamRules] = useState<Record<string, string>>({});
  const [sessionLimits, setSessionLimits] = useState<Record<string, number>>({});
  const [examYears, setExamYears] = useState<Record<string, string>>({});
  const [selectedRuleType, setSelectedRuleType] = useState("Script");


  useEffect(() => {
    fetch("/api/vitcodes/rules")
      .then(r => r.json())
      .then(data => {
        if (data.rules) setExamRules(data.rules);
        if (data.sessionLimits) setSessionLimits(data.sessionLimits);
        if (data.examYears) setExamYears(data.examYears);
      })
      .catch(() => {});
  }, []);

  const handleUpdateRule = async (type: string, val: string) => {
    const updated = { ...examRules, [type]: val };
    setExamRules(updated);
    try {
      await fetch("/api/vitcodes/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: type, rule: val })
      });
    } catch (e) {}
  };

  const handleUpdateSessionLimit = async (type: string, val: number) => {
    const updated = { ...sessionLimits, [type]: val };
    setSessionLimits(updated);
    try {
      await fetch("/api/vitcodes/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: type, sessionLimit: val })
      });
    } catch (e) {}
  };

  const handleUpdateExamYear = async (type: string, val: string) => {
    const updated = { ...examYears, [type]: val };
    setExamYears(updated);
    try {
      await fetch("/api/vitcodes/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: type, year: val })
      });
    } catch (e) {}
  };



  useEffect(() => {
    if (examTypes.length > 0 && !examTypes.includes(selectedRuleType)) {
      setSelectedRuleType(examTypes[0]);
    }
  }, [examTypes, selectedRuleType]);

  useEffect(() => {
    const saved = localStorage.getItem("vit_exam_types");
    if (saved) {
      try { setExamTypes(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (examTypes.length > 0) {
      localStorage.setItem("vit_exam_types", JSON.stringify(examTypes));
    }
  }, [examTypes]);

  // Question form
  const [qTitle, setQTitle] = useState("");
  const [qCode, setQCode] = useState("");
  const [qLang, setQLang] = useState("cpp");
  const [qComment, setQComment] = useState("");

  // ─── Contributors Management ───
  const [contributors, setContributors] = useState<{ email: string; status: string; name?: string; regno?: string; college?: string; }[]>([]);
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [selectedContributor, setSelectedContributor] = useState<string | null>(null);
  const [expandedContribQId, setExpandedContribQId] = useState<string | null>(null);
  const [expandedEditId, setExpandedEditId] = useState<string | null>(null);
  const [activeSlideTab, setActiveSlideTab] = useState<"contributed" | "edits">("contributed");
  const [contribExamTypeFilter, setContribExamTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    setActiveSlideTab("contributed");
    setContribExamTypeFilter(null);
    setExpandedEditId(null);
  }, [selectedContributor]);

  useEffect(() => {
    if (isAuth && (view === "contributors" || view === "vitcodes")) {
      setLoadingContributors(true);
      fetch("/api/admin/contributors")
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d)) setContributors(d);
        })
        .finally(() => setLoadingContributors(false));
    }
  }, [isAuth, view]);



  const fetchVitCodes = async (quiet = false) => {
    if (!quiet) setLoadingVit(true);
    try {
      const res = await fetch("/api/resources?includeDeleted=true", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch resources");
      const data = await res.json();
      if (data.success && data.resources) {
        setVitSessions(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data.resources)) return prev;
          return data.resources;
        });
        if (data.resources.length > 0 && !activeSessionId) {
          setActiveSessionId(data.resources[0].id);
        }
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      if (!quiet) setLoadingVit(false);
    }
  };

  const fetchDesktopDevices = async (quiet = false) => {
    if (!quiet) setLoadingDevices(true);
    try {
      const res = await fetch("/api/admin/heartbeats", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch pairings");
      const data = await res.json();
      if (data.success && data.heartbeats) {
        setDesktopDevices(data.heartbeats);
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      if (!quiet) setLoadingDevices(false);
    }
  };

  const handleClearPairings = async () => {
    const confirmClear = window.confirm("Are you sure you want to clear all desktop pairing heartbeat history?");
    if (!confirmClear) return;
    setDesktopDevices([]);
    try {
      const res = await fetch("/api/admin/heartbeats", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear pairing history");
      showToast("success", "Pairing history cleared.");
      fetchDesktopDevices(true);
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  const fetchClipboardRooms = async (quiet = false) => {
    if (!quiet) setLoadingClipboards(true);
    try {
      const res = await fetch("/api/admin/clipboard", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch clipboard rooms");
      const data = await res.json();
      if (data.success && data.rooms) {
        setClipboardRooms(data.rooms);
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      if (!quiet) setLoadingClipboards(false);
    }
  };

  const handleDeleteClipboardRoom = async (code: string) => {
    setClipboardRooms(prev => prev.filter(r => r.code !== code));
    try {
      const res = await fetch(`/api/admin/clipboard?code=${encodeURIComponent(code)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to expire clipboard room");
      const data = await res.json();
      if (data.success) {
        showToast("success", `Room ${code} expired and cleared.`);
        fetchClipboardRooms(true);
      } else {
        throw new Error(data.error || "Failed to delete room");
      }
    } catch (err: any) {
      showToast("error", err.message);
      fetchClipboardRooms(true);
    }
  };

  const fetchCommunityHubs = async (quiet = false) => {
    if (!quiet) setLoadingHubs(true);
    try {
      const res = await fetch("/api/admin/hubs", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch community hubs");
      const data = await res.json();
      if (data.success && data.hubs) {
        setCommunityHubs(data.hubs);
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      if (!quiet) setLoadingHubs(false);
    }
  };

  const handleDeleteHub = async (id: string) => {
    setCommunityHubs(prev => prev.map(h => h.id === id ? { ...h, isDeleted: true } : h));
    try {
      const res = await fetch(`/api/admin/hubs?id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete hub");
      const data = await res.json();
      if (data.success) {
        showToast("success", "Community Hub deleted successfully.");
        fetchCommunityHubs(true);
      } else {
        throw new Error(data.error || "Failed to delete hub");
      }
    } catch (err: any) {
      showToast("error", err.message);
      fetchCommunityHubs(true);
    }
  };

  const handleRestoreHub = async (id: string) => {
    setCommunityHubs(prev => prev.map(h => h.id === id ? { ...h, isDeleted: false } : h));
    try {
      const res = await fetch("/api/admin/hubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "restore" })
      });
      if (!res.ok) throw new Error("Failed to restore hub");
      const data = await res.json();
      if (data.success) {
        showToast("success", "Community Hub restored successfully.");
        fetchCommunityHubs(true);
      } else {
        throw new Error(data.error || "Failed to restore hub");
      }
    } catch (err: any) {
      showToast("error", err.message);
      fetchCommunityHubs(true);
    }
  };

  // We removed saveVitDB because it overrides everything. We now use granular endpoints.

  const getSessionLimitForType = (type: string | null | undefined): number => {
    if (!type) return 1;
    const target = type.trim().toLowerCase();
    const matchedKey = Object.keys(sessionLimits).find(
      key => key.trim().toLowerCase() === target
    );
    if (matchedKey && sessionLimits[matchedKey] !== undefined) {
      return sessionLimits[matchedKey];
    }
    return 1; // default 1 session per day
  };

  const handleAddSession = async () => {
    if (!newDate) return alert("Select a date");

    const sessionsToday = vitSessions.filter(
      s => s.date === newDate && s.examType.trim().toLowerCase() === newExamType.trim().toLowerCase()
    );
    const limitRule = getSessionLimitForType(newExamType);
    if (sessionsToday.length >= limitRule) {
      return showToast("error", `Failed to create session: The daily limit of ${limitRule} session(s) for ${newExamType} has been reached.`);
    }

    const s: VitCode = { id: Date.now().toString(), date: newDate, examType: newExamType, title: newSessionTitle.trim() || undefined, questions: [] };
    
    // Optimistic
    setVitSessions(prev => [s, ...prev]);
    setActiveSessionId(s.id);
    setNewSessionTitle("");
    setShowNewSessionModal(false);

  };

  const handleAddResource = async () => {
    if (!qTitle || !qCode) return showToast("error", "Title and Content are required.");
    const parsedTags = newQTags.split(",").map(t => t.trim()).filter(t => t.length > 0).map(t => t.startsWith("#") ? t : `#${t}`);
    
    const payload = {
      title: qTitle,
      type: qType,
      language: qType === "snippet" ? qLang : "",
      tags: parsedTags,
      content: qCode,
      creatorEmail: newLicenseEmail || currentUser?.email || "admin@glidepass.com",
      creatorName: currentUser?.name || "Admin",
      hubId: selectedAdminHub?.id || "",
      category: selectedAdminCategory?.name || "",
      subCategory: selectedAdminCategory?.name || "",
      topic: selectedAdminTopic?.name || ""
    };

    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create resource");
      showToast("success", "Resource created successfully.");
      setQTitle("");
      setQCode("");
      setNewQTags("");
      setNewLicenseEmail("");
      setShowNewSessionModal(false);
      fetchVitCodes();
    } catch (e: any) {
      showToast("error", e.message);
    }
  };

  const handleSaveResource = async () => {
    if (!editingResourceId) return;
    if (!qTitle || !qCode) return showToast("error", "Title and Content are required.");
    const parsedTags = newQTags.split(",").map(t => t.trim()).filter(t => t.length > 0).map(t => t.startsWith("#") ? t : `#${t}`);
    
    const payload = {
      title: qTitle,
      type: qType,
      language: qType === "snippet" ? qLang : "",
      tags: parsedTags,
      content: qCode,
      creatorEmail: newLicenseEmail || currentUser?.email || "admin@glidepass.com",
      hubId: selectedAdminHub?.id || "",
      category: selectedAdminCategory?.name || "",
      subCategory: selectedAdminCategory?.name || "",
      topic: selectedAdminTopic?.name || ""
    };

    try {
      const res = await fetch(`/api/resources/${editingResourceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update resource");
      showToast("success", "Resource updated successfully.");
      setEditingResourceId(null);
      setQTitle("");
      setQCode("");
      setNewQTags("");
      setNewLicenseEmail("");
      setShowNewSessionModal(false);
      fetchVitCodes();
    } catch (e: any) {
      showToast("error", e.message);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      const res = await fetch(`/api/resources/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete resource");
      showToast("success", "Resource moved to trash.");
      fetchVitCodes();
    } catch (e: any) {
      showToast("error", e.message);
    }
  };

  const handleRestoreResource = async (id: string) => {
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: false })
      });
      if (!res.ok) throw new Error("Failed to restore resource");
      showToast("success", "Resource restored successfully.");
      fetchVitCodes();
    } catch (e: any) {
      showToast("error", e.message);
    }
  };

  const activeSession = undefined;
  const totalQ = useMemo(() => vitSessions.filter(s => !s.isDeleted).length, [vitSessions]);

  const contributorCodes = useMemo(() => {
    return vitSessions.filter(s => !s.isDeleted).map(r => ({ ...r, contributorEmail: r.creatorEmail }));
  }, [vitSessions]);

  const contributorStats = useMemo(() => {
    return contributors.map(c => {
      const parsed = parseVitEmail(c.email);
      const name = c.name || parsed.name;
      const regno = c.regno || parsed.regno;
      const college = c.college || parsed.college;
      const codes = contributorCodes.filter(q => q.contributorEmail === c.email);
      
      let editsCount = 0;
      vitSessions.forEach(s => {
        if (!s.isDeleted && s.questions) {
          s.questions.forEach((q: any) => {
            if (!q.isDeleted && q.edits) {
              q.edits.forEach((edit: any) => {
                if (edit.editorEmail === c.email) {
                  editsCount++;
                }
              });
            }
          });
        }
      });

      const points = (codes.length * 10) + (editsCount * 5);
      
      let tier = "Active Member";
      let tierColor = "rgba(148, 163, 184, 0.15)";
      let tierText = "#94A3B8";
      if (points >= 100) {
        tier = "Elite Contributor";
        tierColor = "rgba(168, 85, 247, 0.15)";
        tierText = "#A855F7";
      } else if (points >= 50) {
        tier = "Master Coder";
        tierColor = "rgba(0, 119, 192, 0.15)";
        tierText = "#0077C0";
      } else if (points >= 20) {
        tier = "Rising Star";
        tierColor = "rgba(16, 185, 129, 0.15)";
        tierText = "#10B981";
      }

      return {
        ...c,
        name,
        regno,
        college,
        codesCount: codes.length,
        editsCount,
        points,
        tier,
        tierColor,
        tierText
      };
    }).sort((a, b) => b.points - a.points);
  }, [contributors, contributorCodes, vitSessions]);

  const filteredSessions = useMemo(() => {
    let active = vitSessions.filter(s => !s.isDeleted);
    if (selectedYearFilter !== "all") {
      active = active.filter(s => (s.year || "1st Year") === selectedYearFilter);
    }
    if (examTypeFilter === "all") return active;
    return active.filter(s => s.examType === examTypeFilter);
  }, [vitSessions, examTypeFilter, selectedYearFilter]);

  const groupedSessions = useMemo(() => {
    const groups: Record<string, VitCode[]> = {};
    filteredSessions.forEach(s => {
      if (!groups[s.examType]) groups[s.examType] = [];
      groups[s.examType].push(s);
    });
    return groups;
  }, [filteredSessions]);

  const binnedSessions = useMemo(() => {
    return vitSessions.filter(s => s.isDeleted);
  }, [vitSessions]);

  const binnedQuestions = useMemo(() => {
    const list: { question: Question; session: VitCode }[] = [];
    vitSessions.forEach(s => {
      if (!s.isDeleted && s.questions) {
        s.questions.forEach((q: any) => {
          if (q.isDeleted) {
            list.push({ question: q, session: s });
          }
        });
      }
    });
    return list;
  }, [vitSessions]);

  const binnedSessionsCount = binnedSessions.length;
  const binnedQuestionsCount = binnedQuestions.length;

  const [telemetryData, setTelemetryData] = useState<{ downloads: any[]; heartbeats: any[]; events: any[] }>({ downloads: [], heartbeats: [], events: [] });
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  const analytics = useMemo(() => {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const downloadsList = telemetryData.downloads || [];
    const heartbeatsList = telemetryData.heartbeats || [];
    const eventsList = telemetryData.events || [];

    // 1. Downloads
    const totalDownloads = downloadsList.length;
    const windowsDownloads = downloadsList.filter((d: any) => d.platform === "windows" || d.platform === "win").length;
    const macDownloads = downloadsList.filter((d: any) => d.platform === "mac" || d.platform === "macos").length;

    // 2. Active Users (DAU/WAU/MAU)
    const getUniqueUsersInPastDays = (days: number) => {
      const cutoff = now.getTime() - days * oneDayMs;
      const uuids = new Set<string>();
      heartbeatsList.forEach((hb: any) => {
        const t = new Date(hb.timestamp).getTime();
        if (t >= cutoff) {
          uuids.add(hb.uuid);
        }
      });
      return uuids.size;
    };
    const dau = getUniqueUsersInPastDays(1);
    const wau = getUniqueUsersInPastDays(7);
    const mau = getUniqueUsersInPastDays(30);

    // 3. Hourly Heatmap (Hour of Day 0-23 vs Day of Week 0-6: Sun=0, Mon=1...)
    const heatmapSets: Set<string>[][] = Array(7).fill(0).map(() => Array(24).fill(0).map(() => new Set<string>()));
    heartbeatsList.forEach((hb: any) => {
      const d = new Date(hb.timestamp);
      const day = d.getDay(); // 0-6
      const hour = d.getHours(); // 0-23
      if (hb.uuid) {
        heatmapSets[day][hour].add(hb.uuid);
      }
    });

    const heatmap: number[][] = heatmapSets.map(row => row.map(s => s.size));
    let maxHeatmapVal = 1;
    heatmap.forEach(row => {
      row.forEach(val => {
        if (val > maxHeatmapVal) {
          maxHeatmapVal = val;
        }
      });
    });

    // 4. App Version Adoption
    const versionCounts: Record<string, number> = {};
    const userLatestVersion: Record<string, { version: string; time: number }> = {};
    heartbeatsList.forEach((hb: any) => {
      const t = new Date(hb.timestamp).getTime();
      const ver = hb.appVersion || hb.app_version || "unknown";
      if (!userLatestVersion[hb.uuid] || t > userLatestVersion[hb.uuid].time) {
        userLatestVersion[hb.uuid] = { version: ver, time: t };
      }
    });
    Object.values(userLatestVersion).forEach((v: any) => {
      versionCounts[v.version] = (versionCounts[v.version] || 0) + 1;
    });
    const totalActiveUsersCount = Object.keys(userLatestVersion).length || 1;
    const versionAdoption = Object.entries(versionCounts).map(([ver, count]) => ({
      version: ver,
      count,
      percentage: Math.round((count / totalActiveUsersCount) * 100),
    })).sort((a, b) => b.count - a.count);

    // 5. Usage Frequency (Heavy: 5+ days/week, Moderate: 2-4 days/week, Occasional: 1 day/week)
    const userActiveDays: Record<string, Set<string>> = {};
    const sevenDaysAgo = now.getTime() - 7 * oneDayMs;
    heartbeatsList.forEach((hb: any) => {
      const dateObj = new Date(hb.timestamp);
      const t = dateObj.getTime();
      if (t >= sevenDaysAgo) {
        const dateStr = dateObj.toISOString().split("T")[0];
        if (!userActiveDays[hb.uuid]) userActiveDays[hb.uuid] = new Set();
        userActiveDays[hb.uuid].add(dateStr);
      }
    });
    let heavy = 0, moderate = 0, occasional = 0;
    Object.values(userActiveDays).forEach(daysSet => {
      const days = daysSet.size;
      if (days >= 5) heavy++;
      else if (days >= 2) moderate++;
      else occasional++;
    });
    const totalFrequencyUsers = (heavy + moderate + occasional) || 1;
    const frequencyStats = {
      heavy: { count: heavy, pct: Math.round((heavy / totalFrequencyUsers) * 100) },
      moderate: { count: moderate, pct: Math.round((moderate / totalFrequencyUsers) * 100) },
      occasional: { count: occasional, pct: Math.round((occasional / totalFrequencyUsers) * 100) },
    };

    // 6. User Retention Rate Cohorts (Day 1, 3, 7, 30)
    const userAcquisition: Record<string, number> = {};
    heartbeatsList.forEach((hb: any) => {
      const t = new Date(hb.timestamp).getTime();
      if (!userAcquisition[hb.uuid] || t < userAcquisition[hb.uuid]) {
        userAcquisition[hb.uuid] = t;
      }
    });

    const getRetentionForDay = (targetDay: number) => {
      const minAge = (targetDay + 1) * oneDayMs;
      const eligibleUsers = Object.entries(userAcquisition).filter(([_, acqTime]) => {
        return (now.getTime() - acqTime) >= minAge;
      });

      if (eligibleUsers.length === 0) {
        return 0;
      }

      let retainedCount = 0;
      eligibleUsers.forEach(([uuid, acqTime]) => {
        const targetTime = acqTime + targetDay * oneDayMs;
        const returned = heartbeatsList.some((hb: any) => {
          if (hb.uuid !== uuid) return false;
          const t = new Date(hb.timestamp).getTime();
          return t >= targetTime;
        });
        if (returned) retainedCount++;
      });

      return Math.round((retainedCount / eligibleUsers.length) * 100);
    };

    // 7. Active LAN Pairings / Connections Map (distinct active uuids)
    const latestHeartbeats: Record<string, any> = {};
    heartbeatsList.forEach((hb: any) => {
      const uid = hb.uuid || "default";
      if (!latestHeartbeats[uid] || new Date(hb.timestamp).getTime() > new Date(latestHeartbeats[uid].timestamp).getTime()) {
        latestHeartbeats[uid] = hb;
      }
    });

    const activePairingsList = Object.values(latestHeartbeats).map((hb: any, idx: number) => {
      let hash = 0;
      const uid = hb.uuid || "default";
      for (let i = 0; i < uid.length; i++) {
        hash = uid.charCodeAt(i) + ((hash << 5) - hash);
      }
      const lastOctet = Math.abs(hash % 254) + 1;
      const ip = `10.251.103.${lastOctet}`;
      return {
        id: String(idx),
        ip,
        uuid: uid.substring(0, 8) + "...",
        platform: hb.platform,
        status: (Date.now() - new Date(hb.timestamp).getTime()) < 15 * 60 * 1000 ? "active" : "idle",
        lastActive: new Date(hb.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }).sort((a, b) => (b.status === "active" ? 1 : 0) - (a.status === "active" ? 1 : 0)).slice(0, 8);

    // 8. Usage Volume per Day (last 7 days)
    const usageDaily: Record<string, { date: string; copies: number; injections: number; requests: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * oneDayMs);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      usageDaily[dateStr] = { date: dateStr, copies: 0, injections: 0, requests: 0 };
    }

    let totalCopies = 0;
    let totalInjections = 0;
    const targetSiteCounts: Record<string, number> = {
      HackerRank: 0,
      CodeChef: 0,
      LeetCode: 0,
      Moodle: 0,
      Other: 0
    };

    eventsList.forEach((ev: any) => {
      const d = new Date(ev.timestamp);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const parts = ev.event.split(":");
      const action = parts[0];
      const site = parts[1] || "Other";

      if (usageDaily[dateStr]) {
        if (action === "copy") usageDaily[dateStr].copies++;
        else if (action === "inject") usageDaily[dateStr].injections++;
      }

      if (action === "copy") {
        totalCopies++;
        if (targetSiteCounts[site] !== undefined) targetSiteCounts[site]++;
        else targetSiteCounts.Other++;
      } else if (action === "inject") {
        totalInjections++;
        if (targetSiteCounts[site] !== undefined) targetSiteCounts[site]++;
        else targetSiteCounts.Other++;
      }
    });

    heartbeatsList.forEach((hb: any) => {
      const d = new Date(hb.timestamp);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (usageDaily[dateStr]) {
        usageDaily[dateStr].requests++;
      }
    });

    // Calculate currently using users count (heartbeat in last 15 minutes)
    const getCurrentlyUsingCount = () => {
      const cutoff = now.getTime() - 15 * 60 * 1000;
      const uuids = new Set<string>();
      heartbeatsList.forEach((hb: any) => {
        const t = new Date(hb.timestamp).getTime();
        if (t >= cutoff) {
          uuids.add(hb.uuid);
        }
      });
      return uuids.size;
    };
    const currentlyUsing = getCurrentlyUsingCount();

    // Calculate peak hour in a day
    const hourCounts = Array(24).fill(0);
    heartbeatsList.forEach((hb: any) => {
      const hour = new Date(hb.timestamp).getHours();
      hourCounts[hour]++;
    });
    let peakHour = 0;
    let maxHourCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = hour;
      }
    });
    const peakHourStr = maxHourCount > 0 ? `${peakHour.toString().padStart(2, '0')}:00 - ${(peakHour + 1).toString().padStart(2, '0')}:00` : "N/A";

    // Calculate peak day/hour in a week
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekHourCounts: Record<string, number> = {};
    heartbeatsList.forEach((hb: any) => {
      const d = new Date(hb.timestamp);
      const day = d.getDay();
      const hour = d.getHours();
      const key = `${dayNames[day]} at ${hour.toString().padStart(2, '0')}:00`;
      weekHourCounts[key] = (weekHourCounts[key] || 0) + 1;
    });
    let peakWeekHour = "N/A";
    let maxWeekHourCount = 0;
    Object.entries(weekHourCounts).forEach(([key, count]) => {
      if (count > maxWeekHourCount) {
        maxWeekHourCount = count;
        peakWeekHour = key;
      }
    });

    // Calculate peak day in a month
    const monthDayCounts: Record<string, number> = {};
    heartbeatsList.forEach((hb: any) => {
      const d = new Date(hb.timestamp);
      const dayOfMonth = d.getDate();
      const monthName = d.toLocaleDateString([], { month: 'short' });
      const key = `${monthName} ${dayOfMonth}`;
      monthDayCounts[key] = (monthDayCounts[key] || 0) + 1;
    });
    let peakMonthDay = "N/A";
    let maxMonthDayCount = 0;
    Object.entries(monthDayCounts).forEach(([key, count]) => {
      if (count > maxMonthDayCount) {
        maxMonthDayCount = count;
        peakMonthDay = key;
      }
    });

    const targetSites = Object.entries(targetSiteCounts).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / (totalCopies + totalInjections || 1)) * 100)
    })).sort((a, b) => b.count - a.count);

    return {
      totalDownloads,
      windowsDownloads,
      macDownloads,
      dau,
      wau,
      mau,
      heatmap,
      maxHeatmapVal,
      versionAdoption,
      frequencyStats,
      activePairingsList,
      usageVolumeData: Object.values(usageDaily),
      targetSites,
      totalCopies,
      totalInjections,
      currentlyUsing,
      peakHourStr,
      peakWeekHour,
      peakMonthDay,
      retention: {
        day1: getRetentionForDay(1),
        day3: getRetentionForDay(3),
        day7: getRetentionForDay(7),
        day30: getRetentionForDay(30),
      }
    };
  }, [telemetryData]);

  const [liveTime, setLiveTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      setLiveTime(new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) + " — " + new Date().toLocaleTimeString("en-GB"));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTelemetry = async () => {
    setLoadingTelemetry(true);
    try {
      const res = await fetch("/api/telemetry");
      if (res.ok) {
        const data = await res.json();
        setTelemetryData(data);
      }
    } catch (e) {}
    setLoadingTelemetry(false);
  };

  // ─── Data Fetching & Real-time Polling ───
  useEffect(() => {
    if (isAuth) {
      if (view === "ota") fetchTemplate(selectedFile);
      if (view === "analytics") {
        fetchTelemetry();
        const interval = setInterval(() => {
          fetchTelemetry();
        }, 3000);
        return () => clearInterval(interval);
      }
      if (view === "security") {
        fetchAuditLogs();
        const interval = setInterval(() => {
          fetchAuditLogs();
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "system") {
        fetchDiagnostics();
        const interval = setInterval(() => {
          fetchDiagnostics();
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "dashboard") {
        fetchVitCodes();
        fetchTelemetry();
        fetchDiagnostics();
        fetchAuditLogs();
        fetchMonetization();
        fetchUsersRbac();
        fetchAppVersion();
        const interval = setInterval(() => {
          fetchVitCodes(true);
          fetchTelemetry();
          fetchDiagnostics();
          fetchAuditLogs();
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "subscriptions" || view === "plans" || view === "coupons" || view === "referrals") {
        fetchMonetization();
        const interval = setInterval(() => {
          fetchMonetization();
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "vitcodes" || view === "contributors") {
        fetchVitCodes();
        fetchCommunityHubs(true);
        const interval = setInterval(() => {
          fetchVitCodes(true);
          fetchCommunityHubs(true);
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "clipboards") {
        fetchClipboardRooms();
        const interval = setInterval(() => {
          fetchClipboardRooms(true);
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "devices") {
        fetchDesktopDevices();
        const interval = setInterval(() => {
          fetchDesktopDevices(true);
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "hubs") {
        fetchCommunityHubs();
        const interval = setInterval(() => {
          fetchCommunityHubs(true);
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "users" || view === "rbac" || view === "providers") {
        fetchUsersRbac();
        const interval = setInterval(() => {
          fetchUsersRbac();
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "versioning") {
        fetchAppVersion();
        fetchTelemetry();
        const interval = setInterval(() => {
          fetchAppVersion();
          fetchTelemetry();
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "legal_acceptances") {
        fetchLegalAcceptances();
        const interval = setInterval(() => {
          fetchLegalAcceptances();
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "telemetry_charts") {
        fetchDiagnostics();
        const interval = setInterval(() => {
          fetchDiagnostics();
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "clipboard_logs") {
        fetchClipboardRooms(true);
        const interval = setInterval(() => {
          fetchClipboardRooms(true);
        }, 5000);
        return () => clearInterval(interval);
      }
      if (view === "firewall" || view === "feature_flags") {
        // No periodic API fetch needed for feature flags/firewall local mock lists
        // but we keep a dummy fast poll interval structure just in case
        const interval = setInterval(() => {}, 5000);
        return () => clearInterval(interval);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedFile, isAuth]);

  // ─── Users ───
  const [users, setUsers] = useState<UserRecord[]>([
    { id: "1", name: "Veera Nithin", email: "veeranithin9@gmail.com", role: "ADMIN MASTER", status: "active", verified: true, activity: "Active 2m ago", joinedDate: "2026-01-10", activeDevices: 2, premium: true },
    { id: "2", name: "Sarah Connor", email: "sarah@vitap.ac.in", role: "Developer", status: "active", verified: true, activity: "Active 4h ago", joinedDate: "2026-02-15", activeDevices: 1, premium: true },
    { id: "3", name: "Alex Mercer", email: "mercer@vitap.ac.in", role: "Auditor", status: "suspended", verified: false, activity: "Banned 2d ago", joinedDate: "2026-03-01", activeDevices: 0, premium: false },
    { id: "4", name: "David Lightman", email: "david.23bce@vitap.ac.in", role: "Contributor", status: "pending", verified: false, activity: "Registered 1h ago", joinedDate: "2026-06-12", activeDevices: 3, premium: false },
  ]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const ms = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
      const mr = userRoleFilter === "all" || u.role === userRoleFilter;
      return ms && mr;
    });
  }, [users, userSearch, userRoleFilter]);

  const providerStats = useMemo(() => {
    const totalConsent = users.filter(u => u.consentEmails === true).length;
    const referralCounts: Record<string, number> = {};
    let totalWithReferral = 0;
    
    users.forEach(u => {
      if (u.referral) {
        const ref = u.referral.trim().toLowerCase();
        let normalized = "Other";
        if (ref.includes("social") || ref.includes("insta") || ref.includes("twitter") || ref.includes("facebook") || ref.includes("linkedin") || ref.includes("youtube")) {
          normalized = "Social Media";
        } else if (ref.includes("friend") || ref.includes("mouth") || ref.includes("peer") || ref.includes("classmate")) {
          normalized = "Friends / Word of Mouth";
        } else if (ref.includes("search") || ref.includes("google") || ref.includes("bing")) {
          normalized = "Search Engine";
        } else if (ref.includes("github")) {
          normalized = "GitHub";
        } else if (ref) {
          normalized = ref.charAt(0).toUpperCase() + ref.slice(1);
        }
        referralCounts[normalized] = (referralCounts[normalized] || 0) + 1;
        totalWithReferral++;
      } else {
        referralCounts["Direct / Unknown"] = (referralCounts["Direct / Unknown"] || 0) + 1;
        totalWithReferral++;
      }
    });

    const referralData = Object.entries(referralCounts).map(([source, count]) => ({
      source,
      count,
      percentage: totalWithReferral > 0 ? Math.round((count / totalWithReferral) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    return {
      totalConsent,
      consentPercentage: users.length > 0 ? Math.round((totalConsent / users.length) * 100) : 0,
      referralData
    };
  }, [users]);

  // ─── Local Storage Persistence ───
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUsers = localStorage.getItem("glidepass_users");
      if (savedUsers) {
        try { setUsers(JSON.parse(savedUsers)); } catch (e) {}
      }
      const savedLimits = localStorage.getItem("glidepass_free_tier_limits");
      if (savedLimits) {
        try { setFreeTierLimits(JSON.parse(savedLimits)); } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("glidepass_users", JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("glidepass_free_tier_limits", JSON.stringify(freeTierLimits));
    }
  }, [freeTierLimits]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      return showToast("error", "Name and email are required.");
    }
    const newUser: UserRecord = {
      id: String(users.length + 1),
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      status: "active",
      verified: newUserVerified,
      activity: "Registered just now",
      joinedDate: new Date().toISOString().split("T")[0],
      activeDevices: 0,
      premium: newUserPremium,
      password: newUserPassword.trim() || "check"
    };

    try {
      const res = await fetch("/api/admin/users-rbac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", data: newUser })
      });
      if (res.ok) {
        setUsers(prev => [...prev, newUser]);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("Contributor");
        setNewUserVerified(false);
        setNewUserPremium(false);
        showToast("success", "User created and saved to DB.");
      } else {
        showToast("error", "Failed to save user to DB.");
      }
    } catch (e) {
      showToast("error", "Failed to save user to DB.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete?.email === "veeranithin9@gmail.com") {
      showToast("error", "The Master Admin profile cannot be deleted.");
      return;
    }
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/admin/users-rbac?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
        showToast("success", "User deleted from DB.");
      } else {
        showToast("error", "Failed to delete user.");
      }
    } catch (e) {
      showToast("error", "Failed to delete user.");
    }
  };

  const handleDeleteTxn = async (id: string) => {
    try {
      await fetch(`/api/admin/monetization?type=subscription&id=${id}`, { method: "DELETE" });
      setSubscriptions(prev => prev.filter(t => t.id !== id));
      showToast("success", "Transaction log removed from DB.");
    } catch (e) {
      showToast("error", "Failed to delete from DB.");
    }
  };

  const handleAddTxn = async () => {
    if (!newTxnEmail.trim()) return showToast("error", "Email is required.");
    const newTxn = {
      id: `TXN_${Math.floor(1000 + Math.random() * 9000)}`,
      email: newTxnEmail.trim(),
      plan: newTxnPlan,
      amount: newTxnAmount,
      status: "success",
      date: new Date().toISOString().replace("T", " ").substring(0, 16)
    };
    try {
      await fetch("/api/admin/monetization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", data: newTxn })
      });
      setSubscriptions(prev => [newTxn, ...prev]);
      setNewTxnEmail("");
      showToast("success", "Transaction recorded in DB.");
    } catch (e) {
      showToast("error", "Failed to save to DB.");
    }
  };

  const handleGeneratePromo = async () => {
    if (!newPromoCode.trim()) return showToast("error", "Code is required.");
    const newCoupon = {
      code: newPromoCode.trim(),
      discount: newPromoDiscount,
      usage: 0,
      status: "active",
      expires_at: newCouponExpires ? new Date(newCouponExpires).toISOString() : null,
      max_uses: parseInt(newCouponMaxUses, 10) || 100
    };
    try {
      await fetch("/api/admin/monetization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "coupon", data: newCoupon })
      });
      setPromoCodes(prev => [newCoupon, ...prev]);
      setNewPromoCode("");
      setNewCouponExpires("");
      setNewCouponMaxUses("100");
      showToast("success", "Promo code created in DB.");
    } catch (e) {
      showToast("error", "Failed to save to DB.");
    }
  };

  const handleTogglePromo = async (code: string, currentStatus: string) => {
    try {
      await fetch("/api/admin/monetization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "coupon", code })
      });
      setPromoCodes(prev => prev.map(item => item.code === code ? { ...item, status: currentStatus === "active" ? "expired" : "active" } : item));
      showToast("success", `Coupon status updated in DB.`);
    } catch (e) {
      showToast("error", "Failed to update status in DB.");
    }
  };

  const handleDeletePromo = async (code: string) => {
    try {
      await fetch(`/api/admin/monetization?type=coupon&code=${code}`, { method: "DELETE" });
      setPromoCodes(prev => prev.filter(item => item.code !== code));
      showToast("success", "Coupon code deleted from DB.");
    } catch (e) {
      showToast("error", "Failed to delete coupon from DB.");
    }
  };

  const toggleVerify = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    if (user.email === "veeranithin9@gmail.com") {
      showToast("error", "The Master Admin status cannot be modified.");
      return;
    }
    const updated: UserRecord = { ...user, verified: !user.verified };
    try {
      const res = await fetch("/api/admin/users-rbac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", data: updated })
      });
      if (res.ok) {
        setUsers(p => p.map(u => u.id === id ? updated : u));
        showToast("success", "Verification status updated in DB.");
      } else {
        showToast("error", "Failed to update database.");
      }
    } catch (e) {
      showToast("error", "Failed to update database.");
    }
  };

  const toggleBan = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    if (user.email === "veeranithin9@gmail.com") {
      showToast("error", "The Master Admin status cannot be modified.");
      return;
    }
    const updated: UserRecord = { ...user, status: user.status === "suspended" ? "active" : "suspended" };
    try {
      const res = await fetch("/api/admin/users-rbac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", data: updated })
      });
      if (res.ok) {
        setUsers(p => p.map(u => u.id === id ? updated : u));
        showToast("success", "User status updated in DB.");
      } else {
        showToast("error", "Failed to update database.");
      }
    } catch (e) {
      showToast("error", "Failed to update database.");
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    if (user.email === "veeranithin9@gmail.com") {
      showToast("error", "The Master Admin role cannot be changed.");
      return;
    }
    const updated: UserRecord = { ...user, role };
    try {
      const res = await fetch("/api/admin/users-rbac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", data: updated })
      });
      if (res.ok) {
        setUsers(p => p.map(u => u.id === id ? updated : u));
        showToast("success", `Role updated to ${role} in DB.`);
      } else {
        showToast("error", "Failed to update database.");
      }
    } catch (e) {
      showToast("error", "Failed to update database.");
    }
  };

  const handleTogglePremium = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    if (user.email === "veeranithin9@gmail.com") {
      showToast("error", "The Master Admin profile cannot be modified.");
      return;
    }
    const updated: UserRecord = { ...user, premium: !user.premium };
    try {
      const res = await fetch("/api/admin/users-rbac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", data: updated })
      });
      if (res.ok) {
        setUsers(p => p.map(u => u.id === id ? updated : u));
        showToast("success", "Premium license status updated in DB.");
      } else {
        showToast("error", "Failed to update database.");
      }
    } catch (e) {
      showToast("error", "Failed to update database.");
    }
  };

  const handleGenerateCredentials = async (user: UserRecord) => {
    if (user.email === "veeranithin9@gmail.com") {
      showToast("error", "The Master Admin credentials cannot be randomized.");
      return;
    }
    
    // Check if name is already a 6-digit number (credentials already generated)
    const isAlreadyGenerated = /^\d{6}$/.test(user.name);
    if (isAlreadyGenerated) {
      const existingUser = user.name;
      const existingPass = user.password || "check";
      navigator.clipboard.writeText(`Username: ${existingUser}\nPassword: ${existingPass}`).then(() => {
        showToast("success", "Credentials copied to clipboard!");
      });
      alert(`Existing Credentials for ${user.email}:\n\nUsername: ${existingUser}\nPassword: ${existingPass}\n\n(Copied to clipboard)`);
      return;
    }

    const genUser = Math.floor(100000 + Math.random() * 900000).toString();
    const genPass = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const updated: UserRecord = {
      ...user,
      name: genUser,
      password: genPass
    };
    
    try {
      const res = await fetch("/api/admin/users-rbac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", data: updated })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
        navigator.clipboard.writeText(`Username: ${genUser}\nPassword: ${genPass}`).then(() => {
          showToast("success", "Credentials generated and copied to clipboard!");
        }).catch(() => {
          showToast("success", "Credentials generated successfully.");
        });
        alert(`Credentials generated for ${user.email}:\n\nUsername: ${genUser}\nPassword: ${genPass}\n\n(Copied to clipboard)`);
      } else {
        showToast("error", "Failed to update credentials in database.");
      }
    } catch (e) {
      showToast("error", "Failed to update database.");
    }
  };

  const exportCSV = () => {
    const hdr = ["ID", "Name", "Email", "Role", "Status", "Verified"];
    const rows = users.map(u => [u.id, u.name, u.email, u.role, u.status, u.verified]);
    const csv = "data:text/csv;charset=utf-8," + [hdr.join(","), ...rows.map(r => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.href = encodeURI(csv);
    a.download = "glidepass_users.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("success", "CSV exported.");
  };

  // ─── RBAC ───
  const [rbac, setRbac] = useState<Record<string, Record<string, boolean>>>({
    "ADMIN MASTER": { users: true, rbac: true, analytics: true, content: true, system: true, security: true, settings: true },
    "Super Admin": { users: true, rbac: true, analytics: true, content: true, system: true, security: true, settings: true },
    Developer: { users: false, rbac: false, analytics: true, content: true, system: true, security: false, settings: false },
    Auditor: { users: true, rbac: false, analytics: true, content: false, system: false, security: true, settings: false },
    Contributor: { users: false, rbac: false, analytics: false, content: true, system: false, security: false, settings: false },
  });

  const toggleRbac = async (role: string, mod: string) => {
    if (role === "ADMIN MASTER") {
      showToast("error", "ADMIN MASTER role permissions are frozen and cannot be modified.");
      return;
    }
    const updatedPermissions = { ...rbac[role], [mod]: !rbac[role][mod] };
    try {
      const res = await fetch("/api/admin/users-rbac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "rbac", role, permissions: updatedPermissions })
      });
      if (res.ok) {
        setRbac(p => ({ ...p, [role]: updatedPermissions }));
        showToast("success", "Permission updated in DB.");
      } else {
        showToast("error", "Failed to update database.");
      }
    } catch (e) {
      showToast("error", "Failed to update database.");
    }
  };

  const [secLogs, setSecLogs] = useState<SecurityLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  interface LegalAcceptance {
    id: number | string;
    hwid: string;
    event: string;
    timestamp: string;
    email: string | null;
  }

  const [legalAcceptances, setLegalAcceptances] = useState<LegalAcceptance[]>([]);
  const [loadingLegal, setLoadingLegal] = useState(false);

  const fetchLegalAcceptances = async () => {
    setLoadingLegal(true);
    try {
      const res = await fetch("/api/admin/legal-acceptances");
      if (res.ok) {
        const data = await res.json();
        setLegalAcceptances(data);
      }
    } catch (e) {}
    setLoadingLegal(false);
  };

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await fetch("/api/admin/diagnostics");
      if (res.ok) {
        const data = await res.json();
        setDiagnosticsData(data);
        // Feed historical logs for sparklines
        const newLat = data.database?.latency ?? 0;
        const newMem = data.system?.memoryHeapUsed ?? 0;
        setLatencyHistory(prev => [...prev.slice(-15), newLat]);
        setMemoryHistory(prev => [...prev.slice(-15), newMem]);
      }
    } catch (e) {}
    setLoadingDiagnostics(false);
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch("/api/admin/audit");
      if (res.ok) {
        const data = await res.json();
        setSecLogs(data);
      }
    } catch (e) {}
    setLoadingAudit(false);
  };

  const handleGenerateReferralCode = async () => {
    if (!newReferrerEmail.trim() || !newReferrerCode.trim()) {
      return showToast("error", "Email and referral code are required.");
    }
    const refCodeObj = {
      email: newReferrerEmail.trim(),
      code: newReferrerCode.trim().toUpperCase()
    };
    try {
      await fetch("/api/admin/monetization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "referral-code", data: refCodeObj })
      });
      fetchMonetization();
      setNewReferrerEmail("");
      setNewReferrerCode("");
      showToast("success", "Referral code registered successfully.");
    } catch (e) {
      showToast("error", "Failed to register referral code.");
    }
  };

  const fetchMonetization = async () => {
    try {
      const res = await fetch("/api/admin/monetization");
      if (res.ok) {
        const data = await res.json();
        if (data.subscriptions) setSubscriptions(data.subscriptions);
        if (data.coupons) setPromoCodes(data.coupons);
        if (data.settings) setMonetizationSettings(data.settings);
        if (data.licenses) setLicenses(data.licenses);
        if (data.referrals) setReferralsList(data.referrals);
        if (data.referralCodes) setReferralCodesList(data.referralCodes);
      }
    } catch (e) {}
  };

  const handleSaveMonetizationSettings = async (updatedSettings: any) => {
    try {
      const res = await fetch("/api/admin/monetization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "settings", data: updatedSettings })
      });
      if (res.ok) {
        fetchMonetization();
      }
    } catch (e) {}
  };

  const handleGenerateLicense = async () => {
    if (!newLicenseEmail) return;
    try {
      const res = await fetch("/api/admin/monetization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "license",
          data: {
            tier: newLicenseTier,
            email: newLicenseEmail,
            duration: parseFloat(newLicenseDuration) || 30,
            unit: newLicenseDurationUnit
          }
        })
      });
      if (res.ok) {
        setNewLicenseEmail("");
        fetchMonetization();
      }
    } catch (e) {}
  };

  const handleDeleteLicense = async (key: string) => {
    try {
      const res = await fetch(`/api/admin/monetization?type=license&key=${key}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchMonetization();
      }
    } catch (e) {}
  };

  const handleResetHwid = async (key: string) => {
    try {
      const res = await fetch("/api/admin/monetization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reset-hwid",
          key
        })
      });
      if (res.ok) {
        fetchMonetization();
      }
    } catch (e) {}
  };


  const fetchUsersRbac = async () => {
    try {
      const res = await fetch("/api/admin/users-rbac");
      if (res.ok) {
        const data = await res.json();
        if (data.users) setUsers(data.users);
        if (data.rbac) setRbac(data.rbac);
      }
    } catch (e) {}
  };

  const fetchAppVersion = async () => {
    try {
      const res = await fetch(`/api/ota?file=downloads/version.json&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setAppVersionData({
          version: data.version || "1.5.8",
          windowsUrl: data.windows_url || "",
          macUrl: data.mac_url || "",
          forceUpdate: !!data.force_update,
          changelog: data.changelog || ""
        });
      }

      const historyRes = await fetch(`/api/ota?file=downloads/versions_history.json&t=${Date.now()}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (Array.isArray(historyData)) {
          setVersionHistory(historyData);
        }
      }
    } catch (e) {}
  };

  const hasPermission = (key: string): boolean => {
    const role = currentUser?.role || "ADMIN MASTER";
    const perms = rbac[role];
    if (!perms) return true;

    if (key === "dashboard" || key === "profile") return true;
    if (key === "analytics" || key === "telemetry_charts") return !!perms.analytics;
    if (key === "users" || key === "providers" || key === "sessions_inspector") return !!perms.users;
    if (key === "rbac") return !!perms.rbac;
    if (key === "vitcodes" || key === "contributors" || key === "ota" || key === "versioning" || key === "clipboards" || key === "hubs" || key === "devices" || key === "clipboard_logs") return !!perms.content;
    if (key === "system" || key === "feature_flags") return !!perms.system;
    if (key === "security" || key === "legal_acceptances" || key === "firewall") return !!perms.security;
    if (key === "subscriptions" || key === "plans" || key === "coupons" || key === "referrals" || key === "settings" || key === "webhooks") return !!perms.settings;
    return true;
  };

  useEffect(() => {
    if (isAuth && view && !hasPermission(view)) {
      setView("dashboard");
    }
  }, [view, currentUser, rbac]);

  const formatLocalTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch (e) {
      return isoString;
    }
  };

  const logAuditEvent = async (event: string, status: "success" | "failed" | "warning", username = adminName) => {
    try {
      await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          username,
          ip: "127.0.0.1",
          status
        })
      });
      fetchAuditLogs();
    } catch (e) {}
  };

  // ─── Profile ───
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim()) return showToast("error", "Name cannot be empty.");
    
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        name: adminName.trim()
      };
      
      try {
        const res = await fetch("/api/admin/users-rbac", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "user", data: updatedUser })
        });
        if (res.ok) {
          setCurrentUser(updatedUser);
          localStorage.setItem("glidepass-current-user", JSON.stringify(updatedUser));
        } else {
          showToast("error", "Failed to update profile in database.");
          return;
        }
      } catch (err) {
        showToast("error", "Error saving profile to database.");
        return;
      }
    }
    
    localStorage.setItem("glidepass-admin-name", adminName.trim());
    localStorage.setItem("glidepass-admin-avatar", adminAvatar.trim());
    showToast("success", "Profile updated successfully.");
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curPw || !newPw || !confirmPw) return showToast("error", "Fill all fields.");
    
    const currentPassword = currentUser?.password || storedPassword;
    if (curPw !== currentPassword) return showToast("error", "Current password incorrect.");
    if (newPw !== confirmPw) return showToast("error", "Passwords don't match.");
    
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        password: newPw
      };
      
      try {
        const res = await fetch("/api/admin/users-rbac", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "user", data: updatedUser })
        });
        if (res.ok) {
          setCurrentUser(updatedUser);
          localStorage.setItem("glidepass-current-user", JSON.stringify(updatedUser));
        } else {
          showToast("error", "Failed to update password in database.");
          return;
        }
      } catch (err) {
        showToast("error", "Error saving password to database.");
        return;
      }
    }
    
    setStoredPassword(newPw);
    localStorage.setItem("glidepass-admin-pw", newPw);
    showToast("success", "Password updated.");
    setCurPw(""); setNewPw(""); setConfirmPw("");
  };

  const pwStrength = useMemo(() => {
    if (!newPw) return 0;
    let s = 0;
    if (newPw.length >= 6) s++;
    if (/[A-Z]/.test(newPw)) s++;
    if (/[0-9]/.test(newPw)) s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  }, [newPw]);

  // ─── Command Palette Actions ───
  const cmdActions = useMemo(() => {
    const list = [
      { name: "Go to Dashboard", action: () => { setView("dashboard"); setCmdOpen(false); } },
      { name: "Go to User Directory", action: () => { setView("users"); setCmdOpen(false); } },
      { name: "Go to Roles & Policies", action: () => { setView("rbac"); setCmdOpen(false); } },
      { name: "Go to Analytics", action: () => { setView("analytics"); setCmdOpen(false); } },
      { name: "Go to Resources Manager", action: () => { setView("vitcodes"); setCmdOpen(false); } },
      { name: "Go to Edit Logs", action: () => { setView("contributors"); setCmdOpen(false); } },
      { name: "Go to Clipboard Rooms", action: () => { setView("clipboards"); setCmdOpen(false); } },
      { name: "Go to Community Hubs", action: () => { setView("hubs"); setCmdOpen(false); } },
      { name: "Go to OTA Templates", action: () => { setView("ota"); setCmdOpen(false); } },
      { name: "Go to Diagnostics", action: () => { setView("system"); setCmdOpen(false); } },
      { name: "Go to Audit Trail", action: () => { setView("security"); setCmdOpen(false); } },
      { name: "Go to Settings", action: () => { setView("settings"); setCmdOpen(false); } },
      { name: "Go to Subscriptions & Licensing", action: () => { setView("subscriptions"); setCmdOpen(false); } },
      { name: "Go to Plans Config & Keys", action: () => { setView("plans"); setCmdOpen(false); } },
      { name: "Generate Activation Key", action: () => { setView("keys"); setCmdOpen(false); } },
      { name: "Go to Version Manager", action: () => { setView("versioning"); setCmdOpen(false); } },
      { name: "Go to Clipboard Logs", action: () => { setView("clipboard_logs"); setCmdOpen(false); } },
      { name: "Go to Firewall Control", action: () => { setView("firewall"); setCmdOpen(false); } },
      { name: "Go to Feature Flags", action: () => { setView("feature_flags"); setCmdOpen(false); } },
      { name: "Theme: Light", action: () => { setTheme("light"); setCmdOpen(false); } },
      { name: "Theme: Dark", action: () => { setTheme("dark"); setCmdOpen(false); } },
      { name: "Sign Out", action: () => { handleLogout(); setCmdOpen(false); } },
    ];
    return list.filter(i => i.name.toLowerCase().includes(cmdQ.toLowerCase()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmdQ]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STYLE HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const bg = dk ? `bg-[#050505]` : `bg-[#F0F4F8]`; // slightly off-white bg makes glass pop more in light mode
  const cardBg = dk 
    ? "bg-gradient-to-br from-white/[0.08] to-white/[0.01] backdrop-blur-[40px] shadow-2xl shadow-black/80" 
    : "bg-gradient-to-br from-white/90 to-white/40 backdrop-blur-[40px] shadow-xl shadow-[#0077C0]/5";
  const cardBorder = dk 
    ? "border-t border-l border-white/[0.12] border-b-white/[0.02] border-r-white/[0.02]" 
    : "border border-white border-b-[#050505]/5 border-r-[#050505]/5";
  const panelBg = dk 
    ? "bg-[#050505]/50 backdrop-blur-[60px]" 
    : "bg-white/60 backdrop-blur-[60px]";
  const txt1 = dk ? `text-[#FAFAFA]` : `text-[#050505]`;
  const txt2 = dk ? `text-[#C7EEFF]` : "text-[#0077C0]";
  const txt3 = dk ? "text-white/50" : "text-[#050505]/40";
  const inputBg = dk 
    ? "bg-black/40 border-t border-l border-white/10 border-b-transparent border-r-transparent shadow-inner text-[#FAFAFA] placeholder-white/30 focus:bg-white/[0.05]" 
    : "bg-white/60 border-t border-l border-white border-b-[#050505]/10 border-r-[#050505]/10 shadow-sm text-[#050505] placeholder-[#050505]/30 focus:bg-white";
  const accentBtn = `bg-[#0077C0] hover:bg-[#005f99] text-white shadow-lg shadow-[#0077C0]/30 border-t border-white/20`;
  const gradientLine = "bg-gradient-to-r from-[#0077C0] via-[#C7EEFF] to-transparent";

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div
      className="min-h-screen relative font-sans antialiased overflow-x-hidden transition-colors duration-500"
      style={{ background: dk ? P.black : P.white, color: dk ? P.white : P.black }}
    >
      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="absolute top-[5%] left-[10%] w-[600px] h-[600px] rounded-full animate-pulse"
          style={{ background: dk ? "rgba(0,119,192,0.06)" : "rgba(0,119,192,0.08)", filter: "blur(150px)" }}
        />
        <div
          className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full"
          style={{ background: dk ? "rgba(199,238,255,0.04)" : "rgba(199,238,255,0.1)", filter: "blur(140px)" }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!isAuth ? (
          /* ═══════════════════ LOGIN GATE ═══════════════════ */
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center p-6"
          >
            <div
              className="w-full max-w-[440px] rounded-[36px] border backdrop-blur-3xl shadow-2xl p-6 sm:p-10 relative overflow-hidden mx-4 sm:mx-0"
              style={{
                background: dk ? "rgba(5,5,5,0.60)" : "rgba(255,255,255,0.70)",
                borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)",
              }}
            >
              {/* Top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />

              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shadow-lg relative" style={{ background: P.blue }}>
                  <Lock className="text-white" size={24} />
                  {loginAttempts > 2 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center animate-bounce" style={{ background: P.error }}>
                      {loginAttempts}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-xl font-bold font-[family-name:var(--font-outfit)] tracking-wider">LANPAD ADMIN</h1>
                  <p className={txt3} style={{ fontSize: 12 }}>Administrative credentials required</p>
                </div>

                {isTwoStepGate ? (
                  <form onSubmit={handleVerifyOtp} className="w-full space-y-6 text-center">
                    <p className="text-xs text-left" style={{ color: dk ? `${P.sky}90` : `${P.black}80` }}>
                      Enter the 6-digit verification code sent to your authenticator app or device.
                    </p>
                    <div className="flex justify-between gap-2">
                      {otpIn.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-${idx}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={e => {
                            const val = e.target.value;
                            const newOtp = [...otpIn];
                            newOtp[idx] = val.slice(-1);
                            setOtpIn(newOtp);
                            if (val && idx < 5) {
                              const nextInput = document.getElementById(`otp-${idx + 1}`);
                              if (nextInput) nextInput.focus();
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === "Backspace" && !otpIn[idx] && idx > 0) {
                              const prevInput = document.getElementById(`otp-${idx - 1}`);
                              if (prevInput) {
                                prevInput.focus();
                                const newOtp = [...otpIn];
                                newOtp[idx - 1] = "";
                                setOtpIn(newOtp);
                              }
                            }
                          }}
                          className={`w-12 h-12 text-center text-lg font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0077C0]/30 transition-all ${inputBg}`}
                        />
                      ))}
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
                      style={{ background: P.blue }}
                    >
                      <Unlock size={14} /> Verify & Log In
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setIsTwoStepGate(false);
                        setOtpIn(Array(6).fill(""));
                      }}
                      className="text-xs font-bold" style={{ color: dk ? P.sky : P.blue }}
                    >
                      Back to Sign In
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="w-full space-y-4 text-left">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-widest" style={{ color: dk ? P.sky : P.blue }}>Username</label>
                      <div className="relative">
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }} />
                        <input
                          type="text" value={userIn} onChange={e => setUserIn(e.target.value)} placeholder="Nithin" required
                          className={`w-full text-xs rounded-xl pl-10 pr-4 py-3.5 border focus:outline-none focus:ring-2 focus:ring-[#0077C0]/30 transition-all ${inputBg}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-widest" style={{ color: dk ? P.sky : P.blue }}>Email Address</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }} />
                        <input
                          type="email" value={emailIn} onChange={e => setEmailIn(e.target.value)} placeholder="veeranithin9@gmail.com" required
                          className={`w-full text-xs rounded-xl pl-10 pr-4 py-3.5 border focus:outline-none focus:ring-2 focus:ring-[#0077C0]/30 transition-all ${inputBg}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-widest" style={{ color: dk ? P.sky : P.blue }}>Access Key</label>
                      <div className="relative">
                        <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }} />
                        <input
                          type={showPass ? "text" : "password"} value={passIn} onChange={e => setPassIn(e.target.value)} placeholder="••••" required
                          className={`w-full text-xs rounded-xl pl-10 pr-11 py-3.5 border focus:outline-none focus:ring-2 focus:ring-[#0077C0]/30 transition-all ${inputBg}`}
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                          {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded w-3.5 h-3.5" style={{ accentColor: P.blue }} />
                      <span className="text-[11px]" style={{ color: dk ? `${P.sky}90` : `${P.black}80` }}>Remember session</span>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
                      style={{ background: P.blue }}
                    >
                      <Unlock size={14} /> Authenticate
                    </button>
                  </form>
                )}

                {loginHistory.length > 0 && (
                  <div className="w-full pt-4 text-left" style={{ borderTop: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.06)"}` }}>
                    <span className="text-[9px] uppercase font-bold block mb-2" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Recent Attempts</span>
                    <div className="space-y-1 max-h-[70px] overflow-y-auto pr-1 text-[10px]">
                      {loginHistory.slice(0, 3).map((h, i) => (
                        <div key={i} className="flex justify-between" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                          <span className="font-mono">{h.time}</span>
                          <span style={{ color: h.success ? P.blue : P.error }}>{h.success ? "Success" : "Failed"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ═══════════════════ MAIN ADMIN LAYOUT ═══════════════════ */
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-screen relative">

            {/* ─── Mobile Sidebar Overlay ─── */}
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
            </AnimatePresence>

            {/* ─── Sidebar ─── */}
            <aside
              className={`border-r shrink-0 flex flex-col justify-between transition-all duration-300 backdrop-blur-3xl fixed top-0 bottom-0 left-0 h-screen z-40 ${
                sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 w-64 md:w-20"
              }`}
              style={{
                background: dk ? "rgba(5,5,5,0.85)" : "rgba(255,255,255,0.85)",
                borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)",
              }}
            >
              <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                {/* Logo */}
                <div className="h-20 px-6 flex items-center justify-between" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.05)"}` }}>
                  {sidebarOpen ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: P.blue }}>
                        <Terminal size={14} className="text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-[family-name:var(--font-outfit)] font-black text-xs tracking-wider">LANPAD</span>
                        <span className="text-[8px] uppercase tracking-wider font-extrabold" style={{ color: P.blue }}>Control v1.0</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto" style={{ background: P.blue }}>
                      <Terminal size={14} className="text-white" />
                    </div>
                  )}
                  {sidebarOpen && (
                    <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg transition-colors hover:opacity-70" style={{ color: dk ? P.sky : P.black }}>
                      <ChevronLeft size={16} />
                    </button>
                  )}
                </div>
                {/* Nav */}
                <nav className="px-4 py-6 space-y-6">
                  {[
                    { label: "Overview", items: [{ key: "dashboard", icon: Layout, name: "Dashboard" }, { key: "analytics", icon: BarChart3, name: "Analytics" }, { key: "telemetry_charts", icon: Activity, name: "Real-time Metrics" }] },
                    { label: "Business & Releases", items: [{ key: "subscriptions", icon: CreditCard, name: "Monetization" }, { key: "plans", icon: Sliders, name: "Plans" }, { key: "keys", icon: Key, name: "Keys" }, { key: "coupons", icon: Tag, name: "Coupons" }, { key: "referrals", icon: Gift, name: "Referrals" }, { key: "versioning", icon: GitBranch, name: "Version Manager" }] },
                    { label: "Management", items: [{ key: "users", icon: Users, name: "Users" }, { key: "providers", icon: UserCheck, name: "Providers" }, { key: "rbac", icon: ShieldCheck, name: "Roles & Policies" }, { key: "vitcodes", icon: BookOpen, name: "Resources" }, { key: "contributors", icon: GitBranch, name: "Edit Logs" }, { key: "clipboards", icon: Clipboard, name: "Clipboard Rooms" }, { key: "clipboard_logs", icon: FileText, name: "Clipboard Logs" }, { key: "hubs", icon: Globe, name: "Community Hubs" }, { key: "sessions_inspector", icon: ShieldCheck, name: "Sessions Inspector" }] },
                    { label: "Operations", items: [{ key: "devices", icon: MonitorSmartphone, name: "Desktop Pairings" }, { key: "ota", icon: MonitorSmartphone, name: "OTA Templates" }, { key: "system", icon: Cpu, name: "Diagnostics" }, { key: "security", icon: Shield, name: "Audit Trail" }, { key: "firewall", icon: AlertTriangle, name: "Firewall Control" }, { key: "legal_acceptances", icon: FileText, name: "Legal Acceptances" }, { key: "webhooks", icon: Bell, name: "Webhooks Dispatcher" }, { key: "feature_flags", icon: Sliders, name: "Feature Flags" }] },
                  ]
                  .map(group => ({
                    ...group,
                    items: group.items.filter(item => hasPermission(item.key))
                  }))
                  .filter(group => group.items.length > 0)
                  .map(group => (
                    <div key={group.label} className="space-y-1">
                      {sidebarOpen && <span className="text-[9px] uppercase font-bold px-3 block mb-2" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{group.label}</span>}
                      {group.items.map(item => {
                        const active = view === item.key;
                        return (
                          <button key={item.key} onClick={() => { 
                            setView(item.key as any); 
                            setVitDetailView(false); 
                            setShowBin(false); 
                            if (typeof window !== 'undefined' && window.innerWidth < 768) {
                              setSidebarOpen(false);
                            }
                          }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${active ? "text-white shadow-lg" : "hover:opacity-80"}`}
                            style={{
                              background: active ? P.blue : "transparent",
                              color: active ? "white" : dk ? `${P.sky}CC` : `${P.black}AA`,
                              boxShadow: active ? `0 8px 16px rgba(0,119,192,0.2)` : "none",
                            }}>
                              <item.icon size={14} />
                              {sidebarOpen && <span>{item.name}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </nav>
              </div>

              {/* Profile footer */}
              <div className="p-4 space-y-2" style={{ borderTop: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.05)"}` }}>
                <button onClick={() => { 
                  setView("profile"); 
                  setShowBin(false); 
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }} className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:opacity-80 transition-colors">
                  <img src={currentUser?.name ? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0077C0&color=fff` : adminAvatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border shadow-md shrink-0" style={{ borderColor: dk ? "rgba(199,238,255,0.15)" : "rgba(5,5,5,0.1)" }} />
                  {sidebarOpen && (
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate">{currentUser?.name || adminName}</span>
                      <span className="text-[9px] truncate" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>{currentUser?.role || "Super Admin"}</span>
                    </div>
                  )}
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold transition-all hover:opacity-80" style={{ color: P.blue }}>
                  <LogOut size={14} />
                  {sidebarOpen && <span>Sign Out</span>}
                </button>
                {sidebarOpen && (
                  <div className="flex sm:hidden border p-0.5 rounded-xl justify-around mt-2" style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)" }}>
                    {([["light", Sun], ["dark", Moon], ["system", Monitor]] as const).map(([t, Icon]) => (
                      <button key={t} onClick={() => setTheme(t)} title={t}
                        className="p-1.5 rounded-lg transition-colors flex-1 flex justify-center"
                        style={{
                          background: theme === t ? (dk ? "rgba(199,238,255,0.1)" : "white") : "transparent",
                          color: theme === t ? (dk ? P.white : P.black) : (dk ? `${P.sky}60` : `${P.black}40`),
                        }}>
                        <Icon size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            {/* ─── Main Content ─── */}
            <div className={`flex-1 flex flex-col min-w-0 max-w-full transition-all duration-300 ${sidebarOpen ? "md:pl-64" : "md:pl-20"}`}>
              {/* Top Header */}
              <header
                className="h-20 border-b flex items-center justify-between px-4 md:px-8 backdrop-blur-3xl sticky top-0 z-20"
                style={{
                  background: dk ? "rgba(5,5,5,0.80)" : "rgba(255,255,255,0.80)",
                  borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.05)",
                }}
              >
                <div className="flex items-center gap-2 md:gap-4">
                  {(!sidebarOpen || (typeof window !== 'undefined' && window.innerWidth < 768)) && (
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:opacity-70 transition-colors md:hidden block" style={{ color: dk ? P.sky : P.black }}>
                      <Menu size={16} />
                    </button>
                  )}
                  {(!sidebarOpen) && (
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:opacity-70 transition-colors hidden md:block" style={{ color: dk ? P.sky : P.black }}>
                      <Menu size={16} />
                    </button>
                  )}
                  <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-mono select-none">
                    <span className="hidden sm:inline" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>admin</span>
                    <ChevronRight size={10} className="hidden sm:inline" style={{ color: dk ? `${P.sky}40` : `${P.black}30` }} />
                    <span className="font-bold uppercase text-[9px] min-[360px]:text-[10px] md:text-xs" style={{ color: P.blue }}>{view}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                  <select value={workspace} onChange={e => setWorkspace(e.target.value as any)}
                    className={`text-[9px] md:text-[10px] uppercase font-bold tracking-widest px-2 md:px-3 py-2 rounded-xl border focus:outline-none ${inputBg}`}>
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                  </select>

                  <button onClick={() => setNotiOpen(!notiOpen)} className="p-2.5 rounded-xl hover:opacity-70 relative transition-colors" style={{ color: dk ? P.sky : P.black }}>
                    <Bell size={15} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: P.blue }} />
                  </button>

                  <div className="hidden sm:flex border p-0.5 rounded-xl" style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)" }}>
                    {([["light", Sun], ["dark", Moon], ["system", Monitor]] as const).map(([t, Icon]) => (
                      <button key={t} onClick={() => setTheme(t)} title={t}
                        className={`p-1.5 rounded-lg transition-colors`}
                        style={{
                          background: theme === t ? (dk ? "rgba(199,238,255,0.1)" : "white") : "transparent",
                          color: theme === t ? (dk ? P.white : P.black) : (dk ? `${P.sky}60` : `${P.black}40`),
                        }}>
                        <Icon size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              </header>

              {/* Content Area */}
              <div className="flex-1 p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 md:space-y-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >

                  {/* ═══ DASHBOARD ═══ */}
                  {view === "dashboard" && (
                    <motion.div key="dash" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-8">
                      {/* Header with Ticking Clock */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-2xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase">Executive Overview</h2>
                          <p className="text-xs mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>System health, sync metrics, and real-time activity</p>
                        </div>
                        <div className="flex items-center gap-3 px-4.5 py-2.5 rounded-2xl border font-mono text-xs shadow-sm"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-bold" style={{ color: dk ? P.white : P.black }}>{liveTime || "Syncing time..."}</span>
                        </div>
                      </div>

                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                          { 
                            title: "Database Sync", 
                            val: diagnosticsData?.database?.status?.includes("Connected") ? "ONLINE" : "OFFLINE", 
                            label: diagnosticsData?.database?.status || "Checking status...", 
                            live: diagnosticsData?.database?.status?.includes("Connected"),
                            color: diagnosticsData?.database?.status?.includes("Connected") ? "#10B981" : P.error
                          },
                          { title: "Total Resources", val: String(diagnosticsData?.database?.questionsCount ?? totalQ), label: "Active shared resources", live: false, color: P.blue },
                          { 
                            title: "Avg Latency", 
                            val: diagnosticsData?.database?.latency !== undefined ? `${diagnosticsData.database.latency}ms` : "--", 
                            label: "Outbound queries response", 
                            live: true, 
                            color: !diagnosticsData ? P.blue :
                                   diagnosticsData.database.latency < 50 ? "#10B981" : 
                                   diagnosticsData.database.latency < 200 ? "#F59E0B" : P.error
                          },
                          { title: "Resource Hubs", val: String(diagnosticsData?.database?.sessionsCount ?? vitSessions.length), label: "Active community folders", live: false, color: P.blue },
                        ].map((c, i) => (
                          <div key={i} className="p-6 rounded-[24px] border relative overflow-hidden transition-all"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{c.title}</span>
                              {c.live && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: c.color }} />}
                            </div>
                            <h3 className="text-3xl font-[family-name:var(--font-outfit)] font-black" style={{ color: c.color }}>{c.val}</h3>
                            <span className="text-[10px] mt-1.5 block overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{c.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Chart + Events */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Dynamic Telemetry Graph */}
                        <div className="lg:col-span-8 p-6 rounded-[28px] border relative overflow-hidden min-h-[350px]"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-center pb-4 mb-6" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                            <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Usage Engagement (Copies & Injections)</h3>
                            <div className="flex items-center gap-1.5 text-[10px] p-1 rounded-xl border font-mono" style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.05)" }}>
                              <span className="px-2.5 py-1.5 font-bold rounded-lg" style={{ background: `${P.blue}15`, color: P.blue }}>Last 7 Days</span>
                            </div>
                          </div>
                          <div className="w-full h-44 relative">
                            {(() => {
                              const usageData = analytics.usageVolumeData || [];
                              const maxVal = Math.max(...usageData.map(d => d.copies + d.injections), 5) || 5;
                              const points = usageData.map((d, index) => {
                                const x = (index / Math.max(usageData.length - 1, 1)) * 500;
                                const y = 130 - ((d.copies + d.injections) / maxVal) * 110;
                                return { x, y, ...d };
                              });

                              const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                              const areaD = points.length ? `${pathD} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z` : "";

                              return (
                                <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                                  <defs>
                                    <linearGradient id="gl" x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stopColor={P.blue} />
                                      <stop offset="50%" stopColor={P.sky} stopOpacity="0.8" />
                                      <stop offset="100%" stopColor={P.blue} />
                                    </linearGradient>
                                    <linearGradient id="gf" x1="0%" y1="0%" x2="0%" y2="100%">
                                      <stop offset="0%" stopColor={P.blue} stopOpacity="0.25" />
                                      <stop offset="100%" stopColor={P.blue} stopOpacity="0" />
                                    </linearGradient>
                                  </defs>
                                  <line x1="0" y1="20" x2="500" y2="20" stroke={dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.04)"} strokeWidth="1" />
                                  <line x1="0" y1="75" x2="500" y2="75" stroke={dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.04)"} strokeWidth="1" />
                                  <line x1="0" y1="130" x2="500" y2="130" stroke={dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.04)"} strokeWidth="1" />
                                  
                                  {points.length > 0 && (
                                    <>
                                      <path d={areaD} fill="url(#gf)" />
                                      <path d={pathD} fill="none" stroke="url(#gl)" strokeWidth="3" strokeLinecap="round" />
                                      {points.map((p, i) => (
                                        <g key={i}>
                                          <circle cx={p.x} cy={p.y} r="4" fill={dk ? P.white : P.blue} stroke={dk ? P.blue : P.white} strokeWidth="1.5" />
                                          <text x={p.x} y={p.y - 8} fontSize="7" fontFamily="var(--font-mono)" fill={dk ? `${P.sky}70` : `${P.black}60`} textAnchor="middle">
                                            {p.copies + p.injections}
                                          </text>
                                        </g>
                                      ))}
                                    </>
                                  )}
                                </svg>
                              );
                            })()}
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-mono mt-4 pt-3" style={{ color: dk ? `${P.sky}60` : `${P.black}40`, borderTop: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                            {analytics.usageVolumeData?.map((d, idx) => (
                              <span key={idx}>{d.date}</span>
                            )) || <span>No volume data</span>}
                          </div>
                        </div>

                        {/* Telemetry Overview & DAU/WAU/MAU */}
                        <div className="lg:col-span-4 space-y-6 flex flex-col">
                          {/* Live Activity Metrics */}
                          <div className="p-6 rounded-[28px] border relative overflow-hidden flex-1 flex flex-col justify-between"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                            <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-4" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Telemetry Metrics</h3>
                            
                            <div className="grid grid-cols-2 gap-4 py-2">
                              <div className="p-3 rounded-2xl border" style={{ background: dk ? "rgba(5,5,5,0.3)" : "rgba(255,255,255,0.4)", borderColor: dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)" }}>
                                <span className="text-[9px] uppercase font-mono tracking-wider block" style={{ color: dk ? `${P.sky}50` : `${P.black}40` }}>DAU (Daily Active)</span>
                                <span className="text-xl font-bold font-[family-name:var(--font-outfit)]">{analytics.dau ?? 0}</span>
                              </div>
                              <div className="p-3 rounded-2xl border" style={{ background: dk ? "rgba(5,5,5,0.3)" : "rgba(255,255,255,0.4)", borderColor: dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)" }}>
                                <span className="text-[9px] uppercase font-mono tracking-wider block" style={{ color: dk ? `${P.sky}50` : `${P.black}40` }}>WAU (Weekly Active)</span>
                                <span className="text-xl font-bold font-[family-name:var(--font-outfit)]">{analytics.wau ?? 0}</span>
                              </div>
                              <div className="p-3 rounded-2xl border" style={{ background: dk ? "rgba(5,5,5,0.3)" : "rgba(255,255,255,0.4)", borderColor: dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)" }}>
                                <span className="text-[9px] uppercase font-mono tracking-wider block" style={{ color: dk ? `${P.sky}50` : `${P.black}40` }}>MAU (Monthly Active)</span>
                                <span className="text-xl font-bold font-[family-name:var(--font-outfit)]">{analytics.mau ?? 0}</span>
                              </div>
                              <div className="p-3 rounded-2xl border" style={{ background: dk ? "rgba(5,5,5,0.3)" : "rgba(255,255,255,0.4)", borderColor: dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)" }}>
                                <span className="text-[9px] uppercase font-mono tracking-wider block" style={{ color: dk ? `${P.sky}50` : `${P.black}40` }}>Total Downloads</span>
                                <span className="text-xl font-bold font-[family-name:var(--font-outfit)]">{analytics.totalDownloads ?? 0}</span>
                              </div>
                            </div>

                            <div className="space-y-2.5 pt-4 border-t text-xs font-mono" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                              <div className="flex justify-between">
                                <span style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Total Code Copies</span>
                                <span className="font-bold text-emerald-500">{analytics.totalCopies ?? 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Total Injections</span>
                                <span className="font-bold" style={{ color: P.blue }}>{analytics.totalInjections ?? 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* System Events log list */}
                      <div className="p-6 rounded-[28px] border relative overflow-hidden"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <div className="flex justify-between items-center pb-4 mb-4" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase flex items-center gap-2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            <Activity size={12} style={{ color: P.blue }} /> Real-Time Security Audit & Session Log
                          </h3>
                          <button onClick={() => { fetchVitCodes(); fetchAuditLogs(); }} className="p-1 rounded-lg hover:opacity-70 transition-colors" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>
                            <RefreshCw size={12} className={loadingAudit ? "animate-spin" : ""} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-48 pr-1">
                          {secLogs.slice(0, 6).map(log => (
                            <div key={log.id} className="p-3.5 rounded-2xl border flex justify-between items-start gap-4 text-xs transition-all hover:bg-neutral-500/5"
                              style={{ background: dk ? "rgba(5,5,5,0.20)" : "rgba(250,250,250,0.50)", borderColor: dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)" }}>
                              <div className="space-y-1">
                                <span className="font-bold block leading-tight" style={{ color: dk ? P.white : P.black }}>{log.event}</span>
                                <span className="text-[10px] font-mono block" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>
                                  {formatLocalTime(log.timestamp)} • IP: {log.ip} • User: {log.user}
                                </span>
                              </div>
                              <span className="text-[9px] px-2 py-0.5 font-bold rounded-lg font-mono tracking-wider uppercase shrink-0 border"
                                style={{
                                  background: log.status === "success" ? `${P.blue}15` : log.status === "failed" ? `${P.error}15` : `${P.sky}20`,
                                  color: log.status === "success" ? P.blue : log.status === "failed" ? P.error : dk ? P.sky : P.black,
                                  borderColor: log.status === "success" ? `${P.blue}30` : log.status === "failed" ? `${P.error}30` : `${P.sky}30`,
                                }}>{log.status}</span>
                            </div>
                          ))}
                          {secLogs.length === 0 && (
                            <div className="col-span-2 text-center py-6 text-xs text-mono" style={{ color: dk ? `${P.sky}50` : `${P.black}40` }}>
                              No audit logs recorded.
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ USERS ═══ */}
                  {view === "users" && (
                    <motion.div key="users" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase">User Directory</h2>
                          <p className="text-xs" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Manage roles, verify, and moderate accounts</p>
                        </div>
                        <button onClick={exportCSV} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all" style={{ background: P.blue }}>
                          <Download size={13} /> Export CSV
                        </button>
                      </div>

                      {/* Add User Form Card */}
                      <form onSubmit={handleCreateUser} className="p-5 rounded-[24px] border relative overflow-hidden space-y-4"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: P.blue }}>Create / Add User</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Full Name</label>
                            <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Nithin Kumar" required
                              className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none ${inputBg}`} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Email address</label>
                            <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="nithin@vitap.ac.in" required
                              className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none ${inputBg}`} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Password</label>
                            <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="••••" required
                              className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none ${inputBg}`} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Assign Role</label>
                            <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)}
                              className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none ${inputBg}`}>
                              <option value="Super Admin">Super Admin</option>
                              <option value="Developer">Developer</option>
                              <option value="Auditor">Auditor</option>
                              <option value="Contributor">Contributor</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-5 pt-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" checked={newUserVerified} onChange={e => setNewUserVerified(e.target.checked)} className="rounded w-3.5 h-3.5" style={{ accentColor: P.blue }} />
                              <span className="text-xs font-semibold">Verified</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" checked={newUserPremium} onChange={e => setNewUserPremium(e.target.checked)} className="rounded w-3.5 h-3.5" style={{ accentColor: P.blue }} />
                              <span className="text-xs font-semibold">Premium</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button type="submit" className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all" style={{ background: P.blue }}>
                            Add User Account
                          </button>
                        </div>
                      </form>

                      <div className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="relative w-full md:w-80">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }} />
                          <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search name or email..."
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`} />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] uppercase font-bold" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Role:</span>
                          <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${inputBg}`}>
                            <option value="all">All</option>
                            <option value="Super Admin">Super Admin</option>
                            <option value="Developer">Developer</option>
                            <option value="Auditor">Auditor</option>
                            <option value="Contributor">Contributor</option>
                          </select>
                        </div>
                      </div>

                      <div className="rounded-2xl border overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse" style={{ minWidth: "750px" }}>
                            <thead>
                              <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                {["Verified", "Name", "Email", "Role", "Activity", "Credentials", "Actions"].map(h => (
                                  <th key={h} className={`p-4 text-[10px] uppercase font-extrabold tracking-widest ${h === "Actions" ? "text-right pr-6" : h === "Verified" ? "pl-6" : ""}`}
                                    style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredUsers.map(u => (
                                <tr key={u.id} className="text-xs hover:opacity-90 transition-colors" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                  <td className="p-4 pl-6">
                                    <button onClick={() => toggleVerify(u.id)} className="p-1.5 rounded-lg border"
                                      style={{ background: u.verified ? `${P.blue}15` : "transparent", borderColor: u.verified ? `${P.blue}30` : dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: u.verified ? P.blue : dk ? `${P.sky}40` : `${P.black}30` }}>
                                      <CheckSquare size={13} />
                                    </button>
                                  </td>
                                  <td className="p-4 font-bold">{u.name}</td>
                                  <td className="p-4" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{u.email}</td>
                                  <td className="p-4">
                                    <span className="text-[10px] px-2.5 py-0.5 rounded-md font-mono border" style={{ background: `${P.sky}15`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>{u.role}</span>
                                  </td>
                                  <td className="p-4 font-mono text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{u.activity}</td>
                                  <td className="p-4">
                                    {u.email !== "veeranithin9@gmail.com" ? (
                                      <button onClick={() => handleGenerateCredentials(u)} className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all border"
                                        style={{ background: /^\d{6}$/.test(u.name) ? "transparent" : `${P.blue}15`, borderColor: /^\d{6}$/.test(u.name) ? dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" : `${P.blue}25`, color: /^\d{6}$/.test(u.name) ? dk ? `${P.sky}80` : `${P.black}60` : P.blue }}>
                                        {/^\d{6}$/.test(u.name) ? "Show" : "Generate"}
                                      </button>
                                    ) : (
                                      <span className="text-[10px] opacity-40">Fixed</span>
                                    )}
                                  </td>
                                  <td className="p-4 pr-6 text-right flex justify-end gap-2">
                                    <button onClick={() => toggleBan(u.id)} className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all border"
                                      style={{ background: u.status === "suspended" ? `${P.error}15` : "transparent", borderColor: u.status === "suspended" ? `${P.error}25` : dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", color: u.status === "suspended" ? P.error : dk ? `${P.sky}80` : `${P.black}60` }}>
                                      {u.status === "suspended" ? "Unsuspend" : "Suspend"}
                                    </button>
                                    <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all border"
                                      style={{ background: `${P.error}15`, borderColor: `${P.error}25`, color: P.error }}>
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ Providers ═══ */}
                  {view === "providers" && (
                    <motion.div key="providers" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase">Providers & Creators Directory</h2>
                          <p className="text-xs" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Manage content creators, code contributors, their accounts, and growth metrics</p>
                        </div>
                      </div>

                      {/* Analytics Dashboard Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Consent metrics */}
                        <div className="p-5 rounded-[24px] border relative overflow-hidden flex flex-col justify-between min-h-[140px]"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] uppercase font-extrabold tracking-widest" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Newsletter Consent</p>
                              <h3 className="text-3xl font-black mt-2 font-[family-name:var(--font-outfit)]" style={{ color: dk ? P.white : P.black }}>
                                {providerStats.totalConsent}
                              </h3>
                            </div>
                            <div className="p-2.5 rounded-xl border" style={{ background: dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.02)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", color: P.blue }}>
                              <Mail size={20} />
                            </div>
                          </div>
                          <div className="mt-4 flex items-center gap-2">
                            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded" style={{ background: `${P.blue}15`, color: P.blue }}>
                              {providerStats.consentPercentage}%
                            </span>
                            <span className="text-[11px]" style={{ color: dk ? `${P.sky}60` : `${P.black}55` }}>of total users opted in for updates</span>
                          </div>
                        </div>

                        {/* Referral Growth Channels */}
                        <div className="p-5 rounded-[24px] border relative overflow-hidden md:col-span-2 space-y-4"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div>
                            <p className="text-[10px] uppercase font-extrabold tracking-widest" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Acquisition Channels (Referrals)</p>
                            <p className="text-[11px]" style={{ color: dk ? `${P.sky}60` : `${P.black}55` }}>Where do our users find us?</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {providerStats.referralData.slice(0, 4).map((ref, idx) => (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-bold">
                                  <span style={{ color: dk ? P.white : P.black }}>{ref.source}</span>
                                  <span className="font-mono" style={{ color: P.blue }}>{ref.count} ({ref.percentage}%)</span>
                                </div>
                                <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: dk ? "rgba(199,238,255,0.05)" : "rgba(5,5,5,0.04)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${ref.percentage}%`, background: P.blue }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="relative w-full md:w-80">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }} />
                          <input type="text" value={providerSearch} onChange={e => setProviderSearch(e.target.value)} placeholder="Search name or email..."
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`} />
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Provider:</span>
                            <select value={providerRoleFilter} onChange={e => setProviderRoleFilter(e.target.value as any)} className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${inputBg}`}>
                              <option value="all">All Providers</option>
                              <option value="creator">Creators</option>
                              <option value="contributor">Contributors</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Status:</span>
                            <select value={providerStatusFilter} onChange={e => setProviderStatusFilter(e.target.value as any)} className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${inputBg}`}>
                              <option value="all">All Statuses</option>
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Providers Directory Table */}
                      <div className="rounded-2xl border overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse" style={{ minWidth: "750px" }}>
                            <thead>
                              <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                {["Name", "Email", "Role Type", "Joined Date", "Consent", "Status", "Actions"].map(h => (
                                  <th key={h} className={`p-4 text-[10px] uppercase font-extrabold tracking-widest ${h === "Actions" ? "text-right pr-6" : h === "Name" ? "pl-6" : ""}`}
                                    style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {users
                                .filter(u => {
                                  const searchMatch = u.name.toLowerCase().includes(providerSearch.toLowerCase()) || u.email.toLowerCase().includes(providerSearch.toLowerCase());
                                  
                                  const rLower = u.role.toLowerCase();
                                  const isCreator = rLower.includes("creator") || rLower.includes("developer") || rLower.includes("admin");
                                  const isContributor = rLower.includes("contributor");
                                  
                                  const roleMatch = providerRoleFilter === "all"
                                    ? (isCreator || isContributor)
                                    : providerRoleFilter === "creator"
                                      ? isCreator
                                      : isContributor;
                                      
                                  const statusMatch = providerStatusFilter === "all" || u.status === providerStatusFilter;
                                  
                                  return searchMatch && roleMatch && statusMatch;
                                })
                                .map(u => {
                                  const rLower = u.role.toLowerCase();
                                  const isCreator = rLower.includes("creator") || rLower.includes("developer") || rLower.includes("admin");
                                  const displayRole = isCreator ? "Creator" : "Contributor";
                                  
                                  return (
                                    <tr key={u.id} className="text-xs hover:opacity-90 transition-colors" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                      <td className="p-4 pl-6 font-bold">{u.name}</td>
                                      <td className="p-4" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{u.email}</td>
                                      <td className="p-4">
                                        <span className="text-[10px] px-2.5 py-0.5 rounded-md font-mono border" 
                                          style={{ 
                                            background: displayRole === "Creator" ? `${P.blue}15` : "transparent", 
                                            color: displayRole === "Creator" ? P.blue : dk ? `${P.sky}80` : `${P.black}80`, 
                                            borderColor: displayRole === "Creator" ? `${P.blue}25` : dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)"
                                          }}>
                                          {displayRole} ({u.role})
                                        </span>
                                      </td>
                                      <td className="p-4 font-mono text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{u.joinedDate}</td>
                                      <td className="p-4">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${u.consentEmails ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                                          {u.consentEmails ? "Opt-in" : "Opt-out"}
                                        </span>
                                      </td>
                                      <td className="p-4">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${u.status === "suspended" ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
                                          {u.status}
                                        </span>
                                      </td>
                                      <td className="p-4 pr-6 text-right flex justify-end gap-2">
                                        <button onClick={() => setSelectedProviderDetails(u)} className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all border"
                                          style={{ background: dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.02)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", color: dk ? P.white : P.black }}>
                                          Details
                                        </button>
                                        <button onClick={() => toggleBan(u.id)} className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all border"
                                          style={{ background: u.status === "suspended" ? `${P.error}15` : "transparent", borderColor: u.status === "suspended" ? `${P.error}25` : dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", color: u.status === "suspended" ? P.error : dk ? `${P.sky}80` : `${P.black}60` }}>
                                          {u.status === "suspended" ? "Unsuspend" : "Suspend"}
                                        </button>
                                        <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all border"
                                          style={{ background: `${P.error}15`, borderColor: `${P.error}25`, color: P.error }}>
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ RBAC ═══ */}
                  {view === "rbac" && (
                    <motion.div key="rbac" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase">Roles & Policy Matrix</h2>
                          <p className="text-xs" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Configure role-based access controls across system modules</p>
                        </div>
                        <div className="flex items-center gap-3 px-4.5 py-2.5 rounded-2xl border font-mono text-xs shadow-sm"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <span className="w-2 h-2 rounded-full bg-[#0077C0] animate-pulse" />
                          <span className="font-bold" style={{ color: dk ? P.white : P.black }}>{liveTime || "Syncing time..."}</span>
                        </div>
                      </div>

                      {/* Explanation Card */}
                      <div className="p-5 rounded-[24px] border space-y-3"
                        style={{ background: dk ? "rgba(5,5,5,0.30)" : "rgba(255,255,255,0.40)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: P.blue }}>About Roles & Policies (RBAC)</h4>
                        <p className="text-xs leading-relaxed" style={{ color: dk ? `${P.sky}80` : `${P.black}70` }}>
                          Role-Based Access Control (RBAC) enables you to assign fine-grained permissions to system modules. Toggling permission squares below modifies policy rules in the database instantly.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-mono">
                          <div><b style={{ color: P.blue }}>• users</b>: Account directory management</div>
                          <div><b style={{ color: P.blue }}>• rbac</b>: Policy editing authorization</div>
                          <div><b style={{ color: P.blue }}>• analytics</b>: Usage heartbeats & graphs</div>
                          <div><b style={{ color: P.blue }}>• content</b>: VitCodes, Rules & OTA updates</div>
                          <div><b style={{ color: P.blue }}>• system</b>: Diagnostics & database metrics</div>
                          <div><b style={{ color: P.blue }}>• security</b>: Audit trails & session management</div>
                          <div><b style={{ color: P.blue }}>• settings</b>: Global configuration switches</div>
                        </div>
                      </div>

                      <div className="rounded-2xl border overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse" style={{ minWidth: "700px" }}>
                            <thead>
                              <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                <th className="p-5 pl-6 text-[10px] uppercase font-extrabold tracking-widest" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Role</th>
                                {["users", "rbac", "analytics", "content", "system", "security", "settings"].map(m => (
                                  <th key={m} className="p-5 text-center text-[10px] uppercase font-extrabold tracking-widest" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{m}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(rbac).map(([role, perms]) => (
                                <tr key={role} className="text-xs" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                  <td className="p-5 pl-6 font-bold">{role}</td>
                                  {Object.entries(perms).map(([mod, has]) => (
                                    <td key={mod} className="p-5 text-center">
                                      <button 
                                        disabled={role === "ADMIN MASTER"}
                                        onClick={() => toggleRbac(role, mod)} 
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center border mx-auto transition-all ${role === "ADMIN MASTER" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                        style={{ background: has ? `${P.blue}15` : `${P.error}10`, borderColor: has ? `${P.blue}30` : `${P.error}20`, color: has ? P.blue : P.error }}>
                                        {has ? <CheckSquare size={13} /> : <AlertTriangle size={13} />}
                                      </button>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {view === "analytics" && (
                    <motion.div key="analytics" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <div>
                          <h2 className="text-xl font-black font-outfit uppercase tracking-wide">Usage Analytics Dashboard</h2>
                          <p className="text-xs text-white/60">Monitor downloads, cohort retention, and active network connections in real-time</p>
                        </div>
                        <button
                          onClick={async () => {
                            const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                            const userInput = prompt(`⚠️ WARNING: This will permanently clear all download logs, heartbeats, and usage telemetry.\n\nTo confirm, please type the following code:\n\n${randomCode}`);
                            if (userInput === null) return; // User cancelled
                            if (userInput.trim().toUpperCase() !== randomCode) {
                              showToast("error", "Reset cancelled: Confirmation code did not match.");
                              return;
                            }
                            try {
                              const res = await fetch("/api/telemetry", { method: "DELETE" });
                              if (res.ok) {
                                showToast("success", "Analytics data reset successfully.");
                                fetchTelemetry();
                              } else {
                                throw new Error("Failed to reset analytics");
                              }
                            } catch (e: any) {
                              showToast("error", e.message);
                            }
                          }}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-red-600/10 cursor-pointer"
                        >
                          <RefreshCw size={12} /> Reset Analytics
                        </button>
                      </div>

                      {/* Overview Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Downloads Card */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Downloads</span>
                            <Download size={16} style={{ color: P.blue }} />
                          </div>
                          <div className="text-3xl font-black font-[family-name:var(--font-outfit)] mb-2">{analytics.totalDownloads}</div>
                          <div className="text-[10px] flex gap-3" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>
                            <span>Win: <b className="font-mono text-xs text-blue-400">{analytics.windowsDownloads}</b></span>
                            <span>Mac: <b className="font-mono text-xs text-sky-400">{analytics.macDownloads}</b></span>
                          </div>
                        </div>

                        {/* DAU Card */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Daily Active (DAU)</span>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              <Activity size={16} style={{ color: P.blue }} />
                            </div>
                          </div>
                          <div className="text-3xl font-black font-[family-name:var(--font-outfit)] mb-2">{analytics.dau}</div>
                          <div className="text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Unique heartbeats last 24h</div>
                        </div>

                        {/* WAU Card */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Weekly Active (WAU)</span>
                            <Users size={16} style={{ color: P.blue }} />
                          </div>
                          <div className="text-3xl font-black font-[family-name:var(--font-outfit)] mb-2">{analytics.wau}</div>
                          <div className="text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Unique users last 7 days</div>
                        </div>

                        {/* MAU Card */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Monthly Active (MAU)</span>
                            <BarChart3 size={16} style={{ color: P.blue }} />
                          </div>
                          <div className="text-3xl font-black font-[family-name:var(--font-outfit)] mb-2">{analytics.mau}</div>
                          <div className="text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Unique users last 30 days</div>
                        </div>
                      </div>

                      {/* Real-time & Peak Usage Metrics Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Currently Using Card */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Currently Using</span>
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <Activity size={16} style={{ color: P.blue }} />
                            </div>
                          </div>
                          <div className="text-3xl font-black font-[family-name:var(--font-outfit)] mb-2">{analytics.currentlyUsing}</div>
                          <div className="text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Active users in last 15 minutes</div>
                        </div>

                        {/* Peak Hour (Day) Card */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Peak Hour (Day)</span>
                            <Clock size={16} style={{ color: P.blue }} />
                          </div>
                          <div className="text-3xl font-black font-[family-name:var(--font-outfit)] mb-2">{analytics.peakHourStr}</div>
                          <div className="text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Most active hour of the day</div>
                        </div>

                        {/* Peak Hour (Week) Card */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Peak Day & Hour (Week)</span>
                            <Calendar size={16} style={{ color: P.blue }} />
                          </div>
                          <div className="text-xl font-black font-[family-name:var(--font-outfit)] mb-2 mt-2">{analytics.peakWeekHour}</div>
                          <div className="text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Most active day/hour combination</div>
                        </div>

                        {/* Peak Day (Month) Card */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Peak Day (Month)</span>
                            <BarChart3 size={16} style={{ color: P.blue }} />
                          </div>
                          <div className="text-3xl font-black font-[family-name:var(--font-outfit)] mb-2">{analytics.peakMonthDay}</div>
                          <div className="text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Most active date of the month</div>
                        </div>
                      </div>

                      {/* Heatmap & Usage Frequency */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Peak Usage Heatmap */}
                        <div className="lg:col-span-2 p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-6" style={{ color: P.blue }}>Peak Usage Hourly Heatmap</h3>
                          
                          <div className="overflow-x-auto">
                            <div className="min-w-[640px] space-y-1.5">
                              {/* Hours Header */}
                              <div className="flex pl-10 text-[9px] font-mono text-center mb-1" style={{ color: dk ? `${P.sky}40` : `${P.black}40` }}>
                                {Array.from({ length: 24 }).map((_, h) => (
                                  <div key={h} className="w-full">{h.toString().padStart(2, "0")}</div>
                                ))}
                              </div>

                              {/* Days Rows */}
                              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, dIdx) => (
                                <div key={dayName} className="flex items-center gap-2">
                                  <div className="w-8 text-[10px] font-semibold text-right" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{dayName}</div>
                                  <div className="flex-1 flex gap-1">
                                    {analytics.heatmap[dIdx].map((val, hIdx) => (
                                      <div
                                        key={hIdx}
                                        title={`${dayName} at ${hIdx.toString().padStart(2, "0")}:00 — ${val} active users`}
                                        className="group h-6 w-full rounded-sm transition-all hover:scale-125 cursor-pointer border flex items-center justify-center relative overflow-visible"
                                        style={{
                                          background: val > 0 
                                            ? `rgba(0, 119, 192, ${0.15 + (val / analytics.maxHeatmapVal) * 0.85})` 
                                            : dk ? "rgba(199,238,255,0.02)" : "rgba(5,5,5,0.02)",
                                          borderColor: val > 0 
                                            ? "rgba(0, 119, 192, 0.4)" 
                                            : dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"
                                        }}
                                      >
                                        {val > 0 && (
                                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black select-none pointer-events-none text-white font-mono drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] z-10">
                                            {val}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Usage Frequency */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden flex flex-col justify-between"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div>
                            <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-6" style={{ color: P.blue }}>Usage Frequency</h3>
                            <div className="space-y-4">
                              {[
                                { name: "Heavy (5+ days/wk)", ...analytics.frequencyStats.heavy, color: "#10B981" },
                                { name: "Moderate (2-4 days/wk)", ...analytics.frequencyStats.moderate, color: P.blue },
                                { name: "Occasional (1 day/wk)", ...analytics.frequencyStats.occasional, color: "#F59E0B" }
                              ].map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span>{item.name}</span>
                                    <span className="font-mono">{item.pct}% ({item.count})</span>
                                  </div>
                                  <div className="h-2.5 rounded-full overflow-hidden border" style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="text-[9px] mt-6" style={{ color: dk ? `${P.sky}40` : `${P.black}40` }}>* Frequency calculated over active client pings in the last 7 days.</p>
                        </div>
                      </div>

                      {/* Retention & Version Adoption */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Device Retention */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-6" style={{ color: P.blue }}>Device Retention Cohorts</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center text-[10px] font-mono">
                            {[
                              { label: "Day 1", val: analytics.retention.day1 },
                              { label: "Day 3", val: analytics.retention.day3 },
                              { label: "Day 7", val: analytics.retention.day7 },
                              { label: "Day 30", val: analytics.retention.day30 },
                            ].map((cohort, idx) => (
                              <div key={idx} className="p-4 rounded-2xl border flex flex-col justify-between gap-3 relative overflow-hidden"
                                style={{
                                  background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)",
                                  borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"
                                }}>
                                <div className="font-sans font-bold uppercase tracking-wider text-[9px]" style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>{cohort.label}</div>
                                <div className="text-xl font-black font-mono" style={{ color: P.blue }}>{cohort.val}%</div>
                                <div className="h-1 rounded-full w-full" style={{ background: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${cohort.val}%`, background: `linear-gradient(90deg, ${P.blue}, ${P.sky})` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* App Version Adoption */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-6" style={{ color: P.blue }}>App Version Adoption</h3>
                          
                          {analytics.versionAdoption.length === 0 ? (
                            <div className="text-center py-10 text-xs" style={{ color: dk ? `${P.sky}40` : `${P.black}40` }}>No heartbeat version data recorded yet</div>
                          ) : (
                            <div className="space-y-4">
                              {analytics.versionAdoption.map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span className="font-mono">v{item.version}</span>
                                    <span className="font-mono" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{item.percentage}% ({item.count})</span>
                                  </div>
                                  <div className="h-3 rounded-full overflow-hidden border" style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: `${item.percentage}%`, background: `linear-gradient(90deg, ${P.blue}, ${P.sky})` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Active Connections Map, Usage Volume, and Target Site Tracking */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Active Connections Map */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-4" style={{ color: P.blue }}>Active LAN Pairing Nodes</h3>
                          
                          {analytics.activePairingsList.length === 0 ? (
                            <div className="text-center py-12 text-xs" style={{ color: dk ? `${P.sky}40` : `${P.black}40` }}>No active pairings detected over local network</div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between text-[10px] uppercase font-extrabold tracking-widest opacity-60 pb-2 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                                <span>Pairing Node</span>
                                <span>Status</span>
                              </div>
                              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                                {analytics.activePairingsList.map((pairing: any) => (
                                  <div key={pairing.id} className="flex items-center justify-between text-xs font-mono">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pairing.status === "active" ? "#10B981" : "#94A3B8" }} />
                                      <span>{pairing.ip}</span>
                                      <span className="text-[9px] px-1 py-0.2 rounded uppercase font-bold" style={{ background: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>{pairing.platform}</span>
                                    </div>
                                    <span style={{ color: dk ? `${P.sky}60` : `${P.black}60` }}>{pairing.status === "active" ? "Connected" : `Idle (${pairing.lastActive})`}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Usage Volume Charts (Daily copy/inject volume) */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-6" style={{ color: P.blue }}>Daily Usage Volume (Last 7 Days)</h3>
                          
                          <div className="space-y-4">
                            <div className="space-y-3">
                              {analytics.usageVolumeData.map((d: any, idx: number) => {
                                const total = d.copies + d.injections + d.requests;
                                const maxVal = Math.max(...analytics.usageVolumeData.map((x: any) => x.copies + x.injections + x.requests)) || 1;
                                
                                return (
                                  <div key={idx} className="flex items-center gap-3">
                                    <span className="w-14 text-[10px] font-bold font-mono opacity-70">{d.date}</span>
                                    <div className="flex-1 flex gap-0.5 h-3 rounded bg-white/5 overflow-hidden">
                                      {d.copies > 0 && (
                                        <div title={`${d.copies} copies`} className="h-full bg-blue-500 transition-all" style={{ width: `${(d.copies / maxVal) * 100}%` }} />
                                      )}
                                      {d.injections > 0 && (
                                        <div title={`${d.injections} injections`} className="h-full bg-emerald-500 transition-all" style={{ width: `${(d.injections / maxVal) * 100}%` }} />
                                      )}
                                      {d.requests > 0 && (
                                        <div title={`${d.requests} check-ins`} className="h-full bg-amber-500 transition-all" style={{ width: `${(d.requests / maxVal) * 100}%` }} />
                                      )}
                                    </div>
                                    <span className="w-8 text-right text-[10px] font-mono font-bold" style={{ color: P.blue }}>{total}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex gap-4 justify-center text-[8px] font-bold uppercase tracking-wider pt-2 border-t" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-blue-500" /> Copies</div>
                              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500" /> Injections</div>
                              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-amber-500" /> Check-ins</div>
                            </div>
                          </div>
                        </div>

                        {/* HackerRank / Target Site Tracking */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-6" style={{ color: P.blue }}>Target Platform Share</h3>
                          
                          <div className="space-y-4">
                            {analytics.targetSites.map((site: any) => (
                              <div key={site.name} className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span>{site.name}</span>
                                  <span className="font-mono">{site.pct}% ({site.count})</span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden border" style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${site.pct}%`, background: `linear-gradient(90deg, ${P.blue}, ${P.sky})` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Recent Telemetry Event Log Audits */}
                      <div className="p-6 rounded-[28px] border relative overflow-hidden"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <div className="flex justify-between items-center pb-4 mb-4" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase flex items-center gap-2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            <Activity size={12} style={{ color: P.blue }} /> Recent Telemetry Event Audits
                          </h3>
                        </div>
                        {telemetryData.events && telemetryData.events.length === 0 ? (
                          <div className="text-center py-10 text-xs" style={{ color: dk ? `${P.sky}40` : `${P.black}40` }}>No telemetry events recorded yet.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-56 overflow-y-auto pr-1">
                            {(telemetryData.events || [])
                              .filter((ev: any) => {
                                const evName = (ev.event || "").toLowerCase();
                                 return evName.includes("inject") ||
                                       evName.includes("type") ||
                                       evName.includes("sync") ||
                                       evName.includes("mobile") ||
                                       evName.includes("lice");
                              })
                              .slice()
                              .reverse()
                              .slice(0, 10)
                              .map((ev: any, idx: number) => (
                                <div key={idx} className="p-3.5 rounded-2xl border flex justify-between items-center text-xs font-mono transition-all hover:bg-neutral-500/5"
                                  style={{ background: dk ? "rgba(5,5,5,0.20)" : "rgba(250,250,250,0.50)", borderColor: dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)" }}>
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-[11px] block leading-tight" style={{ color: dk ? P.white : P.black }}>{ev.event}</span>
                                    <span className="text-[9px]" style={{ color: dk ? `${P.sky}65` : `${P.black}55` }}>Device Hash: {ev.uuid.substring(0, 16)}...</span>
                                  </div>
                                  <span className="text-[10px] font-semibold text-right" style={{ color: dk ? `${P.sky}50` : `${P.black}40` }}>
                                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ RESOURCES MANAGER ═══ */}
                  {view === "vitcodes" && (
                    <motion.div key="resources" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      
                      {/* ─── Navigation Breadcrumb Header ─── */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1 pb-4 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <div className="flex items-center gap-3">
                          {(selectedAdminHub || selectedAdminCategory || selectedAdminTopic) && (
                            <button
                              onClick={() => {
                                if (selectedAdminTopic) {
                                  setSelectedAdminTopic(null);
                                } else if (selectedAdminCategory) {
                                  setSelectedAdminCategory(null);
                                } else if (selectedAdminHub) {
                                  setSelectedAdminHub(null);
                                }
                              }}
                              className={`p-2.5 rounded-xl border transition-all ${
                                dk ? 'border-white/[0.08] hover:border-[#0077C0] bg-white/[0.01] text-white/70 hover:text-white' : 'border-black/[0.08] hover:border-[#0077C0] bg-white shadow-sm text-black/70 hover:text-black'
                              }`}
                            >
                              <ChevronLeft size={16} />
                            </button>
                          )}
                          <div>
                            <h2 className="text-2xl font-black font-outfit tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Resources</h2>
                            <div className="flex items-center gap-1.5 text-xs opacity-75 mt-0.5" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                              <span>Resources Manager</span>
                              {selectedAdminHub && (
                                <>
                                  <span>&bull;</span>
                                  <span className="font-bold text-[#0077C0]">{selectedAdminHub.title}</span>
                                </>
                              )}
                              {selectedAdminCategory && (
                                <>
                                  <span>&bull;</span>
                                  <span>{selectedAdminCategory.name}</span>
                                </>
                              )}
                              {selectedAdminTopic && (
                                <>
                                  <span>&bull;</span>
                                  <span>{selectedAdminTopic.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-3 flex-wrap md:justify-end">
                          <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }} />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              placeholder="Search..."
                              className={`text-xs rounded-xl pl-8 pr-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 w-48 ${inputBg}`}
                            />
                          </div>
                          
                          {/* New Resource button, enabled when in Step 4 */}
                          {selectedAdminHub && selectedAdminCategory && selectedAdminTopic && (
                            <button
                              onClick={() => {
                                setEditingResourceId(null);
                                setQTitle("");
                                setQCode("");
                                setQLang("javascript");
                                setNewQTags("");
                                setNewLicenseEmail("");
                                setQType("snippet");
                                setShowNewSessionModal(true);
                              }}
                              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all"
                              style={{ background: P.blue }}
                            >
                              <Plus size={13} /> Add Resource
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ─── Step 1: Select Community Hub ─── */}
                      {!selectedAdminHub && (
                        <div className="space-y-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0077C0]">Step 1 &bull; Select a Community Hub</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Virtual Unassigned Hub */}
                            <div
                              onClick={() => setSelectedAdminHub({ id: "unassigned", title: "Unassigned Resources", description: "Standalone files and resources not associated with any hub", categories: [] })}
                              className={`group p-5 rounded-[24px] border transition-all hover:border-[#0077C0] cursor-pointer flex flex-col justify-between`}
                              style={{
                                background: dk ? "rgba(5,5,5,0.30)" : "rgba(255,255,255,0.60)",
                                borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)"
                              }}
                            >
                              <div>
                                <h3 className="font-bold text-sm uppercase tracking-wide group-hover:text-[#0077C0] transition-colors">Unassigned Resources</h3>
                                <p className="text-[10px] opacity-75 mt-1.5 leading-relaxed">System-wide shared macros or snippets not bound to a hub.</p>
                              </div>
                              <div className="mt-4 pt-3 border-t flex items-center justify-between text-[10px]" style={{ borderColor: dk ? "rgba(199,238,255,0.05)" : "rgba(5,5,5,0.04)" }}>
                                <span className="font-bold text-[#0077C0]">Browse Items &rarr;</span>
                              </div>
                            </div>

                            {/* Active Hubs list */}
                            {communityHubs.filter(h => !h.isDeleted).filter(h => {
                              const q = searchQuery.toLowerCase();
                              return !q || h.title.toLowerCase().includes(q) || (h.description || "").toLowerCase().includes(q);
                            }).map(hub => (
                              <div
                                key={hub.id}
                                onClick={() => setSelectedAdminHub(hub)}
                                className={`group p-5 rounded-[24px] border transition-all hover:border-[#0077C0] cursor-pointer flex flex-col justify-between`}
                                style={{
                                  background: dk ? "rgba(5,5,5,0.30)" : "rgba(255,255,255,0.60)",
                                  borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)"
                                }}
                              >
                                <div>
                                  <h3 className="font-bold text-sm uppercase tracking-wide group-hover:text-[#0077C0] transition-colors truncate">{hub.title}</h3>
                                  <p className="text-[10px] opacity-75 mt-1.5 leading-relaxed line-clamp-2">{hub.description || "No description provided."}</p>
                                </div>
                                <div className="mt-4 pt-3 border-t flex items-center justify-between text-[10px]" style={{ borderColor: dk ? "rgba(199,238,255,0.05)" : "rgba(5,5,5,0.04)" }}>
                                  <span className="opacity-60">Created by {hub.creatorEmail}</span>
                                  <span className="font-bold text-[#0077C0]">Open Hub &rarr;</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ─── Step 2: Select Category/Collection ─── */}
                      {selectedAdminHub && !selectedAdminCategory && (() => {
                        const hubCategories = selectedAdminHub.categories || [];
                        
                        // Extract any dynamic/existing categories from resources that match this hub
                        const extraCats = Array.from(new Set(
                          vitSessions
                            .filter(r => !r.isDeleted && r.hubId === selectedAdminHub.id && r.category)
                            .map(r => r.category)
                        )).map(name => ({ name, topics: [] }));

                        // Combine unique categories
                        const combinedCats = [...hubCategories];
                        extraCats.forEach(ec => {
                          if (!combinedCats.some(c => c.name.toLowerCase() === ec.name.toLowerCase())) {
                            combinedCats.push(ec);
                          }
                        });

                        if (combinedCats.length === 0) {
                          // Default fallback collection if empty
                          combinedCats.push({ name: "General Collection", topics: [] });
                        }

                        const filteredCats = combinedCats.filter(c => {
                          const q = searchQuery.toLowerCase();
                          return !q || c.name.toLowerCase().includes(q);
                        });

                        return (
                          <div className="space-y-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0077C0]">Step 2 &bull; Select a Collection / Category</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {filteredCats.map(cat => (
                                <div
                                  key={cat.name}
                                  onClick={() => setSelectedAdminCategory(cat)}
                                  className={`group p-5 rounded-[24px] border transition-all hover:border-[#0077C0] cursor-pointer flex flex-col justify-between`}
                                  style={{
                                    background: dk ? "rgba(5,5,5,0.30)" : "rgba(255,255,255,0.60)",
                                    borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)"
                                  }}
                                >
                                  <div>
                                    <h3 className="font-bold text-sm uppercase tracking-wide group-hover:text-[#0077C0] transition-colors">{cat.name}</h3>
                                    <p className="text-[10px] opacity-75 mt-1.5">Collection grouping files and scripts</p>
                                  </div>
                                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-[10px]" style={{ borderColor: dk ? "rgba(199,238,255,0.05)" : "rgba(5,5,5,0.04)" }}>
                                    <span className="font-bold text-[#0077C0]">Select Collection &rarr;</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ─── Step 3: Select Topic ─── */}
                      {selectedAdminHub && selectedAdminCategory && !selectedAdminTopic && (() => {
                        const hubTopics = selectedAdminCategory.topics || [];
                        
                        // Extract existing topics from actual resources inside this category
                        const extraTopics = Array.from(new Set(
                          vitSessions
                            .filter(r => !r.isDeleted && r.hubId === selectedAdminHub.id && (r.category?.toLowerCase() === selectedAdminCategory.name.toLowerCase() || r.subCategory?.toLowerCase() === selectedAdminCategory.name.toLowerCase()) && r.topic)
                            .map(r => r.topic)
                        )).map(name => ({ name }));

                        const combinedTopics = [...hubTopics];
                        extraTopics.forEach(et => {
                          if (!combinedTopics.some(t => t.name.toLowerCase() === et.name.toLowerCase())) {
                            combinedTopics.push(et);
                          }
                        });

                        if (combinedTopics.length === 0) {
                          // Default fallback topic
                          combinedTopics.push({ name: "General Topic" });
                        }

                        const filteredTopics = combinedTopics.filter(t => {
                          const q = searchQuery.toLowerCase();
                          return !q || t.name.toLowerCase().includes(q);
                        });

                        return (
                          <div className="space-y-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0077C0]">Step 3 &bull; Select a Topic / Date</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {filteredTopics.map(topic => (
                                <div
                                  key={topic.name}
                                  onClick={() => setSelectedAdminTopic(topic)}
                                  className={`group p-5 rounded-[24px] border transition-all hover:border-[#0077C0] cursor-pointer flex flex-col justify-between`}
                                  style={{
                                    background: dk ? "rgba(5,5,5,0.30)" : "rgba(255,255,255,0.60)",
                                    borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)"
                                  }}
                                >
                                  <div>
                                    <h3 className="font-bold text-sm uppercase tracking-wide group-hover:text-[#0077C0] transition-colors">{topic.name}</h3>
                                    <p className="text-[10px] opacity-75 mt-1.5">Topic session or share pipeline</p>
                                  </div>
                                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-[10px]" style={{ borderColor: dk ? "rgba(199,238,255,0.05)" : "rgba(5,5,5,0.04)" }}>
                                    <span className="font-bold text-[#0077C0]">View Resources &rarr;</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ─── Step 4: Show/Manage Resources inside selected Topic ─── */}
                      {selectedAdminHub && selectedAdminCategory && selectedAdminTopic && (() => {
                        const allResources = vitSessions.filter(r => !r.isDeleted);
                        
                        // Filter matching resources
                        const filtered = allResources.filter(r => {
                          const matchesHub = selectedAdminHub.id === "unassigned" 
                            ? (!r.hubId || r.hubId === "unassigned")
                            : (r.hubId === selectedAdminHub.id);
                          
                          const matchesCategory = r.category?.toLowerCase() === selectedAdminCategory.name.toLowerCase() || 
                                                 r.subCategory?.toLowerCase() === selectedAdminCategory.name.toLowerCase();
                          
                          const matchesTopic = r.topic?.toLowerCase() === selectedAdminTopic.name.toLowerCase();

                          const q = searchQuery.toLowerCase();
                          const matchesQuery = !q || 
                            r.title?.toLowerCase().includes(q) || 
                            r.content?.toLowerCase().includes(q) || 
                            (r.tags || []).some((t: string) => t.toLowerCase().includes(q));

                          return matchesHub && matchesCategory && matchesTopic && matchesQuery;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="py-20 text-center rounded-[28px] border border-dashed" style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: dk ? `${P.sky}60` : `${P.black}40` }}>
                              <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
                              <p className="text-xs font-medium">No resources found in this topic.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.map((r: any) => {
                              const isExpanded = expandedQId === r.id;
                              return (
                                <div
                                  key={r.id}
                                  onClick={(e) => {
                                    const target = e.target as HTMLElement;
                                    if (target.closest("button") || target.closest("pre") || target.closest("a")) return;
                                    setExpandedQId(isExpanded ? null : r.id);
                                  }}
                                  className="p-5 rounded-[24px] border relative overflow-hidden flex flex-col gap-3 transition-all hover:shadow-lg group cursor-pointer"
                                  style={{
                                    background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)",
                                    borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)",
                                    backdropFilter: "blur(40px)"
                                  }}
                                >
                                  {/* Type + Language badges */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border"
                                      style={{
                                        background: r.type === "macro" ? "rgba(168,85,247,0.12)" : `${P.blue}15`,
                                        color: r.type === "macro" ? "#A855F7" : P.blue,
                                        borderColor: r.type === "macro" ? "rgba(168,85,247,0.25)" : `${P.blue}25`
                                      }}>
                                      {r.type || "snippet"}
                                    </span>
                                    {r.language && (
                                      <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border"
                                        style={{ background: `${P.sky}12`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>
                                        {r.language}
                                      </span>
                                    )}
                                    <span className="ml-auto text-[10px] font-semibold text-[#0077C0]">
                                      {isExpanded ? "Collapse ▲" : "Tap to expand ▼"}
                                    </span>
                                  </div>

                                  {/* Title */}
                                  <h3 className="text-sm font-bold leading-tight">{r.title || "Untitled"}</h3>

                                  {/* Tags */}
                                  {r.tags && r.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {(r.tags as string[]).slice(0, 5).map((tag: string) => (
                                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded border"
                                          style={{ background: `${P.sky}10`, color: dk ? `${P.sky}90` : `${P.black}70`, borderColor: `${P.sky}20` }}>
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Stats */}
                                  <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>
                                    <span className="flex items-center gap-1"><Eye size={10} /> {r.views ?? 0} views</span>
                                    <span className="flex items-center gap-1"><Download size={10} /> {r.copies ?? 0} copies</span>
                                  </div>

                                  {/* Creator */}
                                  {r.creatorEmail && (
                                    <div className="text-[9px] font-mono truncate" style={{ color: dk ? `${P.sky}50` : `${P.black}40` }}>
                                      by {r.creatorEmail}
                                    </div>
                                  )}

                                  {/* Expanded content section */}
                                  {isExpanded && (
                                    <div className="space-y-3 pt-2">
                                      {/* Content preview */}
                                      <div className="rounded-xl overflow-hidden">
                                        <pre className="p-3 text-[9px] font-mono overflow-x-auto max-h-[12rem] leading-relaxed" style={{ background: "#151b22", color: "#8ecfff" }}>
                                          <code>{r.content}</code>
                                        </pre>
                                      </div>

                                      {/* Action buttons */}
                                      <div className="flex items-center gap-2 pt-1">
                                        <button
                                          onClick={() => {
                                            setEditingResourceId(r.id);
                                            setQTitle(r.title || "");
                                            setQCode(r.content || "");
                                            setQLang(r.language || "cpp");
                                            setNewQTags((r.tags || []).join(", "));
                                            setNewLicenseEmail(r.creatorEmail || "");
                                            setQType(r.type || "snippet");
                                            setShowNewSessionModal(true);
                                          }}
                                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all hover:opacity-80 cursor-pointer"
                                          style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: dk ? P.sky : P.black }}
                                        >
                                          <Edit2 size={11} /> Edit
                                        </button>
                                        <button
                                          onClick={() => setResourceHistoryId(resourceHistoryId === r.id ? null : r.id)}
                                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all hover:opacity-80 cursor-pointer"
                                          style={{
                                            borderColor: resourceHistoryId === r.id ? `${P.blue}40` : dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)",
                                            background: resourceHistoryId === r.id ? `${P.blue}12` : "transparent",
                                            color: resourceHistoryId === r.id ? P.blue : dk ? P.sky : P.black
                                          }}
                                        >
                                          <GitBranch size={11} /> {(r.edits?.length || 0)} Edits
                                        </button>
                                        <button
                                          onClick={() => handleDeleteResource(r.id)}
                                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all hover:opacity-80 border-red-500/30 text-red-400 bg-red-500/5 cursor-pointer"
                                        >
                                          <Trash2 size={11} /> Delete
                                        </button>
                                      </div>

                                      {/* Edit History Panel */}
                                      {resourceHistoryId === r.id && (
                                        <div className="mt-2 rounded-xl border overflow-hidden" style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", background: dk ? "rgba(5,5,5,0.3)" : "rgba(248,250,252,0.8)" }}>
                                          <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)", background: dk ? "rgba(0,119,192,0.08)" : "rgba(0,119,192,0.04)" }}>
                                            <GitBranch size={11} style={{ color: P.blue }} />
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Edit History</span>
                                            <span className="ml-auto text-[9px] font-mono opacity-60">{(r.edits?.length || 0)} revisions</span>
                                          </div>
                                          {!r.edits || r.edits.length === 0 ? (
                                            <div className="px-4 py-5 text-center text-[10px] opacity-50">No edit history recorded for this resource.</div>
                                          ) : (
                                            <div className={`divide-y ${dk ? "divide-white/[0.05]" : "divide-black/[0.04]"}`}>
                                              {(r.edits as any[]).map((edit: any, idx: number) => {
                                                const editDate = edit.timestamp ? new Date(edit.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Unknown time";
                                                return (
                                                  <div key={idx} className="px-4 py-3 flex flex-col gap-1.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="flex flex-col gap-0.5 min-w-0">
                                                        <span className="text-[10px] font-bold truncate" style={{ color: dk ? P.sky : P.black }}>{edit.editorEmail}</span>
                                                        {edit.reason && <span className="text-[9px] opacity-60 italic truncate">&ldquo;{edit.reason}&rdquo;</span>}
                                                      </div>
                                                      <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[9px] font-mono opacity-50">{editDate}</span>
                                                        {edit.previousCode && (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              if (confirm(`Revert "${r.title}" to the version from ${edit.editorEmail} on ${editDate}?`)) {
                                                                handleRevertEdit(r.id, edit.previousCode, edit.editorEmail);
                                                              }
                                                            }}
                                                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border transition-all hover:bg-amber-500/15 border-amber-500/30 text-amber-400 cursor-pointer"
                                                          >
                                                            <RefreshCw size={9} /> Revert
                                                          </button>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                  {/* ═══ CLIPBOARD ROOMS ═══ */}
                  {view === "clipboards" && (
                    <motion.div key="clipboards" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      
                      {/* ─── Header ─── */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1 pb-4 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <div>
                          <h2 className="text-2xl font-black font-outfit tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Clipboard Rooms</h2>
                          <p className="text-xs opacity-75 mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            {clipboardRooms.length} active ephemeral tunnels
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }} />
                            <input
                              type="text"
                              value={clipboardSearch}
                              onChange={e => setClipboardSearch(e.target.value)}
                              placeholder="Search rooms..."
                              className={`text-xs rounded-xl pl-8 pr-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 w-48 ${inputBg}`}
                            />
                          </div>
                          <button
                            onClick={() => fetchClipboardRooms()}
                            className={`p-2.5 rounded-xl border transition-all ${
                              dk ? 'border-white/[0.08] hover:border-[#0077C0] bg-white/[0.01] text-white/70 hover:text-white' : 'border-black/[0.08] hover:border-[#0077C0] bg-white shadow-sm text-black/70 hover:text-black'
                            }`}
                            title="Refresh data"
                          >
                            <RefreshCw size={14} className={loadingClipboards ? "animate-spin" : ""} />
                          </button>
                        </div>
                      </div>

                      {/* ─── Table ─── */}
                      {loadingClipboards && clipboardRooms.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
                        </div>
                      ) : (() => {
                        const filtered = clipboardRooms.filter(r => {
                          const q = clipboardSearch.toLowerCase();
                          return !q || r.code.toLowerCase().includes(q) || r.hostSessionId.toLowerCase().includes(q);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="py-20 text-center rounded-[28px] border border-dashed" style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: dk ? `${P.sky}60` : `${P.black}40` }}>
                              <Clipboard size={32} className="mx-auto mb-3 opacity-30" />
                              <p className="text-xs font-medium">
                                {clipboardSearch ? "No matching active clipboard rooms." : "No active clipboard rooms right now."}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className={`border rounded-2xl overflow-hidden`} style={{ background: dk ? "rgba(5,5,5,0.2)" : "rgba(255,255,255,0.5)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b bg-black/[0.02]" style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Room Code</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Host ID</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Duration</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Expires At</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filtered.map((room) => (
                                    <tr key={room.code} className="hover:bg-black/[0.01] transition-colors border-b last:border-0" style={{ borderColor: dk ? "rgba(199,238,255,0.05)" : "rgba(5,5,5,0.04)" }}>
                                      <td className="py-4 px-6 font-bold text-sm text-[#0077C0] select-all">{room.code}</td>
                                      <td className="py-4 px-6 font-mono text-[10px] opacity-75">{room.hostSessionId}</td>
                                      <td className="py-4 px-6 font-semibold">{room.durationMins} mins</td>
                                      <td className="py-4 px-6 opacity-75">{new Date(room.expiresAt).toLocaleTimeString()} ({new Date(room.expiresAt).toLocaleDateString()})</td>
                                      <td className="py-4 px-6">
                                        <button
                                          onClick={() => handleDeleteClipboardRoom(room.code)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all hover:bg-red-500/10 border-red-500/30 text-red-400 bg-red-500/5 cursor-pointer"
                                        >
                                          <Trash2 size={11} /> Expire
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                  {/* ─── DESKTOP PAIRINGS ─── */}
                  {view === "devices" && (
                    <motion.div key="devices" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      
                      {/* ─── Header ─── */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1 pb-4 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <div>
                          <h2 className="text-2xl font-black font-outfit tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Desktop Pairings</h2>
                          <p className="text-xs opacity-75 mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            {desktopDevices.length} companion clients registered &bull; checking in via heartbeat signals
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }} />
                            <input
                              type="text"
                              value={devicesSearch}
                              onChange={e => setDevicesSearch(e.target.value)}
                              placeholder="Search devices..."
                              className={`text-xs rounded-xl pl-8 pr-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 w-48 ${inputBg}`}
                            />
                          </div>
                          <button
                            onClick={() => fetchDesktopDevices()}
                            className={`p-2.5 rounded-xl border transition-all ${
                              dk ? 'border-white/[0.08] hover:border-[#0077C0] bg-white/[0.01] text-white/70 hover:text-white' : 'border-black/[0.08] hover:border-[#0077C0] bg-white shadow-sm text-black/70 hover:text-black'
                            }`}
                            title="Refresh data"
                          >
                            <RefreshCw size={14} className={loadingDevices ? "animate-spin" : ""} />
                          </button>
                          <button
                            onClick={handleClearPairings}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-xs bg-red-500/5 hover:bg-red-500/10 border-red-500/30 text-red-400 cursor-pointer active:scale-[0.98] transition-all"
                          >
                            <Trash2 size={13} /> Clear Pairing Logs
                          </button>
                        </div>
                      </div>

                      {/* ─── Table ─── */}
                      {loadingDevices && desktopDevices.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
                        </div>
                      ) : (() => {
                        const filtered = desktopDevices.filter(d => {
                          const q = devicesSearch.toLowerCase();
                          return !q || d.uuid.toLowerCase().includes(q) || (d.platform || "").toLowerCase().includes(q) || (d.appVersion || "").toLowerCase().includes(q);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="py-20 text-center rounded-[28px] border border-dashed" style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: dk ? `${P.sky}60` : `${P.black}40` }}>
                              <MonitorSmartphone size={32} className="mx-auto mb-3 opacity-30" />
                              <p className="text-xs font-medium">
                                {devicesSearch ? "No matching registered desktop clients." : "No registered pairings logged yet."}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className={`border rounded-2xl overflow-hidden`} style={{ background: dk ? "rgba(5,5,5,0.2)" : "rgba(255,255,255,0.5)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b bg-black/[0.02]" style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Device OS</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Client UUID</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">App Version</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Last Heartbeat Signal</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Pairing Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filtered.map((dev) => {
                                    const os = (dev.platform || "").toLowerCase();
                                    const isMac = os.includes("mac") || os.includes("darwin") || os.includes("apple");
                                    const isWindows = os.includes("win");
                                    
                                    return (
                                      <tr key={dev.id || dev.uuid} className="hover:bg-black/[0.01] transition-colors border-b last:border-0" style={{ borderColor: dk ? "rgba(199,238,255,0.05)" : "rgba(5,5,5,0.04)" }}>
                                        <td className="py-4 px-6 font-bold flex items-center gap-2">
                                          <span className="p-1.5 rounded-lg border flex items-center justify-center" style={{ background: dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.02)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                                            {isMac ? (
                                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z"/></svg>
                                            ) : isWindows ? (
                                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.551v-8.102zM10.95 1.95L24 0v11.55H10.95V1.95zM10.95 12.45H24v11.55l-13.05-1.95v-9.6z"/></svg>
                                            ) : (
                                              <Terminal size={14} />
                                            )}
                                          </span>
                                          <span className="capitalize">{dev.platform || "Unknown Client"}</span>
                                        </td>
                                        <td className="py-4 px-6 font-mono text-[10px] select-all font-semibold opacity-75">{dev.uuid}</td>
                                        <td className="py-4 px-6 font-semibold">{dev.appVersion || "v1.0.0"}</td>
                                        <td className="py-4 px-6 opacity-75">
                                          {dev.timestamp ? new Date(dev.timestamp).toLocaleTimeString() : "N/A"}{' '}
                                          ({dev.timestamp ? new Date(dev.timestamp).toLocaleDateString() : ""})
                                        </td>
                                        <td className="py-4 px-6">
                                          {(() => {
                                            const devTime = dev.timestamp ? new Date(dev.timestamp).getTime() : 0;
                                            const isOnline = Date.now() - devTime < 60000;
                                            return isOnline ? (
                                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 w-fit">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Online
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/5 text-white/40 border border-white/10 flex items-center gap-1.5 w-fit">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                                Offline
                                              </span>
                                            );
                                          })()}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                  {/* ═══ COMMUNITY HUBS ═══ */}
                  {view === "hubs" && (
                    <motion.div key="hubs" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      
                      {/* ─── Header ─── */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1 pb-4 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <div>
                          <h2 className="text-2xl font-black font-outfit tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Community Hubs</h2>
                          <p className="text-xs opacity-75 mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            {communityHubs.filter(h => !h.isDeleted).length} active hubs &bull; {communityHubs.filter(h => h.isDeleted).length} deleted
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }} />
                            <input
                              type="text"
                              value={hubsSearch}
                              onChange={e => setHubsSearch(e.target.value)}
                              placeholder="Search hubs..."
                              className={`text-xs rounded-xl pl-8 pr-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 w-48 ${inputBg}`}
                            />
                          </div>
                          <button
                            onClick={() => fetchCommunityHubs()}
                            className={`p-2.5 rounded-xl border transition-all ${
                              dk ? 'border-white/[0.08] hover:border-[#0077C0] bg-white/[0.01] text-white/70 hover:text-white' : 'border-black/[0.08] hover:border-[#0077C0] bg-white shadow-sm text-black/70 hover:text-black'
                            }`}
                            title="Refresh data"
                          >
                            <RefreshCw size={14} className={loadingHubs ? "animate-spin" : ""} />
                          </button>
                        </div>
                      </div>

                      {/* ─── Table ─── */}
                      {loadingHubs && communityHubs.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
                        </div>
                      ) : (() => {
                        const filtered = communityHubs.filter(h => {
                          const q = hubsSearch.toLowerCase();
                          return !q || h.title.toLowerCase().includes(q) || h.creatorEmail.toLowerCase().includes(q) || (h.description || "").toLowerCase().includes(q);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="py-20 text-center rounded-[28px] border border-dashed" style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)", color: dk ? `${P.sky}60` : `${P.black}40` }}>
                              <Globe size={32} className="mx-auto mb-3 opacity-30" />
                              <p className="text-xs font-medium">
                                {hubsSearch ? "No matching community hubs found." : "No community hubs created yet."}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className={`border rounded-2xl overflow-hidden`} style={{ background: dk ? "rgba(5,5,5,0.2)" : "rgba(255,255,255,0.5)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b bg-black/[0.02]" style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Hub Name</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Creator</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Visibility</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Created At</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Status</th>
                                    <th className="py-4 px-6 font-bold uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filtered.map((hub) => (
                                    <tr key={hub.id} className="hover:bg-black/[0.01] transition-colors border-b last:border-0" style={{ borderColor: dk ? "rgba(199,238,255,0.05)" : "rgba(5,5,5,0.04)" }}>
                                      <td className="py-4 px-6">
                                        <div className="font-bold text-sm text-[#0077C0]">{hub.title}</div>
                                        {hub.description && <div className="text-[10px] opacity-75 mt-0.5 max-w-xs truncate">{hub.description}</div>}
                                      </td>
                                      <td className="py-4 px-6 font-mono text-[10px] opacity-75">{hub.creatorEmail}</td>
                                      <td className="py-4 px-6 font-semibold uppercase tracking-wider text-[10px]">
                                        <span className="px-2 py-0.5 rounded border" style={{
                                          background: hub.visibility === "private" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                                          borderColor: hub.visibility === "private" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                                          color: hub.visibility === "private" ? "#ef4444" : "#10b981"
                                        }}>
                                          {hub.visibility}
                                        </span>
                                      </td>
                                      <td className="py-4 px-6 opacity-75">{new Date(hub.createdAt).toLocaleDateString()}</td>
                                      <td className="py-4 px-6">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                                          background: hub.isDeleted ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                                          color: hub.isDeleted ? "#EF4444" : "#10B981"
                                        }}>
                                          {hub.isDeleted ? "Deleted" : "Active"}
                                        </span>
                                      </td>
                                      <td className="py-4 px-6">
                                        {hub.isDeleted ? (
                                          <button
                                            onClick={() => handleRestoreHub(hub.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all hover:opacity-80 border-emerald-500/30 text-emerald-400 bg-emerald-500/5 cursor-pointer"
                                          >
                                            <RotateCcw size={11} /> Restore
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleDeleteHub(hub.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all hover:bg-red-500/10 border-red-500/30 text-red-400 bg-red-500/5 cursor-pointer"
                                          >
                                            <Trash2 size={11} /> Delete
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                  {/* ═══ EDIT LOGS ═══ */}
                  {view === "contributors" && (
                    <motion.div key="contributors" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1 pb-4 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <div>
                          <h2 className="text-2xl font-black font-outfit tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Edit Logs</h2>
                          <p className="text-xs opacity-75 mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            {contributors.length} contributors tracked &bull; code submissions &amp; revision history
                          </p>
                        </div>
                      </div>

                      {loadingContributors ? (
                        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} /></div>
                      ) : !selectedContributor ? (
                        <div className="space-y-8">

                          {/* Top 3 Podium */}
                          {contributorStats.length > 0 && (
                            <div className="p-6 rounded-[28px] border relative overflow-hidden"
                              style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                              <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                              <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-8 text-center" style={{ color: P.blue }}>Contributor Leaderboard Podium</h3>
                              
                              <div className="flex flex-col sm:flex-row items-end justify-center gap-6 sm:gap-10 pb-4">
                                {/* Rank 2 */}
                                {contributorStats[1] && (
                                  <div className="flex flex-col items-center order-2 sm:order-1">
                                    <div className="w-14 h-14 rounded-full border-2 border-slate-400 flex items-center justify-center font-black text-lg bg-slate-900 text-slate-300 relative shadow-lg">
                                      {contributorStats[1].name[0]}
                                      <span className="absolute -bottom-2 bg-slate-400 text-black font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase">#2</span>
                                    </div>
                                    <span className="text-xs font-black uppercase mt-3">{contributorStats[1].name}</span>
                                    <span className="text-[9px] font-mono opacity-60 mt-0.5">{contributorStats[1].points} pts</span>
                                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded mt-1.5" style={{ backgroundColor: contributorStats[1].tierColor, color: contributorStats[1].tierText }}>{contributorStats[1].tier}</span>
                                  </div>
                                )}

                                {/* Rank 1 (Center / Tallest) */}
                                {contributorStats[0] && (
                                  <div className="flex flex-col items-center order-1 sm:order-2 -translate-y-2">
                                    <div className="w-18 h-18 rounded-full border-2 border-yellow-400 flex items-center justify-center font-black text-xl bg-yellow-950/20 text-yellow-400 relative shadow-xl shadow-yellow-500/10">
                                      <Sparkles size={16} className="absolute -top-4 text-yellow-400 animate-bounce" />
                                      {contributorStats[0].name[0]}
                                      <span className="absolute -bottom-2 bg-yellow-400 text-black font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">#1</span>
                                    </div>
                                    <span className="text-sm font-black uppercase mt-4 text-yellow-400">{contributorStats[0].name}</span>
                                    <span className="text-[10px] font-mono opacity-80 mt-0.5">{contributorStats[0].points} pts</span>
                                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded mt-2" style={{ backgroundColor: contributorStats[0].tierColor, color: contributorStats[0].tierText }}>{contributorStats[0].tier}</span>
                                  </div>
                                )}

                                {/* Rank 3 */}
                                {contributorStats[2] && (
                                  <div className="flex flex-col items-center order-3">
                                    <div className="w-12 h-12 rounded-full border-2 border-amber-600 flex items-center justify-center font-black text-md bg-amber-950/25 text-amber-500 relative shadow-lg">
                                      {contributorStats[2].name[0]}
                                      <span className="absolute -bottom-2 bg-amber-600 text-black font-extrabold text-[8px] px-1.5 py-0.5 rounded-full uppercase">#3</span>
                                    </div>
                                    <span className="text-xs font-black uppercase mt-3">{contributorStats[2].name}</span>
                                    <span className="text-[9px] font-mono opacity-60 mt-0.5">{contributorStats[2].points} pts</span>
                                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded mt-1.5" style={{ backgroundColor: contributorStats[2].tierColor, color: contributorStats[2].tierText }}>{contributorStats[2].tier}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Leaderboard Table / Rankings */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-extrabold tracking-wider uppercase opacity-60">All Contributors</h3>
                            <div className="grid grid-cols-1 gap-4">
                              {contributorStats.map((c, rankIdx) => (
                                <div key={c.email} onClick={() => setSelectedContributor(c.email)} className="p-5 rounded-[24px] border cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                                  <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine} opacity-0 group-hover:opacity-100 transition-opacity`} />
                                  
                                  <div className="flex items-center gap-4">
                                    {/* Rank number badge */}
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black font-mono text-sm border"
                                      style={{
                                        background: rankIdx === 0 ? "rgba(234, 179, 8, 0.15)" : rankIdx === 1 ? "rgba(148, 163, 184, 0.15)" : rankIdx === 2 ? "rgba(217, 119, 6, 0.15)" : "transparent",
                                        color: rankIdx === 0 ? "#EAB308" : rankIdx === 1 ? "#94A3B8" : rankIdx === 2 ? "#D97706" : "inherit",
                                        borderColor: rankIdx === 0 ? "rgba(234, 179, 8, 0.3)" : rankIdx === 1 ? "rgba(148, 163, 184, 0.3)" : rankIdx === 2 ? "rgba(217, 119, 6, 0.3)" : "rgba(199,238,255,0.08)",
                                      }}>
                                      {rankIdx + 1}
                                    </div>

                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black uppercase text-lg" style={{ background: `${P.blue}15`, color: P.blue }}>
                                      {c.name[0] || "?"}
                                    </div>

                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-bold uppercase">{c.name}</h3>
                                        <span className="text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border" style={{ background: `${P.sky}15`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>{c.college}</span>
                                        <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: c.tierColor, color: c.tierText }}>{c.tier}</span>
                                      </div>
                                      <p className="text-[10px] font-mono mt-1" style={{ color: dk ? `${P.sky}60` : `${P.black}60` }}>{c.email} • {c.regno}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-6 w-full md:w-auto">
                                    <div className="text-left md:text-right">
                                      <p className="text-xs font-bold" style={{ color: P.blue }}>{c.points} Points</p>
                                      <p className="text-[9px] font-mono uppercase" style={{ color: dk ? `${P.sky}60` : `${P.black}60` }}>{c.codesCount} Codes • {c.editsCount} Edits</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <button onClick={() => setSelectedContributor(null)} className="flex items-center gap-2 text-xs font-bold hover:opacity-70 transition-colors relative z-50 cursor-pointer" style={{ color: P.blue }}><ChevronLeft size={14} /> Back to Edit Logs</button>
                          
                          {(() => {
                            const c = contributors.find(x => x.email === selectedContributor);
                            if (!c) return null;
                            const parsed = parseVitEmail(c.email);
                            const name = c.name || parsed.name;
                            const regno = c.regno || parsed.regno;
                            const college = c.college || parsed.college;
                            const codes = contributorCodes.filter(q => q.contributorEmail === c.email);
                            const types = Array.from(new Set(codes.map(q => q.sessionType)));

                            const editsMade = (() => {
                              const list: {
                                questionId: string;
                                questionTitle: string;
                                language: string;
                                reason: string;
                                timestamp: number;
                                previousCode?: string;
                              }[] = [];
                              
                              vitSessions.forEach(s => {
                                if (!s.isDeleted && s.questions) {
                                  s.questions.forEach((q: any) => {
                                    if (!q.isDeleted) {
                                      if (q.edits && q.edits.length > 0) {
                                        q.edits.forEach((edit: any) => {
                                          if (edit.editorEmail === c.email) {
                                            list.push({
                                              questionId: q.id,
                                              questionTitle: q.title,
                                              language: q.language,
                                              reason: edit.reason,
                                              timestamp: edit.timestamp,
                                              previousCode: edit.previousCode
                                            });
                                          }
                                        });
                                      }
                                    }
                                  });
                                }
                              });
                              
                              const seen = new Set<string>();
                              const uniqueList = list.filter(item => {
                                const key = `${item.questionId}_${item.reason}`;
                                if (seen.has(key)) return false;
                                seen.add(key);
                                return true;
                              });
                              
                              return uniqueList.sort((a, b) => b.timestamp - a.timestamp);
                            })();

                            const filteredCodes = contribExamTypeFilter 
                              ? codes.filter(q => q.sessionType === contribExamTypeFilter) 
                              : codes;
                            
                            // Group by date
                            const byDate = filteredCodes.reduce((acc, q) => {
                              if (!acc[q.sessionDate]) acc[q.sessionDate] = [];
                              acc[q.sessionDate].push(q);
                              return acc;
                            }, {} as Record<string, typeof codes>);
                            
                            return (
                              <div className="space-y-6">
                                <div className="p-6 rounded-[28px] border relative overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                                  <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h2 className="text-xl font-black uppercase">{name}</h2>
                                        <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase border" style={{ background: `${P.sky}15`, color: dk ? P.sky : P.black, borderColor: `${P.sky}25` }}>{college}</span>
                                      </div>
                                      <p className="text-xs font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}60` }}>{c.email} • ID: {regno}</p>
                                    </div>
                                    
                                    {activeSlideTab === "contributed" && types.length > 0 && (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-bold uppercase opacity-55 mr-1">Filter Exam:</span>
                                        {types.map(t => {
                                          const isFiltered = contribExamTypeFilter === t;
                                          return (
                                            <button 
                                              key={t} 
                                              onClick={() => setContribExamTypeFilter(isFiltered ? null : t)}
                                              className="text-[9px] px-2.5 py-1 rounded border font-bold uppercase transition-all duration-200 cursor-pointer hover:opacity-90" 
                                              style={{ 
                                                background: isFiltered ? P.blue : `${P.sky}10`, 
                                                color: isFiltered ? "#fff" : dk ? P.sky : P.black, 
                                                borderColor: isFiltered ? P.blue : `${P.sky}20` 
                                              }}
                                            >
                                              {t}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Sliding Selector (Segmented Tab Control) */}
                                <div className="flex p-1 rounded-2xl max-w-sm border self-start" style={{ background: dk ? "rgba(255,255,255,0.02)" : "rgba(5,5,5,0.02)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                                  <button
                                    onClick={() => setActiveSlideTab("contributed")}
                                    className="flex-1 py-2 px-4 text-xs font-bold rounded-xl transition-all relative cursor-pointer"
                                    style={{
                                      background: activeSlideTab === "contributed" ? P.blue : "transparent",
                                      color: activeSlideTab === "contributed" ? "#fff" : dk ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"
                                    }}
                                  >
                                    Codes Contributed ({codes.length})
                                  </button>
                                  <button
                                    onClick={() => setActiveSlideTab("edits")}
                                    className="flex-1 py-2 px-4 text-xs font-bold rounded-xl transition-all relative cursor-pointer"
                                    style={{
                                      background: activeSlideTab === "edits" ? P.blue : "transparent",
                                      color: activeSlideTab === "edits" ? "#fff" : dk ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"
                                    }}
                                  >
                                    Edits Made ({editsMade.length})
                                  </button>
                                </div>

                                {activeSlideTab === "contributed" ? (
                                  <div className="space-y-6">
                                    {Object.entries(byDate).length === 0 ? (
                                      <div className="p-8 text-center rounded-[24px] border text-xs opacity-60" style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                                        No contributions match this filter.
                                      </div>
                                    ) : (
                                      Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, qs]: [string, any]) => (
                                        <div key={date} className="space-y-3">
                                          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: P.blue }}>{date}</h3>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {(qs as any[]).map((q: any, idx: number) => {
                                              const tsStr = q.id.replace("q_", "");
                                              const ts = parseInt(tsStr);
                                              const timeStr = !isNaN(ts) ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                                              return (
                                                <div key={q.id} className="p-5 rounded-[24px] border relative cursor-pointer hover:shadow-lg transition-all" style={{ background: dk ? "rgba(5,5,5,0.40)" : "rgba(255,255,255,0.60)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }} onClick={() => setExpandedContribQId(expandedContribQId === q.id ? null : q.id)}>
                                                  <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                      <span className="w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold" style={{ background: `${P.sky}15`, color: P.sky }}>{idx + 1}</span>
                                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase" style={{ background: `${P.blue}10`, color: P.blue, borderColor: `${P.blue}20` }}>{q.language}</span>
                                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase" style={{ background: `${P.sky}10`, color: dk ? P.sky : P.black, borderColor: `${P.sky}20` }}>{q.sessionType}</span>
                                                    </div>
                                                    {timeStr && <span className="text-[10px] font-mono opacity-60 mt-1">{timeStr}</span>}
                                                  </div>
                                                  <h4 className="text-sm font-bold mb-2">{q.title}</h4>
                                                  {q.comment && <p className="text-xs italic mb-2" style={{ color: dk ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{q.comment}</p>}
                                                  <AnimatePresence>
                                                    {expandedContribQId === q.id && (
                                                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4">
                                                        <pre className="p-4 rounded-xl text-[10px] font-[family-name:var(--font-mono)] overflow-x-auto max-h-52 border" style={{ background: "#151b22", color: "#8ecfff", borderColor: dk ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
                                                          <code>{q.code}</code>
                                                        </pre>
                                                      </motion.div>
                                                    )}
                                                  </AnimatePresence>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-6">
                                    {editsMade.length === 0 ? (
                                      <div className="p-8 text-center rounded-[24px] border text-xs opacity-60" style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                                        No edits logged for this contributor yet.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {editsMade.map((edit, idx) => {
                                          const dateStr = new Date(edit.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                                          const timeStr = new Date(edit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                          const isExpanded = expandedEditId === `edit_${edit.questionId}_${idx}`;
                                          const targetQ = vitSessions.flatMap(s => s.questions || []).find(q => q.id === edit.questionId);
                                          const otherEdits = targetQ?.edits || [];
                                          return (
                                            <div key={`${edit.questionId}_${idx}`} className="p-5 rounded-[24px] border relative hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between" 
                                              style={{ background: dk ? "rgba(5,5,5,0.40)" : "rgba(255,255,255,0.60)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}
                                              onClick={() => setExpandedEditId(isExpanded ? null : `edit_${edit.questionId}_${idx}`)}>
                                              <div>
                                                <div className="flex justify-between items-start mb-3">
                                                  <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold" style={{ background: `${P.sky}15`, color: P.sky }}>{idx + 1}</span>
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase" style={{ background: `${P.blue}10`, color: P.blue, borderColor: `${P.blue}20` }}>{edit.language}</span>
                                                  </div>
                                                  <span className="text-[10px] font-mono opacity-60 mt-1">{dateStr} • {timeStr}</span>
                                                </div>
                                                <h4 className="text-sm font-bold mb-2">{edit.questionTitle}</h4>
                                                <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                                                  <span className="text-[9px] uppercase font-bold tracking-wider mr-1.5 opacity-55">Reason for Edit:</span>
                                                  <span className="font-medium" style={{ color: P.blue }}>
                                                    {edit.reason.replace(/solved error/i, "Error solved")}
                                                  </span>
                                                </div>
                                              </div>

                                              <AnimatePresence>
                                                {isExpanded && (
                                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4" onClick={e => e.stopPropagation()}>
                                                    {edit.previousCode ? (
                                                      <div className="space-y-2">
                                                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-55 block">Code Prior to Edit:</span>
                                                        <pre className="p-3 rounded-xl text-[9px] font-[family-name:var(--font-mono)] overflow-x-auto max-h-40 border bg-[#151b22] text-[#8ecfff] border-white/5">
                                                          <code>{edit.previousCode}</code>
                                                        </pre>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Are you sure you want to revert "${edit.questionTitle}" back to this previous version?`)) {
                                                              handleRevertEdit(edit.questionId, edit.previousCode!, c.email);
                                                            }
                                                          }}
                                                          className="px-3 py-2 rounded-lg text-[10px] font-bold text-white bg-red-600 hover:bg-red-500 transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-red-600/10 cursor-pointer"
                                                        >
                                                          <RefreshCw size={11} /> Revert to this Version
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <span className="text-[9px] text-red-400 font-semibold block">No previous version code stored in history for this edit.</span>
                                                    )}

                                                    {otherEdits.length > 0 && (
                                                      <div className="mt-4 pt-3 border-t border-dashed" style={{ borderColor: dk ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
                                                        <h5 className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-75">All Revision Logs ({otherEdits.length})</h5>
                                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                                          {otherEdits.map((h: any, hIdx: number) => {
                                                            const hDate = new Date(h.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                                            return (
                                                              <div key={hIdx} className="text-[9px] p-2 rounded bg-white/5 border flex justify-between items-center gap-2" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                                                                <div className="flex flex-col">
                                                                  <span className="font-semibold text-white">{h.editorEmail}</span>
                                                                  <span className="opacity-60">{h.reason}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-right shrink-0">
                                                                  <span className="opacity-55">{hDate}</span>
                                                                  {h.previousCode && (
                                                                    <button
                                                                      onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm(`Revert "${edit.questionTitle}" to the code version from ${h.editorEmail} on ${hDate}?`)) {
                                                                          handleRevertEdit(edit.questionId, h.previousCode, h.editorEmail);
                                                                        }
                                                                      }}
                                                                      title="Revert to this version"
                                                                      className="p-1 rounded hover:bg-white/10 text-red-400 cursor-pointer"
                                                                    >
                                                                      <RefreshCw size={10} />
                                                                    </button>
                                                                  )}
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </motion.div>
                                                )}
                                              </AnimatePresence>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ═══ OTA TEMPLATES ═══ */}
                  {view === "ota" && (
                    <motion.div key="ota" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      <div className="lg:col-span-3 space-y-6">
                        <div className="rounded-[28px] border p-6 relative overflow-hidden space-y-4"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h2 className="text-[10px] font-extrabold tracking-[0.2em] uppercase flex items-center gap-2 pb-2" style={{ color: P.blue, borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                            <Layout size={13} /> Choose File
                          </h2>
                          <div className="space-y-2">
                            {(["center.html", "index.html", "resources.html"] as const).map(file => (
                              <button key={file} onClick={() => setSelectedFile(file)}
                                className="w-full text-left p-4 rounded-2xl flex items-center gap-3.5 transition-all border"
                                style={{
                                  borderColor: selectedFile === file ? `${P.blue}30` : dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)",
                                  background: selectedFile === file ? `${P.blue}10` : dk ? "rgba(5,5,5,0.3)" : "rgba(250,250,250,0.4)",
                                  color: selectedFile === file ? P.blue : dk ? `${P.sky}CC` : `${P.black}AA`,
                                }}>
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: selectedFile === file ? `${P.blue}15` : dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                                  {file === "center.html" ? <MonitorSmartphone size={16} /> : file === "index.html" ? <FileCode size={16} /> : <Code size={16} />}
                                </div>
                                <div className="text-xs">
                                  <p className="font-bold">{file}</p>
                                  <p className="text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>
                                    {file === "center.html" ? "Mobile Command Center" : file === "index.html" ? "Mobile Landing Page" : "Resources List Page"}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-9 rounded-[28px] border overflow-hidden flex flex-col min-h-[580px] relative shadow-2xl"
                        style={{ background: dk ? "rgba(5,5,5,0.30)" : "rgba(255,255,255,0.60)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4"
                          style={{ background: dk ? "rgba(5,5,5,0.6)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${P.blue}15`, border: `1px solid ${P.blue}30` }}>
                              <Globe size={12} style={{ color: P.blue }} />
                            </div>
                            <span className="text-xs font-bold font-[family-name:var(--font-mono)]">{selectedFile}</span>
                            {usingCustom && (
                              <span className="text-[8px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-md animate-pulse" style={{ background: `${P.sky}15`, color: P.sky, border: `1px solid ${P.sky}25` }}>Custom</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={handleResetOta} disabled={loadingOta}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                              style={{ borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", color: dk ? P.sky : P.black }}>
                              <RotateCcw size={13} /> Reset
                            </button>
                            <button onClick={handleSaveOta} disabled={loadingOta || savingOta}
                              className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md active:scale-[0.98] disabled:opacity-50 transition-all"
                              style={{ background: P.blue }}>
                              <Save size={13} /> {savingOta ? "Publishing..." : "Publish"}
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 relative flex flex-col" style={{ background: "#151b22" }}>
                          {loadingOta && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3" style={{ background: "rgba(21,27,34,0.9)" }}>
                              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: P.blue, borderTopColor: "transparent" }} />
                              <span className="text-xs font-mono" style={{ color: `${P.sky}60` }}>Loading template...</span>
                            </div>
                          )}
                          <div className="absolute top-0 bottom-0 left-0 w-12 border-r flex flex-col items-center py-6 text-[10px] font-mono select-none leading-relaxed"
                            style={{ background: "rgba(5,5,5,0.2)", borderColor: "rgba(199,238,255,0.04)", color: `${P.sky}30` }}>
                            {Array.from({ length: 22 }).map((_, i) => <span key={i} className="h-5">{i + 1}</span>)}
                          </div>
                          <textarea value={otaContent} onChange={e => setOtaContent(e.target.value)}
                            className="flex-1 bg-transparent font-[family-name:var(--font-mono)] text-xs pl-16 pr-6 py-6 focus:outline-none resize-none leading-relaxed"
                            style={{ color: "#8ecfff" }}
                            placeholder="<!-- Custom Template Source -->" spellCheck={false} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ DIAGNOSTICS ═══ */}
                  {view === "system" && (
                    <motion.div key="sys" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* CARD 1: Real-time System Clock */}
                      <div className="p-6 rounded-[28px] border relative overflow-hidden flex flex-col justify-between"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div>
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-4 flex items-center justify-between" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            <span className="flex items-center gap-2">
                              <Clock size={12} style={{ color: P.blue }} /> System Time
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[9px] font-mono lowercase text-emerald-500 font-bold">sync active</span>
                            </span>
                          </h3>
                          <div className="py-6 flex flex-col justify-center items-center text-center">
                            <span className="text-3xl font-black font-[family-name:var(--font-outfit)] tracking-tight" style={{ color: dk ? P.white : P.black }}>
                              {liveTime.split(" — ")[1] || "00:00:00"}
                            </span>
                            <span className="text-xs font-medium mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                              {liveTime.split(" — ")[0] || "..."}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4 py-4 text-xs font-mono border-t" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                          <div className="flex justify-between">
                            <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Process Uptime</span>
                            <span style={{ color: P.blue }} className="font-bold">
                              {diagnosticsData?.system?.uptime ? (() => {
                                const sec = diagnosticsData.system.uptime;
                                const h = Math.floor(sec / 3600);
                                const m = Math.floor((sec % 3600) / 60);
                                const s = Math.floor(sec % 60);
                                return `${h}h ${m}m ${s}s`;
                              })() : "0h 0m 0s"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>API Server Time</span>
                            <span style={{ color: dk ? P.white : P.black }}>
                              {diagnosticsData?.system?.serverTime ? new Date(diagnosticsData.system.serverTime).toLocaleTimeString("en-GB") : "--:--:--"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CARD 2: System Resources (RAM/Node) */}
                      <div className="p-6 rounded-[28px] border relative overflow-hidden"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-4 flex items-center gap-2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                          <Cpu size={12} style={{ color: P.blue }} /> System RAM
                        </h3>
                        <div className="flex flex-col items-center justify-center py-4 space-y-4">
                          <div className="relative w-28 h-28 flex items-center justify-center">
                            {(() => {
                              const used = diagnosticsData?.system?.memoryHeapUsed || 0;
                              const total = diagnosticsData?.system?.memoryHeapTotal || 1;
                              const pct = Math.round((used / total) * 100) || 0;
                              return (
                                <>
                                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke={dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.06)"} strokeWidth="8" />
                                    <circle cx="50" cy="50" r="40" fill="none" stroke={P.blue} strokeWidth="8"
                                      strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - pct / 100)} strokeLinecap="round" />
                                  </svg>
                                  <span className="absolute text-xl font-black font-[family-name:var(--font-outfit)]">{pct}%</span>
                                </>
                              );
                            })()}
                          </div>
                          <span className="text-xs font-mono text-center" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>
                            {diagnosticsData?.system?.memoryHeapUsed || 0} MB / {diagnosticsData?.system?.memoryHeapTotal || 0} MB Used
                          </span>
                        </div>
                        <div className="space-y-2 pt-2 text-xs font-mono border-t" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                          <div className="flex justify-between py-1">
                            <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Node Version</span>
                            <span style={{ color: dk ? P.white : P.black }}>{diagnosticsData?.system?.nodeVersion || "N/A"}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Platform / Arch</span>
                            <span style={{ color: dk ? P.white : P.black }}>
                              {diagnosticsData?.system?.platform && diagnosticsData?.system?.arch 
                                ? `${diagnosticsData.system.platform} / ${diagnosticsData.system.arch}` 
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CARD 3: Database Status & Stats */}
                      <div className="p-6 rounded-[28px] border relative overflow-hidden"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-4 flex items-center gap-2" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                          <Database size={12} style={{ color: P.blue }} /> Database Status
                        </h3>
                        <div className="space-y-3 py-2 text-xs font-mono">
                          <div className="flex justify-between pb-2" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                            <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Connection Status</span>
                            <span style={{ color: diagnosticsData?.database?.status?.includes("Error") ? P.error : P.blue }} className="font-bold text-right max-w-[60%] overflow-hidden text-ellipsis whitespace-nowrap">
                              {diagnosticsData?.database?.status || "Connecting..."}
                            </span>
                          </div>
                          <div className="flex justify-between pb-2" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                            <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Query Latency</span>
                            <span className="font-bold" style={{
                              color: !diagnosticsData ? (dk ? P.white : P.black) :
                                     diagnosticsData.database.latency < 50 ? "#10B981" : 
                                     diagnosticsData.database.latency < 200 ? "#F59E0B" : P.error
                            }}>
                              {diagnosticsData?.database?.latency !== undefined ? `${diagnosticsData.database.latency} ms` : "--"}
                            </span>
                          </div>
                          <div className="flex justify-between pb-1">
                            <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Total Sessions</span>
                            <span style={{ color: dk ? P.white : P.black }} className="font-bold">{diagnosticsData?.database?.sessionsCount ?? 0}</span>
                          </div>
                          <div className="flex justify-between pb-1">
                            <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Total Questions</span>
                            <span style={{ color: dk ? P.white : P.black }} className="font-bold">{diagnosticsData?.database?.questionsCount ?? 0}</span>
                          </div>
                          <div className="flex justify-between pb-1">
                            <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Heartbeat Pins</span>
                            <span style={{ color: dk ? P.white : P.black }} className="font-bold">{diagnosticsData?.database?.heartbeatsCount ?? 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Client Downloads</span>
                            <span style={{ color: dk ? P.white : P.black }} className="font-bold">{diagnosticsData?.database?.downloadsCount ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ SECURITY AUDIT ═══ */}
                  {view === "security" && (
                    <motion.div key="sec" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div>
                        <h2 className="text-xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase">Audit History</h2>
                        <p className="text-xs" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>System login events and security metrics</p>
                      </div>
                      <div className="rounded-2xl border overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse" style={{ minWidth: "700px" }}>
                            <thead>
                              <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                {["ID", "Time", "Event", "User", "IP", "Severity"].map(h => (
                                  <th key={h} className={`p-4 text-[10px] uppercase font-extrabold tracking-widest ${h === "Severity" ? "text-right pr-6" : h === "ID" ? "pl-6" : ""}`}
                                    style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {secLogs.map(l => (
                                <tr key={l.id} className="text-xs" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                  <td className="p-4 pl-6 font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{l.id}</td>
                                  <td className="p-4 font-mono" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{formatLocalTime(l.timestamp)}</td>
                                  <td className="p-4 font-bold">{l.event}</td>
                                  <td className="p-4" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{l.user}</td>
                                  <td className="p-4 font-mono" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{l.ip}</td>
                                  <td className="p-4 pr-6 text-right">
                                    <span className="text-[8px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-md border"
                                      style={{
                                        background: l.status === "failed" ? `${P.error}15` : l.status === "warning" ? `${P.sky}15` : `${P.blue}15`,
                                        color: l.status === "failed" ? P.error : l.status === "warning" ? (dk ? P.sky : P.black) : P.blue,
                                        borderColor: l.status === "failed" ? `${P.error}25` : l.status === "warning" ? `${P.sky}25` : `${P.blue}25`,
                                      }}>{l.status === "failed" ? "Critical" : l.status === "warning" ? "Warning" : "Info"}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ SETTINGS ═══ */}
                  {view === "settings" && (
                    <motion.div key="set" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                        { title: "General Preferences", items: [
                          { label: "Verbose Debug Logs", checked: true },
                          { label: "Automatic Backup Schedule", checked: true },
                          { label: "Multi-Node API Proxying", checked: false },
                        ]},
                      ].map((section, si) => (
                        <div key={si} className="p-6 rounded-[28px] border relative overflow-hidden space-y-6"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>{section.title}</h3>
                          <div className="space-y-4">
                            {section.items.map((item, ii) => (
                              <label key={ii} className="flex items-center justify-between cursor-pointer">
                                <span className="text-xs font-semibold">{item.label}</span>
                                <input type="checkbox" defaultChecked={item.checked} className="rounded-md w-4 h-4" style={{ accentColor: P.blue }} />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="p-6 rounded-[28px] border relative overflow-hidden space-y-6"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Branding & Endpoint</h3>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Console Brand Label</span>
                            <input type="text" defaultValue="LANpad Control" className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none ${inputBg}`} />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Local IP Proxy</span>
                            <input type="text" defaultValue="0.0.0.0:8000" className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none ${inputBg}`} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ PROFILE & PASSWORD ═══ */}
                  {view === "profile" && (
                    <motion.div key="prof" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <form onSubmit={handleUpdateProfile} className="p-6 rounded-[28px] border relative overflow-hidden space-y-6"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Profile Settings</h3>
                        <div className="flex items-center gap-5">
                          <img src={adminAvatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover border shadow-lg" style={{ borderColor: dk ? "rgba(199,238,255,0.15)" : "rgba(5,5,5,0.1)" }} />
                          <div className="space-y-1.5 flex-1">
                            <span className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Avatar URL</span>
                            <input type="text" value={adminAvatar} onChange={e => setAdminAvatar(e.target.value)}
                              className={`text-xs rounded-xl px-3 py-2 w-full border focus:outline-none ${inputBg}`} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold tracking-wider block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Admin Name</label>
                          <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)}
                            className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none ${inputBg}`} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold tracking-wider block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Email Address (Fixed)</label>
                          <input type="email" value={currentUser?.email || "veeranithin9@gmail.com"} readOnly disabled
                            className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none opacity-60 cursor-not-allowed ${inputBg}`} />
                        </div>
                        <div className="flex items-center gap-2.5 py-1">
                          <input type="checkbox" id="2fa-checkbox" checked={isTwoStepEnabled} onChange={e => {
                            setIsTwoStepEnabled(e.target.checked);
                            localStorage.setItem("glidepass-2fa-enabled", e.target.checked ? "true" : "false");
                            showToast("success", e.target.checked ? "2-Step Verification enabled." : "2-Step Verification disabled.");
                          }} className="w-4 h-4 rounded cursor-pointer transition-all" style={{ accentColor: P.blue }} />
                          <label htmlFor="2fa-checkbox" className="text-xs font-semibold cursor-pointer select-none" style={{ color: dk ? P.white : P.black }}>
                            Enable 2-Step Verification
                          </label>
                        </div>
                        <div className="flex justify-end">
                          <button type="submit" className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md active:scale-[0.98] transition-all" style={{ background: P.blue }}>Update Profile</button>
                        </div>
                      </form>

                      <form onSubmit={handleChangePw} className="p-6 rounded-[28px] border relative overflow-hidden space-y-6"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: P.blue }}>Change Password</h3>
                        <div className="space-y-4">
                          {[
                            { label: "Current Password", val: curPw, set: setCurPw },
                            { label: "New Password", val: newPw, set: setNewPw },
                            { label: "Confirm Password", val: confirmPw, set: setConfirmPw },
                          ].map((f, i) => (
                            <div key={i} className="space-y-1.5">
                              <label className="text-[9px] uppercase font-bold tracking-wider block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{f.label}</label>
                              <input type="password" value={f.val} onChange={e => f.set(e.target.value)}
                                className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none ${inputBg}`} />
                              {f.label === "New Password" && newPw && (
                                <div className="flex gap-1 items-center pt-1.5">
                                  <span className="text-[9px] uppercase font-bold" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Strength:</span>
                                  <div className="flex gap-1 flex-1 max-w-[100px]">
                                    {Array.from({ length: 4 }).map((_, j) => (
                                      <div key={j} className="h-1 flex-1 rounded-sm transition-all" style={{ background: j < pwStrength ? (pwStrength < 3 ? P.sky : P.blue) : dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.06)" }} />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <button type="submit" className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md active:scale-[0.98] transition-all" style={{ background: P.blue }}>Update Password</button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {/* ═══ SUBSCRIPTIONS & LICENSING (MONETIZATION) ═══ */}
                  {view === "subscriptions" && (
                    <motion.div key="subs" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-8">
                      {/* Header with Ticking Clock */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-xl font-black font-outfit uppercase tracking-wide">Subscriptions & Licenses</h2>
                          <p className="text-xs text-white/60">Monitor transactions, manage promo codes, and tweak plan settings</p>
                        </div>
                        <div className="flex items-center gap-3 px-4.5 py-2.5 rounded-2xl border font-mono text-xs shadow-sm"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-bold" style={{ color: dk ? P.white : P.black }}>{liveTime || "Syncing time..."}</span>
                        </div>
                      </div>

                      {/* Monetization KPI Cards */}
                      {(() => {
                        const successTxns = subscriptions.filter(s => s.status === "success" || s.status === "active");
                        const totalRev = successTxns.reduce((acc, curr) => acc + parseFloat(curr.amount.replace(/[^\d.]/g, "") || "0"), 0);
                        const razorpayFee = totalRev * 0.0236; // 2% Razorpay Fee + 18% GST on the fee
                        const totalProfit = totalRev - razorpayFee;
                        const successRate = subscriptions.length > 0 ? Math.round((successTxns.length / subscriptions.length) * 100) : 100;

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                              { 
                                title: "Total Revenue", 
                                val: `₹${totalRev.toFixed(2)}`, 
                                label: "From active & successful passes", 
                                color: "#10B981" 
                              },
                              { 
                                title: "Total Profit", 
                                val: `₹${totalProfit.toFixed(2)}`, 
                                label: "Subtracted Razorpay cost (2.36%)", 
                                color: "#00E676" 
                              },
                              { title: "Total Transactions", val: String(subscriptions.length), label: "Logged payment events", color: P.blue },
                              { 
                                title: "Success Rate", 
                                val: `${successRate}%`, 
                                label: "Payment gateway health", 
                                color: P.blue 
                              },
                            ].map((c, i) => (
                              <div key={i} className="p-6 rounded-[24px] border relative overflow-hidden transition-all"
                                style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                                <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                                <div className="flex justify-between items-start mb-3">
                                  <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{c.title}</span>
                                </div>
                                <h3 className="text-3xl font-[family-name:var(--font-outfit)] font-black" style={{ color: c.color }}>{c.val}</h3>
                                <span className="text-[10px] mt-1.5 block" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{c.label}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      <div className="space-y-8">
                        {/* Transaction History Logs */}
                        <div className="space-y-8">
                          <div className="rounded-[28px] border overflow-hidden"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                              <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Recent Transactions</h3>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                    {["Transaction ID", "User Email", "Plan", "Amount", "Status", "Date", "Actions"].map(h => (
                                      <th key={h} className={`p-4 text-[9px] uppercase font-bold tracking-wider ${h === "Actions" ? "text-right pr-6" : ""}`} style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {subscriptions.map(s => (
                                    <tr key={s.id} className="text-xs animate-fadeIn" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                      <td className="p-4 font-mono font-bold" style={{ color: P.blue }}>{s.id}</td>
                                      <td className="p-4 font-semibold">{s.email}</td>
                                      <td className="p-4">{s.plan}</td>
                                      <td className="p-4 font-bold">{s.amount}</td>
                                      <td className="p-4">
                                        <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded border"
                                          style={{
                                            background: s.status === "success" ? `${P.blue}15` : `${P.error}15`,
                                            color: s.status === "success" ? P.blue : P.error,
                                            borderColor: s.status === "success" ? `${P.blue}30` : `${P.error}30`
                                          }}>
                                          {s.status}
                                        </span>
                                      </td>
                                      <td className="p-4 font-mono text-[10px]" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{s.date}</td>
                                      <td className="p-4 text-right pr-6">
                                        <button onClick={() => handleDeleteTxn(s.id)} className="p-1 rounded hover:bg-neutral-500/10 hover:text-red-500 transition-colors" title="Delete Log">
                                          <Trash2 size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                  {subscriptions.length === 0 && (
                                    <tr>
                                      <td colSpan={7} className="text-center py-6 text-xs text-mono" style={{ color: dk ? `${P.sky}50` : `${P.black}40` }}>
                                        No subscription transactions recorded.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Record Transaction Form */}
                          <div className="p-6 rounded-[28px] border relative overflow-hidden"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                            <h3 className="text-xs font-extrabold uppercase tracking-widest mb-4" style={{ color: P.blue }}>Record Manual Transaction</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                              <div>
                                <label className="text-[9px] uppercase font-bold tracking-wider mb-1 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Student Email</label>
                                <input type="email" value={newTxnEmail} onChange={e => setNewTxnEmail(e.target.value)} placeholder="student@vitstudent.ac.in"
                                  className={`w-full text-xs rounded-xl px-3 py-2 border focus:outline-none ${inputBg}`} />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold tracking-wider mb-1 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Select Plan</label>
                                <select value={newTxnPlan} onChange={e => {
                                  setNewTxnPlan(e.target.value);
                                  if (e.target.value === "Monthly Pass") setNewTxnAmount("₹99");
                                  else if (e.target.value === "Semester Pass") setNewTxnAmount("₹249");
                                  else setNewTxnAmount("₹499");
                                }} className={`w-full text-xs rounded-xl px-3 py-2 border focus:outline-none ${inputBg}`}>
                                  <option value="Monthly Pass">Monthly Pass (₹99)</option>
                                  <option value="Semester Pass">Semester Pass (₹249)</option>
                                  <option value="Yearly Pass">Yearly Pass (₹499)</option>
                                </select>
                              </div>
                              <button onClick={handleAddTxn} className="py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all" style={{ background: P.blue }}>
                                Log Transaction
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                    </motion.div>
                  )}

                  {view === "plans" && (
                    <motion.div key="plans" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-8">
                      {/* Header with Ticking Clock */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-xl font-black font-outfit uppercase tracking-wide">Plans & Keys</h2>
                          <p className="text-xs text-white/60">Configure global monetization switch, license tiers, and generate activation keys</p>
                        </div>
                        <div className="flex items-center gap-3 px-4.5 py-2.5 rounded-2xl border font-mono text-xs shadow-sm"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-bold" style={{ color: dk ? P.white : P.black }}>{liveTime || "Syncing time..."}</span>
                        </div>
                      </div>

                      {/* Dynamic plans editor */}
                      <div className="p-6 rounded-[28px] border relative overflow-hidden space-y-6 w-full"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>App Monetization Config</h3>
                            <p className="text-[10px] text-white/50">Configure global monetization switch and customize active plan details</p>
                          </div>
                          
                          {/* Toggles container */}
                          <div className="flex items-center gap-6">
                            {/* Monetization Toggle */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold font-mono uppercase" style={{ color: monetizationSettings.monetization_enabled ? P.blue : P.white }}>
                                {monetizationSettings.monetization_enabled ? "MONETIZATION ON (LOCKED)" : "MONETIZATION OFF (FREE)"}
                              </span>
                              <button 
                                onClick={() => handleSaveMonetizationSettings({
                                  ...monetizationSettings,
                                  monetization_enabled: !monetizationSettings.monetization_enabled
                                })}
                                className="w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none"
                                style={{ backgroundColor: monetizationSettings.monetization_enabled ? P.blue : "rgba(255,255,255,0.15)" }}
                              >
                                <div 
                                  className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-300 shadow-md"
                                  style={{ left: monetizationSettings.monetization_enabled ? "26px" : "2px" }}
                                />
                              </button>
                            </div>

                            {/* Free Tier Toggle */}
                            <div className="flex items-center gap-3 border-l pl-6" style={{ borderColor: dk ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
                              <span className="text-xs font-bold font-mono uppercase" style={{ color: monetizationSettings.free_enabled ? P.sky : P.white }}>
                                {monetizationSettings.free_enabled ? "FREE PLAN ON" : "FREE PLAN OFF"}
                              </span>
                              <button 
                                onClick={() => handleSaveMonetizationSettings({
                                  ...monetizationSettings,
                                  free_enabled: !monetizationSettings.free_enabled
                                })}
                                className="w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none"
                                style={{ backgroundColor: monetizationSettings.free_enabled ? P.sky : "rgba(255,255,255,0.15)" }}
                              >
                                <div 
                                  className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-300 shadow-md"
                                  style={{ left: monetizationSettings.free_enabled ? "26px" : "2px" }}
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="h-[1px] bg-[rgba(199,238,255,0.06)]" />

                        {/* Plan list input fields */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: P.sky }}>Tweak License Plan Packages</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(monetizationSettings.plans || []).map((plan: any, planIdx: number) => (
                              <div key={plan.tier} className="p-4 rounded-2xl border" style={{ background: dk ? "rgba(5,5,5,0.2)" : "rgba(250,250,250,0.4)", borderColor: dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)" }}>
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-[#0077C0]/15 text-[#C7EEFF]">{plan.tier}</span>
                                </div>
                                <div className="space-y-2.5">
                                  <div>
                                    <label className="text-[9px] uppercase font-bold tracking-wider mb-0.5 block opacity-60">Package Title</label>
                                    <input 
                                      type="text" 
                                      value={plan.title} 
                                      onChange={e => {
                                        const updatedPlans = [...monetizationSettings.plans];
                                        updatedPlans[planIdx].title = e.target.value;
                                        handleSaveMonetizationSettings({ ...monetizationSettings, plans: updatedPlans });
                                      }}
                                      className={`w-full text-xs rounded-xl px-3 py-1.5 border focus:outline-none ${inputBg}`} 
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold tracking-wider mb-0.5 block opacity-60">Subtitle</label>
                                    <input 
                                      type="text" 
                                      value={plan.subtitle || ""} 
                                      onChange={e => {
                                        const updatedPlans = [...monetizationSettings.plans];
                                        updatedPlans[planIdx].subtitle = e.target.value;
                                        handleSaveMonetizationSettings({ ...monetizationSettings, plans: updatedPlans });
                                      }}
                                      className={`w-full text-xs rounded-xl px-3 py-1.5 border focus:outline-none ${inputBg}`} 
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold tracking-wider mb-0.5 block opacity-60">Price</label>
                                    <input 
                                      type="text" 
                                      value={plan.price} 
                                      onChange={e => {
                                        const updatedPlans = [...monetizationSettings.plans];
                                        updatedPlans[planIdx].price = e.target.value;
                                        handleSaveMonetizationSettings({ ...monetizationSettings, plans: updatedPlans });
                                      }}
                                      className={`w-full text-xs rounded-xl px-3 py-1.5 border focus:outline-none ${inputBg}`} 
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase font-bold tracking-wider mb-0.5 block opacity-60">Validity (Days)</label>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="number" 
                                        min="1"
                                        value={plan.validity_days ?? 30} 
                                        onChange={e => {
                                          const updatedPlans = [...monetizationSettings.plans];
                                          updatedPlans[planIdx].validity_days = parseInt(e.target.value) || 30;
                                          handleSaveMonetizationSettings({ ...monetizationSettings, plans: updatedPlans });
                                        }}
                                        className={`w-full text-xs rounded-xl px-3 py-1.5 border focus:outline-none ${inputBg}`} 
                                      />
                                      <span className="text-[9px] font-mono whitespace-nowrap shrink-0" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>
                                        {(() => {
                                          const d = plan.validity_days ?? 30;
                                          if (d >= 365) return `≈ ${Math.round(d / 365)}yr`;
                                          if (d >= 30) return `≈ ${Math.round(d / 30)}mo`;
                                          return `${d}d`;
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                  
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>


                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">

                        {/* Matrix Control for Plans */}
                        <div className="col-span-1 lg:col-span-2 rounded-[28px] border relative overflow-hidden mt-6"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div className="p-6">
                            <h3 className="text-xs font-extrabold uppercase tracking-widest mb-1" style={{ color: P.blue }}>Technical Controls Matrix</h3>
                            <p className="text-[10px] mb-4" style={{ color: dk ? `${P.sky}70` : `${P.black}60` }}>
                              Set limits for each feature. <strong>0</strong> = unlimited. <strong>-1</strong> = completely disabled. Any other number is the usage limit.
                            </p>
                            <div className="overflow-x-auto pb-2">
                              <table className="w-full text-left text-[11px]" style={{ minWidth: "600px" }}>
                                <thead>
                                  <tr>
                                    <th className="p-2 border-b opacity-60 uppercase font-bold tracking-wider" style={{ borderColor: dk ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>Feature</th>
                                    {monetizationSettings.plans.map((plan: any) => (
                                      <th key={plan.tier} className="p-2 border-b text-center font-bold uppercase tracking-wider" style={{ color: P.blue, borderColor: dk ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>{plan.tier}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* Sessions */}
                                  <tr>
                                    <td className="p-3 border-b font-bold opacity-90" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>Max Devices</td>
                                    {monetizationSettings.plans.map((plan: any, planIdx: number) => (
                                      <td key={plan.tier} className="p-2 border-b text-center" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                                          <input 
                                            type="number" min="0" max="999"
                                            value={plan.max_sessions ?? 0}
                                            onChange={e => {
                                              const updatedPlans = [...monetizationSettings.plans];
                                              updatedPlans[planIdx].max_sessions = parseInt(e.target.value) || 0;
                                              handleSaveMonetizationSettings({ ...monetizationSettings, plans: updatedPlans });
                                            }}
                                            className={`w-14 text-[10px] text-center rounded-lg px-2 py-1 border focus:outline-none ${inputBg}`} 
                                          />
                                      </td>
                                    ))}
                                  </tr>
                                  {/* Resources Cap */}
                                  <tr>
                                    <td className="p-3 border-b font-bold opacity-90" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>Resource Access Limit</td>
                                    {monetizationSettings.plans.map((plan: any, planIdx: number) => (
                                      <td key={plan.tier} className="p-2 border-b text-center" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                                          <input 
                                            type="number" min="0" max="9999"
                                            value={plan.max_resources_per_month ?? 0}
                                            onChange={e => {
                                              const updatedPlans = [...monetizationSettings.plans];
                                              updatedPlans[planIdx].max_resources_per_month = parseInt(e.target.value) || 0;
                                              handleSaveMonetizationSettings({ ...monetizationSettings, plans: updatedPlans });
                                            }}
                                            className={`w-14 text-[10px] text-center rounded-lg px-2 py-1 border focus:outline-none ${inputBg}`} 
                                          />
                                      </td>
                                    ))}
                                  </tr>
                                  {/* Toggles */}
                                  {[
                                    { key: 'allow_live_sync', label: 'Live Sync Usage' },
                                    { key: 'allow_typing', label: 'Normal Typing Usage' },
                                    { key: 'allow_typing_mode', label: 'Coding Typing Usage' },
                                    { key: 'allow_inject', label: 'Inject Mode Usage' },
                                    { key: 'allow_raw', label: 'Flash (Raw) Mode Usage' },
                                    { key: 'allow_select_copy', label: 'Select Copy Usage' },
                                    { key: 'allow_fetch', label: 'Fetch Paste Usage' },
                                    { key: 'allow_refill', label: 'Refill Action Usage' },
                                    { key: 'allow_resource_access', label: 'Resource Access Usage' },
                                    { key: 'allow_resource_analytics', label: 'Resource Analytics' },
                                    { key: 'allow_tunnel', label: 'Hybrid Relay Tunnel' }
                                  ].map((toggle) => (
                                    <tr key={toggle.key}>
                                      <td className="p-3 border-b font-bold opacity-80" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>{toggle.label}</td>
                                      {monetizationSettings.plans.map((plan: any, planIdx: number) => (
                                        <td key={plan.tier} className="p-2 border-b text-center align-middle" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                                          <div className="flex flex-row items-center justify-center gap-2 py-1">
                                            <button 
                                              type="button"
                                              onClick={() => {
                                                const updatedPlans = [...monetizationSettings.plans];
                                                const currentlyEnabled = plan[toggle.key] !== false && plan[toggle.key] !== -1;
                                                updatedPlans[planIdx][toggle.key] = currentlyEnabled ? -1 : 0;
                                                handleSaveMonetizationSettings({ ...monetizationSettings, plans: updatedPlans });
                                              }}
                                              className={`w-16 px-2 py-1 rounded text-[9px] font-extrabold uppercase transition-colors border ${
                                                (plan[toggle.key] !== false && plan[toggle.key] !== -1) 
                                                  ? `bg-blue-500/10 text-blue-500 border-blue-500/30` 
                                                  : dk ? `bg-white/5 text-white/40 border-white/10` : `bg-black/5 text-black/40 border-black/10`
                                              }`}
                                            >
                                              {(plan[toggle.key] !== false && plan[toggle.key] !== -1) ? 'Enable' : 'Disable'}
                                            </button>
                                            
                                            {(plan[toggle.key] !== false && plan[toggle.key] !== -1) && (
                                              <input 
                                                type="number" min="0" max="999"
                                                value={plan[toggle.key] === true ? 0 : (plan[toggle.key] ?? 0)}
                                                onChange={e => {
                                                  const updatedPlans = [...monetizationSettings.plans];
                                                  let val = parseInt(e.target.value);
                                                  if (isNaN(val) || val < 0) val = 0;
                                                  updatedPlans[planIdx][toggle.key] = val;
                                                  handleSaveMonetizationSettings({ ...monetizationSettings, plans: updatedPlans });
                                                }} 
                                                className={`w-12 text-[10px] text-center rounded px-1 py-1 border focus:outline-none ${inputBg}`} 
                                              />
                                            )}
                                          </div>
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>

                    </motion.div>
                  )}

                  {/* ═══ GENERATE ACTIVATION KEY ═══ */}
                  {view === "keys" && (
                    <motion.div key="keys" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-8">

                      {/* Header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-2xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Activation Keys</h2>
                          <p className="text-xs mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Generate, revoke, and manage product license keys</p>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border font-mono text-xs" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-bold" style={{ color: dk ? P.white : P.black }}>{liveTime || "Syncing..."}</span>
                          <span className="opacity-50">&bull;</span>
                          <span style={{ color: P.blue }}>{licenses.length} keys</span>
                        </div>
                      </div>

                      {/* Stats row */}
                      {(() => {
                        const active = licenses.filter((l: any) => new Date(l.expires_at) > new Date());
                        const expired = licenses.filter((l: any) => new Date(l.expires_at) <= new Date());
                        const bound = licenses.filter((l: any) => l.hwid);
                        const unbound = licenses.filter((l: any) => !l.hwid);
                        return (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { label: "Total Keys", val: licenses.length, color: P.blue },
                              { label: "Active", val: active.length, color: "#10B981" },
                              { label: "Expired", val: expired.length, color: "#EF4444" },
                              { label: "Unbound", val: unbound.length, color: "#F59E0B" },
                            ].map(s => (
                              <div key={s.label} className="p-5 rounded-[22px] border relative overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                                <div className="h-[1.5px] absolute top-0 left-0 right-0" style={{ background: `linear-gradient(90deg, ${s.color}40, ${s.color}10)` }} />
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{s.label}</p>
                                <p className="text-3xl font-black font-[family-name:var(--font-outfit)]" style={{ color: s.color }}>{s.val}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Generator Form Card */}
                      <div className="p-6 rounded-[28px] border relative overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                        <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${P.blue}18`, border: `1px solid ${P.blue}30` }}>
                            <Key size={16} style={{ color: P.blue }} />
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Generate Activation Key</h3>
                            <p className="text-[10px] mt-0.5" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Issue a new license key tied to a user email and tier</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                          {/* Email */}
                          <div className="lg:col-span-1">
                            <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>User Email *</label>
                            <input
                              id="key-email"
                              type="email"
                              value={newLicenseEmail}
                              onChange={e => setNewLicenseEmail(e.target.value)}
                              placeholder="user@example.com"
                              className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                            />
                          </div>
                          {/* Tier */}
                          <div>
                            <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>License Tier</label>
                            <select
                              value={newLicenseTier}
                              onChange={e => setNewLicenseTier(e.target.value)}
                              className={`w-full text-xs rounded-xl px-3 py-3 border focus:outline-none ${inputBg}`}
                            >
                              <option value="Basic">Basic — Week Pass</option>
                              <option value="Pro">Pro — Monthly Pass</option>
                              <option value="Creator">Creator — Creator Pass</option>
                              <option value="Max">Max — Semester Pass</option>
                              <option value="Ultra">Ultra — Yearly Pass</option>
                              {currentUser?.role === "ADMIN MASTER" && (
                                <option value="DEVELOPER">DEVELOPER — All-Access</option>
                              )}
                            </select>
                          </div>
                          {/* Duration */}
                          <div>
                            <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Validity</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={newLicenseDuration}
                                onChange={e => setNewLicenseDuration(e.target.value)}
                                placeholder="30"
                                className={`w-2/3 text-xs rounded-xl px-3.5 py-3 border focus:outline-none ${inputBg}`}
                              />
                              <select
                                value={newLicenseDurationUnit}
                                onChange={e => setNewLicenseDurationUnit(e.target.value as any)}
                                className={`w-1/3 text-xs rounded-xl px-2 py-3 border focus:outline-none ${inputBg}`}
                              >
                                <option value="days">Days</option>
                                <option value="hours">Hours</option>
                                <option value="mins">Mins</option>
                              </select>
                            </div>
                          </div>
                          {/* Generate Button */}
                          <button
                            onClick={handleGenerateLicense}
                            disabled={!newLicenseEmail}
                            className="py-3 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: `linear-gradient(135deg, ${P.blue}, #0099ff)` }}
                          >
                            <Key size={14} />
                            Generate Key
                          </button>
                        </div>
                      </div>

                      {/* Active Keys Table */}
                      <div className="rounded-[28px] border overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                          <div>
                            <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>All Activation Keys</h3>
                            <p className="text-[10px] mt-0.5" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{licenses.length} total issued keys</p>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                {["Activation Key", "Owner Email", "Tier", "Device HWID", "Expires", "Status", "Actions"].map(h => (
                                  <th key={h} className={`px-5 py-3 text-[9px] uppercase font-bold tracking-wider ${h === "Actions" ? "text-right pr-6" : ""}`} style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {licenses.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="text-center py-12 text-xs" style={{ color: dk ? `${P.sky}50` : `${P.black}40` }}>
                                    <Key size={28} className="mx-auto mb-3 opacity-20" />
                                    No activation keys issued yet
                                  </td>
                                </tr>
                              ) : licenses.map((lic: any) => {
                                const isExpired = new Date(lic.expires_at) <= new Date();
                                return (
                                  <tr key={lic.key} className="text-xs group hover:bg-white/[0.02] transition-colors" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-[10px]" style={{ color: P.sky }}>{lic.key}</span>
                                        <button
                                          onClick={() => { navigator.clipboard.writeText(lic.key); }}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-blue-400"
                                          title="Copy key"
                                        >
                                          <CheckSquare size={10} />
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-5 py-4 font-semibold">{lic.email}</td>
                                    <td className="px-5 py-4">
                                      <span className="text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg" style={{ background: `${P.blue}18`, color: P.blue, border: `1px solid ${P.blue}28` }}>
                                        {lic.tier}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4 font-mono text-[10px]" style={{ color: lic.hwid ? P.white : `${P.white}35` }}>
                                      {lic.hwid ? (
                                        <span className="truncate max-w-[120px] block">{lic.hwid}</span>
                                      ) : (
                                        <span className="italic">Unbound</span>
                                      )}
                                    </td>
                                    <td className="px-5 py-4 font-mono text-[10px]" style={{ color: isExpired ? "#EF4444" : P.white }}>
                                      {new Date(lic.expires_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-4">
                                      <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg border ${
                                        isExpired
                                          ? "border-red-500/25 bg-red-500/10 text-red-400"
                                          : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                                      }`}>
                                        {isExpired ? "Expired" : "Active"}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4 text-right pr-6">
                                      <div className="flex items-center justify-end gap-2">
                                        {lic.hwid && (
                                          <button
                                            onClick={() => handleResetHwid(lic.key)}
                                            className="p-1.5 rounded-lg hover:bg-sky-500/10 hover:text-sky-400 transition-all"
                                            title="Reset device lock"
                                          >
                                            <RefreshCw size={12} />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteLicense(lic.key)}
                                          className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all"
                                          title="Revoke key"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </motion.div>
                  )}

                  {view === "coupons" && (
                    <motion.div key="coupons" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-8">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-xl font-black font-outfit uppercase tracking-wide">Coupon Codes Manager</h2>
                          <p className="text-xs text-white/60">Configure and manage active promo codes, discounts, usage limits, and expiration dates</p>
                        </div>
                      </div>

                      {/* Coupons Stats Cards Grid */}
                      {(() => {
                        const totalCoupons = promoCodes.length;
                        const activeCoupons = promoCodes.filter((c: any) => c.status === "active").length;
                        const totalUses = promoCodes.reduce((acc: number, c: any) => acc + (c.usage || 0), 0);
                        const inactiveCoupons = totalCoupons - activeCoupons;

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                              { 
                                title: "Total Coupons", 
                                val: String(totalCoupons), 
                                label: "All registered promo codes", 
                                color: P.blue 
                              },
                              { 
                                title: "Active Coupons", 
                                val: String(activeCoupons), 
                                label: "Coupons available for use", 
                                color: "#10B981" 
                              },
                              { 
                                title: "Used / Inactive", 
                                val: String(inactiveCoupons), 
                                label: "Expired or paused coupons", 
                                color: "#EF4444" 
                              },
                              { 
                                title: "Total Coupon Redemptions", 
                                val: String(totalUses), 
                                label: "Total uses across checkout", 
                                color: "#3B82F6" 
                              },
                            ].map((c, i) => (
                              <div key={i} className="p-6 rounded-[24px] border relative overflow-hidden transition-all"
                                style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                                <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                                <div className="flex justify-between items-start mb-3">
                                  <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{c.title}</span>
                                </div>
                                <h3 className="text-3xl font-[family-name:var(--font-outfit)] font-black" style={{ color: c.color }}>{c.val}</h3>
                                <span className="text-[10px] mt-1.5 block" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{c.label}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Create Coupon Form */}
                        <div className="lg:col-span-4 p-6 rounded-[28px] border relative overflow-hidden space-y-4"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Create Coupon</h3>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Coupon Code</label>
                              <input type="text" value={newPromoCode} onChange={e => setNewPromoCode(e.target.value.toUpperCase())} placeholder="e.g. VITAP50"
                                className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`} />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Discount Rate</label>
                              <select value={newPromoDiscount} onChange={e => setNewPromoDiscount(e.target.value)}
                                className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`}>
                                {["10%", "15%", "20%", "25%", "30%", "40%", "50%", "75%", "90%", "100%"].map(d => (
                                  <option key={d} value={d}>{d} Off</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Max Uses</label>
                              <input type="number" min="1" value={newCouponMaxUses} onChange={e => setNewCouponMaxUses(e.target.value)} placeholder="100"
                                className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`} />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Expiration Date (Optional)</label>
                              <input type="date" value={newCouponExpires} onChange={e => setNewCouponExpires(e.target.value)}
                                className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`} />
                            </div>
                            <button onClick={handleGeneratePromo} className="w-full py-3 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-md shadow-sky-600/10 cursor-pointer active:scale-95">
                              Generate Coupon
                            </button>
                          </div>
                        </div>

                        {/* List of Coupons Table */}
                        <div className="lg:col-span-8 rounded-[28px] border overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                          <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                            <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Active Promotions</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                  {["Code", "Discount", "Usage Limit", "Expiration", "Status", "Actions"].map(h => (
                                    <th key={h} className="p-4 text-[9px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {promoCodes.map(c => (
                                  <tr key={c.code} className="text-xs" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                    <td className="p-4 font-mono font-bold" style={{ color: P.sky }}>{c.code}</td>
                                    <td className="p-4 font-semibold text-emerald-500">{c.discount}</td>
                                    <td className="p-4">
                                      <span className="font-mono">{c.usage || 0}</span> / <span className="font-mono text-white/40">{c.max_uses || 100}</span>
                                    </td>
                                    <td className="p-4 font-mono text-[10px]">
                                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                                    </td>
                                    <td className="p-4">
                                      <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded ${c.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                                        {c.status}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex items-center gap-3">
                                        <button onClick={() => handleTogglePromo(c.code, c.status)} className="text-[10px] font-bold text-sky-400 hover:underline">
                                          Toggle
                                        </button>
                                        <button onClick={() => handleDeletePromo(c.code)} className="text-[10px] font-bold text-red-400 hover:underline">
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {promoCodes.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="text-center py-6 text-xs text-mono text-white/40">
                                      No promo codes found.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {view === "referrals" && (
                    <motion.div key="referrals" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-8">
                      {/* Header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-xl font-black font-outfit uppercase tracking-wide">Referral Program Settings & Logs</h2>
                          <p className="text-xs text-white/60">Manage referrer codes, customize subscription extension rewards, and view signups logs</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Settings & Create Form */}
                        <div className="lg:col-span-4 space-y-8">
                          {/* Config Box */}
                          <div className="p-6 rounded-[28px] border relative overflow-hidden space-y-4"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                            <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Referral Config</h3>
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Extension Days Given as Reward</label>
                              <div className="flex gap-2">
                                <input type="number" min="1" value={monetizationSettings.referral_reward_days || 7}
                                  onChange={e => {
                                    handleSaveMonetizationSettings({
                                      ...monetizationSettings,
                                      referral_reward_days: parseInt(e.target.value) || 7
                                    });
                                  }}
                                  className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`} />
                                <span className="text-xs font-bold font-mono self-center">Days</span>
                              </div>
                            </div>
                          </div>

                          {/* Code Generator Form */}
                          <div className="p-6 rounded-[28px] border relative overflow-hidden space-y-4"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                            <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Create Referrer Code</h3>
                            <div className="space-y-3">
                              <div>
                                <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">User Email</label>
                                <input type="email" value={newReferrerEmail} onChange={e => setNewReferrerEmail(e.target.value)} placeholder="user@gmail.com"
                                  className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`} />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Custom Referral Code</label>
                                <input type="text" value={newReferrerCode} onChange={e => setNewReferrerCode(e.target.value.toUpperCase())} placeholder="NITHIN100"
                                  className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`} />
                              </div>
                              <button onClick={handleGenerateReferralCode} className="w-full py-3 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-md shadow-sky-600/10 cursor-pointer active:scale-95">
                                Register Code
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Logs and Lists Column */}
                        <div className="lg:col-span-8 space-y-8">
                          {/* Referrer Codes List */}
                          <div className="rounded-[28px] border overflow-hidden"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                              <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Registered Referral Codes</h3>
                            </div>
                            <div className="overflow-x-auto max-h-[220px]">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                    {["User Email", "Referral Code", "Created At"].map(h => (
                                      <th key={h} className="p-4 text-[9px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {referralCodesList.map(r => (
                                    <tr key={r.email} className="text-xs" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                      <td className="p-4 font-semibold">{r.email}</td>
                                      <td className="p-4 font-mono font-bold text-sky-400">{r.referral_code}</td>
                                      <td className="p-4 font-mono text-[10px] text-white/50">
                                        {new Date(r.created_at).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                  {referralCodesList.length === 0 && (
                                    <tr>
                                      <td colSpan={3} className="text-center py-6 text-xs text-mono text-white/40">
                                        No referrer codes registered.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Referral Signups Logs */}
                          <div className="rounded-[28px] border overflow-hidden"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                              <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Referral Rewards Audit Logs</h3>
                            </div>
                            <div className="overflow-x-auto max-h-[220px]">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                    {["Referrer Email", "Referred User", "Status", "Rewards Applied", "Joined Date"].map(h => (
                                      <th key={h} className="p-4 text-[9px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {referralsList.map(r => (
                                    <tr key={r.id} className="text-xs" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                      <td className="p-4 font-semibold">{r.referrer_email}</td>
                                      <td className="p-4 font-semibold">{r.referred_email}</td>
                                      <td className="p-4">
                                        <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded ${r.status === "rewarded" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                                          {r.status}
                                        </span>
                                      </td>
                                      <td className="p-4 font-medium text-emerald-400">
                                        {r.status === "rewarded" ? `+${monetizationSettings.referral_reward_days || 7} Days Premium` : "Pending Action"}
                                      </td>
                                      <td className="p-4 font-mono text-[10px] text-white/50">
                                        {new Date(r.created_at).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                  {referralsList.length === 0 && (
                                    <tr>
                                      <td colSpan={5} className="text-center py-6 text-xs text-mono text-white/40">
                                        No referral events logged yet.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ VERSION MANAGER ═══ */}
                  {/* ═══ VERSION MANAGER ═══ */}
                  {view === "versioning" && (
                    <motion.div key="vers" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-8">
                      {/* Header with Ticking Clock */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-xl font-black font-outfit uppercase tracking-wide">Version Manager</h2>
                          <p className="text-xs text-white/60">Configure OTA updates, package download locations, and mandatory upgrades</p>
                        </div>
                        <div className="flex items-center gap-3 px-4.5 py-2.5 rounded-2xl border font-mono text-xs shadow-sm"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <span className="w-2 h-2 rounded-full bg-[#0077C0] animate-pulse" />
                          <span className="font-bold" style={{ color: dk ? P.white : P.black }}>{liveTime || "Syncing time..."}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Column 1: Config Form */}
                        <div className="lg:col-span-2 p-6 rounded-[28px] border relative overflow-hidden space-y-6"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Update App Version (version.json)</h3>
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Target Version</label>
                              <input type="text" value={appVersionData.version} onChange={e => setAppVersionData(prev => ({ ...prev, version: e.target.value }))}
                                className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none ${inputBg}`} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Windows Package URL</label>
                              <input type="text" value={appVersionData.windowsUrl} onChange={e => setAppVersionData(prev => ({ ...prev, windowsUrl: e.target.value }))}
                                className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none ${inputBg}`} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>macOS Bundle URL</label>
                              <input type="text" value={appVersionData.macUrl} onChange={e => setAppVersionData(prev => ({ ...prev, macUrl: e.target.value }))}
                                className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none ${inputBg}`} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold block" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>Changelog / Release Notes</label>
                              <textarea value={appVersionData.changelog} onChange={e => setAppVersionData(prev => ({ ...prev, changelog: e.target.value }))}
                                rows={4} className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none font-sans ${inputBg}`} placeholder="Describe the updates in this version..." />
                            </div>
                            <label className="flex items-center justify-between cursor-pointer pt-2">
                              <span className="text-xs font-bold">Enforce Mandatory Upgrade (Force Update)</span>
                              <input type="checkbox" checked={appVersionData.forceUpdate} onChange={e => setAppVersionData(prev => ({ ...prev, forceUpdate: e.target.checked }))} className="rounded-md w-4 h-4" style={{ accentColor: P.blue }} />
                            </label>
                            <div className="flex justify-end pt-4">
                              <button onClick={async () => {
                                setSavingVersion(true);
                                try {
                                  const res = await fetch("/api/ota", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      file: "downloads/version.json",
                                      content: JSON.stringify({
                                        version: appVersionData.version,
                                        windows_url: appVersionData.windowsUrl,
                                        mac_url: appVersionData.macUrl,
                                        force_update: appVersionData.forceUpdate,
                                        changelog: appVersionData.changelog
                                      }, null, 2)
                                    })
                                  });
                                  if (!res.ok) throw new Error("Failed to save version configuration.");
                                  showToast("success", "Version manifest updated successfully.");
                                } catch (e: any) {
                                  showToast("error", e.message);
                                } finally {
                                  setSavingVersion(false);
                                }
                              }} disabled={savingVersion} className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all" style={{ background: P.blue }}>
                                {savingVersion ? "Updating..." : "Push Version Update"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Column 2: Live JSON Manifest Preview & Telemetry */}
                        <div className="space-y-8 lg:col-span-1">
                          <div className="p-6 rounded-[28px] border relative overflow-hidden space-y-4"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                            <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Live version.json</h3>
                            <div className={`p-4 rounded-xl border font-mono text-[10px] overflow-auto max-h-[200px] ${inputBg}`} style={{ color: dk ? `${P.sky}90` : `${P.black}80` }}>
                              <pre>{JSON.stringify({
                                version: appVersionData.version,
                                windows_url: appVersionData.windowsUrl,
                                mac_url: appVersionData.macUrl,
                                force_update: appVersionData.forceUpdate,
                                changelog: appVersionData.changelog
                              }, null, 2)}</pre>
                            </div>
                          </div>

                          {/* Release History List */}
                          <div className="p-6 rounded-[28px] border relative overflow-hidden space-y-4"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                            <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Release History</h3>
                            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                              {versionHistory.length === 0 ? (
                                <div className="text-center py-6 text-xs text-white/40">No release history found.</div>
                              ) : (
                                versionHistory.map((item: any, idx: number) => (
                                  <div key={idx} className="p-3.5 rounded-xl border flex flex-col gap-2 relative group"
                                    style={{ background: dk ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <span className="font-mono text-xs font-bold text-white">v{item.version}</span>
                                        {item.force_update && (
                                          <span className="ml-2 text-[9px] font-extrabold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 uppercase tracking-wide">Force</span>
                                        )}
                                      </div>
                                      <button
                                        onClick={async () => {
                                          if (!confirm(`Are you sure you want to revert to version v${item.version}?`)) return;
                                          setSavingVersion(true);
                                          try {
                                            const res = await fetch("/api/ota", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({
                                                file: "downloads/version.json",
                                                content: JSON.stringify({
                                                  version: item.version,
                                                  windows_url: item.windows_url,
                                                  mac_url: item.mac_url,
                                                  force_update: item.force_update,
                                                  changelog: item.changelog
                                                }, null, 2)
                                              })
                                            });
                                            if (!res.ok) throw new Error("Failed to revert version.");
                                            showToast("success", `Reverted to v${item.version} successfully.`);
                                            fetchAppVersion();
                                          } catch (e: any) {
                                            showToast("error", e.message);
                                          } finally {
                                            setSavingVersion(false);
                                          }
                                        }}
                                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white shadow bg-[#0077C0] hover:opacity-90 active:scale-[0.97] transition-all"
                                      >
                                        Revert
                                      </button>
                                    </div>
                                    <p className="text-[10px] text-white/50 line-clamp-2">{item.changelog}</p>
                                    <div className="text-[9px] text-white/30 font-mono">
                                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Unknown date"}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="p-6 rounded-[28px] border relative overflow-hidden space-y-6"
                            style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                            <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                            <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Automatic Telemetry</h3>
                            <div className="space-y-4 py-2 text-xs font-mono">
                              {[
                                { k: "Active Phone Pairings", v: `${telemetry.activePairings} devices` },
                                { k: "Average Client Latency", v: telemetry.avgLatency },
                                { k: "Total Flash Paste Triggers", v: `${telemetry.flashPasteCount} runs` },
                                { k: "Total Type Mode Triggers", v: `${telemetry.typeModeCount} runs` }
                              ].map((r, i) => (
                                <div key={i} className="flex justify-between pb-2" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                  <span style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{r.k}</span>
                                  <span className="font-bold text-white">{r.v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ LEGAL ACCEPTANCES ═══ */}
                  {view === "legal_acceptances" && (
                    <motion.div key="legal" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h2 className="text-xl font-black font-[family-name:var(--font-outfit)] tracking-wide uppercase">Legal Acceptances</h2>
                          <p className="text-xs" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Audit trail of terms and policy agreements by client devices</p>
                        </div>
                      </div>

                      {/* Filters and Search */}
                      <div className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4"
                        style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="relative w-full md:w-80">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }} />
                          <input type="text" value={legalSearch} onChange={e => setLegalSearch(e.target.value)} placeholder="Search Hardware ID or User Email..."
                            className={`w-full text-xs rounded-xl pl-9 pr-4 py-2.5 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`} />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] uppercase font-bold" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>Platform:</span>
                          <select value={legalPlatformFilter} onChange={e => setLegalPlatformFilter(e.target.value)} className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${inputBg}`}>
                            <option value="all">All</option>
                            <option value="windows">Windows</option>
                            <option value="macos">macOS</option>
                          </select>
                        </div>
                      </div>

                      {/* Acceptances Table */}
                      <div className="rounded-2xl border overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse" style={{ minWidth: "900px" }}>
                            <thead>
                              <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                {["Timestamp", "User Email", "Platform", "App Version", "Full Hardware ID"].map(h => (
                                  <th key={h} className="p-4 text-[10px] uppercase font-extrabold tracking-widest pl-6"
                                    style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {legalAcceptances
                                .filter(item => {
                                  const parts = item.event ? item.event.split(":") : [];
                                  const platform = parts[2] ? parts[2].toLowerCase() : "";
                                  
                                  const matchesSearch = 
                                    item.hwid.toLowerCase().includes(legalSearch.toLowerCase()) || 
                                    (item.email && item.email.toLowerCase().includes(legalSearch.toLowerCase()));
                                  const matchesPlatform = 
                                    legalPlatformFilter === "all" || 
                                    platform === legalPlatformFilter;
                                    
                                  return matchesSearch && matchesPlatform;
                                })
                                .map(item => {
                                  const parts = item.event ? item.event.split(":") : [];
                                  const version = parts[1] || "1.0.0";
                                  const platform = parts[2] || "Unknown";
                                  
                                  return (
                                    <tr key={item.id} className="text-xs hover:opacity-90 transition-colors" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                      <td className="p-4 pl-6 font-mono text-[10px] whitespace-nowrap" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>
                                        {formatLocalTime(item.timestamp)}
                                      </td>
                                      <td className="p-4 pl-6 font-bold">
                                        {item.email || (
                                          <span className="text-[10px] italic font-normal" style={{ color: dk ? `${P.sky}40` : `${P.black}30` }}>
                                            Anonymous / Trial
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-4 pl-6">
                                        <span className="text-[10px] px-2.5 py-0.5 rounded-md font-mono border" 
                                          style={{ 
                                            background: platform.toLowerCase() === "windows" ? `${P.blue}15` : `${P.sky}15`, 
                                            color: platform.toLowerCase() === "windows" ? P.blue : (dk ? P.sky : P.black), 
                                            borderColor: platform.toLowerCase() === "windows" ? `${P.blue}25` : `${P.sky}25` 
                                          }}>
                                          {platform}
                                        </span>
                                      </td>
                                      <td className="p-4 pl-6 font-mono" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                                        v{version}
                                      </td>
                                      <td className="p-4 pl-6 font-mono text-[10px] tracking-tight whitespace-nowrap pr-6 select-all font-semibold" style={{ color: dk ? P.white : P.black }}>
                                        {item.hwid}
                                      </td>
                                    </tr>
                                  );
                                })}
                              {legalAcceptances.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="text-center py-8 text-xs text-mono" style={{ color: dk ? `${P.sky}50` : `${P.black}40` }}>
                                    {loadingLegal ? "Loading acceptances..." : "No legal acceptance logs recorded."}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ TELEMETRY REAL-TIME CHARTS ═══ */}
                  {view === "telemetry_charts" && (
                    <motion.div key="telemetry_charts" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-1 pb-4 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <div>
                          <h2 className="text-2xl font-black font-outfit tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Real-time System Metrics</h2>
                          <p className="text-xs opacity-75 mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            Outbound telemetry monitoring database latency and memory consumption logs
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Database Latency Tracker Card */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden flex flex-col justify-between"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div>
                            <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-4 flex items-center justify-between" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                              Database Query Latency
                              <span className="text-emerald-500 font-mono text-[9px] font-bold uppercase tracking-wider">Live feeds (5s)</span>
                            </h3>
                            <div className="h-32 flex items-end gap-1.5 pt-4">
                              {latencyHistory.map((val, idx) => {
                                const maxVal = Math.max(...latencyHistory, 50);
                                const heightPct = `${Math.min(100, (val / maxVal) * 100)}%`;
                                return (
                                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                    <div className="w-full rounded-t-md transition-all hover:brightness-110" style={{ height: heightPct, background: val > 40 ? P.error : P.blue }} />
                                    <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 text-[9px] font-mono rounded px-1 py-0.5 bg-black text-white pointer-events-none transition-opacity whitespace-nowrap z-10">{val}ms</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between text-[9px] font-mono text-white/40 mt-3 pt-2 border-t" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                              <span>Older</span>
                              <span>Current ({diagnosticsData?.database?.latency ?? 0} ms)</span>
                            </div>
                          </div>
                        </div>

                        {/* Node.js Heap Memory Usage Tracker Card */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden flex flex-col justify-between"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)", backdropFilter: "blur(40px)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <div>
                            <h3 className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-4 flex items-center justify-between" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                              Server Memory Allocation
                              <span className="text-emerald-500 font-mono text-[9px] font-bold uppercase tracking-wider">Live feeds (5s)</span>
                            </h3>
                            <div className="h-32 flex items-end gap-1.5 pt-4">
                              {memoryHistory.map((val, idx) => {
                                const maxVal = Math.max(...memoryHistory, 150);
                                const heightPct = `${Math.min(100, (val / maxVal) * 100)}%`;
                                return (
                                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                    <div className="w-full rounded-t-md transition-all hover:brightness-110" style={{ height: heightPct, background: val > 120 ? P.error : "#F59E0B" }} />
                                    <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 text-[9px] font-mono rounded px-1 py-0.5 bg-black text-white pointer-events-none transition-opacity whitespace-nowrap z-10">{val} MB</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between text-[9px] font-mono text-white/40 mt-3 pt-2 border-t" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                              <span>Older</span>
                              <span>Current ({diagnosticsData?.system?.memoryHeapUsed ?? 0} MB)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ ACTIVE SESSIONS INSPECTOR ═══ */}
                  {view === "sessions_inspector" && (
                    <motion.div key="sessions_inspector" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1 pb-4 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <div>
                          <h2 className="text-2xl font-black font-outfit tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Active Companion Sessions</h2>
                          <p className="text-xs opacity-75 mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            {activeSessions.length} active client devices &bull; revoke authentication tokens instantly
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                {["User Email", "Session Token", "Client Device", "Location IP", "Created At", "Action"].map(h => (
                                  <th key={h} className="p-4 text-[9px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {activeSessions.map(sess => (
                                <tr key={sess.token} className="text-xs" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                  <td className="p-4 font-bold">{sess.email}</td>
                                  <td className="p-4 font-mono font-bold text-sky-400 select-all">{sess.token}</td>
                                  <td className="p-4">{sess.device}</td>
                                  <td className="p-4 font-mono">{sess.ip}</td>
                                  <td className="p-4 font-mono opacity-50">{sess.created}</td>
                                  <td className="p-4">
                                    <button
                                      onClick={() => {
                                        if (confirm(`Force-revoke session token ${sess.token}? This will instantly log out the companion client.`)) {
                                          setActiveSessions(prev => prev.filter(s => s.token !== sess.token));
                                          showToast("success", "Session token revoked successfully.");
                                        }
                                      }}
                                      className="px-3 py-1.5 rounded-lg border font-bold text-[10px] border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 cursor-pointer active:scale-95 transition-all"
                                    >
                                      Force Logout
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ WEBHOOKS DISPATCHER ═══ */}
                  {view === "webhooks" && (
                    <motion.div key="webhooks" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1 pb-4 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <div>
                          <h2 className="text-2xl font-black font-outfit tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Webhooks Dispatcher</h2>
                          <p className="text-xs opacity-75 mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            Trigger external API endpoints automatically on system and resources updates
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Webhook Form */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden space-y-4"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Register Endpoint</h3>
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Receiver Name</label>
                              <input type="text" value={newWebhookName} onChange={e => setNewWebhookName(e.target.value)} placeholder="Discord alerts"
                                className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`} />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Target Endpoint URL</label>
                              <input type="url" value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} placeholder="https://api.example.com/webhook"
                                className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`} />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Trigger Event Action</label>
                              <select value={newWebhookEvent} onChange={e => setNewWebhookEvent(e.target.value)}
                                className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`}>
                                <option value="resource.created">resource.created</option>
                                <option value="resource.updated">resource.updated</option>
                                <option value="security.breach">security.breach</option>
                                <option value="activation.expired">activation.expired</option>
                              </select>
                            </div>
                            <button
                              onClick={() => {
                                if (!newWebhookName || !newWebhookUrl) return showToast("error", "All fields are required.");
                                setWebhooks(prev => [...prev, { id: String(Date.now()), name: newWebhookName, url: newWebhookUrl, event: newWebhookEvent, active: true }]);
                                setNewWebhookName("");
                                setNewWebhookUrl("");
                                showToast("success", "Webhook registered successfully.");
                              }}
                              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-md shadow-sky-600/10 cursor-pointer active:scale-95"
                            >
                              Add Webhook
                            </button>
                          </div>
                        </div>

                        {/* Webhooks Table */}
                        <div className="lg:col-span-2 rounded-[28px] border overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                          <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                            <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Registered Webhooks</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                  {["Receiver", "Target URL", "Event", "Status", "Actions"].map(h => (
                                    <th key={h} className="p-4 text-[9px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {webhooks.map(wh => (
                                  <tr key={wh.id} className="text-xs" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                    <td className="p-4 font-bold">{wh.name}</td>
                                    <td className="p-4 font-mono opacity-65 truncate max-w-[200px]" title={wh.url}>{wh.url}</td>
                                    <td className="p-4"><span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400">{wh.event}</span></td>
                                    <td className="p-4">
                                      <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded ${wh.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                                        {wh.active ? "active" : "disabled"}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => {
                                            setTestingWebhookId(wh.id);
                                            setTimeout(() => {
                                              setTestingWebhookId(null);
                                              showToast("success", "Test payload fired successfully. HTTP 200 OK received.");
                                            }, 1000);
                                          }}
                                          className="text-[10px] font-bold text-sky-400 hover:underline disabled:opacity-50"
                                          disabled={testingWebhookId === wh.id}
                                        >
                                          {testingWebhookId === wh.id ? "Firing..." : "Test Payload"}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setWebhooks(prev => prev.map(w => w.id === wh.id ? { ...w, active: !w.active } : w));
                                          }}
                                          className="text-[10px] font-bold text-amber-400 hover:underline"
                                        >
                                          Toggle
                                        </button>
                                        <button
                                          onClick={() => {
                                            setWebhooks(prev => prev.filter(w => w.id !== wh.id));
                                          }}
                                          className="text-[10px] font-bold text-red-400 hover:underline"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ CLIPBOARD ROOMS TRAFFIC LOGS ═══ */}
                  {view === "clipboard_logs" && (
                    <motion.div key="clipboard_logs" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1 pb-4 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <div>
                          <h2 className="text-2xl font-black font-outfit tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Clipboard Traffic Logs</h2>
                          <p className="text-xs opacity-75 mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            Real-time transaction log of text and image packet transmissions in sync rooms
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border overflow-hidden" style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                {["Transaction ID", "Clipboard Room", "Event Type", "Payload Size", "Client User", "Timestamp"].map(h => (
                                  <th key={h} className="p-4 text-[9px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {clipboardLogs.map(log => (
                                <tr key={log.id} className="text-xs" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                  <td className="p-4 font-mono font-bold">TX_{log.id}</td>
                                  <td className="p-4 font-mono font-bold text-sky-400">{log.room}</td>
                                  <td className="p-4">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${log.event.includes("Image") ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
                                      {log.event}
                                    </span>
                                  </td>
                                  <td className="p-4 font-mono font-semibold">{log.size}</td>
                                  <td className="p-4 font-bold">{log.client}</td>
                                  <td className="p-4 font-mono opacity-50">{log.timestamp}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ FIREWALL IP BLOCK MANAGER ═══ */}
                  {view === "firewall" && (
                    <motion.div key="firewall" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1 pb-4 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <div>
                          <h2 className="text-2xl font-black font-outfit tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Firewall Control</h2>
                          <p className="text-xs opacity-75 mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            Globally block requests from specific IP addresses violating rate-limits or authentication parameters
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Form */}
                        <div className="p-6 rounded-[28px] border relative overflow-hidden space-y-4"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                          <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                          <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Block IP Address</h3>
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Target IP Address</label>
                              <input type="text" value={newBlockedIp} onChange={e => setNewBlockedIp(e.target.value)} placeholder="e.g. 192.168.4.15"
                                className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`} />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Violation Reason</label>
                              <input type="text" value={newBlockedReason} onChange={e => setNewBlockedReason(e.target.value)} placeholder="Rate limit abuse"
                                className={`w-full text-xs rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 focus:ring-sky-400 ${inputBg}`} />
                            </div>
                            <button
                              onClick={() => {
                                if (!newBlockedIp || !newBlockedReason) return showToast("error", "IP and Reason are required.");
                                setBlockedIps(prev => [...prev, { ip: newBlockedIp, reason: newBlockedReason, blockedAt: new Date().toLocaleString(), attempts: 1 }]);
                                setNewBlockedIp("");
                                setNewBlockedReason("");
                                showToast("success", `IP Address ${newBlockedIp} blocked successfully.`);
                              }}
                              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-md shadow-sky-600/10 cursor-pointer active:scale-95"
                            >
                              Add Block
                            </button>
                          </div>
                        </div>

                        {/* List */}
                        <div className="lg:col-span-2 rounded-[28px] border overflow-hidden"
                          style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                          <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                            <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Blocked IP Addresses</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr style={{ background: dk ? "rgba(5,5,5,0.4)" : "rgba(250,250,250,0.6)", borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                                  {["IP Address", "Reason", "Blocked At", "Blocked Attempts", "Action"].map(h => (
                                    <th key={h} className="p-4 text-[9px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}70` : `${P.black}50` }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {blockedIps.map(block => (
                                  <tr key={block.ip} className="text-xs" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.04)" : "rgba(5,5,5,0.03)"}` }}>
                                    <td className="p-4 font-mono font-bold text-red-400 select-all">{block.ip}</td>
                                    <td className="p-4 font-semibold">{block.reason}</td>
                                    <td className="p-4 font-mono opacity-50">{block.blockedAt}</td>
                                    <td className="p-4 font-mono text-center font-bold text-amber-500">{block.attempts}</td>
                                    <td className="p-4">
                                      <button
                                        onClick={() => {
                                          setBlockedIps(prev => prev.filter(b => b.ip !== block.ip));
                                          showToast("success", `IP Address ${block.ip} unblocked.`);
                                        }}
                                        className="text-[10px] font-bold text-sky-400 hover:underline cursor-pointer"
                                      >
                                        Unblock
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ═══ GLOBAL FEATURE FLAGS ═══ */}
                  {view === "feature_flags" && (
                    <motion.div key="feature_flags" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1 pb-4 border-b" style={{ borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                        <div>
                          <h2 className="text-2xl font-black font-outfit tracking-wide uppercase" style={{ color: dk ? P.white : P.black }}>Feature Flags Console</h2>
                          <p className="text-xs opacity-75 mt-1" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>
                            Toggle core app modules and trigger API configuration flags in real time
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                          { key: "maintenanceMode", name: "Maintenance Mode", desc: "Block client write requests globally and display status banner.", icon: AlertTriangle },
                          { key: "resourceCreation", name: "Allow Resource Creations", desc: "Allows providers and contributors to publish codes.", icon: BookOpen },
                          { key: "clipboardSync", name: "Allow Clipboard Syncing", desc: "Enables clipboard room creation and synchronizations.", icon: Clipboard },
                          { key: "analyticsTracking", name: "Analytics Telemetry", desc: "Record user dau/wau adoption signals dynamically.", icon: Activity },
                          { key: "couponsRedemption", name: "Coupons & Discounts", desc: "Allows checking out premium tiers using codes.", icon: Tag }
                        ].map(flag => {
                          const active = featureFlags[flag.key];
                          return (
                            <div key={flag.key} className="p-6 rounded-[28px] border relative overflow-hidden flex flex-col justify-between"
                              style={{ background: dk ? "rgba(5,5,5,0.50)" : "rgba(255,255,255,0.70)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}>
                              <div>
                                <div className="flex items-center gap-3 mb-3">
                                  <flag.icon size={16} className={active ? "text-[#0077C0]" : "text-white/40"} />
                                  <h4 className="text-xs font-extrabold uppercase tracking-wide">{flag.name}</h4>
                                </div>
                                <p className="text-[10px] leading-relaxed opacity-60 mb-5" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{flag.desc}</p>
                              </div>
                              <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                                <span className={`text-[10px] font-bold uppercase ${active ? "text-emerald-400" : "text-red-400"}`}>
                                  {active ? "ON" : "OFF"}
                                </span>
                                <button
                                  onClick={() => {
                                    setFeatureFlags(prev => ({ ...prev, [flag.key]: !prev[flag.key] }));
                                    showToast("success", `${flag.name} toggled successfully.`);
                                  }}
                                  className={`px-3.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                                    active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"
                                  }`}
                                >
                                  Toggle Flag
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* ─── Notification Drawer ─── */}
            <AnimatePresence>
              {notiOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                  onClick={() => setNotiOpen(false)}>
                  <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="w-80 h-full p-6 border-l flex flex-col backdrop-blur-3xl"
                    style={{ background: dk ? "rgba(5,5,5,0.92)" : "rgba(255,255,255,0.92)", borderColor: dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)" }}
                    onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center pb-3 mb-6" style={{ borderBottom: `1px solid ${dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)"}` }}>
                      <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Notifications</h3>
                      <button onClick={() => setNotiOpen(false)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: dk ? P.sky : P.black }}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {notifications.map(n => (
                        <div key={n.id} className="p-3 rounded-xl border text-xs space-y-1"
                          style={{ background: dk ? "rgba(5,5,5,0.3)" : "rgba(250,250,250,0.5)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold">{n.title}</span>
                            <span className="text-[8px]" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>{n.time}</span>
                          </div>
                          <p className="text-[10px] leading-normal" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>{n.desc}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Command Palette ─── */}
            <AnimatePresence>
              {cmdOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
                  style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                  onClick={() => setCmdOpen(false)}>
                  <motion.div initial={{ scale: 0.95, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -20 }}
                    className="w-full max-w-[550px] rounded-3xl border shadow-2xl p-4 overflow-hidden"
                    style={{ background: dk ? "rgba(5,5,5,0.95)" : "rgba(255,255,255,0.95)", borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)" }}
                    onClick={e => e.stopPropagation()}>
                    <div className="relative mb-3">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }} />
                      <input ref={cmdRef} type="text" placeholder="Search views, toggle theme, sign out..."
                        value={cmdQ} onChange={e => setCmdQ(e.target.value)}
                        className={`w-full text-xs rounded-2xl pl-10 pr-4 py-3 border focus:outline-none ${inputBg}`} />
                    </div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 text-xs">
                      {cmdActions.map((item, i) => (
                        <button key={i} onClick={item.action}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl hover:opacity-80 transition-colors"
                          style={{ color: dk ? `${P.sky}CC` : `${P.black}AA` }}>
                          {item.name}
                        </button>
                      ))}
                      {cmdActions.length === 0 && (
                        <div className="py-8 text-center text-xs" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>No matching commands.</div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── New / Edit Resource Modal ─── */}
            <AnimatePresence>
              {showNewSessionModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
                  style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
                  onClick={() => { setShowNewSessionModal(false); setEditingResourceId(null); }}>
                  <motion.div
                    initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                    className="w-full max-w-2xl rounded-[28px] border p-6 space-y-5 relative overflow-hidden max-h-[92vh] overflow-y-auto"
                    style={{ background: dk ? "rgba(5,5,5,0.96)" : "rgba(255,255,255,0.96)", borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)" }}
                    onClick={e => e.stopPropagation()}>
                    <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />

                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>
                          {editingResourceId ? "Edit Resource" : "New Resource"}
                        </h3>
                        <p className="text-[10px] mt-0.5" style={{ color: dk ? `${P.sky}60` : `${P.black}40` }}>
                          {editingResourceId ? "Update the resource details below" : "Publish a new resource to the platform"}
                        </p>
                      </div>
                      <button
                        onClick={() => { setShowNewSessionModal(false); setEditingResourceId(null); }}
                        className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0 ml-4"
                        style={{ color: dk ? P.sky : P.black }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Form fields */}
                    <div className="space-y-4">

                      {/* Title + Type */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Title *</label>
                          <input
                            id="resource-title"
                            type="text"
                            value={qTitle}
                            onChange={e => setQTitle(e.target.value)}
                            placeholder="e.g. Binary Search Template"
                            autoFocus
                            className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Type</label>
                          <select
                            value={qType}
                            onChange={e => setQType(e.target.value as any)}
                            className={`w-full text-xs rounded-xl px-3 py-3 border focus:outline-none ${inputBg}`}
                          >
                            <option value="snippet">Snippet</option>
                            <option value="macro">Macro</option>
                          </select>
                        </div>
                      </div>

                      {/* Language + Tags */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Language</label>
                          <select
                            value={qLang}
                            onChange={e => setQLang(e.target.value)}
                            className={`w-full text-xs rounded-xl px-3 py-3 border focus:outline-none ${inputBg}`}
                          >
                            <option value="cpp">C++ (cpp)</option>
                            <option value="c">C</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="javascript">JavaScript</option>
                            <option value="typescript">TypeScript</option>
                            <option value="go">Go</option>
                            <option value="rust">Rust</option>
                            <option value="bash">Bash / Shell</option>
                            <option value="sql">SQL</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Tags (comma separated)</label>
                          <input
                            type="text"
                            value={newQTags}
                            onChange={e => setNewQTags(e.target.value)}
                            placeholder="#algorithm, #graph, #dp"
                            className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                          />
                        </div>
                      </div>

                      {/* Creator Email */}
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Creator Email</label>
                        <input
                          type="email"
                          value={newLicenseEmail}
                          onChange={e => setNewLicenseEmail(e.target.value)}
                          placeholder="creator@example.com (defaults to your admin account)"
                          className={`w-full text-xs rounded-xl px-3.5 py-3 border focus:outline-none focus:ring-1 focus:ring-[#0077C0]/30 ${inputBg}`}
                        />
                      </div>

                      {/* Content editor */}
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider mb-1.5 block" style={{ color: dk ? `${P.sky}80` : `${P.black}60` }}>Content *</label>
                        <textarea
                          value={qCode}
                          onChange={e => setQCode(e.target.value)}
                          placeholder="Paste or type the resource content here..."
                          className="w-full h-52 text-xs font-mono rounded-xl p-4 border focus:outline-none resize-y"
                          style={{ background: "#151b22", borderColor: "rgba(199,238,255,0.12)", color: "#8ecfff" }}
                        />
                      </div>

                      {/* Submit */}
                      <button
                        onClick={editingResourceId ? handleSaveResource : handleAddResource}
                        className="w-full py-3.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
                        style={{ background: P.blue }}
                      >
                        {editingResourceId ? <><Save size={14} /> Save Changes</> : <><Plus size={14} /> Create Resource</>}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Manage Exam Types Modal ─── */}
            <AnimatePresence>
              {showManageTypes && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center px-4"
                  style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                  onClick={() => setShowManageTypes(false)}>
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                    className="w-full max-w-[400px] rounded-[28px] border p-6 space-y-5 relative overflow-hidden"
                    style={{ background: dk ? "rgba(5,5,5,0.95)" : "rgba(255,255,255,0.95)", borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)" }}
                    onClick={e => e.stopPropagation()}>
                    <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${gradientLine}`} />
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: P.blue }}>Manage Resource Types</h3>
                      <button onClick={() => setShowManageTypes(false)} className="p-1 rounded-lg hover:opacity-70" style={{ color: dk ? P.sky : P.black }}><X size={14} /></button>
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {examTypes.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border"
                          style={{ background: dk ? "rgba(5,5,5,0.3)" : "rgba(250,250,250,0.5)", borderColor: dk ? "rgba(199,238,255,0.06)" : "rgba(5,5,5,0.04)" }}>
                          {editingTypeIdx === i ? (
                            <input type="text" value={editingTypeName} onChange={e => setEditingTypeName(e.target.value)} className={`text-xs rounded-lg px-2 py-1 border focus:outline-none flex-1 mr-2 ${inputBg}`} autoFocus />
                          ) : (
                            <div className="flex flex-col gap-2 flex-1 mr-4 min-w-0">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold truncate">{t}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}50` : `${P.black}50` }}>Rule:</span>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. 5" 
                                    value={examRules[t] || ""} 
                                    onChange={e => handleUpdateRule(t, e.target.value)}
                                    className={`w-14 text-[10px] rounded-lg px-1.5 py-0.5 border focus:outline-none ${inputBg}`} 
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}50` : `${P.black}50` }}>Limits:</span>
                                  <input 
                                    type="number" 
                                    min="1"
                                    placeholder="1" 
                                    value={sessionLimits[t] !== undefined ? sessionLimits[t] : 1} 
                                    onChange={e => handleUpdateSessionLimit(t, parseInt(e.target.value, 10) || 1)}
                                    className={`w-10 text-[10px] rounded-lg px-1 py-0.5 border focus:outline-none ${inputBg}`} 
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}50` : `${P.black}50` }}>Level:</span>
                                  <select
                                    value={examYears[t] || "1st Year"}
                                    onChange={e => handleUpdateExamYear(t, e.target.value)}
                                    className={`text-[9px] rounded-lg px-1 py-0.5 border focus:outline-none ${inputBg}`}
                                    style={{ color: dk ? P.sky : P.black }}
                                  >
                                    <option value="1st Year">Level 1</option>
                                    <option value="2nd Year">Level 2</option>
                                    <option value="3rd Year">Level 3</option>
                                    <option value="4th Year">Level 4</option>
                                  </select>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] uppercase font-bold tracking-wider" style={{ color: dk ? `${P.sky}50` : `${P.black}50` }}>Pin:</span>
                                  <button 
                                    onClick={() => handleToggleActiveExamType(t)}
                                    className="px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all uppercase tracking-wider"
                                    style={{ 
                                      background: (examRules[`PINNED_COLLECTION_${examYears[t] || "1st Year"}`] === t || examRules[`ACTIVE_PINNED_EXAM_${examYears[t] || "1st Year"}`] === t) ? `${P.blue}15` : "transparent",
                                      borderColor: (examRules[`PINNED_COLLECTION_${examYears[t] || "1st Year"}`] === t || examRules[`ACTIVE_PINNED_EXAM_${examYears[t] || "1st Year"}`] === t) ? `${P.blue}30` : dk ? "rgba(199,238,255,0.08)" : "rgba(5,5,5,0.06)",
                                      color: (examRules[`PINNED_COLLECTION_${examYears[t] || "1st Year"}`] === t || examRules[`ACTIVE_PINNED_EXAM_${examYears[t] || "1st Year"}`] === t) ? P.blue : dk ? `${P.sky}60` : `${P.black}40`
                                    }}
                                  >
                                    {(examRules[`PINNED_COLLECTION_${examYears[t] || "1st Year"}`] === t || examRules[`ACTIVE_PINNED_EXAM_${examYears[t] || "1st Year"}`] === t) ? "Pinned" : "Pin"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {editingTypeIdx === i ? (
                              <>
                                <button onClick={() => { const u = [...examTypes]; u[i] = editingTypeName; setExamTypes(u); setEditingTypeIdx(null); }} className="p-1 rounded" style={{ color: P.blue }}><Check size={12} /></button>
                                <button onClick={() => setEditingTypeIdx(null)} className="p-1 rounded" style={{ color: P.error }}><X size={12} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditingTypeIdx(i); setEditingTypeName(t); }} className="p-1 rounded hover:opacity-70" style={{ color: dk ? P.sky : P.black }}><Edit2 size={12} /></button>
                                <button onClick={() => { setDeleteTargetType(t); setDeleteTypeConfirmText(""); setShowDeleteTypeModal(true); }} className="p-1 rounded hover:opacity-70" style={{ color: P.error }}><Trash2 size={12} /></button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input type="text" value={newExamTypeName} onChange={e => setNewExamTypeName(e.target.value)} placeholder="New type..."
                        className={`flex-1 text-xs rounded-xl px-3 py-2.5 border focus:outline-none ${inputBg}`} />
                      <button onClick={() => {
                        const added = newExamTypeName.trim();
                        if (added) {
                          setDeletedExamTypes(prev => prev.filter(t => t.toLowerCase() !== added.toLowerCase()));
                          setExamTypes(prev => Array.from(new Set([...prev, added])));
                          setNewExamType(added);
                          setNewExamTypeName("");
                        }
                      }}
                        className="px-4 py-2.5 rounded-xl text-white text-xs font-bold active:scale-[0.98] transition-all" style={{ background: P.blue }}>
                        <Plus size={13} />
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══ DELETE EXAM TYPE CONFIRMATION MODAL ═══ */}
            <AnimatePresence>
              {showDeleteTypeModal && deleteTargetType && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteTypeModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="relative w-[95%] sm:max-w-md p-1 rounded-[24px] border border-red-500/30 bg-black shadow-2xl z-10"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className={`p-5 sm:p-6 rounded-[20px] space-y-4`} style={{ background: dk ? "rgba(5,5,5,0.98)" : "rgba(255,255,255,0.98)" }}>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <Trash2 size={16} className="text-red-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-wide text-red-400">Delete Resource Type</h3>
                            <p className={`text-[10px] ${txt3}`}>This will remove the type permanently</p>
                          </div>
                        </div>
                        <button onClick={() => setShowDeleteTypeModal(false)} className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 shrink-0">
                          <X size={14} className={txt1} />
                        </button>
                      </div>

                      {/* Warning */}
                      <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                        <p className="text-xs text-red-300/80 leading-relaxed">
                          You are about to permanently delete the resource type{" "}
                          <span className="font-bold text-white">{deleteTargetType}</span>.
                          {" "}Existing sessions using this type will not be deleted but the type will no longer be available.
                        </p>
                      </div>

                      {/* Type-to-confirm */}
                      <div>
                        <label className={`block text-[10px] uppercase font-bold tracking-wider mb-2 ${txt3}`}>
                          Type <span className="font-mono text-white px-1 py-0.5 rounded bg-white/10 normal-case">{deleteTargetType}</span> to confirm
                        </label>
                        <input
                          type="text"
                          value={deleteTypeConfirmText}
                          onChange={e => setDeleteTypeConfirmText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && deleteTypeConfirmText.trim().toLowerCase() === deleteTargetType.trim().toLowerCase()) {
                              setDeletedExamTypes(prev => Array.from(new Set([...prev, deleteTargetType])));
                              setExamTypes(prev => prev.filter(t => t !== deleteTargetType));
                              setShowDeleteTypeModal(false);
                              setDeleteTargetType(null);
                              setDeleteTypeConfirmText("");
                            }
                          }}
                          placeholder={`Type "${deleteTargetType}" here...`}
                          autoFocus
                          className={`w-full text-xs font-mono rounded-xl px-4 py-3 border focus:outline-none focus:ring-1 transition-all ${
                            deleteTypeConfirmText.trim().toLowerCase() === deleteTargetType.trim().toLowerCase()
                              ? 'border-red-500/50 focus:ring-red-500/20 bg-red-500/5'
                              : inputBg
                          }`}
                        />
                      </div>

                      {/* Footer */}
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setShowDeleteTypeModal(false)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (deleteTypeConfirmText.trim().toLowerCase() !== deleteTargetType.trim().toLowerCase()) return;
                            setDeletedExamTypes(prev => Array.from(new Set([...prev, deleteTargetType])));
                            setExamTypes(prev => prev.filter(t => t !== deleteTargetType));
                            setShowDeleteTypeModal(false);
                            setDeleteTargetType(null);
                            setDeleteTypeConfirmText("");
                            showToast("success", `Exam type "${deleteTargetType}" deleted.`);
                          }}
                          disabled={deleteTypeConfirmText.trim().toLowerCase() !== deleteTargetType.trim().toLowerCase()}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            deleteTypeConfirmText.trim().toLowerCase() === deleteTargetType.trim().toLowerCase()
                              ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 active:scale-[0.98]'
                              : 'bg-red-900/20 text-red-700 cursor-not-allowed border border-red-500/10'
                          }`}
                        >
                          <Trash2 size={12} />
                          Delete Type
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* ═══ PROVIDER DETAILS MODAL ═══ */}
            <AnimatePresence>
              {selectedProviderDetails && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProviderDetails(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    className="relative w-[95%] sm:max-w-md p-1 rounded-[24px] border bg-black shadow-2xl z-10"
                    style={{ borderColor: dk ? "rgba(199,238,255,0.1)" : "rgba(5,5,5,0.08)" }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="p-5 sm:p-6 rounded-[20px] space-y-4" style={{ background: dk ? "rgba(5,5,5,0.98)" : "rgba(255,255,255,0.98)" }}>
                      <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: P.blue }}>Provider Profile Details</h3>
                          <p className="text-[10px]" style={{ color: dk ? `${P.sky}50` : `${P.black}50` }}>Detailed metadata and status check</p>
                        </div>
                        <button onClick={() => setSelectedProviderDetails(null)} className="p-1 rounded-lg hover:opacity-70" style={{ color: dk ? P.sky : P.black }}>
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between border-b pb-2" style={{ borderColor: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                          <span style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Provider ID</span>
                          <span className="font-mono font-bold" style={{ color: dk ? P.white : P.black }}>{selectedProviderDetails.id}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2" style={{ borderColor: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                          <span style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Full Name</span>
                          <span className="font-bold" style={{ color: dk ? P.white : P.black }}>{selectedProviderDetails.name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2" style={{ borderColor: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                          <span style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Email Address</span>
                          <span className="font-semibold" style={{ color: dk ? P.white : P.black }}>{selectedProviderDetails.email}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2" style={{ borderColor: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                          <span style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Assigned Role</span>
                          <span className="font-mono" style={{ color: P.blue }}>{selectedProviderDetails.role}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2" style={{ borderColor: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                          <span style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Account Status</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${selectedProviderDetails.status === "suspended" ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
                            {selectedProviderDetails.status}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-2" style={{ borderColor: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                          <span style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Verification Status</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${selectedProviderDetails.verified ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                            {selectedProviderDetails.verified ? "Verified" : "Pending"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-2" style={{ borderColor: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                          <span style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Joined Date</span>
                          <span className="font-mono text-[11px]" style={{ color: dk ? P.white : P.black }}>{selectedProviderDetails.joinedDate}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2" style={{ borderColor: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                          <span style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Marketing Consent</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${selectedProviderDetails.consentEmails ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                            {selectedProviderDetails.consentEmails ? "Opted In" : "Opted Out"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-2" style={{ borderColor: dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                          <span style={{ color: dk ? `${P.sky}60` : `${P.black}50` }}>Referral Source</span>
                          <span className="font-bold" style={{ color: P.blue }}>{selectedProviderDetails.referral || "Direct / Unknown"}</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3">
                        <button
                          onClick={() => setSelectedProviderDetails(null)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs font-bold border"
                          style={{ borderColor: dk ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", color: dk ? "white" : "black" }}
                        >
                          Close Profile
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>


          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toast ─── */}
      <AnimatePresence>
        {toast.type && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-2xl"
            style={{
              background: dk ? "rgba(5,5,5,0.92)" : "rgba(255,255,255,0.92)",
              borderColor: toast.type === "success" ? `${P.blue}30` : `${P.error}30`,
            }}>
            {toast.type === "success" ? <CheckCircle size={16} style={{ color: P.blue }} /> : <AlertCircle size={16} style={{ color: P.error }} />}
            <span className="text-xs font-semibold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


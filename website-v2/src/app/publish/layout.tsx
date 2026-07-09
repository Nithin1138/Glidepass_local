"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, PenSquare, Layers, ArrowLeft, BarChart3,
  Sun, Moon, LogOut, ShieldCheck, AlertCircle, Menu, X
} from "lucide-react";
import { CreatorContext, type CreatorAuth } from "./context";

function PublishLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /* ── Auth state ────────────────────────────────── */
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [authError, setAuthError] = useState("");
  const [verifying, setVerifying] = useState(false);

  /* ── Theme ─────────────────────────────────────── */
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const dk = theme === "dark";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("glidepass-theme");
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
      }
    }
  }, []);

  /* ── Sidebar ───────────────────────────────────── */
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── Login form fields ─────────────────────────── */
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formKey, setFormKey] = useState("");

  /* ── Hydrate from localStorage ─────────────────── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("glidepass-creator-user");
      if (saved) {
        const p = JSON.parse(saved);
        fetch(`/api/auth/check-email?email=${encodeURIComponent(p.email)}&t=${Date.now()}`, { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => {
            if (!data.exists || data.suspended) {
              localStorage.removeItem("glidepass-creator-user");
              window.location.href = "/provider";
            } else {
              setEmail(p.email); setName(p.name); setLicenseKey(p.licenseKey || "");
              setIsLogged(true);
              setLoading(false);
            }
          })
          .catch(() => {
            setEmail(p.email); setName(p.name); setLicenseKey(p.licenseKey || "");
            setIsLogged(true);
            setLoading(false);
          });
      } else {
        window.location.href = "/provider";
        setLoading(false);
      }
    } catch { 
      setLoading(false);
    }
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  /* ── Login handler ─────────────────────────────── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(""); setVerifying(true);
    if (!formEmail || !formName) { setAuthError("Email and Name are required"); setVerifying(false); return; }

    try {
      const session = { email: formEmail, name: formName, role: "Creator", licenseKey: "" };
      localStorage.setItem("glidepass-creator-user", JSON.stringify(session));
      setEmail(formEmail); setName(formName); setLicenseKey("");
      setIsLogged(true);
    } catch { setAuthError("Login failed. Please try again."); }
    finally { setVerifying(false); }
  }

  function handleLogout() {
    localStorage.removeItem("glidepass-creator-user");
    setIsLogged(false); setEmail(""); setName(""); setLicenseKey("");
    window.location.href = "/provider";
  }

  /* ── Context ───────────────────────────────────── */
  const ctx: CreatorAuth = { email, name, licenseKey, theme, dk, setTheme, logout: handleLogout };

  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "";

  /* ── Nav items ─────────────────────────────────── */
  const nav = [
    { href: "/publish",           label: "Dashboard",    icon: LayoutDashboard, exact: true },
    { href: "/publish?view=analytics", label: "Analytics",     icon: BarChart3,      exact: false },
    { href: "/publish/new",       label: "New Resource",  icon: PenSquare,      exact: true },
    { href: "/publish/hubs",      label: "My Hubs",       icon: Layers,         exact: false },
  ];

  function isActive(item: typeof nav[0]) {
    if (item.href === "/publish?view=analytics") {
      return pathname === "/publish" && currentView === "analytics";
    }
    if (item.href === "/publish") {
      return pathname === "/publish" && currentView !== "analytics";
    }
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  /* ── Loading splash ────────────────────────────── */
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dk ? 'bg-[#050505]' : ''} ${theme}`}>
        <div className="w-5 h-5 border-2 border-[#0077C0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Redirecting state ─────────────────────────── */
  if (!isLogged) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dk ? 'bg-[#050505]' : ''} ${theme}`}
        style={{ background: dk ? '#050505' : 'linear-gradient(135deg, #FAFAF9 0%, #EDEAE0 50%, #E8E4D9 100%)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#0077C0] border-t-transparent rounded-full animate-spin" />
          <p className={`text-xs ${dk ? 'text-white/40' : 'text-[#6B7280]'}`}>Redirecting to Provider portal...</p>
        </div>
      </div>
    );
  }

  /* ── Sidebar renderer (shared between desktop + mobile) ── */
  const renderSidebar = (isExpanded: boolean) => (
    <div className="flex flex-col h-full">
      {/* User */}
      <div className={`${isExpanded ? 'p-5 pb-4' : 'py-4 px-2'} border-b ${dk ? 'border-white/[0.04]' : 'border-black/[0.04]'} transition-all duration-300`}>
        <div className={`flex items-center ${isExpanded ? 'gap-3' : 'justify-center'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0077C0] to-[#009BF5] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className={`min-w-0 flex-1 transition-all duration-200 overflow-hidden ${isExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'}`}>
            <p className={`text-sm font-bold truncate whitespace-nowrap ${dk ? 'text-white' : 'text-[#111827]'}`}>{name}</p>
            <p className={`text-[10px] truncate whitespace-nowrap ${dk ? 'text-white/35' : 'text-[#9CA3AF]'}`}>{email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${isExpanded ? 'px-3' : 'px-2'} py-4 space-y-1 transition-all duration-300`}>
        {nav.map(item => {
          const active = isActive(item);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center ${isExpanded ? 'gap-3 px-3.5' : 'justify-center'} py-2.5 rounded-xl text-[13px] font-medium transition-all relative group ${active
                ? dk
                  ? 'bg-[#0077C0]/10 text-[#0077C0] font-semibold'
                  : 'bg-[#0077C0]/[0.08] text-[#0077C0] font-semibold'
                : dk
                  ? 'text-white/45 hover:text-white/70 hover:bg-white/[0.03]'
                  : 'text-[#6B7280] hover:text-[#374151] hover:bg-black/[0.03]'
              }`}
              title={isExpanded ? undefined : item.label}
            >
              {active && isExpanded && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#0077C0]" />
              )}
              {active && !isExpanded && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-t-full bg-[#0077C0]" />
              )}
              <item.icon size={18} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-200 overflow-hidden ${isExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={`${isExpanded ? 'p-4' : 'p-2'} space-y-2 border-t ${dk ? 'border-white/[0.04]' : 'border-black/[0.04]'} transition-all duration-300`}>
        {/* Discovery link — only when expanded */}
        <div className={`transition-all duration-200 overflow-hidden ${isExpanded ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'}`}>
          <Link href="/resources"
            className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all ${dk
              ? 'text-white/30 hover:text-white/50 hover:bg-white/[0.02]'
              : 'text-[#9CA3AF] hover:text-[#6B7280] hover:bg-black/[0.02]'
            }`}
          >
            <ArrowLeft size={15} />
            <span>Discovery Catalog</span>
          </Link>
        </div>

        {/* Theme Toggle */}
        <button onClick={() => {
          const next = dk ? "light" : "dark";
          setTheme(next);
          localStorage.setItem("glidepass-theme", next);
        }}
          className={`w-full flex items-center ${isExpanded ? 'px-3.5 py-2.5 justify-start gap-3' : 'justify-center py-2.5'} rounded-xl text-[13px] font-medium transition-all ${dk
            ? 'bg-white/[0.04] hover:bg-white/[0.06] text-white/50'
            : 'bg-black/[0.03] hover:bg-black/[0.05] text-[#6B7280]'
          }`}
          title={dk ? "Switch to Light" : "Switch to Dark"}
        >
          {dk ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
          <span className={`whitespace-nowrap transition-all duration-200 overflow-hidden ${isExpanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0'}`}>
            {dk ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        {/* Logout */}
        <button onClick={handleLogout}
          className={`w-full flex items-center ${isExpanded ? 'px-3.5 py-2.5 justify-start gap-3' : 'justify-center py-2.5'} rounded-xl text-[13px] font-medium transition-all ${dk
            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
            : 'bg-red-50 hover:bg-red-100 text-red-650'
          }`}
          title="Logout"
        >
          <LogOut size={16} className="shrink-0" />
          <span className={`whitespace-nowrap transition-all duration-200 overflow-hidden ${isExpanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0'}`}>
            Logout
          </span>
        </button>
      </div>
    </div>
  );

  /* ── Authenticated shell ───────────────────────── */
  return (
    <CreatorContext.Provider value={ctx}>
      <div className={`min-h-screen flex ${theme} font-sans antialiased`}
        style={{ background: dk ? '#050505' : 'linear-gradient(135deg, #FAFAF9 0%, #EDEAE0 50%, #E8E4D9 100%)' }}
      >
        {/* Desktop sidebar — auto collapse on mouse leave, expand on hover */}
        <aside
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          className={`hidden lg:flex flex-col shrink-0 border-r sticky top-0 h-screen overflow-hidden transition-all duration-300 ease-in-out ${
            expanded ? 'w-[260px]' : 'w-[68px]'
          } ${dk
            ? 'border-white/[0.04] bg-[#08080f]/90 backdrop-blur-xl'
            : 'border-black/[0.04] bg-white/80 backdrop-blur-xl'
          }`}
        >
          {renderSidebar(expanded)}
        </aside>

        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40">
          <div className={`flex items-center justify-between px-4 h-14 border-b backdrop-blur-xl ${dk
            ? 'bg-[#050505]/90 border-white/[0.06]'
            : 'bg-white/80 border-black/[0.06]'
          }`}>
            <button onClick={() => setMobileOpen(true)}
              className={`p-2 rounded-xl transition-colors ${dk ? 'hover:bg-white/5 text-white/60' : 'hover:bg-black/5 text-[#6B7280]'}`}
            >
              <Menu size={20} />
            </button>
            <span className={`text-sm font-bold font-outfit tracking-tight ${dk ? 'text-white' : 'text-[#111827]'}`}>
              Creator Console
            </span>
            <button onClick={() => {
              const next = dk ? "light" : "dark";
              setTheme(next);
              localStorage.setItem("glidepass-theme", next);
            }}
              className={`p-2 rounded-xl transition-colors ${dk ? 'hover:bg-white/5 text-white/60' : 'hover:bg-black/5 text-[#6B7280]'}`}
            >
              {dk ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)} />
              <motion.aside
                initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[280px] border-r ${dk
                  ? 'bg-[#08080f] border-white/[0.06]'
                  : 'bg-white border-black/[0.06]'
                }`}
              >
                <button onClick={() => setMobileOpen(false)}
                  className={`absolute top-4 right-4 z-50 p-2 rounded-xl border ${dk ? 'border-white/10 hover:bg-white/5 text-white/60' : 'border-black/10 hover:bg-black/5 text-[#9CA3AF]'}`}
                >
                  <X size={16} />
                </button>
                {renderSidebar(true)}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 min-w-0 lg:overflow-y-auto">
          <div className="pt-14 lg:pt-0">
            {children}
          </div>
        </main>
      </div>
    </CreatorContext.Provider>
  );
}

export default function PublishLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="w-5 h-5 border-2 border-[#0077C0] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PublishLayoutContent>{children}</PublishLayoutContent>
    </Suspense>
  );
}

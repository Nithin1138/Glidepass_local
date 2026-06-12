"use client";

import { useState, useEffect, use, Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Copy, Check, Terminal } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Question {
  id: string;
  title: string;
  code: string;
  language: string;
  contributorName?: string;
}

interface VitCode {
  id: string;
  date: string;
  examType: string;
  questions: Question[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function SessionCodesContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
  const searchParams = useSearchParams();
  const origin = searchParams.get("origin") || "";

  const [theme, setTheme] = useState("dark");
  const dk = theme === "dark";
  const [session, setSession] = useState<VitCode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const res = await fetch("/api/vitcodes");
        if (!res.ok) throw new Error("Failed to load session codes");
        const data: VitCode[] = await res.json();
        const found = data.find((item) => item.id === sessionId);
        if (!found) throw new Error("Session not found");
        setSession(found);
      } catch (err: any) {
        setError(err.message || "Failed to load session details.");
      } finally {
        setLoading(false);
      }
    };
    fetchSessionData();
  }, [sessionId]);

  const handleCopy = (code: string, qId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(qId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendCommandCenter = (code: string) => {
    const targetOrigin = origin || "http://localhost:8000";
    window.location.href = `${targetOrigin}/center?code=${encodeURIComponent(code)}`;
  };

  return (
    <div className={`min-h-screen ${dk ? "bg-black" : "bg-white"} ${dk ? "text-white" : "text-black"} relative font-sans overflow-hidden`}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className={`absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full`} />
      </div>

      <header className={`border-b border-white/[0.04] ${dk ? "bg-black" : "bg-white"}/40 backdrop-blur-xl sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/vitcodes${origin ? `?origin=${encodeURIComponent(origin)}` : ""}`}
              className={`${dk ? "text-white" : "text-black"}/40 hover:${dk ? "text-white" : "text-black"} transition-colors duration-200`}
            >
              <ArrowLeft size={18} />
            </Link>
            <button 
              onClick={() => setTheme(dk ? "light" : "dark")} 
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${dk ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-black/5 border-black/10 text-black hover:bg-black/10'}`}
            >
              <span className="text-[10px] font-bold">TGL</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-outfit font-black text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                LANPAD
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                Session Questions
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className={`text-xs ${dk ? "text-white" : "text-black"}/40`}>Loading session questions...</span>
          </div>
        ) : error || !session ? (
          <div className={`text-center py-20 border border-white/[0.06] bg-white/[0.01] rounded-3xl max-w-lg mx-auto`}>
            <p className={`text-sky-400 text-sm`}>{error || "Session not found."}</p>
            <Link href="/vitcodes" className={`inline-block mt-4 text-xs text-blue-400 hover:underline`}>
              Back to Overview
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <div className={`flex items-center gap-2 text-xs ${dk ? "text-white" : "text-black"}/40 mb-2 font-mono`}>
                <span>{session.date}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{session.examType}</span>
              </div>
              <h1 className={`text-3xl font-outfit font-black tracking-tight ${dk ? "text-white" : "text-black"}`}>
                {session.examType} Questions
              </h1>
            </div>

            <div className="space-y-6">
              {session.questions.map((q, idx) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className={`border border-white/[0.06] bg-white/[0.01] backdrop-blur-md rounded-2xl overflow-hidden`}
                >
                  {/* Card Header */}
                  <div className={`px-6 py-4 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-emerald-400" />
                      <span className={`text-xs font-bold ${dk ? "text-white" : "text-black"}/70 font-mono`}>Question {idx + 1}: {q.title}</span>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider bg-white/10 ${dk ? "text-white" : "text-black"}/60 font-mono font-bold px-2 py-0.5 rounded border ${dk ? "border-white/5" : "border-black/5"}`}>
                      {q.language}
                    </span>
                  </div>

                  {/* Title & Body */}
                  <div className="p-6 space-y-4">
                    {/* Code Editor Preview */}
                    <div className={`relative rounded-xl overflow-hidden border border-white/[0.06] ${dk ? "bg-black" : "bg-white"}`}>
                      <div className="absolute top-3 right-3 z-10 flex gap-2">
                        <button
                          onClick={() => handleCopy(q.code, q.id)}
                          className={`p-1.5 rounded-lg border ${dk ? "border-white/10" : "border-black/10"} ${dk ? "bg-black" : "bg-white"}/60 hover:bg-white/[0.05] ${dk ? "text-white" : "text-black"}/50 hover:${dk ? "text-white" : "text-black"} transition-colors`}
                          title="Copy Code"
                        >
                          {copiedId === q.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      </div>
                      <pre className="p-4 overflow-x-auto text-[11px] font-mono text-emerald-200/90 leading-relaxed max-h-80 select-all">
                        <code>{q.code}</code>
                      </pre>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex flex-row items-center justify-between gap-4">
                      <div className={`text-[10px] ${dk ? "text-white/40" : "text-black/40"} font-mono truncate`}>
                        {q.contributorName && (
                          <span>Contributed by: <span className={`${dk ? "text-white/70" : "text-black/70"} font-semibold`}>{q.contributorName}</span></span>
                        )}
                      </div>
                      <button
                        onClick={() => handleSendCommandCenter(q.code)}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold transition-all shadow-lg shadow-emerald-600/10 active:scale-[0.98] shrink-0"
                      >
                        <Send size={13} />
                        Enter Command Center with Code
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SessionCodesPage({ params }: PageProps) {

  return (
    <Suspense fallback={
      <div className={`min-h-screen bg-black text-white flex items-center justify-center`}>
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    }>
      <SessionCodesContent params={params} />
    </Suspense>
  );
}

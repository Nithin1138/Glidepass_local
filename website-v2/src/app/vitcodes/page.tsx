"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Award, Code2, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Question {
  id: string;
  title: string;
  code: string;
  language: string;
}

interface VitCode {
  id: string;
  date: string;
  examType: string;
  questions: Question[];
}

function VitCodesContent() {
  const searchParams = useSearchParams();
  const origin = searchParams.get("origin") || "";
  
  const [codes, setCodes] = useState<VitCode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const res = await fetch("/api/vitcodes");
        if (!res.ok) throw new Error("Failed to fetch codes");
        const data = await res.json();
        setCodes(data);
      } catch (err: any) {
        setError(err.message || "Failed to load VIT-AP codes.");
      } finally {
        setLoading(false);
      }
    };
    fetchCodes();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative font-sans overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <header className="border-b border-white/[0.04] bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={origin ? `${origin}/` : "/"}
              className="text-white/40 hover:text-white transition-colors duration-200"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-outfit font-black text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                GLIDEPASS
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                VIT-AP Portal
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-xs text-white/50"
          >
            <Sparkles size={12} className="text-emerald-400" />
            <span>Over-The-Air Code Repository</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-outfit font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            VIT-AP Today's Codes
          </h1>
          <p className="text-white/30 max-w-md mx-auto text-sm">
            Select your exam session, copy questions directly, or dispatch code straight to your laptop's clipboard.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs text-white/40">Fetching latest sessions...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20 border border-white/[0.06] bg-white/[0.01] rounded-3xl max-w-lg mx-auto">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-20 border border-white/[0.06] bg-white/[0.01] rounded-3xl max-w-lg mx-auto">
            <p className="text-white/40 text-sm">No exam codes added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {codes.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.6 }}
                whileHover={{ y: -5 }}
              >
                <Link
                  href={`/vitcodes/${session.id}${origin ? `?origin=${encodeURIComponent(origin)}` : ""}`}
                  className="block p-6 bg-[#050505] border border-white/[0.04] rounded-2xl hover:border-emerald-500/30 hover:shadow-[0_20px_40px_rgba(16,185,129,0.02)] transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <Award size={10} />
                      {session.examType}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/30 font-medium">
                      <Calendar size={12} />
                      {session.date}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold font-outfit text-white/80 group-hover:text-white transition-colors duration-300 mb-2">
                    {session.examType} Session
                  </h3>
                  
                  <div className="flex items-center justify-between text-xs text-white/40 pt-4 border-t border-white/[0.04]">
                    <span className="flex items-center gap-1.5">
                      <Code2 size={12} />
                      {session.questions.length} Question{session.questions.length > 1 ? "s" : ""} Available
                    </span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function VitCodesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    }>
      <VitCodesContent />
    </Suspense>
  );
}

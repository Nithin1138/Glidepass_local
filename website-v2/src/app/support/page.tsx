"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare, Send, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message");
      }

      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#EDEAE0] text-gray-900 font-dmsans flex flex-col justify-between relative overflow-x-hidden antialiased">
      {/* Decorative styling matching the main page */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap');
        
        .font-rubik {
          font-family: 'Rubik', sans-serif;
        }
        .font-dmsans {
          font-family: 'DM Sans', sans-serif;
        }

        .clay-card {
          background: #EDEAE0;
          border-radius: 40px;
          box-shadow: 
            20px 20px 40px rgba(0,0,0,0.06), 
            -20px -20px 40px rgba(255,255,255,0.4),
            inset 6px 6px 12px rgba(255,255,255,0.4),
            inset -6px -6px 12px rgba(0,0,0,0.04);
        }

        .clay-card-inset {
          background: #EDEAE0;
          box-shadow: 
            inset 4px 4px 8px rgba(0,0,0,0.04),
            inset -4px -4px 8px rgba(255,255,255,0.3);
          border: 1px solid rgba(255,255,255,0.15);
        }

        .clay-blue {
          background: #468FEA;
          box-shadow: 
            16px 16px 32px rgba(70, 143, 234, 0.2),
            inset 8px 8px 16px rgba(255,255,255,0.3),
            inset -8px -8px 16px rgba(0,0,0,0.12);
        }

        .clay-orange {
          background: #F28500;
          box-shadow: 
            16px 16px 32px rgba(242, 133, 0, 0.2),
            inset 10px 10px 20px rgba(255,255,255,0.4),
            inset -10px -10px 20px rgba(0,0,0,0.15);
        }
      `}</style>

      {/* Header bar */}
      <nav className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 md:py-8 flex items-center justify-between z-10 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 font-rubik font-black text-lg sm:text-xl tracking-tighter text-gray-900">
          <img src="/logo.png" alt="LANpad Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-xl shadow-md" />
          <span className="mt-0.5">LANPAD</span>
        </Link>
        <Link
          href="/"
          className="group flex items-center gap-2 px-4 py-2 rounded-full clay-card text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all text-gray-600 hover:text-gray-900 border border-white/20"
        >
          <ArrowLeft size={11} className="group-hover:-translate-x-0.5 transition-transform" />
          Home
        </Link>
      </nav>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center py-6 px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl w-full clay-card p-6 sm:p-8 md:p-10 border border-white/20 shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10 space-y-6 sm:space-y-8">
            <div className="text-center space-y-2">
              <div className="w-11 h-11 sm:w-12 sm:h-12 clay-orange rounded-2xl flex items-center justify-center text-white mx-auto mb-3 sm:mb-4 shadow-md">
                <MessageSquare size={22} className="sm:w-6 sm:h-6" />
              </div>
              <h2 className="font-rubik text-2xl sm:text-3xl font-black uppercase tracking-tighter text-gray-900">Get in Touch</h2>
              <p className="text-gray-500 font-bold text-[11px] sm:text-xs max-w-xs mx-auto leading-relaxed">
                Have questions or need support? Fill out the form below and we will get back to you shortly.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-8 sm:py-12 space-y-6"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 rounded-full border border-emerald-150 flex items-center justify-center text-emerald-500 mx-auto shadow-md">
                    <CheckCircle2 size={28} className="sm:w-8 sm:h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-rubik text-lg sm:text-xl font-black text-gray-800">Message Sent!</h3>
                    <p className="text-[11px] sm:text-xs text-gray-500 font-bold max-w-xs mx-auto leading-relaxed">
                      Thank you for reaching out. Your query has been forwarded to our support team and we will reply as soon as possible.
                    </p>
                  </div>
                  <button
                    onClick={() => setStatus("idle")}
                    className="px-6 py-3 sm:px-8 sm:py-3.5 rounded-full clay-blue text-white font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-rubik hover:scale-105 transition-transform"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {status === "error" && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-150 text-rose-600 flex items-start gap-3 text-[11px] sm:text-xs font-bold leading-normal">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-gray-400">Your Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full text-sm sm:text-xs font-bold px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#468FEA]/30 transition-all clay-card-inset text-gray-800 placeholder-gray-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-gray-400">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full text-sm sm:text-xs font-bold px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#468FEA]/30 transition-all clay-card-inset text-gray-800 placeholder-gray-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-gray-400">Subject</label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g. License Activation Issue"
                      className="w-full text-sm sm:text-xs font-bold px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#468FEA]/30 transition-all clay-card-inset text-gray-800 placeholder-gray-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-gray-400">Message</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please describe your query in detail..."
                      className="w-full text-sm sm:text-xs font-bold px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#468FEA]/30 transition-all clay-card-inset text-gray-800 placeholder-gray-400 resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="w-full py-4 sm:py-4.5 mt-2 rounded-full clay-blue text-white font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-rubik flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {status === "sending" ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        Send Message
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* Footer bar */}
      <footer className="py-6 text-center text-[9px] sm:text-[10px] text-gray-400 font-mono tracking-widest shrink-0 relative z-10 border-t border-gray-200/20">
        © 2026 LANPAD. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}

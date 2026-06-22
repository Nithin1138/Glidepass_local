"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, Send, AlertTriangle, MessageSquare, Terminal } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Resource {
  id: string;
  title: string;
  type: string;
  language?: string;
  tags: string[];
  content: string;
  views: number;
  copies: number;
  sends: number;
  creatorName?: string;
}

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    fetchResource();
  }, [id]);

  async function fetchResource() {
    try {
      const res = await fetch(`/api/resources/${id}`);
      const data = await res.json();
      if (data.success) {
        setResource(data.resource);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!resource) return;
    try {
      await navigator.clipboard.writeText(resource.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      await fetch(`/api/resources/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy" }),
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSendToLanpad() {
    if (!resource) return;
    setSending(true);
    setSentMessage("");
    try {
      // Send action count increment to cloud API
      await fetch(`/api/resources/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sends" }),
      });

      // Forward resource to locally paired LANpad uvicorn server via bridge endpoint
      const response = await fetch("http://127.0.0.1:8000/receive_resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: resource.title,
          content: resource.content,
          type: resource.type,
          language: resource.language,
        }),
        mode: "cors"
      });

      if (response.ok) {
        setSentMessage("Successfully sent to paired LANpad! Redirecting to Control Center...");
        const params = new URLSearchParams();
        params.append("code", resource.content);
        params.append("title", resource.title);
        if (resource.language) {
          params.append("language", resource.language);
        }
        setTimeout(() => {
          window.location.href = `http://localhost:8000/center?${params.toString()}`;
        }, 1000);
      } else {
        setSentMessage("Resource cached. Ensure your desktop application uvicorn server is running locally on port 8000.");
      }
    } catch (e) {
      setSentMessage("Pairing bridge offline. Please keep uvicorn active or use standard Copy.");
    } finally {
      setSending(false);
    }
  }

  async function handleReport() {
    if (!resource) return;
    setReporting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: "resource",
          target_id: resource.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      if (res.ok) {
        alert("Thank you. Report received and flagged for administrator moderation.");
        setShowReportModal(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReporting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-[#0077C0] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-[#A0AEC0]">Resource not found or has been deleted.</p>
        <Link href="/resources" className="text-xs text-[#0077C0] hover:underline flex items-center gap-1">
          <ArrowLeft size={12} /> Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA] relative overflow-hidden font-sans selection:bg-[#C7EEFF]/20 selection:text-[#C7EEFF]">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,119,192,0.08)_0,transparent_60%)] pointer-events-none" />

      <main className="max-w-4xl mx-auto px-6 py-16 relative z-10 space-y-8">
        <Link href="/resources" className="inline-flex items-center gap-2 text-sm text-[#A0AEC0] hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to Resource Discovery
        </Link>

        <div className="border border-[rgba(199,238,255,0.08)] bg-[#090909] rounded-3xl p-8 space-y-6 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded bg-[rgba(0,119,192,0.15)] text-[#C7EEFF]">
              {resource.type}
            </span>
            <button
              onClick={() => setShowReportModal(true)}
              className="text-xs text-[#A0AEC0] hover:text-[#C62828] transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle size={14} /> Report Abuse
            </button>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight font-outfit text-white">
              {resource.title}
            </h1>
            <p className="text-xs text-[#A0AEC0]">
              Shared by {resource.creatorName || "Anonymous"} • {resource.views} views • {resource.sends} sends
            </p>
          </div>

          {/* Snippet Block */}
          <div className="relative rounded-2xl border border-[rgba(199,238,255,0.05)] bg-[#050505] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(199,238,255,0.05)] bg-[#080808]">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-[#0077C0]" />
                <span className="text-xs text-[#A0AEC0] font-mono">{resource.language || "text"}</span>
              </div>
              <button
                onClick={handleCopy}
                className="text-xs text-[#C7EEFF] hover:underline flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Snippet"}
              </button>
            </div>
            <pre className="p-6 text-xs md:text-sm font-mono overflow-x-auto text-[#FAFAFA] whitespace-pre-wrap leading-relaxed">
              {resource.content}
            </pre>
          </div>

          {/* Send To LANpad Button */}
          <div className="pt-2">
            <button
              onClick={handleSendToLanpad}
              disabled={sending}
              className="w-full py-3 text-sm font-bold rounded-xl bg-[#0077C0] text-white hover:bg-[#005c94] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Send size={14} /> {sending ? "Sending..." : "Send to LANpad"}
            </button>
            {sentMessage && (
              <p className="mt-3 text-xs text-[#C7EEFF] bg-[rgba(199,238,255,0.05)] px-4 py-2.5 rounded-lg border border-[rgba(199,238,255,0.1)] text-center">
                {sentMessage}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md border border-[rgba(199,238,255,0.08)] bg-[#090909] rounded-3xl p-6 space-y-4 relative">
            <h3 className="text-lg font-bold text-white font-outfit">Report Snippet</h3>
            <div className="space-y-3">
              <label className="block text-xs text-[#A0AEC0]">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-[#050505] border border-[rgba(199,238,255,0.08)] rounded-xl p-3 text-xs outline-none text-white focus:border-[#C62828]"
              >
                <option value="spam">Spam / Advertising</option>
                <option value="abuse">Harmful or Dangerous Code</option>
                <option value="copyright">Copyright Infringement</option>
                <option value="other">Other Violation</option>
              </select>

              <label className="block text-xs text-[#A0AEC0]">Details (Optional)</label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe the violation..."
                rows={4}
                className="w-full bg-[#050505] border border-[rgba(199,238,255,0.08)] rounded-xl p-3 text-xs outline-none text-white focus:border-[#C62828]"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-xs text-[#A0AEC0] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={reporting}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#C62828] text-white hover:bg-red-700 transition-colors"
              >
                {reporting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

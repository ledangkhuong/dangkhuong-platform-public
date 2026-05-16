"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import {
  Send, Loader2, Pause, Play, BarChart3, CheckCircle, XCircle,
  Clock, Mail, ArrowLeft,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SendingState {
  status: "sending" | "paused" | "sent" | "failed";
  sent_count: number;
  failed_count: number;
  total_recipients: number;
  name: string;
  subject: string;
  started_at: string | null;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SendingProgressPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [state, setState] = useState<SendingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Helper to update state from campaign data
  const updateFromCampaign = useCallback((campaign: Record<string, unknown>) => {
    const newState: SendingState = {
      status: (campaign.status as SendingState["status"]) ?? "sending",
      sent_count: (campaign.sent_count as number) ?? 0,
      failed_count: (campaign.failed_count as number) ?? 0,
      total_recipients: (campaign.total_recipients as number) ?? 0,
      name: (campaign.name as string) ?? "",
      subject: (campaign.subject as string) ?? "",
      started_at: (campaign.sent_at as string) ?? null,
    };
    setState(newState);

    if (newState.status === "sent" || newState.status === "failed") {
      setCompleted(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, []);

  // Fetch status + continue
  const pollAndContinue = useCallback(async () => {
    try {
      // Continue sending (this also returns updated status)
      const continueRes = await fetch(`/api/email/campaigns/${campaignId}/continue`, { method: "POST" });
      const data = await continueRes.json();

      if (continueRes.ok && data.campaign) {
        // Continue endpoint returned campaign data
        updateFromCampaign(data.campaign);
      } else {
        // Fallback: fetch campaign status directly
        const statusRes = await fetch(`/api/email/campaigns/${campaignId}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const campaign = statusData.campaign ?? statusData;
          updateFromCampaign(campaign);
        }
      }
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [campaignId, updateFromCampaign]);

  // Start polling
  useEffect(() => {
    startTimeRef.current = Date.now();
    pollAndContinue();
    intervalRef.current = setInterval(pollAndContinue, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollAndContinue]);

  // Pause
  const handlePause = async () => {
    setPausing(true);
    try {
      const res = await fetch(`/api/email/campaigns/${campaignId}/pause`, { method: "POST" });
      if (res.ok && state) {
        setState({ ...state, status: "paused" });
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch { /* */ } finally {
      setPausing(false);
    }
  };

  // Resume
  const handleResume = async () => {
    setResuming(true);
    try {
      const res = await fetch(`/api/email/campaigns/${campaignId}/send`, { method: "POST" });
      if (res.ok && state) {
        setState({ ...state, status: "sending" });
        intervalRef.current = setInterval(pollAndContinue, 3000);
      }
    } catch { /* */ } finally {
      setResuming(false);
    }
  };

  // Computed values
  const sent = state?.sent_count ?? 0;
  const failed = state?.failed_count ?? 0;
  const total = state?.total_recipients ?? 1;
  const progress = total > 0 ? Math.min((sent / total) * 100, 100) : 0;

  // Estimated time remaining
  const elapsed = (Date.now() - startTimeRef.current) / 1000;
  const rate = elapsed > 0 && sent > 0 ? sent / elapsed : 0;
  const remaining = rate > 0 ? Math.ceil((total - sent) / rate) : 0;
  const remainingMin = Math.floor(remaining / 60);
  const remainingSec = remaining % 60;

  if (loading) {
    return (
      <div>
        <TopBar title="Dang tai..." />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-[#D4A843]" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title={completed ? "Gui thanh cong!" : "Dang gui campaign..."} subtitle={state?.name ?? ""} />

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">

        {/* Main progress card */}
        <div className="card-dark p-8 text-center space-y-6">
          {/* Circular-like progress */}
          <div className="relative w-40 h-40 mx-auto">
            <svg viewBox="0 0 120 120" className="w-full h-full">
              {/* Background circle */}
              <circle cx="60" cy="60" r="52" fill="none" stroke="#2a2a2a" strokeWidth="8" />
              {/* Progress circle */}
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke={completed ? "#22c55e" : state?.status === "paused" ? "#f97316" : "#D4A843"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
                transform="rotate(-90 60 60)"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {completed ? (
                <CheckCircle size={32} className="text-[#22c55e] mb-1" />
              ) : state?.status === "paused" ? (
                <Pause size={32} className="text-[#f97316] mb-1" />
              ) : (
                <div className="relative">
                  <Send size={24} className="text-[#D4A843]" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#D4A843] animate-ping" />
                </div>
              )}
              <span className="text-2xl font-bold text-white mt-1">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Status text */}
          <div>
            {completed ? (
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-[#22c55e]">
                  Da gui thanh cong {sent.toLocaleString("vi-VN")} emails!
                </h2>
                {/* Confetti-like dots animation */}
                <div className="flex items-center justify-center gap-1">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: ["#22c55e", "#16a34a", "#4ade80", "#86efac"][i % 4],
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: "1.2s",
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : state?.status === "paused" ? (
              <h2 className="text-lg font-semibold text-[#f97316]">Campaign dang tam dung</h2>
            ) : (
              <h2 className="text-lg font-semibold text-white">Dang gui emails...</h2>
            )}

            <p className="text-gray-400 text-sm mt-2">
              Da gui <span className="text-white font-semibold">{sent.toLocaleString("vi-VN")}</span> / <span className="text-white font-semibold">{total.toLocaleString("vi-VN")}</span> emails
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-md mx-auto">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#252525" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: completed
                    ? "#22c55e"
                    : state?.status === "paused"
                      ? "#f97316"
                      : "linear-gradient(90deg, #22c55e, #4ade80)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card text-center">
            <Send size={16} className="text-[#D4A843] mx-auto mb-2" />
            <div className="text-xl font-bold text-white">{sent.toLocaleString("vi-VN")}</div>
            <div className="text-xs text-gray-500 mt-1">Da gui</div>
          </div>
          <div className="stat-card text-center">
            <XCircle size={16} className="text-[#ef4444] mx-auto mb-2" />
            <div className="text-xl font-bold text-white">{failed.toLocaleString("vi-VN")}</div>
            <div className="text-xs text-gray-500 mt-1">That bai</div>
          </div>
          <div className="stat-card text-center">
            <Mail size={16} className="text-[#3b82f6] mx-auto mb-2" />
            <div className="text-xl font-bold text-white">{total.toLocaleString("vi-VN")}</div>
            <div className="text-xs text-gray-500 mt-1">Tong</div>
          </div>
          <div className="stat-card text-center">
            <Clock size={16} className="text-[#f59e0b] mx-auto mb-2" />
            <div className="text-xl font-bold text-white">
              {completed ? "0:00" : remaining > 0 ? `${remainingMin}:${String(remainingSec).padStart(2, "0")}` : "--:--"}
            </div>
            <div className="text-xs text-gray-500 mt-1">Con lai</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          {!completed && state?.status === "sending" && (
            <button
              onClick={handlePause}
              disabled={pausing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "rgba(249,115,22,0.12)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }}
            >
              {pausing ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
              Tam dung
            </button>
          )}

          {state?.status === "paused" && (
            <button
              onClick={handleResume}
              disabled={resuming}
              className="btn-green flex items-center gap-2 text-sm"
            >
              {resuming ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Tiep tuc gui
            </button>
          )}

          {completed && (
            <>
              <button
                onClick={() => router.push(`/email/campaigns/${campaignId}`)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: "rgba(212,168,67,0.12)", color: "#D4A843", border: "1px solid rgba(212,168,67,0.3)" }}
              >
                <BarChart3 size={14} /> Xem analytics
              </button>
              <button
                onClick={() => router.push("/email/campaigns")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                style={{ border: "1px solid #2a2a2a" }}
              >
                <ArrowLeft size={14} /> Ve danh sach
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

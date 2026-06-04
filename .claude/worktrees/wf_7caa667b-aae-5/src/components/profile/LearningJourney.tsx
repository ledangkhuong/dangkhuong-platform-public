"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  CheckCircle,
  Trophy,
  Award,
  Flag,
  Star,
  Plus,
  X,
  Loader2,
  Globe,
  Lock,
} from "lucide-react";

interface JourneyEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  product_id: string | null;
  is_public: boolean;
  created_at: string;
  products?: { name: string } | null;
}

const EVENT_CONFIG: Record<
  string,
  { icon: typeof BookOpen; color: string; bg: string }
> = {
  enrollment: {
    icon: BookOpen,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.15)",
  },
  lesson_complete: {
    icon: CheckCircle,
    color: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
  },
  course_complete: {
    icon: Trophy,
    color: "#D4A843",
    bg: "rgba(212,168,67,0.15)",
  },
  quiz_pass: {
    icon: Award,
    color: "#a855f7",
    bg: "rgba(168,85,247,0.15)",
  },
  milestone: {
    icon: Flag,
    color: "#f97316",
    bg: "rgba(249,115,22,0.15)",
  },
  custom: {
    icon: Star,
    color: "#6b7280",
    bg: "rgba(107,114,128,0.15)",
  },
};

interface LearningJourneyProps {
  userId?: string;
}

export default function LearningJourney({ userId }: LearningJourneyProps) {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (userId) params.set("user_id", userId);

      const res = await fetch(`/api/journey?${params}`);
      const data = await res.json();
      if (data.events) setEvents(data.events);
      if (data.is_own !== undefined) setIsOwnProfile(data.is_own);
      else setIsOwnProfile(!userId);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "milestone",
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          product_id: newProductId.trim() || null,
          is_public: newIsPublic,
        }),
      });

      if (res.ok) {
        setNewTitle("");
        setNewDescription("");
        setNewProductId("");
        setShowForm(false);
        fetchEvents();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-[#2a2a2a]" />
            <div className="flex-1">
              <div className="h-4 bg-[#2a2a2a] rounded w-1/3 mb-2" />
              <div className="h-3 bg-[#2a2a2a] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Flag size={16} className="text-[#D4A843]" />
          Hành trình học tập
        </h3>
        {isOwnProfile && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-xs text-[#D4A843] hover:text-[#e5bf5a] transition-colors"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Huỷ" : "Thêm cột mốc"}
          </button>
        )}
      </div>

      {/* Add milestone form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card-dark p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Tiêu đề *
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="VD: Hoàn thành Module 1"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4A843] transition-colors"
              maxLength={200}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Mô tả
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Mô tả thêm về cột mốc này..."
              rows={2}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-[#D4A843] transition-colors"
              maxLength={1000}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Khoá học liên quan (tuỳ chọn)
            </label>
            <input
              type="text"
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
              placeholder="ID khoá học (nếu có)"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4A843] transition-colors"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400">
              <input
                type="checkbox"
                checked={newIsPublic}
                onChange={(e) => setNewIsPublic(e.target.checked)}
                className="w-3.5 h-3.5 rounded"
                style={{ accentColor: "#D4A843" }}
              />
              {newIsPublic ? (
                <span className="flex items-center gap-1">
                  <Globe size={12} /> Công khai
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Lock size={12} /> Riêng tư
                </span>
              )}
            </label>
            <button
              type="submit"
              disabled={submitting || !newTitle.trim()}
              className={`btn-green text-xs px-3 py-1.5 inline-flex items-center gap-1.5 ${
                submitting || !newTitle.trim()
                  ? "opacity-40 cursor-not-allowed"
                  : ""
              }`}
            >
              {submitting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Plus size={12} />
              )}
              Lưu
            </button>
          </div>
        </form>
      )}

      {/* Timeline */}
      {events.length === 0 ? (
        <div className="text-center py-8">
          <Flag size={28} className="text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Chưa có sự kiện nào trong hành trình
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-5 bottom-5 w-px bg-[#2a2a2a]" />

          <div className="space-y-4">
            {events.map((event) => {
              const config =
                EVENT_CONFIG[event.event_type] || EVENT_CONFIG.custom;
              const Icon = config.icon;
              return (
                <div key={event.id} className="relative flex gap-3 group">
                  {/* Icon */}
                  <div
                    className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: config.bg }}
                  >
                    <Icon size={18} style={{ color: config.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-1">
                    <p className="text-sm font-medium text-white">
                      {event.title}
                    </p>
                    {event.description && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-gray-500">
                        {formatDate(event.created_at)}
                      </span>
                      {event.products?.name && (
                        <span className="text-[11px] text-gray-500">
                          &middot; {event.products.name}
                        </span>
                      )}
                      {!event.is_public && (
                        <Lock size={10} className="text-gray-600" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import {
  Mail, Send, Clock, Plus, Eye, Copy, Trash2, ChevronLeft, ChevronRight,
  Search, Loader2, Edit, BarChart3, Inbox, Filter, MoreHorizontal, Pause,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused";
  sent_count: number;
  open_count: number;
  click_count: number;
  total_recipients: number;
  sent_at: string | null;
  scheduled_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Nhap", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  scheduled: { label: "Da len lich", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  sending: { label: "Dang gui", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  sent: { label: "Da gui", color: "#D4A843", bg: "rgba(212,168,67,0.12)" },
  paused: { label: "Tam dung", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
};

const STATUS_FILTERS = [
  { value: "all", label: "Tat ca" },
  { value: "draft", label: "Nhap" },
  { value: "scheduled", label: "Da len lich" },
  { value: "sending", label: "Dang gui" },
  { value: "sent", label: "Da gui" },
  { value: "paused", label: "Tam dung" },
];

const PAGE_SIZE = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function getDateLabel(c: Campaign): string {
  if (c.sent_at) return formatDate(c.sent_at);
  if (c.scheduled_at) return formatDate(c.scheduled_at);
  return formatDate(c.created_at);
}

function getDatePrefix(c: Campaign): string {
  if (c.sent_at) return "Gui luc";
  if (c.scheduled_at) return "Len lich";
  return "Tao luc";
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns ?? data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setOpenDropdown(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Filter + search
  const filtered = campaigns.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const totalCount = campaigns.length;
  const sentCount = campaigns.filter((c) => c.status === "sent").length;
  const sendingCount = campaigns.filter((c) => c.status === "sending").length;
  const draftCount = campaigns.filter((c) => c.status === "draft").length;

  const stats = [
    { label: "Tong campaigns", value: totalCount, icon: Mail, color: "#3b82f6" },
    { label: "Da gui", value: sentCount, icon: Send, color: "#D4A843" },
    { label: "Dang gui", value: sendingCount, icon: Loader2, color: "#f59e0b" },
    { label: "Nhap", value: draftCount, icon: Edit, color: "#6b7280" },
  ];

  // Actions
  const handleDuplicate = async (id: string) => {
    setOpenDropdown(null);
    try {
      const res = await fetch(`/api/email/campaigns/${id}/duplicate`, { method: "POST" });
      if (res.ok) fetchCampaigns();
    } catch { /* */ }
  };

  const handleDelete = async (id: string) => {
    setOpenDropdown(null);
    if (!confirm("Ban co chac chan muon xoa campaign nay?")) return;
    try {
      const res = await fetch(`/api/email/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) fetchCampaigns();
    } catch { /* */ }
  };

  return (
    <div>
      <TopBar title="Campaigns" subtitle="Quan ly chien dich email" />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "18" }}
                >
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-0.5">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }}
            >
              <Search size={14} className="text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Tim kiem campaign..."
                className="bg-transparent border-none outline-none text-white text-sm placeholder:text-gray-500 w-40 sm:w-56"
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1">
              <Filter size={13} className="text-gray-500 mr-1" />
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setStatusFilter(f.value); setPage(1); }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: statusFilter === f.value ? "rgba(212,168,67,0.12)" : "transparent",
                    color: statusFilter === f.value ? "#D4A843" : "#9ca3af",
                    border: statusFilter === f.value ? "1px solid rgba(212,168,67,0.25)" : "1px solid transparent",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push("/email/campaigns/new")}
            className="btn-green flex items-center gap-2 text-sm shrink-0"
          >
            <Plus size={15} /> Tao campaign moi
          </button>
        </div>

        {/* Campaign list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[#D4A843]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-dark flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "rgba(59,130,246,0.1)" }}
            >
              <Inbox size={28} className="text-[#3b82f6]" />
            </div>
            <p className="text-white font-medium mb-1">
              {searchQuery || statusFilter !== "all"
                ? "Khong tim thay campaign nao"
                : "Chua co campaign nao"}
            </p>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Thu thay doi bo loc hoac tu khoa tim kiem."
                : "Tao campaign dau tien!"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <button
                onClick={() => router.push("/email/campaigns/new")}
                className="btn-green flex items-center gap-2 text-sm"
              >
                <Plus size={15} /> Tao campaign moi
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginated.map((c) => {
                const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
                const openRate = c.sent_count > 0 ? ((c.open_count / c.sent_count) * 100).toFixed(1) : "0.0";
                const clickRate = c.sent_count > 0 ? ((c.click_count / c.sent_count) * 100).toFixed(1) : "0.0";

                return (
                  <div
                    key={c.id}
                    className="card-dark p-4 hover:border-[#3a3a3a] transition-all cursor-pointer"
                    onClick={() => {
                      if (c.status === "sending") {
                        router.push(`/email/campaigns/${c.id}/sending`);
                      } else {
                        router.push(`/email/campaigns/${c.id}`);
                      }
                    }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-white text-sm truncate">{c.name || c.subject}</h3>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
                            style={{ background: st.bg, color: st.color }}
                          >
                            {c.status === "sending" && (
                              <span className="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse" style={{ background: st.color }} />
                            )}
                            {st.label}
                          </span>
                        </div>
                        {c.subject && c.name && (
                          <p className="text-xs text-gray-500 truncate mb-1">
                            <Mail size={11} className="inline mr-1" />
                            {c.subject}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-500">
                          <Clock size={10} className="inline mr-1" />
                          {getDatePrefix(c)}: {getDateLabel(c)}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-5 text-xs shrink-0">
                        <div className="text-center min-w-[50px]">
                          <div className="text-gray-500 mb-0.5">Da gui</div>
                          <div className="font-semibold text-white">
                            {c.sent_count > 0 ? c.sent_count.toLocaleString("vi-VN") : "--"}
                          </div>
                        </div>
                        <div className="text-center min-w-[50px]">
                          <div className="text-gray-500 mb-0.5">Open</div>
                          <div className="font-semibold" style={{ color: "#D4A843" }}>
                            {c.sent_count > 0 ? `${openRate}%` : "--"}
                          </div>
                        </div>
                        <div className="text-center min-w-[50px]">
                          <div className="text-gray-500 mb-0.5">Click</div>
                          <div className="font-semibold" style={{ color: "#3b82f6" }}>
                            {c.sent_count > 0 ? `${clickRate}%` : "--"}
                          </div>
                        </div>
                      </div>

                      {/* Actions dropdown */}
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === c.id ? null : c.id);
                          }}
                          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#252525] transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {openDropdown === c.id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-44 rounded-lg overflow-hidden shadow-xl z-20"
                            style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { setOpenDropdown(null); router.push(`/email/campaigns/${c.id}`); }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors"
                            >
                              <Edit size={12} /> Chinh sua
                            </button>
                            <button
                              onClick={() => handleDuplicate(c.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors"
                            >
                              <Copy size={12} /> Nhan ban
                            </button>
                            {c.status === "sent" && (
                              <button
                                onClick={() => { setOpenDropdown(null); router.push(`/email/campaigns/${c.id}/analytics`); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors"
                              >
                                <BarChart3 size={12} /> Xem analytics
                              </button>
                            )}
                            <div className="border-t border-[#2a2a2a]" />
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={12} /> Xoa
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Hien thi {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} trong {filtered.length} campaigns
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#252525] transition-colors disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: page === p ? "#D4A843" : "transparent",
                        color: page === p ? "white" : "#9ca3af",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#252525] transition-colors disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

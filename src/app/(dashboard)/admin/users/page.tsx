"use client";

import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  Search,
  ChevronDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  Star,
  Shield,
  UserCheck,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tier = "Free" | "Member" | "VIP";
type SortKey = "newest" | "xp" | "revenue";

interface User {
  id: number;
  name: string;
  email: string;
  tier: Tier;
  xp: number;
  level: number;
  coursesCount: number;
  joinDate: string;
  totalSpent: number;
  avatarInitials: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockUsers: User[] = [
  {
    id: 1,
    name: "Nguyễn Minh Tuấn",
    email: "tuan.nguyen@gmail.com",
    tier: "VIP",
    xp: 4850,
    level: 12,
    coursesCount: 5,
    joinDate: "2024-01-15",
    totalSpent: 3200000,
    avatarInitials: "NT",
  },
  {
    id: 2,
    name: "Trần Thị Hương",
    email: "huong.tran@gmail.com",
    tier: "Member",
    xp: 2340,
    level: 7,
    coursesCount: 3,
    joinDate: "2024-03-22",
    totalSpent: 990000,
    avatarInitials: "TH",
  },
  {
    id: 3,
    name: "Lê Văn Đức",
    email: "duc.le@hotmail.com",
    tier: "Free",
    xp: 450,
    level: 2,
    coursesCount: 0,
    joinDate: "2024-07-08",
    totalSpent: 0,
    avatarInitials: "LĐ",
  },
  {
    id: 4,
    name: "Phạm Thanh Hà",
    email: "ha.pham@gmail.com",
    tier: "VIP",
    xp: 5000,
    level: 15,
    coursesCount: 7,
    joinDate: "2023-11-02",
    totalSpent: 4500000,
    avatarInitials: "PH",
  },
  {
    id: 5,
    name: "Hoàng Quốc Bảo",
    email: "bao.hoang@yahoo.com",
    tier: "Member",
    xp: 1800,
    level: 5,
    coursesCount: 2,
    joinDate: "2024-04-10",
    totalSpent: 590000,
    avatarInitials: "QB",
  },
  {
    id: 6,
    name: "Vũ Thị Mai Linh",
    email: "linh.vu@gmail.com",
    tier: "Free",
    xp: 210,
    level: 1,
    coursesCount: 0,
    joinDate: "2024-09-01",
    totalSpent: 0,
    avatarInitials: "ML",
  },
  {
    id: 7,
    name: "Đặng Hữu Phúc",
    email: "phuc.dang@gmail.com",
    tier: "Member",
    xp: 3100,
    level: 9,
    coursesCount: 4,
    joinDate: "2024-02-18",
    totalSpent: 1290000,
    avatarInitials: "ĐP",
  },
  {
    id: 8,
    name: "Bùi Ngọc Anh",
    email: "anh.bui@outlook.com",
    tier: "Free",
    xp: 100,
    level: 1,
    coursesCount: 0,
    joinDate: "2024-10-25",
    totalSpent: 0,
    avatarInitials: "NA",
  },
];

// ─── Tier config ──────────────────────────────────────────────────────────────

const tierConfig: Record<Tier, { label: string; bg: string; color: string; border: string }> = {
  Free: {
    label: "Free",
    bg: "rgba(107,114,128,0.1)",
    color: "#9ca3af",
    border: "rgba(107,114,128,0.25)",
  },
  Member: {
    label: "Member",
    bg: "rgba(59,130,246,0.1)",
    color: "#3b82f6",
    border: "rgba(59,130,246,0.25)",
  },
  VIP: {
    label: "VIP Đồng Hành",
    bg: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
    border: "rgba(245,158,11,0.25)",
  },
};

const tierOptions: Array<{ value: "all" | Tier; label: string }> = [
  { value: "all", label: "Tất cả tier" },
  { value: "Free", label: "Free" },
  { value: "Member", label: "Member" },
  { value: "VIP", label: "VIP Đồng Hành" },
];

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "Mới nhất" },
  { value: "xp", label: "XP cao nhất" },
  { value: "revenue", label: "Doanh thu" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(n: number): string {
  if (n === 0) return "—";
  return n.toLocaleString("vi-VN") + "₫";
}

function formatXP(n: number): string {
  return n.toLocaleString("vi-VN") + " XP";
}

// ─── Tier Badge ───────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: Tier }) {
  const cfg = tierConfig[tier];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Tier Dropdown (per-row action) ──────────────────────────────────────────

function TierDropdown({ userId, currentTier, onChangeTier }: {
  userId: number;
  currentTier: Tier;
  onChangeTier: (id: number, tier: Tier) => void;
}) {
  const [open, setOpen] = useState(false);
  const tiers: Tier[] = ["Free", "Member", "VIP"];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
        style={{
          background: "rgba(255,255,255,0.05)",
          color: "#9ca3af",
          border: "1px solid #2a2a2a",
        }}
      >
        Đổi tier
        <ChevronDown size={11} />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 z-20 mt-1 rounded-xl overflow-hidden shadow-xl"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", minWidth: 140 }}
          >
            {tiers.map((t) => {
              const cfg = tierConfig[t];
              return (
                <button
                  key={t}
                  onClick={() => { onChangeTier(userId, t); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-colors hover:bg-white/5"
                  style={{ color: t === currentTier ? cfg.color : "#9ca3af" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: cfg.color }}
                  />
                  {cfg.label}
                  {t === currentTier && (
                    <span className="ml-auto text-[10px]" style={{ color: cfg.color }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TOTAL = 1248;
const PAGE_SIZE = 20;
const TOTAL_PAGES = Math.ceil(TOTAL / PAGE_SIZE);

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | Tier>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[]>(mockUsers);

  // Filter + sort
  const filtered = users
    .filter((u) => {
      const matchSearch =
        search === "" ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchTier = tierFilter === "all" || u.tier === tierFilter;
      return matchSearch && matchTier;
    })
    .sort((a, b) => {
      if (sort === "xp") return b.xp - a.xp;
      if (sort === "revenue") return b.totalSpent - a.totalSpent;
      // newest: sort by joinDate desc
      return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
    });

  function handleChangeTier(id: number, tier: Tier) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, tier } : u)));
  }

  // Stats
  const totalVIP = mockUsers.filter((u) => u.tier === "VIP").length;
  const totalMember = mockUsers.filter((u) => u.tier === "Member").length;
  const totalFree = mockUsers.filter((u) => u.tier === "Free").length;

  const stats = [
    { label: "Tổng học viên", value: "1,248", icon: Users, color: "#3b82f6", sub: "tất cả tiers" },
    { label: "VIP Đồng Hành", value: "89", icon: Star, color: "#f59e0b", sub: `${totalVIP} trong mock` },
    { label: "Member", value: "312", icon: Shield, color: "#3b82f6", sub: `${totalMember} trong mock` },
    { label: "Free", value: "847", icon: UserCheck, color: "#9ca3af", sub: `${totalFree} trong mock` },
  ];

  const pageStart = (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, TOTAL);

  return (
    <div>
      <TopBar
        title="Quản lý Học viên"
        subtitle={`${TOTAL.toLocaleString("vi-VN")} học viên đang hoạt động`}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ── Stats row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="stat-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: s.color + "18" }}
                >
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs font-semibold text-gray-300">{s.label}</div>
              <div className="text-[11px] text-gray-600">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Filter bar ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên hoặc email..."
              className="input-dark pl-9"
            />
          </div>

          {/* Tier filter */}
          <div className="relative">
            <select
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value as "all" | Tier); setPage(1); }}
              className="input-dark appearance-none pr-8 cursor-pointer"
              style={{ minWidth: 160 }}
            >
              {tierOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="input-dark appearance-none pr-8 cursor-pointer"
              style={{ minWidth: 160 }}
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>
        </div>

        {/* ── Users table ───────────────────────────────────────── */}
        <div className="card-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {["Học viên", "Tier", "XP", "Khoá học", "Ngày tham gia", "Doanh thu", "Hành động"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-600 text-sm">
                      Không tìm thấy học viên nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filtered.map((user, idx) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom:
                          idx < filtered.length - 1 ? "1px solid #2a2a2a" : "none",
                      }}
                    >
                      {/* Avatar + Name + Email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{
                              background:
                                user.tier === "VIP"
                                  ? "linear-gradient(135deg, #f59e0b, #d97706)"
                                  : user.tier === "Member"
                                  ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                                  : "linear-gradient(135deg, #374151, #1f2937)",
                            }}
                          >
                            {user.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate">{user.name}</div>
                            <div className="text-xs text-gray-500 truncate">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TierBadge tier={user.tier} />
                      </td>

                      {/* XP */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-white">{formatXP(user.xp)}</div>
                        <div className="text-[11px] text-gray-600">Lv.{user.level}</div>
                      </td>

                      {/* Courses */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-white">{user.coursesCount}</span>
                        <span className="text-gray-600 text-xs ml-1">khoá</span>
                      </td>

                      {/* Join date */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs">
                        {formatDate(user.joinDate)}
                      </td>

                      {/* Total spent */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: user.totalSpent > 0 ? "#22c55e" : "#4b5563" }}
                        >
                          {formatCurrency(user.totalSpent)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                            style={{
                              background: "rgba(34,197,94,0.1)",
                              color: "#22c55e",
                              border: "1px solid rgba(34,197,94,0.25)",
                            }}
                          >
                            <Eye size={11} />
                            Xem
                          </button>
                          <TierDropdown
                            userId={user.id}
                            currentTier={user.tier}
                            onChangeTier={handleChangeTier}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            Hiển thị{" "}
            <span className="text-white font-semibold">{pageStart}–{pageEnd}</span>{" "}
            trong{" "}
            <span className="text-white font-semibold">{TOTAL.toLocaleString("vi-VN")}</span>{" "}
            học viên
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                color: "#9ca3af",
              }}
            >
              <ChevronLeft size={13} />
              Trước
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, TOTAL_PAGES) }, (_, i) => {
                let pageNum: number;
                if (TOTAL_PAGES <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= TOTAL_PAGES - 2) {
                  pageNum = TOTAL_PAGES - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className="w-7 h-7 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: pageNum === page ? "#22c55e" : "#1a1a1a",
                      color: pageNum === page ? "white" : "#9ca3af",
                      border: pageNum === page ? "1px solid #22c55e" : "1px solid #2a2a2a",
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(TOTAL_PAGES, p + 1))}
              disabled={page === TOTAL_PAGES}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                color: "#9ca3af",
              }}
            >
              Sau
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

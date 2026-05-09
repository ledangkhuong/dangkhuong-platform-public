import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import UserRoleEditor from "@/components/admin/UserRoleEditor";
import {
  Users,
  Star,
  Shield,
  UserCheck,
  Crown,
  Flame,
  Clock,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = "student" | "admin" | "manager" | "marketing" | "sale" | "support";
type Tier = "free" | "member" | "vip";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  tier: Tier;
  xp: number;
  level: number;
  streak: number;
  last_login: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "Chưa đăng nhập";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return formatDate(iso);
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

// ─── Badge components ────────────────────────────────────────────────────────

const roleConfig: Record<Role, { label: string; bg: string; color: string; border: string }> = {
  admin: {
    label: "Admin",
    bg: "rgba(239,68,68,0.1)",
    color: "#ef4444",
    border: "rgba(239,68,68,0.25)",
  },
  manager: {
    label: "Quản lý",
    bg: "rgba(168,85,247,0.1)",
    color: "#a855f7",
    border: "rgba(168,85,247,0.25)",
  },
  marketing: {
    label: "Marketing",
    bg: "rgba(59,130,246,0.1)",
    color: "#3b82f6",
    border: "rgba(59,130,246,0.25)",
  },
  sale: {
    label: "Sale",
    bg: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
    border: "rgba(245,158,11,0.25)",
  },
  support: {
    label: "CSKH",
    bg: "rgba(34,197,94,0.1)",
    color: "#22c55e",
    border: "rgba(34,197,94,0.25)",
  },
  student: {
    label: "Học viên",
    bg: "rgba(107,114,128,0.1)",
    color: "#9ca3af",
    border: "rgba(107,114,128,0.25)",
  },
};

const tierConfig: Record<Tier, { label: string; bg: string; color: string; border: string }> = {
  free: {
    label: "Free",
    bg: "rgba(107,114,128,0.1)",
    color: "#9ca3af",
    border: "rgba(107,114,128,0.25)",
  },
  member: {
    label: "Member",
    bg: "rgba(147,51,234,0.1)",
    color: "#a855f7",
    border: "rgba(147,51,234,0.25)",
  },
  vip: {
    label: "VIP",
    bg: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
    border: "rgba(245,158,11,0.25)",
  },
};

function RoleBadge({ role }: { role: Role }) {
  const cfg = roleConfig[role];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminUsersPage() {
  // Auth check
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["admin", "manager"].includes(myProfile?.role ?? "")) redirect("/dashboard");

  // Fetch all profiles via admin client (bypasses RLS)
  const supabase = await createAdminClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, role, tier, xp, level, streak, last_login, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const users: Profile[] = (profiles ?? []) as Profile[];

  // Summary stats
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const memberCount = users.filter((u) => u.tier === "member").length;
  const vipCount = users.filter((u) => u.tier === "vip").length;

  const stats = [
    {
      label: "Tổng người dùng",
      value: totalUsers.toLocaleString("vi-VN"),
      icon: Users,
      color: "#3b82f6",
      sub: "tất cả tài khoản",
    },
    {
      label: "Admin",
      value: adminCount.toLocaleString("vi-VN"),
      icon: Shield,
      color: "#ef4444",
      sub: "quản trị viên",
    },
    {
      label: "Member",
      value: memberCount.toLocaleString("vi-VN"),
      icon: UserCheck,
      color: "#a855f7",
      sub: "thành viên trả phí",
    },
    {
      label: "VIP",
      value: vipCount.toLocaleString("vi-VN"),
      icon: Crown,
      color: "#f59e0b",
      sub: "khách hàng VIP",
    },
  ];

  return (
    <div>
      <TopBar
        title="Quản lý Người dùng"
        subtitle={`${totalUsers.toLocaleString("vi-VN")} người dùng`}
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
              <div className="text-xs font-semibold text-gray-300">
                {s.label}
              </div>
              <div className="text-[11px] text-gray-600">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Error state ──────────────────────────────────────── */}
        {error && (
          <div
            className="card-dark p-4 text-sm text-red-400"
            style={{ border: "1px solid rgba(239,68,68,0.25)" }}
          >
            Lỗi khi tải dữ liệu: {error.message}
          </div>
        )}

        {/* ── Users table ───────────────────────────────────────── */}
        <div className="card-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {[
                    "Người dùng",
                    "Vai trò & Hạng",
                    "XP / Level",
                    "Streak",
                    "Đăng nhập cuối",
                    "Ngày tham gia",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-gray-600 text-sm"
                    >
                      Chưa có người dùng nào.
                    </td>
                  </tr>
                ) : (
                  users.map((profile, idx) => (
                    <tr
                      key={profile.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom:
                          idx < users.length - 1
                            ? "1px solid #2a2a2a"
                            : "none",
                      }}
                    >
                      {/* Avatar + Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{
                              background:
                                profile.role === "admin"
                                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                                  : profile.tier === "vip"
                                  ? "linear-gradient(135deg, #f59e0b, #d97706)"
                                  : profile.tier === "member"
                                  ? "linear-gradient(135deg, #a855f7, #7c3aed)"
                                  : "linear-gradient(135deg, #374151, #1f2937)",
                            }}
                          >
                            {getInitials(profile.full_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate">
                              {profile.full_name || "Chưa đặt tên"}
                            </div>
                            <div className="text-[11px] text-gray-600 truncate font-mono">
                              {profile.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Tier */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <UserRoleEditor
                          userId={profile.id}
                          currentRole={profile.role}
                          currentTier={profile.tier}
                          myRole={myProfile?.role as Role}
                        />
                      </td>

                      {/* XP / Level */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-white">
                          {(profile.xp ?? 0).toLocaleString("vi-VN")} XP
                        </div>
                        <div className="text-[11px] text-gray-600">
                          Lv.{profile.level ?? 1}
                        </div>
                      </td>

                      {/* Streak */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Flame
                            size={14}
                            style={{
                              color:
                                (profile.streak ?? 0) > 0
                                  ? "#f59e0b"
                                  : "#4b5563",
                            }}
                          />
                          <span
                            className="font-semibold text-sm"
                            style={{
                              color:
                                (profile.streak ?? 0) > 0
                                  ? "#f59e0b"
                                  : "#4b5563",
                            }}
                          >
                            {profile.streak ?? 0}
                          </span>
                        </div>
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                          <Clock size={12} className="text-gray-600" />
                          {formatRelativeDate(profile.last_login)}
                        </div>
                      </td>

                      {/* Created at */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs">
                        {formatDate(profile.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Footer info ──────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Hiển thị{" "}
            <span className="text-white font-semibold">{users.length}</span>{" "}
            người dùng mới nhất (tối đa 50)
          </p>
        </div>
      </div>
    </div>
  );
}

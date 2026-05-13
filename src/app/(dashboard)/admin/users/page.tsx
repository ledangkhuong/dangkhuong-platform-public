import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import UserRoleEditor from "@/components/admin/UserRoleEditor";
import Link from "next/link";
import {
  Users,
  Star,
  Shield,
  UserCheck,
  Crown,
  Flame,
  Clock,
  Briefcase,
  GraduationCap,
  ShoppingCart,
  DollarSign,
  Ghost,
} from "lucide-react";
import DeleteFakeUsers from "@/components/admin/DeleteFakeUsers";
import DeleteUserButton from "@/components/admin/DeleteUserButton";

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = "student" | "admin" | "manager" | "marketing" | "sale" | "support";
type Tier = "free" | "member" | "vip";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
  role: Role;
  tier: Tier;
  xp: number;
  level: number;
  streak: number;
  last_login: string | null;
  created_at: string;
}

interface OrderInfo {
  paidCount: number;
  pendingCount: number;
  totalPaid: number;
  lastOrderDate: string | null;
}

function formatVND(amount: number): string {
  if (!amount) return "0đ";
  return amount.toLocaleString("vi-VN") + "đ";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
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
    bg: "rgba(212,168,67,0.1)",
    color: "#D4A843",
    border: "rgba(212,168,67,0.25)",
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

// ─── Tab config ─────────────────────────────────────────────────────────────

type TabKey = "all" | "staff" | "paid" | "free" | "member" | "vip" | "fake";

const TABS: {
  key: TabKey;
  label: string;
  icon: typeof Users;
  color: string;
  filter: (u: Profile, paidEmails?: Set<string>) => boolean;
}[] = [
  {
    key: "all",
    label: "Tất cả",
    icon: Users,
    color: "#3b82f6",
    filter: () => true,
  },
  {
    key: "staff",
    label: "Nhân viên",
    icon: Briefcase,
    color: "#ef4444",
    filter: (u) => ["admin", "manager", "marketing", "sale", "support"].includes(u.role),
  },
  {
    key: "paid",
    label: "Đã mua",
    icon: ShoppingCart,
    color: "#D4A843",
    filter: (u, paidEmails) => !!u.email && (paidEmails?.has(u.email.toLowerCase()) ?? false),
  },
  {
    key: "free",
    label: "Free",
    icon: GraduationCap,
    color: "#9ca3af",
    filter: (u) => u.role === "student" && u.tier === "free",
  },
  {
    key: "member",
    label: "Member",
    icon: UserCheck,
    color: "#a855f7",
    filter: (u) => u.tier === "member",
  },
  {
    key: "vip",
    label: "VIP",
    icon: Crown,
    color: "#f59e0b",
    filter: (u) => u.tier === "vip",
  },
  {
    key: "fake",
    label: "Tài khoản ảo",
    icon: Ghost,
    color: "#ef4444",
    filter: (u, paidEmails) =>
      u.role === "student" &&
      u.tier === "free" &&
      !u.last_login &&
      (u.xp ?? 0) === 0 &&
      !paidEmails?.has((u.email ?? "").toLowerCase()),
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const params = await searchParams;
  const activeTab = (params.tab as TabKey) || "all";
  const searchQuery = params.q || "";

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

  // Fetch profiles, auth users (for emails), and orders in parallel
  const [profilesRes, authUsersRes, ordersRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, tier, xp, level, streak, last_login, created_at")
      .order("created_at", { ascending: false }),
    supabase.auth.admin.listUsers({ perPage: 10000 }),
    supabase
      .from("orders")
      .select("customer_email, amount, status, created_at")
      .not("customer_email", "is", null),
  ]);

  const { data: profiles, error } = profilesRes;

  // Build email map from auth users
  const emailMap = new Map<string, string>();
  for (const au of authUsersRes.data?.users ?? []) {
    if (au.email) emailMap.set(au.id, au.email);
  }

  // Merge email into profiles
  const allUsers: Profile[] = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap.get(p.id) ?? null,
  })) as Profile[];

  // Build order summary per email
  const orderMap = new Map<string, OrderInfo>();
  for (const o of ordersRes.data ?? []) {
    const email = (o.customer_email as string).toLowerCase();
    if (!orderMap.has(email)) {
      orderMap.set(email, { paidCount: 0, pendingCount: 0, totalPaid: 0, lastOrderDate: null });
    }
    const info = orderMap.get(email)!;
    if (o.status === "paid") {
      info.paidCount += 1;
      info.totalPaid += Number(o.amount) || 0;
    } else if (o.status === "pending") {
      info.pendingCount += 1;
    }
    if (!info.lastOrderDate || (o.created_at as string) > info.lastOrderDate) {
      info.lastOrderDate = o.created_at as string;
    }
  }

  // Set of emails that have at least 1 paid order
  const paidEmails = new Set<string>();
  for (const [email, info] of orderMap) {
    if (info.paidCount > 0) paidEmails.add(email);
  }

  // Counts per tab (before filtering)
  const tabCounts: Record<TabKey, number> = {
    all: allUsers.length,
    staff: allUsers.filter((u) => TABS[1].filter(u)).length,
    paid: allUsers.filter((u) => TABS[2].filter(u, paidEmails)).length,
    free: allUsers.filter((u) => TABS[3].filter(u)).length,
    member: allUsers.filter((u) => TABS[4].filter(u)).length,
    vip: allUsers.filter((u) => TABS[5].filter(u)).length,
    fake: allUsers.filter((u) => TABS[6].filter(u, paidEmails)).length,
  };

  // Apply tab filter
  const tabConfig = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  let filteredUsers = allUsers.filter((u) => tabConfig.filter(u, paidEmails));

  // For "paid" tab, sort by total revenue descending then by most recent order
  if (activeTab === "paid") {
    filteredUsers.sort((a, b) => {
      const aInfo = orderMap.get((a.email ?? "").toLowerCase());
      const bInfo = orderMap.get((b.email ?? "").toLowerCase());
      const aTotal = aInfo?.totalPaid ?? 0;
      const bTotal = bInfo?.totalPaid ?? 0;
      if (bTotal !== aTotal) return bTotal - aTotal;
      // Then by most recent order
      const aDate = aInfo?.lastOrderDate ?? "";
      const bDate = bInfo?.lastOrderDate ?? "";
      return bDate.localeCompare(aDate);
    });
  }

  // Apply search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredUsers = filteredUsers.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
    );
  }

  // Staff sub-counts (for staff tab)
  const staffRoleCounts = activeTab === "staff"
    ? {
        admin: filteredUsers.filter((u) => u.role === "admin").length,
        manager: filteredUsers.filter((u) => u.role === "manager").length,
        marketing: filteredUsers.filter((u) => u.role === "marketing").length,
        sale: filteredUsers.filter((u) => u.role === "sale").length,
        support: filteredUsers.filter((u) => u.role === "support").length,
      }
    : null;

  return (
    <div>
      <TopBar
        title="Quản lý Người dùng"
        subtitle={`${allUsers.length} người dùng`}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ── Tab navigation ─────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                href={`/admin/users${tab.key === "all" ? "" : `?tab=${tab.key}`}${searchQuery ? `${tab.key === "all" ? "?" : "&"}q=${searchQuery}` : ""}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: isActive ? tab.color + "18" : "rgba(255,255,255,0.03)",
                  color: isActive ? tab.color : "#9ca3af",
                  border: isActive
                    ? `1px solid ${tab.color}40`
                    : "1px solid transparent",
                }}
              >
                <Icon size={16} />
                {tab.label}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                  style={{
                    background: isActive ? tab.color + "20" : "rgba(255,255,255,0.05)",
                    color: isActive ? tab.color : "#6b7280",
                  }}
                >
                  {tabCounts[tab.key]}
                </span>
              </Link>
            );
          })}
        </div>

        {/* ── Staff sub-badges ─────────────────────────────────── */}
        {staffRoleCounts && (
          <div className="flex flex-wrap gap-3">
            {(Object.entries(staffRoleCounts) as [Role, number][]).map(([role, count]) => {
              if (count === 0) return null;
              const cfg = roleConfig[role];
              return (
                <div
                  key={role}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                >
                  {cfg.label}
                  <span className="font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Search ───────────────────────────────────────────── */}
        <div className="card-dark p-3">
          <form method="GET" className="flex gap-3">
            {activeTab !== "all" && (
              <input type="hidden" name="tab" value={activeTab} />
            )}
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Tìm theo tên hoặc ID..."
              className="input-dark flex-1 px-4 py-2 text-sm"
            />
            <button type="submit" className="btn-green px-4 py-2 text-sm rounded-lg">
              Tìm
            </button>
            {searchQuery && (
              <Link
                href={`/admin/users${activeTab !== "all" ? `?tab=${activeTab}` : ""}`}
                className="flex items-center px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Xoá
              </Link>
            )}
          </form>
        </div>

        {/* ── Fake account actions ─────────────────────────────── */}
        {activeTab === "fake" && filteredUsers.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            <DeleteFakeUsers
              userIds={filteredUsers.map((u) => u.id)}
              count={filteredUsers.length}
            />
            <p className="text-xs text-gray-600">
              Tiêu chí: chưa đăng nhập, XP = 0, không có đơn hàng, không phải nhân viên
            </p>
          </div>
        )}

        {/* ── Stats summary (for current tab) ─────────────────── */}
        {activeTab === "paid" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(212,168,67,0.12)" }}
                >
                  <ShoppingCart size={18} className="text-[#D4A843]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{filteredUsers.length}</div>
              <div className="text-xs font-semibold text-gray-300">Khách đã mua</div>
              <div className="text-[11px] text-gray-600">có ít nhất 1 đơn thanh toán</div>
            </div>

            <div className="stat-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(212,168,67,0.12)" }}
                >
                  <DollarSign size={18} className="text-[#D4A843]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#D4A843]">
                {formatVND(
                  filteredUsers.reduce((sum, u) => {
                    const info = orderMap.get((u.email ?? "").toLowerCase());
                    return sum + (info?.totalPaid ?? 0);
                  }, 0)
                )}
              </div>
              <div className="text-xs font-semibold text-gray-300">Tổng doanh thu</div>
              <div className="text-[11px] text-gray-600">từ khách đã thanh toán</div>
            </div>

            <div className="stat-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.12)" }}
                >
                  <ShoppingCart size={18} className="text-[#f59e0b]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {filteredUsers.reduce((sum, u) => {
                  const info = orderMap.get((u.email ?? "").toLowerCase());
                  return sum + (info?.paidCount ?? 0);
                }, 0)}
              </div>
              <div className="text-xs font-semibold text-gray-300">Tổng đơn hàng</div>
              <div className="text-[11px] text-gray-600">đã thanh toán thành công</div>
            </div>

            <div className="stat-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(59,130,246,0.12)" }}
                >
                  <DollarSign size={18} className="text-[#3b82f6]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {filteredUsers.length > 0
                  ? formatVND(
                      Math.round(
                        filteredUsers.reduce((sum, u) => {
                          const info = orderMap.get((u.email ?? "").toLowerCase());
                          return sum + (info?.totalPaid ?? 0);
                        }, 0) / filteredUsers.length
                      )
                    )
                  : "0đ"}
              </div>
              <div className="text-xs font-semibold text-gray-300">Trung bình / khách</div>
              <div className="text-[11px] text-gray-600">doanh thu bình quân</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: tabConfig.color + "18" }}
                >
                  <tabConfig.icon size={18} style={{ color: tabConfig.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{filteredUsers.length}</div>
              <div className="text-xs font-semibold text-gray-300">
                {tabConfig.label}
              </div>
              <div className="text-[11px] text-gray-600">
                {searchQuery ? "kết quả tìm kiếm" : "hiển thị"}
              </div>
            </div>

            <div className="stat-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(212,168,67,0.1)" }}
                >
                  <Star size={18} className="text-[#D4A843]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {filteredUsers.reduce((sum, u) => sum + (u.xp ?? 0), 0).toLocaleString("vi-VN")}
              </div>
              <div className="text-xs font-semibold text-gray-300">Tổng XP</div>
              <div className="text-[11px] text-gray-600">của nhóm này</div>
            </div>

            <div className="stat-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.1)" }}
                >
                  <Flame size={18} className="text-[#f59e0b]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {filteredUsers.filter((u) => (u.streak ?? 0) > 0).length}
              </div>
              <div className="text-xs font-semibold text-gray-300">Đang streak</div>
              <div className="text-[11px] text-gray-600">hoạt động liên tục</div>
            </div>

            <div className="stat-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(59,130,246,0.1)" }}
                >
                  <Clock size={18} className="text-[#3b82f6]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {filteredUsers.filter((u) => {
                  if (!u.last_login) return false;
                  return Date.now() - new Date(u.last_login).getTime() < 7 * 86400000;
                }).length}
              </div>
              <div className="text-xs font-semibold text-gray-300">Online 7 ngày</div>
              <div className="text-[11px] text-gray-600">hoạt động gần đây</div>
            </div>
          </div>
        )}

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
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <span className="text-xs text-gray-500">
              <span className="text-white font-semibold">{filteredUsers.length}</span> người dùng
              {searchQuery && " (đã lọc)"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {(activeTab === "paid"
                    ? ["Khách hàng", "Doanh thu", "Đơn hàng", "Vai trò & Hạng", "Đơn gần nhất", "Ngày tham gia"]
                    : ["Người dùng", "Vai trò & Hạng", "XP / Level", "Streak", "Đăng nhập cuối", "Ngày tham gia"]
                  ).map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                  <th className="px-2 py-3 w-10" />
                </tr>
              </thead>

              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-gray-600 text-sm"
                    >
                      {searchQuery
                        ? "Không tìm thấy người dùng phù hợp."
                        : "Chưa có người dùng nào trong nhóm này."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((profile, idx) => {
                    const userOrderInfo = orderMap.get((profile.email ?? "").toLowerCase());
                    return (
                    <tr
                      key={profile.id}
                      className="group transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom:
                          idx < filteredUsers.length - 1
                            ? "1px solid #2a2a2a"
                            : "none",
                      }}
                    >
                      {/* Avatar + Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{
                                background:
                                  profile.role === "admin"
                                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                                    : ["manager", "marketing", "sale", "support"].includes(profile.role)
                                    ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                                    : profile.tier === "vip"
                                    ? "linear-gradient(135deg, #f59e0b, #d97706)"
                                    : profile.tier === "member"
                                    ? "linear-gradient(135deg, #a855f7, #7c3aed)"
                                    : "linear-gradient(135deg, #374151, #1f2937)",
                              }}
                            >
                              {getInitials(profile.full_name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate">
                              {profile.full_name || "Chưa đặt tên"}
                            </div>
                            <div className="text-[11px] text-gray-600 truncate">
                              {activeTab === "paid" ? (profile.email ?? "") : `${profile.id.slice(0, 8)}...`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {activeTab === "paid" ? (
                        <>
                          {/* Doanh thu */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <DollarSign size={14} className="text-[#D4A843]" />
                              <span className="font-bold text-[#D4A843] text-base">
                                {formatVND(userOrderInfo?.totalPaid ?? 0)}
                              </span>
                            </div>
                          </td>

                          {/* Đơn hàng */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{ background: "rgba(212,168,67,0.1)", color: "#D4A843", border: "1px solid rgba(212,168,67,0.2)" }}
                              >
                                <ShoppingCart size={11} />
                                {userOrderInfo?.paidCount ?? 0} đã TT
                              </span>
                              {(userOrderInfo?.pendingCount ?? 0) > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                                  style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
                                >
                                  {userOrderInfo?.pendingCount} chờ
                                </span>
                              )}
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

                          {/* Đơn gần nhất */}
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                            {userOrderInfo?.lastOrderDate ? formatRelativeDate(userOrderInfo.lastOrderDate) : "—"}
                          </td>

                          {/* Created at */}
                          <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs">
                            {formatDate(profile.created_at)}
                          </td>

                          {/* Delete */}
                          <td className="px-2 py-3 whitespace-nowrap">
                            {!["admin", "manager"].includes(profile.role) && (
                              <DeleteUserButton userId={profile.id} userName={profile.full_name} />
                            )}
                          </td>
                        </>
                      ) : (
                        <>
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

                          {/* Delete */}
                          <td className="px-2 py-3 whitespace-nowrap">
                            {!["admin", "manager"].includes(profile.role) && (
                              <DeleteUserButton userId={profile.id} userName={profile.full_name} />
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

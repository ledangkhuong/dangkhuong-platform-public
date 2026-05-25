import TopBar from "@/components/layout/TopBar";
import { createAdminClient } from "@/lib/supabase/server";
import { getSalesUsers } from "@/lib/sales";
import { getViewerScope } from "@/lib/viewer-scope";
import { redirect } from "next/navigation";
import Link from "next/link";
import UserAvatar from "@/components/admin/UserAvatar";
import InterestActions from "./InterestActions";
import InterestAssignSelect from "./InterestAssignSelect";
import {
  Eye,
  Clock,
  Phone,
  CheckCircle,
  Filter,
  Search,
  BookOpen,
  Users,
  UserCheck,
} from "lucide-react";

/* ---------- Types ---------- */

interface CourseInterest {
  id: string;
  user_id: string;
  product_id: string;
  view_count: number;
  first_viewed_at: string;
  last_viewed_at: string;
  contacted: boolean;
  contacted_at: string | null;
  contacted_by: string | null;
  assigned_to: string | null;
  notes: string | null;
  status: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
    tier: string;
    level: number;
  } | null;
  products: {
    title: string;
    slug: string;
    price: number;
    sale_price: number | null;
    thumbnail: string | null;
  } | null;
  contacted_profile: {
    full_name: string | null;
  } | null;
  assigned_profile: {
    full_name: string | null;
  } | null;
}

interface CustomerGroup {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  tier: string;
  level: number;
  interests: CourseInterest[];
  totalViews: number;
  latestView: string;
  assignedTo: string | null;
  assignedName: string | null;
  hasNew: boolean;
  hasContacted: boolean;
  hasConverted: boolean;
}

/* ---------- Helpers ---------- */

function formatVND(amount: number): string {
  if (!amount) return "Miễn phí";
  return amount.toLocaleString("vi-VN") + "đ";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins}p trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  new: {
    label: "Mới",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.25)",
    dot: "#3b82f6",
  },
  contacted: {
    label: "Đã liên hệ",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    dot: "#f59e0b",
  },
  converted: {
    label: "Đã mua",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.25)",
    dot: "#22c55e",
  },
  dismissed: {
    label: "Bỏ qua",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
    border: "rgba(107,114,128,0.25)",
    dot: "#6b7280",
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* ---------- Page ---------- */

export default async function CRMInterestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    product_id?: string;
    updated?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q || "";
  const statusFilter = params.status || "";
  const productFilter = params.product_id || "";

  // Role-aware viewer scope: admin/manager see everything, sale sees only their own
  const scope = await getViewerScope();
  if (!scope.canView) redirect("/dashboard");

  const admin = await createAdminClient();

  // Build query
  let query = admin
    .from("course_interests")
    .select(
      `
      *,
      profiles!course_interests_user_id_profiles_fkey(full_name, avatar_url, tier, level, phone),
      products!course_interests_product_id_fkey(title, slug, price, sale_price, thumbnail),
      contacted_profile:profiles!course_interests_contacted_by_profiles_fkey(full_name),
      assigned_profile:profiles!course_interests_assigned_to_fkey(full_name)
    `
    )
    .order("last_viewed_at", { ascending: false })
    .limit(500);

  if (scope.isSale) {
    query = query.eq("assigned_to", scope.userId);
  }
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (productFilter) {
    query = query.eq("product_id", productFilter);
  }

  const { data } = await query;

  // Fetch emails
  const rawInterests = (data ?? []) as unknown as CourseInterest[];
  const emailMap: Record<string, string> = {};

  if (rawInterests.length > 0) {
    try {
      const {
        data: { users },
      } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of users) {
        if (u.id && u.email) emailMap[u.id] = u.email;
      }
    } catch {
      // fallback: no emails
    }
  }

  // Inject email
  let interests: CourseInterest[] = rawInterests.map((i) => ({
    ...i,
    profiles: i.profiles
      ? { ...i.profiles, email: emailMap[i.user_id] || null }
      : null,
  }));

  // Text search
  if (q) {
    const searchLower = q.toLowerCase();
    interests = interests.filter(
      (i) =>
        (i.profiles?.full_name || "").toLowerCase().includes(searchLower) ||
        (i.profiles?.email || "").toLowerCase().includes(searchLower) ||
        (i.products?.title || "").toLowerCase().includes(searchLower)
    );
  }

  // Group by customer
  const customerMap = new Map<string, CustomerGroup>();
  for (const interest of interests) {
    const uid = interest.user_id;
    if (!customerMap.has(uid)) {
      const p = interest.profiles;
      customerMap.set(uid, {
        userId: uid,
        name: p?.full_name || "Khách hàng",
        email: p?.email || emailMap[uid] || "—",
        phone: p?.phone || null,
        avatarUrl: p?.avatar_url || null,
        tier: p?.tier || "free",
        level: p?.level || 1,
        interests: [],
        totalViews: 0,
        latestView: interest.last_viewed_at,
        assignedTo: null,
        assignedName: null,
        hasNew: false,
        hasContacted: false,
        hasConverted: false,
      });
    }
    const group = customerMap.get(uid)!;
    group.interests.push(interest);
    group.totalViews += interest.view_count;
    if (interest.last_viewed_at > group.latestView) {
      group.latestView = interest.last_viewed_at;
    }
    // Track assigned sale (pick first non-null)
    if (!group.assignedTo && interest.assigned_to) {
      group.assignedTo = interest.assigned_to;
      group.assignedName = interest.assigned_profile?.full_name || null;
    }
    // Also check contacted_by as implicit assignment
    if (!group.assignedTo && interest.contacted_by) {
      group.assignedTo = interest.contacted_by;
      group.assignedName = interest.contacted_profile?.full_name || null;
    }
    if (interest.status === "new") group.hasNew = true;
    if (interest.status === "contacted") group.hasContacted = true;
    if (interest.status === "converted") group.hasConverted = true;
  }

  const customers = Array.from(customerMap.values()).sort(
    (a, b) => new Date(b.latestView).getTime() - new Date(a.latestView).getTime()
  );

  // Stats
  const totalCustomers = customers.length;
  const totalInterests = interests.length;
  const newCount = interests.filter((i) => i.status === "new").length;
  const contactedCount = interests.filter((i) => i.status === "contacted").length;
  const convertedCount = interests.filter((i) => i.status === "converted").length;

  // Staff list for assignment dropdown — must match backend (admin/manager/sale only)
  const staffList = await getSalesUsers(admin);

  // Products for filter
  const { data: allProducts } = await admin
    .from("products")
    .select("id, title")
    .eq("status", "published")
    .order("title");

  const stats = [
    { label: "Khách hàng", value: totalCustomers, icon: Users, color: "#3b82f6" },
    { label: "Chưa liên hệ", value: newCount, icon: Clock, color: "#f59e0b" },
    { label: "Đã liên hệ", value: contactedCount, icon: Phone, color: "#a855f7" },
    { label: "Đã chuyển đổi", value: convertedCount, icon: CheckCircle, color: "#22c55e" },
  ];

  return (
    <div>
      <TopBar
        title="Khách quan tâm khoá học"
        subtitle={`${totalCustomers} khách hàng · ${totalInterests} lượt quan tâm`}
      />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        {/* Success toast */}
        {params.updated && (
          <div
            className="rounded-xl p-3 text-sm text-center"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.25)",
              color: "#22c55e",
            }}
          >
            Cập nhật thành công
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="card-dark p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-medium">{s.label}</span>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "20" }}
                >
                  <s.icon size={14} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-xl font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card-dark p-4">
          <form className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-gray-400 mb-1 block">Tìm kiếm</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Tên, email, khoá học..."
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4A843] transition-colors"
                />
              </div>
            </div>
            <div className="min-w-[140px]">
              <label className="text-xs text-gray-400 mb-1 block">Trạng thái</label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843]"
              >
                <option value="">Tất cả</option>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="text-xs text-gray-400 mb-1 block">Khoá học</label>
              <select
                name="product_id"
                defaultValue={productFilter}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843]"
              >
                <option value="">Tất cả khoá học</option>
                {(allProducts ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="btn-green text-sm py-2 px-4 inline-flex items-center gap-1.5"
            >
              <Filter size={14} /> Lọc
            </button>
          </form>
        </div>

        {/* Customer list */}
        {customers.length === 0 ? (
          <div className="card-dark p-10 text-center">
            <Eye size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Chưa có khách hàng nào quan tâm khoá học.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {customers.map((customer) => {
              const initials = getInitials(customer.name);
              const isVip = customer.tier === "vip" || customer.tier === "member";

              return (
                <div key={customer.userId} className="card-dark overflow-hidden">
                  {/* Customer header */}
                  <div className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <UserAvatar
                        src={customer.avatarUrl}
                        initials={initials}
                        size={44}
                        gradient={
                          isVip
                            ? "linear-gradient(135deg, #D4A843, #059669)"
                            : "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            {customer.name}
                          </span>
                          {isVip && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{
                                background: "rgba(212,168,67,0.15)",
                                color: "#D4A843",
                              }}
                            >
                              {customer.tier.toUpperCase()}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500">
                            Lv.{customer.level}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="truncate">{customer.email}</span>
                          {customer.phone && (
                            <>
                              <span className="text-gray-700">·</span>
                              <a
                                href={`tel:${customer.phone}`}
                                className="flex items-center gap-0.5 text-green-500 hover:text-green-400 transition-colors flex-shrink-0"
                              >
                                <Phone size={10} />
                                {customer.phone}
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Summary chips */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                      <div className="flex items-center gap-1" title="Khoá học quan tâm">
                        <BookOpen size={12} className="text-[#D4A843]" />
                        <span>{customer.interests.length} khoá</span>
                      </div>
                      <div className="flex items-center gap-1" title="Tổng lượt xem">
                        <Eye size={12} />
                        <span>{customer.totalViews} xem</span>
                      </div>
                      <div className="flex items-center gap-1" title="Lần xem gần nhất">
                        <Clock size={12} />
                        <span>{timeAgo(customer.latestView)}</span>
                      </div>
                    </div>

                    {/* Assigned sale */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {customer.assignedName ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-medium"
                          style={{
                            background: "rgba(139,92,246,0.1)",
                            color: "#a78bfa",
                            border: "1px solid rgba(139,92,246,0.2)",
                          }}
                        >
                          <UserCheck size={11} />
                          {customer.assignedName}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-medium"
                          style={{
                            background: "rgba(245,158,11,0.1)",
                            color: "#f59e0b",
                            border: "1px solid rgba(245,158,11,0.25)",
                          }}
                        >
                          Chưa gán
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Course interests table */}
                  <div className="border-t border-[#1f1f1f]">
                    {customer.interests.map((interest, idx) => {
                      const product = interest.products;
                      const sc = statusConfig[interest.status] || statusConfig.new;
                      const price = product?.sale_price || product?.price || 0;

                      return (
                        <div
                          key={interest.id}
                          className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 hover:bg-[#161616] transition-colors ${
                            idx > 0 ? "border-t border-[#1a1a1a]" : ""
                          }`}
                        >
                          {/* Course info */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {product?.thumbnail ? (
                              <img
                                src={product.thumbnail}
                                alt=""
                                className="w-14 h-10 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                                <BookOpen size={14} className="text-gray-600" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/courses/${product?.slug}`}
                                className="text-sm text-white hover:text-[#D4A843] transition-colors truncate block font-medium"
                              >
                                {product?.title || "—"}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500">
                                  {formatVND(price)}
                                </span>
                                <span className="text-[10px] text-gray-600">·</span>
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                  <Eye size={10} /> {interest.view_count}x
                                </span>
                                <span className="text-[10px] text-gray-600">·</span>
                                <span className="text-[10px] text-gray-500">
                                  {timeAgo(interest.last_viewed_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status badge */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1"
                              style={{
                                background: sc.bg,
                                color: sc.color,
                                border: `1px solid ${sc.border}`,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full inline-block"
                                style={{ background: sc.dot }}
                              />
                              {sc.label}
                            </span>
                          </div>

                          {/* Contacted info */}
                          {interest.contacted && interest.contacted_profile?.full_name && (
                            <div className="text-[10px] text-gray-500 flex-shrink-0">
                              <Phone size={10} className="inline mr-0.5" />
                              {interest.contacted_profile.full_name}{" "}
                              <span className="text-gray-600">
                                {formatDate(interest.contacted_at)}
                              </span>
                            </div>
                          )}

                          {/* Inline sale-assign dropdown */}
                          <InterestAssignSelect
                            interestId={interest.id}
                            assignedTo={interest.assigned_to}
                            salesUsers={staffList ?? []}
                          />

                          {/* Actions */}
                          <InterestActions
                            interestId={interest.id}
                            currentStatus={interest.status}
                            currentNotes={interest.notes}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes (show if any interest has notes) */}
                  {customer.interests.some((i) => i.notes) && (
                    <div className="px-4 py-2.5 border-t border-[#1f1f1f] bg-[#0f0f0f]">
                      {customer.interests
                        .filter((i) => i.notes)
                        .map((i) => (
                          <p key={i.id} className="text-[11px] text-gray-400">
                            <span className="text-gray-500 font-medium">
                              {i.products?.title}:
                            </span>{" "}
                            {i.notes}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

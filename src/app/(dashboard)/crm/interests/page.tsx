import TopBar from "@/components/layout/TopBar";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import UserAvatar from "@/components/admin/UserAvatar";
import InterestActions from "./InterestActions";
import {
  Eye,
  BookOpen,
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Filter,
  Search,
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
  notes: string | null;
  status: string;
  // Joined
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
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
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
  { label: string; color: string; bg: string; border: string }
> = {
  new: {
    label: "Chưa liên hệ",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.25)",
  },
  contacted: {
    label: "Đã liên hệ",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
  },
  converted: {
    label: "Đã mua",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.25)",
  },
  dismissed: {
    label: "Bỏ qua",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
    border: "rgba(107,114,128,0.25)",
  },
};

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

  const admin = await createAdminClient();

  // Build query — profiles doesn't have email, so we fetch it separately
  let query = admin
    .from("course_interests")
    .select(
      `
      *,
      profiles!course_interests_user_id_fkey(full_name, avatar_url, tier, level),
      products!course_interests_product_id_fkey(title, slug, price, sale_price, thumbnail),
      contacted_profile:contacted_by(full_name)
    `
    )
    .order("last_viewed_at", { ascending: false })
    .limit(200);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (productFilter) {
    query = query.eq("product_id", productFilter);
  }

  const { data, error } = await query;

  // Fetch emails from auth.users for all unique user_ids
  const rawInterests = (data ?? []) as unknown as CourseInterest[];
  const userIds = [...new Set(rawInterests.map((i) => i.user_id))];
  const emailMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: usersData } = await admin
      .from("auth.users" as string)
      .select("id, email");

    // Fallback: use admin auth API if direct query fails
    if (!usersData) {
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of users) {
        if (u.id && u.email) emailMap[u.id] = u.email;
      }
    } else {
      for (const u of usersData as { id: string; email: string }[]) {
        if (u.id && u.email) emailMap[u.id] = u.email;
      }
    }
  }

  // Inject email into each interest's profiles object
  let interests: CourseInterest[] = rawInterests.map((i) => ({
    ...i,
    profiles: i.profiles
      ? { ...i.profiles, email: emailMap[i.user_id] || null }
      : null,
  }));

  // Client-side text search (full_name, email)
  if (q) {
    const searchLower = q.toLowerCase();
    interests = interests.filter(
      (i) =>
        (i.profiles?.full_name || "").toLowerCase().includes(searchLower) ||
        (i.profiles?.email || "").toLowerCase().includes(searchLower) ||
        (i.products?.title || "").toLowerCase().includes(searchLower)
    );
  }

  // Stats
  const totalInterests = interests.length;
  const newCount = interests.filter((i) => i.status === "new").length;
  const contactedCount = interests.filter(
    (i) => i.status === "contacted"
  ).length;
  const convertedCount = interests.filter(
    (i) => i.status === "converted"
  ).length;

  // Get unique products for filter dropdown
  const { data: allProducts } = await admin
    .from("products")
    .select("id, title")
    .eq("status", "published")
    .order("title");

  const stats = [
    {
      label: "Tổng quan tâm",
      value: totalInterests,
      icon: Eye,
      color: "#3b82f6",
    },
    {
      label: "Chưa liên hệ",
      value: newCount,
      icon: Clock,
      color: "#f59e0b",
    },
    {
      label: "Đã liên hệ",
      value: contactedCount,
      icon: Phone,
      color: "#a855f7",
    },
    {
      label: "Đã chuyển đổi",
      value: convertedCount,
      icon: CheckCircle,
      color: "#22c55e",
    },
  ];

  return (
    <div>
      <TopBar
        title="Khách quan tâm khoá học"
        subtitle="Theo dõi khách hàng đang xem khoá học chưa mua"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
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
            ✓ Cập nhật thành công
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="card-dark p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-medium">
                  {s.label}
                </span>
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
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-gray-400 mb-1 block">
                Tìm kiếm
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Tên, email, khoá học..."
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4A843] transition-colors"
                />
              </div>
            </div>

            {/* Status filter */}
            <div className="min-w-[140px]">
              <label className="text-xs text-gray-400 mb-1 block">
                Trạng thái
              </label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843]"
              >
                <option value="">Tất cả</option>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Product filter */}
            <div className="min-w-[180px]">
              <label className="text-xs text-gray-400 mb-1 block">
                Khoá học
              </label>
              <select
                name="product_id"
                defaultValue={productFilter}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843]"
              >
                <option value="">Tất cả khoá học</option>
                {(allProducts ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn-green text-sm py-2 px-4 inline-flex items-center gap-1.5"
            >
              <Filter size={14} />
              Lọc
            </button>
          </form>
        </div>

        {/* Interests list */}
        {interests.length === 0 ? (
          <div className="card-dark p-10 text-center">
            <Eye size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Chưa có khách hàng nào quan tâm khoá học.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {interests.map((interest) => {
              const customer = interest.profiles;
              const product = interest.products;
              const status =
                statusConfig[interest.status] || statusConfig.new;
              const customerName =
                customer?.full_name || customer?.email || "Khách hàng";
              const initials = (customer?.full_name || "?")
                .split(" ")
                .map((w) => w[0])
                .slice(-2)
                .join("")
                .toUpperCase();
              const price = product?.sale_price || product?.price || 0;

              return (
                <div
                  key={interest.id}
                  className="card-dark p-4 hover:bg-[#1e1e1e] transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Customer info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <UserAvatar
                        src={customer?.avatar_url}
                        initials={initials}
                        size={40}
                        gradient="linear-gradient(135deg, #3b82f6, #1d4ed8)"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white truncate">
                            {customerName}
                          </span>
                          {customer?.tier && customer.tier !== "free" && (
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
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: status.bg,
                              color: status.color,
                              border: `1px solid ${status.border}`,
                            }}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {customer?.email || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Course info */}
                    <div className="flex items-center gap-3 sm:min-w-[250px]">
                      {product?.thumbnail && (
                        <img
                          src={product.thumbnail}
                          alt=""
                          className="w-12 h-8 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/courses/${product?.slug}`}
                          className="text-sm text-[#D4A843] hover:underline truncate block"
                        >
                          {product?.title || "—"}
                        </Link>
                        <span className="text-xs text-gray-500">
                          {formatVND(price)}
                        </span>
                      </div>
                    </div>

                    {/* View stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 sm:min-w-[200px]">
                      <div className="flex items-center gap-1">
                        <Eye size={12} />
                        <span>{interest.view_count} lượt xem</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{timeAgo(interest.last_viewed_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <InterestActions
                      interestId={interest.id}
                      currentStatus={interest.status}
                      currentNotes={interest.notes}
                      contactedByName={
                        interest.contacted_profile?.full_name || null
                      }
                      contactedAt={interest.contacted_at}
                    />
                  </div>

                  {/* Notes row */}
                  {interest.notes && (
                    <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                      <p className="text-xs text-gray-400">
                        <span className="text-gray-500 font-medium">
                          Ghi chú:
                        </span>{" "}
                        {interest.notes}
                      </p>
                    </div>
                  )}

                  {/* Contacted info */}
                  {interest.contacted && interest.contacted_at && (
                    <div className="mt-2 text-[11px] text-gray-500">
                      Liên hệ bởi{" "}
                      <span className="text-gray-400">
                        {interest.contacted_profile?.full_name || "—"}
                      </span>{" "}
                      lúc {formatDate(interest.contacted_at)}
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

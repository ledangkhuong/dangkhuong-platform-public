import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { grantCourseAccess, revokeCourseAccess } from "@/lib/actions/enrollment";
import BulkEnrollForm from "@/components/admin/BulkEnrollForm";
import {
  BookOpen,
  UserPlus,
  Trash2,
  Gift,
  ShoppingCart,
  Shield,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrollmentSource = "purchase" | "admin" | "gift" | "free";

interface EnrollmentRow {
  id: string;
  user_id: string;
  product_id: string;
  source: EnrollmentSource;
  created_at: string;
  profiles: { full_name: string | null } | null;
  products: { title: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

const SOURCE_CONFIG: Record<
  EnrollmentSource,
  { label: string; bg: string; color: string; border: string; icon: typeof ShoppingCart }
> = {
  purchase: {
    label: "Mua",
    bg: "rgba(212,168,67,0.1)",
    color: "#D4A843",
    border: "rgba(212,168,67,0.2)",
    icon: ShoppingCart,
  },
  admin: {
    label: "Admin",
    bg: "rgba(59,130,246,0.1)",
    color: "#3b82f6",
    border: "rgba(59,130,246,0.2)",
    icon: Shield,
  },
  gift: {
    label: "Tặng",
    bg: "rgba(168,85,247,0.1)",
    color: "#a855f7",
    border: "rgba(168,85,247,0.2)",
    icon: Gift,
  },
  free: {
    label: "Miễn phí",
    bg: "rgba(107,114,128,0.1)",
    color: "#6b7280",
    border: "rgba(107,114,128,0.2)",
    icon: BookOpen,
  },
};

function SourceBadge({ source }: { source: EnrollmentSource }) {
  const cfg = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.free;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    granted?: string;
    revoked?: string;
    skipped?: string;
  }>;
}) {
  const { error, granted, revoked, skipped } = await searchParams;

  // Auth check
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) redirect("/dashboard");

  // Fetch data with admin client
  const supabase = await createAdminClient();

  // Fetch all products for dropdown
  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, status")
    .order("title");

  // Fetch recent enrollments with joins
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, user_id, product_id, source, created_at, profiles(full_name), products(title)")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows: EnrollmentRow[] = (enrollments ?? []) as unknown as EnrollmentRow[];

  // Error messages
  const errorMessages: Record<string, string> = {
    missing_fields: "Vui lòng nhập email và tích chọn ít nhất 1 khoá học.",
    user_not_found: "Không tìm thấy tài khoản với email này.",
    already_enrolled: "Học viên đã được cấp quyền khoá học này.",
    failed: "Có lỗi xảy ra. Vui lòng thử lại.",
  };

  return (
    <div>
      <TopBar
        title="Cấp quyền Khoá học"
        subtitle="Quản lý quyền truy cập khoá học cho học viên"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Notifications ── */}
        {error && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#ef4444",
            }}
          >
            <AlertCircle size={16} />
            {errorMessages[error] ?? "Có lỗi xảy ra."}
          </div>
        )}
        {granted && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{
              background: "rgba(212,168,67,0.08)",
              border: "1px solid rgba(212,168,67,0.2)",
              color: "#D4A843",
            }}
          >
            <CheckCircle2 size={16} />
            Đã cấp quyền {granted} khoá học thành công!
            {skipped && ` (${skipped} khoá đã có từ trước)`}
          </div>
        )}
        {revoked && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              color: "#f59e0b",
            }}
          >
            <AlertCircle size={16} />
            Đã thu hồi quyền khoá học.
          </div>
        )}

        {/* ── Grant access form ── */}
        <div className="card-dark p-6">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(212,168,67,0.12)" }}
            >
              <UserPlus size={17} className="text-[#D4A843]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Cấp quyền khoá học</h2>
              <p className="text-xs text-gray-500">Nhập email học viên và chọn khoá học để cấp quyền</p>
            </div>
          </div>

          <form action={grantCourseAccess} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email học viên</label>
              <input
                type="email"
                name="email"
                placeholder="vd: hocvien@gmail.com"
                required
                className="input-dark w-full sm:max-w-md"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">
                Chọn khoá học <span className="text-gray-600">(có thể chọn nhiều)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(products ?? []).map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#2a2a2a] hover:border-[#D4A843]/40 hover:bg-[#D4A843]/5 transition-all cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      name="product_ids"
                      value={p.id}
                      className="w-4 h-4 rounded border-gray-600 bg-[#1a1a1a] text-[#D4A843] focus:ring-[#D4A843]/50 focus:ring-offset-0 accent-[#D4A843]"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate block">
                        {p.title}
                      </span>
                    </div>
                    {p.price === 0 && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(107,114,128,0.15)", color: "#9ca3af" }}
                      >
                        Miễn phí
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="btn-green py-2.5 px-5">
              <UserPlus size={15} />
              Cấp quyền khoá học
            </button>
          </form>
        </div>

        {/* ── Bulk grant form ── */}
        <BulkEnrollForm
          courses={(products ?? []).map((p) => ({
            id: p.id,
            title: p.title,
            price: p.price ?? 0,
          }))}
        />

        {/* ── Enrollments table ── */}
        <div className="card-dark overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <span className="text-xs text-gray-500">
              Hiển thị{" "}
              <span className="text-white font-medium">{rows.length}</span> enrollment
              gần nhất
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="p-12 text-center text-gray-600 text-sm">
              Chưa có enrollment nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Học viên", "Khoá học", "Nguồn", "Ngày cấp", "Hành động"].map(
                      (col) => (
                        <th
                          key={col}
                          className="text-left text-xs font-semibold text-gray-500 px-5 py-3 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className="hover:bg-white/[0.02] transition-colors"
                      style={{
                        borderBottom:
                          idx < rows.length - 1 ? "1px solid #1f1f1f" : "none",
                      }}
                    >
                      {/* Học viên */}
                      <td className="px-5 py-3.5">
                        <span className="text-white text-sm font-medium">
                          {row.profiles?.full_name ?? "—"}
                        </span>
                      </td>

                      {/* Khoá học */}
                      <td className="px-5 py-3.5">
                        <span className="text-gray-300 text-sm">
                          {row.products?.title ?? "—"}
                        </span>
                      </td>

                      {/* Nguồn */}
                      <td className="px-5 py-3.5">
                        <SourceBadge source={row.source} />
                      </td>

                      {/* Ngày cấp */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500">
                          {formatDateTime(row.created_at)}
                        </span>
                      </td>

                      {/* Hành động */}
                      <td className="px-5 py-3.5">
                        <form action={revokeCourseAccess}>
                          <input type="hidden" name="enrollment_id" value={row.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Thu hồi quyền"
                          >
                            <Trash2 size={13} />
                            Thu hồi
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import CreateCouponForm from "@/components/admin/CreateCouponForm";
import DeleteCouponButton from "@/components/admin/DeleteCouponButton";
import {
  Tag,
  Percent,
  DollarSign,
  CheckCircle,
  XCircle,
  BarChart3,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CouponRow {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  min_order_amount: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

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

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function isUsedUp(maxUses: number | null, usedCount: number): boolean {
  if (maxUses === null) return false;
  return usedCount >= maxUses;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminCouponsPage() {
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
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Fetch coupons (bypass RLS)
  const supabase = await createAdminClient();
  const { data: coupons, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  const rows: CouponRow[] = (coupons ?? []) as CouponRow[];

  // Compute stats
  const totalCoupons = rows.length;
  const activeCoupons = rows.filter(
    (c) => c.is_active && !isExpired(c.expires_at) && !isUsedUp(c.max_uses, c.used_count)
  ).length;
  const totalUses = rows.reduce((sum, c) => sum + c.used_count, 0);

  return (
    <div>
      <TopBar
        title="Mã giảm giá"
        subtitle="Quản lý mã khuyến mãi và coupon"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Total coupons */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.12)" }}
              >
                <Tag size={17} className="text-[#3b82f6]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{totalCoupons}</div>
            <div className="text-xs text-gray-500 mt-0.5">Tổng mã giảm giá</div>
          </div>

          {/* Active coupons */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.12)" }}
              >
                <CheckCircle size={17} className="text-[#22c55e]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{activeCoupons}</div>
            <div className="text-xs text-gray-500 mt-0.5">Đang hoạt động</div>
          </div>

          {/* Total uses */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,168,67,0.12)" }}
              >
                <BarChart3 size={17} className="text-[#D4A843]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{totalUses}</div>
            <div className="text-xs text-gray-500 mt-0.5">Tổng lượt sử dụng</div>
          </div>
        </div>

        {/* ── Create form ── */}
        <CreateCouponForm />

        {/* ── Coupons table ── */}
        <div className="card-dark overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <span className="text-xs text-gray-500">
              Hiển thị{" "}
              <span className="text-white font-medium">{rows.length}</span>{" "}
              mã giảm giá
            </span>
          </div>

          {error ? (
            <div className="p-8 text-center text-red-400 text-sm">
              Lỗi khi tải danh sách: {error.message}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-gray-600 text-sm">
              Chưa có mã giảm giá nào. Nhấn &ldquo;Tạo mã giảm giá&rdquo; để bắt đầu.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {[
                      "Mã",
                      "Loại",
                      "Giá trị",
                      "Đã dùng / Tối đa",
                      "Đơn tối thiểu",
                      "Hết hạn",
                      "Trạng thái",
                      "",
                    ].map((col, i) => (
                      <th
                        key={col || `col-${i}`}
                        className="text-left text-xs font-semibold text-gray-500 px-5 py-3 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((coupon, idx) => {
                    const expired = isExpired(coupon.expires_at);
                    const usedUp = isUsedUp(coupon.max_uses, coupon.used_count);
                    const effectivelyActive = coupon.is_active && !expired && !usedUp;

                    return (
                      <tr
                        key={coupon.id}
                        className="hover:bg-white/[0.02] transition-colors"
                        style={{
                          borderBottom:
                            idx < rows.length - 1
                              ? "1px solid #1f1f1f"
                              : "none",
                        }}
                      >
                        {/* Code */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-sm font-bold text-[#D4A843]">
                            {coupon.code}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {coupon.discount_type === "percent" ? (
                              <Percent size={13} className="text-blue-400" />
                            ) : (
                              <DollarSign size={13} className="text-green-400" />
                            )}
                            <span className="text-xs text-gray-400">
                              {coupon.discount_type === "percent"
                                ? "Phần trăm"
                                : "Cố định"}
                            </span>
                          </div>
                        </td>

                        {/* Value */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-white">
                            {coupon.discount_type === "percent"
                              ? `${coupon.discount_value}%`
                              : formatCurrency(coupon.discount_value)}
                          </span>
                        </td>

                        {/* Used / Max */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-gray-300">
                            {coupon.used_count}
                            <span className="text-gray-600">
                              {" / "}
                              {coupon.max_uses !== null
                                ? coupon.max_uses
                                : "---"}
                            </span>
                          </span>
                        </td>

                        {/* Min order */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-gray-400 text-sm">
                            {coupon.min_order_amount > 0
                              ? formatCurrency(coupon.min_order_amount)
                              : "---"}
                          </span>
                        </td>

                        {/* Expires */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`text-xs ${
                              expired ? "text-red-400" : "text-gray-500"
                            }`}
                          >
                            {coupon.expires_at
                              ? formatDateTime(coupon.expires_at)
                              : "Không giới hạn"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          {effectivelyActive ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                              style={{
                                background: "rgba(34,197,94,0.1)",
                                color: "#22c55e",
                                border: "1px solid rgba(34,197,94,0.2)",
                              }}
                            >
                              <CheckCircle size={11} />
                              Hoạt động
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                              style={{
                                background: "rgba(107,114,128,0.1)",
                                color: "#6b7280",
                                border: "1px solid rgba(107,114,128,0.2)",
                              }}
                            >
                              <XCircle size={11} />
                              {expired
                                ? "Hết hạn"
                                : usedUp
                                ? "Hết lượt"
                                : "Tắt"}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <DeleteCouponButton
                            couponId={coupon.id}
                            couponCode={coupon.code}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

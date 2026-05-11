import TopBar from "@/components/layout/TopBar";
import { createAdminClient } from "@/lib/supabase/server";
import { createDeal } from "@/lib/actions/crm";
import {
  Plus,
  CircleDollarSign,
  Trophy,
  XCircle,
  LayoutGrid,
  CalendarDays,
  Percent,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Deal {
  id: string;
  title: string;
  amount: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  notes: string | null;
  contacts: { full_name: string; email: string | null } | null;
  products: { title: string } | null;
  assigned_profile: { full_name: string } | null;
}

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
}

interface Product {
  id: string;
  title: string;
  price: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STAGES = [
  { key: "lead", label: "Lead", color: "#3b82f6" },
  { key: "contacted", label: "Đã liên hệ", color: "#f59e0b" },
  { key: "demo", label: "Demo", color: "#a855f7" },
  { key: "proposal", label: "Báo giá", color: "#ec4899" },
  { key: "negotiation", label: "Đàm phán", color: "#f97316" },
  { key: "won", label: "Thành công", color: "#22c55e" },
  { key: "lost", label: "Thất bại", color: "#ef4444" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Deal Card ───────────────────────────────────────────────────────────────

function DealCard({ deal, stageColor }: { deal: Deal; stageColor: string }) {
  return (
    <div
      className="card-dark p-3 rounded-lg"
      style={{ borderLeft: `3px solid ${stageColor}` }}
    >
      <p className="text-sm font-semibold text-white truncate">{deal.title}</p>

      {deal.contacts && (
        <p className="text-xs text-gray-400 mt-1 truncate">
          {deal.contacts.full_name}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-bold text-[#22c55e]">
          {formatVND(deal.amount)}
        </span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
        >
          {deal.probability}%
        </span>
      </div>

      {deal.products && (
        <p className="text-xs text-gray-500 mt-1.5 truncate">
          {deal.products.title}
        </p>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2a2a2a]">
        <span className="text-[11px] text-gray-500 flex items-center gap-1">
          <CalendarDays size={10} />
          {formatDate(deal.expected_close_date)}
        </span>
        {deal.assigned_profile && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
            title={deal.assigned_profile.full_name}
          >
            {getInitials(deal.assigned_profile.full_name)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const showNewForm = params.new === "1";

  const admin = await createAdminClient();

  // Fetch deals with relations
  const { data: deals } = await admin
    .from("crm_deals")
    .select(
      "*, contacts:contact_id(full_name, email), products:product_id(title), assigned_profile:assigned_to(full_name)"
    )
    .order("created_at", { ascending: false });

  // Fetch contacts and products for the new deal form
  const [contactsRes, productsRes] = await Promise.all([
    admin
      .from("crm_contacts")
      .select("id, full_name, email")
      .order("full_name"),
    admin
      .from("products")
      .select("id, title, price")
      .eq("status", "published")
      .order("title"),
  ]);

  const contacts = (contactsRes.data ?? []) as Contact[];
  const products = (productsRes.data ?? []) as Product[];
  const allDeals = (deals ?? []) as Deal[];

  // Group deals by stage
  const stagesWithDeals = STAGES.map((stage) => ({
    ...stage,
    deals: allDeals.filter((d) => d.stage === stage.key),
  }));

  // Stats
  const totalDeals = allDeals.length;
  const totalValue = allDeals.reduce((sum, d) => sum + d.amount, 0);
  const wonCount = allDeals.filter((d) => d.stage === "won").length;
  const lostCount = allDeals.filter((d) => d.stage === "lost").length;

  // Notifications
  const notification = params.deal_created
    ? "Deal mới đã được tạo thành công!"
    : params.stage_updated
      ? "Giai đoạn deal đã được cập nhật!"
      : null;

  return (
    <div>
      <TopBar title="Sales Pipeline" subtitle="Quản lý deals và cơ hội bán hàng" />

      <div className="p-4 sm:p-6 space-y-5">
        {/* Notification */}
        {notification && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl text-sm"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <CheckCircle2 size={16} className="text-[#22c55e] shrink-0" />
            <span className="text-white">{notification}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card-dark p-4 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.1)" }}
            >
              <LayoutGrid size={16} className="text-[#3b82f6]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tổng deals</p>
              <p className="text-lg font-bold text-white">{totalDeals}</p>
            </div>
          </div>

          <div className="card-dark p-4 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.1)" }}
            >
              <CircleDollarSign size={16} className="text-[#f59e0b]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Giá trị pipeline</p>
              <p className="text-lg font-bold text-white">{formatVND(totalValue)}</p>
            </div>
          </div>

          <div className="card-dark p-4 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.1)" }}
            >
              <Trophy size={16} className="text-[#22c55e]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Đã thắng</p>
              <p className="text-lg font-bold text-white">{wonCount}</p>
            </div>
          </div>

          <div className="card-dark p-4 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.1)" }}
            >
              <XCircle size={16} className="text-[#ef4444]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Đã mất</p>
              <p className="text-lg font-bold text-white">{lostCount}</p>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Pipeline Board</h2>
          <Link
            href="/crm/pipeline?new=1"
            className="btn-green flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={15} />
            Tạo deal
          </Link>
        </div>

        {/* New Deal Form */}
        {showNewForm && (
          <div className="card-dark p-5 rounded-xl">
            <h3 className="text-sm font-semibold text-white mb-4">Tạo deal mới</h3>
            <form action={createDeal} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Title */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Tiêu đề deal *</label>
                <input
                  name="title"
                  required
                  className="input-dark w-full px-3 py-2 rounded-lg text-sm"
                  placeholder="VD: Upsell khoá học nâng cao"
                />
              </div>

              {/* Contact */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Chọn khách hàng *</label>
                <select name="contact_id" required className="input-dark w-full px-3 py-2 rounded-lg text-sm">
                  <option value="">-- Chọn --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} {c.email ? `(${c.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Chọn khoá học</label>
                <select name="product_id" className="input-dark w-full px-3 py-2 rounded-lg text-sm">
                  <option value="">-- Không chọn --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({formatVND(p.price)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Giá trị (VND)</label>
                <input
                  name="amount"
                  type="number"
                  min={0}
                  className="input-dark w-full px-3 py-2 rounded-lg text-sm"
                  placeholder="0"
                />
              </div>

              {/* Stage */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Giai đoạn</label>
                <select name="stage" className="input-dark w-full px-3 py-2 rounded-lg text-sm">
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Probability */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Xác suất (%)</label>
                <input
                  name="probability"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={50}
                  className="input-dark w-full px-3 py-2 rounded-lg text-sm"
                />
              </div>

              {/* Expected close date */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ngày dự kiến chốt</label>
                <input
                  name="expected_close_date"
                  type="date"
                  className="input-dark w-full px-3 py-2 rounded-lg text-sm"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="text-xs text-gray-400 mb-1 block">Ghi chú</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="input-dark w-full px-3 py-2 rounded-lg text-sm resize-none"
                  placeholder="Thông tin thêm về deal..."
                />
              </div>

              {/* Actions */}
              <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="btn-green px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Plus size={14} />
                  Tạo deal
                </button>
                <Link
                  href="/crm/pipeline"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Huỷ
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* Pipeline Board */}
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ minHeight: "70vh" }}
        >
          {stagesWithDeals.map((stage) => (
            <div key={stage.key} className="flex-shrink-0 w-72">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: stage.color }}
                />
                <span className="text-sm font-semibold text-white">
                  {stage.label}
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                  {stage.deals.length}
                </span>
              </div>

              {/* Deal cards */}
              <div className="space-y-2">
                {stage.deals.length > 0 ? (
                  stage.deals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      stageColor={stage.color}
                    />
                  ))
                ) : (
                  <div
                    className="rounded-lg p-4 text-center text-xs text-gray-600 border border-dashed border-[#2a2a2a]"
                  >
                    Chưa có deal
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import TopBar from "@/components/layout/TopBar";
import { createAdminClient } from "@/lib/supabase/server";
import { createContact, importContacts, syncContactsFromOrders } from "@/lib/actions/crm";
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileUp,
  Building2,
  Clock,
  ShoppingCart,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

/* ---------- Types ---------- */

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  assigned_profile: { full_name: string | null } | null;
  journey_stage: string;
  lead_score: number;
  utm_source: string | null;
}

interface OrderSummary {
  paidCount: number;
  pendingCount: number;
  totalPaid: number;
}

/* ---------- Helpers ---------- */

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
}

function formatVND(amount: number): string {
  if (!amount) return "0đ";
  return amount.toLocaleString("vi-VN") + "đ";
}

/* ---------- Status & Source Config ---------- */

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new:          { label: "Mới",         color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.25)" },
  contacted:    { label: "Đã liên hệ",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
  qualified:    { label: "Tiềm năng",   color: "#a855f7", bg: "rgba(168,85,247,0.1)", border: "rgba(168,85,247,0.25)" },
  negotiation:  { label: "Đàm phán",    color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)" },
  won:          { label: "Thành công",   color: "#D4A843", bg: "rgba(212,168,67,0.1)",  border: "rgba(212,168,67,0.25)" },
  lost:         { label: "Mất",         color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)" },
  churned:      { label: "Rời bỏ",      color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.25)" },
};

const sourceConfig: Record<string, { label: string; color: string; bg: string }> = {
  manual:   { label: "Thủ công",   color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  import:   { label: "Import",    color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  website:  { label: "Website",   color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  referral: { label: "Giới thiệu", color: "#D4A843", bg: "rgba(212,168,67,0.1)" },
  ads:      { label: "Quảng cáo", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  social:   { label: "MXH",       color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
};

const journeyStageConfig: Record<string, { label: string; color: string }> = {
  visitor:      { label: "Khách ghé",    color: "#6b7280" },
  lead:         { label: "Lead",         color: "#3b82f6" },
  contacted:    { label: "Đã liên hệ",  color: "#f59e0b" },
  qualified:    { label: "Tiềm năng",   color: "#a855f7" },
  negotiation:  { label: "Đàm phán",    color: "#f97316" },
  customer:     { label: "Khách hàng",  color: "#D4A843" },
  advocate:     { label: "Đại sứ",      color: "#22c55e" },
};

/* ---------- Page ---------- */

export default async function CRMContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; journey_stage?: string; created?: string; updated?: string; deleted?: string; imported?: string; synced?: string; error?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || "";
  const statusFilter = params.status || "";
  const journeyStageFilter = params.journey_stage || "";

  const admin = await createAdminClient();

  // Build query
  let query = admin
    .from("crm_contacts")
    .select("*, assigned_profile:assigned_to(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (journeyStageFilter) {
    query = query.eq("journey_stage", journeyStageFilter);
  }

  const { data, error } = await query;
  const contacts: Contact[] = (data ?? []) as unknown as Contact[];

  // Stats counts
  const { count: totalCount } = await admin
    .from("crm_contacts")
    .select("*", { count: "exact", head: true });
  const { count: newCount } = await admin
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");
  const { count: contactedCount } = await admin
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("status", "contacted");
  const { count: qualifiedCount } = await admin
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("status", "qualified");
  const { count: wonCount } = await admin
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("status", "won");

  const stats = [
    { label: "Tổng KH", value: totalCount ?? 0, icon: Users, color: "#3b82f6" },
    { label: "Mới", value: newCount ?? 0, icon: UserPlus, color: "#60a5fa" },
    { label: "Đã liên hệ", value: contactedCount ?? 0, icon: Phone, color: "#f59e0b" },
    { label: "Tiềm năng", value: qualifiedCount ?? 0, icon: CheckCircle, color: "#a855f7" },
    { label: "Thành công", value: wonCount ?? 0, icon: CheckCircle, color: "#D4A843" },
  ];

  // Fetch order data for contacts (match by email)
  const contactEmails = contacts
    .map((c) => c.email)
    .filter((e): e is string => !!e);

  const orderSummaryMap: Record<string, OrderSummary> = {};

  if (contactEmails.length > 0) {
    const { data: ordersData } = await admin
      .from("orders")
      .select("customer_email, amount, status")
      .in("customer_email", contactEmails);

    if (ordersData) {
      for (const order of ordersData) {
        const email = order.customer_email as string;
        if (!orderSummaryMap[email]) {
          orderSummaryMap[email] = { paidCount: 0, pendingCount: 0, totalPaid: 0 };
        }
        if (order.status === "paid") {
          orderSummaryMap[email].paidCount += 1;
          orderSummaryMap[email].totalPaid += Number(order.amount) || 0;
        } else if (order.status === "pending") {
          orderSummaryMap[email].pendingCount += 1;
        }
      }
    }
  }

  // Fetch enrollment count per contact email
  const enrollmentCountMap: Record<string, number> = {};

  if (contactEmails.length > 0) {
    const { data: enrollmentData } = await admin
      .from("profiles")
      .select("email, enrollments:enrollments(count)")
      .in("email", contactEmails);

    if (enrollmentData) {
      for (const profile of enrollmentData) {
        const email = profile.email as string;
        const countArr = profile.enrollments as unknown as { count: number }[];
        enrollmentCountMap[email] = countArr?.[0]?.count ?? 0;
      }
    }
  }

  // Notification messages
  const notifications: { type: "success" | "error"; message: string }[] = [];
  if (params.created) notifications.push({ type: "success", message: "Đã thêm khách hàng mới thành công!" });
  if (params.updated) notifications.push({ type: "success", message: "Đã cập nhật khách hàng thành công!" });
  if (params.deleted) notifications.push({ type: "success", message: "Đã xoá khách hàng thành công!" });
  if (params.imported) notifications.push({ type: "success", message: `Đã import ${params.imported} khách hàng thành công!` });
  if (params.synced) notifications.push({ type: "success", message: `Đồng bộ thành công! Đã thêm ${params.synced} khách hàng mới.` });
  if (params.error) {
    const errMap: Record<string, string> = {
      name_required: "Tên khách hàng là bắt buộc.",
      create_failed: "Không thể tạo khách hàng. Vui lòng thử lại.",
      empty_import: "Dữ liệu import trống.",
      no_valid_rows: "Không có dòng hợp lệ trong dữ liệu import.",
      import_failed: "Import thất bại. Vui lòng thử lại.",
    };
    notifications.push({ type: "error", message: errMap[params.error] || params.error });
  }

  return (
    <div>
      <TopBar title="Khách hàng" subtitle={`${totalCount ?? 0} liên hệ`} />

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Notifications */}
        {notifications.map((n, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl text-sm"
            style={{
              background: n.type === "success" ? "rgba(212,168,67,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${n.type === "success" ? "rgba(212,168,67,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}
          >
            {n.type === "success" ? (
              <CheckCircle size={16} className="text-[#D4A843] shrink-0" />
            ) : (
              <XCircle size={16} className="text-[#ef4444] shrink-0" />
            )}
            <span className={n.type === "success" ? "text-amber-300" : "text-red-300"}>
              {n.message}
            </span>
          </div>
        ))}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{s.label}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "18" }}
                >
                  <s.icon size={15} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="card-dark p-4">
          <form method="GET" className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Tìm theo tên, email, SĐT..."
                className="input-dark w-full pl-9 pr-4 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="input-dark pl-9 pr-8 py-2 text-sm appearance-none min-w-[140px]"
                >
                  <option value="">Tất cả TT</option>
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select
                  name="journey_stage"
                  defaultValue={journeyStageFilter}
                  className="input-dark pl-9 pr-8 py-2 text-sm appearance-none min-w-[140px]"
                >
                  <option value="">Tất cả GĐ</option>
                  {Object.entries(journeyStageConfig).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-green px-4 py-2 text-sm font-medium rounded-lg">
                Lọc
              </button>
            </div>
          </form>
          {/* Sync Button */}
          <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Đồng bộ khách hàng từ đơn hàng và tài khoản đăng ký vào CRM.
            </p>
            <form action={syncContactsFromOrders}>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#D4A843] transition-colors"
              >
                <RefreshCw size={14} />
                Đồng bộ
              </button>
            </form>
          </div>
        </div>

        {/* Add Contact Form */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={16} className="text-[#D4A843]" />
            <h3 className="font-semibold text-white text-sm">Thêm khách hàng mới</h3>
          </div>
          <form action={createContact}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tên <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="Nguyễn Văn A"
                  className="input-dark w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="email@example.com"
                  className="input-dark w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">SĐT</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="0901234567"
                  className="input-dark w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Công ty</label>
                <input
                  type="text"
                  name="company"
                  placeholder="Tên công ty"
                  className="input-dark w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nguồn</label>
                <select name="source" className="input-dark w-full px-3 py-2 text-sm">
                  <option value="manual">Thủ công</option>
                  <option value="website">Website</option>
                  <option value="referral">Giới thiệu</option>
                  <option value="ads">Quảng cáo</option>
                  <option value="social">Mạng xã hội</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ghi chú</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Ghi chú thêm..."
                  className="input-dark w-full px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" className="btn-green px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2">
                <UserPlus size={14} />
                Thêm KH
              </button>
            </div>
          </form>
        </div>

        {/* Import Section */}
        <details className="card-dark">
          <summary className="p-4 cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
            <FileUp size={16} className="text-[#a855f7]" />
            Import hàng loạt (CSV)
          </summary>
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-500 mb-3">
              Nhập mỗi dòng theo format: <code className="text-gray-400 bg-[#1a1a1a] px-1.5 py-0.5 rounded">Tên, Email, SĐT</code>
            </p>
            <form action={importContacts}>
              <textarea
                name="csv_data"
                rows={5}
                placeholder={"Nguyễn Văn A, a@email.com, 0901234567\nTrần Thị B, b@email.com, 0912345678"}
                className="input-dark w-full px-3 py-2 text-sm font-mono resize-y"
              />
              <div className="mt-3 flex justify-end">
                <button type="submit" className="btn-green px-5 py-2 text-sm font-medium rounded-lg flex items-center gap-2">
                  <FileUp size={14} />
                  Import
                </button>
              </div>
            </form>
          </div>
        </details>

        {/* Error State */}
        {error && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl text-sm"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle size={16} className="text-[#ef4444] shrink-0" />
            <span className="text-red-300">Lỗi khi tải dữ liệu: {error.message}</span>
          </div>
        )}

        {/* Contacts Table */}
        <div className="card-dark overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
            <h3 className="font-semibold text-white text-sm">
              Danh sách khách hàng
            </h3>
            <span className="text-xs text-gray-500">
              {contacts.length} kết quả
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {["Tên", "Email", "SĐT", "Trạng thái", "Giai đoạn", "Điểm", "Phụ trách", "Đơn hàng", "Doanh thu", "Nguồn", "Ngày tạo"].map((col) => (
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
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-500 text-sm">
                      {q || statusFilter
                        ? "Không tìm thấy khách hàng phù hợp."
                        : "Chưa có khách hàng nào. Hãy thêm khách hàng đầu tiên!"}
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact, idx) => {
                    const st = statusConfig[contact.status] || statusConfig.new;
                    const src = sourceConfig[contact.source || "manual"] || sourceConfig.manual;
                    const initial = contact.full_name.charAt(0).toUpperCase();

                    return (
                      <tr
                        key={contact.id}
                        className="transition-colors hover:bg-white/[0.02]"
                        style={{
                          borderBottom: idx < contacts.length - 1 ? "1px solid #2a2a2a" : "none",
                        }}
                      >
                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ background: `linear-gradient(135deg, ${st.color}, ${st.color}99)` }}
                            >
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/crm/contacts/${contact.id}`}
                                className="font-medium text-white truncate block hover:underline"
                              >
                                {contact.full_name}
                              </Link>
                              {contact.company && (
                                <div className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                                  <Building2 size={10} />
                                  {contact.company}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {contact.email ? (
                            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                              <Mail size={12} className="text-gray-500" />
                              <span className="truncate max-w-[160px]">{contact.email}</span>
                            </div>
                          ) : (
                            <span className="text-gray-700 text-xs">—</span>
                          )}
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {contact.phone ? (
                            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                              <Phone size={12} className="text-gray-500" />
                              {contact.phone}
                            </div>
                          ) : (
                            <span className="text-gray-700 text-xs">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                          >
                            {st.label}
                          </span>
                        </td>

                        {/* Journey Stage */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const js = journeyStageConfig[contact.journey_stage] || journeyStageConfig.visitor;
                            return (
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                style={{ background: js.color + "18", color: js.color, border: `1px solid ${js.color}40` }}
                              >
                                {js.label}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Lead Score */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-bold ${
                            contact.lead_score >= 81 ? "text-green-400" :
                            contact.lead_score >= 61 ? "text-amber-400" :
                            contact.lead_score >= 31 ? "text-blue-400" :
                            "text-gray-500"
                          }`}>
                            {contact.lead_score ?? 0}
                          </span>
                        </td>

                        {/* Assigned To */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {contact.assigned_profile?.full_name ? (
                            <span className="text-xs text-gray-300">{contact.assigned_profile.full_name}</span>
                          ) : (
                            <span className="text-xs text-gray-500">Chưa phân</span>
                          )}
                        </td>

                        {/* Orders */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {contact.email && orderSummaryMap[contact.email] ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-xs">
                                <ShoppingCart size={12} className="text-gray-500" />
                                <span>
                                  {orderSummaryMap[contact.email].paidCount > 0 && (
                                    <span className="text-amber-400 font-medium">
                                      {orderSummaryMap[contact.email].paidCount} đã TT
                                    </span>
                                  )}
                                  {orderSummaryMap[contact.email].paidCount > 0 &&
                                    orderSummaryMap[contact.email].pendingCount > 0 && (
                                    <span className="text-gray-500"> / </span>
                                  )}
                                  {orderSummaryMap[contact.email].pendingCount > 0 && (
                                    <span className="text-yellow-400 font-medium">
                                      {orderSummaryMap[contact.email].pendingCount} chờ
                                    </span>
                                  )}
                                </span>
                              </div>
                              {contact.email && enrollmentCountMap[contact.email] > 0 && (
                                <div className="text-[11px] text-blue-400">
                                  {enrollmentCountMap[contact.email]} khoá học
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700 text-xs">
                              {contact.email && enrollmentCountMap[contact.email] > 0 ? (
                                <span className="text-blue-400 text-[11px]">
                                  {enrollmentCountMap[contact.email]} khoá học
                                </span>
                              ) : "—"}
                            </span>
                          )}
                        </td>

                        {/* Revenue */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {contact.email && orderSummaryMap[contact.email]?.totalPaid > 0 ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <DollarSign size={12} className="text-amber-500" />
                              <span className="text-amber-400 font-semibold">
                                {formatVND(orderSummaryMap[contact.email].totalPaid)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-700 text-xs">—</span>
                          )}
                        </td>

                        {/* Source */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: src.bg, color: src.color }}
                          >
                            {src.label}
                          </span>
                        </td>

                        {/* Created at */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <Clock size={12} className="text-gray-500" />
                            {formatShortDate(contact.created_at)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {contacts.length > 0 && (
            <div className="px-4 py-3 border-t border-[#2a2a2a] flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Hiển thị <span className="text-white font-semibold">{contacts.length}</span> khách hàng
                {(q || statusFilter || journeyStageFilter) && " (đã lọc)"}
              </p>
              {(q || statusFilter || journeyStageFilter) && (
                <Link
                  href="/crm/contacts"
                  className="text-xs text-[#D4A843] hover:underline"
                >
                  Xoá bộ lọc
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

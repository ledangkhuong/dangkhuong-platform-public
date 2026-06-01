import TopBar from "@/components/layout/TopBar";
import { createAdminClient } from "@/lib/supabase/server";
import { sanitizeSearchInput } from "@/lib/utils";
import { createContact, importContacts, syncContactsFromOrders } from "@/lib/actions/crm";
import { getSalesUsers } from "@/lib/sales";
import { getViewerScope } from "@/lib/viewer-scope";
import { redirect } from "next/navigation";
import Link from "next/link";
import ContactsTable, { type Contact } from "./ContactsTable";
import SubmitAddContactButton from "./SubmitAddContactButton";
import {
  Users,
  UserPlus,
  Phone,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileUp,
  RefreshCw,
  Target,
  ShoppingCart,
  Crown,
  ThumbsUp,
  Star,
} from "lucide-react";

/* ---------- Filter option labels (used in search/filter dropdowns) ---------- */

const statusOptions: Record<string, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  qualified: "Tiềm năng",
  negotiation: "Đàm phán",
  won: "Thành công",
  lost: "Mất",
  churned: "Rời bỏ",
};

const journeyStageOptions: Record<string, string> = {
  visitor: "KH Mục tiêu",
  lead: "KH Tiềm năng",
  contacted: "Người mua hàng",
  qualified: "Khách hàng",
  negotiation: "Hội viên",
  customer: "Người ủng hộ",
  advocate: "Fan hâm mộ",
};

interface OrderSummary {
  paidCount: number;
  pendingCount: number;
  totalPaid: number;
}

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

  // Role-aware viewer scope: admin/manager see everything, sale sees only their own
  const scope = await getViewerScope();
  if (!scope.canView) redirect("/dashboard");

  const admin = await createAdminClient();

  // Build query
  let query = admin
    .from("crm_contacts")
    .select("*, assigned_profile:assigned_to(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  // Sale can see all contacts (removed ownership filter)
  if (q) {
    const safeQ = sanitizeSearchInput(q);
    if (safeQ) {
      query = query.or(`full_name.ilike.%${safeQ}%,email.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`);
    }
  }
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (journeyStageFilter) {
    query = query.eq("journey_stage", journeyStageFilter);
  }

  const { data, error } = await query;
  const contacts: Contact[] = (data ?? []) as unknown as Contact[];

  // Stats counts — scope to viewer when sale.
  // Uses `journey_stage` (the 7-stage loyalty pyramid) instead of legacy
  // `status` so the cards reflect actual customer-loyalty progression.
  // Stage values & labels:
  //   visitor      → KH Mục tiêu       (fits profile, doesn't know us yet)
  //   lead         → KH Tiềm năng      (expressed interest)
  //   contacted    → Người mua hàng    (bought once)
  //   qualified    → Khách hàng         (repeat buyer 2+)
  //   negotiation  → Hội viên           (recognized member)
  //   customer     → Người ủng hộ       (refers when asked)
  //   advocate     → Fan hâm mộ         (evangelist)
  const journeyStages = [
    { key: "visitor",     label: "KH Mục tiêu",   icon: Target,       color: "#60a5fa" },
    { key: "lead",        label: "KH Tiềm năng",  icon: UserPlus,     color: "#a855f7" },
    { key: "contacted",   label: "Người mua hàng",icon: ShoppingCart, color: "#f59e0b" },
    { key: "qualified",   label: "Khách hàng",    icon: CheckCircle,  color: "#10b981" },
    { key: "negotiation", label: "Hội viên",      icon: Crown,        color: "#D4A843" },
    { key: "customer",    label: "Người ủng hộ",  icon: ThumbsUp,     color: "#f97316" },
    { key: "advocate",    label: "Fan hâm mộ",    icon: Star,         color: "#ef4444" },
  ] as const;

  let totalQuery = admin
    .from("crm_contacts")
    .select("*", { count: "exact", head: true });
  // Build per-stage count queries (sale sees all contacts)
  const stageCountPromises = journeyStages.map((s) => {
    const q = admin
      .from("crm_contacts")
      .select("*", { count: "exact", head: true })
      .eq("journey_stage", s.key);
    return q.then(({ count }) => count ?? 0);
  });

  const { count: totalCount } = await totalQuery;
  const stageCounts = await Promise.all(stageCountPromises);

  const stats = [
    { stageKey: "", label: "Tổng KH", value: totalCount ?? 0, icon: Users, color: "#3b82f6" },
    ...journeyStages.map((s, i) => ({
      stageKey: s.key,
      label: s.label,
      value: stageCounts[i] ?? 0,
      icon: s.icon,
      color: s.color,
    })),
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

  // Fetch custom sources from crm_sources table
  const { data: crmSources } = await admin
    .from("crm_sources")
    .select("label")
    .order("label");
  const sourceLabels = (crmSources ?? []).map((s: { label: string }) => s.label);

  // Fetch products for course interest checkboxes
  const { data: productsData } = await admin
    .from("products")
    .select("id, title")
    .order("title");
  const products = (productsData ?? []) as { id: string; title: string }[];

  // Sales users for assignment dropdown (admin/manager/sale only — must match backend)
  const salesUsers = await getSalesUsers(admin);

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

        {/* Stats Row — clickable to filter by journey stage */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {stats.map((s) => {
            const isActive = s.stageKey === "" ? !journeyStageFilter : journeyStageFilter === s.stageKey;
            const href = s.stageKey
              ? `/crm/contacts?${new URLSearchParams({ ...(q ? { q } : {}), ...(statusFilter ? { status: statusFilter } : {}), journey_stage: s.stageKey }).toString()}`
              : `/crm/contacts?${new URLSearchParams({ ...(q ? { q } : {}), ...(statusFilter ? { status: statusFilter } : {}) }).toString()}`;
            return (
              <Link
                key={s.label}
                href={href}
                className="stat-card transition-all duration-200 hover:scale-[1.03] cursor-pointer"
                style={{
                  borderColor: isActive ? s.color : undefined,
                  boxShadow: isActive ? `0 0 12px ${s.color}33` : undefined,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: s.color + (isActive ? "40" : "1F") }}
                  >
                    <s.icon size={17} style={{ color: s.color }} />
                  </div>
                  {isActive && s.stageKey && (
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  )}
                </div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: isActive ? s.color : "#6b7280" }}>{s.label}</div>
              </Link>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="card-dark p-4">
          <form method="GET" className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Tìm theo tên, email, SĐT..."
                className="input-dark w-full py-2 text-sm"
                style={{ paddingLeft: "2.5rem", paddingRight: "1rem" }}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="input-dark py-2 text-sm appearance-none min-w-[140px]"
                  style={{ paddingLeft: "2.25rem", paddingRight: "2rem" }}
                >
                  <option value="">Tất cả TT</option>
                  {Object.entries(statusOptions).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <select
                  name="journey_stage"
                  defaultValue={journeyStageFilter}
                  className="input-dark py-2 text-sm appearance-none min-w-[140px]"
                  style={{ paddingLeft: "2.25rem", paddingRight: "2rem" }}
                >
                  <option value="">Tất cả GĐ</option>
                  {Object.entries(journeyStageOptions).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
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
                <label className="text-xs text-gray-400 mb-1 block">Gán cho sale</label>
                <select name="assigned_to" className="input-dark w-full px-3 py-2 text-sm">
                  <option value="">— Chưa gán —</option>
                  {salesUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name ?? u.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nguồn</label>
                <input
                  type="text"
                  name="source"
                  list="source-options"
                  placeholder="Chọn hoặc nhập nguồn mới..."
                  className="input-dark w-full px-3 py-2 text-sm"
                />
                <datalist id="source-options">
                  {sourceLabels.map((label) => (
                    <option key={label} value={label} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Facebook</label>
                <input
                  type="url"
                  name="facebook_url"
                  placeholder="https://facebook.com/..."
                  className="input-dark w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Khoá học quan tâm</label>
                <select
                  name="course_ids"
                  className="input-dark w-full px-3 py-2 text-sm"
                >
                  <option value="">— Chọn khoá học —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
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
              <SubmitAddContactButton />
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
        <ContactsTable
          contacts={contacts}
          orderMap={orderSummaryMap}
          enrollmentMap={enrollmentCountMap}
          salesUsers={salesUsers}
          canMutate={scope.canMutate}
          totalContacts={totalCount ?? 0}
          query={q}
          statusFilter={statusFilter}
          journeyFilter={journeyStageFilter}
          viewerId={scope.userId}
          existingSources={sourceLabels}
        />
      </div>
    </div>
  );
}

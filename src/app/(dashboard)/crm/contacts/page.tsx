import TopBar from "@/components/layout/TopBar";
import { createAdminClient } from "@/lib/supabase/server";
import { createContact, importContacts, syncContactsFromOrders } from "@/lib/actions/crm";
import { getSalesUsers } from "@/lib/sales";
import { getViewerScope } from "@/lib/viewer-scope";
import { redirect } from "next/navigation";
import ContactsTable, { type Contact } from "./ContactsTable";
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
  visitor: "Khách ghé",
  lead: "Lead",
  contacted: "Đã liên hệ",
  qualified: "Tiềm năng",
  negotiation: "Đàm phán",
  customer: "Khách hàng",
  advocate: "Đại sứ",
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

  if (scope.isSale) {
    query = query.eq("assigned_to", scope.userId);
  }
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

  // Stats counts — scope to viewer when sale
  let totalQuery = admin
    .from("crm_contacts")
    .select("*", { count: "exact", head: true });
  let newQuery = admin
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");
  let contactedQuery = admin
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("status", "contacted");
  let qualifiedQuery = admin
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("status", "qualified");
  let wonQuery = admin
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("status", "won");

  if (scope.isSale) {
    totalQuery = totalQuery.eq("assigned_to", scope.userId);
    newQuery = newQuery.eq("assigned_to", scope.userId);
    contactedQuery = contactedQuery.eq("assigned_to", scope.userId);
    qualifiedQuery = qualifiedQuery.eq("assigned_to", scope.userId);
    wonQuery = wonQuery.eq("assigned_to", scope.userId);
  }

  const { count: totalCount } = await totalQuery;
  const { count: newCount } = await newQuery;
  const { count: contactedCount } = await contactedQuery;
  const { count: qualifiedCount } = await qualifiedQuery;
  const { count: wonCount } = await wonQuery;

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

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: s.color + "1F" }}
                >
                  <s.icon size={17} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
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
        />
      </div>
    </div>
  );
}

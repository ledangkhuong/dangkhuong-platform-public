import { createClient, createAdminClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  UserCheck,
  Users,
  Shuffle,
  Settings,
  Plus,
  Clock,
  CheckCircle,
} from "lucide-react";

import CopyablePhone from "@/components/crm/CopyablePhone";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SaleRep {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  conditions: Record<string, string>;
  assign_to: string | null;
  method: string;
  is_active: boolean;
  assigned_profile: { full_name: string } | null;
}

interface AssignmentLog {
  id: string;
  contact_id: string;
  assigned_to: string;
  method: string;
  created_at: string;
  contact: { full_name: string } | null;
  assigned_profile: { full_name: string } | null;
}

interface UnassignedContact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  created_at: string;
}

interface RepWorkload {
  id: string;
  full_name: string;
  avatar_url: string | null;
  active_contacts: number;
  pending_actions: number;
  won_deals: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

const methodConfig: Record<string, { label: string; color: string; bg: string }> = {
  manual:      { label: "Thủ công",     color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  round_robin: { label: "Round Robin",  color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  rule_based:  { label: "Rule-Based",   color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
};

// ─── Auth Guard ──────────────────────────────────────────────────────────────

async function requireAdminOrManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return { user, role: profile.role };
}

// ─── Server Actions ──────────────────────────────────────────────────────────

async function autoAssignLeads(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const admin = await createAdminClient();
  const method = (formData.get("method") as string) || "round_robin";

  // Fetch unassigned contacts
  const { data: unassigned } = await admin
    .from("crm_contacts")
    .select("id")
    .is("assigned_to", null)
    .order("created_at", { ascending: true });

  if (!unassigned || unassigned.length === 0) {
    redirect("/crm/assignments?info=no_unassigned");
  }

  // Fetch all sale reps
  const { data: reps } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "sale");

  if (!reps || reps.length === 0) {
    redirect("/crm/assignments?error=no_reps");
  }

  // Get last assignment to determine round-robin start
  const { data: lastLog } = await admin
    .from("crm_lead_assignment_log")
    .select("assigned_to")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let startIdx = 0;
  if (lastLog) {
    const lastRepIdx = reps.findIndex((r) => r.id === lastLog.assigned_to);
    if (lastRepIdx >= 0) {
      startIdx = (lastRepIdx + 1) % reps.length;
    }
  }

  // Assign contacts round-robin
  const now = new Date().toISOString();
  for (let i = 0; i < unassigned.length; i++) {
    const repIdx = (startIdx + i) % reps.length;
    const repId = reps[repIdx].id;
    const contactId = unassigned[i].id;

    await admin
      .from("crm_contacts")
      .update({ assigned_to: repId, assigned_at: now })
      .eq("id", contactId);

    await admin.from("crm_lead_assignment_log").insert({
      contact_id: contactId,
      assigned_to: repId,
      assigned_by: user.id,
      method: method === "rule_based" ? "rule_based" : "round_robin",
    });
  }

  revalidatePath("/crm/assignments");
  redirect("/crm/assignments?success=assigned");
}

async function manualAssignLeads(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const admin = await createAdminClient();
  const assignTo = formData.get("assign_to") as string;
  if (!assignTo) redirect("/crm/assignments?error=no_rep_selected");

  // Get selected contact IDs
  const contactIds: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("contact_") && value === "on") {
      contactIds.push(key.replace("contact_", ""));
    }
  }

  if (contactIds.length === 0) {
    redirect("/crm/assignments?error=no_contacts_selected");
  }

  const now = new Date().toISOString();
  for (const contactId of contactIds) {
    await admin
      .from("crm_contacts")
      .update({ assigned_to: assignTo, assigned_at: now })
      .eq("id", contactId);

    await admin.from("crm_lead_assignment_log").insert({
      contact_id: contactId,
      assigned_to: assignTo,
      assigned_by: user.id,
      method: "manual",
    });
  }

  revalidatePath("/crm/assignments");
  redirect("/crm/assignments?success=manual_assigned");
}

async function createAssignmentRule(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const admin = await createAdminClient();

  const name = (formData.get("rule_name") as string || "").trim();
  if (!name) redirect("/crm/assignments?error=rule_name_required");

  const priority = parseInt(formData.get("priority") as string || "0", 10);
  const assignTo = (formData.get("assign_to") as string || "").trim() || null;
  const method = (formData.get("method") as string || "specific").trim();

  // Build conditions JSON
  const conditions: Record<string, string> = {};
  const source = (formData.get("condition_source") as string || "").trim();
  const utmSource = (formData.get("condition_utm_source") as string || "").trim();
  const utmCampaign = (formData.get("condition_utm_campaign") as string || "").trim();

  if (source) conditions.source = source;
  if (utmSource) conditions.utm_source = utmSource;
  if (utmCampaign) conditions.utm_campaign = utmCampaign;

  await admin.from("crm_lead_assignment_rules").insert({
    name,
    priority,
    conditions,
    assign_to: assignTo,
    method,
    is_active: true,
    created_by: user.id,
  });

  revalidatePath("/crm/assignments");
  redirect("/crm/assignments?success=rule_created");
}

async function toggleRuleActive(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const admin = await createAdminClient();
  const ruleId = formData.get("rule_id") as string;
  const currentActive = formData.get("current_active") === "true";

  await admin
    .from("crm_lead_assignment_rules")
    .update({ is_active: !currentActive })
    .eq("id", ruleId);

  revalidatePath("/crm/assignments");
  redirect("/crm/assignments?success=rule_toggled");
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default async function AssignmentsPage() {
  await requireAdminOrManager();
  const admin = await createAdminClient();

  // ── Fetch all data in parallel ──
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const monthISO = firstOfMonth.toISOString();

  const [
    unassignedRes,
    saleRepsRes,
    todayAssignmentsRes,
    rulesRes,
    logsRes,
    unassignedContactsRes,
  ] = await Promise.all([
    // Unassigned count
    admin
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .is("assigned_to", null),
    // Sale reps
    admin
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("role", "sale"),
    // Assignments today
    admin
      .from("crm_lead_assignment_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayISO),
    // Assignment rules
    admin
      .from("crm_lead_assignment_rules")
      .select("id, name, priority, conditions, assign_to, method, is_active, assigned_profile:profiles!crm_lead_assignment_rules_assign_to_fkey(full_name)")
      .order("priority", { ascending: true }),
    // Recent assignment log
    admin
      .from("crm_lead_assignment_log")
      .select("id, contact_id, assigned_to, method, created_at, contact:crm_contacts!crm_lead_assignment_log_contact_id_fkey(full_name), assigned_profile:profiles!crm_lead_assignment_log_assigned_to_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(50),
    // Unassigned contacts for manual assign (up to 20)
    admin
      .from("crm_contacts")
      .select("id, full_name, email, phone, source, created_at")
      .is("assigned_to", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const unassignedCount = unassignedRes.count ?? 0;
  const saleReps = (saleRepsRes.data ?? []) as SaleRep[];
  const todayAssignments = todayAssignmentsRes.count ?? 0;
  const rules = (rulesRes.data ?? []) as unknown as AssignmentRule[];
  const logs = (logsRes.data ?? []) as unknown as AssignmentLog[];
  const unassignedContacts = (unassignedContactsRes.data ?? []) as UnassignedContact[];

  // ── Workload per rep ──
  const workload: RepWorkload[] = [];
  for (const rep of saleReps) {
    const [activeRes, pendingRes, wonRes] = await Promise.all([
      admin
        .from("crm_contacts")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", rep.id),
      admin
        .from("crm_next_actions")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", rep.id)
        .eq("status", "pending"),
      admin
        .from("crm_deals")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", rep.id)
        .eq("stage", "won")
        .gte("closed_at", monthISO),
    ]);

    workload.push({
      id: rep.id,
      full_name: rep.full_name,
      avatar_url: rep.avatar_url,
      active_contacts: activeRes.count ?? 0,
      pending_actions: pendingRes.count ?? 0,
      won_deals: wonRes.count ?? 0,
    });
  }

  // ── Stats ──
  const stats = [
    {
      label: "Leads chưa phân công",
      value: unassignedCount,
      icon: UserCheck,
      color: "#f59e0b",
    },
    {
      label: "Nhân viên sale",
      value: saleReps.length,
      icon: Users,
      color: "#3b82f6",
    },
    {
      label: "Phân công hôm nay",
      value: todayAssignments,
      icon: Clock,
      color: "#22c55e",
    },
  ];

  return (
    <div>
      <TopBar title="Phân công Lead" subtitle="Quản lý phân công & quy tắc tự động" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="card-dark p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{s.label}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "20" }}
                >
                  <s.icon size={15} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Quick Auto-Assign Section ── */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shuffle size={16} className="text-[#D4A843]" />
            <h3 className="font-semibold text-white">Phân công tự động</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Có <span className="text-white font-semibold">{unassignedCount}</span> lead chưa được phân công.
          </p>
          {unassignedCount > 0 ? (
            <form action={autoAssignLeads} className="flex items-end gap-3">
              <div className="flex-1 max-w-xs">
                <label className="text-xs text-gray-500 mb-1 block">Phương pháp</label>
                <select
                  name="method"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843]"
                >
                  <option value="round_robin">Round Robin (chia đều)</option>
                  <option value="rule_based">Rule-Based (theo quy tắc)</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-medium text-black transition-colors"
                style={{ background: "#D4A843" }}
              >
                Phân công ngay
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-500">Tất cả lead đã được phân công.</p>
          )}
        </div>

        {/* ── Assignment Rules Section ── */}
        <div className="card-dark">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white">Quy tắc phân công</h3>
            </div>
            <span className="text-xs text-gray-500">{rules.length} quy tắc</span>
          </div>

          {/* Existing rules */}
          {rules.length > 0 ? (
            <div className="divide-y divide-[#2a2a2a]">
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{rule.name}</span>
                      <span className="text-xs text-gray-500">P{rule.priority}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: rule.is_active ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.1)",
                          color: rule.is_active ? "#22c55e" : "#6b7280",
                        }}
                      >
                        {rule.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {Object.entries(rule.conditions || {}).map(([key, val]) => (
                        <span
                          key={key}
                          className="text-xs px-2 py-0.5 rounded bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a]"
                        >
                          {key}: {val}
                        </span>
                      ))}
                      {rule.assigned_profile && (
                        <span className="text-xs text-[#D4A843]">
                          → {rule.assigned_profile.full_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">({rule.method})</span>
                    </div>
                  </div>
                  <form action={toggleRuleActive}>
                    <input type="hidden" name="rule_id" value={rule.id} />
                    <input type="hidden" name="current_active" value={String(rule.is_active)} />
                    <button
                      type="submit"
                      className="text-xs px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#D4A843] transition-colors"
                    >
                      {rule.is_active ? "Tắt" : "Bật"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">
              Chưa có quy tắc nào
            </div>
          )}

          {/* Add new rule form */}
          <div className="p-5 border-t border-[#2a2a2a]">
            <div className="flex items-center gap-2 mb-3">
              <Plus size={14} className="text-[#D4A843]" />
              <span className="text-sm font-medium text-white">Thêm quy tắc mới</span>
            </div>
            <form action={createAssignmentRule} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tên quy tắc</label>
                <input
                  type="text"
                  name="rule_name"
                  placeholder="VD: Lead từ Facebook Ads"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4A843]"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ưu tiên (số nhỏ = cao)</label>
                <input
                  type="number"
                  name="priority"
                  defaultValue={10}
                  min={1}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nguồn (source)</label>
                <select
                  name="condition_source"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843]"
                >
                  <option value="">-- Không lọc --</option>
                  <option value="website">Website</option>
                  <option value="ads">Quảng cáo</option>
                  <option value="social">MXH</option>
                  <option value="referral">Giới thiệu</option>
                  <option value="manual">Thủ công</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">UTM Source</label>
                <input
                  type="text"
                  name="condition_utm_source"
                  placeholder="VD: facebook"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4A843]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">UTM Campaign</label>
                <input
                  type="text"
                  name="condition_utm_campaign"
                  placeholder="VD: summer_sale"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4A843]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phân cho</label>
                <select
                  name="assign_to"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843]"
                >
                  <option value="">-- Round Robin Pool --</option>
                  {saleReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phương pháp</label>
                <select
                  name="method"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843]"
                >
                  <option value="specific">Chỉ định cụ thể</option>
                  <option value="round_robin_pool">Round Robin Pool</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-black transition-colors"
                  style={{ background: "#D4A843" }}
                >
                  Tạo quy tắc
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Sales Rep Workload Overview ── */}
        <div className="card-dark">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white">Khối lượng công việc</h3>
            </div>
          </div>
          {workload.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Nhân viên</th>
                    <th className="text-center p-4 text-xs text-gray-500 font-medium">Contacts</th>
                    <th className="text-center p-4 text-xs text-gray-500 font-medium">Pending Actions</th>
                    <th className="text-center p-4 text-xs text-gray-500 font-medium">Won (tháng)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {workload.map((rep) => (
                    <tr key={rep.id} className="hover:bg-[#111]">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: "linear-gradient(135deg,#D4A843,#b8922f)" }}
                          >
                            {rep.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <span className="text-white font-medium">{rep.full_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center text-white">{rep.active_contacts}</td>
                      <td className="p-4 text-center">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: rep.pending_actions > 5 ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                            color: rep.pending_actions > 5 ? "#ef4444" : "#22c55e",
                          }}
                        >
                          {rep.pending_actions}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-[#D4A843] font-semibold">{rep.won_deals}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 text-sm">
              Chưa có nhân viên sale nào
            </div>
          )}
        </div>

        {/* ── Manual Assign Section ── */}
        <div className="card-dark">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white">Phân công thủ công</h3>
            </div>
            <span className="text-xs text-gray-500">{unassignedContacts.length} lead chưa phân công</span>
          </div>
          {unassignedContacts.length > 0 ? (
            <form action={manualAssignLeads}>
              <div className="divide-y divide-[#2a2a2a]">
                {unassignedContacts.map((contact) => (
                  <label
                    key={contact.id}
                    className="flex items-center gap-4 p-4 hover:bg-[#111] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name={`contact_${contact.id}`}
                      className="w-4 h-4 rounded border-[#2a2a2a] bg-[#1a1a1a] accent-[#D4A843]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{contact.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {contact.email || "Không có email"} {contact.source && `• ${contact.source}`}
                      </p>
                      {contact.phone && (
                        <div className="mt-1">
                          <CopyablePhone phone={contact.phone} compact />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(contact.created_at)}
                    </span>
                  </label>
                ))}
              </div>
              <div className="p-4 border-t border-[#2a2a2a] flex items-center gap-3">
                <select
                  name="assign_to"
                  required
                  className="flex-1 max-w-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843]"
                >
                  <option value="">Chọn nhân viên...</option>
                  {saleReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.full_name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-black transition-colors"
                  style={{ background: "#D4A843" }}
                >
                  Phân công
                </button>
              </div>
            </form>
          ) : (
            <div className="p-8 text-center text-gray-500 text-sm">
              Không có lead nào chưa được phân công
            </div>
          )}
        </div>

        {/* ── Recent Assignment History ── */}
        <div className="card-dark">
          <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#D4A843]" />
              <h3 className="font-semibold text-white">Lịch sử phân công</h3>
            </div>
            <span className="text-xs text-gray-500">{logs.length} bản ghi gần nhất</span>
          </div>
          {logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Contact</th>
                    <th className="text-left p-4 text-xs text-gray-500 font-medium">Assigned To</th>
                    <th className="text-center p-4 text-xs text-gray-500 font-medium">Phương pháp</th>
                    <th className="text-right p-4 text-xs text-gray-500 font-medium">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {logs.map((log) => {
                    const mc = methodConfig[log.method] ?? methodConfig.manual;
                    return (
                      <tr key={log.id} className="hover:bg-[#111]">
                        <td className="p-4 text-white">
                          {log.contact?.full_name || "—"}
                        </td>
                        <td className="p-4 text-gray-300">
                          {log.assigned_profile?.full_name || "—"}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: mc.bg, color: mc.color }}
                          >
                            {mc.label}
                          </span>
                        </td>
                        <td className="p-4 text-right text-gray-500 text-xs">
                          {formatDate(log.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 text-sm">
              Chưa có lịch sử phân công
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

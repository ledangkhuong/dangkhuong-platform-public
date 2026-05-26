import TopBar from "@/components/layout/TopBar";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { addActivity } from "@/lib/actions/crm";
import { getViewerScope } from "@/lib/viewer-scope";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Calendar,
  FileText,
  Clock,
  DollarSign,
  BookOpen,
  Tag,
  Building2,
  Star,
  Target,
  TrendingUp,
  Globe,
  Link2,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Lightbulb,
  ListTodo,
  Briefcase,
  Eye,
  MousePointerClick,
  Timer,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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
  tags: string[] | null;
  journey_stage: string | null;
  lead_score: number | null;
  lifetime_value: number | null;
  assigned_to: string | null;
  user_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  first_page: string | null;
  referrer: string | null;
  facebook_url: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string | null;
  assigned_profile: { full_name: string | null } | null;
}

interface Activity {
  id: string;
  type: string;
  content: string;
  is_system: boolean;
  created_at: string;
  created_by: string | null;
  creator_profile: { full_name: string | null } | null;
}

interface Order {
  id: string;
  order_code: string | null;
  amount: number;
  status: string;
  created_at: string;
  customer_phone: string | null;
  products: { title: string } | null;
}

interface Enrollment {
  id: string;
  created_at: string;
  products: { title: string } | null;
}

interface CourseRecommendation {
  id: string;
  reason: string | null;
  score: number | null;
  products: { title: string } | null;
}

interface CourseInterest {
  id: string;
  view_count: number;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  status: string | null;
  notes: string | null;
  contacted: boolean | null;
  products: { title: string; slug: string | null; price: number | null; sale_price: number | null } | null;
}

interface NextAction {
  id: string;
  title: string;
  priority: string | null;
  due_date: string | null;
  status: string;
}

interface Deal {
  id: string;
  title: string;
  stage: string;
  amount: number;
}

interface PageViewEvent {
  id: string;
  event: string;
  page: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

/* ---------- Constants ---------- */

const JOURNEY_STAGES = [
  { key: "visitor", label: "KH Mục tiêu" },
  { key: "lead", label: "KH Tiềm năng" },
  { key: "contacted", label: "Người mua hàng" },
  { key: "qualified", label: "Khách hàng" },
  { key: "negotiation", label: "Hội viên" },
  { key: "customer", label: "Người ủng hộ" },
  { key: "advocate", label: "Fan hâm mộ" },
];

const activityTypeConfig: Record<string, { label: string; color: string }> = {
  call: { label: "Cuộc gọi", color: "#3b82f6" },
  email: { label: "Email", color: "#8b5cf6" },
  note: { label: "Ghi chú", color: "#6b7280" },
  meeting: { label: "Cuộc họp", color: "#f59e0b" },
  task: { label: "Task", color: "#ec4899" },
  system: { label: "Hệ thống", color: "#4b5563" },
};

const sourceConfig: Record<string, { label: string; color: string; bg: string }> = {
  manual: { label: "Thủ công", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  import: { label: "Import", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  website: { label: "Website", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  referral: { label: "Giới thiệu", color: "#D4A843", bg: "rgba(212,168,67,0.1)" },
  ads: { label: "Quảng cáo", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  social: { label: "MXH", color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
};

const defaultSourceStyle = { label: "", color: "#9ca3af", bg: "rgba(156,163,175,0.1)" };

const dealStageConfig: Record<string, { label: string; color: string }> = {
  lead: { label: "Lead", color: "#3b82f6" },
  contacted: { label: "Đã liên hệ", color: "#f59e0b" },
  demo: { label: "Demo", color: "#a855f7" },
  proposal: { label: "Báo giá", color: "#ec4899" },
  negotiation: { label: "Đàm phán", color: "#f97316" },
  won: { label: "Thành công", color: "#D4A843" },
  lost: { label: "Thất bại", color: "#ef4444" },
};

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Thấp", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  medium: { label: "TB", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  high: { label: "Cao", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  urgent: { label: "Gấp", color: "#dc2626", bg: "rgba(220,38,38,0.2)" },
};

/* ---------- Helpers ---------- */

function formatVND(amount: number): string {
  if (!amount) return "0đ";
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return formatDate(dateStr);
}

function getActivityIcon(type: string) {
  switch (type) {
    case "call":
      return Phone;
    case "email":
      return Mail;
    case "meeting":
      return Calendar;
    case "task":
      return ListTodo;
    default:
      return FileText;
  }
}

/* ---------- Page ---------- */

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Role-aware viewer scope: admin/manager see everything, sale sees only their own
  const scope = await getViewerScope();
  if (!scope.canView) redirect("/dashboard");

  const adminClient = await createAdminClient();

  // ─── Parallel Data Fetching ────────────────────────────────────────────────
  const [
    contactRes,
    activitiesRes,
    ordersRes,
    recommendationsRes,
    nextActionsRes,
    dealsRes,
  ] = await Promise.all([
    // Contact details
    adminClient
      .from("crm_contacts")
      .select("*, assigned_profile:assigned_to(full_name)")
      .eq("id", id)
      .single(),
    // Activities
    adminClient
      .from("crm_activities")
      .select("*, creator_profile:created_by(full_name)")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    // Orders — placeholder, we query after contact email is known
    Promise.resolve({ data: null, error: null }),
    // Course recommendations
    adminClient
      .from("crm_course_recommendations")
      .select("*, products:product_id(title)")
      .eq("contact_id", id),
    // Next actions
    adminClient
      .from("crm_next_actions")
      .select("*")
      .eq("contact_id", id)
      .eq("status", "pending")
      .order("due_date", { ascending: true }),
    // Deals
    adminClient
      .from("crm_deals")
      .select("id, title, stage, amount")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!contactRes.data) notFound();
  const contact = contactRes.data as unknown as Contact;

  // Sale viewers can only see contacts assigned to themselves
  if (scope.isSale && contact.assigned_to !== scope.userId) {
    notFound();
  }
  const activities = (activitiesRes.data ?? []) as unknown as Activity[];
  const recommendations = (recommendationsRes.data ?? []) as unknown as CourseRecommendation[];
  const nextActions = (nextActionsRes.data ?? []) as unknown as NextAction[];
  const deals = (dealsRes.data ?? []) as unknown as Deal[];

  // ─── Fetch course interests (courses the user viewed but hasn't purchased) ──
  let courseInterests: CourseInterest[] = [];
  // Try direct user_id first, then fallback via email → profiles lookup
  let interestUserId = contact.user_id;
  if (!interestUserId && contact.email) {
    const { data: profileData } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", contact.email)
      .maybeSingle();
    if (profileData) interestUserId = profileData.id;
  }
  if (interestUserId) {
    const { data: interestsData } = await adminClient
      .from("course_interests")
      .select("id, view_count, first_viewed_at, last_viewed_at, status, notes, contacted, products:product_id(title, slug, price, sale_price)")
      .eq("user_id", interestUserId)
      .order("last_viewed_at", { ascending: false });
    courseInterests = (interestsData ?? []) as unknown as CourseInterest[];
  }

  // ─── Fetch orders & enrollments ─────────────────────────────────────────────
  let orders: Order[] = [];
  let enrollments: Enrollment[] = [];

  // Fetch orders by email (include customer_phone for fallback)
  if (contact.email) {
    const { data: ordersData } = await adminClient
      .from("orders")
      .select("id, order_code, amount, status, created_at, customer_phone, products:product_id(title)")
      .eq("customer_email", contact.email)
      .order("created_at", { ascending: false });
    orders = (ordersData ?? []) as unknown as Order[];
  }

  // Fetch enrollments — prefer contact.user_id (direct), fallback to email→profile lookup
  const enrollUserId = contact.user_id;
  if (enrollUserId) {
    const { data: enrollData } = await adminClient
      .from("enrollments")
      .select("id, created_at, products:product_id(title)")
      .eq("user_id", enrollUserId)
      .order("created_at", { ascending: false });
    enrollments = (enrollData ?? []) as unknown as Enrollment[];
  } else if (contact.email) {
    // Fallback: look up profile by email, then fetch enrollments
    const { data: profileData } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", contact.email)
      .single();
    if (profileData) {
      const { data: enrollData } = await adminClient
        .from("enrollments")
        .select("id, created_at, products:product_id(title)")
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false });
      enrollments = (enrollData ?? []) as unknown as Enrollment[];
    }
  }

  // ─── Fetch page view events (web journey) ──────────────────────────────────
  let pageViewEvents: PageViewEvent[] = [];
  const trackingUserId = contact.user_id;
  if (trackingUserId) {
    const { data: eventsData } = await adminClient
      .from("analytics_events")
      .select("id, event, page, meta, created_at")
      .eq("user_id", trackingUserId)
      .in("event", ["page_view", "scroll_depth", "time_on_page"])
      .order("created_at", { ascending: false })
      .limit(100);
    pageViewEvents = (eventsData ?? []) as unknown as PageViewEvent[];
  }

  // Group page views into sessions (pages visited in sequence)
  const pageViews = pageViewEvents.filter((e) => e.event === "page_view");
  const scrollEvents = pageViewEvents.filter((e) => e.event === "scroll_depth");
  const timeEvents = pageViewEvents.filter((e) => e.event === "time_on_page");

  // Build enriched page view list
  const enrichedPageViews = pageViews.map((pv) => {
    const scroll = scrollEvents.find(
      (s) => s.page === pv.page && Math.abs(new Date(s.created_at).getTime() - new Date(pv.created_at).getTime()) < 600000
    );
    const time = timeEvents.find(
      (t) => t.page === pv.page && Math.abs(new Date(t.created_at).getTime() - new Date(pv.created_at).getTime()) < 600000
    );
    return {
      ...pv,
      scrollDepth: (scroll?.meta as Record<string, unknown>)?.depth as number | undefined,
      timeOnPage: (time?.meta as Record<string, unknown>)?.seconds as number | undefined,
    };
  });

  // ─── Computed values ───────────────────────────────────────────────────────
  const journeyStage = contact.journey_stage || "visitor";
  const currentStageIndex = JOURNEY_STAGES.findIndex((s) => s.key === journeyStage);
  const leadScore = contact.lead_score ?? 0;
  // Always compute LTV from actual paid orders (DB value may be stale)
  const lifetimeValue = orders.reduce((sum, o) => o.status === "paid" ? sum + (o.amount || 0) : sum, 0);
  const srcKey = contact.source || "manual";
  const src = sourceConfig[srcKey] || { ...defaultSourceStyle, label: srcKey };

  // Derive phone from orders if contact.phone is empty
  const displayPhone = contact.phone || orders.find((o) => o.customer_phone)?.customer_phone || null;

  // Build purchased courses list from paid orders (fallback when enrollments table is empty)
  const paidCourses = orders
    .filter((o) => o.status === "paid" && o.products?.title)
    .map((o) => ({
      id: o.id,
      title: o.products!.title,
      created_at: o.created_at,
      amount: o.amount,
    }));
  // Deduplicate by title
  const uniquePaidCourses = paidCourses.filter(
    (c, i, arr) => arr.findIndex((x) => x.title === c.title) === i
  );

  return (
    <div>
      <TopBar title="Chi tiết khách hàng" subtitle={contact.full_name} />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/crm/contacts"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách
        </Link>

        {/* ═══════════ HEADER SECTION ═══════════ */}
        <div className="card-dark p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #D4A843, #b8922e)" }}
            >
              {contact.full_name.charAt(0).toUpperCase()}
            </div>

            {/* Name & Contact Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">
                {contact.full_name}
              </h1>

              {/* Phone + Email + Assigned Sale — prominent row */}
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                {displayPhone && (
                  <a
                    href={`tel:${displayPhone}`}
                    className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
                  >
                    <Phone size={14} className="text-green-400" />
                    <span className="font-medium">{displayPhone}</span>
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
                  >
                    <Mail size={14} className="text-blue-400" />
                    <span>{contact.email}</span>
                  </a>
                )}
                {contact.facebook_url && (
                  <a
                    href={contact.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" className="text-[#1877F2]">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span>Facebook</span>
                  </a>
                )}
                {contact.assigned_profile?.full_name && (
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <User size={14} className="text-[#D4A843]" />
                    <span>Sale: <span className="font-medium text-[#D4A843]">{contact.assigned_profile.full_name}</span></span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2.5">
                {/* Journey Stage Badge */}
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: "rgba(212,168,67,0.12)",
                    color: "#D4A843",
                    border: "1px solid rgba(212,168,67,0.3)",
                  }}
                >
                  <Target size={12} />
                  {JOURNEY_STAGES.find((s) => s.key === journeyStage)?.label || journeyStage}
                </span>

                {/* Lead Score Badge */}
                {leadScore > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: leadScore >= 70 ? "rgba(34,197,94,0.12)" : leadScore >= 40 ? "rgba(245,158,11,0.12)" : "rgba(107,114,128,0.12)",
                      color: leadScore >= 70 ? "#22c55e" : leadScore >= 40 ? "#f59e0b" : "#9ca3af",
                      border: `1px solid ${leadScore >= 70 ? "rgba(34,197,94,0.3)" : leadScore >= 40 ? "rgba(245,158,11,0.3)" : "rgba(107,114,128,0.3)"}`,
                    }}
                  >
                    <Star size={12} />
                    Score: {leadScore}
                  </span>
                )}

                {/* Assigned Sales */}
                {contact.assigned_profile?.full_name && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-[#2a2a2a]">
                    <User size={12} />
                    {contact.assigned_profile.full_name}
                  </span>
                )}

                {/* Lifetime Value */}
                {lifetimeValue > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: "rgba(212,168,67,0.08)",
                      color: "#D4A843",
                    }}
                  >
                    <DollarSign size={12} />
                    LTV: {formatVND(lifetimeValue)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ JOURNEY STAGE STEPPER ═══════════ */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-1 overflow-x-auto">
            {JOURNEY_STAGES.map((stage, idx) => {
              const isActive = idx === currentStageIndex;
              const isPast = idx < currentStageIndex;
              return (
                <div key={stage.key} className="flex items-center flex-1 min-w-0">
                  {/* Step Circle + Label */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                      style={{
                        background: isActive
                          ? "#D4A843"
                          : isPast
                          ? "rgba(212,168,67,0.3)"
                          : "rgba(42,42,42,0.8)",
                        color: isActive ? "#000" : isPast ? "#D4A843" : "#6b7280",
                        border: isActive
                          ? "2px solid #D4A843"
                          : isPast
                          ? "2px solid rgba(212,168,67,0.4)"
                          : "2px solid #2a2a2a",
                      }}
                    >
                      {isPast ? (
                        <CheckCircle size={14} />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className="text-[10px] font-medium text-center truncate w-full"
                      style={{ color: isActive ? "#D4A843" : isPast ? "#D4A843" : "#6b7280" }}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {/* Connector Line */}
                  {idx < JOURNEY_STAGES.length - 1 && (
                    <div
                      className="h-0.5 flex-1 min-w-4 mx-1"
                      style={{
                        background: isPast ? "rgba(212,168,67,0.4)" : "#2a2a2a",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════ MAIN CONTENT: LEFT + RIGHT COLUMNS ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── LEFT COLUMN (2/3) ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Activity Form */}
            <div className="card-dark p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={16} className="text-[#D4A843]" />
                <h3 className="font-semibold text-white text-sm">Thêm hoạt động</h3>
              </div>
              <form action={addActivity}>
                <input type="hidden" name="contact_id" value={contact.id} />
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    name="type"
                    className="input-dark px-3 py-2 text-sm sm:w-[140px]"
                  >
                    <option value="note">Ghi chú</option>
                    <option value="call">Cuộc gọi</option>
                    <option value="email">Email</option>
                    <option value="meeting">Cuộc họp</option>
                    <option value="task">Task</option>
                  </select>
                  <input
                    type="text"
                    name="content"
                    required
                    placeholder="Nội dung hoạt động..."
                    className="input-dark flex-1 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="btn-green px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap"
                  >
                    Thêm
                  </button>
                </div>
              </form>
            </div>

            {/* Activity Timeline */}
            <div className="card-dark p-5">
              <div className="flex items-center gap-2 mb-5">
                <Clock size={16} className="text-[#D4A843]" />
                <h3 className="font-semibold text-white text-sm">
                  Lịch sử hoạt động
                </h3>
                <span className="text-xs text-gray-500 ml-auto">
                  {activities.length} hoạt động
                </span>
              </div>

              {activities.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Chưa có hoạt động nào. Hãy thêm ghi chú đầu tiên!
                </p>
              ) : (
                <div className="space-y-0">
                  {activities.map((activity, idx) => {
                    const Icon = getActivityIcon(activity.type);
                    const typeConf = activityTypeConfig[activity.type] || activityTypeConfig.note;
                    const isSystem = activity.is_system;

                    return (
                      <div
                        key={activity.id}
                        className="relative flex gap-4 pb-6"
                      >
                        {/* Timeline line */}
                        {idx < activities.length - 1 && (
                          <div
                            className="absolute left-[15px] top-9 bottom-0 w-px"
                            style={{ background: "#2a2a2a" }}
                          />
                        )}
                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: isSystem ? "rgba(75,85,99,0.2)" : `${typeConf.color}18`,
                            border: `1px solid ${isSystem ? "#374151" : typeConf.color}40`,
                          }}
                        >
                          <Icon
                            size={14}
                            style={{ color: isSystem ? "#6b7280" : typeConf.color }}
                          />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded"
                              style={{
                                background: isSystem ? "rgba(75,85,99,0.15)" : `${typeConf.color}15`,
                                color: isSystem ? "#9ca3af" : typeConf.color,
                              }}
                            >
                              {typeConf.label}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {timeAgo(activity.created_at)}
                            </span>
                          </div>
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: isSystem ? "#6b7280" : "#d1d5db" }}
                          >
                            {activity.content}
                          </p>
                          {activity.creator_profile?.full_name && !isSystem && (
                            <p className="text-[11px] text-gray-500 mt-1">
                              bởi {activity.creator_profile.full_name}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── Web Journey Section ─── */}
            {enrichedPageViews.length > 0 && (
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Eye size={16} className="text-[#D4A843]" />
                  <h3 className="font-semibold text-white text-sm">Hành trình web</h3>
                  <span className="text-xs text-gray-500 ml-auto">
                    {enrichedPageViews.length} lượt xem
                  </span>
                </div>
                <div className="space-y-1">
                  {enrichedPageViews.slice(0, 30).map((pv, idx) => (
                    <div
                      key={pv.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/[0.03]"
                      style={{
                        background: idx === 0 ? "rgba(212,168,67,0.04)" : "transparent",
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: idx === 0 ? "#D4A843" : "#3a3a3a" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate font-mono">
                          {pv.page}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {formatDateTime(pv.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {pv.scrollDepth != null && (
                          <div className="flex items-center gap-1.5" title="Scroll depth">
                            <MousePointerClick size={12} className="text-blue-400" />
                            <span className="text-xs text-blue-400 font-medium">
                              {pv.scrollDepth}%
                            </span>
                          </div>
                        )}
                        {pv.timeOnPage != null && (
                          <div className="flex items-center gap-1.5" title="Thời gian trên trang">
                            <Timer size={12} className="text-green-400" />
                            <span className="text-xs text-green-400 font-medium">
                              {pv.timeOnPage < 60
                                ? `${pv.timeOnPage}s`
                                : `${Math.floor(pv.timeOnPage / 60)}m${pv.timeOnPage % 60 > 0 ? ` ${pv.timeOnPage % 60}s` : ""}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {enrichedPageViews.length > 30 && (
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Hiển thị 30 / {enrichedPageViews.length} lượt xem gần nhất
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ─── RIGHT COLUMN (1/3) ─── */}
          <div className="space-y-5">
            {/* Quick Info Card */}
            <div className="card-dark p-5">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-[#D4A843]" />
                <h3 className="font-semibold text-white text-sm">Thông tin</h3>
              </div>
              <div className="space-y-3">
                {/* Email */}
                {contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail size={14} className="text-gray-500 shrink-0" />
                    <span className="text-sm text-gray-300 truncate">{contact.email}</span>
                  </div>
                )}
                {/* Phone */}
                {displayPhone && (
                  <div className="flex items-center gap-3">
                    <Phone size={14} className="text-gray-500 shrink-0" />
                    <span className="text-sm text-gray-300">{displayPhone}</span>
                  </div>
                )}
                {/* Company */}
                {contact.company && (
                  <div className="flex items-center gap-3">
                    <Building2 size={14} className="text-gray-500 shrink-0" />
                    <span className="text-sm text-gray-300">{contact.company}</span>
                  </div>
                )}
                {/* Facebook */}
                {contact.facebook_url && (
                  <div className="flex items-center gap-3">
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" className="text-[#1877F2] shrink-0">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <a
                      href={contact.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 truncate transition-colors"
                    >
                      {contact.facebook_url.replace(/^https?:\/\/(www\.)?facebook\.com\/?/, "fb.com/")}
                    </a>
                  </div>
                )}
                {/* Source */}
                <div className="flex items-center gap-3">
                  <Tag size={14} className="text-gray-500 shrink-0" />
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: src.bg, color: src.color }}
                  >
                    {src.label}
                  </span>
                </div>
                {/* UTM Attribution */}
                {(contact.utm_source || contact.utm_medium || contact.utm_campaign) && (
                  <div className="pt-2 border-t border-[#2a2a2a]">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">UTM Attribution</p>
                    <div className="space-y-1.5">
                      {contact.utm_source && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Source:</span>
                          <span className="text-gray-300">{contact.utm_source}</span>
                        </div>
                      )}
                      {contact.utm_medium && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Medium:</span>
                          <span className="text-gray-300">{contact.utm_medium}</span>
                        </div>
                      )}
                      {contact.utm_campaign && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Campaign:</span>
                          <span className="text-gray-300">{contact.utm_campaign}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* First Page / Referrer */}
                {(contact.first_page || contact.referrer) && (
                  <div className="pt-2 border-t border-[#2a2a2a]">
                    {contact.first_page && (
                      <div className="flex items-start gap-2 text-xs mb-1.5">
                        <Globe size={12} className="text-gray-500 shrink-0 mt-0.5" />
                        <span className="text-gray-400 truncate">{contact.first_page}</span>
                      </div>
                    )}
                    {contact.referrer && (
                      <div className="flex items-start gap-2 text-xs">
                        <Link2 size={12} className="text-gray-500 shrink-0 mt-0.5" />
                        <span className="text-gray-400 truncate">{contact.referrer}</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Dates */}
                <div className="pt-2 border-t border-[#2a2a2a] space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Tạo lúc:</span>
                    <span className="text-gray-400">{formatDateTime(contact.created_at)}</span>
                  </div>
                  {contact.last_contacted_at && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">Liên hệ cuối:</span>
                      <span className="text-gray-400">{formatDateTime(contact.last_contacted_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Orders Card */}
            <div className="card-dark p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart size={16} className="text-[#D4A843]" />
                <h3 className="font-semibold text-white text-sm">Đơn hàng</h3>
                <span className="text-xs text-gray-500 ml-auto">{orders.length}</span>
              </div>
              {orders.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">Chưa có đơn hàng</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #2a2a2a" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {order.products?.title || order.order_code || "Đơn hàng"}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-amber-400">
                            {formatVND(order.amount)}
                          </p>
                          <span
                            className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              background: order.status === "paid" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                              color: order.status === "paid" ? "#22c55e" : "#f59e0b",
                            }}
                          >
                            {order.status === "paid" ? "Đã TT" : "Chờ TT"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enrolled / Purchased Courses Card */}
            <div className="card-dark p-5">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={16} className="text-[#D4A843]" />
                <h3 className="font-semibold text-white text-sm">Khoá học đã đăng ký</h3>
                <span className="text-xs text-gray-500 ml-auto">
                  {enrollments.length > 0 ? enrollments.length : uniquePaidCourses.length}
                </span>
              </div>
              {enrollments.length > 0 ? (
                /* Show from enrollments table */
                <div className="space-y-2">
                  {enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #2a2a2a" }}
                    >
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                        style={{ background: "rgba(59,130,246,0.12)" }}
                      >
                        <BookOpen size={13} className="text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-200 truncate">
                          {enrollment.products?.title || "Khoá học"}
                        </p>
                        <p className="text-[10px] text-gray-500">{formatDate(enrollment.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : uniquePaidCourses.length > 0 ? (
                /* Fallback: show courses derived from paid orders */
                <div className="space-y-2">
                  {uniquePaidCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #2a2a2a" }}
                    >
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                        style={{ background: "rgba(212,168,67,0.12)" }}
                      >
                        <BookOpen size={13} className="text-[#D4A843]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-200 truncate">
                          {course.title}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Mua {formatDate(course.created_at)} · {formatVND(course.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">Chưa có khoá học nào</p>
              )}
            </div>

            {/* Course Interests Card */}
            {courseInterests.length > 0 && (
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Heart size={16} className="text-[#D4A843]" />
                  <h3 className="font-semibold text-white text-sm">Khoá học quan tâm</h3>
                  <span className="text-xs text-gray-500 ml-auto">{courseInterests.length}</span>
                </div>
                <div className="space-y-2.5">
                  {courseInterests.map((interest) => {
                    const displayPrice = interest.products?.sale_price ?? interest.products?.price ?? 0;
                    const isContacted = interest.contacted;
                    return (
                      <div
                        key={interest.id}
                        className="p-3 rounded-lg"
                        style={{ background: "rgba(236,72,153,0.04)", border: "1px solid rgba(236,72,153,0.15)" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white font-medium truncate">
                              {interest.products?.title || "Khoá học"}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[11px] text-gray-500">
                                {interest.view_count} lượt xem
                              </span>
                              {interest.last_viewed_at && (
                                <span className="text-[11px] text-gray-500">
                                  {timeAgo(interest.last_viewed_at)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {displayPrice > 0 && (
                              <p className="text-xs font-semibold text-amber-400">
                                {formatVND(displayPrice)}
                              </p>
                            )}
                            {isContacted && (
                              <span
                                className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
                              >
                                Đã liên hệ
                              </span>
                            )}
                          </div>
                        </div>
                        {interest.notes && (
                          <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2">
                            {interest.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommended Courses Card */}
            {recommendations.length > 0 && (
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb size={16} className="text-[#D4A843]" />
                  <h3 className="font-semibold text-white text-sm">Gợi ý khoá học</h3>
                </div>
                <div className="space-y-2.5">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 rounded-lg"
                      style={{ background: "rgba(212,168,67,0.04)", border: "1px solid rgba(212,168,67,0.15)" }}
                    >
                      <p className="text-sm text-white font-medium truncate">
                        {rec.products?.title || "Khoá học"}
                      </p>
                      {rec.reason && (
                        <p className="text-[11px] text-gray-500 mt-1">{rec.reason}</p>
                      )}
                      {rec.score != null && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <TrendingUp size={10} className="text-[#D4A843]" />
                          <span className="text-[10px] text-[#D4A843] font-semibold">
                            Score: {rec.score}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Actions Card */}
            {nextActions.length > 0 && (
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ListTodo size={16} className="text-[#D4A843]" />
                  <h3 className="font-semibold text-white text-sm">Việc cần làm</h3>
                  <span className="text-xs text-gray-500 ml-auto">{nextActions.length}</span>
                </div>
                <div className="space-y-2.5">
                  {nextActions.map((action) => {
                    const prio = priorityConfig[action.priority || "medium"] || priorityConfig.medium;
                    return (
                      <div
                        key={action.id}
                        className="p-3 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #2a2a2a" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-gray-200">{action.title}</p>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: prio.bg, color: prio.color }}
                          >
                            {prio.label}
                          </span>
                        </div>
                        {action.due_date && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Calendar size={10} className="text-gray-500" />
                            <span className="text-[11px] text-gray-500">
                              {formatDate(action.due_date)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Deals Card */}
            {deals.length > 0 && (
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase size={16} className="text-[#D4A843]" />
                  <h3 className="font-semibold text-white text-sm">Deals</h3>
                  <span className="text-xs text-gray-500 ml-auto">{deals.length}</span>
                </div>
                <div className="space-y-2.5">
                  {deals.map((deal) => {
                    const stageConf = dealStageConfig[deal.stage] || dealStageConfig.lead;
                    return (
                      <div
                        key={deal.id}
                        className="p-3 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #2a2a2a" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm text-white font-medium truncate">
                              {deal.title}
                            </p>
                            <span
                              className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: `${stageConf.color}18`, color: stageConf.color }}
                            >
                              {stageConf.label}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-amber-400 shrink-0">
                            {formatVND(deal.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

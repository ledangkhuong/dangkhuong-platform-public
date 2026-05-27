"use client";

/**
 * ActionQueue — the central "what should I do next" panel of the Sale
 * Dashboard. Receives all four kinds from the server already filtered and
 * sorted, then lets the rep flip between three tabs purely client-side:
 *
 *   - 🔥 Quá hạn          → overdue_followup
 *   - 🟡 Hôm nay          → today_followup
 *   - 🟠 Cần chase        → pending_order_chase + new_lead
 *
 * Tab state lives in a single `useState` — no router round-trips, no URL
 * params. Counts on the tab pills come from the array lengths so they stay
 * truthful even as items are removed (future enhancement).
 *
 * Each row shows:
 *   name + phone + journey-stage badge + description + amount (if pending)
 *   + relative due-time + 2 actions (tel: link + "Mở hồ sơ" link).
 */
import { useState } from "react";
import Link from "next/link";
import {
  Flame,
  Clock,
  Phone,
  ExternalLink,
  AlertCircle,
  UserPlus,
  Hourglass,
} from "lucide-react";
import type { ActionQueueItem } from "@/lib/sale-kpi";

interface ActionQueueProps {
  overdue: ActionQueueItem[];
  today: ActionQueueItem[];
  pending: ActionQueueItem[];
  newLeads: ActionQueueItem[];
}

type TabKey = "overdue" | "today" | "chase";

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffMs = t - Date.now();
  const absMin = Math.abs(diffMs) / 60000;
  const sign = diffMs < 0 ? "trễ" : "còn";
  if (absMin < 1) return diffMs < 0 ? "vừa trễ" : "ngay bây giờ";
  if (absMin < 60) return `${sign} ${Math.round(absMin)} phút`;
  const absHr = absMin / 60;
  if (absHr < 24) return `${sign} ${Math.round(absHr)} giờ`;
  const absDay = absHr / 24;
  return `${sign} ${Math.round(absDay)} ngày`;
}

function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) return null;
  const labels: Record<string, { text: string; color: string; bg: string }> = {
    lead: { text: "Khách lạ", color: "#cbd5e1", bg: "rgba(148,163,184,0.15)" },
    visitor: {
      text: "Khách lạ",
      color: "#cbd5e1",
      bg: "rgba(148,163,184,0.15)",
    },
    contacted: {
      text: "Đã liên hệ",
      color: "#93c5fd",
      bg: "rgba(59,130,246,0.15)",
    },
    qualified: {
      text: "Khách hàng",
      color: "#d8b4fe",
      bg: "rgba(168,85,247,0.15)",
    },
    negotiation: {
      text: "Thương lượng",
      color: "#fcd34d",
      bg: "rgba(245,158,11,0.18)",
    },
    customer: {
      text: "Hội viên",
      color: "#D4A843",
      bg: "rgba(212,168,67,0.18)",
    },
    advocate: {
      text: "Ủng hộ",
      color: "#86efac",
      bg: "rgba(34,197,94,0.15)",
    },
  };
  const cfg = labels[stage] ?? {
    text: stage,
    color: "#9ca3af",
    bg: "rgba(255,255,255,0.05)",
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.text}
    </span>
  );
}

function KindIcon({ kind }: { kind: ActionQueueItem["kind"] }) {
  if (kind === "overdue_followup")
    return <Flame size={14} className="text-red-400" />;
  if (kind === "today_followup")
    return <Clock size={14} className="text-yellow-400" />;
  if (kind === "pending_order_chase")
    return <Hourglass size={14} className="text-orange-400" />;
  return <UserPlus size={14} className="text-blue-400" />;
}

function ActionRow({ item }: { item: ActionQueueItem }) {
  // Resolve the "Mở hồ sơ" link:
  //   1. Contact row exists → open the contact detail (best UX).
  //   2. Pending-order kind without a contact yet → open the orders page
  //      filtered by email/phone so the rep sees the actual order.
  //   3. Lead/follow-up kinds without a contact (rare) → search the
  //      contacts list by whatever identifier we have.
  //
  // The previous fallback used the first 8 chars of the row's UUID as a
  // search term, which never matches order_code/customer_email and made
  // the link feel broken ("Mở hồ sơ" → empty page).
  const searchKey = item.email || item.phone || item.full_name || "";
  const profileHref = item.contact_id
    ? `/crm/contacts/${item.contact_id}`
    : item.kind === "pending_order_chase" && searchKey
      ? `/admin/orders?q=${encodeURIComponent(searchKey)}`
      : searchKey
        ? `/crm/contacts?q=${encodeURIComponent(searchKey)}`
        : "/crm/contacts";

  const borderStyle =
    item.kind === "overdue_followup"
      ? "border-l-2 border-l-red-500/70"
      : item.kind === "today_followup"
        ? "border-l-2 border-l-yellow-500/70"
        : item.kind === "pending_order_chase"
          ? "border-l-2 border-l-orange-500/70"
          : "border-l-2 border-l-blue-500/70";

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border border-[#2a2a2a] bg-[#141414] p-3 sm:flex-row sm:items-center sm:justify-between ${borderStyle}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <KindIcon kind={item.kind} />
          <span className="truncate text-sm font-semibold text-white">
            {item.full_name || "(Chưa có tên)"}
          </span>
          <StageBadge stage={item.journey_stage} />
          {item.priority === "urgent" || item.priority === "high" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
              <AlertCircle size={10} />
              {item.priority === "urgent" ? "Khẩn" : "Cao"}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-gray-400">
          {item.description}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
          {item.phone ? <span>{item.phone}</span> : null}
          {item.amount && item.amount > 0 ? (
            <span className="font-semibold text-[#D4A843]">
              {item.amount.toLocaleString("vi-VN")}đ
            </span>
          ) : null}
          {item.due_at ? <span>{formatRelative(item.due_at)}</span> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {item.phone ? (
          <a
            href={`tel:${item.phone}`}
            className="inline-flex items-center gap-1 rounded-md bg-[#D4A843] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#c2982e]"
          >
            <Phone size={12} />
            Gọi
          </a>
        ) : null}
        <Link
          href={profileHref}
          className="inline-flex items-center gap-1 rounded-md border border-[#2a2a2a] bg-[#1f1f1f] px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:border-[#3a3a3a] hover:text-white"
        >
          <ExternalLink size={12} />
          Mở hồ sơ
        </Link>
      </div>
    </div>
  );
}

export default function ActionQueue({
  overdue,
  today,
  pending,
  newLeads,
}: ActionQueueProps) {
  const chase = [...pending, ...newLeads];
  const [tab, setTab] = useState<TabKey>(
    overdue.length > 0 ? "overdue" : today.length > 0 ? "today" : "chase"
  );

  const items: ActionQueueItem[] =
    tab === "overdue" ? overdue : tab === "today" ? today : chase;

  const tabBtn = (key: TabKey, label: string, count: number, icon: React.ReactNode) => {
    const active = tab === key;
    return (
      <button
        type="button"
        onClick={() => setTab(key)}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
          active
            ? "bg-[#D4A843] text-black"
            : "border border-[#2a2a2a] bg-[#141414] text-gray-300 hover:border-[#3a3a3a] hover:text-white"
        }`}
      >
        {icon}
        {label}
        <span
          className={`ml-1 rounded-full px-1.5 text-[10px] ${
            active ? "bg-black/15 text-black" : "bg-white/5 text-gray-300"
          }`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div id="queue" className="card-dark p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">
            Việc cần làm
          </h3>
          <p className="text-xs text-gray-400">
            Khách hàng đang chờ bạn liên hệ — gọi trước, ghi log sau.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tabBtn(
            "overdue",
            "Quá hạn",
            overdue.length,
            <Flame size={12} />
          )}
          {tabBtn(
            "today",
            "Hôm nay",
            today.length,
            <Clock size={12} />
          )}
          {tabBtn(
            "chase",
            "Cần chase",
            chase.length,
            <Hourglass size={12} />
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#2a2a2a] bg-[#141414] py-10 text-center text-sm text-gray-500">
          <span className="text-2xl">✨</span>
          <p>Không còn việc nào ở mục này. Tận hưởng giây phút này!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ActionRow key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

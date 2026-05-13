"use client";

import TopBar from "@/components/layout/TopBar";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Clock,
  Users,
  Video,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  ExternalLink,
  MapPin,
  Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* ── Types ── */

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_date: string; // "YYYY-MM-DD"
  start_time: string | null; // "HH:MM:SS"
  end_time: string | null;
  platform: string;
  meet_link: string | null;
  max_attendees: number | null;
  tag: string | null;
  tier_required: string;
  created_by: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  role: string;
}

/* ── Helpers ── */

const VIET_MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  return timeStr.slice(0, 5); // "HH:MM"
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return "";
  const s = formatTime(start);
  const e = end ? formatTime(end) : "";
  return e ? `${s} – ${e}` : s;
}

function isSameDay(dateStr: string, year: number, month: number, day: number): boolean {
  const d = new Date(dateStr + "T00:00:00");
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

function tierBadge(tier: string): { label: string; color: string } {
  switch (tier) {
    case "vip":
      return { label: "VIP", color: "#f59e0b" };
    case "member":
      return { label: "Member", color: "#a855f7" };
    default:
      return { label: "Miễn phí", color: "#22c55e" };
  }
}

/* ── Calendar Grid Component ── */

function MonthCalendar({
  year,
  month,
  events,
  selectedDay,
  onSelectDay,
  onPrev,
  onNext,
}: {
  year: number;
  month: number; // 0-indexed
  events: EventRow[];
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  // First day of month and total days
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Day of week for first day (convert Sun=0 to Mon=0 format)
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6; // Sunday becomes 6

  // Build set of days with events
  const eventDays = useMemo(() => {
    const set = new Set<number>();
    events.forEach((e) => {
      const d = new Date(e.event_date + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month) {
        set.add(d.getDate());
      }
    });
    return set;
  }, [events, year, month]);

  // Build grid cells: padding + days
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  // Pad to fill last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="card-dark p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(212,168,67,0.12)" }}
          >
            <Calendar size={20} className="text-[#D4A843]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {VIET_MONTHS[month]}, {year}
            </h2>
            <p className="text-xs text-gray-500">Lịch sự kiện trong tháng</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onNext}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[10px] text-gray-600 font-medium py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="h-10" />;
          }

          const isToday = isCurrentMonth && day === todayDate;
          const hasEvent = eventDays.has(day);
          const isSelected = day === selectedDay;

          return (
            <button
              key={day}
              onClick={() => onSelectDay(day)}
              className={`relative h-10 rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all ${
                isSelected
                  ? "bg-[#D4A843] text-white"
                  : isToday
                  ? "bg-[#D4A843]/20 text-[#D4A843] ring-1 ring-[#D4A843]/40"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              {day}
              {hasEvent && (
                <span
                  className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-white" : "bg-[#D4A843]"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Event Card ── */

function EventCard({ event }: { event: EventRow }) {
  const badge = tierBadge(event.tier_required);
  const isPast = new Date(event.event_date + "T23:59:59") < new Date();

  return (
    <div
      className={`card-dark p-5 transition-all hover:bg-[#1f1f1f] ${isPast ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-4">
        {/* Date block */}
        <div className="shrink-0 w-14 text-center">
          <div className="text-2xl font-bold text-white">
            {new Date(event.event_date + "T00:00:00").getDate()}
          </div>
          <div className="text-[10px] text-gray-500 uppercase">
            {VIET_MONTHS[new Date(event.event_date + "T00:00:00").getMonth()]}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isPast ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20">
                Đã kết thúc
              </span>
            ) : (
              <span className="badge-green text-[11px]">Sắp diễn ra</span>
            )}
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: badge.color + "15",
                color: badge.color,
                border: `1px solid ${badge.color}25`,
              }}
            >
              {badge.label}
            </span>
            {event.tag && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Tag size={10} />
                {event.tag}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-white text-base leading-snug mb-1.5">
            {event.title}
          </h3>

          {/* Description */}
          {event.description && (
            <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} className="text-[#D4A843]" />
              {formatDate(event.event_date)}
            </span>
            {event.start_time && (
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-[#D4A843]" />
                {formatTimeRange(event.start_time, event.end_time)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <MapPin size={12} />
              {event.platform}
            </span>
            {event.max_attendees && (
              <span className="flex items-center gap-1.5">
                <Users size={12} />
                Tối đa {event.max_attendees} người
              </span>
            )}
          </div>

          {/* Meet link */}
          {event.meet_link && !isPast && (
            <div className="mt-3">
              <a
                href={event.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-green inline-flex items-center gap-2 text-sm"
              >
                <Video size={14} /> Tham gia ngay
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Create Event Form ── */

function CreateEventForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [platform, setPlatform] = useState("Zoom");
  const [meetLink, setMeetLink] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [tag, setTag] = useState("");
  const [tierRequired, setTierRequired] = useState("free");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !eventDate) {
      setError("Vui lòng nhập tiêu đề và ngày sự kiện.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("events").insert({
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate,
      start_time: startTime || null,
      end_time: endTime || null,
      platform,
      meet_link: meetLink.trim() || null,
      max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
      tag: tag.trim() || null,
      tier_required: tierRequired,
      created_by: user?.id ?? null,
    });

    setLoading(false);

    if (insertError) {
      setError("Lỗi khi tạo sự kiện: " + insertError.message);
      return;
    }

    onCreated();
  }

  return (
    <div className="card-dark p-6 border border-[#D4A843]/30">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Plus size={18} className="text-[#D4A843]" />
          Tạo sự kiện mới
        </h3>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">
            Tiêu đề *
          </label>
          <input
            type="text"
            className="input-dark w-full"
            placeholder="VD: Workshop xây dựng thương hiệu"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">
            Mô tả
          </label>
          <textarea
            className="input-dark w-full min-h-[80px] resize-y"
            placeholder="Mô tả chi tiết về sự kiện..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Date + Time row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">
              Ngày *
            </label>
            <input
              type="date"
              className="input-dark w-full"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">
              Giờ bắt đầu
            </label>
            <input
              type="time"
              className="input-dark w-full"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">
              Giờ kết thúc
            </label>
            <input
              type="time"
              className="input-dark w-full"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* Platform + Link row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">
              Nền tảng
            </label>
            <select
              className="input-dark w-full"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="Zoom">Zoom</option>
              <option value="Google Meet">Google Meet</option>
              <option value="Microsoft Teams">Microsoft Teams</option>
              <option value="Offline">Offline</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">
              Link tham gia
            </label>
            <input
              type="url"
              className="input-dark w-full"
              placeholder="https://..."
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
            />
          </div>
        </div>

        {/* Max attendees + Tag + Tier row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">
              Số người tối đa
            </label>
            <input
              type="number"
              className="input-dark w-full"
              placeholder="VD: 100"
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">
              Tag
            </label>
            <input
              type="text"
              className="input-dark w-full"
              placeholder="VD: Workshop, Live Q&A"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium mb-1.5 block">
              Yêu cầu hạng
            </label>
            <select
              className="input-dark w-full"
              value={tierRequired}
              onChange={(e) => setTierRequired(e.target.value)}
            >
              <option value="free">Miễn phí</option>
              <option value="member">Member</option>
              <option value="vip">VIP</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-green flex items-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Plus size={14} /> Tạo sự kiện
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 rounded-lg hover:text-white hover:bg-white/5 transition-colors"
          >
            Huỷ
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Main Page ── */

export default function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Calendar state
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);

  const isAdmin = userProfile?.role === "admin" || userProfile?.role === "manager";

  // Fetch user profile
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", user.id)
          .single();
        if (data) setUserProfile(data as UserProfile);
      }
    }
    loadProfile();
  }, []);

  // Fetch events for visible month
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Date range for the visible month
    const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const endDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const { data } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", startDate)
      .lte("event_date", endDate)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    setEvents((data as EventRow[]) ?? []);
    setLoading(false);
  }, [viewYear, viewMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Navigate months
  function goToPrevMonth() {
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    setSelectedDay(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // Events for selected day
  const selectedDayEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return events.filter((e) =>
      isSameDay(e.event_date, viewYear, viewMonth, selectedDay)
    );
  }, [events, selectedDay, viewYear, viewMonth]);

  // Upcoming events (from today onward, sorted by date)
  const upcomingEvents = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return events
      .filter((e) => e.event_date >= todayStr)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [events]);

  function handleEventCreated() {
    setShowCreateForm(false);
    fetchEvents();
  }

  return (
    <div>
      <TopBar title="Sự kiện" subtitle="Lịch sự kiện, workshop & mastermind" />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* Admin create button */}
        {isAdmin && !showCreateForm && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-green flex items-center gap-2 text-sm"
            >
              <Plus size={14} /> Tạo sự kiện
            </button>
          </div>
        )}

        {/* Create form */}
        {showCreateForm && (
          <CreateEventForm
            onCreated={handleEventCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Full month calendar */}
        <MonthCalendar
          year={viewYear}
          month={viewMonth}
          events={events}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onPrev={goToPrevMonth}
          onNext={goToNextMonth}
        />

        {/* Events for selected day */}
        {selectedDay !== null && (
          <div>
            <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-[#D4A843]" />
              Sự kiện ngày {selectedDay}/{viewMonth + 1}/{viewYear}
            </h2>

            {selectedDayEvents.length === 0 ? (
              <div className="card-dark p-8 text-center">
                <Calendar size={32} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  Không có sự kiện nào trong ngày này.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDayEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming events list */}
        <div>
          <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
            <Clock size={18} className="text-[#D4A843]" />
            Sự kiện sắp tới
          </h2>

          {loading ? (
            <div className="card-dark p-8 text-center">
              <div className="w-6 h-6 border-2 border-[#D4A843]/30 border-t-[#D4A843] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Đang tải sự kiện...</p>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="card-dark p-8 text-center">
              <Calendar size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                Chưa có sự kiện nào sắp tới trong tháng này.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

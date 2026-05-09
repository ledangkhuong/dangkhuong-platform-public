import TopBar from "@/components/layout/TopBar";
import {
  Calendar,
  Clock,
  Users,
  Video,
  ArrowRight,
  CheckCircle,
  Bell,
  Flame,
  Target,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

/* ── Static event data (replace with DB queries later) ── */

type EventStatus = "upcoming" | "live" | "past";

interface EventItem {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  status: EventStatus;
  type: "workshop" | "live" | "mastermind";
  platform: string;
  meetLink: string;
  attendees: number;
  maxAttendees: number;
  registered: boolean;
  tag: string;
  tagColor: string;
}

const events: EventItem[] = [
  {
    id: 1,
    title: "Workshop: Xây dựng thương hiệu cá nhân trên LinkedIn",
    description:
      "Hướng dẫn từng bước tối ưu profile, viết bài thu hút khách hàng, và biến LinkedIn thành kênh bán hàng #1 cho bạn.",
    date: "Thứ Ba, 13/05/2026",
    time: "20:00 – 21:30",
    status: "upcoming",
    type: "workshop",
    platform: "Zoom",
    meetLink: "https://zoom.us/j/xxxxxxxxx",
    attendees: 112,
    maxAttendees: 150,
    registered: true,
    tag: "Workshop",
    tagColor: "#3b82f6",
  },
  {
    id: 2,
    title: "Live Q&A: Giải đáp mọi thắc mắc về kinh doanh online",
    description:
      "Phiên hỏi đáp trực tiếp với Đăng Khương — mang câu hỏi của bạn đến và nhận câu trả lời ngay trên sóng.",
    date: "Thứ Năm, 15/05/2026",
    time: "21:00 – 22:00",
    status: "live",
    type: "live",
    platform: "Google Meet",
    meetLink: "https://meet.google.com/xxx-xxxx-xxx",
    attendees: 203,
    maxAttendees: 300,
    registered: true,
    tag: "Miễn phí",
    tagColor: "#22c55e",
  },
  {
    id: 3,
    title: "Mastermind tháng 5 — Nhóm Đồng Hành",
    description:
      "Phiên mastermind hàng tháng dành riêng cho thành viên VIP. Chia sẻ tiến độ, tháo gỡ rào cản cùng mentor.",
    date: "Thứ Sáu, 23/05/2026",
    time: "20:00 – 22:00",
    status: "upcoming",
    type: "mastermind",
    platform: "Zoom",
    meetLink: "https://zoom.us/j/xxxxxxxxx",
    attendees: 28,
    maxAttendees: 40,
    registered: false,
    tag: "VIP",
    tagColor: "#f59e0b",
  },
  {
    id: 4,
    title: "Workshop: Tạo sản phẩm số đầu tiên trong 72 giờ",
    description:
      "Từ ý tưởng tới sản phẩm bán được — ebook, template, hay khoá mini. Thực hành ngay trong buổi workshop.",
    date: "Thứ Tư, 28/05/2026",
    time: "19:30 – 21:00",
    status: "upcoming",
    type: "workshop",
    platform: "Zoom",
    meetLink: "https://zoom.us/j/xxxxxxxxx",
    attendees: 67,
    maxAttendees: 100,
    registered: false,
    tag: "Member",
    tagColor: "#a855f7",
  },
  {
    id: 5,
    title: "Live: Email Marketing — Đạt 80% Open Rate",
    description:
      "Recap buổi live tháng 4 với case study thực tế. Học cách viết subject line, segment danh sách, và tự động hoá.",
    date: "Thứ Bảy, 05/04/2026",
    time: "20:00 – 21:30",
    status: "past",
    type: "live",
    platform: "Zoom",
    meetLink: "",
    attendees: 318,
    maxAttendees: 400,
    registered: true,
    tag: "Đã kết thúc",
    tagColor: "#6b7280",
  },
];

const typeIcons: Record<string, string> = {
  live: "🎙️",
  workshop: "🛠️",
  mastermind: "🧠",
};

/* ── Weekly challenge data ── */

const weeklyChallenge = {
  title: "Viết 3 bài LinkedIn trong tuần",
  reward: "500 XP + Badge 'Content Creator'",
  progress: 1,
  total: 3,
  daysLeft: 4,
};

/* ── Status badge helper ── */

function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/25">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f59e0b] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f59e0b]" />
        </span>
        Đang diễn ra
      </span>
    );
  }
  if (status === "past") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20">
        Đã kết thúc
      </span>
    );
  }
  return (
    <span className="badge-green text-[11px]">Sắp diễn ra</span>
  );
}

/* ── Calendar month header ── */

const vietnameseMonths = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function CalendarHeader() {
  const now = new Date();
  const month = vietnameseMonths[now.getMonth()];
  const year = now.getFullYear();

  // Generate days of current week (Mon-Sun) with today highlighted
  const today = now.getDate();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(today + mondayOffset + i);
    return { date: d.getDate(), isToday: d.getDate() === today && d.getMonth() === now.getMonth() };
  });
  const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  return (
    <div className="card-dark p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(34,197,94,0.12)" }}
          >
            <Calendar size={20} className="text-[#22c55e]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{month}, {year}</h2>
            <p className="text-xs text-gray-500">Lịch sự kiện trong tháng</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-2">
        {dayLabels.map((label, i) => (
          <div key={label} className="text-center">
            <div className="text-[10px] text-gray-600 mb-1.5 font-medium">{label}</div>
            <div
              className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center text-sm font-semibold transition-colors ${
                weekDays[i].isToday
                  ? "bg-[#22c55e] text-white"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              {weekDays[i].date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function EventsPage() {
  const upcomingEvents = events.filter((e) => e.status !== "past");
  const pastEvents = events.filter((e) => e.status === "past");

  const totalAttendees = events.reduce((sum, e) => sum + e.attendees, 0);
  const liveCount = events.filter((e) => e.status === "live").length;
  const upcomingCount = events.filter((e) => e.status === "upcoming").length;

  return (
    <div>
      <TopBar title="Sự kiện" subtitle="Live sessions, workshops & mastermind" />

      <div className="p-6 max-w-5xl mx-auto space-y-8">

        {/* Calendar header */}
        <CalendarHeader />

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Sắp diễn ra", value: String(upcomingCount), icon: Calendar, color: "#22c55e" },
            { label: "Đang phát sóng", value: String(liveCount), icon: Sparkles, color: "#f59e0b" },
            { label: "Đã tham gia", value: "2", icon: CheckCircle, color: "#3b82f6" },
            { label: "Tổng người tham dự", value: totalAttendees.toLocaleString(), icon: Users, color: "#a855f7" },
          ].map((s) => (
            <div key={s.label} className="card-dark p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "20" }}
                >
                  <s.icon size={14} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-xl font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Upcoming / Live Events ── */}
        <div>
          <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
            <Flame size={18} className="text-[#22c55e]" />
            Sự kiện sắp tới
          </h2>

          <div className="space-y-4">
            {upcomingEvents.map((event) => {
              const seatsLeft = event.maxAttendees - event.attendees;
              const seatPercent = Math.min(100, Math.round((event.attendees / event.maxAttendees) * 100));
              const isLive = event.status === "live";

              return (
                <div
                  key={event.id}
                  className="card-dark p-5 transition-all hover:bg-[#1f1f1f]"
                  style={
                    isLive
                      ? { borderColor: "rgba(245,158,11,0.35)" }
                      : {}
                  }
                >
                  <div className="flex gap-4">
                    {/* Type icon block */}
                    <div className="shrink-0 w-14 text-center pt-1">
                      <div className="text-2xl mb-1">{typeIcons[event.type]}</div>
                      <div className="text-[10px] text-gray-500 leading-tight">{event.platform}</div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: badges */}
                      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={event.status} />
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: event.tagColor + "15",
                              color: event.tagColor,
                              border: `1px solid ${event.tagColor}25`,
                            }}
                          >
                            {event.tag}
                          </span>
                        </div>
                        {event.registered && (
                          <span className="flex items-center gap-1 text-[11px] text-[#22c55e] shrink-0">
                            <CheckCircle size={12} /> Đã đăng ký
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-white text-base leading-snug mb-1.5">
                        {event.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-gray-400 leading-relaxed mb-3">
                        {event.description}
                      </p>

                      {/* Meta: date, time, attendees */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-[#22c55e]" />
                          {event.date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} className="text-[#22c55e]" />
                          {event.time}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={12} />
                          {event.attendees}/{event.maxAttendees} người
                        </span>
                      </div>

                      {/* Seats progress bar */}
                      <div className="mb-3">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${seatPercent}%`,
                              background: seatPercent > 85 ? "#ef4444" : "#22c55e",
                            }}
                          />
                        </div>
                        <div className="text-[11px] text-gray-600 mt-1">
                          {seatsLeft > 0
                            ? `${seatsLeft} chỗ còn lại`
                            : "Đã hết chỗ"}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isLive && event.registered ? (
                          <button className="btn-gold flex items-center gap-2 text-sm">
                            <Video size={14} /> Tham gia ngay
                          </button>
                        ) : event.registered ? (
                          <>
                            <button className="btn-green flex items-center gap-2 text-sm">
                              <Video size={14} /> Vào phòng chờ
                            </button>
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 rounded-lg transition-colors hover:text-white"
                              style={{ background: "#222", border: "1px solid #2a2a2a" }}
                            >
                              <Bell size={12} /> Nhắc nhở
                            </button>
                          </>
                        ) : (
                          <button className="btn-green flex items-center gap-2 text-sm">
                            Đăng ký ngay <ArrowRight size={14} />
                          </button>
                        )}

                        {event.meetLink && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-600 ml-auto">
                            <ExternalLink size={11} />
                            {event.platform}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Weekly Challenge ── */}
        <div className="card-dark p-5 border border-[#22c55e]/20" style={{ background: "rgba(34,197,94,0.03)" }}>
          <div className="flex items-start gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(34,197,94,0.12)" }}
            >
              <Target size={22} className="text-[#22c55e]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-white text-base">Thử thách tuần</h3>
                <span className="badge-green text-[10px]">Đang diễn ra</span>
              </div>
              <p className="text-sm text-gray-300 mb-1">{weeklyChallenge.title}</p>
              <p className="text-xs text-gray-500 mb-3">
                Phần thưởng: <span className="text-[#f59e0b] font-medium">{weeklyChallenge.reward}</span>
                {" · "}
                Còn {weeklyChallenge.daysLeft} ngày
              </p>

              {/* Progress blocks */}
              <div className="flex gap-1.5 mb-2">
                {Array.from({ length: weeklyChallenge.total }, (_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-7 rounded-lg flex items-center justify-center text-xs font-semibold transition-colors"
                    style={{
                      background: i < weeklyChallenge.progress ? "#22c55e" : "#2a2a2a",
                      color: i < weeklyChallenge.progress ? "white" : "#555",
                    }}
                  >
                    {i < weeklyChallenge.progress ? "✓" : i + 1}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-600">
                {weeklyChallenge.progress}/{weeklyChallenge.total} bài hoàn thành
              </p>
            </div>
          </div>
        </div>

        {/* ── Past Events ── */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
              <Clock size={18} className="text-gray-500" />
              Sự kiện đã qua
            </h2>

            <div className="card-dark overflow-hidden">
              {pastEvents.map((event, i) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-[#1f1f1f] transition-colors"
                  style={{
                    borderBottom: i < pastEvents.length - 1 ? "1px solid #2a2a2a" : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{typeIcons[event.type]}</span>
                    <div>
                      <div className="text-white text-sm font-medium">{event.title}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> {event.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {event.attendees} người tham gia
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status="past" />
                    <button
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        background: "rgba(59,130,246,0.1)",
                        color: "#3b82f6",
                        border: "1px solid rgba(59,130,246,0.2)",
                      }}
                    >
                      <Video size={12} /> Xem lại
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Calendar CTA ── */}
        <div className="card-dark p-6 text-center" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
          <div className="flex justify-center mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.12)" }}
            >
              <Calendar size={24} className="text-[#22c55e]" />
            </div>
          </div>
          <h3 className="font-bold text-white mb-1">Đừng bỏ lỡ sự kiện nào</h3>
          <p className="text-sm text-gray-400 mb-4">
            Thêm lịch sự kiện của Đăng Khương vào Google Calendar của bạn
          </p>
          <button className="btn-green mx-auto flex items-center gap-2">
            <Calendar size={15} /> Thêm vào Google Calendar
          </button>
        </div>

        {/* ── Footer note ── */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600 pb-4">
          <Info size={12} />
          <span>Các sự kiện mới sẽ được cập nhật thường xuyên</span>
        </div>

      </div>
    </div>
  );
}

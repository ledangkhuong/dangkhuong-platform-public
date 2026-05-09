import TopBar from "@/components/layout/TopBar";
import { Calendar, Clock, Users, MapPin, Video, ArrowRight, CheckCircle, Bell } from "lucide-react";

const upcomingEvents = [
  {
    id: 1,
    title: "Live Q&A: Chiến lược Personal Brand 2025",
    date: "Thứ Bảy, 17/05/2025",
    time: "20:00 – 21:30",
    type: "live",
    platform: "Zoom",
    attendees: 247,
    maxAttendees: 300,
    registered: true,
    featured: true,
    description: "Phiên hỏi đáp trực tiếp với Đăng Khương về chiến lược xây dựng thương hiệu cá nhân. Mang câu hỏi của bạn đến!",
    tag: "Miễn phí",
    tagColor: "#22c55e",
  },
  {
    id: 2,
    title: "Workshop: Xây dựng hệ thống bán hàng tự động",
    date: "Thứ Tư, 21/05/2025",
    time: "19:30 – 21:00",
    type: "workshop",
    platform: "Zoom",
    attendees: 89,
    maxAttendees: 100,
    registered: false,
    featured: false,
    description: "Workshop thực hành 90 phút — từ landing page tới email automation, bán hàng khi bạn đang ngủ.",
    tag: "Member",
    tagColor: "#3b82f6",
  },
  {
    id: 3,
    title: "Mastermind tháng 5 — Nhóm Đồng Hành",
    date: "Thứ Sáu, 30/05/2025",
    time: "20:00 – 22:00",
    type: "mastermind",
    platform: "Zoom",
    attendees: 34,
    maxAttendees: 40,
    registered: false,
    featured: false,
    description: "Phiên mastermind hàng tháng dành riêng cho thành viên Quyền Đồng Hành. Chia sẻ tiến độ, giải quyết rào cản.",
    tag: "VIP",
    tagColor: "#f59e0b",
  },
  {
    id: 4,
    title: "AMA — Hỏi Đăng Khương bất cứ điều gì",
    date: "Thứ Ba, 03/06/2025",
    time: "21:00 – 22:00",
    type: "live",
    platform: "YouTube Live",
    attendees: 512,
    maxAttendees: 9999,
    registered: true,
    featured: false,
    description: "Ask Me Anything trực tiếp trên YouTube. Comment câu hỏi, Đăng Khương trả lời live.",
    tag: "Miễn phí",
    tagColor: "#22c55e",
  },
];

const pastEvents = [
  { title: "Live: Email Marketing 84% Open Rate", date: "05/04/2025", attendees: 318, recording: true },
  { title: "Workshop: Viết Content Triệu View", date: "20/03/2025", attendees: 124, recording: true },
  { title: "Q&A Tháng 3 — Cộng đồng", date: "15/03/2025", attendees: 201, recording: false },
];

const typeIcon: Record<string, string> = {
  live: "🎙️",
  workshop: "🛠️",
  mastermind: "🧠",
};

export default function EventsPage() {
  return (
    <div>
      <TopBar title="Sự kiện" subtitle="Live sessions, workshops & mastermind" />

      <div className="p-6 max-w-5xl mx-auto space-y-8">

        {/* Header stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Sự kiện sắp tới", value: "4", icon: "📅" },
            { label: "Đã tham gia (tháng này)", value: "2", icon: "✅" },
            { label: "Tổng người tham dự", value: "882", icon: "👥" },
          ].map((s) => (
            <div key={s.label} className="stat-card text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Upcoming Events */}
        <div>
          <h2 className="font-bold text-white text-lg mb-4">Sự kiện sắp tới</h2>
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <div key={event.id}
                className="card-dark p-5 transition-all hover:bg-[#1f1f1f]"
                style={event.featured ? { borderColor: "rgba(34,197,94,0.3)" } : {}}>
                <div className="flex gap-4">
                  {/* Date block */}
                  <div className="shrink-0 w-16 text-center">
                    <div className="text-2xl mb-1">{typeIcon[event.type]}</div>
                    <div className="text-[10px] text-gray-500 leading-tight">
                      {event.platform}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {event.featured && (
                          <span className="badge-green text-[10px]">⭐ Nổi bật</span>
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: event.tagColor + "18", color: event.tagColor, border: `1px solid ${event.tagColor}30` }}>
                          {event.tag}
                        </span>
                      </div>
                      {event.registered && (
                        <span className="flex items-center gap-1 text-[11px] text-[#22c55e] shrink-0">
                          <CheckCircle size={12} /> Đã đăng ký
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-white text-base leading-snug mb-1.5">{event.title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">{event.description}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-[#22c55e]" /> {event.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} className="text-[#22c55e]" /> {event.time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={12} />
                        {event.attendees}{event.maxAttendees < 9999 ? `/${event.maxAttendees}` : ""} người
                      </span>
                    </div>

                    {/* Progress bar for seats */}
                    {event.maxAttendees < 9999 && (
                      <div className="mb-3">
                        <div className="progress-bar">
                          <div className="progress-fill"
                            style={{ width: `${Math.min(100, Math.round((event.attendees / event.maxAttendees) * 100))}%` }} />
                        </div>
                        <div className="text-[11px] text-gray-600 mt-1">
                          {event.maxAttendees - event.attendees} chỗ còn lại
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {event.registered ? (
                        <>
                          <button className="btn-green flex items-center gap-2 text-sm">
                            <Video size={14} /> Tham gia phòng
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 rounded-lg transition-colors hover:text-white"
                            style={{ background: "#222", border: "1px solid #2a2a2a" }}>
                            <Bell size={12} /> Nhắc nhở
                          </button>
                        </>
                      ) : (
                        <button className="btn-green flex items-center gap-2 text-sm">
                          Đăng ký ngay <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Past Events */}
        <div>
          <h2 className="font-bold text-white text-lg mb-4">Sự kiện đã qua</h2>
          <div className="card-dark overflow-hidden">
            {pastEvents.map((e, i) => (
              <div key={e.title}
                className="flex items-center justify-between px-5 py-4 hover:bg-[#1f1f1f] transition-colors cursor-pointer"
                style={{ borderBottom: i < pastEvents.length - 1 ? "1px solid #2a2a2a" : "none" }}>
                <div>
                  <div className="text-white text-sm font-medium">{e.title}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar size={11} />{e.date}</span>
                    <span className="flex items-center gap-1"><Users size={11} />{e.attendees} người tham gia</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {e.recording ? (
                    <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>
                      <Video size={12} /> Xem lại
                    </button>
                  ) : (
                    <span className="text-xs text-gray-600">Không có recording</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar CTA */}
        <div className="card-dark p-6 text-center" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
          <div className="text-3xl mb-3">📆</div>
          <h3 className="font-bold text-white mb-1">Đừng bỏ lỡ sự kiện nào</h3>
          <p className="text-sm text-gray-400 mb-4">Thêm lịch sự kiện của Đăng Khương vào Google Calendar của bạn</p>
          <button className="btn-green mx-auto flex items-center gap-2">
            <Calendar size={15} /> Thêm vào Google Calendar
          </button>
        </div>

      </div>
    </div>
  );
}

import type { Metadata } from "next";
import TopBar from "@/components/layout/TopBar";
import { PlayCircle, CheckCircle, Lock, ChevronDown, BookOpen, Clock, Award } from "lucide-react";

const courseData = {
  title: "Digital Snacks — Kiếm tiền từ sản phẩm số",
  desc: "Học cách tạo và bán sản phẩm số nhỏ gọn, lợi nhuận cao.",
  progress: 35,
  chapters: [
    {
      title: "Chương 1: Tư duy sản phẩm số",
      lessons: [
        { id: 1, title: "Sản phẩm số là gì và tại sao bạn nên bán?", duration: "12:30", done: true, active: false },
        { id: 2, title: "Tâm lý khách hàng mua sản phẩm số", duration: "18:45", done: true, active: false },
        { id: 3, title: "5 loại sản phẩm số dễ tạo nhất", duration: "15:20", done: false, active: true },
      ]
    },
    {
      title: "Chương 2: Tạo sản phẩm số trong 24h",
      lessons: [
        { id: 4, title: "Chọn chủ đề & xác định khách hàng", duration: "20:10", done: false, active: false },
        { id: 5, title: "Tạo ebook bằng Notion + Canva", duration: "25:30", done: false, active: false },
        { id: 6, title: "Tạo mini-course bằng video đơn giản", duration: "30:00", done: false, active: false },
      ]
    },
    {
      title: "Chương 3: Landing page & bán hàng",
      lessons: [
        { id: 7, title: "Viết sales copy hút khách", duration: "22:15", done: false, active: false },
        { id: 8, title: "Tạo landing page chuyển đổi cao", duration: "35:40", done: false, active: false },
      ]
    },
    {
      title: "Chương 4: Scale & Automation",
      locked: true,
      lessons: [
        { id: 9, title: "Email funnel tự động", duration: "28:00", done: false, active: false },
        { id: 10, title: "Affiliate & upsell chiến lược", duration: "20:30", done: false, active: false },
      ]
    },
  ]
};

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  if (!courseData) return { title: "Khoá học không tồn tại" };
  return {
    title: `${courseData.title} — Đăng Khương Academy`,
    description: courseData.desc,
    openGraph: {
      title: courseData.title,
      description: courseData.desc,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: courseData.title,
      description: courseData.desc,
    },
  };
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <TopBar title={courseData.title} subtitle="Khoá học" />

      <div className="flex h-[calc(100vh-112px)]">
        {/* Video Player Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Video */}
          <div className="rounded-xl overflow-hidden bg-black aspect-video mb-5 relative"
            style={{ border: "1px solid #2a2a2a" }}>
            {/* YouTube embed placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: "linear-gradient(135deg, #111 0%, #1a1a1a 100%)" }}>
              <PlayCircle size={64} className="text-[#22c55e] opacity-80" />
              <p className="text-gray-400 text-sm">5 loại sản phẩm số dễ tạo nhất</p>
              <p className="text-gray-600 text-xs">Bài học 3 — Chương 1 • 15:20</p>
            </div>
            {/* Watermark */}
            <div className="absolute bottom-3 right-3 text-[10px] text-white/20 select-none pointer-events-none">
              dangkhuong.com • Đăng Khương
            </div>
          </div>

          {/* Lesson Info */}
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white mb-2">5 loại sản phẩm số dễ tạo nhất</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Clock size={13} /> 15:20</span>
              <span className="flex items-center gap-1"><BookOpen size={13} /> Chương 1 • Bài 3</span>
            </div>
          </div>

          {/* Progress */}
          <div className="card-dark p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Tiến độ khoá học</span>
              <span className="text-sm font-bold text-[#22c55e]">{courseData.progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${courseData.progress}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Hoàn thành 7/20 bài học</p>
          </div>

          {/* Notes */}
          <div className="card-dark p-4">
            <h3 className="font-semibold text-white mb-2 text-sm">Ghi chú bài học</h3>
            <textarea
              placeholder="Ghi chú của bạn về bài học này..."
              className="w-full input-dark resize-none"
              rows={4}
            />
            <button className="btn-green mt-2 text-sm py-1.5 px-3">Lưu ghi chú</button>
          </div>
        </div>

        {/* Sidebar - Chapters */}
        <aside className="w-80 overflow-y-auto border-l border-[#2a2a2a] shrink-0"
          style={{ background: "#111" }}>
          <div className="p-4 border-b border-[#2a2a2a]">
            <h3 className="font-semibold text-white text-sm">Nội dung khoá học</h3>
            <p className="text-xs text-gray-500 mt-0.5">{courseData.chapters.length} chương • 20 bài học</p>
          </div>

          {courseData.chapters.map((chapter, ci) => (
            <div key={ci} className="border-b border-[#1f1f1f]">
              {/* Chapter header */}
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/3">
                <div className="flex items-center gap-2">
                  {chapter.locked && <Lock size={12} className="text-[#f59e0b]" />}
                  <span className="text-xs font-semibold text-gray-300">{chapter.title}</span>
                </div>
                <ChevronDown size={14} className="text-gray-600" />
              </div>

              {/* Lessons */}
              {!chapter.locked ? (
                chapter.lessons.map((lesson) => (
                  <div key={lesson.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors
                      ${lesson.active ? "bg-[#22c55e]/10" : "hover:bg-white/3"}`}>
                    {lesson.done
                      ? <CheckCircle size={15} className="text-[#22c55e] shrink-0" />
                      : <PlayCircle size={15} className={`shrink-0 ${lesson.active ? "text-[#22c55e]" : "text-gray-600"}`} />
                    }
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${lesson.active ? "text-[#22c55e] font-medium" : lesson.done ? "text-gray-400 line-through" : "text-gray-300"}`}>
                        {lesson.title}
                      </p>
                      <span className="text-[10px] text-gray-600">{lesson.duration}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 flex items-center gap-2">
                  <Lock size={12} className="text-[#f59e0b]" />
                  <span className="text-xs text-gray-500">Cần Quyền Đồng Hành</span>
                </div>
              )}
            </div>
          ))}

          {/* Certificate CTA */}
          <div className="p-4">
            <div className="rounded-lg p-3 text-center" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Award size={20} className="text-[#f59e0b] mx-auto mb-1.5" />
              <p className="text-xs font-medium text-[#f59e0b] mb-0.5">Chứng chỉ hoàn thành</p>
              <p className="text-[10px] text-gray-500">Hoàn thành 100% để nhận chứng chỉ</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

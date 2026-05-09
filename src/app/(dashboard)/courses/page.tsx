"use client";

import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { BookOpen, Clock, PlayCircle, Lock, CheckCircle, ChevronRight } from "lucide-react";
import CheckoutModal from "@/components/checkout/CheckoutModal";

const courses = [
  {
    id: "digital-snacks",
    title: "Digital Snacks — Kiếm tiền từ sản phẩm số",
    desc: "Học cách tạo và bán sản phẩm số (digital products) nhỏ gọn, giá thấp nhưng lợi nhuận cao. Không cần vốn lớn, không cần đội nhóm.",
    chapters: 4, lessons: 20, progress: 35,
    access: "member", badge: "Member Access",
    color: "#22c55e", icon: "📦",
  },
  {
    id: "marketing-01",
    title: "Marketing 0→1 — Xây dựng thương hiệu cá nhân",
    desc: "Từ con số 0, xây dựng thương hiệu cá nhân mạnh mẽ trên internet và thu hút khách hàng tự nhiên.",
    chapters: 6, lessons: 32, progress: 0,
    access: "free", badge: "Miễn phí",
    color: "#3b82f6", icon: "🚀",
  },
  {
    id: "email-mastery",
    title: "Email Marketing Mastery",
    desc: "Xây dựng danh sách email và tự động hoá chuỗi email bán hàng theo hành vi khách hàng.",
    chapters: 5, lessons: 28, progress: 0,
    access: "locked", badge: "Quyền Đồng Hành",
    color: "#a855f7", icon: "📧",
  },
  {
    id: "content-system",
    title: "Hệ Thống Content 30 Ngày",
    desc: "Tạo ra 30 ngày nội dung chất lượng chỉ trong 1 buổi làm việc. Template + quy trình có sẵn.",
    chapters: 3, lessons: 15, progress: 0,
    access: "locked", badge: "Quyền Đồng Hành",
    color: "#f59e0b", icon: "✍️",
  },
];

export default function CoursesPage() {
  const [checkoutProduct, setCheckoutProduct] = useState<{
    id: string; name: string; price: number; description?: string;
  } | null>(null);

  return (
    <div>
      <TopBar title="Khoá học" subtitle="Học từ những người đã làm được" />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Khoá học của tôi</h2>
          <p className="text-gray-400 text-sm mt-1">Bạn có quyền truy cập các khoá học bên dưới</p>
        </div>

        {/* Course List */}
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.id}
              className="card-dark p-5 hover:bg-[#1f1f1f] transition-all">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: course.color + "15" }}>
                  {course.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-white text-base">{course.title}</h3>
                        <span className={course.access === "locked" ? "badge-gold" : "badge-green"}>
                          {course.access === "locked" && <Lock size={10} className="mr-1" />}
                          {course.badge}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 leading-snug line-clamp-2">{course.desc}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} /> {course.chapters} chương
                    </span>
                    <span className="flex items-center gap-1">
                      <PlayCircle size={12} /> {course.lessons} bài học
                    </span>
                    {course.progress > 0 && (
                      <span className="flex items-center gap-1 text-[#22c55e]">
                        <CheckCircle size={12} /> {course.progress}% hoàn thành
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {course.progress > 0 && (
                    <div className="progress-bar mt-3 max-w-xs">
                      <div className="progress-fill" style={{ width: `${course.progress}%` }} />
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="shrink-0">
                  {course.access === "locked" ? (
                    <button className="btn-gold text-xs py-2 px-3"
                      onClick={() => setCheckoutProduct({
                        id: course.id,
                        name: course.title,
                        price: 1497000,
                        description: course.desc || "Truy cập toàn bộ nội dung khoá học",
                      })}>
                      <Lock size={12} />
                      Mở khoá
                    </button>
                  ) : (
                    <Link href={`/dashboard/courses/${course.id}`}
                      className="btn-green text-sm py-2 px-4">
                      <PlayCircle size={14} />
                      {course.progress > 0 ? "Tiếp tục" : "Vào học"}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Locked Courses CTA */}
        <div className="card-dark p-6 text-center border border-[#f59e0b]/20"
          style={{ background: "rgba(245,158,11,0.05)" }}>
          <div className="text-3xl mb-3">🔐</div>
          <h3 className="font-bold text-white mb-1">Mở khoá thêm {courses.filter(c => c.access === "locked").length} khoá học</h3>
          <p className="text-sm text-gray-400 mb-4">
            Nâng cấp Quyền Đồng Hành để truy cập toàn bộ khoá học + hỏi đáp 1-1 + zoom chữa bài
          </p>
          <button className="btn-gold">
            Nâng cấp Quyền Đồng Hành — 999K
          </button>
        </div>
      </div>

      {checkoutProduct && (
        <CheckoutModal
          product={checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
          onSuccess={() => {
            setCheckoutProduct(null);
            // Reload page để refresh unlock status
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

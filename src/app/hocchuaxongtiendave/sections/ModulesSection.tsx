"use client";

import { Check, BookOpen, Sparkles, Wrench, Megaphone } from "lucide-react";

const MODULES = [
  {
    number: 1,
    icon: BookOpen,
    title: "TÌM NGÁCH + THIẾT KẾ PHỄU SẢN PHẨM",
    meta: "9 bài học · 3 giờ video · Tuần 1",
    result: "Bạn có ngách rõ ràng — thiết kế xong phễu Value Ladder 5 tầng — Pre-sale validate được 5 khách trả tiền.",
    lessons: [
      "Tư duy về sản phẩm số 2026 — Hiểu bản thân trước",
      "7 tiêu chí ngách triệu đô",
      "Brainstorm ngách bằng Claude (10 prompt mẫu)",
      "Khảo sát thị trường — script khảo sát 10 khách",
      "Pre-sale validate — bán trước khi làm",
      "Thiết kế phễu Value Ladder 5 tầng",
      "Mapping sản phẩm cho từng tầng",
      "Tính LTV và CAC — công thức tài chính",
      "Customer Journey Map",
    ],
    value: "3.000.000đ",
    note: "Tương đương khóa Niche Research",
  },
  {
    number: 2,
    icon: Sparkles,
    title: "TẠO SẢN PHẨM SỐ BẰNG AI",
    meta: "7 bài học · 5 giờ video · Tuần 2",
    result: "Bạn có sản phẩm số hoàn chỉnh sẵn sàng để bán — Ebook PDF, Tài liệu chuyên ngành, Khóa học video, Template Canva/Notion hay Combo trọn gói.",
    lessons: [
      "Viết Ebook/Tài liệu bằng Claude (quy trình 7 bước + prompt mẫu)",
      "Thiết kế Ebook/Template bằng Canva (template free)",
      "Tạo Flipbook bằng Heyzine (hiệu ứng lật trang chuyên nghiệp)",
      "Tạo ảnh minh họa/Mockup bằng AI (Ideogram cho tiếng Việt đẹp)",
      "Quay video khóa học bằng OBS (tip không ngại lên hình)",
      "Upload YouTube Unlisted (bảo mật video không cho tải)",
      "Đóng gói combo (Bonus + Certificate + Cross-sell)",
    ],
    value: "5.000.000đ",
    note: "Tương đương khóa Content Creator",
  },
  {
    number: 3,
    icon: Wrench,
    title: "TỰ XÂY HỆ THỐNG BÁN + LMS BẰNG CLAUDE CODE",
    meta: "22 bài học · 14 giờ video · Tuần 3 · QUAN TRỌNG NHẤT",
    result: "Bạn có WEBSITE HOÀN CHỈNH — vừa bán hàng tự động vừa có trang giao sản phẩm số riêng giống dangkhuong.com. Bán được mọi loại sản phẩm số.",
    sections: [
      {
        title: "A. Nền tảng hệ thống",
        items: [
          "Mua domain + Setup DNS",
          "Deploy Next.js Vercel free",
          "Setup Supabase Database hoàn chỉnh",
        ],
      },
      {
        title: "B. Landing Page và Sales Page",
        items: [
          "Claude code Landing Page",
          "Claude code Sales Page chi tiết",
          "Form mua hàng + trang QR SePay",
        ],
      },
      {
        title: "C. Backend thanh toán tự động",
        items: [
          "API tạo đơn hàng + QR SePay",
          "API SePay webhook nhận tiền",
          "Resend gửi email tự động",
        ],
      },
      {
        title: "D. LMS — Đăng ký và cấp quyền tự động",
        items: [
          "Đăng ký - Đăng nhập học viên (Supabase Auth)",
          "Tự động tạo tài khoản khi thanh toán",
          "Email kích hoạt tài khoản",
          "Quên mật khẩu và bảo mật",
        ],
      },
      {
        title: "E. LMS — Giao diện trang học",
        items: [
          "Dashboard học viên",
          "Trang học khóa - Course Player",
          "Tracking tiến độ học real-time",
        ],
      },
      {
        title: "F. Admin Dashboard quản lý",
        items: [
          "Trang Admin login bảo mật",
          "Quản lý đơn hàng",
          "Quản lý khóa học",
          "Quản lý học viên",
        ],
      },
      {
        title: "G. Tính năng nâng cao",
        items: [
          "Certificate tự động",
          "Community + Comment box",
        ],
      },
    ],
    value: "50.000.000đ",
    note: "Nếu thuê dev tương đương 50-100 TRIỆU",
  },
  {
    number: 4,
    icon: Megaphone,
    title: "QUẢNG CÁO FACEBOOK",
    meta: "12 bài học · 6 giờ video · Tuần 4",
    result: "Bạn thành thạo Facebook Ads — biết setup tài khoản an toàn, viết quảng cáo, target đúng khách, đo lường và tối ưu.",
    sections: [
      {
        title: "A. Nền tảng quảng cáo",
        items: [
          "Setup Business Manager an toàn",
          "Tài khoản quảng cáo + thẻ thanh toán",
          "Pixel + Conversion API",
          "Audience Targeting 2026",
        ],
      },
      {
        title: "B. 2 chiến lược chính",
        items: [
          "Chiến lược 1 — Thu lead + Email nurture",
          "Chiến lược 2 — Bán thẳng + Upsell",
          "Khi nào dùng chiến lược nào",
        ],
      },
      {
        title: "C. Sáng tạo quảng cáo",
        items: [
          "Viết Ad Copy bằng Claude (10 template chốt đơn)",
          "Thiết kế ảnh quảng cáo",
          "Video Ad cho người mới",
        ],
      },
      {
        title: "D. Vận hành và tối ưu",
        items: [
          "Test - Scale - Tối ưu ROAS",
          "Cho người có kênh sẵn (không cần chạy ads)",
        ],
      },
    ],
    value: "4.000.000đ",
    note: "Tương đương khóa Facebook Ads",
  },
];

export default function ModulesSection() {
  return (
    <section
      className="relative overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-20 md:pt-24 md:pb-24 px-4 sm:px-6"
      style={{ background: "#050913" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-4">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{
              borderColor: "rgba(229,182,99,0.3)",
              background: "rgba(229,182,99,0.06)",
              color: "#E5B663",
            }}
          >
            <BookOpen size={12} /> Curriculum
          </span>
        </div>

        <h2
          className="mb-3 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold leading-[1.15]"
          style={{ color: "#F1F5FB", letterSpacing: "-0.01em" }}
        >
          Toàn Bộ Lộ Trình{" "}
          <span style={{ color: "#E5B663" }}>50 Bài Học</span>
        </h2>
        <p
          className="mb-10 sm:mb-12 text-center text-[14px] sm:text-base leading-[1.7]"
          style={{ color: "rgba(241,245,251,0.65)" }}
        >
          25-30 giờ video chi tiết · Dẫn dắt qua 4 MODULE từ A đến Z
        </p>

        <div className="space-y-6 sm:space-y-8">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.number}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                  border: "1px solid rgba(229,182,99,0.18)",
                }}
              >
                {/* Header */}
                <div
                  className="p-5 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5"
                  style={{
                    background: "linear-gradient(135deg, rgba(229,182,99,0.1) 0%, transparent 100%)",
                    borderBottom: "1px solid rgba(229,182,99,0.12)",
                  }}
                >
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div
                      className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #E5B663 0%, #C9A86B 100%)" }}
                    >
                      <Icon className="h-6 w-6 sm:h-[26px] sm:w-[26px]" style={{ color: "#0A1020" }} />
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#E5B663" }}>
                      Module {mod.number}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-lg sm:text-xl md:text-2xl font-bold mb-1.5 leading-[1.25]"
                      style={{ color: "#F1F5FB", letterSpacing: "-0.01em" }}
                    >
                      {mod.title}
                    </h3>
                    <p
                      className="text-[11px] sm:text-[12px] uppercase tracking-[0.12em]"
                      style={{ color: "rgba(241,245,251,0.55)" }}
                    >
                      {mod.meta}
                    </p>
                  </div>

                  <div
                    className="hidden lg:block text-right rounded-xl px-4 py-3 flex-shrink-0"
                    style={{
                      background: "rgba(229,182,99,0.08)",
                      border: "1px solid rgba(229,182,99,0.2)",
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] mb-1 font-semibold" style={{ color: "rgba(229,182,99,0.7)" }}>
                      Giá trị
                    </div>
                    <div className="text-base sm:text-lg font-extrabold tabular-nums" style={{ color: "#E5B663" }}>
                      {mod.value}
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  {/* Result */}
                  <div
                    className="rounded-xl p-4 sm:p-5 mb-5"
                    style={{
                      background: "rgba(52,211,153,0.05)",
                      border: "1px solid rgba(52,211,153,0.2)",
                    }}
                  >
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] mb-1.5 font-semibold" style={{ color: "#34D399" }}>
                      Kết quả sau Module
                    </div>
                    <p className="text-[13.5px] sm:text-[14.5px] leading-[1.7]" style={{ color: "rgba(241,245,251,0.85)" }}>
                      {mod.result}
                    </p>
                  </div>

                  {/* Lessons */}
                  {mod.lessons && (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
                      {mod.lessons.map((lesson) => (
                        <li key={lesson} className="flex items-start gap-2.5">
                          <span
                            className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                            style={{ background: "rgba(229,182,99,0.15)", border: "1px solid rgba(229,182,99,0.3)" }}
                          >
                            <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#E5B663" }} />
                          </span>
                          <span className="text-[13.5px] sm:text-[14px] leading-[1.6]" style={{ color: "rgba(241,245,251,0.78)" }}>
                            {lesson}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Sections (for module 3 & 4) */}
                  {mod.sections && (
                    <div className="space-y-4">
                      {mod.sections.map((sec) => (
                        <div key={sec.title}>
                          <h4
                            className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.12em] mb-2.5"
                            style={{ color: "#E5B663" }}
                          >
                            {sec.title}
                          </h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
                            {sec.items.map((it) => (
                              <li key={it} className="flex items-start gap-2.5">
                                <span
                                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                                  style={{ background: "rgba(229,182,99,0.12)", border: "1px solid rgba(229,182,99,0.25)" }}
                                >
                                  <Check className="h-3 w-3" strokeWidth={3} style={{ color: "#E5B663" }} />
                                </span>
                                <span className="text-[13.5px] sm:text-[14px] leading-[1.6]" style={{ color: "rgba(241,245,251,0.74)" }}>
                                  {it}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Value note — mobile bottom row */}
                  <div
                    className="mt-5 lg:hidden flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(229,182,99,0.06)",
                      border: "1px solid rgba(229,182,99,0.2)",
                    }}
                  >
                    <span
                      className="text-[12.5px] sm:text-[13px] italic"
                      style={{ color: "rgba(241,245,251,0.7)" }}
                    >
                      💎 {mod.note}
                    </span>
                    <span
                      className="text-base sm:text-lg font-extrabold tabular-nums flex-shrink-0"
                      style={{ color: "#E5B663" }}
                    >
                      {mod.value}
                    </span>
                  </div>
                  <p
                    className="mt-4 hidden lg:block text-[12.5px] sm:text-[13px] italic"
                    style={{ color: "rgba(241,245,251,0.55)" }}
                  >
                    💎 {mod.note}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div
          className="mt-10 rounded-2xl p-6 sm:p-8 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(229,182,99,0.18) 0%, rgba(229,182,99,0.04) 100%)",
            border: "1px solid rgba(229,182,99,0.4)",
          }}
        >
          <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] mb-2 font-semibold" style={{ color: "#E5B663" }}>
            Tổng giá trị 4 Module
          </div>
          <div
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-2 tabular-nums"
            style={{
              background: "linear-gradient(135deg, #E5B663 0%, #F4D9A8 50%, #C9A86B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.02em",
            }}
          >
            62.000.000đ
          </div>
          <p className="text-[13.5px] sm:text-[14.5px] leading-[1.7]" style={{ color: "rgba(241,245,251,0.65)" }}>
            50 bài học · 28 giờ video · 4 module hoàn chỉnh
          </p>
        </div>
      </div>
    </section>
  );
}

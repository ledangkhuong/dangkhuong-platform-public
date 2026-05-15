"use client";

import { Check } from "lucide-react";

const MODULES = [
  {
    number: 1,
    title: "TƯ DUY ĐÚNG VỀ SẢN PHẨM SỐ",
    bullets: [
      "Hiểu đúng về thị trường sản phẩm số 2026",
      "7 mô hình kinh doanh số đang HOT toàn cầu",
      "Cách chọn ngách (niche) sinh lời cho người Việt",
      'Tránh 5 sai lầm "chết người" của người mới',
    ],
  },
  {
    number: 2,
    title: "TẠO SẢN PHẨM SỐ NHANH VỚI AI",
    bullets: [
      "Dùng AI tạo ebook 200 trang trong 3 ngày",
      "Tạo khóa học online từ A-Z không cần quay video",
      "Thiết kế sản phẩm số đẹp mà không cần biết design",
      "Định giá sản phẩm số đúng cách (không bán rẻ mạt)",
    ],
  },
  {
    number: 3,
    title: "XÂY DỰNG THƯƠNG HIỆU CÁ NHÂN",
    bullets: [
      "Định vị bản thân là chuyên gia trong ngách",
      "Content chiến lược trên Facebook, TikTok, YouTube",
      "Tạo niềm tin và uy tín trong 30 ngày",
      "Biến follower thành khách hàng trung thành",
    ],
  },
  {
    number: 4,
    title: "HỆ THỐNG BÁN HÀNG TỰ ĐỘNG",
    bullets: [
      "Xây phễu bán hàng (sales funnel) tự động 24/7",
      "Email marketing automation chuyên nghiệp",
      "Landing page chuyển đổi cao 15-30%",
      "AI Agent chăm sóc khách hàng tự động",
    ],
  },
  {
    number: 5,
    title: "SCALE — NHÂN ĐÔI THU NHẬP",
    bullets: [
      "Quảng cáo Facebook/Google hiệu quả cho sản phẩm số",
      "Affiliate marketing — Có đội bán hàng cho bạn",
      "Tự động hóa toàn bộ với AI Agent",
      "Lộ trình đạt 100 triệu/tháng từ sản phẩm số",
    ],
  },
];

export default function ModulesSection() {
  return (
    <section
      className="py-12 sm:py-20 md:py-28 px-4 sm:px-6"
      style={{ background: "#0a0a0a" }}
    >
      <div className="mx-auto max-w-5xl">
        {/* Headline */}
        <h2
          className="mb-12 text-center text-2xl font-bold tracking-tight sm:mb-16 sm:text-3xl md:text-4xl"
          style={{ color: "#ffffff" }}
        >
          LỘ TRÌNH 5 BƯỚC KIẾM TIỀN TỪ SẢN PHẨM SỐ 2026
        </h2>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting line */}
          <div
            className="absolute left-5 top-0 hidden h-full w-px sm:block"
            style={{ background: "rgba(251,191,36,0.25)" }}
          />

          <div className="flex flex-col gap-8">
            {MODULES.map((mod, idx) => (
              <div key={mod.number} className="relative flex gap-6">
                {/* Timeline dot */}
                <div className="relative z-10 hidden flex-shrink-0 sm:flex sm:flex-col sm:items-center">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: "#FBBF24", color: "#000000" }}
                  >
                    {mod.number}
                  </div>
                  {/* Extra line segment below the last dot to fill gap */}
                  {idx < MODULES.length - 1 && (
                    <div
                      className="mt-0 w-px flex-1"
                      style={{ background: "rgba(251,191,36,0.25)" }}
                    />
                  )}
                </div>

                {/* Card */}
                <div
                  className="flex-1 rounded-2xl border p-6"
                  style={{
                    background: "#111111",
                    borderColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Mobile number badge */}
                  <div className="mb-3 flex items-center gap-3 sm:hidden">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={{ background: "#FBBF24", color: "#000000" }}
                    >
                      {mod.number}
                    </div>
                    <h3
                      className="text-base font-bold"
                      style={{ color: "#ffffff" }}
                    >
                      {mod.title}
                    </h3>
                  </div>

                  {/* Desktop title */}
                  <h3
                    className="mb-4 hidden text-lg font-bold sm:block"
                    style={{ color: "#ffffff" }}
                  >
                    {mod.title}
                  </h3>

                  {/* Bullets */}
                  <ul className="flex flex-col gap-2.5">
                    {mod.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                          style={{ background: "#22c55e" }}
                        >
                          <Check
                            className="h-3 w-3 text-white"
                            strokeWidth={3}
                          />
                        </span>
                        <span
                          className="text-sm sm:text-base"
                          style={{ color: "rgba(255,255,255,0.85)" }}
                        >
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

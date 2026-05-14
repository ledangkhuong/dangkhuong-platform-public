"use client";

import Image from "next/image";

/* ─── Data ───────────────────────────────────────────── */

const STATS = [
  {
    icon: "👥",
    label: "Subscribers",
    value: "372.000",
    sub: "chỉ từ 38 video",
  },
  {
    icon: "👁️",
    label: "Views 28 ngày",
    value: "6.150.000",
    sub: "+3.9M",
  },
  {
    icon: "📈",
    label: "Tăng trưởng",
    value: "+182.94%",
    sub: "trong 1 tháng",
  },
  {
    icon: "💰",
    label: "Doanh thu",
    value: "$16K-$45K",
    sub: "/tháng",
  },
  {
    icon: "🎬",
    label: "Video viral nhất",
    value: "4.5 TRIỆU",
    sub: "views",
  },
  {
    icon: "⏰",
    label: "Tần suất",
    value: "1 video",
    sub: "/tuần",
  },
];

const ANALYSIS_POINTS = [
  "1 video = $420 - $1.180 doanh thu trung bình",
  "Không cần lên hình – tất cả là nhân vật hoạt hình Pixar",
  "Không cần giỏi tiếng Anh – kịch bản A2 cơ bản, có AI hỗ trợ",
  "Thị trường 1.5 TỶ người học tiếng Anh trên toàn cầu",
];

/* ─── Component ──────────────────────────────────────── */

export default function ProofSection() {
  return (
    <section
      id="proof"
      className="relative overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        {/* ── Title ── */}
        <h2 className="mx-auto max-w-3xl text-center text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          Có Thật Một Kênh YouTube Kiếm{" "}
          <span style={{ color: "#FBBF24" }}>$30.000/Tháng</span> Bằng
          AI Không?
        </h2>

        {/* ── Banner images ── */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10">
            <Image
              src="/images/slowenglish/banner-standard.png"
              alt="YouTube channel banner - Standard"
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10">
            <Image
              src="/images/slowenglish/banner-ultra.png"
              alt="YouTube channel banner - Ultra"
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-5 transition-colors hover:border-white/20"
              style={{
                backgroundColor: "#111",
                border: "1px solid #1f1f1f",
              }}
            >
              <span className="text-2xl">{stat.icon}</span>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                {stat.label}
              </p>
              <p
                className="mt-1 text-2xl font-bold sm:text-3xl"
                style={{ color: "#FBBF24" }}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 text-sm text-gray-500">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Analysis box ── */}
        <div
          className="mt-14 rounded-xl p-6 sm:p-8"
          style={{
            backgroundColor: "#111",
            borderLeft: "4px solid #FBBF24",
          }}
        >
          <h3
            className="text-lg font-bold sm:text-xl"
            style={{ color: "#FBBF24" }}
          >
            Phân tích nhanh
          </h3>
          <ul className="mt-4 space-y-3">
            {ANALYSIS_POINTS.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-300">
                <span
                  className="mt-1.5 block h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: "#FBBF24" }}
                />
                <span className="text-sm leading-relaxed sm:text-base">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Bottom callout ── */}
        <div className="mt-14 text-center">
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            Câu hỏi không phải{" "}
            <span className="font-semibold text-white">
              &lsquo;Có thật không?&rsquo;
            </span>{" "}
            — Câu hỏi là:{" "}
            <span className="font-semibold" style={{ color: "#FBBF24" }}>
              &lsquo;Bạn có muốn học công thức này không?&rsquo;
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

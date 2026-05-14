"use client";

import { Check, Video, Scissors } from "lucide-react";

/* ─── Data ───────────────────────────────────────────── */

const VIDEO_1_STEPS = [
  "Bước 1: Cách lên ý tưởng kịch bản Slow English đúng level A2",
  "Bước 2: Setup tài khoản VEO 3.1 tiết kiệm nhất",
  "Bước 3: Cách viết prompt để có nhân vật Pixar nhất quán",
  "Bước 4: Generate cảnh hàng loạt nhanh nhất",
  "Bước 5: Tổng hợp clip thô sẵn sàng edit",
];

const VIDEO_2_STEPS = [
  "Setup project CapCut chuẩn YouTube long-form",
  "Ghép cảnh mượt mà như Pixar",
  "Voiceover tiếng Anh chuẩn bản xứ bằng AI",
  "Phụ đề tiếng Anh chuyên nghiệp (highlight từng từ)",
  "Mix âm thanh 3 layer chuyên nghiệp",
  "Xuất file chuẩn YouTube 4K",
];

/* ─── Component ──────────────────────────────────────── */

export default function CourseContentSection() {
  return (
    <section
      id="course-content"
      className="relative overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        {/* ── Title ── */}
        <h2 className="mx-auto max-w-4xl text-center text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          Làm Video YouTube Slow English Bằng{" "}
          <span style={{ color: "#FBBF24" }}>VEO 3.1</span> &{" "}
          <span style={{ color: "#FBBF24" }}>CapCut</span> – Phiên Bản Tối
          Giản
        </h2>

        {/* ── Subtitle ── */}
        <p
          className="mt-4 text-center text-lg font-bold uppercase tracking-wider sm:text-xl"
          style={{ color: "#FBBF24" }}
        >
          Triết lý khóa học: ÍT MÀ CHẤT – XEM LÀ LÀM ĐƯỢC
        </p>

        {/* ── Intro text ── */}
        <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-gray-400 sm:text-lg">
          Trong khi các khóa học khác cho bạn 50 bài giảng... Chúng tôi tin
          rằng bạn chỉ cần{" "}
          <span className="font-semibold text-white">2 video CỐT LÕI</span> +
          bộ tài nguyên ĐÚNG là đủ để ra video đầu tiên trong vòng{" "}
          <span className="font-semibold" style={{ color: "#FBBF24" }}>
            48 giờ
          </span>
          .
        </p>

        {/* ── Cards ── */}
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1 – VEO 3.1 */}
          <div
            className="flex flex-col rounded-2xl"
            style={{
              backgroundColor: "#111",
              borderTop: "4px solid #FBBF24",
              border: "1px solid #1f1f1f",
              borderTopColor: "#FBBF24",
              borderTopWidth: "4px",
            }}
          >
            <div className="p-6 sm:p-8">
              {/* Card header */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "rgba(251, 191, 36, 0.15)" }}
                >
                  <Video className="h-5 w-5" style={{ color: "#FBBF24" }} />
                </div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">
                  VIDEO 1: Hướng Dẫn Làm Video (VEO 3.1)
                </h3>
              </div>

              {/* Duration */}
              <p className="mt-4 text-sm text-gray-400">
                Thời lượng:{" "}
                <span className="font-semibold text-white">~60-90 phút</span>
              </p>

              {/* Steps */}
              <ul className="mt-6 space-y-4">
                {VIDEO_1_STEPS.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "rgba(34, 197, 94, 0.15)" }}
                    >
                      <Check
                        className="h-3.5 w-3.5"
                        style={{ color: "#22c55e" }}
                      />
                    </span>
                    <span className="text-sm leading-relaxed text-gray-300 sm:text-base">
                      {step}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom callout */}
            <div className="mt-auto">
              <div
                className="rounded-b-2xl px-6 py-4 sm:px-8"
                style={{
                  backgroundColor: "rgba(251, 191, 36, 0.08)",
                  borderTop: "1px solid rgba(251, 191, 36, 0.2)",
                }}
              >
                <p className="text-sm font-semibold sm:text-base">
                  <span style={{ color: "#FBBF24" }}>Sau Video 1:</span>{" "}
                  <span className="text-gray-300">
                    Bạn sẽ có toàn bộ clip thô cho 1 video hoàn chỉnh.
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 – CapCut */}
          <div
            className="flex flex-col rounded-2xl"
            style={{
              backgroundColor: "#111",
              border: "1px solid #1f1f1f",
              borderTopColor: "#3b82f6",
              borderTopWidth: "4px",
            }}
          >
            <div className="p-6 sm:p-8">
              {/* Card header */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "rgba(59, 130, 246, 0.15)" }}
                >
                  <Scissors
                    className="h-5 w-5"
                    style={{ color: "#3b82f6" }}
                  />
                </div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">
                  VIDEO 2: Hướng Dẫn Edit (CapCut)
                </h3>
              </div>

              {/* Duration */}
              <p className="mt-4 text-sm text-gray-400">
                Thời lượng:{" "}
                <span className="font-semibold text-white">~60-90 phút</span>
              </p>

              {/* Steps */}
              <ul className="mt-6 space-y-4">
                {VIDEO_2_STEPS.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "rgba(34, 197, 94, 0.15)" }}
                    >
                      <Check
                        className="h-3.5 w-3.5"
                        style={{ color: "#22c55e" }}
                      />
                    </span>
                    <span className="text-sm leading-relaxed text-gray-300 sm:text-base">
                      {step}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom callout */}
            <div className="mt-auto">
              <div
                className="rounded-b-2xl px-6 py-4 sm:px-8"
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.08)",
                  borderTop: "1px solid rgba(59, 130, 246, 0.2)",
                }}
              >
                <p className="text-sm font-semibold sm:text-base">
                  <span style={{ color: "#3b82f6" }}>Sau Video 2:</span>{" "}
                  <span className="text-gray-300">
                    Bạn có 1 video hoàn chỉnh sẵn sàng đăng YouTube.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

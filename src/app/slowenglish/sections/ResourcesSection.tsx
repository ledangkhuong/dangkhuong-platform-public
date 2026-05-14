"use client";

import { FileText, Music, Check } from "lucide-react";

/* ─── Data ───────────────────────────────────────────── */

const CARDS = [
  {
    icon: FileText,
    title: "📁 File Prompt VEO 3.1 Độc Quyền",
    subtitle: "Giá trị: 1.500.000đ",
    accentColor: "#a855f7",
    items: [
      "Bộ Prompt Character Sheet – Tạo nhân vật Pixar nhất quán 100% (nam, nữ, trẻ em, người già, con vật)",
      "Bộ Prompt Scene – 30+ prompt cảnh đã test (ngoại cảnh, nội thất, hành động, cảm xúc)",
      "Bộ Prompt cứu cảnh lỗi – negative prompt, re-generate giữ 90% cảnh cũ",
      "File hướng dẫn dùng Prompt (PDF)",
    ],
  },
  {
    icon: Music,
    title: "🎵 Bộ Âm Thanh Bản Quyền",
    subtitle: "Giá trị: 1.000.000đ",
    accentColor: "#10b981",
    items: [
      "100+ nhạc nền theo mood (vui tươi, hồi hộp, cảm động, hoạt động)",
      "200+ sound effects Pixar-style (tiếng cười, bước chân, môi trường, chuyển cảnh)",
      "File hướng dẫn sử dụng + danh mục theo chủ đề",
      "Không bị YouTube đánh bản quyền – 100% free-to-use",
    ],
  },
];

/* ─── Component ──────────────────────────────────────── */

export default function ResourcesSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        {/* ── Section title ── */}
        <h2 className="mx-auto max-w-3xl text-center text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          Bonus{" "}
          <span style={{ color: "#FBBF24" }}>
            Tr&#7883; Gi&#225; 2.500.000&#273;
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-gray-400">
          T&#7863;ng k&#232;m ho&#224;n to&#224;n MI&#7876;N PH&#205; khi
          &#273;&#259;ng k&#253; h&#244;m nay
        </p>

        {/* ── Cards grid ── */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-2xl p-6 transition-all duration-300 hover:translate-y-[-2px] sm:p-8"
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #1f1f1f",
                  borderTop: `3px solid ${card.accentColor}`,
                  boxShadow: `0 0 30px ${card.accentColor}15`,
                }}
              >
                {/* Card header */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${card.accentColor}15`,
                    }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: card.accentColor }}
                    />
                  </div>
                  <h3
                    className="text-xl font-bold md:text-2xl"
                    style={{ color: card.accentColor }}
                  >
                    {card.title}
                  </h3>
                </div>

                {/* Subtitle with strikethrough value */}
                <p className="mt-3 text-base text-gray-400">
                  <span
                    className="font-semibold line-through"
                    style={{ color: card.accentColor }}
                  >
                    {card.subtitle}
                  </span>
                </p>

                {/* Items */}
                <ul className="mt-5 space-y-3">
                  {card.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-gray-300"
                    >
                      <Check
                        className="mt-0.5 h-5 w-5 flex-shrink-0"
                        style={{ color: card.accentColor }}
                      />
                      <span className="text-sm leading-relaxed sm:text-base">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

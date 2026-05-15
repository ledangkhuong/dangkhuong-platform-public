"use client";

/* ─── Data ───────────────────────────────────────────── */

const ACHIEVEMENTS = [
  "Founder KOHADA — AI Technology · Training · Video",
  "10+ năm kinh nghiệm trong lĩnh vực Marketing, Sức khỏe & Kinh doanh online",
  "Đã đào tạo 10.000+ học viên trên khắp Việt Nam",
  "Chuyên gia xây dựng hệ thống bán hàng tự động bằng AI Agent",
  "Tác giả nhiều chương trình bestseller về thương hiệu cá nhân",
  "Diễn giả tại 100+ sự kiện lớn về AI & Kinh doanh số",
];

/* ─── Component ──────────────────────────────────────── */

export default function SpeakerSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#0d0d0d" }}
    >
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 md:py-28">
        {/* ── Headline ── */}
        <h2 className="mx-auto max-w-4xl text-center text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
          AI SẼ DẪN DẮT BẠN TRÊN HÀNH TRÌNH NÀY?
        </h2>

        {/* ── Speaker card ── */}
        <div
          className="mx-auto mt-12 max-w-2xl rounded-2xl p-8 sm:p-10 md:mt-16"
          style={{
            backgroundColor: "#111",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            boxShadow: "0 0 40px rgba(251, 191, 36, 0.08)",
          }}
        >
          {/* ── Name ── */}
          <h3
            className="text-center text-2xl font-extrabold tracking-wide sm:text-3xl"
            style={{ color: "#FBBF24" }}
          >
            TRAINER LÊ ĐĂNG KHƯƠNG
          </h3>

          {/* ── Subtitle ── */}
          <p className="mt-3 text-center text-sm italic text-gray-400 sm:text-base">
            Chuyên gia AI & Thương hiệu cá nhân hàng đầu Việt Nam
          </p>

          {/* ── Divider ── */}
          <div
            className="mx-auto my-6 h-px w-16"
            style={{ backgroundColor: "rgba(251, 191, 36, 0.3)" }}
          />

          {/* ── Achievements ── */}
          <ul className="space-y-4">
            {ACHIEVEMENTS.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-sm leading-relaxed text-gray-300 sm:text-base"
              >
                <span className="mt-0.5 flex-shrink-0">{"🏆"}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Bottom quote ── */}
        <div
          className="mx-auto mt-12 max-w-2xl rounded-lg py-5 pl-6 pr-6 md:mt-16"
          style={{
            backgroundColor: "rgba(251, 191, 36, 0.03)",
            borderLeft: "3px solid #FBBF24",
          }}
        >
          <p className="text-sm italic leading-relaxed text-gray-400 sm:text-base">
            &ldquo;Tôi tin rằng mỗi chuyên gia Việt Nam đều xứng đáng có một thương hiệu cá nhân mạnh và một hệ thống kinh doanh tự động — Để có nhiều thời gian sống cân bằng theo Bánh Xe Cuộc Đời.&rdquo;
          </p>
          <p
            className="mt-3 text-right text-sm font-semibold"
            style={{ color: "#FBBF24" }}
          >
            — Trainer Lê Đăng Khương
          </p>
        </div>
      </div>
    </section>
  );
}

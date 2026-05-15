"use client";

/* ─── Data ───────────────────────────────────────────── */

const COMPARISON_DATA = [
  {
    physical: "Cần vốn nhập hàng lớn",
    digital: "Vốn gần như = 0",
  },
  {
    physical: "Tồn kho, hư hỏng",
    digital: "Bán vô hạn, không tồn kho",
  },
  {
    physical: "Ship hàng, đổi trả mệt mỏi",
    digital: "Giao hàng tự động 24/7",
  },
  {
    physical: "Lãi 10-30%",
    digital: "Lãi 80-95%",
  },
  {
    physical: "Bán 1 sản phẩm = 1 lần tiền",
    digital: "Bán 1 lần = thu tiền mãi mãi",
  },
  {
    physical: "Phụ thuộc địa lý",
    digital: "Bán toàn cầu, không biên giới",
  },
];

const PRODUCT_TYPES = [
  { emoji: "📚", label: "Ebook, khóa học online" },
  { emoji: "🎨", label: "Template, preset, design" },
  { emoji: "🤖", label: "AI prompt, AI tool" },
  { emoji: "📱", label: "App, phần mềm, SaaS" },
  { emoji: "🎵", label: "Nhạc, video, hình ảnh stock" },
  { emoji: "📊", label: "Báo cáo, dữ liệu chuyên ngành" },
];

/* ─── Component ──────────────────────────────────────── */

export default function SolutionSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 md:py-28">
        {/* ── Headline ── */}
        <h2 className="mx-auto max-w-4xl text-center text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
          KINH DOANH SẢN PHẨM SỐ — XU HƯỚNG TỶ ĐÔ 2026
        </h2>

        {/* ── Sub-headline ── */}
        <p
          className="mt-4 text-center text-lg font-semibold sm:text-xl"
          style={{ color: "#FBBF24" }}
        >
          Tại sao SẢN PHẨM SỐ là &ldquo;mỏ vàng&rdquo; 2026?
        </p>

        {/* ── Comparison table ── */}
        <div
          className="mt-12 overflow-hidden rounded-2xl md:mt-16"
          style={{
            backgroundColor: "#111",
            border: "1px solid #1f1f1f",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left">
              <thead>
                <tr style={{ borderBottom: "1px solid #1f1f1f" }}>
                  <th
                    className="w-1/2 px-5 py-4 text-sm font-semibold uppercase tracking-wider sm:px-6 sm:py-5 sm:text-base"
                    style={{
                      color: "#ef4444",
                      backgroundColor: "rgba(239,68,68,0.08)",
                    }}
                  >
                    Sản phẩm vật lý &#10060;
                  </th>
                  <th
                    className="w-1/2 px-5 py-4 text-sm font-semibold uppercase tracking-wider sm:px-6 sm:py-5 sm:text-base"
                    style={{
                      color: "#22c55e",
                      backgroundColor: "rgba(34,197,94,0.08)",
                    }}
                  >
                    Sản phẩm SỐ &#9989;
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_DATA.map((row, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom:
                        index < COMPARISON_DATA.length - 1
                          ? "1px solid #1f1f1f"
                          : "none",
                    }}
                  >
                    <td
                      className="px-5 py-4 text-sm font-medium sm:px-6 sm:py-5 sm:text-base"
                      style={{
                        color: "#fca5a5",
                        backgroundColor: "rgba(239,68,68,0.05)",
                      }}
                    >
                      {row.physical}
                    </td>
                    <td
                      className="px-5 py-4 text-sm font-medium sm:px-6 sm:py-5 sm:text-base"
                      style={{
                        color: "#86efac",
                        backgroundColor: "rgba(34,197,94,0.05)",
                      }}
                    >
                      {row.digital}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Product types grid ── */}
        <div className="mt-12 md:mt-16">
          <h3 className="text-center text-lg font-bold text-white sm:text-xl">
            Sản phẩm số bao gồm:
          </h3>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCT_TYPES.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 rounded-xl px-5 py-4"
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #1f1f1f",
                }}
              >
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-sm font-medium text-gray-200 sm:text-base">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom quote box ── */}
        <div
          className="mt-12 rounded-xl p-6 sm:p-8 md:mt-16"
          style={{
            backgroundColor: "rgba(251, 191, 36, 0.05)",
            border: "1px solid #FBBF24",
          }}
        >
          <p className="text-center text-sm leading-relaxed text-gray-200 sm:text-base">
            Theo Statista, thị trường sản phẩm số toàn cầu sẽ đạt{" "}
            <span className="font-bold" style={{ color: "#FBBF24" }}>
              1.500 TỶ USD
            </span>{" "}
            vào 2027 — Đây là cơ hội{" "}
            <span className="font-bold" style={{ color: "#FBBF24" }}>
              VÀNG
            </span>{" "}
            cho người Việt!
          </p>
        </div>
      </div>
    </section>
  );
}

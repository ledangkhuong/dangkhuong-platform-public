"use client";

/* ─── Data ───────────────────────────────────────────── */

const COMPARISON_ROWS = [
  {
    method: "Tự mò trên YouTube",
    cost: "0đ",
    time: "3-6 tháng",
    result: "70% bỏ cuộc giữa chừng",
    highlighted: false,
  },
  {
    method: "Thuê freelancer làm 1 video",
    cost: "3-5 triệu/video",
    time: "Phụ thuộc người làm",
    result: "Không có kiến thức tự làm tiếp",
    highlighted: false,
  },
  {
    method: "Mua khóa học AI nước ngoài",
    cost: "5-12 triệu",
    time: "30-50 giờ học",
    result: "Quá nhiều lý thuyết",
    highlighted: false,
  },
  {
    method: "Tự thử & sai VEO + CapCut",
    cost: "10-20 triệu",
    time: "6-12 tháng",
    result: "Đầy frustration",
    highlighted: false,
  },
  {
    method: "GÓI ĐỒNG HÀNH 789K",
    cost: "789.000đ",
    time: "48 giờ",
    result: "Có người hỗ trợ đến khi làm được",
    highlighted: true,
  },
];

const ROI_POINTS = [
  "1 video YouTube viral 100K views = ~$300-500 doanh thu",
  "Vốn bỏ ra: 789K (~$31)",
  "ROI x10 - x15 lần ngay từ video đầu tiên",
  "Emma Daily English thu $420-$1.180/video. Bạn chỉ cần đạt 50% — đã thu hồi vốn x5 lần.",
];

/* ─── Component ──────────────────────────────────────── */

export default function ComparisonSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-20 sm:px-6 md:py-28 lg:px-8">
        {/* ── Title ── */}
        <h2 className="mx-auto max-w-4xl text-center text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          Tại Sao{" "}
          <span style={{ color: "#FBBF24" }}>789K</span> Là Quyết Định
          Thông Minh Nhất?
        </h2>

        {/* ── Comparison table ── */}
        <div
          className="mt-12 overflow-hidden rounded-2xl md:mt-16"
          style={{
            backgroundColor: "#111",
            border: "1px solid #1f1f1f",
          }}
        >
          {/* Scrollable wrapper for mobile */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #1f1f1f",
                  }}
                >
                  {["Phương án", "Chi phí", "Thời gian", "Kết quả"].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-5 py-4 text-xs font-semibold uppercase tracking-wider sm:px-6 sm:py-5 sm:text-sm"
                        style={{ color: "#FBBF24" }}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, index) => (
                  <tr
                    key={index}
                    style={{
                      backgroundColor: row.highlighted
                        ? "rgba(251, 191, 36, 0.1)"
                        : "transparent",
                      borderBottom:
                        index < COMPARISON_ROWS.length - 1
                          ? "1px solid #1f1f1f"
                          : row.highlighted
                            ? "2px solid #FBBF24"
                            : "none",
                      borderTop: row.highlighted
                        ? "2px solid #FBBF24"
                        : "none",
                    }}
                  >
                    <td
                      className={`px-5 py-4 text-sm sm:px-6 sm:py-5 sm:text-base ${
                        row.highlighted ? "font-bold" : "font-medium"
                      }`}
                      style={{
                        color: row.highlighted ? "#FBBF24" : "#ffffff",
                      }}
                    >
                      {row.method}
                    </td>
                    <td
                      className={`px-5 py-4 text-sm sm:px-6 sm:py-5 sm:text-base ${
                        row.highlighted ? "font-bold" : ""
                      }`}
                      style={{
                        color: row.highlighted ? "#FBBF24" : "#d1d5db",
                      }}
                    >
                      {row.cost}
                    </td>
                    <td
                      className={`px-5 py-4 text-sm sm:px-6 sm:py-5 sm:text-base ${
                        row.highlighted ? "font-bold" : ""
                      }`}
                      style={{
                        color: row.highlighted ? "#FBBF24" : "#d1d5db",
                      }}
                    >
                      {row.time}
                    </td>
                    <td
                      className={`px-5 py-4 text-sm sm:px-6 sm:py-5 sm:text-base ${
                        row.highlighted ? "font-bold" : ""
                      }`}
                      style={{
                        color: row.highlighted ? "#FBBF24" : "#d1d5db",
                      }}
                    >
                      {row.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── ROI calculation box ── */}
        <div
          className="mt-12 rounded-xl p-6 sm:p-8 md:mt-16"
          style={{
            backgroundColor: "rgba(251, 191, 36, 0.05)",
            borderLeft: "4px solid #FBBF24",
          }}
        >
          <h3
            className="text-lg font-bold sm:text-xl"
            style={{ color: "#FBBF24" }}
          >
            <span className="mr-2">💰</span>
            Tính nhanh ROI:
          </h3>
          <ul className="mt-4 space-y-3">
            {ROI_POINTS.map((point, i) => (
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
      </div>
    </section>
  );
}

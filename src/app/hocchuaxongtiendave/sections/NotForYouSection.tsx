"use client";

import { XCircle, Ban } from "lucide-react";

const NOT_FOR_YOU = [
  {
    title: "Bạn muốn 'ăn ngay' không thực hành",
    body: "AI Agent rất mạnh — nhưng bạn vẫn phải biết đặt bài toán đúng. Chương trình yêu cầu THỰC HÀNH 1-2 tiếng/ngày. Nếu chỉ muốn xem video và mong tiền tự về — hãy tìm lớp khác.",
  },
  {
    title: "Bạn không có chuyên môn / kỹ năng nào",
    body: "Chương trình này dạy cách SỐ HÓA chuyên môn/kỹ năng. Nếu chưa có gì để chia sẻ — bạn cần phát triển kỹ năng trước, rồi quay lại.",
  },
  {
    title: "Bạn không muốn đầu tư công cụ tối thiểu",
    body: "Bạn cần ~600K/tháng cho công cụ (Claude Pro, Domain, SePay). Nếu khoản này quá tải lúc này — hãy cân nhắc.",
  },
  {
    title: "Bạn dễ bỏ cuộc khi gặp khó",
    body: "Có những bước hơi phức tạp (setup Supabase, deploy Vercel). Bạn cần kiên nhẫn 30 phút - 1 tiếng đầu để vượt qua. Nếu dễ nản — chương trình này không hợp.",
  },
];

export default function NotForYouSection() {
  return (
    <section
      className="relative overflow-hidden py-14 sm:py-20 md:py-24 px-4 sm:px-6"
      style={{ background: "#050913" }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-5">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{
              borderColor: "rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.06)",
              color: "#F87171",
            }}
          >
            <Ban size={12} /> Loại Trừ
          </span>
        </div>

        <h2
          className="mb-4 text-center text-[26px] font-extrabold leading-tight sm:text-3xl md:text-4xl"
          style={{ color: "#F1F5FB", letterSpacing: "-0.01em" }}
        >
          Chương Trình Này <span style={{ color: "#F87171" }}>KHÔNG Dành Cho Ai?</span>
        </h2>
        <p
          className="mb-12 text-center text-base sm:text-lg"
          style={{ color: "rgba(241,245,251,0.6)" }}
        >
          Tôi muốn rõ ràng — không phải ai cũng phù hợp:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {NOT_FOR_YOU.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl p-5 sm:p-6"
              style={{
                background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderLeft: "3px solid #E63946",
              }}
            >
              <XCircle className="mt-0.5 h-6 w-6 flex-shrink-0" style={{ color: "#F87171" }} />
              <div>
                <h3 className="text-[15px] sm:text-base font-bold mb-2 text-white">{item.title}</h3>
                <p className="text-[13.5px] sm:text-[14px] leading-[1.7]" style={{ color: "rgba(241,245,251,0.65)" }}>
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-10 text-center rounded-2xl p-5 sm:p-6"
          style={{
            background: "rgba(229,182,99,0.06)",
            border: "1px solid rgba(229,182,99,0.2)",
          }}
        >
          <p className="text-[15px] sm:text-base" style={{ color: "rgba(241,245,251,0.85)" }}>
            👉 Nếu bạn KHÔNG thuộc nhóm trên — hãy cuộn xuống xem bạn sẽ nhận được gì.
          </p>
        </div>
      </div>
    </section>
  );
}

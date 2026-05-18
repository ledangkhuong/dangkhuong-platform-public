"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Tôi không biết code — có học được không?",
    a: "HOÀN TOÀN ĐƯỢC. Đây chính là điểm đặc biệt. Bạn KHÔNG cần biết code. Bạn chỉ cần biết NÓI CHUYỆN với Claude bằng tiếng Việt — nó sẽ code thay bạn. Thầy đã làm template sẵn — bạn chỉ cần copy và đổi nội dung.",
  },
  {
    q: "Tôi chưa có ngách / chưa có sản phẩm — học có sớm quá không?",
    a: "KHÔNG. Đây là lúc tốt nhất để học. Module 1 sẽ giúp bạn tìm ngách và thử nghiệm. Bạn sẽ pre-sale TRƯỚC KHI làm sản phẩm chi tiết — không phí 80% thời gian vào sản phẩm không ai mua.",
  },
  {
    q: "Tôi bán Ebook giá 99K thôi — có cần hệ thống lớn vậy không?",
    a: "CÓ — và đây là cơ hội vàng cho bạn. Bạn bán giá thấp thì cần SỐ LƯỢNG ĐƠN cao — càng cần tự động hóa. Một Ebook 99K bán 1.000 đơn = 99 triệu. Hệ thống này giúp bạn bán 1.000 đơn cũng nhẹ nhàng như bán 10 đơn. Ngoài ra, bạn dễ dàng upsell các sản phẩm số khác.",
  },
  {
    q: "Tôi bán Template Canva / Notion — hệ thống có hỗ trợ không?",
    a: "CÓ ĐẦY ĐỦ. Module 3 có bài về kho download tự động — khách mua xong tự động nhận link download có giới hạn thời gian/lượt tải. Bảo mật cao — chống share lậu.",
  },
  {
    q: "Tôi bán phần mềm/plugin — cấp license thế nào?",
    a: "HỆ THỐNG SỬ DỤNG ĐƯỢC. Bạn có thể tích hợp Supabase Auth để cấp license key tự động sau thanh toán. Mỗi khách hàng có dashboard riêng để xem license của mình. Module 3 phần D dạy chi tiết.",
  },
  {
    q: "Tôi đã có website rồi — có cần học không?",
    a: "TÙY VÀO TRẠNG THÁI WEBSITE. Nếu website đang chạy ổn — tự động hóa tốt — bạn sở hữu 100% — thì có thể không cần Module 3. Nhưng nếu bạn đang thuê platform / phụ thuộc dev / đốt tiền hàng tháng — chương trình này GIẢI CỨU bạn.",
  },
  {
    q: "Học bao lâu thì có kết quả?",
    a: "Có 2 nhịp độ: Cấp tốc 7 ngày (full-time 3-6 tiếng/ngày — có sản phẩm và đơn đầu tiên trong 7 ngày). Nhẹ nhàng 30 ngày (1-2 tiếng/ngày — có hệ thống hoàn chỉnh trong 1 tháng). Bạn TỰ CHỌN nhịp độ phù hợp.",
  },
  {
    q: "Chi phí công cụ hàng tháng là bao nhiêu?",
    a: "Khoảng 600.000đ/tháng, gồm: Claude Pro (500K), SePay (100K), Domain (~20K/tháng). Còn lại (Vercel, Supabase, YouTube, Canva, Resend) MIỄN PHÍ. So với Kajabi 3.800.000đ/tháng — bạn tiết kiệm 38 triệu/năm.",
  },
  {
    q: "Có hỗ trợ 1:1 không?",
    a: "CÓ: Group Zalo hỗ trợ 30 ngày (Thầy và team trả lời) + Live Q&A hàng tuần với Thầy Khương + Comment dưới mỗi bài học. Nếu cần hỗ trợ 1:1 sâu hơn — bạn có thể upgrade lên gói Coaching (9.997K) hoặc Mastermind (49.997K).",
  },
  {
    q: "Có dạy chạy quảng cáo không?",
    a: "CÓ. Module 4 dạy đầy đủ Facebook Ads: Setup Business Manager an toàn, Pixel + CAPI đo lường, 2 chiến lược (thu lead nurture & bán thẳng), Test-Scale-Tối ưu ROAS. Cho cả người không muốn chạy ads (dùng kênh tự nhiên).",
  },
  {
    q: "Tôi có thể bán chương trình của Thầy lấy hoa hồng không?",
    a: "CÓ. Sau khi học xong, bạn có thể đăng ký Affiliate — nhận hoa hồng 20% mỗi đơn bạn giới thiệu, không tính đơn hàng này. Đây là cách bạn vừa học vừa kiếm thêm thu nhập.",
  },
  {
    q: "Sau khi mua — làm sao để vào học?",
    a: "Quy trình tự động: (1) Bạn chuyển khoản qua QR SePay → (2) Hệ thống tự động nhận diện - tạo tài khoản → (3) Trong 5 phút - bạn nhận email với link đăng nhập → (4) Bạn vào trang học - bắt đầu Module 1 ngay. KHÔNG có sale duyệt - KHÔNG chờ đợi - KHÔNG phụ thuộc giờ giấc.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      className="relative overflow-hidden pt-12 pb-12 sm:pt-20 sm:pb-20 md:pt-24 md:pb-24 px-4 sm:px-6"
      style={{ background: "#050913" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-4">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{
              borderColor: "rgba(229,182,99,0.3)",
              background: "rgba(229,182,99,0.06)",
              color: "#E5B663",
            }}
          >
            <HelpCircle size={12} /> Câu Hỏi Thường Gặp
          </span>
        </div>

        <h2
          className="mb-8 sm:mb-10 text-center text-[26px] sm:text-3xl md:text-[40px] font-extrabold tracking-[-0.01em] leading-[1.15]"
          style={{ color: "#F1F5FB" }}
        >
          Bạn Còn <span style={{ color: "#E5B663" }}>Băn Khoăn?</span>
        </h2>

        <div className="space-y-2 sm:space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: "linear-gradient(180deg, #13203F 0%, #0E1730 100%)",
                  border: `1px solid ${isOpen ? "rgba(229,182,99,0.35)" : "rgba(229,182,99,0.12)"}`,
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left cursor-pointer"
                >
                  <span className="text-[15px] sm:text-base font-semibold text-white leading-[1.4]">
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className="flex-shrink-0 transition-transform"
                    style={{
                      color: "#E5B663",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1">
                    <p className="text-[14px] sm:text-[14.5px] leading-[1.75]" style={{ color: "rgba(241,245,251,0.72)" }}>
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

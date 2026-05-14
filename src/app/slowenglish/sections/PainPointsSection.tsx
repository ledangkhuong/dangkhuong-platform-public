"use client";

const painCards = [
  {
    title: "Bạn đã thử làm YouTube nhưng...",
    items: [
      "Không biết chọn ngách nào để kiếm được tiền thật",
      "Ngại lộ mặt, không tự tin với giọng nói",
      "Không biết tiếng Anh nên không dám đụng thị trường quốc tế",
    ],
    highlight: false,
  },
  {
    title: "Bạn nghe nói về AI nhưng...",
    items: [
      'Đọc 100 bài "VEO là gì" mà vẫn không biết bắt đầu từ đâu',
      "Thử làm video AI nhưng nhân vật biến dạng mỗi cảnh",
      "Prompt copy trên mạng dùng ra kết quả tệ hại",
      "CapCut nhiều chức năng quá – không biết edit kiểu nào",
    ],
    highlight: false,
  },
  {
    title: "Bạn đã từng mua khóa học AI nhưng...",
    items: [
      "Khóa dài 30-50 giờ – xem mãi không xong",
      "Lý thuyết nhiều, thực hành ít – học xong vẫn không làm được",
      "Prompt cho nhưng không hoạt động trên VEO 3.1",
      "Không có ai hỗ trợ khi gặp lỗi",
    ],
    highlight: false,
  },
  {
    title: "Và đau nhất:",
    items: [
      'Bạn xem Emma Daily English kiếm $30K/tháng – và tự hỏi: "Tại sao họ làm được mà mình không?"',
    ],
    highlight: true,
  },
];

export default function PainPointsSection() {
  return (
    <section
      className="relative py-12 sm:py-20 md:py-28 overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section title */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center text-white mb-8 sm:mb-14 md:mb-20 leading-tight">
          Có Phải Bạn Đang Mắc Kẹt Ở
          <br className="hidden sm:block" />
          <span className="block sm:inline"> Một Trong Những Tình Huống Này?</span>
        </h2>

        {/* Pain point cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {painCards.map((card, index) => (
            <div
              key={index}
              className="rounded-2xl p-6 md:p-8 transition-all duration-300 hover:translate-y-[-2px]"
              style={{
                backgroundColor: "#111111",
                border: card.highlight
                  ? "1px solid #ef4444"
                  : "1px solid #1f1f1f",
                boxShadow: card.highlight
                  ? "0 0 30px rgba(239, 68, 68, 0.08)"
                  : "none",
              }}
            >
              {/* Card header */}
              <div className="flex items-start gap-3 mb-5">
                <span
                  className="text-2xl flex-shrink-0 mt-0.5"
                  role="img"
                  aria-label="no entry"
                >
                  🚫
                </span>
                <h3
                  className="text-xl md:text-2xl font-bold"
                  style={{
                    color: card.highlight ? "#ef4444" : "#FBBF24",
                  }}
                >
                  {card.title}
                </h3>
              </div>

              {/* Card items */}
              <ul className="space-y-3 ml-1">
                {card.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="flex items-start gap-3 text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed"
                  >
                    <span
                      className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: card.highlight
                          ? "#ef4444"
                          : "#ef4444",
                        opacity: card.highlight ? 1 : 0.6,
                      }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Green solution box */}
        <div
          className="mt-8 sm:mt-12 md:mt-16 rounded-2xl p-5 sm:p-8 md:p-10 text-center"
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            border: "1px solid #10b981",
          }}
        >
          <p className="text-sm sm:text-lg md:text-xl lg:text-2xl text-white leading-relaxed md:leading-loose">
            <span className="text-emerald-400 font-semibold">
              Sự thật là...
            </span>{" "}
            Bạn{" "}
            <span className="font-bold text-white uppercase">KHÔNG</span> cần
            một khóa học 50 giờ. Bạn{" "}
            <span className="font-bold text-white uppercase">KHÔNG</span> cần
            học 20 công cụ.
            <br className="hidden md:block" />
            Bạn{" "}
            <span
              className="font-bold uppercase"
              style={{ color: "#FBBF24" }}
            >
              CHỈ
            </span>{" "}
            cần 2 video hướng dẫn{" "}
            <span
              className="font-bold uppercase"
              style={{ color: "#FBBF24" }}
            >
              ĐÚNG QUY TRÌNH
            </span>{" "}
            – và bộ Prompt đã được test thật.
          </p>
        </div>
      </div>
    </section>
  );
}

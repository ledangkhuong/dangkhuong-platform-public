import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Chính Sách Hoàn Tiền | Lê Đăng Khương Academy",
  description:
    "Chính sách hoàn tiền khi mua khoá học trên nền tảng Lê Đăng Khương Academy — dangkhuong.com",
  alternates: {
    canonical: "https://dangkhuong.com/refund-policy",
  },
  openGraph: {
    title: "Chính Sách Hoàn Tiền — Lê Đăng Khương Academy",
    description:
      "Chính sách hoàn tiền khi mua khoá học trên nền tảng Lê Đăng Khương Academy",
  },
};

const sections = [
  {
    id: "chinh-sach",
    title: "1. Chính sách hoàn tiền",
    content: [
      `${siteConfig.name} cam kết mang đến trải nghiệm học tập chất lượng cho tất cả học viên. Chúng tôi hiểu rằng đôi khi khoá học có thể không phù hợp với nhu cầu của bạn, vì vậy chúng tôi cung cấp chính sách hoàn tiền rõ ràng và minh bạch.`,
      "Chính sách này áp dụng cho tất cả các khoá học được mua trực tiếp trên nền tảng dangkhuong.com.",
    ],
  },
  {
    id: "dieu-kien",
    title: "2. Điều kiện hoàn tiền",
    content: [
      "Bạn có thể yêu cầu hoàn tiền khi đáp ứng đồng thời các điều kiện sau:",
    ],
    list: [
      "Yêu cầu hoàn tiền được gửi trong vòng 7 ngày kể từ ngày mua khoá học",
      "Bạn đã hoàn thành dưới 30% nội dung khoá học (bao gồm video đã xem, bài tập đã làm và tài liệu đã tải về)",
      "Tài khoản không vi phạm bất kỳ điều khoản sử dụng nào của nền tảng",
      "Khoá học được mua với giá gốc hoặc giá khuyến mãi chính thức từ nền tảng (không áp dụng cho khoá học nhận miễn phí hoặc qua chương trình tặng quà)",
    ],
    extra: [
      "Lưu ý: Thời hạn 7 ngày được tính từ thời điểm thanh toán thành công, không phải từ lần truy cập khoá học đầu tiên.",
    ],
  },
  {
    id: "khong-hoan-tien",
    title: "3. Trường hợp không hoàn tiền",
    content: [
      "Chúng tôi không thực hiện hoàn tiền trong các trường hợp sau:",
    ],
    list: [
      "Yêu cầu hoàn tiền sau 7 ngày kể từ ngày mua",
      "Đã hoàn thành từ 30% nội dung khoá học trở lên",
      "Vi phạm điều khoản sử dụng: chia sẻ tài khoản, sao chép nội dung, ghi màn hình hoặc phân phối tài liệu khoá học",
      "Khoá học được mua thông qua chương trình tặng quà, đổi điểm hoặc nhận miễn phí",
      "Khoá học đã được cấp chứng chỉ hoàn thành",
      "Lý do hoàn tiền không liên quan đến chất lượng khoá học hoặc dịch vụ của nền tảng (ví dụ: thay đổi ý định cá nhân sau khi đã học quá 30%)",
      "Gói đăng ký (subscription) đã sử dụng quá 7 ngày kể từ ngày kích hoạt",
    ],
  },
  {
    id: "quy-trinh",
    title: "4. Quy trình yêu cầu hoàn tiền",
    content: [
      "Để yêu cầu hoàn tiền, bạn vui lòng thực hiện theo các bước sau:",
    ],
    list: [
      "Bước 1: Gửi yêu cầu hoàn tiền qua email support@ledangkhuong.net hoặc nhắn tin qua Zalo với tiêu đề \"Yêu cầu hoàn tiền\"",
      "Bước 2: Cung cấp đầy đủ thông tin gồm: họ tên, email đăng ký tài khoản, tên khoá học cần hoàn tiền và lý do hoàn tiền",
      "Bước 3: Đội ngũ hỗ trợ sẽ xác minh thông tin và kiểm tra điều kiện hoàn tiền trong vòng 1-2 ngày làm việc",
      "Bước 4: Bạn sẽ nhận được email thông báo kết quả xử lý yêu cầu (chấp nhận hoặc từ chối kèm lý do cụ thể)",
      "Bước 5: Nếu yêu cầu được chấp nhận, hoàn tiền sẽ được thực hiện theo phương thức thanh toán ban đầu",
    ],
  },
  {
    id: "thoi-gian",
    title: "5. Thời gian xử lý",
    content: [
      "Sau khi yêu cầu hoàn tiền được chấp nhận, thời gian xử lý cụ thể như sau:",
    ],
    list: [
      "Xác minh yêu cầu: 1-2 ngày làm việc kể từ khi nhận được yêu cầu",
      "Xử lý hoàn tiền: 5-7 ngày làm việc kể từ khi yêu cầu được chấp nhận",
      "Thời gian nhận tiền: tuỳ thuộc vào ngân hàng hoặc phương thức thanh toán, có thể mất thêm 1-3 ngày làm việc",
    ],
    extra: [
      "Tổng thời gian từ khi gửi yêu cầu đến khi nhận tiền hoàn thường không quá 10-12 ngày làm việc. Trong trường hợp quá thời gian trên, vui lòng liên hệ đội ngũ hỗ trợ để được kiểm tra.",
    ],
  },
  {
    id: "phuong-thuc",
    title: "6. Phương thức hoàn tiền",
    content: [
      "Tiền hoàn sẽ được chuyển trả theo phương thức thanh toán ban đầu mà bạn đã sử dụng khi mua khoá học:",
    ],
    list: [
      "Chuyển khoản ngân hàng: hoàn tiền trực tiếp vào tài khoản ngân hàng bạn đã cung cấp",
      "Cổng thanh toán PayOS: hoàn tiền qua hệ thống PayOS về tài khoản/thẻ ban đầu",
    ],
    extra: [
      "Số tiền hoàn trả là 100% giá trị khoá học đã thanh toán (sau khi trừ các khoản giảm giá, mã coupon nếu có). Phí chuyển khoản (nếu phát sinh) sẽ do nền tảng chi trả.",
    ],
  },
  {
    id: "lien-he",
    title: "7. Liên hệ hỗ trợ",
    content: [
      "Nếu bạn có bất kỳ câu hỏi nào về chính sách hoàn tiền hoặc cần hỗ trợ trong quá trình yêu cầu hoàn tiền, vui lòng liên hệ chúng tôi qua các kênh sau:",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Chính sách hoàn tiền
          </h1>
          <p className="text-gray-400 text-sm">
            Cập nhật lần cuối: 18 tháng 5, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Table of Contents */}
          <nav className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Mục lục
            </h2>
            <ul className="space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-sm text-[#D4A843] hover:text-[#e6be5a] transition-colors"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sections */}
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-6">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4">
                {section.title}
              </h2>

              {section.content?.map((paragraph, i) => (
                <p key={i} className="text-gray-300 leading-relaxed mb-3">
                  {paragraph}
                </p>
              ))}

              {section.list && (
                <ul className="space-y-2 my-4 ml-1">
                  {section.list.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-gray-300 leading-relaxed"
                    >
                      <span className="text-[#D4A843] mt-1.5 shrink-0">
                        <svg
                          width="6"
                          height="6"
                          viewBox="0 0 6 6"
                          fill="currentColor"
                        >
                          <circle cx="3" cy="3" r="3" />
                        </svg>
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.extra?.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-gray-400 leading-relaxed mb-3 text-sm"
                >
                  {paragraph}
                </p>
              ))}

              {/* Contact info for the last section */}
              {section.id === "lien-he" && (
                <div className="card-dark p-5 mt-4 space-y-2">
                  <p className="text-gray-300">
                    <span className="text-gray-500">Nền tảng:</span>{" "}
                    <span className="text-white font-medium">
                      {siteConfig.name}
                    </span>
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-500">Website:</span>{" "}
                    <Link
                      href="/"
                      className="text-[#D4A843] hover:underline"
                    >
                      {siteConfig.domain}
                    </Link>
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-500">Email:</span>{" "}
                    <a
                      href="mailto:support@ledangkhuong.net"
                      className="text-[#D4A843] hover:underline"
                    >
                      support@ledangkhuong.net
                    </a>
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-500">Zalo:</span>{" "}
                    <a
                      href={siteConfig.socials.zalo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D4A843] hover:underline"
                    >
                      {siteConfig.socials.zalo.replace(/.*\//, "").replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3")}
                    </a>
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-500">Thời gian hỗ trợ:</span>{" "}
                    <span className="text-white font-medium">
                      Thứ 2 - Thứ 6, 9:00 - 17:00 (GMT+7)
                    </span>
                  </p>
                </div>
              )}
            </section>
          ))}

          {/* Related links */}
          <div className="pt-6 border-t border-[#1a1a1a] flex flex-col sm:flex-row gap-3">
            <Link
              href="/terms-of-service"
              className="text-sm text-[#D4A843] hover:underline"
            >
              Điều khoản dịch vụ &rarr;
            </Link>
            <Link
              href="/privacy-policy"
              className="text-sm text-[#D4A843] hover:underline"
            >
              Chính sách bảo mật &rarr;
            </Link>
            <Link
              href="/"
              className="text-sm text-[#D4A843] hover:underline"
            >
              &larr; Quay về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

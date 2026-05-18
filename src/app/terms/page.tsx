import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Điều Khoản Sử Dụng | Lê Đăng Khương Academy",
  description:
    "Điều khoản sử dụng nền tảng học tập trực tuyến Lê Đăng Khương Academy — dangkhuong.com. Tuân thủ Nghị định 52/2013/NĐ-CP về thương mại điện tử.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Điều Khoản Sử Dụng — Lê Đăng Khương Academy",
    description:
      "Điều khoản sử dụng nền tảng học tập trực tuyến Lê Đăng Khương Academy",
  },
};

const sections = [
  {
    id: "gioi-thieu",
    title: "1. Giới thiệu",
    content: [
      `Chào mừng bạn đến với ${siteConfig.domain} ("Nền tảng") — nền tảng học tập trực tuyến thuộc sở hữu và vận hành bởi ${siteConfig.name} ("chúng tôi", "của chúng tôi").`,
      `Nền tảng hoạt động theo mô hình sàn giao dịch thương mại điện tử cung cấp dịch vụ nội dung số (khoá học trực tuyến), tuân thủ Nghị định 52/2013/NĐ-CP ngày 16 tháng 5 năm 2013 của Chính phủ về thương mại điện tử và các văn bản hướng dẫn thi hành.`,
      "Bằng việc truy cập, đăng ký tài khoản hoặc sử dụng bất kỳ dịch vụ nào trên Nền tảng, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản được quy định trong văn bản này.",
      "Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng ngừng sử dụng Nền tảng ngay lập tức.",
    ],
  },
  {
    id: "dieu-khoan-su-dung",
    title: "2. Điều khoản sử dụng",
    content: [
      "Để sử dụng đầy đủ các tính năng của Nền tảng, bạn cần đăng ký tài khoản với thông tin chính xác, đầy đủ và cập nhật. Khi sử dụng Nền tảng, bạn cam kết:",
    ],
    list: [
      "Đủ 16 tuổi trở lên hoặc có sự đồng ý của cha mẹ/người giám hộ hợp pháp",
      "Cung cấp thông tin đăng ký chính xác, trung thực và cập nhật khi có thay đổi",
      "Chịu trách nhiệm bảo mật thông tin đăng nhập (email, mật khẩu) và mọi hoạt động diễn ra dưới tài khoản của mình",
      "Không chia sẻ, chuyển nhượng hoặc cho phép người khác sử dụng tài khoản của mình",
      "Mỗi cá nhân chỉ được đăng ký và duy trì một tài khoản duy nhất",
      "Không sử dụng Nền tảng cho mục đích bất hợp pháp, gian lận hoặc vi phạm quyền lợi của bên thứ ba",
      "Không can thiệp, phá hoại hoặc gây ảnh hưởng đến hoạt động bình thường của Nền tảng",
      "Thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép vào tài khoản",
    ],
    extra: [
      "Chúng tôi có quyền tạm khoá, hạn chế hoặc xoá vĩnh viễn tài khoản vi phạm điều khoản mà không cần thông báo trước trong trường hợp vi phạm nghiêm trọng.",
    ],
  },
  {
    id: "so-huu-tri-tue",
    title: "3. Quyền sở hữu trí tuệ",
    content: [
      `Tất cả nội dung trên Nền tảng bao gồm nhưng không giới hạn: video bài giảng, văn bản, hình ảnh, âm thanh, template, mã nguồn, thiết kế giao diện, logo và thương hiệu "${siteConfig.name}" là tài sản trí tuệ của ${siteConfig.owner.name} hoặc các đối tác được uỷ quyền hợp pháp, được bảo hộ theo Luật Sở hữu trí tuệ Việt Nam năm 2005 (sửa đổi, bổ sung năm 2009, 2019, 2022).`,
    ],
    list: [
      "Bạn được cấp quyền sử dụng cá nhân, không độc quyền, không chuyển nhượng để truy cập nội dung khoá học đã mua/đăng ký",
      "Nghiêm cấm sao chép, tái tạo, phân phối, bán lại, cho thuê, chia sẻ công khai hoặc phát tán nội dung khoá học dưới mọi hình thức",
      "Nghiêm cấm ghi màn hình, tải xuống video trái phép, sử dụng công cụ bên thứ ba để trích xuất, crawl hoặc scrape nội dung",
      "Nghiêm cấm sử dụng nội dung khoá học cho mục đích thương mại mà không có sự cho phép bằng văn bản của chúng tôi",
      "Vi phạm quyền sở hữu trí tuệ sẽ dẫn đến khoá tài khoản vĩnh viễn, không hoàn tiền, và có thể bị xử lý theo quy định pháp luật Việt Nam",
    ],
  },
  {
    id: "thanh-toan-hoan-tien",
    title: "4. Thanh toán & hoàn tiền",
    content: [
      "Khi mua khoá học hoặc đăng ký gói dịch vụ trên Nền tảng, bạn đồng ý với các điều khoản thanh toán và hoàn tiền sau đây, phù hợp với Điều 36 Nghị định 52/2013/NĐ-CP:",
    ],
    list: [
      "Giá khoá học và gói dịch vụ được niêm yết bằng Việt Nam Đồng (VND) và đã bao gồm thuế GTGT (nếu có)",
      "Phương thức thanh toán: chuyển khoản ngân hàng nội địa hoặc qua cổng thanh toán trực tuyến được tích hợp trên Nền tảng",
      "Quyền truy cập khoá học được kích hoạt ngay sau khi hệ thống xác nhận thanh toán thành công",
      "Hoàn tiền 100% trong vòng 3 ngày kể từ ngày thanh toán nếu bạn chưa xem quá 20% nội dung khoá học",
      "Không hoàn tiền sau 3 ngày hoặc khi đã xem quá 20% nội dung, trừ trường hợp lỗi kỹ thuật nghiêm trọng từ phía Nền tảng",
      "Gói đăng ký (subscription) không tự động gia hạn — bạn cần thực hiện thanh toán thủ công khi hết hạn",
      "Chúng tôi có quyền thay đổi giá dịch vụ sau khi thông báo trước 7 ngày. Giá mới không áp dụng cho các đơn hàng đã thanh toán",
    ],
    extra: [
      "Yêu cầu hoàn tiền được gửi qua email support@ledangkhuong.net và sẽ được xử lý trong vòng 7 ngày làm việc.",
    ],
  },
  {
    id: "quyen-nghia-vu-nguoi-dung",
    title: "5. Quyền và nghĩa vụ người dùng",
    content: ["Khi sử dụng Nền tảng, bạn có các quyền và nghĩa vụ sau:"],
    subsections: [
      {
        subtitle: "5.1. Quyền của người dùng",
        list: [
          "Truy cập và sử dụng nội dung khoá học đã mua/đăng ký trong thời hạn cho phép",
          "Nhận hỗ trợ kỹ thuật khi gặp sự cố truy cập hoặc sử dụng dịch vụ",
          "Tham gia cộng đồng học viên, đặt câu hỏi và trao đổi kiến thức",
          "Nhận chứng chỉ hoàn thành khoá học (nếu khoá học có cung cấp)",
          "Yêu cầu hoàn tiền theo chính sách hoàn tiền nêu tại Mục 4",
          "Yêu cầu xoá tài khoản và dữ liệu cá nhân theo quy định pháp luật",
          "Khiếu nại, phản ánh về chất lượng dịch vụ qua các kênh liên hệ chính thức",
        ],
      },
      {
        subtitle: "5.2. Nghĩa vụ của người dùng",
        list: [
          "Tuân thủ các điều khoản sử dụng và quy tắc ứng xử cộng đồng",
          "Tôn trọng quyền sở hữu trí tuệ của Nền tảng và các bên liên quan",
          "Không lạm dụng hệ thống hoàn tiền hoặc khuyến mãi",
          "Không đăng tải nội dung vi phạm pháp luật, xúc phạm, quấy rối hoặc spam trong cộng đồng",
          "Không mạo danh người khác hoặc cung cấp thông tin sai lệch",
          "Chịu trách nhiệm về mọi hoạt động diễn ra dưới tài khoản của mình",
        ],
      },
    ],
  },
  {
    id: "quyen-nghia-vu-nen-tang",
    title: "6. Quyền và nghĩa vụ nền tảng",
    content: [],
    subsections: [
      {
        subtitle: "6.1. Quyền của nền tảng",
        list: [
          "Quản lý, vận hành và phát triển Nền tảng theo định hướng của mình",
          "Tạm khoá hoặc chấm dứt tài khoản người dùng vi phạm điều khoản",
          "Thay đổi, cập nhật hoặc ngừng cung cấp bất kỳ tính năng hoặc dịch vụ nào sau khi thông báo hợp lý",
          "Thu thập và sử dụng dữ liệu người dùng theo Chính sách Bảo mật đã công bố",
          "Từ chối cung cấp dịch vụ cho các trường hợp vi phạm pháp luật hoặc điều khoản sử dụng",
        ],
      },
      {
        subtitle: "6.2. Nghĩa vụ của nền tảng",
        list: [
          "Cung cấp dịch vụ đúng với mô tả và cam kết đã công bố",
          "Bảo vệ thông tin cá nhân và dữ liệu người dùng theo quy định pháp luật",
          "Hỗ trợ giải quyết khiếu nại, phản ánh của người dùng trong thời gian hợp lý",
          "Thông báo kịp thời về các thay đổi quan trọng ảnh hưởng đến quyền lợi người dùng",
          "Tuân thủ quy định pháp luật Việt Nam về thương mại điện tử và bảo vệ người tiêu dùng",
          "Công bố đầy đủ thông tin về dịch vụ, giá cả và chính sách theo Điều 29 Nghị định 52/2013/NĐ-CP",
        ],
      },
    ],
  },
  {
    id: "bao-mat-thong-tin",
    title: "7. Bảo mật thông tin",
    content: [
      "Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn theo các quy định của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân. Chi tiết được quy định tại Chính sách Bảo mật của Nền tảng.",
    ],
    list: [
      "Thông tin cá nhân được thu thập, xử lý và lưu trữ theo đúng mục đích đã thông báo",
      "Áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu: mã hoá HTTPS, xác thực an toàn, phân quyền truy cập",
      "Không bán, trao đổi hoặc cho thuê thông tin cá nhân cho bên thứ ba vì mục đích thương mại",
      "Chỉ chia sẻ dữ liệu với các nhà cung cấp dịch vụ đáng tin cậy cần thiết cho việc vận hành Nền tảng",
      "Người dùng có quyền truy cập, chỉnh sửa, yêu cầu xoá dữ liệu cá nhân của mình",
    ],
    extra: [
      "Để biết thêm chi tiết, vui lòng tham khảo Chính sách Bảo mật tại trang riêng của chúng tôi.",
    ],
  },
  {
    id: "gioi-han-trach-nhiem",
    title: "8. Giới hạn trách nhiệm",
    content: [
      'Nền tảng và toàn bộ nội dung được cung cấp trên cơ sở "nguyên trạng" (as-is) và "sẵn có" (as-available). Trong phạm vi pháp luật cho phép:',
    ],
    list: [
      "Chúng tôi không đảm bảo Nền tảng hoạt động liên tục, không gián đoạn hoặc hoàn toàn không có lỗi kỹ thuật",
      "Chúng tôi không chịu trách nhiệm về kết quả cụ thể từ việc áp dụng kiến thức trong khoá học, vì kết quả phụ thuộc vào nỗ lực và hoàn cảnh cá nhân của mỗi học viên",
      "Chúng tôi không chịu trách nhiệm về thiệt hại gián tiếp, ngẫu nhiên, đặc biệt hoặc mang tính hậu quả phát sinh từ việc sử dụng hoặc không thể sử dụng Nền tảng",
      "Chúng tôi không chịu trách nhiệm về nội dung, sản phẩm hoặc dịch vụ của bên thứ ba được liên kết trên Nền tảng",
      "Trách nhiệm bồi thường tối đa của chúng tôi trong mọi trường hợp không vượt quá tổng số tiền bạn đã thanh toán cho dịch vụ liên quan trong 12 tháng gần nhất",
    ],
  },
  {
    id: "thay-doi-dieu-khoan",
    title: "9. Thay đổi điều khoản",
    content: [
      "Chúng tôi có quyền sửa đổi, bổ sung hoặc cập nhật các Điều khoản Sử dụng này vào bất kỳ thời điểm nào. Khi có thay đổi:",
    ],
    list: [
      "Phiên bản mới sẽ được đăng tải trên Nền tảng kèm ngày cập nhật",
      "Thay đổi quan trọng sẽ được thông báo qua email đăng ký hoặc thông báo trên Nền tảng trước ít nhất 7 ngày",
      "Việc tiếp tục sử dụng Nền tảng sau ngày thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận các điều khoản mới",
      "Nếu không đồng ý với điều khoản mới, bạn có quyền ngừng sử dụng Nền tảng và yêu cầu xoá tài khoản",
    ],
  },
  {
    id: "lien-he",
    title: "10. Liên hệ",
    content: [
      "Mọi câu hỏi, góp ý, khiếu nại hoặc yêu cầu liên quan đến Điều khoản Sử dụng này, vui lòng liên hệ với chúng tôi qua các kênh sau:",
    ],
  },
];

export default function TermsPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "radial-gradient(ellipse at top, #0d1117 0%, #0a0a0a 60%)" }}
    >
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#D4A843] hover:text-[#e6be5a] transition-colors mb-6"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 12L6 8l4-4" />
            </svg>
            Quay về trang chủ
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Điều Khoản Sử Dụng
          </h1>
          <p className="text-gray-400 text-sm">
            Cập nhật lần cuối: 18/05/2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-8 sm:py-12">
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

              {/* Subsections (for sections 5 & 6) */}
              {section.subsections?.map((sub, si) => (
                <div key={si} className="mt-5 mb-4">
                  <h3 className="text-base font-semibold text-white mb-3">
                    {sub.subtitle}
                  </h3>
                  <ul className="space-y-2 ml-1">
                    {sub.list.map((item, i) => (
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
                </div>
              ))}

              {section.extra?.map((paragraph, i) => (
                <p key={i} className="text-gray-400 leading-relaxed mb-3 text-sm italic">
                  {paragraph}
                </p>
              ))}

              {/* Contact info for the last section */}
              {section.id === "lien-he" && (
                <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5 mt-4 space-y-3">
                  <p className="text-gray-300">
                    <span className="text-gray-500">Nền tảng:</span>{" "}
                    <span className="text-white font-medium">
                      {siteConfig.name}
                    </span>
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-500">Người đại diện:</span>{" "}
                    <span className="text-white font-medium">
                      {siteConfig.owner.name}
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
                    <span className="text-gray-500">Email hỗ trợ:</span>{" "}
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
                </div>
              )}
            </section>
          ))}

          {/* Related links */}
          <div className="pt-6 border-t border-[#1a1a1a] flex flex-col sm:flex-row gap-3">
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

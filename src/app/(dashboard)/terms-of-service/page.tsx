import Link from "next/link";

export const metadata = {
  title: "Điều khoản dịch vụ | Đăng Khương Academy",
  description:
    "Điều khoản sử dụng dịch vụ của nền tảng Đăng Khương Academy — dangkhuong.com",
};

const sections = [
  {
    id: "gioi-thieu",
    title: "1. Giới thiệu",
    content: [
      "Chào mừng bạn đến với dangkhuong.com (\"Nền tảng\") — nền tảng học tập trực tuyến thuộc sở hữu và vận hành bởi Lê Đăng Khương Academy (\"chúng tôi\").",
      "Bằng việc truy cập, đăng ký tài khoản hoặc sử dụng bất kỳ dịch vụ nào trên Nền tảng, bạn đồng ý tuân thủ và bị ràng buộc bởi các Điều khoản dịch vụ này.",
      "Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng Nền tảng.",
    ],
  },
  {
    id: "tai-khoan",
    title: "2. Tài khoản người dùng",
    content: [
      "Để sử dụng đầy đủ tính năng của Nền tảng, bạn cần đăng ký tài khoản với thông tin chính xác và đầy đủ.",
    ],
    list: [
      "Bạn chịu trách nhiệm bảo mật thông tin đăng nhập (email, mật khẩu) của mình",
      "Không được chia sẻ tài khoản cho người khác sử dụng",
      "Thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép vào tài khoản",
      "Chúng tôi có quyền tạm khoá hoặc xoá tài khoản vi phạm điều khoản",
      "Mỗi cá nhân chỉ được đăng ký một tài khoản duy nhất",
    ],
  },
  {
    id: "dich-vu",
    title: "3. Dịch vụ và sản phẩm",
    content: [
      "Nền tảng cung cấp các dịch vụ học tập trực tuyến bao gồm:",
    ],
    list: [
      "Khoá học video trực tuyến (Video AI, xây kênh, thương hiệu cá nhân, AI Agent)",
      "Tài liệu, template và tài nguyên hỗ trợ học tập",
      "Cộng đồng học viên để trao đổi, thảo luận",
      "Chứng chỉ hoàn thành khoá học",
      "Công cụ AI hỗ trợ học tập",
      "Hệ thống gói đăng ký (Subscription) với các cấp độ khác nhau",
    ],
    extra: [
      "Chúng tôi có quyền thay đổi, cập nhật hoặc ngừng cung cấp bất kỳ dịch vụ nào sau khi thông báo hợp lý cho người dùng.",
    ],
  },
  {
    id: "thanh-toan",
    title: "4. Thanh toán và hoàn tiền",
    content: [
      "Khi mua khoá học hoặc gói đăng ký trên Nền tảng, bạn đồng ý với các điều khoản thanh toán sau:",
    ],
    list: [
      "Giá được niêm yết bằng Việt Nam Đồng (VND) và đã bao gồm thuế GTGT (nếu có)",
      "Thanh toán qua chuyển khoản ngân hàng hoặc cổng thanh toán PayOS",
      "Quyền truy cập khoá học được kích hoạt ngay sau khi thanh toán được xác nhận",
      "Không hoàn tiền sau khi đã kích hoạt quyền truy cập khoá học, trừ trường hợp lỗi kỹ thuật từ phía Nền tảng",
      "Gói đăng ký không tự động gia hạn — bạn cần thực hiện thanh toán thủ công khi hết hạn",
    ],
  },
  {
    id: "so-huu-tri-tue",
    title: "5. Sở hữu trí tuệ",
    content: [
      "Tất cả nội dung trên Nền tảng (bao gồm nhưng không giới hạn: video, văn bản, hình ảnh, template, mã nguồn, thiết kế) là tài sản trí tuệ của Lê Đăng Khương Academy hoặc đối tác được uỷ quyền.",
    ],
    list: [
      "Bạn được cấp quyền sử dụng cá nhân, không chuyển nhượng để truy cập nội dung khoá học đã mua",
      "Nghiêm cấm sao chép, phân phối, bán lại, chia sẻ hoặc phát tán nội dung khoá học dưới mọi hình thức",
      "Nghiêm cấm ghi màn hình, tải xuống video trái phép hoặc sử dụng công cụ bên thứ ba để trích xuất nội dung",
      "Vi phạm sở hữu trí tuệ sẽ dẫn đến khoá tài khoản vĩnh viễn và có thể bị xử lý pháp lý theo quy định của pháp luật Việt Nam",
    ],
  },
  {
    id: "quy-tac",
    title: "6. Quy tắc ứng xử cộng đồng",
    content: [
      "Khi tham gia cộng đồng trên Nền tảng, bạn cam kết tuân thủ các quy tắc ứng xử sau:",
    ],
    list: [
      "Tôn trọng các thành viên khác — không xúc phạm, quấy rối, phân biệt đối xử",
      "Không đăng nội dung vi phạm pháp luật, khiêu dâm, bạo lực hoặc thông tin sai lệch",
      "Không spam, quảng cáo hoặc tiếp thị sản phẩm/dịch vụ không liên quan",
      "Không mạo danh người khác hoặc cung cấp thông tin sai lệch",
      "Đóng góp xây dựng — chia sẻ kiến thức, kinh nghiệm thực tế và hỗ trợ lẫn nhau",
    ],
    extra: [
      "Chúng tôi có quyền xoá nội dung vi phạm và tạm khoá/xoá tài khoản mà không cần thông báo trước nếu vi phạm nghiêm trọng.",
    ],
  },
  {
    id: "gioi-han",
    title: "7. Giới hạn trách nhiệm",
    content: [
      "Nền tảng được cung cấp trên cơ sở \"nguyên trạng\" (as-is). Chúng tôi nỗ lực đảm bảo chất lượng dịch vụ nhưng không đảm bảo:",
    ],
    list: [
      "Nền tảng hoạt động liên tục, không gián đoạn hoặc không có lỗi",
      "Kết quả cụ thể từ việc áp dụng kiến thức trong khoá học (vì kết quả phụ thuộc vào nỗ lực cá nhân của mỗi học viên)",
      "Tính chính xác tuyệt đối của tất cả nội dung, đặc biệt thông tin về công nghệ có thể thay đổi nhanh",
    ],
    extra: [
      "Trong mọi trường hợp, trách nhiệm bồi thường tối đa của chúng tôi không vượt quá số tiền bạn đã thanh toán cho dịch vụ liên quan trong 12 tháng gần nhất.",
    ],
  },
  {
    id: "thay-doi",
    title: "8. Thay đổi điều khoản",
    content: [
      "Chúng tôi có thể cập nhật Điều khoản dịch vụ này theo thời gian. Khi có thay đổi quan trọng:",
    ],
    list: [
      "Chúng tôi sẽ thông báo qua email đã đăng ký hoặc thông báo trên Nền tảng",
      "Phiên bản mới có hiệu lực ngay khi được đăng tải",
      "Việc tiếp tục sử dụng Nền tảng sau thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới",
    ],
  },
  {
    id: "luat-ap-dung",
    title: "9. Luật áp dụng và giải quyết tranh chấp",
    content: [
      "Điều khoản dịch vụ này được điều chỉnh và giải thích theo pháp luật nước Cộng hoà Xã hội Chủ nghĩa Việt Nam.",
      "Mọi tranh chấp phát sinh từ việc sử dụng Nền tảng sẽ được giải quyết thông qua thương lượng thiện chí. Trong trường hợp không đạt được thoả thuận, tranh chấp sẽ được đưa ra giải quyết tại Toà án nhân dân có thẩm quyền tại Thành phố Hồ Chí Minh, Việt Nam.",
    ],
  },
  {
    id: "lien-he",
    title: "10. Liên hệ",
    content: [
      "Nếu bạn có câu hỏi về Điều khoản dịch vụ này, vui lòng liên hệ:",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Điều khoản dịch vụ
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
                        &bull;
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.extra?.map((paragraph, i) => (
                <p key={i} className="text-gray-400 leading-relaxed mb-3 text-sm">
                  {paragraph}
                </p>
              ))}

              {/* Contact info for the last section */}
              {section.id === "lien-he" && (
                <div className="card-dark p-5 mt-4 space-y-2">
                  <p className="text-gray-300">
                    <span className="text-gray-500">Nền tảng:</span>{" "}
                    <span className="text-white font-medium">
                      Lê Đăng Khương Academy
                    </span>
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-500">Website:</span>{" "}
                    <Link
                      href="/"
                      className="text-[#D4A843] hover:underline"
                    >
                      dangkhuong.com
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
                </div>
              )}
            </section>
          ))}

          {/* Back link */}
          <div className="pt-6 border-t border-[#1a1a1a]">
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

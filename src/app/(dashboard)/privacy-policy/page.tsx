import Link from "next/link";

export const metadata = {
  title: "Chính sách bảo mật | Đăng Khương Academy",
  description:
    "Chính sách bảo mật và bảo vệ dữ liệu cá nhân của nền tảng Đăng Khương Academy — dangkhuong.com",
};

const sections = [
  {
    id: "thu-thap",
    title: "1. Thông tin chúng tôi thu thập",
    content: [
      "Khi bạn sử dụng nền tảng dangkhuong.com, chúng tôi có thể thu thập các loại thông tin sau:",
    ],
    list: [
      "Họ và tên đầy đủ",
      "Địa chỉ email",
      "Số điện thoại (nếu bạn cung cấp)",
      "Địa chỉ IP và thông tin trình duyệt (User-Agent)",
      "Dữ liệu hoạt động trên nền tảng: khoá học đã đăng ký, tiến độ học tập, bài viết trong cộng đồng",
      "Thông tin thanh toán (được xử lý qua cổng thanh toán bên thứ ba, chúng tôi không lưu trữ thông tin thẻ)",
    ],
  },
  {
    id: "muc-dich",
    title: "2. Mục đích sử dụng thông tin",
    content: [
      "Chúng tôi sử dụng thông tin cá nhân của bạn cho các mục đích sau:",
    ],
    list: [
      "Cung cấp và duy trì dịch vụ: quản lý tài khoản, cấp quyền truy cập khoá học, theo dõi tiến độ học tập",
      "Cải thiện trải nghiệm người dùng: phân tích hành vi sử dụng để tối ưu nội dung và giao diện",
      "Gửi email thông báo: xác nhận đăng ký, cập nhật khoá học, thông tin khuyến mãi (bạn có thể huỷ đăng ký bất cứ lúc nào)",
      "Hỗ trợ khách hàng: phản hồi câu hỏi và yêu cầu hỗ trợ",
      "Đảm bảo an toàn: phát hiện và ngăn chặn các hoạt động gian lận hoặc truy cập trái phép",
      "Chương trình affiliate: theo dõi và tính hoa hồng cho đối tác giới thiệu",
    ],
  },
  {
    id: "bao-mat",
    title: "3. Bảo mật dữ liệu",
    content: [
      "Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn bằng các biện pháp kỹ thuật và tổ chức phù hợp:",
    ],
    list: [
      "Mã hoá dữ liệu: toàn bộ dữ liệu được truyền tải qua giao thức HTTPS (TLS/SSL)",
      "Supabase Row Level Security (RLS): đảm bảo mỗi người dùng chỉ truy cập được dữ liệu của chính mình",
      "Xác thực an toàn: mật khẩu được băm (hash) và không bao giờ lưu dưới dạng văn bản thuần",
      "Giám sát hệ thống: theo dõi liên tục để phát hiện và xử lý sớm các mối đe doạ bảo mật",
      "Sao lưu dữ liệu: thực hiện sao lưu định kỳ để đảm bảo khả năng khôi phục",
    ],
  },
  {
    id: "quyen",
    title: "4. Quyền của người dùng",
    content: [
      "Theo quy định của Nghị định về Bảo vệ Dữ liệu Cá nhân (PDPA) Việt Nam và GDPR (nếu áp dụng), bạn có các quyền sau:",
    ],
    list: [
      "Quyền truy cập: xem toàn bộ dữ liệu cá nhân mà chúng tôi lưu trữ về bạn",
      "Quyền chỉnh sửa: cập nhật hoặc sửa đổi thông tin cá nhân không chính xác",
      "Quyền xoá: yêu cầu xoá dữ liệu cá nhân của bạn khỏi hệ thống",
      "Quyền hạn chế xử lý: yêu cầu ngừng xử lý dữ liệu trong một số trường hợp nhất định",
      "Quyền phản đối: phản đối việc sử dụng dữ liệu cho mục đích tiếp thị",
      "Quyền di chuyển dữ liệu: nhận bản sao dữ liệu cá nhân ở định dạng có thể đọc được",
    ],
    extra: [
      "Để thực hiện bất kỳ quyền nào nêu trên, vui lòng liên hệ chúng tôi qua email. Chúng tôi sẽ phản hồi trong vòng 30 ngày kể từ ngày nhận được yêu cầu.",
    ],
  },
  {
    id: "cookie",
    title: "5. Cookie và công nghệ theo dõi",
    content: [
      "Chúng tôi sử dụng cookie và các công nghệ tương tự để cải thiện trải nghiệm của bạn:",
    ],
    list: [
      "Cookie phiên (Session cookie): duy trì trạng thái đăng nhập trong suốt phiên sử dụng. Cookie này tự động xoá khi bạn đóng trình duyệt",
      "Cookie phân tích (Analytics): thu thập dữ liệu ẩn danh về cách bạn sử dụng nền tảng để cải thiện dịch vụ",
      "Cookie affiliate: theo dõi nguồn giới thiệu để tính hoa hồng cho đối tác affiliate. Cookie này có thời hạn 30 ngày",
    ],
    extra: [
      "Bạn có thể quản lý cài đặt cookie thông qua trình duyệt. Tuy nhiên, việc vô hiệu hoá cookie phiên có thể ảnh hưởng đến khả năng sử dụng một số tính năng.",
    ],
  },
  {
    id: "chia-se",
    title: "6. Chia sẻ dữ liệu với bên thứ ba",
    content: [
      "Chúng tôi cam kết không bán, trao đổi hoặc cho thuê thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại.",
      "Chúng tôi chỉ chia sẻ dữ liệu với các nhà cung cấp dịch vụ đáng tin cậy để vận hành nền tảng:",
    ],
    list: [
      "Supabase: lưu trữ cơ sở dữ liệu và xác thực người dùng (trung tâm dữ liệu tại Singapore)",
      "Amazon Web Services (AWS SES): gửi email giao dịch và email tiếp thị",
      "Cloudflare: bảo mật, CDN và tối ưu hiệu suất website",
    ],
    extra: [
      "Tất cả các nhà cung cấp dịch vụ trên đều tuân thủ các tiêu chuẩn bảo mật quốc tế và cam kết bảo vệ dữ liệu cá nhân.",
      "Chúng tôi có thể tiết lộ thông tin cá nhân khi được yêu cầu bởi pháp luật hoặc cơ quan nhà nước có thẩm quyền.",
    ],
  },
  {
    id: "luu-tru",
    title: "7. Thời gian lưu trữ dữ liệu",
    content: [
      "Chúng tôi lưu trữ thông tin cá nhân của bạn trong suốt thời gian tài khoản còn hoạt động hoặc theo thời gian cần thiết để cung cấp dịch vụ.",
      "Sau khi bạn yêu cầu xoá tài khoản, chúng tôi sẽ xoá hoặc ẩn danh hoá dữ liệu cá nhân trong vòng 30 ngày, trừ khi pháp luật yêu cầu lưu trữ lâu hơn.",
    ],
  },
  {
    id: "tre-em",
    title: "8. Bảo vệ trẻ em",
    content: [
      "Nền tảng không dành cho người dưới 16 tuổi. Chúng tôi không cố ý thu thập dữ liệu cá nhân của trẻ em dưới 16 tuổi.",
      "Nếu phát hiện đã thu thập dữ liệu của trẻ em, chúng tôi sẽ xoá ngay lập tức. Nếu bạn là phụ huynh và phát hiện con mình đã cung cấp thông tin, vui lòng liên hệ chúng tôi qua email support@ledangkhuong.net.",
    ],
  },
  {
    id: "thay-doi",
    title: "9. Thay đổi chính sách bảo mật",
    content: [
      "Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian để phản ánh các thay đổi trong hoạt động hoặc yêu cầu pháp lý.",
      "Khi có thay đổi quan trọng, chúng tôi sẽ thông báo cho bạn qua email đã đăng ký hoặc thông qua thông báo trên nền tảng.",
      "Chúng tôi khuyến khích bạn xem lại chính sách này định kỳ để nắm được cách thông tin cá nhân của bạn được bảo vệ.",
    ],
  },
  {
    id: "lien-he",
    title: "10. Liên hệ",
    content: [
      "Nếu bạn có bất kỳ câu hỏi, yêu cầu hoặc khiếu nại nào liên quan đến chính sách bảo mật hoặc cách chúng tôi xử lý dữ liệu cá nhân, vui lòng liên hệ:",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Chính sách bảo mật
          </h1>
          <p className="text-gray-400 text-sm">
            Cập nhật lần cuối: 18 tháng 5, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Introduction */}
          <div className="space-y-3">
            <p className="text-gray-300 leading-relaxed">
              Chào mừng bạn đến với{" "}
              <span className="text-white font-medium">dangkhuong.com</span> —
              nền tảng học tập trực tuyến thuộc sở hữu của{" "}
              <span className="text-white font-medium">Đăng Khương</span>.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Chúng tôi tôn trọng quyền riêng tư của bạn và cam kết bảo vệ
              thông tin cá nhân mà bạn cung cấp khi sử dụng dịch vụ. Chính sách
              bảo mật này giải thích cách chúng tôi thu thập, sử dụng, lưu trữ
              và bảo vệ dữ liệu cá nhân của bạn, phù hợp với quy định pháp luật
              Việt Nam về bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP) và
              Quy định Bảo vệ Dữ liệu Chung của Liên minh Châu Âu (GDPR).
            </p>
            <p className="text-gray-300 leading-relaxed">
              Bằng việc truy cập và sử dụng nền tảng, bạn đồng ý với các điều
              khoản trong chính sách bảo mật này.
            </p>
          </div>

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
                <p
                  key={i}
                  className="text-gray-300 leading-relaxed mb-3"
                >
                  {paragraph}
                </p>
              ))}

              {section.list && (
                <ul className="space-y-2 my-4 ml-1">
                  {section.list.map((item, i) => (
                    <li key={i} className="flex gap-3 text-gray-300 leading-relaxed">
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
                  className="text-gray-300 leading-relaxed mb-3"
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
                      Lê Đăng Khương Academy
                    </span>
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-500">Website:</span>{" "}
                    <Link href="/" className="text-[#D4A843] hover:underline">
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
                  <p className="text-gray-300">
                    <span className="text-gray-500">
                      Người chịu trách nhiệm bảo vệ dữ liệu:
                    </span>{" "}
                    <span className="text-white font-medium">
                      Lê Đăng Khương
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

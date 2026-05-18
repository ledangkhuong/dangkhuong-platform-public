import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Chính Sách Bảo Mật | ${siteConfig.name}`,
  description:
    "Chính sách bảo mật và bảo vệ dữ liệu cá nhân của nền tảng Lê Đăng Khương Academy, tuân thủ Luật An ninh mạng 2018 và Nghị định 13/2023/NĐ-CP.",
  alternates: {
    canonical: "/privacy",
  },
};

const sections = [
  {
    id: "thu-thap",
    title: "1. Thu thập thông tin",
    content: [
      "Khi bạn sử dụng nền tảng dangkhuong.com, chúng tôi thu thập các loại thông tin cá nhân sau đây, phù hợp với quy định tại Điều 2 Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân:",
    ],
    subsections: [
      {
        label: "a) Thông tin bạn cung cấp trực tiếp:",
        items: [
          "Họ và tên đầy đủ",
          "Địa chỉ email",
          "Số điện thoại",
          "Thông tin thanh toán (được xử lý qua cổng thanh toán bên thứ ba -- chúng tôi không lưu trữ thông tin thẻ ngân hàng hoặc số tài khoản)",
        ],
      },
      {
        label: "b) Thông tin được thu thập tự động:",
        items: [
          "Lịch sử học tập: khoá học đã đăng ký, tiến độ hoàn thành bài học, kết quả bài kiểm tra",
          "Dữ liệu hoạt động: tần suất truy cập, thời gian sử dụng, tương tác trong cộng đồng",
          "Thông tin kỹ thuật: địa chỉ IP, loại trình duyệt (User-Agent), hệ điều hành, thiết bị truy cập",
          "Dữ liệu cookie và mã theo dõi (xem mục 5)",
        ],
      },
    ],
  },
  {
    id: "muc-dich",
    title: "2. Mục đích sử dụng thông tin",
    content: [
      "Theo Điều 3 Nghị định 13/2023/NĐ-CP, chúng tôi chỉ xử lý dữ liệu cá nhân khi có mục đích rõ ràng. Cụ thể, thông tin của bạn được sử dụng cho các mục đích sau:",
    ],
    subsections: [
      {
        label: "a) Cung cấp dịch vụ:",
        items: [
          "Tạo và quản lý tài khoản người dùng",
          "Cấp quyền truy cập khoá học đã mua hoặc đăng ký",
          "Theo dõi tiến độ học tập và cấp chứng chỉ hoàn thành",
          "Xử lý đơn hàng và thanh toán",
        ],
      },
      {
        label: "b) Cải thiện trải nghiệm:",
        items: [
          "Phân tích hành vi sử dụng để tối ưu nội dung và giao diện nền tảng",
          "Đề xuất khoá học và nội dung phù hợp với nhu cầu của bạn",
        ],
      },
      {
        label: "c) Truyền thông và hỗ trợ:",
        items: [
          "Gửi email xác nhận đăng ký, thông báo khoá học, cập nhật bài học mới",
          "Gửi thông tin khuyến mãi và chương trình ưu đãi (bạn có thể huỷ đăng ký bất cứ lúc nào)",
          "Phản hồi câu hỏi và yêu cầu hỗ trợ kỹ thuật",
        ],
      },
      {
        label: "d) An ninh và pháp lý:",
        items: [
          "Phát hiện và ngăn chặn hoạt động gian lận, truy cập trái phép",
          "Tuân thủ các yêu cầu của Luật An ninh mạng 2018 và các quy định pháp luật hiện hành",
          "Theo dõi và tính hoa hồng cho chương trình đối tác giới thiệu (affiliate)",
        ],
      },
    ],
  },
  {
    id: "chia-se",
    title: "3. Chia sẻ thông tin với bên thứ ba",
    content: [
      "Chúng tôi cam kết không bán, trao đổi hoặc cho thuê thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại.",
      "Theo Điều 17 Nghị định 13/2023/NĐ-CP, chúng tôi chỉ chia sẻ dữ liệu với các nhà cung cấp dịch vụ đáng tin cậy sau đây để vận hành nền tảng:",
    ],
    subsections: [
      {
        label: "a) Nhà cung cấp hạ tầng và dịch vụ:",
        items: [
          "Supabase: lưu trữ cơ sở dữ liệu, xác thực người dùng và quản lý phiên đăng nhập (trung tâm dữ liệu tại Singapore)",
          "Vercel: hosting và phân phối nền tảng web, xử lý yêu cầu HTTP (trung tâm dữ liệu toàn cầu)",
          "Amazon Web Services (AWS SES): gửi email giao dịch và email tiếp thị",
          "Cloudflare: bảo mật, CDN và tối ưu hiệu suất website",
        ],
      },
      {
        label: "b) Dịch vụ phân tích và tiếp thị:",
        items: [
          "Facebook Pixel (Meta): theo dõi hiệu quả quảng cáo và phân tích hành vi người dùng trên nền tảng",
          "YouTube (Google): nhúng video bài học, có thể thu thập dữ liệu theo chính sách riêng của Google",
        ],
      },
    ],
    extra: [
      "Tất cả các nhà cung cấp dịch vụ trên đều tuân thủ các tiêu chuẩn bảo mật quốc tế (SOC 2, ISO 27001) và cam kết bảo vệ dữ liệu cá nhân.",
      "Chúng tôi có thể tiết lộ thông tin cá nhân khi được yêu cầu bởi cơ quan nhà nước có thẩm quyền theo quy định tại Luật An ninh mạng 2018.",
    ],
  },
  {
    id: "bao-mat",
    title: "4. Bảo mật dữ liệu",
    content: [
      "Theo Điều 26 Nghị định 13/2023/NĐ-CP, chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ thông tin cá nhân của bạn:",
    ],
    subsections: [
      {
        label: "a) Biện pháp kỹ thuật:",
        items: [
          "Mã hoá dữ liệu truyền tải qua giao thức HTTPS (TLS 1.3)",
          "Supabase Row Level Security (RLS): đảm bảo mỗi người dùng chỉ truy cập được dữ liệu của chính mình",
          "Mật khẩu được băm (bcrypt hash) và không bao giờ lưu dưới dạng văn bản thuần",
          "Xác thực hai yếu tố (2FA) cho tài khoản quản trị",
        ],
      },
      {
        label: "b) Biện pháp tổ chức:",
        items: [
          "Giới hạn quyền truy cập: chỉ nhân viên được uỷ quyền mới có quyền truy cập dữ liệu cá nhân",
          "Giám sát hệ thống liên tục để phát hiện và xử lý sớm các mối đe doạ bảo mật",
          "Sao lưu dữ liệu định kỳ để đảm bảo khả năng khôi phục khi có sự cố",
          "Kiểm tra và cập nhật các biện pháp bảo mật thường xuyên",
        ],
      },
    ],
  },
  {
    id: "cookie",
    title: "5. Cookie và công nghệ theo dõi",
    content: [
      "Chúng tôi sử dụng cookie và các công nghệ tương tự để cải thiện trải nghiệm của bạn trên nền tảng. Theo Nghị định 13/2023/NĐ-CP, bạn có quyền được thông báo và lựa chọn về việc sử dụng cookie.",
    ],
    subsections: [
      {
        label: "a) Các loại cookie chúng tôi sử dụng:",
        items: [
          "Cookie thiết yếu (Session cookie): duy trì trạng thái đăng nhập, bảo mật phiên làm việc. Cookie này tự động xoá khi bạn đóng trình duyệt",
          "Cookie phân tích (Analytics): thu thập dữ liệu ẩn danh về cách bạn sử dụng nền tảng để cải thiện dịch vụ",
          "Cookie affiliate: theo dõi nguồn giới thiệu để tính hoa hồng cho đối tác. Cookie này có thời hạn 30 ngày",
          "Facebook Pixel: theo dõi chuyển đổi từ quảng cáo Facebook, đo lường hiệu quả chiến dịch tiếp thị",
        ],
      },
      {
        label: "b) Quản lý cookie:",
        items: [
          "Bạn có thể quản lý cài đặt cookie thông qua banner đồng ý cookie trên nền tảng hoặc thông qua cài đặt trình duyệt",
          "Vô hiệu hoá cookie thiết yếu có thể ảnh hưởng đến khả năng sử dụng một số tính năng",
          "Bạn có thể từ chối cookie phân tích và tiếp thị mà không ảnh hưởng đến trải nghiệm học tập cơ bản",
        ],
      },
    ],
  },
  {
    id: "quyen",
    title: "6. Quyền của người dùng",
    content: [
      "Theo Điều 9 Nghị định 13/2023/NĐ-CP và quy định của Luật An ninh mạng 2018, bạn có các quyền sau đối với dữ liệu cá nhân của mình:",
    ],
    subsections: [
      {
        label: "a) Quyền xem và truy cập dữ liệu:",
        items: [
          "Xem toàn bộ dữ liệu cá nhân mà chúng tôi lưu trữ về bạn",
          "Yêu cầu bản sao dữ liệu cá nhân ở định dạng có thể đọc được (quyền di chuyển dữ liệu)",
        ],
      },
      {
        label: "b) Quyền chỉnh sửa dữ liệu:",
        items: [
          "Cập nhật hoặc sửa đổi thông tin cá nhân không chính xác hoặc không đầy đủ",
          "Thay đổi thông tin liên hệ (email, số điện thoại) qua trang Cài đặt tài khoản",
        ],
      },
      {
        label: "c) Quyền xoá dữ liệu:",
        items: [
          "Yêu cầu xoá toàn bộ dữ liệu cá nhân khỏi hệ thống",
          "Sau khi nhận yêu cầu, chúng tôi sẽ xoá hoặc ẩn danh hoá dữ liệu trong vòng 30 ngày",
          "Một số dữ liệu có thể được giữ lại nếu pháp luật yêu cầu (ví dụ: hoá đơn thanh toán theo Luật Kế toán)",
        ],
      },
      {
        label: "d) Quyền khác:",
        items: [
          "Quyền hạn chế xử lý: yêu cầu ngừng xử lý dữ liệu trong một số trường hợp nhất định",
          "Quyền phản đối: phản đối việc sử dụng dữ liệu cho mục đích tiếp thị trực tiếp",
          "Quyền rút lại sự đồng ý: rút lại sự đồng ý đã cung cấp trước đó bất cứ lúc nào",
          "Quyền khiếu nại: khiếu nại đến cơ quan bảo vệ dữ liệu cá nhân nếu cho rằng quyền của bạn bị vi phạm",
        ],
      },
    ],
    extra: [
      "Để thực hiện bất kỳ quyền nào nêu trên, vui lòng liên hệ chúng tôi qua email support@ledangkhuong.net. Chúng tôi sẽ xác minh danh tính và phản hồi trong vòng 72 giờ, xử lý hoàn tất trong vòng 30 ngày kể từ ngày nhận được yêu cầu hợp lệ.",
    ],
  },
  {
    id: "luu-tru",
    title: "7. Thời gian lưu trữ dữ liệu",
    content: [
      "Theo Điều 16 Nghị định 13/2023/NĐ-CP, chúng tôi chỉ lưu trữ dữ liệu cá nhân trong thời gian cần thiết cho mục đích đã nêu:",
    ],
    subsections: [
      {
        label: "Thời gian lưu trữ cụ thể:",
        items: [
          "Dữ liệu tài khoản (tên, email, số điện thoại): trong suốt thời gian tài khoản còn hoạt động và 30 ngày sau khi yêu cầu xoá",
          "Lịch sử học tập và chứng chỉ: trong suốt thời gian tài khoản hoạt động để đảm bảo quyền truy cập khoá học",
          "Dữ liệu thanh toán và hoá đơn: lưu trữ tối thiểu 10 năm theo quy định của Luật Kế toán Việt Nam",
          "Nhật ký truy cập (IP, User-Agent): lưu trữ tối đa 12 tháng cho mục đích bảo mật",
          "Dữ liệu cookie phân tích: tối đa 26 tháng",
        ],
      },
    ],
    extra: [
      "Sau khi hết thời gian lưu trữ, dữ liệu sẽ được xoá vĩnh viễn hoặc ẩn danh hoá để không thể nhận dạng cá nhân.",
    ],
  },
  {
    id: "thay-doi",
    title: "8. Thay đổi chính sách bảo mật",
    content: [
      "Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian để phản ánh các thay đổi trong hoạt động hoặc yêu cầu pháp lý mới.",
      "Khi có thay đổi quan trọng, chúng tôi sẽ:",
    ],
    list: [
      "Thông báo cho bạn qua email đã đăng ký ít nhất 7 ngày trước khi thay đổi có hiệu lực",
      "Đăng thông báo rõ ràng trên nền tảng",
      "Cập nhật ngày \"Cập nhật lần cuối\" ở đầu trang chính sách",
    ],
    extra: [
      "Việc tiếp tục sử dụng nền tảng sau khi chính sách được cập nhật đồng nghĩa với việc bạn chấp nhận các thay đổi. Chúng tôi khuyến khích bạn xem lại chính sách này định kỳ.",
    ],
  },
  {
    id: "lien-he",
    title: "9. Liên hệ",
    content: [
      "Nếu bạn có bất kỳ câu hỏi, yêu cầu hoặc khiếu nại nào liên quan đến chính sách bảo mật hoặc cách chúng tôi xử lý dữ liệu cá nhân, vui lòng liên hệ:",
    ],
  },
];

export default function PrivacyPage() {
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Quay về trang chủ
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Chính Sách Bảo Mật
          </h1>
          <p className="text-gray-400 text-sm">
            Cập nhật lần cuối: 18 tháng 5, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Introduction */}
          <div className="space-y-3">
            <p className="text-gray-300 leading-relaxed">
              Chào mừng bạn đến với{" "}
              <span className="text-white font-medium">{siteConfig.domain}</span>{" "}
              -- nền tảng học tập trực tuyến thuộc sở hữu và vận hành bởi{" "}
              <span className="text-white font-medium">{siteConfig.name}</span>.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Chúng tôi tôn trọng quyền riêng tư của bạn và cam kết bảo vệ thông
              tin cá nhân mà bạn cung cấp khi sử dụng dịch vụ. Chính sách bảo mật
              này được xây dựng phù hợp với{" "}
              <span className="text-white font-medium">Luật An ninh mạng 2018</span>{" "}
              (Luật số 24/2018/QH14) và{" "}
              <span className="text-white font-medium">
                Nghị định 13/2023/NĐ-CP
              </span>{" "}
              về bảo vệ dữ liệu cá nhân, nhằm giải thích cách chúng tôi thu thập,
              sử dụng, lưu trữ và bảo vệ dữ liệu cá nhân của bạn.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Bằng việc truy cập và sử dụng nền tảng, bạn xác nhận đã đọc, hiểu và
              đồng ý với các điều khoản trong chính sách bảo mật này.
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
                <p key={i} className="text-gray-300 leading-relaxed mb-3">
                  {paragraph}
                </p>
              ))}

              {/* Simple list (for sections like "thay-doi") */}
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

              {/* Subsections with lettered labels */}
              {section.subsections?.map((sub, si) => (
                <div key={si} className="mb-5">
                  <h3 className="text-sm font-semibold text-white mb-2 mt-4">
                    {sub.label}
                  </h3>
                  <ul className="space-y-2 ml-1">
                    {sub.items.map((item, ii) => (
                      <li
                        key={ii}
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
                <p key={i} className="text-gray-300 leading-relaxed mb-3">
                  {paragraph}
                </p>
              ))}

              {/* Contact info for the last section */}
              {section.id === "lien-he" && (
                <div className="card-dark p-5 mt-4 space-y-3">
                  <p className="text-gray-300">
                    <span className="text-gray-500">Nền tảng:</span>{" "}
                    <span className="text-white font-medium">
                      {siteConfig.name}
                    </span>
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-500">Người chịu trách nhiệm bảo vệ dữ liệu:</span>{" "}
                    <span className="text-white font-medium">
                      {siteConfig.owner.name}
                    </span>
                  </p>
                  <p className="text-gray-300">
                    <span className="text-gray-500">Website:</span>{" "}
                    <Link href="/" className="text-[#D4A843] hover:underline">
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
                      className="text-[#D4A843] hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      0782 276 727
                    </a>
                  </p>
                </div>
              )}
            </section>
          ))}

          {/* Legal basis note */}
          <div className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
            <p className="text-sm text-gray-400 leading-relaxed">
              <span className="text-white font-medium">Cơ sở pháp lý:</span>{" "}
              Chính sách bảo mật này được xây dựng tuân thủ Luật An ninh mạng 2018
              (Luật số 24/2018/QH14), Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu
              cá nhân, và các quy định pháp luật liên quan của nước Cộng hoà Xã hội
              Chủ nghĩa Việt Nam. Mọi tranh chấp phát sinh sẽ được giải quyết theo
              pháp luật Việt Nam.
            </p>
          </div>

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

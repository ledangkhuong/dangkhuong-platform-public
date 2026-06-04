import TopBar from "@/components/layout/TopBar";
import {
  Video,
  Briefcase,
  User,
  Download,
  FileText,
  Clock,
} from "lucide-react";

/* ── Resource data ── */

interface Resource {
  title: string;
  description: string;
  available: boolean;
}

interface Category {
  name: string;
  icon: typeof Video;
  color: string;
  bg: string;
  resources: Resource[];
}

const categories: Category[] = [
  {
    name: "Templates Video AI",
    icon: Video,
    color: "#D4A843",
    bg: "rgba(212,168,67,0.1)",
    resources: [
      {
        title: "Prompt tạo video VEO3.1",
        description:
          "Bộ prompt mẫu giúp bạn tạo video chất lượng cao với VEO3.1 chỉ trong vài phút.",
        available: false,
      },
      {
        title: "Kịch bản video AI mẫu",
        description:
          "Các mẫu kịch bản video AI sẵn sàng sử dụng cho nhiều lĩnh vực khác nhau.",
        available: false,
      },
      {
        title: "Checklist xuất bản video",
        description:
          "Danh sách kiểm tra trước khi đăng video để đảm bảo chất lượng tốt nhất.",
        available: false,
      },
    ],
  },
  {
    name: "Tài liệu Kinh doanh",
    icon: Briefcase,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    resources: [
      {
        title: "100 Mô hình kinh doanh sản phẩm số",
        description:
          "Tổng hợp 100 mô hình kinh doanh sản phẩm số đã được kiểm chứng hiệu quả.",
        available: false,
      },
      {
        title: "Hướng dẫn bán hàng online",
        description:
          "Hướng dẫn từ A-Z cách bán hàng online hiệu quả trên các nền tảng phổ biến.",
        available: false,
      },
      {
        title: "Template kế hoạch kinh doanh",
        description:
          "Mẫu kế hoạch kinh doanh chuyên nghiệp giúp bạn xây dựng chiến lược rõ ràng.",
        available: false,
      },
    ],
  },
  {
    name: "Thương hiệu cá nhân",
    icon: User,
    color: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
    resources: [
      {
        title: "Hướng dẫn xây dựng thương hiệu",
        description:
          "Lộ trình xây dựng thương hiệu cá nhân từ zero đến có thu nhập ổn định.",
        available: false,
      },
      {
        title: "Template bio & profile",
        description:
          "Các mẫu bio và profile chuyên nghiệp cho mạng xã hội và website cá nhân.",
        available: false,
      },
      {
        title: "Chiến lược content marketing",
        description:
          "Kế hoạch content marketing 90 ngày giúp bạn tăng trưởng thương hiệu nhanh chóng.",
        available: false,
      },
    ],
  },
];

/* ── Page ── */

export default function ResourcesPage() {
  return (
    <div>
      <TopBar
        title="Tài nguyên"
        subtitle="Templates, tài liệu và công cụ hỗ trợ học tập"
      />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-8">
        {/* Intro */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(212,168,67,0.1)" }}
            >
              <FileText size={18} className="text-[#D4A843]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Thư viện tài nguyên
              </h2>
              <p className="text-sm text-gray-400">
                Tải xuống các template, tài liệu và công cụ để hỗ trợ hành trình
                học tập và kinh doanh của bạn.
              </p>
            </div>
          </div>
        </div>

        {/* Categories */}
        {categories.map((category) => (
          <section key={category.name}>
            {/* Category header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: category.bg }}
              >
                <category.icon size={16} style={{ color: category.color }} />
              </div>
              <h3 className="text-base font-semibold text-white">
                {category.name}
              </h3>
              <span className="text-xs text-gray-500">
                {category.resources.length} tài nguyên
              </span>
            </div>

            {/* Resource cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.resources.map((resource) => (
                <div
                  key={resource.title}
                  className="card-dark p-5 flex flex-col justify-between hover:bg-[#1f1f1f] transition-colors"
                >
                  <div>
                    {/* Icon + title */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: category.bg }}
                      >
                        <category.icon
                          size={16}
                          style={{ color: category.color }}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white leading-snug">
                          {resource.title}
                        </h4>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">
                      {resource.description}
                    </p>
                  </div>

                  {/* Action */}
                  {resource.available ? (
                    <a
                      href="#"
                      className="btn-green text-xs inline-flex items-center gap-1.5 w-fit"
                    >
                      <Download size={13} />
                      Truy cập
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 px-3 py-1.5 rounded-lg w-fit bg-[#222]">
                      <Clock size={12} />
                      Sắp ra mắt
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

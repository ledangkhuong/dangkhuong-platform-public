"use client";

import {
  Check,
  X,
  Baby,
  Briefcase,
  GraduationCap,
  PenTool,
  Users,
  Heart,
} from "lucide-react";

const audienceCards = [
  {
    icon: Baby,
    title: "Mẹ bỉm sữa",
    description:
      "Muốn kiếm thu nhập tại nhà, không cần lên hình, làm khi con ngủ",
  },
  {
    icon: Briefcase,
    title: "Nhân viên văn phòng",
    description:
      "Muốn có nguồn thu nhập thụ động bằng USD, làm thêm buổi tối",
  },
  {
    icon: GraduationCap,
    title: "Giáo viên tiếng Anh",
    description:
      "Muốn mở rộng thị trường ra quốc tế, tận dụng chuyên môn sẵn có",
  },
  {
    icon: Users,
    title: "Sinh viên & Freelancer",
    description: "Muốn xây tài sản số dài hạn từ sớm",
  },
  {
    icon: PenTool,
    title: "Người làm content",
    description:
      "Muốn thử ngách mới ít cạnh tranh, kiếm USD thay vì VNĐ",
  },
  {
    icon: Heart,
    title: "Bất kỳ ai muốn...",
    description:
      "Một nguồn thu nhập tự động – để có thời gian sống cân bằng",
  },
];

const notForItems = [
  "Người muốn giàu sau 1 đêm mà không chịu hành động",
  "Người không sẵn sàng đầu tư nghiêm túc thời gian, tiền bạc để tạo nguồn thu nhập mới từ Youtube",
  "Người chỉ muốn xem cho biết, không có ý định làm",
];

export default function AudienceSection() {
  return (
    <section
      className="relative py-12 sm:py-20 md:py-28 overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section title */}
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center text-white mb-8 sm:mb-14 md:mb-20 leading-tight"
        >
          Khóa Học Này Đặc Biệt
          <br className="hidden sm:block" />
          <span className="block sm:inline"> Phù Hợp Với:</span>
        </h2>

        {/* Audience cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {audienceCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div
                key={index}
                className="rounded-2xl p-6 md:p-7 transition-all duration-300 hover:translate-y-[-2px]"
                style={{
                  backgroundColor: "#111111",
                  border: "1px solid #1f1f1f",
                }}
              >
                {/* Card icon + title */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}
                  >
                    <IconComponent
                      className="w-5 h-5"
                      style={{ color: "#22c55e" }}
                    />
                  </div>
                  <h3
                    className="text-lg md:text-xl font-bold"
                    style={{ color: "#FBBF24" }}
                  >
                    {card.title}
                  </h3>
                </div>

                {/* Check mark + description */}
                <div className="flex items-start gap-3 ml-1">
                  <Check
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: "#22c55e" }}
                  />
                  <p className="text-gray-300 text-base leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* NOT for section */}
        <div
          className="mt-14 md:mt-20 rounded-2xl p-6 md:p-8"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.03)",
            border: "1px solid rgba(239, 68, 68, 0.15)",
          }}
        >
          <h3 className="text-lg md:text-xl font-semibold text-gray-500 mb-5 text-center">
            Khóa học này{" "}
            <span className="uppercase font-bold" style={{ color: "#ef4444" }}>
              KHÔNG
            </span>{" "}
            dành cho:
          </h3>

          <ul className="space-y-3 max-w-2xl mx-auto">
            {notForItems.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-gray-500 text-sm md:text-base leading-relaxed"
              >
                <X
                  className="w-4 h-4 flex-shrink-0 mt-1"
                  style={{ color: "#ef4444", opacity: 0.7 }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

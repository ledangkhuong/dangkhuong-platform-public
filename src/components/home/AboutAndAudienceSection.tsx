"use client";

import Image from "next/image";
import {
  Award,
  Heart,
  Briefcase,
  GraduationCap,
  ShoppingBag,
  Rocket,
  type LucideIcon,
} from "lucide-react";

interface AboutAndAudienceSectionProps {
  onOpenModal?: () => void;
  facebookUrl?: string;
}

interface TrustPoint {
  icon: string;
  text: string;
}

interface AudienceCard {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const trustPoints: TrustPoint[] = [
  {
    icon: "🎓",
    text: "Founder Kohada — hệ sinh thái đào tạo Video AI & Thương hiệu cá nhân",
  },
  {
    icon: "🇻🇳",
    text: "Người Việt đầu tiên xây giáo trình Video AI VEO3.1 từ A–Z",
  },
  {
    icon: "👥",
    text: "Đã đào tạo 1.300+ học viên — tạo ra 300M+ lượt view",
  },
  {
    icon: "🤖",
    text: "Tiên phong ứng dụng AI Agent vào hệ thống bán hàng tự động",
  },
];

const audienceCards: AudienceCard[] = [
  {
    icon: Award,
    title: "Chuyên gia / Coach / Mentor",
    desc: "Muốn biến chuyên môn thành thu nhập tự động.",
  },
  {
    icon: Heart,
    title: "Bác sĩ / Dược sĩ / Chuyên gia sức khoẻ",
    desc: "Muốn xây thương hiệu uy tín, thu hút bệnh nhân chủ động.",
  },
  {
    icon: GraduationCap,
    title: "Giáo viên / Đào tạo viên",
    desc: "Muốn bán khoá học online, scale doanh thu mà không scale thời gian.",
  },
  {
    icon: ShoppingBag,
    title: "Chủ shop online",
    desc: "Muốn bán hàng tự động, thôi đốt giờ chat và chốt đơn thủ công.",
  },
  {
    icon: Briefcase,
    title: "Người kinh doanh online",
    desc: "Muốn tăng đơn 5–10 lần với AI Agent bán hàng tự động.",
  },
  {
    icon: Rocket,
    title: "Người mới bắt đầu từ con số 0",
    desc: "Muốn khởi nghiệp online đúng đường ngay từ đầu, không lạc lối.",
  },
];

export default function AboutAndAudienceSection({
  facebookUrl,
}: AboutAndAudienceSectionProps) {
  const fbUrl = facebookUrl ?? "https://www.facebook.com/dangkhuong.kohada";

  return (
    <>
      {/* ═══ PART A: ABOUT LÊ ĐĂNG KHƯƠNG ═══ */}
      <section className="py-12 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-3 sm:mb-4">
            Lê Đăng Khương <span className="text-[#D4A843]">là ai?</span>
          </h2>
          <p className="text-center text-lg text-gray-400 mb-8 sm:mb-14">
            Người vừa tự tay code cả hệ thống, vừa dạy bạn cách làm
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            {/* Portrait */}
            <div className="lg:col-span-2">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden relative border border-white/10">
                <Image
                  src="/images/about/portrait.jpg"
                  alt="Lê Đăng Khương"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
                <div
                  className="absolute bottom-0 left-0 right-0 p-4 text-center"
                  style={{
                    background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
                  }}
                >
                  <div className="text-lg font-bold">Lê Đăng Khương</div>
                  <div className="text-sm text-[#D4A843]">Founder Kohada</div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="lg:col-span-3 space-y-5">
              <h3 className="text-xl sm:text-2xl font-bold leading-snug">
                Người Việt đầu tiên dạy bạn AI bằng cách{" "}
                <span className="text-[#D4A843]">
                  chính tôi đã làm và đang chạy ra tiền
                </span>
              </h3>

              <div className="text-gray-400 leading-relaxed space-y-4">
                <p>
                  Tôi là <strong className="text-white">Lê Đăng Khương</strong>{" "}
                  — Founder KOHADA.
                </p>
                <p>
                  Khác với phần lớn người dạy AI, tôi không chỉ nói lý thuyết.
                  Tôi đã tự tay code toàn bộ hệ thống dangkhuong.com — từ trang
                  bán hàng, thanh toán nội địa, đến AI Agent chốt đơn tự động —
                  và nó đang chạy ra tiền thật mỗi ngày. Cái tôi dạy bạn, là cái
                  chính tôi đã làm.
                </p>
                <p>
                  Tôi là người Việt đầu tiên xây giáo trình Video AI VEO3.1 từ
                  A-Z, và đã đồng hành cùng hơn 1.300 học viên tạo ra hơn 300
                  triệu lượt xem.
                </p>
                <p>
                  Nhưng điều tôi tin nhất: công cụ rồi sẽ đổi — VEO hôm nay,
                  model khác ngày mai. Thứ còn lại mãi là tư duy hệ thống. Nên
                  tôi luôn dạy bạn tư duy trước, công cụ sau.
                </p>
              </div>

              <div className="space-y-3">
                {trustPoints.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <span className="text-sm text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>

              <blockquote className="border-l-2 border-[#D4A843] pl-4 italic text-gray-400 text-sm">
                &quot;Giúp 10.000 chuyên gia Việt Nam làm chủ AI, xây thương
                hiệu và hệ thống bán hàng tự động — không phải để giàu hơn, mà
                để sống đầy đủ hơn, cân bằng cả 8 khía cạnh cuộc đời.&quot;
              </blockquote>

              <a
                href={fbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ background: "#1877F2", color: "#fff" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Chat với Lê Đăng Khương
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PART B: WHO IS THIS FOR ═══ */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-center mb-8 sm:mb-14">
            Lộ trình này <span className="text-[#D4A843]">dành cho bạn</span>{" "}
            nếu...
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {audienceCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-[#D4A843]/20 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(212,168,67,0.1)" }}
                  >
                    <Icon size={20} className="text-[#D4A843]" />
                  </div>
                  <h3 className="font-bold mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Zap, Phone, ShoppingCart, Eye, UserPlus, FileText, MousePointerClick, type LucideIcon } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";
import CopyInline from "@/components/admin/CopyInline";

interface Snippet {
  title: string;
  eventName: string;
  icon: LucideIcon;
  color: string;
  description: string;
  htmlExample: string;
  reactExample: string;
}

const SNIPPETS: Snippet[] = [
  {
    title: "Lead — Form đăng ký",
    eventName: "Lead",
    icon: UserPlus,
    color: "#22c55e",
    description: "Fire khi user submit form đăng ký nhận tư vấn / nhận tài liệu. KHÔNG dùng cho mua hàng — dùng Purchase.",
    htmlExample: `<form data-dk-track="Lead" data-dk-on="submit" data-dk-content="Đăng ký nhận tư vấn">
  <input name="name" placeholder="Họ tên" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="phone" type="tel" placeholder="Số điện thoại" />
  <button type="submit">Đăng ký ngay</button>
</form>`,
    reactExample: `import { trackLead } from "@/lib/pixel-tracker";

<form onSubmit={(e) => {
  e.preventDefault();
  const fd = new FormData(e.target as HTMLFormElement);
  trackLead("khoa-hoc-video-ai", {
    email: fd.get("email") as string,
    phone: fd.get("phone") as string,
    name: fd.get("name") as string,
  }, { content_name: "Đăng ký tư vấn" });
  // ... gọi API submit form
}}>...</form>`,
  },
  {
    title: "Contact — Click gọi / Zalo / Messenger",
    eventName: "Contact",
    icon: Phone,
    color: "#3b82f6",
    description: "Fire khi user click nút gọi điện, chat Zalo, Messenger, hoặc các CTA liên hệ.",
    htmlExample: `<a href="tel:0901234567" data-dk-track="Contact" data-dk-content="Gọi điện">
  📞 Gọi ngay: 0901 234 567
</a>

<a href="https://zalo.me/0901234567" target="_blank"
   data-dk-track="Contact" data-dk-content="Chat Zalo">
  💬 Nhắn Zalo
</a>

<a href="https://m.me/dangkhuongofficial" target="_blank"
   data-dk-track="Contact" data-dk-content="Messenger">
  Nhắn Messenger
</a>`,
    reactExample: `import { trackContact } from "@/lib/pixel-tracker";

<button onClick={() => {
  trackContact("khoa-hoc-video-ai", undefined, { content_name: "Gọi điện" });
  window.location.href = "tel:0901234567";
}}>📞 Gọi ngay</button>`,
  },
  {
    title: "Purchase — Thanh toán thành công",
    eventName: "Purchase",
    icon: ShoppingCart,
    color: "#D4A843",
    description: "Fire SAU KHI user thanh toán thành công. Đã có sẵn ở /api/sepay/webhook → server-side CAPI fire tự động. Nếu cần fire thêm client-side trên trang Thank You:",
    htmlExample: `<!-- Trang Thank You sau khi thanh toán -->
<div data-dk-track="Purchase" data-dk-on="visible"
     data-dk-value="999000"
     data-dk-currency="VND"
     data-dk-content="Khoá Video AI VEO3.1">
  ✓ Cảm ơn bạn đã đặt hàng!
</div>`,
    reactExample: `import { trackPageEvent } from "@/lib/pixel-tracker";

useEffect(() => {
  trackPageEvent({
    slug: "khoa-hoc-video-ai",
    eventName: "Purchase",
    customData: {
      value: 999000,
      currency: "VND",
      content_name: "Khoá Video AI VEO3.1",
      order_id: orderId,
    },
  });
}, [orderId]);`,
  },
  {
    title: "ViewContent — Xem chi tiết khoá / sản phẩm",
    eventName: "ViewContent",
    icon: Eye,
    color: "#a855f7",
    description: "Fire khi user xem chi tiết 1 sản phẩm cụ thể, hoặc scroll tới section quan trọng (bảng giá, FAQ, testimonials).",
    htmlExample: `<!-- Fire khi user scroll tới bảng giá -->
<section data-dk-track="ViewContent" data-dk-on="visible"
         data-dk-content="Bảng giá"
         data-dk-value="999000">
  <h2>Bảng giá</h2>
  ...
</section>`,
    reactExample: `import { trackViewContent } from "@/lib/pixel-tracker";

useEffect(() => {
  trackViewContent("khoa-hoc-video-ai", {
    content_name: product.title,
    content_ids: [product.id],
    content_type: "product",
    value: product.price,
    currency: "VND",
  });
}, [product.id]);`,
  },
  {
    title: "AddToCart — Thêm vào giỏ / Bấm Mua",
    eventName: "AddToCart",
    icon: ShoppingCart,
    color: "#f97316",
    description: "Fire khi user click nút \"Mua khoá học\" / \"Thêm vào giỏ\" (trước khi sang trang thanh toán).",
    htmlExample: `<button data-dk-track="AddToCart"
        data-dk-content="Khoá Video AI VEO3.1"
        data-dk-value="999000">
  Mua khoá học — 999.000đ
</button>`,
    reactExample: `import { trackPageEvent } from "@/lib/pixel-tracker";

<button onClick={() => {
  trackPageEvent({
    slug: "khoa-hoc-video-ai",
    eventName: "AddToCart",
    customData: {
      content_name: "Khoá Video AI VEO3.1",
      value: 999000,
      currency: "VND",
    },
  });
  router.push("/checkout");
}}>Mua khoá học</button>`,
  },
  {
    title: "Subscribe — Đăng ký newsletter",
    eventName: "Subscribe",
    icon: FileText,
    color: "#06b6d4",
    description: "Fire khi user đăng ký nhận email newsletter / tài liệu free.",
    htmlExample: `<form data-dk-track="Subscribe" data-dk-on="submit"
      data-dk-content="Nhận tip Video AI">
  <input name="email" type="email" placeholder="Email của bạn" required />
  <button type="submit">Nhận tip miễn phí</button>
</form>`,
    reactExample: `trackPageEvent({
  slug: "khoa-hoc-video-ai",
  eventName: "Subscribe",
  userData: { email: form.email },
  customData: { content_name: "Newsletter" },
});`,
  },
  {
    title: "CompleteRegistration — Hoàn tất tạo tài khoản",
    eventName: "CompleteRegistration",
    icon: UserPlus,
    color: "#ec4899",
    description: "Fire sau khi user tạo tài khoản thành công (khác Lead — Lead là gửi form, CompleteRegistration là tạo account).",
    htmlExample: `<!-- Trang Welcome sau khi đăng ký -->
<div data-dk-track="CompleteRegistration" data-dk-on="visible"
     data-dk-content="Tài khoản mới">
  Chào mừng bạn đến với dangkhuong.com!
</div>`,
    reactExample: `trackPageEvent({
  slug: "khoa-hoc-video-ai",
  eventName: "CompleteRegistration",
  userData: { email: user.email, name: user.full_name, userId: user.id },
});`,
  },
  {
    title: "Custom Event — Tuỳ ý",
    eventName: "ScrollDepth",
    icon: MousePointerClick,
    color: "#64748b",
    description: "Cho event tuỳ chỉnh ngoài chuẩn Meta. Ví dụ: ScrollDepth, VideoPlay, Download...",
    htmlExample: `<!-- Track scroll 50% -->
<div data-dk-track="ScrollDepth" data-dk-on="visible"
     data-dk-content="50% scroll"
     style="position: absolute; top: 50%;">
</div>

<!-- Track click video -->
<button data-dk-track="VideoPlay" data-dk-content="Hero Video">
  ▶ Xem video giới thiệu
</button>`,
    reactExample: `trackPageEvent({
  slug: "khoa-hoc-video-ai",
  eventName: "VideoPlay",
  customData: { content_name: "Hero Video", video_id: "demo-1" },
});`,
  },
];

export default async function EventSnippetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager", "marketing"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div>
      <TopBar
        title="Thư viện mã sự kiện"
        subtitle="Code snippet cho marketing gắn vào landing — Lead, Contact, Purchase, ViewContent..."
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Link
          href="/admin/pixel-settings"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Quay lại Pixel & CAPI
        </Link>

        {/* Hướng dẫn tổng quan */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(212,168,67,0.08), rgba(212,168,67,0.02))",
            border: "1px solid rgba(212,168,67,0.25)",
          }}
        >
          <h3 className="text-base font-semibold text-[#D4A843] mb-3 flex items-center gap-2">
            <Zap size={18} /> 3 cách track event — chọn cách phù hợp
          </h3>
          <ol className="text-sm text-gray-300 space-y-2 list-decimal pl-5">
            <li>
              <strong className="text-white">Cách 1: Pick dropdown trong admin (NEW — không cần code, dễ nhất)</strong>{" "}
              — Vào{" "}
              <Link href="/admin/pixel-settings/pages" className="text-[#D4A843] hover:underline">
                Gắn Pixel vào landing
              </Link>{" "}
              → chọn landing → pick &ldquo;Sự kiện khi mở trang&rdquo; + &ldquo;Sự kiện khi submit form&rdquo; từ dropdown
              17 Meta Standard Events. Auto-fire khi user mở trang / submit bất kỳ form nào.
            </li>
            <li>
              <strong className="text-white">Cách 2: Data-attribute (cho element cụ thể)</strong> — Dán{" "}
              <code className="text-[#D4A843]">data-dk-track=&ldquo;EventName&rdquo;</code> vào HTML
              cho button gọi điện / scroll tới section bảng giá / click CTA mua.
            </li>
            <li>
              <strong className="text-white">Cách 3: React helper (cho dev)</strong> — Dùng{" "}
              <code className="text-[#D4A843]">trackPageEvent / trackLead / trackContact</code>{" "}
              từ <code className="text-[#D4A843]">@/lib/pixel-tracker</code>.
            </li>
          </ol>
          <p className="text-xs text-gray-500 mt-3">
            ⚠️ Cả 3 cách đều tự fire Pixel client + CAPI server dedupe qua event_id.
            Không gây nhân đôi tracking.
          </p>
        </div>

        {/* 17 Meta Standard Events reference */}
        <div className="card-dark overflow-hidden">
          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <Zap size={14} className="text-[#D4A843]" />
            <h3 className="text-sm font-semibold text-white">
              17 Meta Standard Events — Reference
            </h3>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {[
              ["AddPaymentInfo", "Thêm thông tin thanh toán (vd: nhập thẻ)"],
              ["AddToCart", "Thêm vào giỏ hàng"],
              ["AddToWishlist", "Thêm vào danh sách yêu thích"],
              ["CompleteRegistration", "Hoàn thành tạo tài khoản"],
              ["Contact", "Liên hệ — gọi / chat / Zalo / Messenger"],
              ["CustomizeProduct", "Tuỳ chỉnh sản phẩm (chọn màu, kích thước…)"],
              ["Donate", "Quyên góp / từ thiện"],
              ["FindLocation", "Tìm cửa hàng / địa điểm"],
              ["InitiateCheckout", "Bắt đầu thanh toán"],
              ["Lead", "Lead form — đăng ký nhận tư vấn / tài liệu"],
              ["Purchase", "Mua hàng thành công"],
              ["Schedule", "Đặt lịch hẹn"],
              ["Search", "Tìm kiếm sản phẩm / nội dung"],
              ["StartTrial", "Bắt đầu dùng thử miễn phí"],
              ["SubmitApplication", "Nộp đơn / hồ sơ đăng ký"],
              ["Subscribe", "Đăng ký gói trả phí / newsletter"],
              ["ViewContent", "Xem nội dung — sản phẩm, khoá học, bài blog"],
            ].map(([name, desc]) => (
              <div key={name} className="flex items-start gap-2 py-1.5"
                   style={{ borderBottom: "1px dashed #1f1f1f" }}>
                <code className="text-[#D4A843] font-mono font-semibold flex-shrink-0 min-w-[150px]">{name}</code>
                <span className="text-gray-400">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Slug context helper */}
        <div
          className="p-4 rounded-xl"
          style={{ background: "#0f0f0f", border: "1px solid #2a2a2a" }}
        >
          <h4 className="text-sm font-semibold text-white mb-2">
            🔑 Mặc định slug cho data-attribute
          </h4>
          <p className="text-xs text-gray-400 mb-2">
            Mỗi event cần biết Pixel nào fire. Có 3 cách chỉ định slug:
          </p>
          <ul className="text-xs text-gray-400 space-y-1.5 list-disc pl-5">
            <li>
              <strong>Cách tốt nhất:</strong> set trên <code className="text-[#D4A843]">&lt;body&gt;</code> hoặc <code className="text-[#D4A843]">&lt;html&gt;</code>:{" "}
              <code className="text-[#D4A843]">data-dk-default-slug=&ldquo;pixel-main&rdquo;</code> → mọi event trên page dùng slug này
            </li>
            <li>
              Hoặc thêm trực tiếp vào element:{" "}
              <code className="text-[#D4A843]">data-dk-slug=&ldquo;pixel-main&rdquo;</code>
            </li>
            <li>
              Nếu cả 2 đều không có, mặc định &ldquo;default&rdquo; — fire fail. <strong>Nên set default-slug</strong>.
            </li>
          </ul>
        </div>

        {/* Snippet cards */}
        <div className="space-y-4">
          {SNIPPETS.map((snippet) => {
            const Icon = snippet.icon;
            return (
              <div key={snippet.eventName} className="card-dark overflow-hidden">
                {/* Header */}
                <div
                  className="flex items-start gap-4 px-5 py-4"
                  style={{ borderBottom: "1px solid #2a2a2a" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${snippet.color}1a` }}
                  >
                    <Icon size={18} className="" style={{ color: snippet.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-white">{snippet.title}</h3>
                      <code
                        className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{
                          background: `${snippet.color}1a`,
                          color: snippet.color,
                          border: `1px solid ${snippet.color}40`,
                        }}
                      >
                        {snippet.eventName}
                      </code>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{snippet.description}</p>
                  </div>
                </div>

                {/* Code: HTML / Data-attribute */}
                <div className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">
                        🅰️ Cách 1 — Data-attribute (paste vào landing builder)
                      </span>
                      <CopyInline value={snippet.htmlExample} label="Copy HTML" />
                    </div>
                    <pre
                      className="p-3 rounded-lg text-xs font-mono overflow-x-auto"
                      style={{
                        background: "#0a0a0a",
                        border: "1px solid #1f1f1f",
                        color: "#e8e8e8",
                      }}
                    >
                      <code>{snippet.htmlExample}</code>
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">
                        🅱️ Cách 2 — React (cho dev)
                      </span>
                      <CopyInline value={snippet.reactExample} label="Copy React" />
                    </div>
                    <pre
                      className="p-3 rounded-lg text-xs font-mono overflow-x-auto"
                      style={{
                        background: "#0a0a0a",
                        border: "1px solid #1f1f1f",
                        color: "#e8e8e8",
                      }}
                    >
                      <code>{snippet.reactExample}</code>
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer help */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(59,130,246,0.05)",
            border: "1px solid rgba(59,130,246,0.2)",
          }}
        >
          <h4 className="text-sm font-semibold text-[#3b82f6] mb-2">
            📚 Tham khảo thêm
          </h4>
          <ul className="text-sm text-gray-300 space-y-1 list-disc pl-5">
            <li>
              <a
                href="https://developers.facebook.com/docs/meta-pixel/reference#standard-events"
                target="_blank"
                rel="noreferrer"
                className="text-[#3b82f6] hover:underline"
              >
                Meta Standard Events (event_name chuẩn)
              </a>
            </li>
            <li>
              <Link href="/admin/pixel-settings" className="text-[#3b82f6] hover:underline">
                Quay lại quản lý Pixel & CAPI
              </Link>
            </li>
            <li>
              <Link href="/admin/pixel-settings/pages" className="text-[#3b82f6] hover:underline">
                Gắn Pixel vào landing
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

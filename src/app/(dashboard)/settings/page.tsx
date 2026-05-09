"use client";

import TopBar from "@/components/layout/TopBar";
import { useState } from "react";
import { User, Bell, Shield, CreditCard, Globe, ChevronRight, Check, Eye, EyeOff } from "lucide-react";

const tabs = [
  { id: "profile", label: "Hồ sơ", icon: User },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "security", label: "Bảo mật", icon: Shield },
  { id: "billing", label: "Thanh toán", icon: CreditCard },
];

function ProfileTab() {
  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4">Ảnh đại diện</h3>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #22c55e, #059669)" }}>
            ĐK
          </div>
          <div>
            <button className="btn-green text-sm mb-2">Tải ảnh lên</button>
            <p className="text-xs text-gray-500">JPG, PNG, GIF tối đa 5MB</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4">Thông tin cá nhân</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: "Họ và tên", placeholder: "Lê Đăng Khương", type: "text" },
            { label: "Email", placeholder: "dangkhuong@gmail.com", type: "email" },
            { label: "Số điện thoại", placeholder: "+84 xxx xxx xxx", type: "tel" },
            { label: "Nghề nghiệp", placeholder: "Marketing Expert / Founder", type: "text" },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">{f.label}</label>
              <input type={f.type} defaultValue={f.placeholder} className="input-dark w-full text-sm" />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Bio ngắn</label>
            <textarea defaultValue="Marketing Expert | Founder | Dạy kỹ năng xây dựng thương hiệu cá nhân & bán hàng online"
              rows={3} className="input-dark w-full text-sm resize-none" />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button className="btn-green text-sm">Lưu thay đổi</button>
        </div>
      </div>

      {/* Social links */}
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Globe size={16} /> Mạng xã hội
        </h3>
        <div className="space-y-3">
          {[
            { label: "Facebook", placeholder: "https://facebook.com/dangkhuong" },
            { label: "YouTube", placeholder: "https://youtube.com/@dangkhuong" },
            { label: "TikTok", placeholder: "https://tiktok.com/@dangkhuong" },
            { label: "Website", placeholder: "https://dangkhuong.com" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 shrink-0">{f.label}</span>
              <input type="url" defaultValue={f.placeholder} className="input-dark flex-1 text-sm" />
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button className="btn-green text-sm">Lưu</button>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    email_new_lesson: true,
    email_community: true,
    email_promotions: false,
    email_weekly: true,
    push_community: true,
    push_events: true,
    push_achievements: true,
  });

  type PrefKey = keyof typeof prefs;
  const toggle = (key: PrefKey) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const groups = [
    {
      title: "Email thông báo",
      items: [
        { key: "email_new_lesson" as PrefKey, label: "Bài học mới", desc: "Khi có nội dung mới trong khoá học bạn đã đăng ký" },
        { key: "email_community" as PrefKey, label: "Hoạt động cộng đồng", desc: "Khi có reply hoặc mention trong cộng đồng" },
        { key: "email_promotions" as PrefKey, label: "Ưu đãi & khuyến mãi", desc: "Thông tin về sản phẩm mới và ưu đãi đặc biệt" },
        { key: "email_weekly" as PrefKey, label: "Newsletter hàng tuần", desc: "Digest nội dung hay mỗi thứ Hai" },
      ],
    },
    {
      title: "Thông báo đẩy",
      items: [
        { key: "push_community" as PrefKey, label: "Tin nhắn cộng đồng", desc: "Like, comment, mention trong feed" },
        { key: "push_events" as PrefKey, label: "Nhắc nhở sự kiện", desc: "1 tiếng trước khi sự kiện bắt đầu" },
        { key: "push_achievements" as PrefKey, label: "Thành tích & badges", desc: "Khi đạt được huy hiệu hoặc lên level" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.title} className="card-dark p-6">
          <h3 className="font-semibold text-white mb-4">{g.title}</h3>
          <div className="space-y-4">
            {g.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-white font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                </div>
                <button
                  onClick={() => toggle(item.key)}
                  className="shrink-0 w-11 h-6 rounded-full transition-all duration-200 relative"
                  style={{ background: prefs[item.key] ? "#22c55e" : "#333" }}>
                  <div className="w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all duration-200"
                    style={{ left: prefs[item.key] ? "calc(100% - 21px)" : "3px", width: "18px", height: "18px" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SecurityTab() {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-6">
      {/* Change password */}
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4">Đổi mật khẩu</h3>
        <div className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Mật khẩu hiện tại</label>
            <div className="relative">
              <input type={showOld ? "text" : "password"} className="input-dark w-full pr-10 text-sm" placeholder="••••••••" />
              <button onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Mật khẩu mới</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} className="input-dark w-full pr-10 text-sm" placeholder="••••••••" />
              <button onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Xác nhận mật khẩu mới</label>
            <input type="password" className="input-dark w-full text-sm" placeholder="••••••••" />
          </div>
          <button className="btn-green text-sm mt-2">Cập nhật mật khẩu</button>
        </div>
      </div>

      {/* Sessions */}
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4">Phiên đăng nhập</h3>
        <div className="space-y-3">
          {[
            { device: "Chrome / Windows 11", location: "TP. Hồ Chí Minh, Việt Nam", time: "Hiện tại", current: true },
            { device: "Safari / iPhone 15", location: "TP. Hồ Chí Minh, Việt Nam", time: "2 ngày trước", current: false },
          ].map((s) => (
            <div key={s.device} className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: "#222" }}>
              <div>
                <div className="text-sm text-white font-medium flex items-center gap-2">
                  {s.device}
                  {s.current && <span className="badge-green text-[10px]">Hiện tại</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{s.location} · {s.time}</div>
              </div>
              {!s.current && (
                <button className="text-xs text-red-400 hover:text-red-300 transition-colors">Đăng xuất</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="card-dark p-6" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
        <h3 className="font-semibold text-red-400 mb-2">Vùng nguy hiểm</h3>
        <p className="text-xs text-gray-400 mb-4">Hành động này không thể hoàn tác. Toàn bộ dữ liệu học tập, tiến độ và đóng góp của bạn sẽ bị xoá vĩnh viễn.</p>
        <button className="text-sm font-medium text-red-400 px-4 py-2 rounded-lg border border-red-900 hover:bg-red-950 transition-colors">
          Xoá tài khoản
        </button>
      </div>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="card-dark p-6" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⭐</span>
              <h3 className="font-bold text-[#f59e0b]">Quyền Đồng Hành</h3>
            </div>
            <p className="text-sm text-gray-400 mb-3">Truy cập toàn bộ khoá học & cộng đồng VIP</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">5,997,000₫</span>
              <span className="text-sm text-gray-500">/năm</span>
            </div>
          </div>
          <span className="badge-green">Đang hoạt động</span>
        </div>
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(245,158,11,0.15)" }}>
          <div className="text-xs text-gray-500">Gia hạn vào: <span className="text-white font-medium">01/01/2026</span></div>
        </div>
      </div>

      {/* Features included */}
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4">Quyền lợi hiện tại</h3>
        <div className="grid md:grid-cols-2 gap-2">
          {[
            "Tất cả khoá học (hiện tại + tương lai)",
            "Cộng đồng VIP Quyền Đồng Hành",
            "Mastermind hàng tháng",
            "Hỏi đáp 1-1 qua email",
            "Tài nguyên độc quyền",
            "Ưu tiên trong sự kiện live",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
              <Check size={14} className="text-[#22c55e] shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Order history */}
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4">Lịch sử thanh toán</h3>
        <div className="space-y-3">
          {[
            { desc: "Quyền Đồng Hành — Năm 2025", amount: "5,997,000₫", date: "01/01/2025", status: "Thành công" },
            { desc: "Khoá học Digital Product Starter", amount: "499,000₫", date: "15/10/2024", status: "Thành công" },
          ].map((o, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: "#222" }}>
              <div>
                <div className="text-sm text-white font-medium">{o.desc}</div>
                <div className="text-xs text-gray-500 mt-0.5">{o.date}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-white">{o.amount}</div>
                <div className="text-[11px] text-[#22c55e] mt-0.5">{o.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const tabComponents: Record<string, React.FC> = {
  profile: ProfileTab,
  notifications: NotificationsTab,
  security: SecurityTab,
  billing: BillingTab,
};

export default function SettingsPage() {
  const [active, setActive] = useState("profile");
  const ActiveTab = tabComponents[active];

  return (
    <div>
      <TopBar title="Cài đặt" subtitle="Quản lý tài khoản và tuỳ chọn của bạn" />

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex gap-6">
          {/* Tab sidebar */}
          <div className="w-52 shrink-0">
            <div className="card-dark p-2 space-y-0.5">
              {tabs.map((tab) => (
                <button key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group"
                  style={active === tab.id
                    ? { background: "rgba(34,197,94,0.1)", color: "#22c55e" }
                    : { color: "#9ca3af" }}>
                  <div className="flex items-center gap-2.5">
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight size={14} className={active === tab.id ? "text-[#22c55e]" : "text-gray-600 group-hover:text-gray-400"} />
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <ActiveTab />
          </div>
        </div>
      </div>
    </div>
  );
}

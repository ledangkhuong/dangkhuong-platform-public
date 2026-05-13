"use client";

import TopBar from "@/components/layout/TopBar";
import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/actions/auth";
import { User, Bell, Shield, CreditCard, Globe, ChevronRight, Check, Eye, EyeOff } from "lucide-react";

const tabs = [
  { id: "profile", label: "Hồ sơ", icon: User },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "security", label: "Bảo mật", icon: Shield },
  { id: "billing", label: "Thanh toán", icon: CreditCard },
];

type UserProfile = {
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  tier: string;
  xp: number;
  level: number;
  email: string;
};

function ProfileTab({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = use(searchParams);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initials, setInitials] = useState("??");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("full_name, phone, bio, tier, xp, level, avatar_url")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile({ ...data, email: user.email ?? "" });
            if (data.avatar_url) setAvatarUrl(data.avatar_url);
            const name = data.full_name ?? user.email ?? "?";
            const parts = name.trim().split(/\s+/);
            setInitials(
              parts.length >= 2
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : name.slice(0, 2).toUpperCase()
            );
          }
        });
    });
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setUploadingAvatar(true);

    try {
      // Load image
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      await new Promise((res) => { img.onload = res; });

      // Center-crop to square + resize to 256x256
      const size = 256;
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
      URL.revokeObjectURL(url);

      // Compress to JPEG, try 0.7 first, then 0.5 if too large
      let blob = await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b!), "image/jpeg", 0.7)
      );
      if (blob.size > 500 * 1024) {
        blob = await new Promise<Blob>((res) =>
          canvas.toBlob((b) => res(b!), "image/jpeg", 0.5)
        );
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const filename = `avatars/${user.id}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("thumbnails")
        .upload(filename, blob, { contentType: "image/jpeg", upsert: true });

      if (upErr) { setAvatarError(upErr.message); return; }

      const { data: { publicUrl } } = supabase.storage
        .from("thumbnails")
        .getPublicUrl(filename);

      const finalUrl = publicUrl + "?t=" + Date.now();

      await supabase.from("profiles").update({ avatar_url: finalUrl }).eq("id", user.id);
      setAvatarUrl(finalUrl);
    } catch {
      setAvatarError("Lỗi tải ảnh. Vui lòng thử lại.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-6">
      {saved && (
        <div
          className="p-3 rounded-lg text-sm text-[#D4A843] border border-[#D4A843]/20"
          style={{ background: "rgba(212,168,67,0.08)" }}
        >
          ✓ Đã lưu thay đổi thành công!
        </div>
      )}
      {error && (
        <div
          className="p-3 rounded-lg text-sm text-red-400 border border-red-400/20"
          style={{ background: "rgba(239,68,68,0.08)" }}
        >
          {error}
        </div>
      )}

      {/* Avatar */}
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4">Ảnh đại diện</h3>
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover shrink-0" />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #D4A843, #059669)" }}
            >
              {initials}
            </div>
          )}
          <div>
            <label className="px-3 py-1.5 rounded-lg text-sm font-medium mb-2 inline-flex cursor-pointer hover:bg-[#333] transition-colors"
              style={{ background: "#2a2a2a", color: "#9ca3af" }}>
              {uploadingAvatar ? "Đang tải..." : "Tải ảnh lên"}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
            <p className="text-xs text-gray-500">JPG, PNG — tự crop vuông &amp; nén dưới 0.5MB</p>
            {avatarError && <p className="text-xs text-red-400 mt-1">{avatarError}</p>}
          </div>
        </div>
      </div>

      {/* Personal info form */}
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4">Thông tin cá nhân</h3>
        <form action={updateProfile} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Họ và tên</label>
              <input
                name="full_name"
                type="text"
                defaultValue={profile?.full_name ?? ""}
                placeholder="Nguyễn Văn A"
                className="input-dark w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={profile?.email ?? ""}
                readOnly
                className="input-dark w-full text-sm opacity-60 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Số điện thoại</label>
              <input
                name="phone"
                type="tel"
                defaultValue={profile?.phone ?? ""}
                placeholder="+84 xxx xxx xxx"
                className="input-dark w-full text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Bio ngắn</label>
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ""}
              rows={3}
              placeholder="Giới thiệu ngắn về bạn..."
              className="input-dark w-full text-sm resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-green text-sm">
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>

      {/* Social links (static for now) */}
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Globe size={16} /> Mạng xã hội
        </h3>
        <div className="space-y-3">
          {[
            { label: "Facebook", placeholder: "https://facebook.com/..." },
            { label: "YouTube", placeholder: "https://youtube.com/@..." },
            { label: "TikTok", placeholder: "https://tiktok.com/@..." },
            { label: "Website", placeholder: "https://..." },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 shrink-0">{f.label}</span>
              <input
                type="url"
                placeholder={f.placeholder}
                className="input-dark flex-1 text-sm"
              />
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
                  style={{ background: prefs[item.key] ? "#D4A843" : "#333" }}
                >
                  <div
                    className="bg-white rounded-full absolute top-[3px] transition-all duration-200"
                    style={{
                      left: prefs[item.key] ? "calc(100% - 21px)" : "3px",
                      width: "18px",
                      height: "18px",
                    }}
                  />
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
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4">Đổi mật khẩu</h3>
        <div className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Mật khẩu hiện tại</label>
            <div className="relative">
              <input type={showOld ? "text" : "password"} className="input-dark w-full pr-10 text-sm" placeholder="••••••••" />
              <button onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-medium">Mật khẩu mới</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} className="input-dark w-full pr-10 text-sm" placeholder="••••••••" />
              <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
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

      <div className="card-dark p-6" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
        <h3 className="font-semibold text-red-400 mb-2">Vùng nguy hiểm</h3>
        <p className="text-xs text-gray-400 mb-4">Hành động này không thể hoàn tác.</p>
        <button className="text-sm font-medium text-red-400 px-4 py-2 rounded-lg border border-red-900 hover:bg-red-950 transition-colors">
          Xoá tài khoản
        </button>
      </div>
    </div>
  );
}

interface Order {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  product: { title: string } | null;
}

function BillingTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("orders")
        .select("id, amount, status, created_at, products(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setOrders((data ?? []).map((o: any) => ({
            ...o,
            product: Array.isArray(o.products) ? o.products[0] : o.products,
          })));
          setLoading(false);
        });
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="card-dark p-6">
        <h3 className="font-semibold text-white mb-4">Lịch sử thanh toán</h3>
        {loading ? (
          <p className="text-sm text-gray-500">Đang tải...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có giao dịch nào.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                <div>
                  <div className="text-sm font-medium text-white">{o.product?.title ?? "Khoá học"}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(o.created_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">{o.amount.toLocaleString("vi-VN")}đ</div>
                  <div className={`text-[10px] font-medium ${o.status === "paid" ? "text-[#22c55e]" : o.status === "pending" ? "text-[#f59e0b]" : "text-gray-500"}`}>
                    {o.status === "paid" ? "Đã thanh toán" : o.status === "pending" ? "Chờ thanh toán" : o.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [active, setActive] = useState("profile");

  return (
    <div>
      <TopBar title="Cài đặt" subtitle="Quản lý tài khoản và tuỳ chọn của bạn" />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Mobile: horizontal scrollable tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 md:hidden no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0"
              style={
                active === tab.id
                  ? { background: "rgba(212,168,67,0.1)", color: "#D4A843", border: "1px solid rgba(212,168,67,0.25)" }
                  : { color: "#9ca3af", background: "#1a1a1a", border: "1px solid #2a2a2a" }
              }
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Desktop: Tab sidebar */}
          <div className="w-52 shrink-0 hidden md:block">
            <div className="card-dark p-2 space-y-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group"
                  style={
                    active === tab.id
                      ? { background: "rgba(212,168,67,0.1)", color: "#D4A843" }
                      : { color: "#9ca3af" }
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight
                    size={14}
                    className={active === tab.id ? "text-[#D4A843]" : "text-gray-600 group-hover:text-gray-400"}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {active === "profile" && <ProfileTab searchParams={searchParams} />}
            {active === "notifications" && <NotificationsTab />}
            {active === "security" && <SecurityTab />}
            {active === "billing" && <BillingTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

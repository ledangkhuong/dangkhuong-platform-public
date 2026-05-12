"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, BookOpen, Users, Mail, BarChart3, Star, CheckCircle, Play, Zap } from "lucide-react";

const CheckoutModal = dynamic(() => import("@/components/checkout/CheckoutModal"), { ssr: false });

const features = [
  { icon: BookOpen, color: "#D4A843", title: "Khoá học chuyên sâu", desc: "Video bài học, tài liệu và bài tập thực hành được thiết kế để bạn làm được ngay." },
  { icon: Users, color: "#3b82f6", title: "Cộng đồng học tập", desc: "Kết nối với hàng nghìn người cùng chí hướng, học hỏi và phát triển cùng nhau." },
  { icon: Mail, color: "#a855f7", title: "Email Marketing", desc: "Hệ thống email tự động giúp bạn nuôi dưỡng khách hàng và tăng doanh số." },
  { icon: BarChart3, color: "#f59e0b", title: "Theo dõi tiến độ", desc: "Dashboard trực quan đo lường từng bước tiến của bạn trong hành trình học tập." },
];

const testimonials = [
  { name: "Nguyễn Minh Tuấn", role: "Founder Digital Snacks", avatar: "MT", text: "Nhờ khoá học của thầy Đăng Khương, mình đã ra mắt sản phẩm số đầu tiên và thu về 15 triệu trong tháng đầu!", stars: 5 },
  { name: "Trần Thu Hương", role: "Content Creator", avatar: "TH", text: "Cách thầy dạy rất thực chiến, không lý thuyết suông. Mình áp dụng được ngay và thấy kết quả rõ ràng sau 2 tuần.", stars: 5 },
  { name: "Lê Quang Dũng", role: "Solo Entrepreneur", avatar: "QD", text: "Cộng đồng trong đây cực kỳ chất lượng. Mọi người hỗ trợ nhau rất nhiều, không cô đơn khi tự kinh doanh.", stars: 5 },
];

const courses = [
  { emoji: "📦", title: "Digital Snacks", desc: "Tạo & bán sản phẩm số, lợi nhuận cao", price: "499K", badge: "Bestseller", color: "#D4A843", checkoutId: "digital-snacks", checkoutPrice: 499000, checkoutDesc: "Tạo & bán sản phẩm số, lợi nhuận cao" },
  { emoji: "🚀", title: "Marketing 0→1", desc: "Xây thương hiệu cá nhân từ con số 0", price: "Miễn phí", badge: "Free", color: "#3b82f6", checkoutId: null, checkoutPrice: null, checkoutDesc: null },
  { emoji: "📧", title: "Email Mastery", desc: "Email automation bán hàng tự động", price: "699K", badge: "Mới", color: "#a855f7", checkoutId: "email-mastery", checkoutPrice: 699000, checkoutDesc: "Email automation bán hàng tự động" },
];

export default function LandingPage() {
  const [checkoutProduct, setCheckoutProduct] = useState<{
    id: string; name: string; price: number; description?: string;
  } | null>(null);

  const openCheckout = (name: string, price: number, id: string, desc?: string) => {
    setCheckoutProduct({ id, name, price, description: desc });
  };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 64,
        background: "rgba(10,10,10,0.92)", borderBottom: "1px solid #1a1a1a",
        backdropFilter: "blur(12px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "white", background: "linear-gradient(135deg,#D4A843,#B8922E)" }}>ĐK</div>
          <span style={{ fontWeight: 700, color: "white", fontSize: 15 }}>Đăng Khương</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/login" style={{ fontSize: 14, color: "#9ca3af" }}>Đăng nhập</Link>
          <Link href="/register" className="btn-green" style={{ fontSize: 14, padding: "8px 20px" }}>Bắt đầu miễn phí</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)", width: 600, height: 300, borderRadius: "50%", opacity: 0.15, filter: "blur(60px)", background: "radial-gradient(circle,#D4A843,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 99, marginBottom: 24, background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)", color: "#D4A843", fontSize: 13 }}>
            <Zap size={13} /> Cộng đồng 1,200+ người học đang chờ bạn
          </div>
          <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: 20 }}>
            Xây dựng{" "}
            <span style={{ background: "linear-gradient(135deg,#D4A843,#4ade80)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              thương hiệu cá nhân
            </span>
            {" "}& kiếm tiền từ kiến thức
          </h1>
          <p style={{ fontSize: 17, color: "#9ca3af", marginBottom: 32, maxWidth: 600, margin: "0 auto 32px", lineHeight: 1.7 }}>
            Học marketing, xây dựng sản phẩm số và phát triển cộng đồng cùng Đăng Khương — chuyên gia đã giúp 1,200+ người tạo thu nhập từ internet.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="btn-green" style={{ fontSize: 15, padding: "12px 32px" }}>
              Học miễn phí ngay <ArrowRight size={17} />
            </Link>
            <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 32px", borderRadius: 8, fontSize: 15, fontWeight: 600, color: "white", border: "1px solid #2a2a2a" }}>
              <Play size={15} style={{ color: "#D4A843" }} /> Xem Demo
            </Link>
          </div>
          {/* Social proof */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginTop: 40, fontSize: 13, color: "#6b7280" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex" }}>
                {["MT","TH","QD","LA"].map(a => (
                  <div key={a} style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #0a0a0a", marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white", background: "linear-gradient(135deg,#D4A843,#059669)" }}>{a}</div>
                ))}
              </div>
              +1,200 học viên
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[1,2,3,4,5].map(i => <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />)}
              <span style={{ marginLeft: 4 }}>4.9/5 đánh giá</span>
            </div>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section style={{ padding: "64px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: "white", marginBottom: 10 }}>Khoá học nổi bật</h2>
            <p style={{ color: "#6b7280" }}>Được thiết kế để bạn áp dụng ngay — không lý thuyết suông</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
            {courses.map((c, i) => (
              <div key={i} className="card-dark" style={{ padding: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{c.emoji}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <h3 style={{ fontWeight: 700, color: "white", fontSize: 18 }}>{c.title}</h3>
                  <span className="badge-green">{c.badge}</span>
                </div>
                <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, lineHeight: 1.6 }}>{c.desc}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 18, color: c.color }}>{c.price}</span>
                  {c.checkoutId ? (
                    <button
                      onClick={() => openCheckout(c.title, c.checkoutPrice!, c.checkoutId!, c.checkoutDesc ?? undefined)}
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: c.color, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      Học ngay <ArrowRight size={14} />
                    </button>
                  ) : (
                    <Link href="/register" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: c.color }}>
                      Học ngay <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "64px 24px", background: "#0d0d0d" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: "white", marginBottom: 10 }}>Mọi thứ bạn cần ở một nơi</h2>
            <p style={{ color: "#6b7280" }}>Nền tảng học tập và kinh doanh all-in-one</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(420px,1fr))", gap: 16 }}>
            {features.map((f, i) => (
              <div key={i} className="card-dark" style={{ padding: 24, display: "flex", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: f.color + "15", flexShrink: 0 }}>
                  <f.icon size={20} color={f.color} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, color: "white", marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: "64px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: "white", marginBottom: 10 }}>Học viên nói gì?</h2>
            <p style={{ color: "#6b7280" }}>Kết quả thực tế từ cộng đồng Đăng Khương</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
            {testimonials.map((t, i) => (
              <div key={i} className="card-dark" style={{ padding: 24 }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                  {[...Array(t.stars)].map((_,j) => <Star key={j} size={13} fill="#f59e0b" color="#f59e0b" />)}
                </div>
                <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.7, marginBottom: 16, fontStyle: "italic" }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", background: "linear-gradient(135deg,#D4A843,#059669)" }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "64px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <div className="card-dark" style={{ padding: 48, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.04, background: "radial-gradient(circle at center,#D4A843,transparent)" }} />
            <div style={{ position: "relative" }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "white", marginBottom: 12 }}>Sẵn sàng bắt đầu chưa?</h2>
              <p style={{ color: "#9ca3af", marginBottom: 24, fontSize: 15 }}>Tham gia miễn phí hôm nay và nhận ngay khoá học Marketing 0→1</p>
              <Link href="/register" className="btn-green" style={{ fontSize: 15, padding: "12px 32px", display: "inline-flex" }}>
                Bắt đầu miễn phí <ArrowRight size={17} />
              </Link>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 16, fontSize: 12, color: "#6b7280", flexWrap: "wrap" }}>
                {["Không cần thẻ tín dụng", "Truy cập ngay", "Huỷ bất kỳ lúc"].map(t => (
                  <span key={t} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle size={11} color="#D4A843" /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1a1a1a", padding: "24px", textAlign: "center", fontSize: 13, color: "#6b7280" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white", background: "linear-gradient(135deg,#D4A843,#B8922E)" }}>ĐK</div>
          <span style={{ color: "white", fontWeight: 600 }}>Đăng Khương</span>
        </div>
        <p>© 2025 dangkhuong.com — All rights reserved</p>
      </footer>

      {checkoutProduct && (
        <CheckoutModal
          product={checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
          onSuccess={() => {
            setCheckoutProduct(null);
            window.location.href = "/dashboard";
          }}
        />
      )}
    </div>
  );
}

import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { Clock, Eye, ArrowRight, Tag } from "lucide-react";

const categories = ["Tất cả", "Marketing", "Personal Brand", "Digital Product", "Mindset", "Case Study"];

const posts = [
  {
    slug: "xay-dung-personal-brand-tu-so-0",
    title: "7 Bước Xây Dựng Thương Hiệu Cá Nhân Từ Con Số 0 Trong 90 Ngày",
    excerpt: "Hầu hết mọi người nghĩ xây dựng thương hiệu cá nhân cần nhiều năm. Nhưng với đúng framework, bạn có thể tạo ra sức ảnh hưởng trong vòng 90 ngày.",
    category: "Personal Brand",
    thumbnail: "🚀",
    readTime: "8 phút đọc",
    views: 4821,
    date: "05/05/2025",
    featured: true,
  },
  {
    slug: "digital-product-gia-re-ban-chay",
    title: "Tại Sao Sản Phẩm Số Giá Rẻ Lại Bán Chạy Hơn Sản Phẩm Cao Giá?",
    excerpt: "Nghịch lý trong thị trường digital products: price anchoring, perceived value và chiến lược ladder pricing từ 49K → 999K.",
    category: "Digital Product",
    thumbnail: "📦",
    readTime: "6 phút đọc",
    views: 3240,
    date: "01/05/2025",
    featured: false,
  },
  {
    slug: "email-marketing-viet-nam-2025",
    title: "Email Marketing Tại Việt Nam 2025: Số Liệu & Chiến Lược Thực Chiến",
    excerpt: "Open rate trung bình của thị trường VN là 23%. Nhưng danh sách của tôi đạt 84%. Đây là những gì tôi đang làm khác biệt.",
    category: "Marketing",
    thumbnail: "📧",
    readTime: "10 phút đọc",
    views: 6102,
    date: "25/04/2025",
    featured: false,
  },
  {
    slug: "case-study-15-trieu-thang-dau",
    title: "[Case Study] Từ 0 → 15 Triệu/Tháng Với Digital Product Trong 30 Ngày",
    excerpt: "Tôi đã làm gì trong 30 ngày đầu? Landing page, email list, sản phẩm, traffic. Breakdown chi tiết từng con số.",
    category: "Case Study",
    thumbnail: "💰",
    readTime: "15 phút đọc",
    views: 9830,
    date: "20/04/2025",
    featured: false,
  },
  {
    slug: "mindset-kinh-doanh-mot-minh",
    title: "5 Thứ Tôi Phải Từ Bỏ Để Kinh Doanh Thành Công Một Mình",
    excerpt: "Perfectionism, social validation, multitasking, toxic productivity và so sánh bản thân. Cái giá thật sự của việc là Solo Founder.",
    category: "Mindset",
    thumbnail: "🧠",
    readTime: "7 phút đọc",
    views: 2910,
    date: "15/04/2025",
    featured: false,
  },
];

export default function BlogPage() {
  const featured = posts.find(p => p.featured);
  const rest = posts.filter(p => !p.featured);

  return (
    <div>
      <TopBar title="Blog" subtitle="Kiến thức thực chiến từ người đã làm được" />

      <div className="p-6 max-w-5xl mx-auto space-y-8">

        {/* Categories */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat, i) => (
            <button key={cat} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${i === 0 ? "bg-[#22c55e] text-white" : "text-gray-400 hover:text-white"}`}
              style={i !== 0 ? { background: "#1a1a1a", border: "1px solid #2a2a2a" } : {}}>
              {cat}
            </button>
          ))}
        </div>

        {/* Featured Post */}
        {featured && (
          <Link href={`/blog/${featured.slug}`}
            className="card-dark p-6 block hover:bg-[#1f1f1f] transition-all group">
            <div className="flex gap-6 items-start">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl shrink-0"
                style={{ background: "#222" }}>{featured.thumbnail}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-green">✨ Nổi bật</span>
                  <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full" style={{ background: "#222" }}>
                    {featured.category}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2 group-hover:text-[#22c55e] transition-colors leading-snug">
                  {featured.title}
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-3 line-clamp-2">{featured.excerpt}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock size={12} />{featured.readTime}</span>
                  <span className="flex items-center gap-1"><Eye size={12} />{featured.views.toLocaleString()} lượt đọc</span>
                  <span>{featured.date}</span>
                </div>
              </div>
              <ArrowRight size={20} className="text-gray-600 group-hover:text-[#22c55e] transition-colors shrink-0 mt-1" />
            </div>
          </Link>
        )}

        {/* Post Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {rest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="card-dark p-5 block hover:bg-[#1f1f1f] transition-all group">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl shrink-0"
                  style={{ background: "#222" }}>{post.thumbnail}</div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-gray-500 font-medium px-2 py-0.5 rounded-full mb-2 inline-block"
                    style={{ background: "#222" }}>{post.category}</span>
                  <h3 className="font-semibold text-white text-sm leading-snug mb-1 group-hover:text-[#22c55e] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">{post.excerpt}</p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-600">
                    <span className="flex items-center gap-1"><Clock size={10} />{post.readTime}</span>
                    <span className="flex items-center gap-1"><Eye size={10} />{post.views.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="card-dark p-6 text-center" style={{ borderColor: "rgba(34,197,94,0.2)" }}>
          <div className="text-2xl mb-3">📬</div>
          <h3 className="font-bold text-white mb-1">Nhận bài viết mới mỗi tuần</h3>
          <p className="text-sm text-gray-400 mb-4">Tham gia 1,200+ người đang nhận newsletter marketing thực chiến của Đăng Khương</p>
          <div className="flex gap-2 max-w-sm mx-auto">
            <input type="email" placeholder="Email của bạn..." className="input-dark flex-1" />
            <button className="btn-green shrink-0">Đăng ký</button>
          </div>
        </div>
      </div>
    </div>
  );
}

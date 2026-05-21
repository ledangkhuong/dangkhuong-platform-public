# Hướng Dẫn Cài Đặt Platform Từ A-Z

> Hướng dẫn này giúp bạn tạo website riêng từ source code LMS Platform.
> Bạn sẽ có website hoàn chỉnh với: khóa học, thanh toán, cộng đồng, email marketing, CRM, affiliate...

---

## Tổng quan kiến trúc

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Vercel     │────▶│   Supabase   │────▶│  AWS SES / Email │
│  (Frontend)  │     │  (Database)  │     │   (Gửi email)    │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌──────────────┐
│ PayOS/SePay  │     │   Storage    │
│ (Thanh toán) │     │ (Ảnh, file)  │
└─────────────┘     └──────────────┘
```

**Chi phí tối thiểu:** 0đ/tháng (tất cả dịch vụ đều có free tier)

---

## Bước 1: Fork Repository

1. Đăng nhập GitHub tại https://github.com
2. Vào repo gốc → click **Fork**
3. Đặt tên repo mới (vd: `my-platform`)
4. Clone về máy:
   ```bash
   git clone https://github.com/YOUR_USERNAME/my-platform.git
   cd my-platform
   npm install
   ```

---

## Bước 2: Tạo Supabase Project

1. Vào https://supabase.com → **New Project**
2. Chọn region **Southeast Asia (Singapore)** cho tốc độ tốt nhất
3. Đặt tên project và mật khẩu database (lưu lại mật khẩu!)
4. Đợi project khởi tạo (~2 phút)

### Lấy credentials:
- Vào **Settings → API**
- Copy:
  - `Project URL` → đây là `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public key` → đây là `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role key` → đây là `SUPABASE_SERVICE_ROLE_KEY` (BẢO MẬT, không share)

---

## Bước 3: Tạo Database Schema

### 3a. Chạy schema chính
1. Vào Supabase Dashboard → **SQL Editor**
2. Mở file `supabase/schema.sql` trong project
3. Copy toàn bộ nội dung → paste vào SQL Editor → **Run**

### 3b. Chạy các migrations (theo thứ tự)
Chạy từng file SQL trong thư mục `supabase/migrations/` theo thứ tự ngày:

```
supabase/migration_affiliate.sql
supabase/migration_crm.sql
supabase/migration_roles_questions.sql
supabase/migration_product_category.sql
supabase/migrations/20250511_email_marketing.sql
supabase/migrations/20250516_email_automations.sql
supabase/migrations/20250517_crm_professional_upgrade.sql
supabase/migrations/20250518_atomic_likes_rpc.sql
supabase/migrations/20250518_notifications_table.sql
supabase/migrations/20250518_lesson_attachments.sql
supabase/migrations/20250518_atomic_counters_rpc.sql
supabase/migrations/20250518_fix_security.sql
supabase/migrations/20250518_streak_system.sql
supabase/migrations/20250518_student_notes.sql
supabase/migrations/20250518_lesson_discussions.sql
supabase/migrations/20250518_community_channels.sql
supabase/migrations/20250518_drip_content_v2.sql
supabase/migrations/20250518_abandoned_cart.sql
supabase/migrations/20250518_fix_streak_rls.sql
supabase/migrations/20250518_audit_log.sql
supabase/migrations/20250518_affiliate_unique_order.sql
supabase/migrations/20250518_fix_rls_policies.sql
supabase/migrations/20250518_indexes_and_triggers.sql
supabase/migrations/20250519_fix_blog_rls.sql
supabase/migrations/20250519_atomic_affiliate_stats.sql
supabase/migrations/20250520_announcements.sql
supabase/migrations/20250520000001_add_missing_rpc_functions.sql
supabase/migrations/20250520000002_add_missing_tables.sql
supabase/migrations/20250520000003_add_instructor_role.sql
supabase/migrations/20250520000004_add_editor_role.sql
```

> **LƯU Ý:** Bỏ qua file `20260519_seed_hocchuaxongtiendave_product.sql` — đây là data riêng, không cần chạy.

> **MẸO:** Nếu gặp lỗi "already exists" khi chạy migration, có thể bỏ qua — schema.sql đã tạo sẵn table đó.

### 3c. Tạo Storage Buckets
Vào Supabase → **Storage** → tạo 3 buckets:

| Bucket Name | Public | Mô tả |
|-------------|--------|-------|
| `thumbnails` | ✅ Yes | Ảnh khóa học, blog |
| `community-images` | ✅ Yes | Ảnh cộng đồng |
| `lesson-attachments` | ❌ No | File đính kèm bài học (chỉ học viên đã mua) |

---

## Bước 4: Cấu Hình Thương Hiệu

### 4a. Tạo file .env.local
```bash
cp .env.example .env.local
```

Mở `.env.local` và điền các giá trị:

**Bắt buộc (website hoạt động được):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

**Thêm sau khi test xong (tính năng nâng cao):**
- PayOS/SePay → thanh toán
- AWS SES → gửi email
- Google Analytics / Facebook Pixel → tracking
- Cloudflare Turnstile → chống bot

### 4b. Đổi thương hiệu
Mở file `src/lib/site-config.ts` và thay đổi:

```typescript
export const siteConfig = {
  // ─── Thay tên thương hiệu của bạn ───
  name: "Tên Academy Của Bạn",
  shortName: "Tên Ngắn",
  domain: "yourdomain.com",
  tagline: "Slogan của bạn",
  description: "Mô tả ngắn về platform",

  // ─── Thông tin chủ sở hữu ───
  owner: {
    name: "Tên Của Bạn",
    bio: "Giới thiệu ngắn về bạn",
    avatar: "/images/about/portrait.jpg",  // Thay ảnh trong thư mục public/images/
  },

  // ─── Màu thương hiệu ───
  colors: {
    brand: "#D4A843",       // Đổi sang màu brand của bạn
    brandHover: "#FBBF24",
    background: "#0a0a0a",
    surface: "#111111",
    text: "#f5f5f5",
  },

  // ─── Link mạng xã hội ───
  socials: {
    facebook: "https://facebook.com/your-page",
    youtube: "https://youtube.com/@your-channel",
    zalo: "https://zalo.me/your-phone",
    tiktok: "",
    instagram: "",
  },

  // ─── Bật/tắt tính năng ───
  features: {
    affiliate: true,     // Hệ thống affiliate
    community: true,     // Cộng đồng
    leaderboard: true,   // Bảng xếp hạng
    events: true,        // Sự kiện
    blog: true,          // Blog
    crm: true,           // CRM quản lý khách hàng
    emailMarketing: true,// Email marketing
  },
};
```

### 4c. Thay ảnh & logo
Thay các file trong thư mục `public/`:
- `public/favicon.ico` — icon tab trình duyệt
- `public/favicon.png` — icon tab (PNG)
- `public/apple-touch-icon.png` — icon iOS
- `public/images/about/portrait.jpg` — ảnh đại diện
- `public/images/hero/` — ảnh banner trang chủ

---

## Bước 5: Test Trên Máy Local

```bash
npm run dev
```

Mở http://localhost:3000 → kiểm tra:
- [x] Trang chủ hiển thị đúng tên/logo
- [x] Đăng ký tài khoản mới hoạt động
- [x] Đăng nhập hoạt động
- [x] Trang /admin truy cập được (sau khi set role = 'admin' trong Supabase)

### Set quyền Admin cho tài khoản đầu tiên:
1. Đăng ký tài khoản trên website
2. Vào Supabase → **Table Editor → profiles**
3. Tìm tài khoản vừa tạo → đổi `role` thành `admin`
4. Refresh trang → vào `/admin` sẽ thấy Admin Dashboard

---

## Bước 6: Deploy Lên Vercel

1. Vào https://vercel.com → **Add New Project**
2. Import repo từ GitHub
3. Chọn **Framework: Next.js**
4. Thêm Environment Variables (copy từ `.env.local`)
5. Click **Deploy**
6. Đợi build hoàn tất (~2-3 phút)

### Kết nối domain riêng:
1. Vercel → Settings → Domains → Thêm domain
2. Vào nhà cung cấp domain → trỏ DNS:
   - Type: `CNAME`
   - Name: `@` hoặc `www`
   - Value: `cname.vercel-dns.com`
3. Đợi DNS propagation (~5-30 phút)

---

## Bước 7: Cài Đặt Thanh Toán (Tùy chọn)

### PayOS (Khuyến nghị — dễ nhất)
1. Đăng ký tại https://payos.vn
2. Tạo ứng dụng → lấy Client ID, API Key, Checksum Key
3. Thêm vào Vercel Environment Variables
4. Cài webhook URL: `https://yourdomain.com/api/payos/webhook`

### SePay (Xác nhận chuyển khoản tự động)
1. Đăng ký tại https://sepay.vn
2. Kết nối tài khoản ngân hàng
3. Lấy API Key → thêm vào Vercel env
4. Cài webhook URL: `https://yourdomain.com/api/sepay/webhook`

---

## Bước 8: Cài Đặt Email (Tùy chọn)

### AWS SES
1. Vào AWS Console → SES
2. Verify domain (thêm DNS records)
3. Tạo IAM user với permission `AmazonSESFullAccess`
4. Copy Access Key + Secret Key → thêm vào env

### Hoặc dùng Resend (đơn giản hơn)
1. Đăng ký tại https://resend.com
2. Verify domain
3. Lấy API Key → thêm vào env `RESEND_API_KEY`

---

## Cấu Trúc Thư Mục Quan Trọng

```
src/
├── app/
│   ├── (auth)/           # Đăng nhập, đăng ký
│   ├── (dashboard)/      # Dashboard học viên
│   ├── (marketing)/      # Trang chủ, about, pricing
│   ├── admin/            # Admin panel
│   ├── api/              # API endpoints
│   ├── blog/             # Blog
│   ├── courses/          # Danh sách khóa học
│   ├── community/        # Cộng đồng
│   ├── hocchuaxongtiendave/  # Landing page mẫu (có thể xóa/sửa)
│   ├── sanphamso/            # Landing page mẫu (có thể xóa/sửa)
│   ├── slowenglish/          # Landing page mẫu (có thể xóa/sửa)
│   └── cafe/                 # Landing page mẫu (có thể xóa/sửa)
├── components/           # UI components dùng chung
└── lib/
    ├── site-config.ts    # ⭐ FILE QUAN TRỌNG NHẤT — đổi thương hiệu ở đây
    ├── supabase/         # Supabase client setup
    ├── email/            # Email templates
    └── payos.ts          # PayOS integration
```

---

## Landing Pages

Trong thư mục `src/app/` có 4 landing pages mẫu. Bạn có thể:

1. **Xóa hết** nếu không cần
2. **Sửa lại** nội dung cho sản phẩm của bạn
3. **Copy làm template** cho landing page mới

Mỗi landing page là 1 thư mục riêng, xóa thư mục = xóa trang.

---

## FAQ

### Q: Database của tôi có bị trùng với người khác không?
**Không.** Mỗi người tạo Supabase project riêng = database riêng hoàn toàn. Không có data nào bị chia sẻ.

### Q: Tôi có cần biết code không?
Cần biết cơ bản: cài Node.js, chạy terminal, edit file. Không cần biết code phức tạp nếu chỉ thay brand và deploy.

### Q: Hosting tốn bao nhiêu?
- Vercel Hobby: **0đ** (giới hạn 100GB bandwidth/tháng)
- Supabase Free: **0đ** (giới hạn 500MB database, 1GB storage)
- Domain: **~200k-500k/năm** (mua tại Namecheap, GoDaddy, hoặc Tên Miền Việt Nam)

### Q: Khóa học thêm vào ở đâu?
Đăng nhập → vào `/admin` → **Products** → Tạo khóa học mới → Thêm chapters → Thêm lessons (chỉ cần YouTube video ID).

### Q: Làm sao để xem doanh thu?
Vào `/admin` → **Dashboard** hiển thị tổng quan doanh thu, đơn hàng, học viên.

---

## Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. **Console trình duyệt** (F12) — xem lỗi JavaScript
2. **Vercel logs** — xem lỗi server
3. **Supabase logs** — xem lỗi database
4. **Health check** — truy cập `https://yourdomain.com/api/health` để kiểm tra tất cả services

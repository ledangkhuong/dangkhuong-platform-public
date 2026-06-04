# 🚀 HƯỚNG DẪN DEPLOY DANGKHUONG.COM

## BƯỚC 1 — Tạo tài khoản Supabase (5 phút)

1. Vào https://supabase.com → **New Project**
2. Đặt tên: `dangkhuong-platform`
3. Chọn region: **Southeast Asia (Singapore)**
4. Copy 3 giá trị vào `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` → Project Settings → API → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Project Settings → API → anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` → Project Settings → API → service_role key

## BƯỚC 2 — Chạy Schema Database (2 phút)

1. Vào Supabase → **SQL Editor**
2. Copy toàn bộ nội dung file `supabase/schema.sql`
3. Paste vào SQL Editor → **Run** ✅

## BƯỚC 3 — Cấu hình Sepay (5 phút)

1. Đăng nhập https://sepay.vn
2. Vào **Cài đặt → Webhook**:
   - URL: `https://dangkhuong.com/api/sepay/webhook`
   - Secret: điền vào `SEPAY_WEBHOOK_SECRET` trong `.env.local`
3. Vào **Cài đặt → API Key** → copy vào `SEPAY_API_KEY`
4. Điền thông tin ngân hàng vào:
   - `SEPAY_BANK_ACCOUNT`: số tài khoản ngân hàng
   - `SEPAY_BANK_CODE`: mã ngân hàng (VCB, TCB, MB, ...)

## BƯỚC 4 — Cấu hình Email Resend (3 phút)

1. Đăng nhập https://resend.com → **API Keys → Create**
2. Copy API key vào `RESEND_API_KEY`
3. Verify domain `dangkhuong.com` trong Resend

## BƯỚC 5 — Deploy lên Vercel (5 phút)

```bash
# Cài Vercel CLI
npm i -g vercel

# Deploy (lần đầu)
cd "D:\AI Agent\dangkhuong-platform"
vercel

# Sau đó thêm env variables trong Vercel Dashboard:
# https://vercel.com/your-project/settings/environment-variables
# Copy tất cả từ .env.local vào đây
```

## BƯỚC 6 — Gắn domain dangkhuong.com (5 phút)

1. Vercel Dashboard → Project → **Settings → Domains**
2. Add domain: `dangkhuong.com`
3. Vercel sẽ hiện DNS records cần thêm:
   - **Type A**: `76.76.21.21`
   - **CNAME www**: `cname.vercel-dns.com`
4. Vào DNS Manager của domain registrar (Namecheap/GoDaddy/...) → thêm records trên
5. Đợi 5-10 phút → ✅ Live!

## BƯỚC 7 — Cấu hình Auth Email (Supabase)

1. Supabase → **Authentication → Email Templates**
2. Cập nhật template email confirm với brand Đăng Khương
3. **Authentication → URL Configuration**:
   - Site URL: `https://dangkhuong.com`
   - Redirect URLs: `https://dangkhuong.com/auth/callback`

---

## ✅ CHECKLIST GO-LIVE

- [ ] Supabase project created
- [ ] Schema SQL đã chạy
- [ ] Env variables đã điền
- [ ] Sepay webhook configured
- [ ] Email Resend verified
- [ ] Vercel deployed
- [ ] Domain trỏ về Vercel
- [ ] Test mua hàng thật (100đ)
- [ ] Test email automation

## 🔧 LỆNH HỮU ÍCH

```bash
# Chạy local
npm run dev

# Build kiểm tra
npm run build

# Deploy production
vercel --prod

# Xem logs
vercel logs
```

## 📞 HỖ TRỢ

Nếu gặp vấn đề kỹ thuật, các tài nguyên:
- Supabase docs: https://supabase.com/docs
- Sepay docs: https://docs.sepay.vn
- Vercel docs: https://vercel.com/docs
- Next.js docs: https://nextjs.org/docs

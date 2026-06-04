# Huong Dan Cap Nhat — Phien Ban 31/05/2026

## Danh sach tinh nang moi

### 1. He thong Marketing Analytics (7 trang moi)
- `/marketing/overview` — Dashboard tong quan marketing
- `/marketing/channels` — Phan tich hieu suat theo kenh (Facebook, Google, Zalo, Email, YouTube)
- `/marketing/campaigns` — Do luong ROI chien dich
- `/marketing/funnel` — Pheu chuyen doi 7 giai doan
- `/marketing/landing-pages` — Hieu suat tung trang dich
- `/marketing/attribution` — Nguon goc khach hang (doi tu CRM sang Marketing)
- `/marketing/utm-builder` — Tool tao link UTM tracking voi presets

### 2. Ma giam gia tren Landing Pages
- Tat ca 8 landing pages deu co o nhap "Ma giam gia"
- Backend validate + apply discount + claim coupon tu dong
- Neu coupon giam ve 0d → tu dong cap quyen (khong can thanh toan)

### 3. Email qua Resend (thay AWS SES)
- Chuyen tu AWS SES sang Resend de gui email
- Ho tro domain rieng voi DKIM tu dong
- Free plan: 100 emails/ngay

### 4. Email Automation (4 sequences — dang paused)
- Welcome Sequence (5 emails, 7 ngay)
- Post-Purchase Sequence (5 emails, 30 ngay)
- Re-engagement Sequence (3 emails, 7 ngay)
- Event/Webinar Sequence (4 emails)
- Noi dung storytelling dai 500-800 tu moi email

### 5. Cai thien Landing Pages
- Bo CAPTCHA tren tat ca 8 landing pages (tang conversion)
- Them thong tin "video + tai lieu gui qua email sau dang ky"
- Them nut Zalo group + Dang nhap vao khoa hoc trong popup dang ky

### 6. Fix loi
- Fix TimeOnPage events khong hien thi tren Meta Pixel Helper
- Fix email xac thuc khong gui duoc (DKIM revoked)
- Fix dang ky khong dang nhap duoc

---

## Huong dan cap nhat

### Buoc 1: Pull code moi

```bash
cd dangkhuong-platform
git pull origin main
```

Neu bi conflict:
```bash
git stash
git pull origin main
git stash pop
```

### Buoc 2: Cai dat package moi

```bash
npm install
```

Package moi: `resend` (email delivery)

### Buoc 3: Cau hinh env

Them vao file `.env.local`:

```env
# Resend (thay the AWS SES)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# (Tuy chon) Doi email sender
EMAIL_FROM=support@yourdomain.com
EMAIL_FROM_NAME=Ten Academy Cua Ban
```

Lay API key tai: https://resend.com/api-keys

### Buoc 4: Chay migrations (neu chua co)

Vao Supabase SQL Editor, chay cac migration sau neu chua co:

#### 4a. Bang coupons (ma giam gia)
```sql
-- Kiem tra bang da ton tai chua
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coupons');
```

Neu chua co, chay migration `20260526_patch_coupon_atomic.sql` va `20260527_patch_coupon_unique.sql` trong folder `supabase/migrations/`.

#### 4b. Bang email_automations
```sql
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_automations');
```

Neu chua co, chay migration `20250516_email_automations.sql` trong folder `supabase/migrations/`.

### Buoc 5: Cau hinh Resend domain (tuy chon)

Neu muon gui email tu domain rieng (thay vi `onboarding@resend.dev`):

1. Vao https://resend.com/domains
2. Click "+ Add domain"
3. Nhap domain cua ban
4. Them DNS records (DKIM + SPF) theo huong dan
5. Doi `EMAIL_FROM` trong `.env.local`

### Buoc 6: Khoi dong lai

```bash
npm run dev
```

---

## Cac file thay doi chinh

| File / Folder | Thay doi |
|---------------|----------|
| `src/app/(dashboard)/marketing/` | 7 trang marketing moi |
| `src/lib/email/ses.ts` | Doi tu AWS SES sang Resend |
| `src/lib/coupon-server.ts` | Helper validate + claim coupon |
| `src/app/api/*/register/route.ts` | Bo CAPTCHA + them coupon |
| `src/app/*/Landing.tsx` | Them o ma giam gia |
| `src/components/layout/Sidebar.tsx` | Menu Marketing moi |
| `src/components/analytics/EngagementTracker.tsx` | Fix TimeOnPage bug |
| `src/components/auth/RegisterForm.tsx` | Fix flow dang ky |
| `src/lib/email/send-engine.ts` | Doi sang dung Resend |
| `src/app/api/email/campaigns/` | Doi sang dung Resend |

---

## Luu y quan trong

1. **AWS SES**: Neu ban dang dung AWS SES va DKIM hoat dong binh thuong, ban co the giu nguyen. Chi can KHONG them `RESEND_API_KEY` vao env — he thong se bao loi nhung email van gui qua SES neu credentials con hop le.

2. **Email Automation**: 4 sequences da duoc tao nhung dang **paused**. De bat:
   - Vao `/email/automations` trong admin
   - Hoac chay SQL: `UPDATE email_automations SET status = 'active' WHERE status = 'paused';`

3. **Ma giam gia**: Can tao coupon trong admin (`/admin/coupons`) truoc khi khach co the su dung.

4. **Marketing data**: Cac trang marketing doc du lieu tu `crm_contacts` va `orders`. Neu ban chua co du lieu UTM, dashboard se trong. Du lieu se tu dong co khi khach truy cap voi UTM params.

---

## Ho tro

Neu gap van de khi cap nhat, lien he qua:
- Cong dong: https://dangkhuong.com/community
- Email: support@dangkhuong.com

# Hướng Dẫn Hỗ Trợ Học Viên — Từ A đến Z

> Tài liệu này dành cho ADMIN (anh). Không share cho học viên.
> Học viên chỉ cần đọc file SETUP.md trong repo.

---

## GIAI ĐOẠN 1: Chuẩn bị (Làm 1 lần)

### 1.1 Tạo Google Form nhận thông tin
- Vào https://forms.google.com
- Tạo form theo mẫu trong file `docs/form-nhan-code.md`
- Bật "Responses" → Link đến Google Sheet để quản lý

### 1.2 Tạo Google Sheet quản lý học viên
Tạo sheet với các cột:

| Họ tên | Email | GitHub | Order Code | Ngày cấp | Trạng thái | Ghi chú |
|--------|-------|--------|------------|----------|------------|---------|
| Nguyễn A | a@gmail.com | nguyenvana | DKxxx | 21/05/2026 | Active | OK |

### 1.3 Chuẩn bị email mẫu (copy-paste khi invite)

**Email 1 — Sau khi invite:**
```
Tiêu đề: [Tên Academy] Bạn đã được cấp quyền truy cập Source Code!

Chào [TÊN],

Bạn đã được cấp quyền truy cập source code.

BƯỚC TIẾP THEO:
1. Kiểm tra email từ GitHub → Click "View invitation"
2. Click "Accept invitation"
3. Vào repo → Click nút xanh "Fork" → Click "Create fork"  
4. Mở file SETUP.md → Làm theo hướng dẫn từng bước

Link repo: https://github.com/ledangkhuong/dangkhuong-platform

Nếu cần hỗ trợ, gửi ảnh chụp màn hình lỗi qua group Zalo.

Lưu ý:
- KHÔNG chia sẻ link repo cho người khác
- KHÔNG đăng code lên nơi công cộng
```

**Email 2 — Khi học viên deploy xong:**
```
Tiêu đề: Chúc mừng! Website của bạn đã live!

Chào [TÊN],

Chúc mừng bạn đã deploy thành công!

Bước tiếp theo:
- Thêm khóa học: Vào /admin → Products → Tạo khóa học
- Kết nối domain: Vercel → Settings → Domains
- Cài thanh toán: Xem phần "Bước 7" trong SETUP.md

Khi tôi cập nhật tính năng mới:
1. Vào repo fork của bạn trên GitHub
2. Thấy dòng "This branch is X commits behind"
3. Click "Sync fork" → "Update branch"
4. Vercel tự động deploy bản mới!
```

---

## GIAI ĐOẠN 2: Khi có học viên mới

### Quy trình invite (5 phút)

```
Bước 1: Học viên submit Google Form
         ↓
Bước 2: Anh kiểm tra order code trên dangkhuong.com/admin/orders
         ↓ (hợp lệ)
Bước 3: Vào GitHub repo
         → Settings (tab trên cùng)
         → Collaborators (menu bên trái)
         → Add people
         → Gõ GitHub username
         → Add to repository
         ↓
Bước 4: Gửi Email 1 cho học viên
         ↓
Bước 5: Cập nhật Google Sheet (tên, ngày cấp, trạng thái = Active)
```

---

## GIAI ĐOẠN 3: Hỗ trợ lỗi thường gặp

### Lỗi 1: "Không thấy nút Fork"
**Nguyên nhân:** Học viên chưa accept invitation
**Cách fix:** 
- Bảo học viên check email từ GitHub (có thể ở spam)
- Hoặc vào trực tiếp: https://github.com/ledangkhuong/dangkhuong-platform/invitations

### Lỗi 2: "Chạy SQL bị lỗi"
**Nguyên nhân:** Chạy migration trước schema, hoặc chạy trùng
**Cách fix:**
- Chạy `schema.sql` TRƯỚC, rồi mới chạy migrations
- Nếu lỗi "already exists" → bỏ qua, chạy migration tiếp theo
- Nếu lỗi khác → bảo gửi screenshot lỗi

### Lỗi 3: "Vercel build failed"
**Nguyên nhân thường gặp:**
- Thiếu env vars bắt buộc (SUPABASE_URL, ANON_KEY, SERVICE_KEY)
- Gõ sai giá trị env vars (thừa dấu cách, thiếu ký tự)

**Cách fix:**
- Bảo học viên vào Vercel → Settings → Environment Variables
- Kiểm tra 3 biến bắt buộc:
  - NEXT_PUBLIC_SUPABASE_URL (bắt đầu bằng https://)
  - NEXT_PUBLIC_SUPABASE_ANON_KEY (chuỗi dài bắt đầu bằng eyJ)
  - SUPABASE_SERVICE_ROLE_KEY (chuỗi dài bắt đầu bằng eyJ)
- Sau khi sửa → Vercel → Deployments → Redeploy

### Lỗi 4: "Đăng ký/Đăng nhập không được"
**Nguyên nhân:** Supabase chưa bật Email Auth hoặc URL redirect sai
**Cách fix:**
- Supabase → Authentication → Providers → Email → Bật
- Supabase → Authentication → URL Configuration:
  - Site URL = https://domain-cua-hoc-vien.com
  - Redirect URLs = https://domain-cua-hoc-vien.com/**

### Lỗi 5: "Vào /admin bị redirect về /dashboard"
**Nguyên nhân:** Chưa set role admin trong database
**Cách fix:**
- Supabase → Table Editor → profiles
- Tìm tài khoản → sửa cột `role` thành `admin`
- Refresh trang

### Lỗi 6: "Thanh toán không hoạt động"
**Nguyên nhân:** Chưa cài PayOS/SePay
**Cách fix:**
- Bảo học viên đọc Bước 7 trong SETUP.md
- Cần đăng ký PayOS (payos.vn) HOẶC SePay (sepay.vn)
- Thêm API keys vào Vercel env vars
- Cài webhook URL trên PayOS/SePay dashboard

### Lỗi 7: "Sync fork bị conflict"
**Nguyên nhân:** Học viên đã sửa code (không nên sửa)
**Cách fix đơn giản:**
- GitHub → repo fork → Settings → cuối trang → Delete this repository
- Fork lại từ đầu
- Vercel sẽ tự build lại (env vars vẫn giữ nguyên)

### Lỗi 8: "Website chậm / trắng trang"
**Nguyên nhân:** Supabase free tier ngủ sau 1 tuần không dùng
**Cách fix:**
- Vào Supabase Dashboard → click vào project → nó sẽ wake up
- Hoặc upgrade Supabase lên Pro ($25/tháng) để không bị ngủ

---

## GIAI ĐOẠN 4: Khi anh update tính năng mới

### Quy trình push update

```
Bước 1: Anh push code mới lên GitHub (tự động khi commit)
         ↓
Bước 2: Thông báo trong group học viên:
         "Đã cập nhật tính năng [X]. Các bạn vào GitHub fork
         của mình → click Sync fork → Update branch.
         Vercel sẽ tự deploy."
         ↓
Bước 3: Nếu update cần chạy SQL mới:
         "Sau khi Sync fork, vào Supabase → SQL Editor
         → chạy file supabase/migrations/[tên_file].sql"
```

### Mẫu thông báo update:

```
🔔 CẬP NHẬT TÍNH NĂNG MỚI

Tính năng: [Mô tả ngắn]

Cách cập nhật:
1. Vào GitHub → repo fork của bạn
2. Click "Sync fork" → "Update branch"  
3. Đợi 2-3 phút, Vercel tự deploy

[Nếu cần chạy SQL:]
4. Vào Supabase → SQL Editor
5. Chạy file: supabase/migrations/[tên_file].sql

Nếu gặp lỗi, gửi ảnh chụp màn hình vào group!
```

---

## GIAI ĐOẠN 5: Kiểm tra license

### Kiểm tra website của học viên
Truy cập: `https://website-hoc-vien.com/api/license`

Kết quả:
```json
{
  "licensee": "Nguyễn Văn A",
  "email": "nguyenvana@gmail.com", 
  "issuedAt": "2026-05-21",
  "domain": "nguyenvana.com",
  "siteName": "NVA Academy"
}
```

Nếu thấy "UNLICENSED" → học viên chưa điền env vars license.
Nếu thấy tên lạ trên website lạ → có người chia sẻ code trái phép.

### Kiểm tra danh sách fork
Vào: https://github.com/ledangkhuong/dangkhuong-platform/network/members
→ Thấy tất cả ai đã fork repo

---

## TÓM TẮT — Những việc anh cần làm

| Việc | Tần suất | Thời gian |
|------|----------|-----------|
| Tạo Google Form + Sheet | 1 lần | 15 phút |
| Invite học viên mới | Mỗi khi có người mua | 5 phút/người |
| Hỗ trợ lỗi (qua group) | Khi học viên hỏi | 5-10 phút/lỗi |
| Push update + thông báo | Khi có tính năng mới | 5 phút |
| Kiểm tra license | Định kỳ / khi nghi ngờ | 2 phút |

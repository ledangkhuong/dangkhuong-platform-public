# QA checklist — nhánh `perf/tier0-optimizations`

> Bấm thử nhanh sau khi deploy Vercel **Preview** (chưa merge `main`). Mục tiêu: chắc chắn an toàn + học viên học bình thường. Đánh ✅ từng mục.

## 1. Trang chủ (đụng nhiều nhất)
- [ ] Vào `/` — tiêu đề H1 + nội dung hiện bình thường.
- [ ] **Video hero**: thấy ảnh thumbnail + nút play → bấm play → video YouTube chạy được.
- [ ] Bấm nút "Nhận quà"/CTA → **modal đăng ký mở ra** (form + nút đăng nhập Google hiện đủ — modal giờ lazy-load nên có thể chậm ~0.2s lần đầu, chấp nhận được).
- [ ] Menu mobile (icon ☰) mở/đóng được.
- [ ] FAQ mở/đóng được; đồng hồ đếm ngược chạy.
- [ ] Cuộn xuống footer — chữ rõ (đã tăng tương phản), không vỡ layout.

## 2. Học viên học bình thường (QUAN TRỌNG NHẤT)
- [ ] **Đăng nhập** bằng tài khoản học viên thật → vào được `/dashboard`.
- [ ] Mở 1 khoá học → **xem được video bài giảng** (player nguyên trạng).
- [ ] Vào 1 bài có nội dung/ảnh → hiển thị đủ.
- [ ] Đăng xuất → vào lại `/dashboard` khi **chưa đăng nhập** → phải **redirect về `/login`** (kiểm tra middleware bảo vệ route vẫn đúng).
- [ ] Đăng nhập lại → session giữ, không bị đá ra.
- [ ] (Nếu là admin/instructor) mở **trình soạn bài giảng** (Tiptap) + **trình kéo-thả** → gõ/kéo thử (xác nhận `optimizePackageImports` không vỡ editor).

## 3. Trang landing / bán hàng (ảnh banner đổi sang JPEG + next/image)
- [ ] `/tang4thanggeminipro` — banner hiển thị nét, không vỡ.
- [ ] `/weballinone`, `/updateveo3.1`, `/slowenglish`, `/sanphamso`, `/hocchuaxongtiendave` — banner + ảnh đối tác (navbar) hiện đủ, không 404 ảnh.
- [ ] Mở DevTools → Network → lọc `img`: banner tải dạng **webp/avif**, dung lượng nhỏ (~vài chục–trăm KB), **không còn file 1-1.8MB**.
- [ ] Form đăng ký trên landing + modal QR thanh toán vẫn chạy.

## 4. Share preview (og:image — đã tối ưu)
- [ ] Dán link `/tang4thanggeminipro` (và 1-2 landing khác) vào **khung soạn tin Zalo/Messenger** → ảnh preview hiện đúng, tải nhanh.
- [ ] (Tuỳ chọn) Facebook Sharing Debugger: kiểm tra og:image load OK.

## 5. Đo hiệu năng (mục tiêu của cả đợt)
- [ ] PageSpeed Insights trên URL preview (mobile) — so với baseline cũ (Perf 70, LCP 3.6s):
  - Performance kỳ vọng **~82-90**, LCP **<2.5s**, TBT giảm.
- [ ] Kiểm tra Console không có lỗi đỏ ở trang chủ + 1 trang dashboard.

## 6. Sau khi mọi mục ✅
- [ ] Merge `perf/tier0-optimizations` → `main`, deploy production.
- [ ] (Tuỳ chọn) xoá thư mục `./.image-backup/` (~16MB ảnh gốc, đã được `.gitignore`).

---
**Nếu có mục nào ✗** (đặc biệt mục 2): báo lại, mọi thay đổi đều revert được theo từng commit. Backup ảnh gốc nằm ở `./.image-backup/`.

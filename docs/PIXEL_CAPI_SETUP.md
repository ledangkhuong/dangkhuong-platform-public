# Facebook Pixel + Conversions API — Hướng dẫn sử dụng

Hệ thống cho phép quản lý Pixel + CAPI **theo từng landing page** qua admin UI.
**Marketing tự gắn Pixel vào landing — KHÔNG cần đụng code.**

## Quy trình tổng quát

```
1. Marketing tạo cấu hình Pixel (Pixel ID + CAPI Token)  → /admin/pixel-settings
2. Marketing gắn Pixel vào landing                       → /admin/pixel-settings/pages
3. Hiệu lực ngay — không cần dev deploy
```

## 1. Apply migration vào Supabase

Mở Supabase Dashboard > SQL Editor, paste 2 file migration theo thứ tự:

1. `supabase/migration_pixel_configs.sql` — cấu hình Pixel + log
2. `supabase/migration_landing_pages.sql` — landing pages + binding m-n + seed

Migration tạo 4 bảng:
- `pixel_configs` — cấu hình Pixel + CAPI theo slug
- `pixel_events_log` — log event CAPI (dùng debug Match Quality)
- `landing_pages` — danh sách landing trên dangkhuong.com
- `landing_page_pixels` — bảng nối m-n (1 landing có thể có N pixel)

## 2. Lấy thông tin Pixel + CAPI từ Meta

1. Vào [Events Manager](https://business.facebook.com/events_manager2/)
2. Tạo Pixel mới (hoặc dùng pixel đã có) → copy **Pixel ID** (15-16 chữ số)
3. Vào **Settings > Conversions API > Generate access token** → copy
   **CAPI Access Token** (chuỗi `EAAxx...`)
4. **(Tuỳ chọn)** Vào tab **Test Events** → copy **Test Event Code**
   (`TEST12345`) để test trước khi go-live

## 3. Tạo cấu hình trong admin UI

1. Đăng nhập admin → menu trái → **Pixel & CAPI**
2. Nhấn **Tạo cấu hình Pixel**
3. Điền form:
   - **Slug**: định danh ngắn, chỉ chữ thường + số + gạch ngang
     (VD: `khoa-hoc-video-ai`, `slowenglish`, `landing-tet-2026`)
   - **Tên cấu hình**: tên hiển thị
   - **Pixel ID**: dán từ Events Manager
   - **CAPI Access Token**: dán (khuyến nghị bật để bù ~30% data Pixel mất)
   - **Test Event Code**: chỉ điền khi đang test, **bỏ trống khi production**
4. Bật **"Hoạt động"** → Tạo

## 4. Gắn Pixel vào landing page (Marketing workflow — không đụng code)

1. Vào **Admin → Gắn Pixel vào landing** (`/admin/pixel-settings/pages`)
2. Nếu landing chưa có trong list → bấm **Thêm landing page**, điền:
   - **Pathname**: `/ten-trang` (VD: `/khoa-hoc-video-ai`)
   - **Tên**: tên dễ nhớ cho marketing
3. Mở landing trong list → bấm **Gắn pixel**
4. **Tick chọn** Pixel muốn fire (có thể chọn nhiều cho split test)
5. Sắp xếp thứ tự nếu cần (mũi tên lên/xuống)
6. Bấm **Lưu thay đổi** → có hiệu lực ngay, F5 trang là chạy

Cơ chế: `<AutoPixel />` trong root layout đọc current pathname → query DB →
render các Pixel đã attach. Tất cả chạy server-side, dedupe Pixel+CAPI tự động.

### (Tuỳ chọn — dev) Pin Pixel cứng vào source code

Nếu dev muốn gắn pixel theo slug, không qua DB binding:

```tsx
import PagePixel from "@/components/analytics/PagePixel";

export default function Page() {
  return (
    <>
      <PagePixel slug="khoa-hoc-video-ai" />
      {/* nội dung landing */}
    </>
  );
}
```

→ Cách này có sẵn nhưng **không khuyến khích** vì marketing không tự sửa được.

## 5. Track event tuỳ chỉnh (Lead, Contact, Click CTA…)

Trong **client component** (form, button click handler):

```tsx
"use client";
import { trackLead, trackContact, trackPageEvent } from "@/lib/pixel-tracker";

function MyForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // ... validate + submit form ...

    // Fire event Lead (Pixel + CAPI cùng lúc, dedupe qua event_id)
    trackLead("khoa-hoc-video-ai", {
      email: form.email,
      phone: form.phone,
      name: form.name,
    }, {
      value: 999000,
      currency: "VND",
      content_name: "Khóa Video AI",
    });
  };
}
```

### Shortcuts có sẵn

| Helper | Mục đích |
|---|---|
| `trackLead(slug, userData, customData)` | Form submit / đăng ký nhận thông tin |
| `trackContact(slug, userData?, customData?)` | Click gọi điện / chat Zalo / Messenger |
| `trackViewContent(slug, customData?)` | User xem chi tiết sản phẩm |
| `trackPageEvent({ slug, eventName, userData?, customData? })` | Event tuỳ ý |

### Event_id deduplication

- Mỗi event tự generate `event_id` (UUID v4)
- Pixel client-side gửi với `{ eventID: "..." }`
- CAPI server-side gửi cùng `event_id`
- Meta tự dedupe → 1 event = 1 lần đếm

## 6. Verify bằng Test Events

Trước khi go-live:

1. Trong admin, **edit cấu hình** → điền **Test Event Code** từ Meta
2. Mở landing page, thực hiện hành động (PageView, Lead…)
3. Vào Events Manager > **Test Events** tab → xem event xuất hiện
4. Cột `Method` phải hiển thị **Server (Conversions API)** + **Browser (Pixel)**
5. Cột `Deduplication` phải hiển thị **Deduplicated**

→ Nếu cả 3 dấu hiệu trên hiện đủ là OK. **Xoá Test Event Code** sau khi verify.

## 7. Match Quality

Trong Events Manager > Overview, kiểm tra **Event Match Quality** (EMQ):
- < 5/10: gửi thêm fields user_data (phone, name, externalId)
- 7-10/10: tốt, conversion tracking chuẩn

## 8. Audit log

Tất cả event CAPI được log vào `pixel_events_log`. Vào
`/admin/pixel-settings/[id]` để xem 20 event gần nhất + lỗi (nếu có).

## 9. Server-side firing tự động

CAPI tự fire ở 2 chỗ trong codebase (không cần code thêm):
- **Lead + InitiateCheckout** khi user submit form đăng ký SlowEnglish:
  `src/app/api/slowenglish/register/route.ts`
- **Purchase** khi Sepay confirm thanh toán:
  `src/app/api/sepay/webhook/route.ts`

Cả 2 đều tự lookup pixel config theo slug (`order.source` hoặc `products.slug`),
fallback về env nếu không có config.

## 10. Troubleshooting

| Triệu chứng | Xử lý |
|---|---|
| `<PagePixel>` không hiện gì | Check slug đã tạo trong admin chưa + cấu hình bật `is_active` |
| Event Pixel có, CAPI không | Check `CAPI Access Token` đã điền + đúng. Vào `/admin/pixel-settings/[id]` xem error |
| Event bị nhân đôi | Đảm bảo `eventID` trên Pixel + `event_id` CAPI khớp nhau (helper đã lo) |
| Test Events không thấy | Check `Test Event Code` đã điền + Pixel ID đúng pixel đang test |
| Trang chính (dangkhuong.com) chưa có Pixel | `<FacebookPixel />` global vẫn chạy bằng `NEXT_PUBLIC_FB_PIXEL_ID` trong env — không liên quan tới per-landing |

# Customer Attribution Tracking — Hướng dẫn

Hệ thống track nguồn khách hàng (UTM + Click IDs + Referrer + Device + Geo +
Landing Page + Affiliate) — first-touch attribution, frozen ở lần PageView đầu
tiên của visitor.

## Kiến trúc tổng quan

```
[Browser]
  PageTracker (client component, root layout)
    ├─ Đọc/tạo cookie dk_vid (UUID, 2 năm)
    ├─ Bắt từ URL: utm_*, fbclid, gclid, ttclid, msclkid, ref
    ├─ Parse device từ navigator.userAgent
    └─ POST /api/analytics/track
                ↓
[Server]
  /api/analytics/track
    ├─ Lookup geo từ IP (ipapi.co — free 1k req/day)
    ├─ Parse UA → device/os/browser
    ├─ INSERT visitor_attribution (frozen first-touch, dedupe qua visitor_id)
    └─ INSERT analytics_events (event log mọi page view)
                ↓
[Conversion: register / order paid]
  syncAttributionToConversion()
    ├─ Đọc dk_vid từ cookie
    ├─ Fetch visitor_attribution
    ├─ Update orders với UTM/click_id/referrer/landing
    └─ Upsert crm_contacts với attribution snapshot
                ↓
[Admin]
  /crm/attribution
    ├─ Top sources / campaigns / referrers
    ├─ Click ID breakdown (fbclid/gclid)
    ├─ Device breakdown (mobile/tablet/desktop)
    ├─ Geo breakdown (country/city)
    ├─ Landing page performance
    └─ Conversion funnel: visit → lead → customer
```

## Bảng DB

### visitor_attribution (frozen first-touch)

| Cột | Mô tả |
|---|---|
| `visitor_id` (PK, uuid) | Lấy từ cookie `dk_vid` |
| `first_seen_at` | Lần page view đầu tiên |
| `utm_source/medium/campaign/term/content` | UTM từ URL |
| `referrer` | document.referrer |
| `fbclid, gclid, ttclid, msclkid` | Click ID của ads |
| `first_landing_path, first_landing_url` | Trang đầu tiên user vào |
| `ref_code` | Affiliate referral |
| `device_type, os, browser` | Parse từ UA |
| `country, country_code, region, city` | Geo từ IP |
| `ip, user_agent` | Raw data |

### crm_contacts (extended)

Mới thêm:
- `visitor_id` (FK → visitor_attribution)
- `fbclid, gclid, ttclid`
- `device_type, country, country_code, city`
- `first_landing_path`
- `ref_code`

Tận dụng cột có sẵn từ trước:
- `utm_source, utm_medium, utm_campaign`
- `referrer, first_page`
- `journey_stage, lifetime_value` (auto-update qua trigger order paid)

### orders (extended)

Mới thêm:
- `visitor_id` (FK → visitor_attribution)
- `utm_source, utm_medium, utm_campaign, utm_term, utm_content`
- `fbclid, gclid`
- `referrer, landing_path`

Tận dụng: `ref_code` (đã có từ affiliate migration)

## Migration cần chạy

Apply migration `supabase/migration_visitor_attribution.sql` trong SQL Editor.
Idempotent — chạy lại không phá data cũ.

## Lib helpers

| File | Mục đích |
|---|---|
| `src/lib/visitor-id.ts` | Quản lý cookie `dk_vid` (UUID v4, 2 năm) — client + server side |
| `src/lib/user-agent.ts` | Parse UA → `{deviceType, os, browser, isBot}` — không cần lib ngoài |
| `src/lib/geo.ts` | `lookupGeoFromIp(ip)` qua ipapi.co, cache 24h, timeout 3s, fail-graceful |
| `src/lib/attribution.ts` | `syncAttributionToConversion()` — gọi khi user convert (register/order/lead) |

## Wire vào conversion mới

Khi tạo endpoint conversion mới (lead form, order khác...), wire 1 dòng:

```ts
import { syncAttributionToConversion } from "@/lib/attribution";
import { VISITOR_COOKIE } from "@/lib/visitor-id";

// Sau khi tạo order/contact thành công:
syncAttributionToConversion({
  visitorId: req.cookies.get(VISITOR_COOKIE)?.value,
  email: customer.email,
  orderId: order.id,
  fullName: customer.name,
  phone: customer.phone,
}).catch(() => {});  // fire-and-forget, không block flow chính
```

## Verify

1. Vào dangkhuong.com với URL có UTM:
   `https://dangkhuong.com/weballinone?utm_source=facebook&utm_campaign=test&fbclid=ABC123`
2. Đồng ý cookie consent "analytics"
3. Kiểm tra DevTools → Application → Cookies → `dk_vid` xuất hiện
4. Kiểm tra Supabase: `SELECT * FROM visitor_attribution ORDER BY first_seen_at DESC LIMIT 5;`
5. Submit form đăng ký → check orders + crm_contacts có utm_source = 'facebook'
6. Vào `/crm/attribution` xem chart breakdown

## Tuned for

- **Vietnam-first:** Default Asia/Ho_Chi_Minh timezone, geo lookup trả VN cities
- **Privacy-compliant:** Tôn trọng cookie consent "analytics" (GDPR/PDPA)
- **Bot-safe:** UA parser detect bot → vẫn track nhưng marked `is_bot=true`
- **Free tier-safe:** Geo lookup cache 24h, timeout 3s, dùng ipapi.co miễn phí
- **Frozen first-touch:** Visitor attribution không bao giờ overwrite — preserve chiến dịch gốc

## Troubleshooting

| Triệu chứng | Xử lý |
|---|---|
| `/crm/attribution` toàn 0 | Migration chưa apply, hoặc PageTracker chưa fire (chưa accept analytics consent) |
| Geo cột null | ipapi.co rate limit / IP private. Check log `[geo]` |
| visitor_id null trong orders | User chưa từng PageView trước khi submit form (vd: thẳng link trực tiếp tới form) |
| UTM null nhưng có ?utm_source trong URL | Cookie consent chưa được chấp nhận |

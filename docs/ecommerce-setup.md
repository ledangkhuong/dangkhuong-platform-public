# E-commerce Module Setup Guide

## 1. Database migrations
Apply theo thứ tự trong Supabase SQL Editor:
- 20260605_ecommerce_foundation.sql (7 chunks trong week1-chunks/)
- 20260606_ghn_address_cache.sql
- 20260607_payment_method_relax.sql
- 20260608_inventory_tracking.sql

## 2. Env vars cần set
### GHN (Week 5)
- GHN_TOKEN, GHN_SHOP_ID, GHN_BASE_URL, GHN_FROM_DISTRICT_ID, GHN_FROM_WARD_CODE, GHN_DEFAULT_SERVICE_TYPE_ID, GHN_WEBHOOK_SECRET

### Cron (low-stock alert)
- CRON_SECRET (đã có sẵn)

### FB Pixel (Week 8 — đã có)
- pixel_config slug='shop' phải được tạo trong /admin/pixel-settings

## 3. GHN Webhook configuration
Tại GHN dashboard → Settings → Webhooks:
URL: https://dangkhuong.com/api/webhooks/ghn
Secret: ${GHN_WEBHOOK_SECRET}

## 4. Test checklist
- [ ] Tạo product test qua /admin/products
- [ ] Add to cart qua /shop/[slug]
- [ ] Checkout với Sepay → success → shipment auto-created → email gửi
- [ ] Checkout với COD → admin confirm → shipment created
- [ ] Mixed order (course + book trong 1 đơn) hoạt động đúng
- [ ] FB Test Events thấy Purchase với dedup

## 5. Roadmap Phase 2
- Multi-carrier (GHTK + ViettelPost)
- Coupon engine
- Variant matrix advanced UI

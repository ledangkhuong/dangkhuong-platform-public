-- Migration: External revenue source flag on orders.
-- Created: 2026-05-27
--
-- Owner has customers who paid via Facebook / Zalo / bank transfer / cash /
-- prior platform. Granting them access on the new platform must NOT count
-- as cash flowing through the web — but the journey_stage triggers and the
-- audit trail still need to recognise these as paid orders.
--
-- `revenue_source` is the headline split:
--   platform = money flowed through Stripe/VNPay/PayOS/Sepay (real web cash)
--   external = customer paid in another channel; web only grants access
--   comp     = free comp / gift access
--
-- Sale KPI / dashboards split revenue_platform from revenue_external so the
-- daily cash-in KPI stays clean. The existing `auto_update_crm_on_paid_order`
-- trigger still fires for `external` and `comp` because paid is paid.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS revenue_source text NOT NULL DEFAULT 'platform'
    CHECK (revenue_source IN ('platform','external','comp')),
  ADD COLUMN IF NOT EXISTS external_paid_at date,
  ADD COLUMN IF NOT EXISTS external_channel text
    CHECK (external_channel IS NULL OR external_channel IN ('facebook','zalo','bank_transfer','cash','other_platform','other')),
  ADD COLUMN IF NOT EXISTS external_note text;

CREATE INDEX IF NOT EXISTS idx_orders_revenue_source ON public.orders(revenue_source);

COMMENT ON COLUMN public.orders.revenue_source IS 'platform=tiền chảy qua web; external=đã thu ở kênh khác, web chỉ cấp truy cập; comp=tặng miễn phí';

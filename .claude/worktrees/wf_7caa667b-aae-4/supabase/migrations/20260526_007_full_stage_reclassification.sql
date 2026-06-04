-- Migration: comprehensive stage reclassification from observable data
-- Created: 2026-05-26
--
-- Previous migrations advanced contacts forward but never demoted, so
-- two failure modes accumulated in prod:
--   1) Contacts with 2+ paid orders sat at 'contacted' (stage 3 Người mua
--      hàng) because the original auto-trigger only advanced to
--      'customer'/'contacted' once.
--   2) Some contacts ended up at 'customer' (stage 6 Người ủng hộ)
--      without any supporting evidence (no paid order, no enrollment, no
--      member tier) — likely from older trigger logic that mapped paid
--      orders to 'customer'.
--
-- This migration re-derives every contact's journey_stage from the
-- ground truth:
--   * tier='member' or 'vip'   → 'negotiation'   (Hội viên)
--   * 2+ paid orders            → 'qualified'    (Khách hàng)
--   * 1 paid order OR paid course enrollment
--                               → 'contacted'    (Người mua hàng)
--   * otherwise                 → 'lead'         (KH Tiềm năng)
--
-- Stages 6 (customer/Người ủng hộ) and 7 (advocate/Fan hâm mộ) are
-- MANUAL: this migration moves contacts OUT of stage 6 if there's no
-- backing data, but leaves stage 7 (advocate) untouched (always
-- preserved as a manual decision).

WITH paid_email AS (
  SELECT lower(customer_email) AS k, COUNT(*) AS cnt
  FROM public.orders WHERE status='paid' AND customer_email IS NOT NULL
  GROUP BY 1
),
paid_user AS (
  SELECT user_id AS k, COUNT(*) AS cnt
  FROM public.orders WHERE status='paid' AND user_id IS NOT NULL
  GROUP BY 1
),
paid_enroll AS (
  SELECT e.user_id, COUNT(*) AS cnt
  FROM public.enrollments e
  JOIN public.products p ON p.id = e.product_id
  WHERE p.price > 0 OR p.sale_price > 0
  GROUP BY 1
),
expected AS (
  SELECT
    c.id,
    CASE
      WHEN p.tier IN ('member','vip') THEN 'negotiation'
      WHEN COALESCE(pe.cnt,0) + COALESCE(pu.cnt,0) >= 2 THEN 'qualified'
      WHEN COALESCE(pe.cnt,0) + COALESCE(pu.cnt,0) = 1
           OR COALESCE(en.cnt,0) > 0
        THEN 'contacted'
      ELSE 'lead'
    END AS stage
  FROM public.crm_contacts c
  LEFT JOIN paid_email pe ON lower(c.email) = pe.k
  LEFT JOIN paid_user  pu ON c.user_id = pu.k
  LEFT JOIN paid_enroll en ON en.user_id = c.user_id
  LEFT JOIN public.profiles p ON p.id = c.user_id
)
UPDATE public.crm_contacts c
SET journey_stage = e.stage,
    updated_at = now()
FROM expected e
WHERE c.id = e.id
  AND c.journey_stage <> e.stage
  AND c.journey_stage <> 'advocate';  -- never demote a manual Fan hâm mộ

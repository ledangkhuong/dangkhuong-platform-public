-- Migration: standardize customer-stage rules per LĐK final spec
-- Created: 2026-05-26
--
-- Final business rule (highest signal wins):
--   1 Tiềm năng (lead)        : có email hoặc SĐT, chưa mua đơn nào
--   2 Người mua hàng (contacted): mua 1 đơn paid
--   3 Khách hàng (qualified)   : mua 2 đơn paid
--   4 Hội viên (negotiation)   : (3+ đơn AND DT > 5M) OR đóng phí (tier=member/vip)
--   5 Người ủng hộ (customer)  : Hội viên AND DT > 10M
--   6 Fan hâm mộ (advocate)    : Người ủng hộ AND có affiliate active
--
-- Quyền Affiliate (separate from stage): mua ≥ 2 đơn (≥ Khách hàng)
--
-- Why this matters: previous rules had "3+ paid → negotiation" without
-- a revenue floor, which gave Hội viên status to small repeat buyers.
-- New rule ties stage 4+ to real value (DT > 5M / 10M).
--
-- 5M = 5_000_000 đ ; 10M = 10_000_000 đ

-- ─── 1. Rewrite paid-order trigger ──────────────────────────
CREATE OR REPLACE FUNCTION auto_update_crm_on_paid_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_orders int;
  v_rev    bigint;
  v_tier   text;
  v_is_aff boolean;
  v_stage  text;
BEGIN
  IF NEW.status = 'paid'
     AND (OLD IS NULL OR OLD.status IS NULL OR OLD.status <> 'paid') THEN
    IF NEW.customer_email IS NULL THEN RETURN NEW; END IF;

    SELECT COUNT(*), COALESCE(SUM(amount), 0)
      INTO v_orders, v_rev
      FROM public.orders
     WHERE lower(customer_email) = lower(NEW.customer_email)
       AND status = 'paid';

    SELECT p.tier INTO v_tier
      FROM public.crm_contacts c
      LEFT JOIN public.profiles p ON p.id = c.user_id
     WHERE lower(c.email) = lower(NEW.customer_email)
     LIMIT 1;

    SELECT EXISTS(
        SELECT 1
          FROM public.affiliates a
          JOIN public.crm_contacts c ON c.user_id = a.user_id
         WHERE lower(c.email) = lower(NEW.customer_email)
           AND a.status = 'active'
      ) INTO v_is_aff;

    v_stage := CASE
      WHEN v_is_aff
           AND ((v_orders >= 3 AND v_rev > 10000000)
                OR (v_tier IN ('member','vip') AND v_rev > 10000000))
        THEN 'advocate'
      WHEN (v_orders >= 3 AND v_rev > 10000000)
           OR (v_tier IN ('member','vip') AND v_rev > 10000000)
        THEN 'customer'
      WHEN (v_orders >= 3 AND v_rev > 5000000)
           OR v_tier IN ('member','vip')
        THEN 'negotiation'
      WHEN v_orders >= 2 THEN 'qualified'
      ELSE 'contacted'
    END;

    UPDATE public.crm_contacts
       SET journey_stage = v_stage,
           lifetime_value = v_rev,
           total_orders = v_orders,
           converted_at = COALESCE(converted_at, now()),
           updated_at = now()
     WHERE lower(email) = lower(NEW.customer_email);

    UPDATE public.crm_contacts
       SET status = 'won'
     WHERE lower(email) = lower(NEW.customer_email)
       AND status IN ('new','contacted','qualified','negotiation');
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 2. Re-derive stages for all contacts under the new rules ─
WITH paid AS (
  SELECT lower(customer_email) AS k,
         COUNT(*) AS cnt,
         COALESCE(SUM(amount), 0) AS revenue
    FROM public.orders
   WHERE status = 'paid' AND customer_email IS NOT NULL
   GROUP BY 1
),
aff AS (
  SELECT user_id FROM public.affiliates WHERE status = 'active'
),
expected AS (
  SELECT
    c.id,
    CASE
      WHEN (af.user_id IS NOT NULL)
           AND ((COALESCE(pe.cnt,0) >= 3 AND COALESCE(pe.revenue,0) > 10000000)
                OR (p.tier IN ('member','vip') AND COALESCE(pe.revenue,0) > 10000000))
        THEN 'advocate'
      WHEN (COALESCE(pe.cnt,0) >= 3 AND COALESCE(pe.revenue,0) > 10000000)
           OR (p.tier IN ('member','vip') AND COALESCE(pe.revenue,0) > 10000000)
        THEN 'customer'
      WHEN (COALESCE(pe.cnt,0) >= 3 AND COALESCE(pe.revenue,0) > 5000000)
           OR p.tier IN ('member','vip')
        THEN 'negotiation'
      WHEN COALESCE(pe.cnt,0) >= 2 THEN 'qualified'
      WHEN COALESCE(pe.cnt,0) = 1 THEN 'contacted'
      ELSE 'lead'
    END AS stage,
    COALESCE(pe.revenue,0) AS rev,
    COALESCE(pe.cnt,0) AS orders_cnt
  FROM public.crm_contacts c
  LEFT JOIN paid pe ON lower(c.email) = pe.k
  LEFT JOIN public.profiles p ON p.id = c.user_id
  LEFT JOIN aff af ON af.user_id = c.user_id
)
UPDATE public.crm_contacts c
SET journey_stage = e.stage,
    lifetime_value = e.rev,
    total_orders = e.orders_cnt,
    updated_at = now()
FROM expected e
WHERE c.id = e.id
  AND (c.journey_stage <> e.stage
       OR COALESCE(c.lifetime_value, 0) <> e.rev
       OR COALESCE(c.total_orders, 0) <> e.orders_cnt);

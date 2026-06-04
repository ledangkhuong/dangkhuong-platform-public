-- Migration: extend stage rules per loyalty pyramid definition
-- Created: 2026-05-26
--
-- Refined rule set (highest signal wins):
--   Stage 7 — Fan hâm mộ        : affiliate.total_conversions >= 3
--   Stage 6 — Người ủng hộ      : affiliate.total_conversions >= 1
--   Stage 5 — Hội viên          : tier IN (member,vip) OR paid_orders >= 3
--   Stage 4 — Khách hàng         : paid_orders == 2
--   Stage 3 — Người mua hàng    : paid_orders == 1 OR paid_enrollment >= 1
--   Stage 2 — KH Tiềm năng      : otherwise (registered, no purchase)
--   Stage 1 — KH Mục tiêu       : unused (no visitor tracking yet)
--
-- Why 3+ paid → Hội viên: per pyramid def "feels they belong, recognized,
-- treated differently". A buyer with 3+ orders is clearly a loyal
-- recurring customer, not just a repeat buyer.
--
-- Why affiliate signals for 6-7: stage 6 is "refers when asked" and
-- stage 7 is "refers proactively/often". Affiliate conversion count is
-- the system's best signal for both — having referred at least one
-- buyer (1 conversion) is supporter behaviour; 3+ is evangelist.

-- ─── 1. Update paid-order trigger to handle 3+ → Hội viên ──
CREATE OR REPLACE FUNCTION auto_update_crm_on_paid_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_paid_count int;
  v_new_stage  text;
BEGIN
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status IS NULL OR OLD.status <> 'paid') THEN
    IF NEW.customer_email IS NULL THEN RETURN NEW; END IF;

    SELECT COUNT(*) INTO v_paid_count
    FROM public.orders
    WHERE lower(customer_email) = lower(NEW.customer_email) AND status='paid';

    IF v_paid_count >= 3 THEN
      v_new_stage := 'negotiation';   -- Hội viên (loyal recurring)
    ELSIF v_paid_count = 2 THEN
      v_new_stage := 'qualified';     -- Khách hàng (repeat)
    ELSE
      v_new_stage := 'contacted';     -- Người mua hàng (first time)
    END IF;

    -- Only advance forward; never demote a customer/advocate.
    UPDATE public.crm_contacts
    SET journey_stage = CASE
        WHEN journey_stage IN ('visitor','lead','contacted','qualified','negotiation')
             AND CASE
                  WHEN v_new_stage='negotiation' THEN 1
                  WHEN v_new_stage='qualified' THEN 2
                  ELSE 3
                END <= CASE
                  WHEN journey_stage='negotiation' THEN 1
                  WHEN journey_stage='qualified' THEN 2
                  WHEN journey_stage='contacted' THEN 3
                  ELSE 4
                END
        THEN v_new_stage
        WHEN journey_stage IN ('customer','advocate') THEN journey_stage
        ELSE v_new_stage
      END,
      lifetime_value = COALESCE(lifetime_value,0) + COALESCE(NEW.amount,0),
      total_orders = COALESCE(total_orders,0) + 1,
      converted_at = COALESCE(converted_at, now()),
      updated_at = now()
    WHERE lower(email) = lower(NEW.customer_email);

    UPDATE public.crm_contacts SET status='won'
    WHERE lower(email)=lower(NEW.customer_email)
      AND status IN ('new','contacted','qualified','negotiation');
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 2. Trigger for affiliate-conversion-based advancement ──
-- When an affiliate's total_conversions changes, advance the matching
-- contact to 'customer' (1+) or 'advocate' (3+).
CREATE OR REPLACE FUNCTION crm_advance_on_affiliate_conversion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_stage text;
BEGIN
  IF NEW.total_conversions >= 3 THEN
    v_new_stage := 'advocate';
  ELSIF NEW.total_conversions >= 1 THEN
    v_new_stage := 'customer';
  ELSE
    RETURN NEW;
  END IF;

  UPDATE public.crm_contacts
  SET journey_stage = v_new_stage,
      updated_at = now()
  WHERE user_id = NEW.user_id
    AND journey_stage <> v_new_stage
    AND (
      journey_stage IN ('visitor','lead','contacted','qualified','negotiation','customer')
      OR (journey_stage = 'customer' AND v_new_stage = 'advocate')
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[crm_advance_on_affiliate_conversion] %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_affiliates_conversion_advance ON public.affiliates;
CREATE TRIGGER trg_affiliates_conversion_advance
  AFTER UPDATE OF total_conversions ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION crm_advance_on_affiliate_conversion();

-- ─── 3. Reclassification (applied to prod already) ──
-- Re-derive every contact's stage from the new rule set.
WITH paid_email AS (SELECT lower(customer_email) AS k, COUNT(*) AS cnt FROM public.orders WHERE status='paid' AND customer_email IS NOT NULL GROUP BY 1),
paid_user AS (SELECT user_id AS k, COUNT(*) AS cnt FROM public.orders WHERE status='paid' AND user_id IS NOT NULL GROUP BY 1),
paid_enroll AS (SELECT e.user_id, COUNT(*) AS cnt FROM public.enrollments e JOIN public.products p ON p.id=e.product_id WHERE p.price>0 OR p.sale_price>0 GROUP BY 1),
aff_conv AS (SELECT a.user_id, a.total_conversions AS cnt FROM public.affiliates a WHERE a.total_conversions > 0),
expected AS (
  SELECT c.id, CASE
    WHEN COALESCE(ac.cnt,0) >= 3 THEN 'advocate'
    WHEN COALESCE(ac.cnt,0) >= 1 THEN 'customer'
    WHEN p.tier IN ('member','vip')
         OR (COALESCE(pe.cnt,0)+COALESCE(pu.cnt,0)) >= 3 THEN 'negotiation'
    WHEN (COALESCE(pe.cnt,0)+COALESCE(pu.cnt,0)) >= 2 THEN 'qualified'
    WHEN (COALESCE(pe.cnt,0)+COALESCE(pu.cnt,0)) = 1
         OR COALESCE(en.cnt,0) > 0 THEN 'contacted'
    ELSE 'lead'
  END AS stage
  FROM public.crm_contacts c
  LEFT JOIN paid_email pe ON lower(c.email)=pe.k
  LEFT JOIN paid_user  pu ON c.user_id=pu.k
  LEFT JOIN paid_enroll en ON en.user_id=c.user_id
  LEFT JOIN aff_conv ac ON ac.user_id=c.user_id
  LEFT JOIN public.profiles p ON p.id=c.user_id
)
UPDATE public.crm_contacts c
SET journey_stage = e.stage, updated_at = now()
FROM expected e
WHERE c.id = e.id AND c.journey_stage <> e.stage;

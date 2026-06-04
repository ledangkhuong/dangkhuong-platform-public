-- Migration: auto-advance crm_contact when user enrolls in a paid course
-- Created: 2026-05-26
--
-- Context: many users get access to a paid course without going through
-- the orders table (manual grant, affiliate, promo code, gift). Without
-- this hook those users stay at 'lead' even though they're effectively
-- "Người mua hàng" / customers.
--
-- This trigger advances the matching crm_contact to 'contacted' when a
-- user enrolls in a course with a non-zero price. Free-course
-- enrollment does NOT advance (free signup ≠ becoming a customer).
--
-- Plus a one-shot backfill for the 48 contacts already in this state.

-- ─── 1. Function ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crm_advance_on_paid_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_paid_course boolean;
BEGIN
  -- Check if the enrolled product is paid
  SELECT (price > 0 OR sale_price > 0) INTO v_is_paid_course
  FROM public.products
  WHERE id = NEW.product_id;

  IF NOT COALESCE(v_is_paid_course, false) THEN
    RETURN NEW;
  END IF;

  -- Advance matching contact (by user_id) if currently below stage 3
  UPDATE public.crm_contacts
  SET journey_stage = 'contacted',
      updated_at = now()
  WHERE user_id = NEW.user_id
    AND journey_stage IN ('visitor','lead');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the enrollment insert on a CRM hiccup.
  RAISE WARNING '[crm_advance_on_paid_enrollment] %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_advance_on_paid_enrollment() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_enrollments_advance_contact ON public.enrollments;
CREATE TRIGGER trg_enrollments_advance_contact
  AFTER INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_advance_on_paid_enrollment();

-- ─── 2. One-shot backfill ───────────────────────────────────
-- Anyone currently at visitor/lead who has enrolled in a paid course
-- (but doesn't have a matching paid order — already covered by 005)
-- gets advanced to 'contacted'.
UPDATE public.crm_contacts c
SET journey_stage = 'contacted', updated_at = now()
FROM public.enrollments e
JOIN public.products p ON p.id = e.product_id
WHERE e.user_id = c.user_id
  AND (p.price > 0 OR p.sale_price > 0)
  AND c.journey_stage IN ('visitor','lead');

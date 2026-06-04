-- Migration: realign journey_stage with the 7-stage loyalty pyramid
-- Created: 2026-05-26
--
-- Per product spec (customer-loyalty pyramid):
--   1. KH Mục tiêu      → journey_stage='visitor'
--   2. KH Tiềm năng     → journey_stage='lead'
--   3. Người mua hàng   → journey_stage='contacted'   (1 paid order)
--   4. Khách hàng        → journey_stage='qualified'   (2+ paid orders)
--   5. Hội viên          → journey_stage='negotiation' (tier='member' or 'vip')
--   6. Người ủng hộ      → journey_stage='customer'    (manual — refers when asked)
--   7. Fan hâm mộ        → journey_stage='advocate'    (manual — evangelist)
--
-- Changes:
--   1. Rewrite auto_update_crm_on_paid_order to advance based on COUNT of
--      paid orders, not jump straight to 'customer'.
--   2. Backfill existing data: for contacts currently at 'customer' (stage 6),
--      reassign by paid-order count → contacted (3) or qualified (4).
--   3. Add membership rule trigger: when profiles.tier becomes 'member' or
--      'vip', advance their crm_contact to 'negotiation' if currently
--      below stage 5.

-- ─── 1. Updated paid-order trigger ────────────────────────────
CREATE OR REPLACE FUNCTION auto_update_crm_on_paid_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_paid_count int;
  v_new_stage  text;
BEGIN
  -- Only fire on transition to 'paid'
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status IS NULL OR OLD.status <> 'paid') THEN
    IF NEW.customer_email IS NULL THEN
      RETURN NEW;
    END IF;

    -- How many paid orders does this customer have total (including this one)?
    SELECT COUNT(*) INTO v_paid_count
    FROM public.orders
    WHERE lower(customer_email) = lower(NEW.customer_email)
      AND status = 'paid';

    -- Map paid count to journey stage:
    --   1   → 'contacted'   (Người mua hàng)
    --   2+  → 'qualified'   (Khách hàng)
    IF v_paid_count >= 2 THEN
      v_new_stage := 'qualified';
    ELSE
      v_new_stage := 'contacted';
    END IF;

    -- Only ADVANCE forward — never demote a contact that already sits at a
    -- higher stage (member, supporter, evangelist).
    UPDATE public.crm_contacts
    SET
      journey_stage = CASE
        WHEN journey_stage IN ('visitor','lead','contacted') THEN v_new_stage
        WHEN journey_stage = 'qualified' AND v_new_stage = 'qualified' THEN 'qualified'
        ELSE journey_stage
      END,
      lifetime_value = COALESCE(lifetime_value, 0) + COALESCE(NEW.amount, 0),
      total_orders = COALESCE(total_orders, 0) + 1,
      converted_at = COALESCE(converted_at, now()),
      updated_at = now()
    WHERE lower(email) = lower(NEW.customer_email);

    -- Status pipeline: legacy field — keep in sync
    UPDATE public.crm_contacts
    SET status = 'won'
    WHERE lower(email) = lower(NEW.customer_email)
      AND status IN ('new','contacted','qualified','negotiation');
  END IF;
  RETURN NEW;
END;
$$;

-- (Trigger already exists from 20250517 — function replacement is enough)

-- ─── 2. Membership rule trigger ───────────────────────────────
-- When a profile.tier becomes 'member' or 'vip', advance the matching
-- crm_contact to 'negotiation' (Hội viên), but only if it's currently at
-- a lower stage. Never demote.
CREATE OR REPLACE FUNCTION crm_advance_on_tier_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tier IN ('member','vip')
     AND (OLD.tier IS NULL OR OLD.tier IS DISTINCT FROM NEW.tier) THEN
    UPDATE public.crm_contacts
    SET journey_stage = 'negotiation',
        updated_at = now()
    WHERE user_id = NEW.id
      AND journey_stage IN ('visitor','lead','contacted','qualified');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[crm_advance_on_tier_change] %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_tier_advance ON public.profiles;
CREATE TRIGGER trg_profiles_tier_advance
  AFTER UPDATE OF tier ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION crm_advance_on_tier_change();

-- ─── 3. Backfill ──────────────────────────────────────────────
-- Reassign contacts currently sitting at 'customer' (stage 6) when they
-- shouldn't be there. Anyone with paid orders is really at stage 3 or 4.
UPDATE public.crm_contacts c
SET journey_stage = CASE
    WHEN paid_counts.cnt >= 2 THEN 'qualified'   -- Stage 4: Khách hàng (repeat)
    WHEN paid_counts.cnt = 1   THEN 'contacted'  -- Stage 3: Người mua hàng (one-time)
    ELSE c.journey_stage
  END,
  updated_at = now()
FROM (
  SELECT lower(o.customer_email) AS email_key, COUNT(*) AS cnt
  FROM public.orders o
  WHERE o.status = 'paid' AND o.customer_email IS NOT NULL
  GROUP BY lower(o.customer_email)
) paid_counts
WHERE c.journey_stage = 'customer'
  AND lower(c.email) = paid_counts.email_key;

-- Also: any current member/vip profile → advance their contact to 'negotiation'
UPDATE public.crm_contacts c
SET journey_stage = 'negotiation',
    updated_at = now()
FROM public.profiles p
WHERE p.id = c.user_id
  AND p.tier IN ('member','vip')
  AND c.journey_stage IN ('visitor','lead','contacted','qualified');

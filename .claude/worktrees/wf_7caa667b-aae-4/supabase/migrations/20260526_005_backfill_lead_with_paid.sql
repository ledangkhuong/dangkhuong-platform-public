-- Migration: comprehensive backfill — advance any lead/visitor with paid orders
-- Created: 2026-05-26
--
-- The previous backfill in 20260526_004 only touched contacts at 'customer'
-- stage. But the auto-track trigger (20260526_003) had recently created
-- ~388 contacts at default 'lead' stage — including dozens who already
-- had paid orders. Those people were showing as "KH Tiềm năng" instead of
-- "Người mua hàng" / "Khách hàng".
--
-- This migration re-scans the full set: anyone at visitor/lead with paid
-- orders gets advanced to contacted (1 order) or qualified (2+ orders).
-- Idempotent — re-running is safe because the trigger keeps things
-- consistent going forward.

UPDATE public.crm_contacts c
SET journey_stage = CASE
    WHEN paid.cnt >= 2 THEN 'qualified'   -- Stage 4: Khách hàng (repeat)
    ELSE 'contacted'                       -- Stage 3: Người mua hàng (one-time)
  END,
  updated_at = now()
FROM (
  SELECT lower(customer_email) AS email_key, COUNT(*) AS cnt
  FROM public.orders
  WHERE status = 'paid' AND customer_email IS NOT NULL
  GROUP BY 1
) paid
WHERE c.journey_stage IN ('visitor','lead')
  AND lower(c.email) = paid.email_key;

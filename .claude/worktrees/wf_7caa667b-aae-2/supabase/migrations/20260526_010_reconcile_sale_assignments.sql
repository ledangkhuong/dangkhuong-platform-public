-- Migration: reconcile sale assignments across contact ↔ orders/interests
-- Created: 2026-05-26
--
-- Rule: a contact's `assigned_to` is the authoritative source of truth
-- for which sale "owns" that customer. All related orders, interests,
-- and deals should mirror it unless the admin deliberately set a
-- per-order override.
--
-- Audit before this migration found:
--   * 212 course_interests had c.assigned_to set but i.assigned_to was
--     NULL — cascade from earlier contact assigns missed them.
--   * 119 contacts were NULL but had at least one order with a sale —
--     the first-touch propagation never ran for them.
--   * 8 orders had a sale different from the contact's — left untouched
--     (per-order override is allowed by spec).

-- ─── 1. Cascade contact.assigned_to down to any NULL interest ──
UPDATE public.course_interests i
SET assigned_to = c.assigned_to
FROM public.crm_contacts c
WHERE i.user_id = c.user_id
  AND c.assigned_to IS NOT NULL
  AND i.assigned_to IS NULL;

-- ─── 2. Propagate up: contact gets the OLDEST assigned order's sale ──
UPDATE public.crm_contacts c
SET assigned_to = src.sale_id,
    assigned_at = COALESCE(c.assigned_at, now()),
    assignment_method = 'manual'
FROM (
  SELECT DISTINCT ON (lower(o.customer_email))
    lower(o.customer_email) AS email_key,
    o.assigned_to AS sale_id
  FROM public.orders o
  WHERE o.assigned_to IS NOT NULL
  ORDER BY lower(o.customer_email), o.created_at ASC
) src
WHERE c.assigned_to IS NULL
  AND lower(c.email) = src.email_key;

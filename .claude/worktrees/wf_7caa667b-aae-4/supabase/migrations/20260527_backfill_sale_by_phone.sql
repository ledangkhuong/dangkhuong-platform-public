-- Migration: backfill crm_contacts.assigned_to by matching phone with siblings
-- Created: 2026-05-27
--
-- Context: discovered via admin audit that the same end-customer often
-- registers multiple accounts with different emails but the same phone
-- number. The existing trigger `auto_update_crm_on_paid_order` only
-- propagates assigned_to to contacts whose `email = LOWER(order.customer_email)`,
-- so the "sibling" contacts (same person, different email) stay NULL
-- forever. Admin manually checks these via the Khách hàng list and
-- sees "Chưa gán" even though a sale clearly owns the customer via
-- another email.
--
-- Audit on 2026-05-27 (production):
--   * Verified with phones 0772224599 (Phạm Quang Nghĩa) and
--     0961487265 (TAI TUE NGUYEN) — 3 of 5 sibling contacts were NULL
--     despite the paying-email contact having a sale.
--
-- Rule: a phone number that is already "owned" by a sale (via any one
-- sibling contact) should propagate that sale to every other sibling
-- contact that is currently NULL. We pick the most recently assigned
-- sibling as the source of truth (assigned_at DESC), which matches
-- the trigger's "first-touch wins, latest manual override second"
-- precedent.
--
-- Idempotent: the WHERE c.assigned_to IS NULL clause guarantees we
-- never overwrite an explicit assignment. Safe to re-run.

-- ─── 1. Propagate sale across sibling contacts sharing a phone ──
WITH phone_has_sale AS (
  SELECT DISTINCT ON (phone)
    phone,
    assigned_to AS sale_id,
    assigned_at
  FROM public.crm_contacts
  WHERE assigned_to IS NOT NULL
    AND phone IS NOT NULL
    AND phone <> ''
  ORDER BY phone, assigned_at DESC NULLS LAST
)
UPDATE public.crm_contacts c
SET
  assigned_to       = p.sale_id,
  assigned_at       = COALESCE(c.assigned_at, p.assigned_at, now()),
  assignment_method = 'auto',
  updated_at        = now()
FROM phone_has_sale p
WHERE c.phone = p.phone
  AND c.assigned_to IS NULL
  AND c.phone IS NOT NULL
  AND c.phone <> '';

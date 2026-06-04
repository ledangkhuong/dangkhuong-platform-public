-- Migration: auto-link crm_contacts.user_id from auth.users by email
-- Created: 2026-05-26
--
-- Why: contacts were sometimes created without user_id (e.g. by
-- syncContactsFromOrders or manual import that only carries email).
-- Without user_id, cascade-to-course_interests on customer reassignment
-- never fires (the cascade filter is by user_id). Sticky-by-user_id
-- also misses.
--
-- Fix:
--   1. BEFORE INSERT / BEFORE UPDATE OF email trigger that fills
--      user_id from auth.users when NULL.
--   2. One-shot backfill at the bottom (idempotent — guarded by
--      `user_id IS NULL`).
--
-- The function runs with SECURITY DEFINER because trigger users may
-- not have direct SELECT on auth.users. The function itself only
-- ever reads — never writes — auth.users.

-- ─── 1. Function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crm_contact_autolink_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT u.id INTO NEW.user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(NEW.email)
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Tight permissions on the function — only trigger context needs it.
REVOKE ALL ON FUNCTION public.crm_contact_autolink_user_id() FROM PUBLIC;

-- ─── 2. Trigger ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_crm_contacts_autolink_user_id
  ON public.crm_contacts;

CREATE TRIGGER trg_crm_contacts_autolink_user_id
  BEFORE INSERT OR UPDATE OF email
  ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_contact_autolink_user_id();

-- ─── 3. One-shot backfill (idempotent — already partially done
-- via ad-hoc SQL earlier; this guarantees fresh installs are
-- consistent too).
UPDATE public.crm_contacts c
SET user_id = u.id
FROM auth.users u
WHERE c.user_id IS NULL
  AND c.email IS NOT NULL
  AND lower(u.email) = lower(c.email);

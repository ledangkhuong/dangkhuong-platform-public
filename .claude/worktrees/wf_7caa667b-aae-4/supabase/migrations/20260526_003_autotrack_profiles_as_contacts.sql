-- Migration: auto-track every registered user as a CRM contact
-- Created: 2026-05-26
--
-- Goal: keep `profiles` and `crm_contacts` 1:1 for real customers so
-- sales never has to manually add a contact for a registered user.
--
-- Filter (EXCLUDED from CRM):
--   * staff roles: admin / manager / marketing / sale / support
--   * internal test emails: %@dangkhuong.com
--
-- Behaviour:
--   * AFTER INSERT trigger on profiles → create matching crm_contact
--     (idempotent — skip if one already exists for the user_id).
--   * Fail-soft: any error in trigger logs WARNING but never blocks
--     profile creation (auth signup must keep working).
--   * One-shot backfill at the bottom for existing profiles without
--     a contact.

-- ─── 1. Function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crm_autotrack_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
BEGIN
  -- Skip staff — they're employees, not customers.
  IF COALESCE(NEW.role, 'student') IN ('admin','manager','marketing','sale','support') THEN
    RETURN NEW;
  END IF;

  -- Skip if a contact already exists for this user (idempotent).
  IF EXISTS (SELECT 1 FROM public.crm_contacts WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Fetch email from auth.users (profiles has no email column).
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = NEW.id LIMIT 1;

  -- Skip internal test emails.
  IF v_email IS NOT NULL AND lower(v_email) LIKE '%@dangkhuong.com' THEN
    RETURN NEW;
  END IF;

  -- Create the contact. user_id is set explicitly; the BEFORE-INSERT
  -- autolink trigger on crm_contacts is a no-op in that case.
  INSERT INTO public.crm_contacts
    (user_id, full_name, email, source, status, created_by)
  VALUES
    (NEW.id, NEW.full_name, v_email, 'registration', 'new', NEW.id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block profile creation (auth signup) on a CRM hiccup.
  RAISE WARNING '[crm_autotrack_profile] Failed for profile %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_autotrack_profile() FROM PUBLIC;

-- ─── 2. Trigger ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_profiles_autotrack ON public.profiles;
CREATE TRIGGER trg_profiles_autotrack
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_autotrack_profile();

-- ─── 3. One-shot backfill ────────────────────────────────────
-- Create contacts for every existing profile that doesn't have one,
-- applying the same filter as the trigger.
INSERT INTO public.crm_contacts
  (user_id, full_name, email, source, status, created_by)
SELECT
  p.id,
  p.full_name,
  u.email,
  'registration',
  'new',
  p.id
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE NOT EXISTS (
    SELECT 1 FROM public.crm_contacts c WHERE c.user_id = p.id
  )
  AND COALESCE(p.role, 'student') NOT IN ('admin','manager','marketing','sale','support')
  AND (u.email IS NULL OR lower(u.email) NOT LIKE '%@dangkhuong.com');

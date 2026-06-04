-- Migration: backfill crm_contacts.phone + set phone in autotrack trigger
-- Created: 2026-05-26
--
-- 505/657 contacts had NULL phone because the autotrack trigger only
-- copied email. The /crm/contacts table renders "—" in the SĐT column
-- for every one of them — useless when sales needs to call.
--
-- Fix: copy phone from profiles.phone first (most reliable), fall back
-- to the most recent order's customer_phone. Update the autotrack
-- trigger so newly auto-created contacts also pick up phone.

-- ─── 1. Backfill: profiles.phone → crm_contacts.phone ──────
UPDATE public.crm_contacts c
SET phone = p.phone, updated_at = now()
FROM public.profiles p
WHERE p.id = c.user_id
  AND c.phone IS NULL
  AND p.phone IS NOT NULL;

-- ─── 2. Backfill: most recent order's customer_phone ──────
-- (only for contacts still missing — fallback when profile.phone is null)
UPDATE public.crm_contacts c
SET phone = o.customer_phone, updated_at = now()
FROM (
  SELECT DISTINCT ON (lower(customer_email)) lower(customer_email) AS email_key,
         customer_phone
  FROM public.orders
  WHERE customer_phone IS NOT NULL
  ORDER BY lower(customer_email), created_at DESC
) o
WHERE c.phone IS NULL
  AND lower(c.email) = o.email_key;

-- ─── 3. Update autotrack trigger to set phone on new contacts ─
CREATE OR REPLACE FUNCTION public.crm_autotrack_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
BEGIN
  IF COALESCE(NEW.role, 'student') IN ('admin','manager','marketing','sale','support') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.crm_contacts WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = NEW.id LIMIT 1;
  IF v_email IS NOT NULL AND lower(v_email) LIKE '%@dangkhuong.com' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.crm_contacts
    (user_id, full_name, email, phone, source, status, created_by)
  VALUES
    (NEW.id, NEW.full_name, v_email, NEW.phone, 'registration', 'new', NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[crm_autotrack_profile] Failed for profile %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

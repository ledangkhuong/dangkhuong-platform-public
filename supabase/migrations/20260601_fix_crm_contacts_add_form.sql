-- Fix CRM "Add Contact" form: add missing columns and tables,
-- relax source CHECK constraint so custom sources work.

-- 1. Add facebook_url column (used by add/edit contact forms but never created)
ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS facebook_url text;

-- 2. Drop the restrictive CHECK constraint on source so users can enter
--    custom source labels (stored in the crm_sources lookup table).
--    The original constraint only allowed:
--      ('manual','import','website','referral','ads','social')
ALTER TABLE crm_contacts
  DROP CONSTRAINT IF EXISTS crm_contacts_source_check;

-- 3. Create crm_sources lookup table (referenced by the app for source
--    auto-complete but never created in any migration).
CREATE TABLE IF NOT EXISTS public.crm_sources (
  label text PRIMARY KEY
);

ALTER TABLE public.crm_sources ENABLE ROW LEVEL SECURITY;

-- Staff can read sources
DROP POLICY IF EXISTS "crm_sources_select_staff" ON public.crm_sources;
CREATE POLICY "crm_sources_select_staff" ON public.crm_sources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support', 'marketing')
    )
  );

-- Staff can insert new sources
DROP POLICY IF EXISTS "crm_sources_insert_staff" ON public.crm_sources;
CREATE POLICY "crm_sources_insert_staff" ON public.crm_sources
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'sale', 'support', 'marketing')
    )
  );

-- Seed the original constrained values so existing data stays consistent
INSERT INTO public.crm_sources (label) VALUES
  ('manual'),
  ('import'),
  ('website'),
  ('referral'),
  ('ads'),
  ('social')
ON CONFLICT (label) DO NOTHING;

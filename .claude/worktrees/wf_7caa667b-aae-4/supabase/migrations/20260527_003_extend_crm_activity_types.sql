-- ============================================================
-- Extend the allowed values for crm_activities.type to include
-- 'source_change' so inline edits of crm_contacts.source from the
-- /crm/contacts list page can log a system activity row.
--
-- Original check (from 20250517_crm_professional_upgrade.sql):
--   type IN ('note','call','email','meeting','task',
--            'status_change','journey_change','purchase',
--            'enrollment','page_view','form_submit','assignment')
--
-- New check: adds 'source_change'.
--
-- Notes:
-- - The `setContactSource` server action in
--   `src/lib/actions/contact-source.ts` inserts rows with
--   type='source_change'. Without this migration that insert is
--   silently dropped (the action fail-softs the activity log).
-- - DO NOT run this from code — owner applies it manually via
--   the Supabase dashboard.
-- ============================================================

ALTER TABLE public.crm_activities
  DROP CONSTRAINT IF EXISTS crm_activities_type_check;

ALTER TABLE public.crm_activities
  ADD CONSTRAINT crm_activities_type_check
  CHECK (type IN (
    'note',
    'call',
    'email',
    'meeting',
    'task',
    'status_change',
    'source_change',
    'journey_change',
    'purchase',
    'enrollment',
    'page_view',
    'form_submit',
    'assignment'
  ));

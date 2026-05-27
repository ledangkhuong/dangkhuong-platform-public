-- ============================================================
-- Extend the allowed values for crm_activities.type to include
-- 'tags_change' so the new tag editor on the contact detail page
-- can log a system activity row whenever sale reps add or remove
-- freeform labels (see src/lib/actions/contact-tags.ts).
--
-- Previous check (from 20260527_003_extend_crm_activity_types.sql):
--   type IN ('note','call','email','meeting','task',
--            'status_change','source_change','journey_change',
--            'purchase','enrollment','page_view','form_submit',
--            'assignment')
--
-- New check: adds 'tags_change'.
--
-- Notes:
-- - Apply AFTER 20260527_004_contact_tags.sql (the column the
--   action mutates).
-- - The `setContactTags` server action inserts rows with
--   type='tags_change'. Without this migration that insert is
--   rejected by the CHECK constraint and the action fail-softs
--   the activity log.
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
    'tags_change',
    'journey_change',
    'purchase',
    'enrollment',
    'page_view',
    'form_submit',
    'assignment'
  ));

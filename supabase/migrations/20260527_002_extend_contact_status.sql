-- ============================================================
-- Extend the allowed values for crm_contacts.status to include
-- 'paused' and 'cold' so sales reps can pause a deal or mark a
-- contact as cold without losing the previous pipeline stage.
--
-- Original check (from migration_crm.sql):
--   status IN ('new','contacted','qualified','negotiation',
--              'won','lost','churned')
--
-- New check:
--   status IN ('new','contacted','qualified','negotiation',
--              'won','lost','churned','paused','cold')
--
-- Notes:
-- - 'churned' is retained for backward-compat with any rows that
--   may already use it (and UI in /crm/contacts already renders
--   it as "Rời bỏ"). Sales reps no longer need it day-to-day,
--   but dropping it would risk constraint violations on existing
--   rows.
-- - DO NOT run this from code — owner applies it manually via
--   the Supabase dashboard.
-- ============================================================

ALTER TABLE public.crm_contacts
  DROP CONSTRAINT IF EXISTS crm_contacts_status_check;

ALTER TABLE public.crm_contacts
  ADD CONSTRAINT crm_contacts_status_check
  CHECK (status IN (
    'new',
    'contacted',
    'qualified',
    'negotiation',
    'won',
    'lost',
    'churned',
    'paused',
    'cold'
  ));

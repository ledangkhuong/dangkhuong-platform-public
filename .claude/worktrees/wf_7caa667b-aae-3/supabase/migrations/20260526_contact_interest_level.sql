-- ─── Contact Interest Level ───────────────────────────────────────────────
-- Adds an optional "interest_level" qualitative score on crm_contacts so
-- sales reps can record how warm a lead feels after a customer-care touch
-- (call/meeting/email). Used by the enhanced activity form (Agent M/N) to
-- both stamp `metadata.interest_level_at_touch` on the activity AND keep
-- the contact's latest interest level on the contact record itself.
--
-- Values: 'high' | 'medium' | 'low'  (NULL = unset / not yet qualified)
-- Partial index speeds up dashboards that filter to qualified leads only.

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS interest_level text
    CHECK (interest_level IS NULL OR interest_level IN ('high','medium','low'));

CREATE INDEX IF NOT EXISTS idx_crm_contacts_interest_level
  ON public.crm_contacts (interest_level)
  WHERE interest_level IS NOT NULL;

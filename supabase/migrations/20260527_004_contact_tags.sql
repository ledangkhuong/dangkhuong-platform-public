-- crm_contacts.tags: freeform multi-value labels for sale-rep workflows.
-- Distinct from status/journey_stage/source. Stored as text[] so the
-- column owns the data; a future master crm_tags table can be added
-- later if we need centralised colours/descriptions, but the autocomplete
-- already works off the union of existing values.

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- GIN index for fast `tags && ARRAY['VIP']` lookups (contains-any) and
-- for the future tag-filter chip on /crm/contacts.
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tags ON public.crm_contacts USING gin(tags);

COMMENT ON COLUMN public.crm_contacts.tags IS 'Freeform labels managed by sale reps. Multi-value. Lowercased + trimmed on write.';

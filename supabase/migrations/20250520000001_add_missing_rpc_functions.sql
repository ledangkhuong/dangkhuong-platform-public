-- Add missing RPC functions that are called in application code but do not
-- exist in the database, causing silent failures.
--
-- 1. increment_campaign_sent_count  -- used by campaign-processor.ts
-- 2. increment_field                -- used by automation-processor.ts

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Atomically increment sent_count on an email campaign
--    Called as: supabase.rpc("increment_campaign_sent_count", { cid })
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_campaign_sent_count(cid UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE email_campaigns
  SET sent_count = COALESCE(sent_count, 0) + 1
  WHERE id = cid
  RETURNING sent_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Generic atomic field incrementer
--    Called as: supabase.rpc("increment_field", {
--      table_name, row_id, field_name, increment_by
--    })
--
--    Uses quote_ident() to safely escape identifiers, preventing SQL
--    injection while allowing dynamic table/column names.
--    Only allows tables in the public schema.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_field(
  table_name TEXT,
  row_id UUID,
  field_name TEXT,
  increment_by INT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    table_name,
    field_name,
    field_name
  )
  USING increment_by, row_id;
END;
$$;

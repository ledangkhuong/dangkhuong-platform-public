-- Atomic increment for affiliate stats to prevent race conditions
-- when two orders for the same affiliate are processed simultaneously.
-- Replaces the read-then-write pattern with a single atomic UPDATE.
CREATE OR REPLACE FUNCTION increment_affiliate_stats(p_affiliate_id uuid, p_earned_amount bigint)
RETURNS void AS $$
  UPDATE affiliates
  SET total_earned = total_earned + p_earned_amount,
      total_conversions = total_conversions + 1,
      updated_at = now()
  WHERE id = p_affiliate_id;
$$ LANGUAGE sql;

-- Atomic increment for affiliate total_paid to prevent TOCTOU race condition
-- when two payouts for the same affiliate are processed concurrently.
CREATE OR REPLACE FUNCTION increment_affiliate_total_paid(p_affiliate_id uuid, p_paid_amount bigint)
RETURNS void AS $$
  UPDATE affiliates
  SET total_paid = COALESCE(total_paid, 0) + p_paid_amount,
      updated_at = now()
  WHERE id = p_affiliate_id;
$$ LANGUAGE sql;

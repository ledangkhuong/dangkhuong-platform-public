-- Atomic increment for affiliate click counter (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_affiliate_clicks(p_affiliate_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE affiliates SET total_clicks = COALESCE(total_clicks, 0) + 1, updated_at = now()
  WHERE id = p_affiliate_id;
END;
$$ LANGUAGE plpgsql;

-- Unique partial index to prevent duplicate pending payouts (TOCTOU fix)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_payout_per_affiliate
ON affiliate_payouts (affiliate_id) WHERE status = 'pending';

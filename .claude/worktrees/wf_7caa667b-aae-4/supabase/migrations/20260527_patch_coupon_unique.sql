-- Prevent duplicate coupon usage per user at the database level
-- This is a safety net in addition to the claim_coupon RPC check
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_usage_unique
ON coupon_usages (coupon_id, user_id);

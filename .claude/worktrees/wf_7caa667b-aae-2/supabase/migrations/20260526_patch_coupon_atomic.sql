-- Atomic coupon claim to prevent TOCTOU race condition
CREATE OR REPLACE FUNCTION claim_coupon(p_coupon_id uuid, p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_already_used boolean;
  v_result jsonb;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM coupon_usages WHERE coupon_id = p_coupon_id AND user_id = p_user_id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;

  UPDATE coupons SET used_count = used_count + 1, updated_at = now()
  WHERE id = p_coupon_id AND (max_uses IS NULL OR used_count < max_uses)
  RETURNING jsonb_build_object('success', true, 'new_count', used_count) INTO v_result;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'exhausted');
  END IF;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECURITY PATCH: RPC auth checks + RLS hardening
-- Date: 2026-05-27
--
-- Fixes:
--   1. CRITICAL: Drop generic increment_field() function
--   2. HIGH: Add auth checks to all SECURITY DEFINER RPC functions
--   3. HIGH: Replace overly permissive subscribers anon UPDATE policy
--   4. HIGH: Restrict coupons SELECT to authenticated users
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CRITICAL: Drop increment_field()
--    This generic SECURITY DEFINER function allows ANY anonymous
--    user to increment ANY column on ANY table in the public
--    schema. The app uses adminClient (service_role) for these
--    calls, but the function is still exposed via PostgREST to
--    the anon key. Drop it entirely.
--    App code in automation-processor.ts should migrate to a
--    specific increment_automation_completed_count() RPC or use
--    a direct UPDATE via adminClient.
-- ============================================================

DROP FUNCTION IF EXISTS public.increment_field(text, uuid, text, int);


-- ============================================================
-- 2. HIGH: Add auth checks to SECURITY DEFINER RPC functions
--
--    Functions that stay anon-accessible (no changes needed):
--      - increment_blog_views(blog_post_id UUID)
--      - increment_unsubscribe_count(campaign_id_param UUID)
--      - increment_affiliate_clicks(p_affiliate_id UUID)
--
--    Functions that require authenticated user:
--      - increment_likes_count(p_post_id UUID)
--      - decrement_likes_count(p_post_id UUID)
--      - increment_comments_count(post_id UUID)
--      - decrement_comments_count(post_id UUID)
--      - claim_coupon(p_coupon_id UUID, p_user_id UUID)
--
--    Functions that require staff (admin/manager):
--      - increment_campaign_sent_count(cid UUID)
--      - increment_affiliate_stats(p_affiliate_id UUID, p_earned_amount bigint)
--      - increment_affiliate_total_paid(p_affiliate_id UUID, p_paid_amount bigint)
--      - update_tag_subscriber_counts()
-- ============================================================


-- ─── 2a. increment_likes_count — require authenticated user ─────

CREATE OR REPLACE FUNCTION increment_likes_count(p_post_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE posts
  SET likes_count = COALESCE(likes_count, 0) + 1
  WHERE id = p_post_id
  RETURNING likes_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;


-- ─── 2b. decrement_likes_count — require authenticated user ─────

CREATE OR REPLACE FUNCTION decrement_likes_count(p_post_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE posts
  SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
  WHERE id = p_post_id
  RETURNING likes_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;


-- ─── 2c. increment_comments_count — require authenticated user ──

CREATE OR REPLACE FUNCTION increment_comments_count(post_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE posts
  SET comments_count = COALESCE(comments_count, 0) + 1
  WHERE id = post_id
  RETURNING comments_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;


-- ─── 2d. decrement_comments_count — require authenticated user ──

CREATE OR REPLACE FUNCTION decrement_comments_count(post_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE posts
  SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0)
  WHERE id = post_id
  RETURNING comments_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;


-- ─── 2e. increment_campaign_sent_count — require staff ──────────

CREATE OR REPLACE FUNCTION increment_campaign_sent_count(cid UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE email_campaigns
  SET sent_count = COALESCE(sent_count, 0) + 1
  WHERE id = cid
  RETURNING sent_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;


-- ─── 2f. increment_affiliate_stats — require staff ──────────────
--    Original was LANGUAGE sql; must DROP first to change to plpgsql.

DROP FUNCTION IF EXISTS increment_affiliate_stats(uuid, bigint);

CREATE OR REPLACE FUNCTION increment_affiliate_stats(p_affiliate_id uuid, p_earned_amount bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE affiliates
  SET total_earned = total_earned + p_earned_amount,
      total_conversions = total_conversions + 1,
      updated_at = now()
  WHERE id = p_affiliate_id;
END;
$$;


-- ─── 2g. increment_affiliate_total_paid — require staff ─────────
--    Original was LANGUAGE sql; must DROP first to change to plpgsql.

DROP FUNCTION IF EXISTS increment_affiliate_total_paid(uuid, bigint);

CREATE OR REPLACE FUNCTION increment_affiliate_total_paid(p_affiliate_id uuid, p_paid_amount bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE affiliates
  SET total_paid = COALESCE(total_paid, 0) + p_paid_amount,
      updated_at = now()
  WHERE id = p_affiliate_id;
END;
$$;


-- ─── 2h. claim_coupon — require auth.uid() = p_user_id ─────────

CREATE OR REPLACE FUNCTION claim_coupon(p_coupon_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_used boolean;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden: can only claim coupons for yourself';
  END IF;

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
$$;


-- ─── 2i. update_tag_subscriber_counts — require staff ───────────
--    Note: The original function takes no parameters. We preserve
--    that signature to avoid breaking existing app code that calls
--    admin.rpc("update_tag_subscriber_counts") without arguments.

CREATE OR REPLACE FUNCTION update_tag_subscriber_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE email_tags t
  SET subscriber_count = (
    SELECT count(*)
    FROM subscribers s
    WHERE s.status = 'active'
      AND s.tags @> array[t.name]
  ),
  updated_at = now();
END;
$$;


-- ============================================================
-- 3. HIGH: Fix subscribers anon UPDATE policy
--    The current "subscribers_anon_unsubscribe" policy uses
--    USING(true) which allows anon to UPDATE ANY subscriber row
--    (as long as the new status = 'unsubscribed'). This means
--    an attacker who can guess/enumerate subscriber UUIDs can
--    mass-unsubscribe everyone.
--
--    Fix: Drop the permissive policy and replace with a
--    SECURITY DEFINER function that only unsubscribes by email.
--    The anon role must know the subscriber's email address
--    (not just a guessable UUID) to unsubscribe.
-- ============================================================

DROP POLICY IF EXISTS "subscribers_anon_unsubscribe" ON public.subscribers;

CREATE OR REPLACE FUNCTION public.unsubscribe_by_email(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE subscribers
  SET status = 'unsubscribed', updated_at = now()
  WHERE lower(email) = lower(p_email);
END;
$$;


-- ============================================================
-- 4. HIGH: Restrict coupons SELECT to authenticated users
--    Currently the "Public can view coupons" policy allows anon
--    to enumerate all coupon codes. Replace with authenticated-
--    only access. Staff already have full access via
--    "Admin manage coupons".
-- ============================================================

DROP POLICY IF EXISTS "Public can view coupons" ON coupons;

CREATE POLICY "Authenticated can view coupons" ON coupons
  FOR SELECT
  TO authenticated
  USING (true);


COMMIT;

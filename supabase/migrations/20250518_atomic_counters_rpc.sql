-- Atomic increment/decrement functions for comments_count, blog views, and
-- email-campaign unsubscribe_count.
-- Prevents race conditions caused by non-atomic read-then-write patterns.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Comments count on posts
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_comments_count(post_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE posts
  SET comments_count = COALESCE(comments_count, 0) + 1
  WHERE id = post_id
  RETURNING comments_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION decrement_comments_count(post_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE posts
  SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0)
  WHERE id = post_id
  RETURNING comments_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Blog post views
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_blog_views(blog_post_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_views INT;
BEGIN
  UPDATE blog_posts
  SET views = COALESCE(views, 0) + 1
  WHERE id = blog_post_id
  RETURNING views INTO new_views;

  RETURN COALESCE(new_views, 0);
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Email-campaign unsubscribe count
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_unsubscribe_count(campaign_id_param UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE email_campaigns
  SET unsubscribe_count = COALESCE(unsubscribe_count, 0) + 1
  WHERE id = campaign_id_param
  RETURNING unsubscribe_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

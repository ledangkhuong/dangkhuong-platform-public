-- Atomic increment/decrement functions for post likes_count
-- Prevents race conditions when multiple users like/unlike simultaneously

CREATE OR REPLACE FUNCTION increment_likes_count(p_post_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE posts
  SET likes_count = COALESCE(likes_count, 0) + 1
  WHERE id = p_post_id
  RETURNING likes_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION decrement_likes_count(p_post_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE posts
  SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
  WHERE id = p_post_id
  RETURNING likes_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

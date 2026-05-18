-- ═══════════════════════════════════════════════════════════════
-- INDEXES & TRIGGERS — dangkhuong.com
-- Adds missing FK indexes, updated_at trigger function,
-- and affiliate conversion trigger.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. MISSING FK INDEXES (query performance) ─────────────────

CREATE INDEX IF NOT EXISTS idx_chapters_product_id       ON public.chapters(product_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id         ON public.lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_lessons_product_id         ON public.lessons(product_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id  ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_product_id ON public.lesson_progress(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id             ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id          ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id              ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id           ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id           ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_id          ON public.xp_events(user_id);

-- ─── 2. UPDATED_AT TRIGGER FUNCTION ────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 3. ATTACH UPDATED_AT TRIGGERS ─────────────────────────────
-- Tables with updated_at column but no existing trigger:
--   profiles, lesson_progress, orders, posts, affiliates, affiliate_settings

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.lesson_progress;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.orders;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.posts;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.affiliates;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.affiliate_settings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.affiliate_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ─── 4. AFFILIATE CONVERSION TRIGGER ───────────────────────────
-- Auto-increment total_earned and total_conversions on new conversion.
-- NOTE: migration_affiliate.sql has a more comprehensive trigger
-- (on_affiliate_conversion_change) that recalculates from scratch on
-- INSERT OR UPDATE. This simpler increment trigger fires on INSERT only.
-- If both are active, the recount trigger takes precedence. Consider
-- dropping on_affiliate_conversion_change if you prefer the faster
-- increment approach below.

CREATE OR REPLACE FUNCTION public.handle_affiliate_conversion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.affiliates
  SET total_earned       = total_earned + NEW.commission_amount,
      total_conversions  = total_conversions + 1
  WHERE id = NEW.affiliate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_affiliate_conversion_insert ON public.affiliate_conversions;
CREATE TRIGGER on_affiliate_conversion_insert
  AFTER INSERT ON public.affiliate_conversions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_affiliate_conversion();

COMMIT;

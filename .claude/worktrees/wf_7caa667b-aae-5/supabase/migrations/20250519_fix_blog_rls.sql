-- ============================================================
-- FIX: blog_posts — replace overly permissive public SELECT policy
--
-- The existing "blog_posts_select_public" policy uses USING(true),
-- which exposes DRAFT blog posts to anonymous and authenticated
-- users. This migration:
--   1. Drops the dangerous USING(true) policy
--   2. Creates a public SELECT policy restricted to published posts
--   3. Creates a staff SELECT policy so admin/manager/marketing
--      can still see all posts (including drafts)
--
-- Depends on: public.is_staff() from 20250518_fix_rls_policies.sql
-- ============================================================

BEGIN;

-- 1. Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "blog_posts_select_public" ON public.blog_posts;

-- 2. Public SELECT — only published posts visible to everyone (anon + authenticated)
CREATE POLICY "blog_posts_select_published" ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

-- 3. Staff SELECT — admin/manager/marketing can see ALL posts (including drafts)
CREATE POLICY "blog_posts_select_staff" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (public.is_staff());

COMMIT;

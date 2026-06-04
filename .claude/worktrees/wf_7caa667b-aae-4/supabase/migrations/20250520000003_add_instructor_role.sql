-- Migration: Add 'instructor' to profiles.role CHECK constraint
-- and add coupon_code column to orders table
-- Created: 2025-05-20

-- ─── 1. Fix profiles.role CHECK to include 'instructor' ─────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'admin', 'manager', 'marketing', 'sale', 'support', 'instructor'));

-- ─── 2. Add coupon_code column to orders ────────────────────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;

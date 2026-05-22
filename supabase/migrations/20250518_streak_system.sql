-- Add last_active_date column to profiles for streak tracking
-- streak (integer) already exists in schema.sql

alter table public.profiles
  add column if not exists last_active_date date;

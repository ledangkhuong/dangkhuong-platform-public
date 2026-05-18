-- Ensure users can update their own profile fields (needed for streak)
DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN
  NULL; -- policy already exists, ignore
END $$;

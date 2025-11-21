-- Fix Row Level Security policies for donations table
-- Run this SQL script in your InsForge database console

-- Add INSERT policy for users to create their own donations
DROP POLICY IF EXISTS "Users create own donations" ON public.donations;
CREATE POLICY "Users create own donations" ON public.donations
  FOR INSERT 
  WITH CHECK (user_id = public.get_current_user_id() OR user_id IS NULL);

-- Add UPDATE policy for users to update their own donations (if needed)
DROP POLICY IF EXISTS "Users update own donations" ON public.donations;
CREATE POLICY "Users update own donations" ON public.donations
  FOR UPDATE 
  USING (user_id = public.get_current_user_id() OR user_id IS NULL)
  WITH CHECK (user_id = public.get_current_user_id() OR user_id IS NULL);

-- Note: The existing SELECT and admin policies should remain as they are


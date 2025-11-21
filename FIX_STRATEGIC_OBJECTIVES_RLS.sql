-- Fix RLS policies for strategic_objectives table
-- This allows admins to insert, update, and delete strategic objectives
-- 
-- IMPORTANT: Run this script in your InsForge SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read objectives" ON public.strategic_objectives;
DROP POLICY IF EXISTS "Admins manage objectives" ON public.strategic_objectives;

-- Public can read all objectives
CREATE POLICY "Public can read objectives" ON public.strategic_objectives
  FOR SELECT USING (true);

-- Admins can insert, update, and delete objectives
-- This policy checks if the current user has admin or super_admin role
CREATE POLICY "Admins manage objectives" ON public.strategic_objectives
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Also fix related tables: past_work, upcoming_work, objective_gallery

-- Past work policies
DROP POLICY IF EXISTS "Public can read past work" ON public.past_work;
DROP POLICY IF EXISTS "Admins manage past work" ON public.past_work;

CREATE POLICY "Public can read past work" ON public.past_work
  FOR SELECT USING (true);

CREATE POLICY "Admins manage past work" ON public.past_work
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Upcoming work policies
DROP POLICY IF EXISTS "Public can read upcoming work" ON public.upcoming_work;
DROP POLICY IF EXISTS "Admins manage upcoming work" ON public.upcoming_work;

CREATE POLICY "Public can read upcoming work" ON public.upcoming_work
  FOR SELECT USING (true);

CREATE POLICY "Admins manage upcoming work" ON public.upcoming_work
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Objective gallery policies
DROP POLICY IF EXISTS "Public can read objective gallery" ON public.objective_gallery;
DROP POLICY IF EXISTS "Admins manage objective gallery" ON public.objective_gallery;

CREATE POLICY "Public can read objective gallery" ON public.objective_gallery
  FOR SELECT USING (true);

CREATE POLICY "Admins manage objective gallery" ON public.objective_gallery
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );


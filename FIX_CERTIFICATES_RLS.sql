-- Fix RLS policies for certificates table
-- The issue is that FOR ALL policies need both USING and WITH CHECK clauses for INSERT operations

-- Drop existing policies
DROP POLICY IF EXISTS "Users see own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admins manage all certificates" ON public.certificates;

-- Users can view their own certificates
CREATE POLICY "Users see own certificates"
  ON public.certificates
  FOR SELECT
  USING (user_id = public.get_current_user_id());

-- Admins can SELECT all certificates
CREATE POLICY "Admins see all certificates"
  ON public.certificates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can INSERT certificates
CREATE POLICY "Admins insert certificates"
  ON public.certificates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can UPDATE all certificates
CREATE POLICY "Admins update all certificates"
  ON public.certificates
  FOR UPDATE
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

-- Admins can DELETE all certificates
CREATE POLICY "Admins delete all certificates"
  ON public.certificates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = public.get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );


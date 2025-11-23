-- Fix RLS policies for prayer_requests to allow admins to see all requests
-- This ensures the admin policy uses the same function as other tables
-- NOTE: This script assumes the prayer_requests table already exists
-- If you get "relation does not exist" error, run CREATE_PRAYER_REQUESTS_TABLE.sql first

-- Drop existing policies
DROP POLICY IF EXISTS "Public can read public prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Users see own prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Users create own prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Admins manage prayer requests" ON public.prayer_requests;

-- Public can read public active prayer requests
CREATE POLICY "Public can read public prayer requests"
  ON public.prayer_requests
  FOR SELECT
  USING (is_public = true AND status = 'active');

-- Users can see their own prayer requests (any status)
CREATE POLICY "Users see own prayer requests"
  ON public.prayer_requests
  FOR SELECT
  USING (user_id = public.get_current_user_id() OR user_id IS NULL);

-- Users can create their own prayer requests
CREATE POLICY "Users create own prayer requests"
  ON public.prayer_requests
  FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id() OR user_id IS NULL);

-- Admins can see and manage all prayer requests (using the same admin check function)
CREATE POLICY "Admins manage prayer requests"
  ON public.prayer_requests
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());


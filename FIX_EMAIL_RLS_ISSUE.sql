-- Fix RLS to ensure email column is accessible to admins
-- This ensures the admin policy explicitly allows email access

-- First, verify the admin policy exists and is correct
-- The policy should already be set up, but let's make sure it's working

-- If emails are showing as null but exist in database, RLS might be filtering them
-- Try this: Re-apply the admin policy to ensure it's working correctly

-- Drop and recreate the admin policy to ensure it's correct
DROP POLICY IF EXISTS "Admins see all users" ON public.users;

CREATE POLICY "Admins see all users"
  ON public.users
  FOR SELECT
  USING (public.is_current_user_admin());

-- Also ensure admins can update emails
DROP POLICY IF EXISTS "Admins update all users" ON public.users;

CREATE POLICY "Admins update all users"
  ON public.users
  FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Verify the function exists and works
-- This function should return true for admin users
SELECT public.is_current_user_admin() as is_admin_check;


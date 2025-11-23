-- Fix RLS policies for user_profiles and users tables
-- This ensures admins can see and manage all user information
-- IMPORTANT: Run this in your InsForge SQL Editor

-- =====================================================
-- CREATE HELPER FUNCTION FOR ADMIN CHECK (BYPASSES RLS)
-- =====================================================

-- Create a function that checks if current user is admin
-- This function uses SECURITY DEFINER to bypass RLS for the check
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE user_id = public.get_current_user_id()
  LIMIT 1;
  
  RETURN user_role IN ('admin', 'super_admin');
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- =====================================================
-- FIX USER_PROFILES RLS POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users see own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins see all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins insert all profiles" ON public.user_profiles;

-- Users can see their own profile (MUST BE FIRST to avoid circular dependency)
CREATE POLICY "Users see own profile"
  ON public.user_profiles
  FOR SELECT
  USING (user_id = public.get_current_user_id());

-- Users can insert their own profile
CREATE POLICY "Users insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

-- Users can update their own profile
CREATE POLICY "Users update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- Admins can see ALL profiles (uses helper function to avoid circular dependency)
CREATE POLICY "Admins see all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (public.is_current_user_admin());

-- Admins can update ALL profiles
CREATE POLICY "Admins update all profiles"
  ON public.user_profiles
  FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Admins can insert profiles (for creating profiles for users)
CREATE POLICY "Admins insert all profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (public.is_current_user_admin());

-- =====================================================
-- FIX USERS TABLE RLS POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users see own data" ON public.users;
DROP POLICY IF EXISTS "Users update own data" ON public.users;
DROP POLICY IF EXISTS "Admins see all users" ON public.users;
DROP POLICY IF EXISTS "Admins update all users" ON public.users;
DROP POLICY IF EXISTS "Admins insert all users" ON public.users;

-- Users can see their own data
CREATE POLICY "Users see own data"
  ON public.users
  FOR SELECT
  USING (id = public.get_current_user_id());

-- Users can update their own data
CREATE POLICY "Users update own data"
  ON public.users
  FOR UPDATE
  USING (id = public.get_current_user_id())
  WITH CHECK (id = public.get_current_user_id());

-- Admins can see ALL users
CREATE POLICY "Admins see all users"
  ON public.users
  FOR SELECT
  USING (public.is_current_user_admin());

-- Admins can update ALL users
CREATE POLICY "Admins update all users"
  ON public.users
  FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Admins can insert users (for creating user records)
CREATE POLICY "Admins insert all users"
  ON public.users
  FOR INSERT
  WITH CHECK (public.is_current_user_admin());

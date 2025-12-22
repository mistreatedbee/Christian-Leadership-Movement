-- =====================================================
-- FIX EMAIL VISIBILITY FOR ADMINS
-- =====================================================
-- This script ensures admins can see all user emails in the users table

-- First, ensure the email column exists in users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Drop existing RLS policies that might be blocking email access
DROP POLICY IF EXISTS "Users can view their own email" ON public.users;
DROP POLICY IF EXISTS "Admins can view all emails" ON public.users;
DROP POLICY IF EXISTS "Public can view users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Create comprehensive RLS policies for users table
-- Policy 1: Admins can see ALL columns including email for ALL users
DROP POLICY IF EXISTS "Admins can view all user data including email" ON public.users;
CREATE POLICY "Admins can view all user data including email"
  ON public.users
  FOR SELECT
  USING (public.is_current_user_admin());

-- Policy 2: Users can view their own data (including their own email)
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 3: Admins can update any user
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
CREATE POLICY "Admins can update any user"
  ON public.users
  FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Policy 4: Users can update their own profile (but not email directly - email comes from auth)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 5: Admins can insert users
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (public.is_current_user_admin());

-- Policy 6: Admins can delete users
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  USING (public.is_current_user_admin());

-- Add comment for documentation
COMMENT ON COLUMN public.users.email IS 'User email address. Visible to admins and the user themselves.';

-- =====================================================
-- Also ensure user_profiles.email is visible to admins
-- =====================================================

-- Ensure email column exists in user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Drop existing policies that might block email access
DROP POLICY IF EXISTS "Admins can view all profile emails" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile email" ON public.user_profiles;

-- Policy for admins to see all profile emails
DROP POLICY IF EXISTS "Admins can view all profile emails" ON public.user_profiles;
CREATE POLICY "Admins can view all profile emails"
  ON public.user_profiles
  FOR SELECT
  USING (public.is_current_user_admin());

-- Policy for users to see their own profile email
DROP POLICY IF EXISTS "Users can view their own profile email" ON public.user_profiles;
CREATE POLICY "Users can view their own profile email"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON COLUMN public.user_profiles.email IS 'User email from profile. Visible to admins and the user themselves.';


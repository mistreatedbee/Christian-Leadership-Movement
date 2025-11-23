-- =====================================================
-- VERIFY EMAIL VISIBILITY FOR ADMINS
-- =====================================================
-- This script verifies that admins can see emails in the users table
-- Run this to check if RLS policies are working correctly

-- Check if email column exists in users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'email';

-- Check RLS policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;

-- Test query: Try to select email for a specific user (replace with actual user ID)
-- SELECT id, email, nickname FROM public.users LIMIT 5;

-- Verify admin function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'is_current_user_admin';


-- Verify RLS policies for email column access
-- Run this in InsForge SQL Editor to check if RLS is blocking email

-- Check if email column exists in users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'email';

-- Check current RLS policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;

-- Test query to see if admin can see email (replace with your admin user_id)
-- This will show what columns are actually returned
SELECT id, email, nickname, name, created_at
FROM public.users
WHERE id = 'YOUR_ADMIN_USER_ID_HERE'
LIMIT 1;

-- Check if is_current_user_admin function exists and works
SELECT public.is_current_user_admin() as is_admin;


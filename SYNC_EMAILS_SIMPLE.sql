-- Simple email sync script for InsForge
-- This version uses only allowed operations
-- Run this in your InsForge SQL Editor

-- =====================================================
-- STEP 1: Check if email column exists in applications
-- If it doesn't exist, you'll need to add it manually via InsForge Dashboard
-- Go to: Database > Tables > applications > Add Column
-- Column name: email, Type: TEXT, Nullable: YES
-- =====================================================

-- =====================================================
-- STEP 2: Simple UPDATE query to sync emails
-- Run this query to sync emails from applications to users
-- =====================================================

UPDATE public.users u
SET email = app.email
FROM (
  SELECT DISTINCT ON (user_id) user_id, email
  FROM public.applications
  WHERE email IS NOT NULL 
    AND email != ''
    AND user_id IS NOT NULL
  ORDER BY user_id, created_at DESC
) app
WHERE u.id = app.user_id
  AND (u.email IS NULL OR u.email = '');

-- =====================================================
-- STEP 3: Verify the sync worked
-- =====================================================

-- Check how many users now have emails
SELECT 
  COUNT(*) as total_users,
  COUNT(email) as users_with_email,
  COUNT(*) - COUNT(email) as users_without_email
FROM public.users;

-- Show users who got emails synced
SELECT 
  u.id,
  u.nickname,
  u.email,
  'Synced from applications' as source
FROM public.users u
WHERE u.email IS NOT NULL
ORDER BY u.updated_at DESC
LIMIT 20;


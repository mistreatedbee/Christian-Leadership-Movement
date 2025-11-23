-- =====================================================
-- SYNC EMAILS FROM USERS TABLE TO USER_PROFILES
-- =====================================================
-- This script syncs emails from the users table to user_profiles table
-- for all existing users who have emails in users table but null in user_profiles

-- Update user_profiles.email from users.email where user_profiles.email is null
UPDATE public.user_profiles
SET email = users.email
FROM public.users
WHERE user_profiles.user_id = users.id
  AND users.email IS NOT NULL
  AND (user_profiles.email IS NULL OR user_profiles.email = '');

-- Add comment
COMMENT ON COLUMN public.user_profiles.email IS 'User email address synced from users table. Visible to admins and the user themselves.';


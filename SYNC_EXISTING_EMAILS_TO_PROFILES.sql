-- Sync existing emails to user_profiles table
-- This script helps populate emails in user_profiles for existing users
-- Run this AFTER running ADD_EMAIL_TO_USER_PROFILES.sql

-- Since users.email column doesn't exist, we need to manually update user_profiles
-- You can update emails manually in the InsForge dashboard, or use this template:

-- Example: Update email for a specific user
-- UPDATE public.user_profiles
-- SET email = 'user@example.com'
-- WHERE user_id = 'USER_ID_HERE';

-- Or update multiple users at once (replace with actual emails from your records):
-- UPDATE public.user_profiles up
-- SET email = 'email1@example.com'
-- WHERE up.user_id = 'USER_ID_1';

-- UPDATE public.user_profiles up
-- SET email = 'email2@example.com'
-- WHERE up.user_id = 'USER_ID_2';

-- Note: If you have emails stored elsewhere (like in applications form_data),
-- you can extract them and update user_profiles manually through the InsForge dashboard

-- Check which users are missing emails:
-- SELECT up.user_id, up.email, u.nickname
-- FROM public.user_profiles up
-- JOIN public.users u ON up.user_id = u.id
-- WHERE up.email IS NULL;


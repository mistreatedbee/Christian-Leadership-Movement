-- Make kennymokgope@gmail.com an admin
-- Run this script in your InsForge SQL Editor
--
-- METHOD 1: Find User ID First (Recommended)
-- Step 1: Run this query to list all users and find the user ID:
SELECT 
  u.id as user_id,
  u.nickname,
  up.role as current_role
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
ORDER BY u.created_at DESC;

-- Step 2: Once you find the user ID, use METHOD 2 below with that ID

-- ============================================
-- METHOD 2: Direct Update by User ID
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from Step 1
-- ============================================

-- Option A: Update existing profile
UPDATE public.user_profiles 
SET role = 'admin', updated_at = now()
WHERE user_id = 'YOUR_USER_ID_HERE';

-- Option B: Insert if profile doesn't exist (run this if Option A affects 0 rows)
INSERT INTO public.user_profiles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'admin')
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',
  updated_at = now();

-- Verify the update
SELECT 
  u.id,
  u.nickname,
  up.role,
  up.created_at as profile_created,
  up.updated_at as profile_updated
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE u.id = 'YOUR_USER_ID_HERE';


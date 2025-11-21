-- Make kennymokgope@gmail.com an admin
-- 
-- INSTRUCTIONS:
-- 1. Go to InsForge Dashboard → Users section
-- 2. Find the user with email: kennymokgope@gmail.com
-- 3. Copy their User ID (UUID)
-- 4. Replace 'YOUR_USER_ID_HERE' below with that UUID
-- 5. Run this script

-- Update or create user_profiles with admin role
UPDATE public.user_profiles 
SET role = 'admin', updated_at = now()
WHERE user_id = 'YOUR_USER_ID_HERE';

-- If the user_profiles record doesn't exist yet, use this instead:
-- INSERT INTO public.user_profiles (user_id, role)
-- VALUES ('YOUR_USER_ID_HERE', 'admin')
-- ON CONFLICT (user_id) 
-- DO UPDATE SET 
--   role = 'admin',
--   updated_at = now();

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


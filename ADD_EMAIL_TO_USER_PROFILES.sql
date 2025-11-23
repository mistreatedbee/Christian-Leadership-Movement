-- Add email column to user_profiles table
-- This will allow admins to see emails using the same RLS logic that works for other fields

-- Add email column to user_profiles (if it doesn't exist)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Update existing user_profiles with emails from users table
-- This syncs emails that already exist in users table to user_profiles
UPDATE public.user_profiles up
SET email = u.email
FROM public.users u
WHERE up.user_id = u.id 
  AND u.email IS NOT NULL 
  AND up.email IS NULL;

-- The RLS policies for user_profiles already allow admins to see all fields
-- So email will automatically be accessible to admins once it's in user_profiles


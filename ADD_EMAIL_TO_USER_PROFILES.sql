-- Add email column to user_profiles table
-- This will allow admins to see emails using the same RLS logic that works for other fields

-- Add email column to user_profiles (if it doesn't exist)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Note: We don't sync from users table because the email column doesn't exist there
-- New registrations will automatically save email to user_profiles
-- For existing users, you can manually update their emails in the InsForge dashboard

-- The RLS policies for user_profiles already allow admins to see all fields
-- So email will automatically be accessible to admins once it's in user_profiles


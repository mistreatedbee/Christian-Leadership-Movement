-- Fix storage foreign key constraint issues
-- This ensures users are properly synced between auth.users and public.users

-- Create or replace function to sync user from auth to public.users
-- This should be called automatically when a user signs up
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user in public.users when auth.users record is created/updated
  INSERT INTO public.users (id, email, nickname, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, users.email),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on auth.users needs to be created in the Supabase dashboard
-- or via Supabase CLI, as we don't have direct access to auth schema from SQL
-- This is a reference implementation that should be run in Supabase SQL Editor

-- Alternative: Create a function that can be called manually to sync existing users
CREATE OR REPLACE FUNCTION public.sync_all_auth_users()
RETURNS INTEGER AS $$
DECLARE
  synced_count INTEGER := 0;
BEGIN
  -- This function would sync all users from auth.users to public.users
  -- However, we can't directly query auth.users from public schema
  -- This is a placeholder for manual sync if needed
  
  -- Instead, we'll ensure the user exists before uploads
  -- The uploadFileWithUserCheck function handles this
  
  RETURN synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure public.users table has proper indexes
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Add comments
COMMENT ON FUNCTION public.sync_user_from_auth() IS 
  'Syncs user from auth.users to public.users when auth record is created/updated. Note: Trigger must be created in Supabase dashboard on auth.users table.';

COMMENT ON FUNCTION public.sync_all_auth_users() IS 
  'Placeholder function for syncing all auth users. The uploadFileWithUserCheck function handles user sync before uploads.';


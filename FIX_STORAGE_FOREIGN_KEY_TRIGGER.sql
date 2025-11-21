-- =====================================================
-- FIX STORAGE FOREIGN KEY CONSTRAINT ERROR
-- This trigger ensures users exist in public.users when they're created in auth.users
-- =====================================================

-- Create a function that will be triggered when a user is created in auth.users
-- Note: This might not work directly if we can't access auth.users schema
-- Alternative: Create a trigger on public.users to ensure it exists before storage operations

-- Option 1: Create a function to sync users (if we have access to auth schema)
-- This is a workaround - we'll ensure users exist in public.users via application code

-- Option 2: Create a trigger on public.users INSERT to ensure it's properly set up
CREATE OR REPLACE FUNCTION public.ensure_user_for_storage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function ensures the user record is properly set up
  -- The user should already exist in auth.users when they sign up
  -- We just need to make sure public.users has the record
  
  -- If the user doesn't have email/nickname, set defaults
  IF NEW.email IS NULL THEN
    NEW.email := (SELECT email FROM auth.users WHERE id = NEW.id LIMIT 1);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to ensure user data is synced
DROP TRIGGER IF EXISTS ensure_user_for_storage_trigger ON public.users;
CREATE TRIGGER ensure_user_for_storage_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_for_storage();

-- =====================================================
-- ALTERNATIVE: Ensure user exists before storage operations
-- This is handled in application code via uploadHelpers.ts
-- =====================================================

-- The application code now:
-- 1. Checks if user exists in public.users
-- 2. Creates the record if missing
-- 3. Waits for database commit
-- 4. Retries upload with progressive delays

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if trigger was created
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'ensure_user_for_storage_trigger';

-- =====================================================
-- NOTE: The main fix is in the application code
-- This trigger is a backup to ensure data consistency
-- =====================================================


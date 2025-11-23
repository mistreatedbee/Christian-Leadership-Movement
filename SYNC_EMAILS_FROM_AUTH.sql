-- Sync emails from auth.users to public.users
-- This ensures all users have their email in the public.users table

-- Create a function to sync email from auth.users to public.users
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Update public.users with email from auth.users where email is missing
  UPDATE public.users u
  SET email = au.email
  FROM auth.users au
  WHERE u.id = au.id
    AND (u.email IS NULL OR u.email = '')
    AND au.email IS NOT NULL
    AND au.email != '';
  
  RAISE NOTICE 'Email sync completed';
END;
$$;

-- Run the sync function
SELECT public.sync_user_email();

-- Also create a trigger to automatically sync email when a user is created
CREATE OR REPLACE FUNCTION public.sync_email_on_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Try to get email from auth.users if not provided
  IF NEW.email IS NULL OR NEW.email = '' THEN
    SELECT email INTO NEW.email
    FROM auth.users
    WHERE id = NEW.id
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_email_on_user_insert_trigger ON public.users;
CREATE TRIGGER sync_email_on_user_insert_trigger
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_on_user_insert();

-- Also create a function that admins can call to manually sync emails
CREATE OR REPLACE FUNCTION public.admin_sync_all_emails()
RETURNS TABLE(updated_count INTEGER, user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update all users with missing emails
  UPDATE public.users u
  SET email = au.email
  FROM auth.users au
  WHERE u.id = au.id
    AND (u.email IS NULL OR u.email = '')
    AND au.email IS NOT NULL
    AND au.email != '';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Return updated records
  RETURN QUERY
  SELECT updated_count, u.id, u.email
  FROM public.users u
  WHERE u.email IS NOT NULL
  ORDER BY u.created_at DESC
  LIMIT 10;
END;
$$;

-- Grant execute permission to authenticated users (admins will use it)
GRANT EXECUTE ON FUNCTION public.sync_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sync_all_emails() TO authenticated;


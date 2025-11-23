-- Sync emails to public.users table
-- This script works with InsForge's auth system
-- First, ensure the applications table has an email column

-- =====================================================
-- STEP 1: Add email column to applications table if it doesn't exist
-- =====================================================

DO $$
BEGIN
  -- Check if email column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'applications' 
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column to applications table';
  ELSE
    RAISE NOTICE 'Email column already exists in applications table';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Sync emails from applications table
-- =====================================================

-- Create a function to sync emails from applications to users table
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update public.users with email from applications where email is missing
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
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Synced % emails from applications', updated_count;
END;
$$;

-- =====================================================
-- STEP 3: Admin function to sync all emails
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_sync_all_emails()
RETURNS TABLE(updated_count INTEGER, synced_users JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER := 0;
  synced_data JSONB;
BEGIN
  -- Sync emails from applications
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
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Return summary of synced users
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'email', email,
      'nickname', nickname
    )
  ) INTO synced_data
  FROM public.users
  WHERE email IS NOT NULL
  ORDER BY updated_at DESC
  LIMIT 20;
  
  RETURN QUERY SELECT updated_count, synced_data;
END;
$$;

-- =====================================================
-- STEP 4: Trigger to auto-sync email on user insert
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_email_on_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If email is not provided, try to get it from applications
  IF NEW.email IS NULL OR NEW.email = '' THEN
    SELECT email INTO NEW.email
    FROM public.applications
    WHERE user_id = NEW.id
      AND email IS NOT NULL
      AND email != ''
    ORDER BY created_at DESC
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

-- =====================================================
-- STEP 5: Function to get email for a specific user
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_email(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- First check users table
  SELECT email INTO user_email
  FROM public.users
  WHERE id = user_uuid;
  
  -- If not found, check applications
  IF user_email IS NULL OR user_email = '' THEN
    SELECT email INTO user_email
    FROM public.applications
    WHERE user_id = user_uuid
      AND email IS NOT NULL
      AND email != ''
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If found in applications, update users table
    IF user_email IS NOT NULL THEN
      UPDATE public.users
      SET email = user_email
      WHERE id = user_uuid;
    END IF;
  END IF;
  
  RETURN user_email;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.sync_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sync_all_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email(UUID) TO authenticated;

-- Run initial sync
SELECT public.sync_user_email();

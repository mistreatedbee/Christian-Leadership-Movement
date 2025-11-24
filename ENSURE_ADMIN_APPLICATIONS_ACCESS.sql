-- ENSURE ADMIN ACCESS TO APPLICATIONS TABLE
-- This migration ensures admins can read all applications regardless of RLS policies

-- First, check if RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'applications'
  ) THEN
    -- Enable RLS if not already enabled
    ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies that might be blocking admin access
    DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
    DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
    DROP POLICY IF EXISTS "Admins can manage all applications" ON public.applications;
    
    -- Create comprehensive policies for applications table
    
    -- Policy 1: Admins can view ALL applications
    CREATE POLICY "Admins can view all applications"
      ON public.applications
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_profiles.user_id = auth.uid()
          AND user_profiles.role IN ('admin', 'super_admin')
        )
      );
    
    -- Policy 2: Users can view their own applications
    CREATE POLICY "Users can view their own applications"
      ON public.applications
      FOR SELECT
      USING (user_id = auth.uid());
    
    -- Policy 3: Admins can insert applications (for testing/manual entry)
    CREATE POLICY "Admins can insert applications"
      ON public.applications
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_profiles.user_id = auth.uid()
          AND user_profiles.role IN ('admin', 'super_admin')
        )
      );
    
    -- Policy 4: Users can insert their own applications
    CREATE POLICY "Users can insert their own applications"
      ON public.applications
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
    
    -- Policy 5: Admins can update all applications
    CREATE POLICY "Admins can update all applications"
      ON public.applications
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_profiles.user_id = auth.uid()
          AND user_profiles.role IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_profiles.user_id = auth.uid()
          AND user_profiles.role IN ('admin', 'super_admin')
        )
      );
    
    -- Policy 6: Users can update their own applications (only if pending)
    CREATE POLICY "Users can update pending applications"
      ON public.applications
      FOR UPDATE
      USING (
        user_id = auth.uid() 
        AND status = 'pending'
      )
      WITH CHECK (
        user_id = auth.uid() 
        AND status = 'pending'
      );
    
    -- Policy 7: Admins can delete applications
    CREATE POLICY "Admins can delete applications"
      ON public.applications
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_profiles.user_id = auth.uid()
          AND user_profiles.role IN ('admin', 'super_admin')
        )
      );
    
    RAISE NOTICE 'RLS policies created successfully for applications table';
  ELSE
    RAISE NOTICE 'Applications table does not exist';
  END IF;
END $$;

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'applications'
ORDER BY policyname;


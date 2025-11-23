-- =====================================================
-- ENSURE APPLICATIONS TABLE HAS form_data COLUMN
-- =====================================================
-- This script ensures the applications table has a form_data JSONB column
-- to store ALL form fields for complete data preservation

-- Add form_data JSONB column if it doesn't exist
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS form_data JSONB;

-- Create index for form_data queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_applications_form_data ON public.applications USING GIN (form_data);

-- Add comment for documentation
COMMENT ON COLUMN public.applications.form_data IS 'Complete form data in JSONB format. Contains ALL fields submitted in the application form, ensuring no data is lost. Used for admin viewing and PDF export.';

-- Ensure RLS policies allow admins to read form_data
-- (This should already be covered by existing admin policies, but we verify)

-- Note: The existing RLS policies should already allow admins to see all columns including form_data
-- If you need to verify, check that there's a policy like:
-- "Admins can view all applications" with FOR SELECT and USING (public.is_current_user_admin())


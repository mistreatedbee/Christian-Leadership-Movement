-- =====================================================
-- VERIFY EMAIL VISIBILITY FOR ADMINS (SIMPLIFIED)
-- =====================================================
-- This script verifies that admins can see emails in the users table
-- Run this to check if emails are accessible

-- Simple test query: Try to select email from users table
-- This should work if RLS policies are correctly set up
SELECT id, email, nickname 
FROM public.users 
LIMIT 5;


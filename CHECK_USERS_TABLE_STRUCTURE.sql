-- Check the structure of the users table
-- Run this to see what columns actually exist

-- Check if email column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Show sample data to see what's actually in the table
SELECT * FROM public.users LIMIT 5;


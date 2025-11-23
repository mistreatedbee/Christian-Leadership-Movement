-- Simple check to see if email column exists and has values
-- This uses only basic SELECT queries that should work in InsForge

-- Check if we can see email column (replace with a real user_id from your database)
SELECT id, email, nickname, name
FROM public.users
WHERE email IS NOT NULL
LIMIT 5;

-- Check a specific user (replace with a real user_id)
SELECT id, email, nickname
FROM public.users
WHERE id = '8a7ea135-728e-4893-8cdc-9c615fefb1e4';


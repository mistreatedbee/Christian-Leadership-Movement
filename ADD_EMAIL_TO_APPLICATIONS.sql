-- Add email column to applications table
-- Run this in your InsForge SQL Editor

-- Check if column exists and add it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'applications' 
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN email TEXT;
    RAISE NOTICE 'Email column added to applications table';
  ELSE
    RAISE NOTICE 'Email column already exists';
  END IF;
END $$;


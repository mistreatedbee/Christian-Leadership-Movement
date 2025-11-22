-- Fix mentors table to include pending and rejected statuses
-- Run this in your InsForge SQL Editor

-- First, drop the existing check constraint
ALTER TABLE public.mentors 
DROP CONSTRAINT IF EXISTS mentors_status_check;

-- Add the new check constraint with pending and rejected statuses
ALTER TABLE public.mentors 
ADD CONSTRAINT mentors_status_check 
CHECK (status IN ('pending', 'available', 'full', 'inactive', 'rejected'));

-- Update any existing mentors with invalid status to 'available'
UPDATE public.mentors 
SET status = 'available' 
WHERE status NOT IN ('pending', 'available', 'full', 'inactive', 'rejected');


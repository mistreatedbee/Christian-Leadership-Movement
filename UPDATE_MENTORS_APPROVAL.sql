-- Update mentors table to include 'pending' status for admin approval
ALTER TABLE public.mentors
DROP CONSTRAINT IF EXISTS mentors_status_check;

ALTER TABLE public.mentors
ADD CONSTRAINT mentors_status_check 
CHECK (status IN ('pending', 'available', 'full', 'inactive', 'rejected'));

-- Set default status to 'pending' for new mentor applications
ALTER TABLE public.mentors
ALTER COLUMN status SET DEFAULT 'pending';

-- Update existing mentors to 'available' if they don't have a status
UPDATE public.mentors
SET status = 'available'
WHERE status IS NULL OR status NOT IN ('pending', 'available', 'full', 'inactive', 'rejected');


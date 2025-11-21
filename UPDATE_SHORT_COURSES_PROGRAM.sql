-- =====================================================
-- UPDATE SHORT COURSES PROGRAM TO UNIVERSITY OF PRETORIA COURSES
-- =====================================================

-- Update the "Short Courses" program to reflect University of Pretoria partnership
UPDATE public.programs
SET 
  name = 'University of Pretoria Courses',
  description = 'Endorsed courses by Enterprises@UP and facilitated by the Centre for Faith and Community at the Faculty of Theology and Religion, University of Pretoria. These courses require CLM membership to access.',
  type = 'short_course'
WHERE type = 'short_course' OR name ILIKE '%short course%';

-- If no short_course program exists, create one
INSERT INTO public.programs (name, description, type)
SELECT 
  'University of Pretoria Courses',
  'Endorsed courses by Enterprises@UP and facilitated by the Centre for Faith and Community at the Faculty of Theology and Religion, University of Pretoria. These courses require CLM membership to access.',
  'short_course'
WHERE NOT EXISTS (
  SELECT 1 FROM public.programs WHERE type = 'short_course'
);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check updated program
SELECT id, name, description, type 
FROM public.programs 
WHERE type = 'short_course';

-- =====================================================
-- NOTE
-- =====================================================
-- The ProgramsPage will now show UP courses instead of the short_course program
-- Users need CLM membership to access these courses
-- =====================================================


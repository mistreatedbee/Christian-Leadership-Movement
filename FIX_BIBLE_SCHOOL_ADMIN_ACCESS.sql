-- =====================================================
-- ENSURE ADMINS HAVE FULL ACCESS TO BIBLE SCHOOL RESOURCES
-- =====================================================

-- Update RLS policies to ensure admins can see ALL resources (not just public ones)
DROP POLICY IF EXISTS "Public can read public resources" ON public.bible_school_resources;
CREATE POLICY "Public can read public resources"
  ON public.bible_school_resources
  FOR SELECT
  USING (is_public = true OR public.is_current_user_admin());

-- Ensure admins can see all studies, classes, and meetings regardless of status
DROP POLICY IF EXISTS "Public can read scheduled studies" ON public.bible_school_studies;
CREATE POLICY "Public can read scheduled studies"
  ON public.bible_school_studies
  FOR SELECT
  USING (status = 'scheduled' OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Public can read scheduled classes" ON public.bible_school_classes;
CREATE POLICY "Public can read scheduled classes"
  ON public.bible_school_classes
  FOR SELECT
  USING (status = 'scheduled' OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Public can read scheduled meetings" ON public.bible_school_meetings;
CREATE POLICY "Public can read scheduled meetings"
  ON public.bible_school_meetings
  FOR SELECT
  USING (status = 'scheduled' OR public.is_current_user_admin());

-- Ensure admins can see all participants
DROP POLICY IF EXISTS "Users see own participants" ON public.bible_school_participants;
CREATE POLICY "Users see own participants"
  ON public.bible_school_participants
  FOR SELECT
  USING (user_id = public.get_current_user_id() OR public.is_current_user_admin());


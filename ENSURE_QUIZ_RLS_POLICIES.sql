-- =====================================================
-- ENSURE QUIZ RLS POLICIES FOR ADMIN ACCESS
-- =====================================================

-- Ensure quizzes table has proper RLS policies
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can view quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Public can view active quizzes" ON public.quizzes;

-- Policy 1: Admins have full access to all quizzes
CREATE POLICY "Admins can manage quizzes"
  ON public.quizzes
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Policy 2: Authenticated users can view quizzes (for taking quizzes)
CREATE POLICY "Authenticated users can view quizzes"
  ON public.quizzes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Ensure quiz_questions table has proper RLS policies
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;

-- Policy 1: Admins have full access to all quiz questions
CREATE POLICY "Admins can manage quiz questions"
  ON public.quiz_questions
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Policy 2: Authenticated users can view quiz questions (for taking quizzes)
CREATE POLICY "Authenticated users can view quiz questions"
  ON public.quiz_questions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Ensure quiz_attempts table has proper RLS policies (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quiz_attempts') THEN
    ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Admins can manage quiz attempts" ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Users can view their own attempts" ON public.quiz_attempts;
    
    CREATE POLICY "Admins can manage quiz attempts"
      ON public.quiz_attempts
      FOR ALL
      USING (public.is_current_user_admin())
      WITH CHECK (public.is_current_user_admin());
    
    CREATE POLICY "Users can view their own attempts"
      ON public.quiz_attempts
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;


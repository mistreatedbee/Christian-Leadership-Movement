-- =====================================================
-- CREATE QUIZ TABLES FROM SCRATCH
-- =====================================================
-- This script creates all quiz-related tables if they don't exist

-- =====================================================
-- 1. QUIZZES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  bible_school_context TEXT,
  quiz_type TEXT DEFAULT 'course' CHECK (quiz_type IN ('course', 'program', 'bible_school', 'general')),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  time_limit INTEGER, -- in minutes
  passing_score INTEGER NOT NULL DEFAULT 70,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_program_id ON public.quizzes(program_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_type ON public.quizzes(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quizzes_bible_school_context ON public.quizzes(bible_school_context);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON public.quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_active ON public.quizzes(is_active);

-- Add comments
COMMENT ON TABLE public.quizzes IS 'Quizzes for courses, programs, Bible School, or general use';
COMMENT ON COLUMN public.quizzes.course_id IS 'Course this quiz belongs to (for course-based quizzes)';
COMMENT ON COLUMN public.quizzes.program_id IS 'Program this quiz belongs to (for program-based quizzes)';
COMMENT ON COLUMN public.quizzes.bible_school_context IS 'Bible School context (e.g., "study", "class", "meeting", "general")';
COMMENT ON COLUMN public.quizzes.quiz_type IS 'Type of quiz: course, program, bible_school, or general';

-- =====================================================
-- 2. QUIZ_QUESTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  options JSONB, -- For multiple choice: [{"text": "...", "correct": true/false}, ...]
  correct_answer TEXT, -- For true/false and short answer
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for quiz_questions
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order_index ON public.quiz_questions(quiz_id, order_index);

-- Add comments
COMMENT ON TABLE public.quiz_questions IS 'Questions for quizzes';
COMMENT ON COLUMN public.quiz_questions.options IS 'JSON array of options for multiple choice questions: [{"text": "Option 1", "correct": true}, ...]';
COMMENT ON COLUMN public.quiz_questions.correct_answer IS 'Correct answer for true/false and short answer questions';

-- =====================================================
-- 3. QUIZ_ATTEMPTS TABLE (Optional - for tracking attempts)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score INTEGER,
  percentage DECIMAL(5,2),
  passed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  time_taken INTEGER, -- in seconds
  answers JSONB, -- Store user's answers: {"question_id": "answer", ...}
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for quiz_attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON public.quiz_attempts(user_id, quiz_id);

-- Add comments
COMMENT ON TABLE public.quiz_attempts IS 'User attempts at taking quizzes';
COMMENT ON COLUMN public.quiz_attempts.answers IS 'JSON object storing user answers: {"question_id": "answer", ...}';

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS POLICIES FOR QUIZZES
-- =====================================================
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Authenticated users can view quizzes" ON public.quizzes;
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

-- =====================================================
-- 6. RLS POLICIES FOR QUIZ_QUESTIONS
-- =====================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can view quiz questions" ON public.quiz_questions;

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

-- =====================================================
-- 7. RLS POLICIES FOR QUIZ_ATTEMPTS
-- =====================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can create their own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can update their own attempts" ON public.quiz_attempts;

-- Policy 1: Admins have full access to all quiz attempts
CREATE POLICY "Admins can manage quiz attempts"
  ON public.quiz_attempts
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Policy 2: Users can view their own attempts
CREATE POLICY "Users can view their own attempts"
  ON public.quiz_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Users can create their own attempts
CREATE POLICY "Users can create their own attempts"
  ON public.quiz_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own attempts (to complete them)
CREATE POLICY "Users can update their own attempts"
  ON public.quiz_attempts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 8. CREATE UPDATED_AT TRIGGER FUNCTION (if not exists)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_quizzes_updated_at ON public.quizzes;
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quiz_questions_updated_at ON public.quiz_questions;
CREATE TRIGGER update_quiz_questions_updated_at
  BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


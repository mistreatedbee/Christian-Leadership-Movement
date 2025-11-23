-- =====================================================
-- CREATE QUIZ TABLES FROM SCRATCH (SIMPLE VERSION)
-- =====================================================
-- This script creates all quiz-related tables using only standard SQL
-- No DO blocks, triggers, or functions - compatible with InsForge

-- =====================================================
-- 1. QUIZZES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  bible_school_context TEXT,
  quiz_type TEXT DEFAULT 'course',
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  time_limit INTEGER,
  passing_score INTEGER NOT NULL DEFAULT 70,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add check constraint for quiz_type (if supported)
-- If this fails, you can manually set quiz_type values in the application
ALTER TABLE public.quizzes
ADD CONSTRAINT IF NOT EXISTS quizzes_quiz_type_check 
CHECK (quiz_type IN ('course', 'program', 'bible_school', 'general'));

-- Create indexes for quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_program_id ON public.quizzes(program_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_type ON public.quizzes(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quizzes_bible_school_context ON public.quizzes(bible_school_context);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON public.quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_active ON public.quizzes(is_active);

-- =====================================================
-- 2. QUIZ_QUESTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add check constraint for question_type
ALTER TABLE public.quiz_questions
ADD CONSTRAINT IF NOT EXISTS quiz_questions_question_type_check 
CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay'));

-- Create indexes for quiz_questions
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order_index ON public.quiz_questions(quiz_id, order_index);

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
  time_taken INTEGER,
  answers JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for quiz_attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON public.quiz_attempts(user_id, quiz_id);

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


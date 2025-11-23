-- =====================================================
-- ENHANCE QUIZ SUPPORT FOR BIBLE SCHOOL, COURSES, AND PROGRAMS
-- =====================================================
-- NOTE: Run CREATE_QUIZ_TABLES.sql FIRST if the quizzes table doesn't exist!

-- Check if quizzes table exists, if not, create it first
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quizzes') THEN
    RAISE EXCEPTION 'quizzes table does not exist. Please run CREATE_QUIZ_TABLES.sql first!';
  END IF;
END $$;

-- Add new columns to quizzes table to support multiple contexts
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS bible_school_context TEXT,
ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'course',
ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Add check constraint for quiz_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quizzes_quiz_type_check' 
    AND conrelid = 'public.quizzes'::regclass
  ) THEN
    ALTER TABLE public.quizzes
    ADD CONSTRAINT quizzes_quiz_type_check 
    CHECK (quiz_type IN ('course', 'program', 'bible_school', 'general'));
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quizzes_program_id ON public.quizzes(program_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_type ON public.quizzes(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quizzes_bible_school_context ON public.quizzes(bible_school_context);

-- Add comments for documentation
COMMENT ON COLUMN public.quizzes.program_id IS 'Program this quiz belongs to (for program-based quizzes)';
COMMENT ON COLUMN public.quizzes.bible_school_context IS 'Bible School context (e.g., "study", "class", "meeting", "general")';
COMMENT ON COLUMN public.quizzes.quiz_type IS 'Type of quiz: course, program, bible_school, or general';


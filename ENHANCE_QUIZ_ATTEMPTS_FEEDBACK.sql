-- =====================================================
-- ENHANCE QUIZ ATTEMPTS TABLE FOR FEEDBACK AND GRADING
-- =====================================================
-- Add columns to support admin feedback and manual grading

-- Add feedback and grading columns to quiz_attempts
ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS feedback TEXT,
ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS question_scores JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS question_feedback JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.quiz_attempts.feedback IS 'Overall feedback from admin for the quiz attempt';
COMMENT ON COLUMN public.quiz_attempts.graded_by IS 'Admin user who graded this attempt';
COMMENT ON COLUMN public.quiz_attempts.graded_at IS 'Timestamp when the attempt was graded';
COMMENT ON COLUMN public.quiz_attempts.is_graded IS 'Whether this attempt has been reviewed and graded by an admin';
COMMENT ON COLUMN public.quiz_attempts.question_scores IS 'JSON object mapping question_id to awarded points (for manual grading)';
COMMENT ON COLUMN public.quiz_attempts.question_feedback IS 'JSON object mapping question_id to feedback text';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_is_graded ON public.quiz_attempts(is_graded);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_graded_by ON public.quiz_attempts(graded_by);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id_graded ON public.quiz_attempts(quiz_id, is_graded);


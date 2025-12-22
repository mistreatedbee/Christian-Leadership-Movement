-- CREATE COURSE FEES TABLE
-- This table stores application fees and registration fees for each course
-- Each course can have its own unique fees

CREATE TABLE IF NOT EXISTS public.course_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  application_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  registration_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'ZAR',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_fees_course_id ON public.course_fees(course_id);
CREATE INDEX IF NOT EXISTS idx_course_fees_is_active ON public.course_fees(is_active);

-- Enable RLS
ALTER TABLE public.course_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all course fees
CREATE POLICY "Admins can view all course fees"
  ON public.course_fees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Everyone can view active course fees (for public display)
CREATE POLICY "Everyone can view active course fees"
  ON public.course_fees
  FOR SELECT
  USING (is_active = true);

-- Admins can insert course fees
CREATE POLICY "Admins can insert course fees"
  ON public.course_fees
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can update course fees
CREATE POLICY "Admins can update course fees"
  ON public.course_fees
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can delete course fees
CREATE POLICY "Admins can delete course fees"
  ON public.course_fees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_course_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_course_fees_updated_at ON public.course_fees;
CREATE TRIGGER trigger_update_course_fees_updated_at
  BEFORE UPDATE ON public.course_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_course_fees_updated_at();

-- Add comment
COMMENT ON TABLE public.course_fees IS 'Stores application and registration fees for each course. Each course can have unique fees.';


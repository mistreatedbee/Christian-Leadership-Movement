-- CREATE COURSE APPLICATIONS TABLE
-- This table stores course-specific applications
-- Each course can have its own application form with unique fields

CREATE TABLE IF NOT EXISTS public.course_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_data JSONB NOT NULL, -- Stores all form fields specific to the course
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'refunded')),
  application_fee_paid DECIMAL(10, 2) DEFAULT 0.00,
  registration_fee_paid DECIMAL(10, 2) DEFAULT 0.00,
  payment_id UUID REFERENCES public.payments(id),
  id_document_url TEXT,
  id_document_key TEXT,
  payment_proof_url TEXT,
  payment_proof_key TEXT,
  additional_documents JSONB, -- Array of document URLs/keys
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, user_id) -- One application per user per course
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_applications_course_id ON public.course_applications(course_id);
CREATE INDEX IF NOT EXISTS idx_course_applications_user_id ON public.course_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_course_applications_status ON public.course_applications(status);
CREATE INDEX IF NOT EXISTS idx_course_applications_payment_status ON public.course_applications(payment_status);

-- Enable RLS
ALTER TABLE public.course_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own applications
CREATE POLICY "Users can view their own course applications"
  ON public.course_applications
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all course applications
CREATE POLICY "Admins can view all course applications"
  ON public.course_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Users can insert their own applications
CREATE POLICY "Users can insert their own course applications"
  ON public.course_applications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own pending applications
CREATE POLICY "Users can update pending course applications"
  ON public.course_applications
  FOR UPDATE
  USING (
    user_id = auth.uid() 
    AND status = 'pending'
  )
  WITH CHECK (
    user_id = auth.uid() 
    AND status = 'pending'
  );

-- Admins can update all course applications
CREATE POLICY "Admins can update all course applications"
  ON public.course_applications
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

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_course_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_course_applications_updated_at ON public.course_applications;
CREATE TRIGGER trigger_update_course_applications_updated_at
  BEFORE UPDATE ON public.course_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_course_applications_updated_at();

-- Add comment
COMMENT ON TABLE public.course_applications IS 'Stores course-specific applications. Each course can have unique application forms with different fields stored in application_data JSONB.';


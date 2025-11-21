-- Certificates table for course completion certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  certificate_number TEXT NOT NULL UNIQUE,
  issued_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'issued' CHECK (status IN ('issued', 'pending', 'revoked')),
  certificate_url TEXT,
  certificate_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON public.certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON public.certificates(certificate_number);

-- RLS Policies
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY "Users see own certificates"
  ON public.certificates
  FOR SELECT
  USING (user_id = get_current_user_id());

-- Admins can manage all certificates
CREATE POLICY "Admins manage all certificates"
  ON public.certificates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = get_current_user_id()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );


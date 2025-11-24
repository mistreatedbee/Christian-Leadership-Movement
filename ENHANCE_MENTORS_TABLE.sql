-- Enhance mentors table with comprehensive application form fields
-- This migration adds fields for detailed mentor applications and profile management

-- Add new columns to mentors table for comprehensive application data
ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS application_data JSONB,
ADD COLUMN IF NOT EXISTS mentorship_about TEXT,
ADD COLUMN IF NOT EXISTS what_offers TEXT,
ADD COLUMN IF NOT EXISTS goals TEXT,
ADD COLUMN IF NOT EXISTS program_description TEXT,
ADD COLUMN IF NOT EXISTS qualifications TEXT,
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS specializations TEXT[],
ADD COLUMN IF NOT EXISTS availability TEXT,
ADD COLUMN IF NOT EXISTS contact_preferences TEXT,
ADD COLUMN IF NOT EXISTS references JSONB,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS profile_image_key TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_mentors_status ON public.mentors(status);
CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON public.mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_mentors_program_id ON public.mentors(program_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mentors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mentors_updated_at ON public.mentors;
CREATE TRIGGER trigger_update_mentors_updated_at
    BEFORE UPDATE ON public.mentors
    FOR EACH ROW
    EXECUTE FUNCTION update_mentors_updated_at();

-- Add comment to table
COMMENT ON TABLE public.mentors IS 'Stores mentor applications and profiles with comprehensive information';
COMMENT ON COLUMN public.mentors.application_data IS 'Complete application form data in JSONB format';
COMMENT ON COLUMN public.mentors.mentorship_about IS 'Description of what the mentorship is about';
COMMENT ON COLUMN public.mentors.what_offers IS 'What the mentor offers in their mentorship program';
COMMENT ON COLUMN public.mentors.goals IS 'Goals the mentor aims to achieve in their program';
COMMENT ON COLUMN public.mentors.program_description IS 'Detailed description of the mentorship program';
COMMENT ON COLUMN public.mentors.qualifications IS 'Mentor qualifications and credentials';
COMMENT ON COLUMN public.mentors.experience_years IS 'Years of experience in mentoring/field';
COMMENT ON COLUMN public.mentors.specializations IS 'Array of specialization areas';
COMMENT ON COLUMN public.mentors.availability IS 'Mentor availability schedule';
COMMENT ON COLUMN public.mentors.contact_preferences IS 'Preferred contact methods and times';
COMMENT ON COLUMN public.mentors.references IS 'References in JSONB format';
COMMENT ON COLUMN public.mentors.profile_image_url IS 'URL to mentor profile image';
COMMENT ON COLUMN public.mentors.profile_image_key IS 'Storage key for mentor profile image';
COMMENT ON COLUMN public.mentors.website_url IS 'Mentor personal or professional website';
COMMENT ON COLUMN public.mentors.linkedin_url IS 'Mentor LinkedIn profile URL';


-- Create mentors and related mentorship tables
-- Run this in your InsForge SQL Editor

-- Mentorship Programs table
CREATE TABLE IF NOT EXISTS public.mentorship_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_months INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Mentors table
CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.mentorship_programs(id) ON DELETE SET NULL,
  expertise_areas TEXT[],
  bio TEXT,
  max_mentees INTEGER DEFAULT 5,
  current_mentees INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'full', 'inactive', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, program_id)
);

-- Mentees table
CREATE TABLE IF NOT EXISTS public.mentees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.mentorship_programs(id) ON DELETE SET NULL,
  goals TEXT,
  areas_of_interest TEXT[],
  status TEXT DEFAULT 'seeking' CHECK (status IN ('seeking', 'matched', 'completed', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, program_id)
);

-- Mentorship Matches table
CREATE TABLE IF NOT EXISTS public.mentorship_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES public.mentees(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.mentorship_programs(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON public.mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_mentors_program_id ON public.mentors(program_id);
CREATE INDEX IF NOT EXISTS idx_mentors_status ON public.mentors(status);
CREATE INDEX IF NOT EXISTS idx_mentees_user_id ON public.mentees(user_id);
CREATE INDEX IF NOT EXISTS idx_mentees_program_id ON public.mentees(program_id);
CREATE INDEX IF NOT EXISTS idx_mentees_status ON public.mentees(status);
CREATE INDEX IF NOT EXISTS idx_matches_mentor_id ON public.mentorship_matches(mentor_id);
CREATE INDEX IF NOT EXISTS idx_matches_mentee_id ON public.mentorship_matches(mentee_id);

-- Enable Row Level Security
ALTER TABLE public.mentorship_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentorship_programs
CREATE POLICY "Public can read mentorship programs" ON public.mentorship_programs
  FOR SELECT USING (true);

CREATE POLICY "Admins manage mentorship programs" ON public.mentorship_programs
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = public.get_current_user_id() 
      AND (role = 'admin' OR role = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = public.get_current_user_id() 
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- RLS Policies for mentors
CREATE POLICY "Users can read available mentors" ON public.mentors
  FOR SELECT USING (status IN ('available', 'full'));

CREATE POLICY "Users can read their own mentor profile" ON public.mentors
  FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Users can create their own mentor application" ON public.mentors
  FOR INSERT TO authenticated WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Users can update their own mentor profile" ON public.mentors
  FOR UPDATE TO authenticated USING (user_id = public.get_current_user_id());

CREATE POLICY "Admins can manage all mentors" ON public.mentors
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = public.get_current_user_id() 
      AND (role = 'admin' OR role = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = public.get_current_user_id() 
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- RLS Policies for mentees
CREATE POLICY "Users can read available mentees" ON public.mentees
  FOR SELECT USING (true);

CREATE POLICY "Users can read their own mentee profile" ON public.mentees
  FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Users can create their own mentee profile" ON public.mentees
  FOR INSERT TO authenticated WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Users can update their own mentee profile" ON public.mentees
  FOR UPDATE TO authenticated USING (user_id = public.get_current_user_id());

CREATE POLICY "Admins can manage all mentees" ON public.mentees
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = public.get_current_user_id() 
      AND (role = 'admin' OR role = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = public.get_current_user_id() 
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- RLS Policies for mentorship_matches
CREATE POLICY "Users can read their own matches" ON public.mentorship_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mentors WHERE id = mentor_id AND user_id = public.get_current_user_id()
    ) OR
    EXISTS (
      SELECT 1 FROM public.mentees WHERE id = mentee_id AND user_id = public.get_current_user_id()
    )
  );

CREATE POLICY "Admins can manage all matches" ON public.mentorship_matches
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = public.get_current_user_id() 
      AND (role = 'admin' OR role = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = public.get_current_user_id() 
      AND (role = 'admin' OR role = 'super_admin')
    )
  );


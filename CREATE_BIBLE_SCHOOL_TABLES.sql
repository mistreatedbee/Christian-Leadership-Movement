-- =====================================================
-- BIBLE SCHOOL CONTENT TABLES
-- =====================================================

-- Bible School Studies (Online Bible Studies)
CREATE TABLE IF NOT EXISTS public.bible_school_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  instructor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  scheduled_date TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  meeting_link TEXT, -- For online studies
  meeting_password TEXT, -- Optional password for online meetings
  is_online BOOLEAN DEFAULT true,
  location TEXT, -- For in-person studies
  max_participants INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed')),
  recording_url TEXT, -- For recorded sessions
  notes_url TEXT, -- Link to study notes
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bible School Classes (Online Classes)
CREATE TABLE IF NOT EXISTS public.bible_school_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  course_content TEXT,
  instructor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  scheduled_date TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 90,
  meeting_link TEXT, -- For online classes
  meeting_password TEXT,
  is_online BOOLEAN DEFAULT true,
  location TEXT, -- For in-person classes
  max_students INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed')),
  recording_url TEXT,
  materials_url TEXT, -- Link to class materials
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bible School Meetings (General Meetings)
CREATE TABLE IF NOT EXISTS public.bible_school_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  agenda TEXT,
  scheduled_date TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  meeting_link TEXT, -- For online meetings
  meeting_password TEXT,
  is_online BOOLEAN DEFAULT true,
  location TEXT, -- For in-person meetings
  max_participants INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'postponed')),
  recording_url TEXT,
  minutes_url TEXT, -- Link to meeting minutes
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bible School Resources (Books, Notes, Tests, etc.)
CREATE TABLE IF NOT EXISTS public.bible_school_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('book', 'notes', 'test', 'video', 'audio', 'document', 'other')),
  file_url TEXT, -- URL to uploaded file
  file_key TEXT, -- Storage key for file
  external_link TEXT, -- External URL if resource is hosted elsewhere
  category TEXT, -- e.g., 'Old Testament', 'New Testament', 'Theology', etc.
  tags TEXT[], -- Array of tags
  is_public BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Class/Study/Meeting Participants
CREATE TABLE IF NOT EXISTS public.bible_school_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  study_id UUID REFERENCES public.bible_school_studies(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.bible_school_classes(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES public.bible_school_meetings(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'absent', 'cancelled')),
  registered_at TIMESTAMPTZ DEFAULT now(),
  attended_at TIMESTAMPTZ,
  notes TEXT, -- Personal notes from the participant
  UNIQUE(user_id, study_id),
  UNIQUE(user_id, class_id),
  UNIQUE(user_id, meeting_id),
  CHECK (
    (study_id IS NOT NULL AND class_id IS NULL AND meeting_id IS NULL) OR
    (study_id IS NULL AND class_id IS NOT NULL AND meeting_id IS NULL) OR
    (study_id IS NULL AND class_id IS NULL AND meeting_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bible_school_studies_scheduled_date ON public.bible_school_studies(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bible_school_studies_instructor ON public.bible_school_studies(instructor_id);
CREATE INDEX IF NOT EXISTS idx_bible_school_studies_status ON public.bible_school_studies(status);
CREATE INDEX IF NOT EXISTS idx_bible_school_classes_scheduled_date ON public.bible_school_classes(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bible_school_classes_instructor ON public.bible_school_classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_bible_school_classes_status ON public.bible_school_classes(status);
CREATE INDEX IF NOT EXISTS idx_bible_school_meetings_scheduled_date ON public.bible_school_meetings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bible_school_meetings_status ON public.bible_school_meetings(status);
CREATE INDEX IF NOT EXISTS idx_bible_school_resources_type ON public.bible_school_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_bible_school_resources_category ON public.bible_school_resources(category);
CREATE INDEX IF NOT EXISTS idx_bible_school_participants_user ON public.bible_school_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_bible_school_participants_study ON public.bible_school_participants(study_id);
CREATE INDEX IF NOT EXISTS idx_bible_school_participants_class ON public.bible_school_participants(class_id);
CREATE INDEX IF NOT EXISTS idx_bible_school_participants_meeting ON public.bible_school_participants(meeting_id);

-- Enable RLS
ALTER TABLE public.bible_school_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_school_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_school_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_school_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_school_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bible_school_studies
DROP POLICY IF EXISTS "Public can read scheduled studies" ON public.bible_school_studies;
CREATE POLICY "Public can read scheduled studies"
  ON public.bible_school_studies
  FOR SELECT
  USING (status = 'scheduled' OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Users can see their registered studies" ON public.bible_school_studies;
CREATE POLICY "Users can see their registered studies"
  ON public.bible_school_studies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bible_school_participants
      WHERE bible_school_participants.study_id = bible_school_studies.id
      AND bible_school_participants.user_id = public.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS "Admins manage studies" ON public.bible_school_studies;
CREATE POLICY "Admins manage studies"
  ON public.bible_school_studies
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- RLS Policies for bible_school_classes
DROP POLICY IF EXISTS "Public can read scheduled classes" ON public.bible_school_classes;
CREATE POLICY "Public can read scheduled classes"
  ON public.bible_school_classes
  FOR SELECT
  USING (status = 'scheduled' OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Users can see their registered classes" ON public.bible_school_classes;
CREATE POLICY "Users can see their registered classes"
  ON public.bible_school_classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bible_school_participants
      WHERE bible_school_participants.class_id = bible_school_classes.id
      AND bible_school_participants.user_id = public.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS "Admins manage classes" ON public.bible_school_classes;
CREATE POLICY "Admins manage classes"
  ON public.bible_school_classes
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- RLS Policies for bible_school_meetings
DROP POLICY IF EXISTS "Public can read scheduled meetings" ON public.bible_school_meetings;
CREATE POLICY "Public can read scheduled meetings"
  ON public.bible_school_meetings
  FOR SELECT
  USING (status = 'scheduled' OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Users can see their registered meetings" ON public.bible_school_meetings;
CREATE POLICY "Users can see their registered meetings"
  ON public.bible_school_meetings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bible_school_participants
      WHERE bible_school_participants.meeting_id = bible_school_meetings.id
      AND bible_school_participants.user_id = public.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS "Admins manage meetings" ON public.bible_school_meetings;
CREATE POLICY "Admins manage meetings"
  ON public.bible_school_meetings
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- RLS Policies for bible_school_resources
DROP POLICY IF EXISTS "Public can read public resources" ON public.bible_school_resources;
CREATE POLICY "Public can read public resources"
  ON public.bible_school_resources
  FOR SELECT
  USING (is_public = true OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins manage resources" ON public.bible_school_resources;
CREATE POLICY "Admins manage resources"
  ON public.bible_school_resources
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- RLS Policies for bible_school_participants
DROP POLICY IF EXISTS "Users see own participants" ON public.bible_school_participants;
CREATE POLICY "Users see own participants"
  ON public.bible_school_participants
  FOR SELECT
  USING (user_id = public.get_current_user_id() OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Users register for studies/classes/meetings" ON public.bible_school_participants;
CREATE POLICY "Users register for studies/classes/meetings"
  ON public.bible_school_participants
  FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users update own participation" ON public.bible_school_participants;
CREATE POLICY "Users update own participation"
  ON public.bible_school_participants
  FOR UPDATE
  USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage participants" ON public.bible_school_participants;
CREATE POLICY "Admins manage participants"
  ON public.bible_school_participants
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());


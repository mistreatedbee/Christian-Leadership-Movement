-- =====================================================
-- COMPLETE DATABASE SETUP FOR CHRISTIAN LEADERSHIP MOVEMENT
-- For New InsForge Account
-- Run this entire script in your new InsForge project SQL Editor
-- =====================================================

-- =====================================================
-- 1. USERS & AUTHENTICATION TABLES
-- =====================================================

-- Users table (extends InsForge auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  date_of_birth DATE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- =====================================================
-- 2. HELPER FUNCTION FOR USER ID
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- =====================================================
-- 3. PROGRAMS & APPLICATIONS
-- =====================================================

-- Programs table
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('bible_school', 'short_course', 'membership')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Application drafts table
CREATE TABLE IF NOT EXISTS public.application_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL CHECK (form_type IN ('membership', 'bible_school')),
  form_data JSONB NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, form_type)
);

-- Applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id),
  program_type TEXT NOT NULL,
  form_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'failed')),
  payment_id UUID,
  approval_status TEXT,
  documents JSONB,
  id_passport_url TEXT,
  id_passport_key TEXT,
  payment_proof_url TEXT,
  payment_proof_key TEXT,
  signature TEXT,
  declaration_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. PAYMENTS
-- =====================================================

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  payment_type TEXT NOT NULL CHECK (payment_type IN ('application', 'membership', 'course', 'donation', 'registration')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_id TEXT,
  payment_proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fee settings table
CREATE TABLE IF NOT EXISTS public.fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type TEXT NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. COURSES & LESSONS
-- =====================================================

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  instructor TEXT,
  program_id UUID REFERENCES public.programs(id),
  image_url TEXT,
  image_key TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Course lessons table
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  video_url TEXT,
  video_key TEXT,
  resources_url TEXT,
  resources_key TEXT,
  scheduled_date TIMESTAMPTZ,
  meeting_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User course progress table
CREATE TABLE IF NOT EXISTS public.user_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.course_lessons(id),
  completed BOOLEAN DEFAULT false,
  progress_percentage INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id, lesson_id)
);

-- Course enrollments table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- =====================================================
-- 6. EVENTS
-- =====================================================

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  capacity INTEGER,
  image_url TEXT,
  image_key TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Event registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- =====================================================
-- 7. DONATIONS (with anonymous and message columns)
-- =====================================================

-- Donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  campaign_name TEXT,
  message TEXT,
  anonymous BOOLEAN DEFAULT false,
  payment_id UUID REFERENCES public.payments(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 8. NOTIFICATIONS
-- =====================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  link_url TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 9. GALLERY
-- =====================================================

-- Gallery table
CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  image_key TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 10. CONTENT SECTIONS
-- =====================================================

-- Content sections table
CREATE TABLE IF NOT EXISTS public.content_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type TEXT NOT NULL UNIQUE,
  title TEXT,
  content JSONB NOT NULL,
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 11. STRATEGIC OBJECTIVES
-- =====================================================

-- Strategic objectives table
CREATE TABLE IF NOT EXISTS public.strategic_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  short_description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  icon TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Past work table
CREATE TABLE IF NOT EXISTS public.past_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.strategic_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  image_url TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Upcoming work table
CREATE TABLE IF NOT EXISTS public.upcoming_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.strategic_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date DATE NOT NULL,
  image_url TEXT,
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Objective gallery table
CREATE TABLE IF NOT EXISTS public.objective_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.strategic_objectives(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_key TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 12. CERTIFICATES
-- =====================================================

-- Certificates table
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

-- =====================================================
-- 13. INDEXES
-- =====================================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Applications indexes
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_program_id ON public.applications(program_id);
CREATE INDEX IF NOT EXISTS idx_application_drafts_user_id ON public.application_drafts(user_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON public.payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_program_id ON public.courses(program_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON public.course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_user_id ON public.user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_course_id ON public.user_course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments(course_id);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Donations indexes
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_payment_id ON public.donations(payment_id);

-- Strategic objectives indexes
CREATE INDEX IF NOT EXISTS idx_past_work_objective_id ON public.past_work(objective_id);
CREATE INDEX IF NOT EXISTS idx_upcoming_work_objective_id ON public.upcoming_work(objective_id);
CREATE INDEX IF NOT EXISTS idx_objective_gallery_objective_id ON public.objective_gallery(objective_id);
CREATE INDEX IF NOT EXISTS idx_strategic_objectives_slug ON public.strategic_objectives(slug);

-- Certificates indexes
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON public.certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON public.certificates(certificate_number);

-- =====================================================
-- 14. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.past_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upcoming_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 15. RLS POLICIES - USER_PROFILES
-- =====================================================

DROP POLICY IF EXISTS "Users see own profile" ON public.user_profiles;
CREATE POLICY "Users see own profile" ON public.user_profiles
  FOR SELECT USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users insert own profile" ON public.user_profiles;
CREATE POLICY "Users insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
CREATE POLICY "Users update own profile" ON public.user_profiles
  FOR UPDATE USING (user_id = public.get_current_user_id()) 
  WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins see all profiles" ON public.user_profiles;
CREATE POLICY "Admins see all profiles" ON public.user_profiles
  FOR SELECT TO project_admin USING (true);

DROP POLICY IF EXISTS "Admins update all profiles" ON public.user_profiles;
CREATE POLICY "Admins update all profiles" ON public.user_profiles
  FOR UPDATE TO project_admin USING (true);

-- =====================================================
-- 16. RLS POLICIES - USERS
-- =====================================================

DROP POLICY IF EXISTS "Users see own data" ON public.users;
CREATE POLICY "Users see own data" ON public.users
  FOR SELECT USING (id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users update own data" ON public.users;
CREATE POLICY "Users update own data" ON public.users
  FOR UPDATE USING (id = public.get_current_user_id())
  WITH CHECK (id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins see all users" ON public.users;
CREATE POLICY "Admins see all users" ON public.users
  FOR SELECT TO project_admin USING (true);

DROP POLICY IF EXISTS "Admins update all users" ON public.users;
CREATE POLICY "Admins update all users" ON public.users
  FOR UPDATE TO project_admin USING (true);

-- =====================================================
-- 17. RLS POLICIES - APPLICATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users see own applications" ON public.applications;
CREATE POLICY "Users see own applications" ON public.applications
  FOR SELECT USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users create own applications" ON public.applications;
CREATE POLICY "Users create own applications" ON public.applications
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage all applications" ON public.applications;
CREATE POLICY "Admins manage all applications" ON public.applications
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- =====================================================
-- 18. RLS POLICIES - PAYMENTS
-- =====================================================

DROP POLICY IF EXISTS "Users see own payments" ON public.payments;
CREATE POLICY "Users see own payments" ON public.payments
  FOR SELECT USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users create own payments" ON public.payments;
CREATE POLICY "Users create own payments" ON public.payments
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users update own payments" ON public.payments;
CREATE POLICY "Users update own payments" ON public.payments
  FOR UPDATE USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage all payments" ON public.payments;
CREATE POLICY "Admins manage all payments" ON public.payments
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- =====================================================
-- 19. RLS POLICIES - DONATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users see own donations" ON public.donations;
CREATE POLICY "Users see own donations" ON public.donations
  FOR SELECT USING (user_id = public.get_current_user_id() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users create own donations" ON public.donations;
CREATE POLICY "Users create own donations" ON public.donations
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users update own donations" ON public.donations;
CREATE POLICY "Users update own donations" ON public.donations
  FOR UPDATE USING (user_id = public.get_current_user_id() OR user_id IS NULL)
  WITH CHECK (user_id = public.get_current_user_id() OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins manage all donations" ON public.donations;
CREATE POLICY "Admins manage all donations" ON public.donations
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- =====================================================
-- 20. RLS POLICIES - PUBLIC READ TABLES
-- =====================================================

-- Programs (public read)
DROP POLICY IF EXISTS "Public can read programs" ON public.programs;
CREATE POLICY "Public can read programs" ON public.programs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage programs" ON public.programs;
CREATE POLICY "Admins manage programs" ON public.programs
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Events (public read)
DROP POLICY IF EXISTS "Public can read events" ON public.events;
CREATE POLICY "Public can read events" ON public.events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage events" ON public.events;
CREATE POLICY "Admins manage events" ON public.events
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Courses (public read)
DROP POLICY IF EXISTS "Public can read courses" ON public.courses;
CREATE POLICY "Public can read courses" ON public.courses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses" ON public.courses
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Course lessons (public read)
DROP POLICY IF EXISTS "Public can read lessons" ON public.course_lessons;
CREATE POLICY "Public can read lessons" ON public.course_lessons
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage lessons" ON public.course_lessons;
CREATE POLICY "Admins manage lessons" ON public.course_lessons
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Gallery (public read)
DROP POLICY IF EXISTS "Public can read gallery" ON public.gallery;
CREATE POLICY "Public can read gallery" ON public.gallery
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage gallery" ON public.gallery;
CREATE POLICY "Admins manage gallery" ON public.gallery
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Content sections (public read)
DROP POLICY IF EXISTS "Public can read content_sections" ON public.content_sections;
CREATE POLICY "Public can read content_sections" ON public.content_sections
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage content_sections" ON public.content_sections;
CREATE POLICY "Admins manage content_sections" ON public.content_sections
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Strategic objectives (public read)
DROP POLICY IF EXISTS "Public can read objectives" ON public.strategic_objectives;
CREATE POLICY "Public can read objectives" ON public.strategic_objectives
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage objectives" ON public.strategic_objectives;
CREATE POLICY "Admins manage objectives" ON public.strategic_objectives
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Past work (public read)
DROP POLICY IF EXISTS "Public can read past_work" ON public.past_work;
CREATE POLICY "Public can read past_work" ON public.past_work
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage past_work" ON public.past_work;
CREATE POLICY "Admins manage past_work" ON public.past_work
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Upcoming work (public read)
DROP POLICY IF EXISTS "Public can read upcoming_work" ON public.upcoming_work;
CREATE POLICY "Public can read upcoming_work" ON public.upcoming_work
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage upcoming_work" ON public.upcoming_work;
CREATE POLICY "Admins manage upcoming_work" ON public.upcoming_work
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Objective gallery (public read)
DROP POLICY IF EXISTS "Public can read objective_gallery" ON public.objective_gallery;
CREATE POLICY "Public can read objective_gallery" ON public.objective_gallery
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage objective_gallery" ON public.objective_gallery;
CREATE POLICY "Admins manage objective_gallery" ON public.objective_gallery
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Fee settings (public read)
DROP POLICY IF EXISTS "Public can read fee_settings" ON public.fee_settings;
CREATE POLICY "Public can read fee_settings" ON public.fee_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage fee_settings" ON public.fee_settings;
CREATE POLICY "Admins manage fee_settings" ON public.fee_settings
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- =====================================================
-- 21. RLS POLICIES - USER-SPECIFIC TABLES
-- =====================================================

-- Notifications (users see own)
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications" ON public.notifications
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage all notifications" ON public.notifications;
CREATE POLICY "Admins manage all notifications" ON public.notifications
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Event registrations (users see own)
DROP POLICY IF EXISTS "Users see own registrations" ON public.event_registrations;
CREATE POLICY "Users see own registrations" ON public.event_registrations
  FOR SELECT USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users create own registrations" ON public.event_registrations;
CREATE POLICY "Users create own registrations" ON public.event_registrations
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage all registrations" ON public.event_registrations;
CREATE POLICY "Admins manage all registrations" ON public.event_registrations
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- User course progress (users see own)
DROP POLICY IF EXISTS "Users see own progress" ON public.user_course_progress;
CREATE POLICY "Users see own progress" ON public.user_course_progress
  FOR SELECT USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users manage own progress" ON public.user_course_progress;
CREATE POLICY "Users manage own progress" ON public.user_course_progress
  FOR ALL USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage all progress" ON public.user_course_progress;
CREATE POLICY "Admins manage all progress" ON public.user_course_progress
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Course enrollments (users see own)
DROP POLICY IF EXISTS "Users see own enrollments" ON public.course_enrollments;
CREATE POLICY "Users see own enrollments" ON public.course_enrollments
  FOR SELECT USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users create own enrollments" ON public.course_enrollments;
CREATE POLICY "Users create own enrollments" ON public.course_enrollments
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage all enrollments" ON public.course_enrollments;
CREATE POLICY "Admins manage all enrollments" ON public.course_enrollments
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Application drafts (users see own)
DROP POLICY IF EXISTS "Users see own drafts" ON public.application_drafts;
CREATE POLICY "Users see own drafts" ON public.application_drafts
  FOR SELECT USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users manage own drafts" ON public.application_drafts;
CREATE POLICY "Users manage own drafts" ON public.application_drafts
  FOR ALL USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- Certificates (users see own)
DROP POLICY IF EXISTS "Users see own certificates" ON public.certificates;
CREATE POLICY "Users see own certificates" ON public.certificates
  FOR SELECT USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage all certificates" ON public.certificates;
CREATE POLICY "Admins manage all certificates" ON public.certificates
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- =====================================================
-- 22. INITIAL DATA - PROGRAMS
-- =====================================================

INSERT INTO public.programs (name, description, type) VALUES
  ('Bible School', 'Comprehensive theological education and leadership training', 'bible_school'),
  ('Short Courses', 'Focused training programs for specific ministry skills', 'short_course'),
  ('Membership Program', 'Full membership with access to all resources and benefits', 'membership')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 23. INITIAL DATA - FEE SETTINGS
-- =====================================================

INSERT INTO public.fee_settings (fee_type, amount, currency, description, is_active) VALUES
  ('membership_application', 500.00, 'ZAR', 'Membership application fee', true),
  ('bible_school_with_acrp', 2500.00, 'ZAR', 'Bible School registration with ACRP', true),
  ('bible_school_without_acrp', 2000.00, 'ZAR', 'Bible School registration without ACRP', true)
ON CONFLICT (fee_type) DO UPDATE SET
  amount = EXCLUDED.amount,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Next steps:
-- 1. Create storage buckets: applications, courses, gallery, avatars, certificates
-- 2. Update your .env file with new InsForge credentials:
--    VITE_INSFORGE_BASE_URL=https://your-project.insforge.app
--    VITE_INSFORGE_ANON_KEY=your-anon-key
-- 3. Test authentication and database access
-- 4. Set up payment gateway credentials (PayFast/Ozow) in .env
-- =====================================================


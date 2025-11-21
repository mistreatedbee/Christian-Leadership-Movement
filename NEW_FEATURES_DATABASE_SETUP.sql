-- =====================================================
-- NEW FEATURES DATABASE SETUP
-- Christian Leadership Movement - Extended Features
-- Run this script AFTER running COMPLETE_DATABASE_SETUP_NEW.sql
-- =====================================================

-- =====================================================
-- 1. PRAYER REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  request TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'answered', 'archived')),
  prayer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_id ON public.prayer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_status ON public.prayer_requests(status);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_public ON public.prayer_requests(is_public);

-- Prayer responses (users can pray for requests)
CREATE TABLE IF NOT EXISTS public.prayer_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prayer_request_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_prayer_responses_request_id ON public.prayer_responses(prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_prayer_responses_user_id ON public.prayer_responses(user_id);

-- =====================================================
-- 2. TESTIMONIALS & REVIEWS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  testimonial_type TEXT CHECK (testimonial_type IN ('general', 'course', 'event', 'program')),
  related_id UUID, -- course_id, event_id, etc.
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_user_id ON public.testimonials(user_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON public.testimonials(is_featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_type ON public.testimonials(testimonial_type);

-- =====================================================
-- 3. COMMUNITY FORUM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_topics_category_id ON public.forum_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_user_id ON public.forum_topics(user_id);

CREATE TABLE IF NOT EXISTS public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_topic_id ON public.forum_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user_id ON public.forum_replies(user_id);

-- User-to-user messaging
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(is_read);

-- =====================================================
-- 4. REFERRAL PROGRAM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_type TEXT,
  reward_amount DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);

-- User referral codes
CREATE TABLE IF NOT EXISTS public.user_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  total_rewards DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_referral_codes_user_id ON public.user_referral_codes(user_id);

-- =====================================================
-- 5. SMS NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_notifications_user_id ON public.sms_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON public.sms_notifications(status);

-- SMS settings
CREATE TABLE IF NOT EXISTS public.sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT DEFAULT 'twilio',
  api_key TEXT,
  api_secret TEXT,
  from_number TEXT,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. EMAIL TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB, -- Available variables for this template
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_key ON public.email_templates(template_key);

-- Scheduled emails
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_recipient_id ON public.scheduled_emails(recipient_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON public.scheduled_emails(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON public.scheduled_emails(scheduled_for);

-- =====================================================
-- 7. PUSH NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  link_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_notifications_user_id ON public.push_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON public.push_notifications(status);

-- =====================================================
-- 8. RESOURCE LIBRARY
-- =====================================================

CREATE TABLE IF NOT EXISTS public.resource_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'video', 'audio', 'link')),
  file_url TEXT,
  file_key TEXT,
  file_size INTEGER,
  duration INTEGER, -- For video/audio in seconds
  thumbnail_url TEXT,
  download_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_category_id ON public.resources(category_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_featured ON public.resources(is_featured);

-- =====================================================
-- 9. BLOG/NEWS SECTION
-- =====================================================

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  featured_image_key TEXT,
  post_type TEXT DEFAULT 'post' CHECK (post_type IN ('post', 'news', 'announcement')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_type ON public.blog_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);

-- Blog post tags (many-to-many)
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post_id ON public.blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id ON public.blog_post_tags(tag_id);

-- =====================================================
-- 10. QUIZZES & ASSESSMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  time_limit INTEGER, -- In minutes
  passing_score INTEGER DEFAULT 70, -- Percentage
  max_attempts INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  options JSONB, -- For multiple choice: [{"text": "Option 1", "correct": true}, ...]
  correct_answer TEXT, -- For short answer/essay
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL, -- {question_id: answer}
  score INTEGER,
  percentage INTEGER,
  passed BOOLEAN,
  time_taken INTEGER, -- In seconds
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  UNIQUE(quiz_id, user_id, started_at)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);

-- =====================================================
-- 11. LIVE STREAMING/VIRTUAL EVENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  stream_url TEXT,
  stream_key TEXT,
  provider TEXT CHECK (provider IN ('youtube', 'zoom', 'vimeo', 'custom')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'recorded')),
  scheduled_start TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  recording_url TEXT,
  viewer_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_event_id ON public.live_streams(event_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON public.live_streams(status);

-- =====================================================
-- 12. VOLUNTEER MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS public.volunteer_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  skills_required TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.volunteer_roles(id) ON DELETE SET NULL,
  skills TEXT[],
  availability JSONB, -- {days: ["monday", "wednesday"], hours: "9am-5pm"}
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  total_hours DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_volunteers_user_id ON public.volunteers(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_role_id ON public.volunteers(role_id);

CREATE TABLE IF NOT EXISTS public.volunteer_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  role_id UUID REFERENCES public.volunteer_roles(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  hours_worked DECIMAL(5, 2),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_shifts_volunteer_id ON public.volunteer_shifts(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_shifts_event_id ON public.volunteer_shifts(event_id);

-- =====================================================
-- 13. ATTENDANCE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  attendance_type TEXT NOT NULL CHECK (attendance_type IN ('event', 'course', 'lesson')),
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  check_in_time TIMESTAMPTZ DEFAULT now(),
  check_out_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course_id ON public.attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_type ON public.attendance(attendance_type);

-- =====================================================
-- 14. GROUP MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT CHECK (group_type IN ('ministry', 'small_group', 'committee', 'team')),
  image_url TEXT,
  image_key TEXT,
  is_public BOOLEAN DEFAULT false,
  max_members INTEGER,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);

CREATE TABLE IF NOT EXISTS public.group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_group_events_group_id ON public.group_events(group_id);
CREATE INDEX IF NOT EXISTS idx_group_events_event_id ON public.group_events(event_id);

-- Group messages (separate from forum)
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_user_id ON public.group_messages(user_id);

-- =====================================================
-- 15. MENTORSHIP MATCHING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mentorship_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_months INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.mentorship_programs(id) ON DELETE SET NULL,
  expertise_areas TEXT[],
  bio TEXT,
  max_mentees INTEGER DEFAULT 5,
  current_mentees INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'full', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON public.mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_mentors_program_id ON public.mentors(program_id);

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

CREATE INDEX IF NOT EXISTS idx_mentees_user_id ON public.mentees(user_id);
CREATE INDEX IF NOT EXISTS idx_mentees_program_id ON public.mentees(program_id);

CREATE TABLE IF NOT EXISTS public.mentorship_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES public.mentees(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.mentorship_programs(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'ended')),
  start_date DATE NOT NULL,
  end_date DATE,
  goals JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentor_id ON public.mentorship_matches(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentee_id ON public.mentorship_matches(mentee_id);

CREATE TABLE IF NOT EXISTS public.mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.mentorship_matches(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  progress_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_match_id ON public.mentorship_sessions(match_id);

-- =====================================================
-- 16. ANNUAL GIVING STATEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.giving_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_donations DECIMAL(10, 2) DEFAULT 0,
  total_payments DECIMAL(10, 2) DEFAULT 0,
  statement_url TEXT,
  statement_key TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'sent')),
  generated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_giving_statements_user_id ON public.giving_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_giving_statements_year ON public.giving_statements(year);

-- =====================================================
-- 17. CUSTOM REPORTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL,
  query_config JSONB NOT NULL, -- Configuration for building the report
  export_formats TEXT[] DEFAULT ARRAY['pdf', 'excel'],
  schedule_config JSONB, -- Cron expression, frequency, etc.
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  run_by UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  file_url TEXT,
  file_key TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_report_runs_template_id ON public.report_runs(template_id);

-- =====================================================
-- 18. USER PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  preferences JSONB, -- Additional preferences
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- =====================================================
-- 19. TWO-FACTOR AUTHENTICATION
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('sms', 'email', 'totp')),
  phone_number TEXT, -- For SMS 2FA
  secret_key TEXT, -- For TOTP
  backup_codes TEXT[], -- Backup codes
  is_enabled BOOLEAN DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON public.user_2fa(user_id);

-- =====================================================
-- 20. AUDIT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- =====================================================
-- 21. ENABLE RLS ON NEW TABLES
-- =====================================================

ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giving_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 22. RLS POLICIES - PRAYER REQUESTS
-- =====================================================

-- Public prayer requests (if is_public = true)
DROP POLICY IF EXISTS "Public can read public prayer requests" ON public.prayer_requests;
CREATE POLICY "Public can read public prayer requests" ON public.prayer_requests
  FOR SELECT USING (is_public = true AND status = 'active');

-- Users see own prayer requests
DROP POLICY IF EXISTS "Users see own prayer requests" ON public.prayer_requests;
CREATE POLICY "Users see own prayer requests" ON public.prayer_requests
  FOR SELECT USING (user_id = public.get_current_user_id() OR user_id IS NULL);

-- Users create own prayer requests
DROP POLICY IF EXISTS "Users create own prayer requests" ON public.prayer_requests;
CREATE POLICY "Users create own prayer requests" ON public.prayer_requests
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id() OR user_id IS NULL);

-- Admins manage all
DROP POLICY IF EXISTS "Admins manage prayer requests" ON public.prayer_requests;
CREATE POLICY "Admins manage prayer requests" ON public.prayer_requests
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Prayer responses
DROP POLICY IF EXISTS "Users see prayer responses" ON public.prayer_responses;
CREATE POLICY "Users see prayer responses" ON public.prayer_responses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users create prayer responses" ON public.prayer_responses;
CREATE POLICY "Users create prayer responses" ON public.prayer_responses
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

-- =====================================================
-- 23. RLS POLICIES - TESTIMONIALS
-- =====================================================

-- Public can read approved testimonials
DROP POLICY IF EXISTS "Public can read approved testimonials" ON public.testimonials;
CREATE POLICY "Public can read approved testimonials" ON public.testimonials
  FOR SELECT USING (is_approved = true);

-- Users create own testimonials
DROP POLICY IF EXISTS "Users create own testimonials" ON public.testimonials;
CREATE POLICY "Users create own testimonials" ON public.testimonials
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id() OR user_id IS NULL);

-- Admins manage all
DROP POLICY IF EXISTS "Admins manage testimonials" ON public.testimonials;
CREATE POLICY "Admins manage testimonials" ON public.testimonials
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- =====================================================
-- 24. RLS POLICIES - FORUM
-- =====================================================

-- Public can read forum
DROP POLICY IF EXISTS "Public can read forum" ON public.forum_categories;
CREATE POLICY "Public can read forum" ON public.forum_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read forum topics" ON public.forum_topics;
CREATE POLICY "Public can read forum topics" ON public.forum_topics
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read forum replies" ON public.forum_replies;
CREATE POLICY "Public can read forum replies" ON public.forum_replies
  FOR SELECT USING (true);

-- Authenticated users can create
DROP POLICY IF EXISTS "Users create forum topics" ON public.forum_topics;
CREATE POLICY "Users create forum topics" ON public.forum_topics
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users create forum replies" ON public.forum_replies;
CREATE POLICY "Users create forum replies" ON public.forum_replies
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

-- Admins manage all
DROP POLICY IF EXISTS "Admins manage forum" ON public.forum_categories;
CREATE POLICY "Admins manage forum" ON public.forum_categories
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage forum topics" ON public.forum_topics;
CREATE POLICY "Admins manage forum topics" ON public.forum_topics
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- =====================================================
-- 25. RLS POLICIES - MESSAGES
-- =====================================================

-- Users see own messages (sent or received)
DROP POLICY IF EXISTS "Users see own messages" ON public.messages;
CREATE POLICY "Users see own messages" ON public.messages
  FOR SELECT USING (sender_id = public.get_current_user_id() OR recipient_id = public.get_current_user_id());

-- Users create messages
DROP POLICY IF EXISTS "Users create messages" ON public.messages;
CREATE POLICY "Users create messages" ON public.messages
  FOR INSERT WITH CHECK (sender_id = public.get_current_user_id());

-- Users update own received messages (mark as read)
DROP POLICY IF EXISTS "Users update own messages" ON public.messages;
CREATE POLICY "Users update own messages" ON public.messages
  FOR UPDATE USING (recipient_id = public.get_current_user_id())
  WITH CHECK (recipient_id = public.get_current_user_id());

-- =====================================================
-- 26. RLS POLICIES - RESOURCES, BLOG, QUIZZES (PUBLIC READ)
-- =====================================================

-- Resources (public read)
DROP POLICY IF EXISTS "Public can read resources" ON public.resources;
CREATE POLICY "Public can read resources" ON public.resources
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Admins manage resources" ON public.resources;
CREATE POLICY "Admins manage resources" ON public.resources
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Blog (public read published)
DROP POLICY IF EXISTS "Public can read published blog posts" ON public.blog_posts;
CREATE POLICY "Public can read published blog posts" ON public.blog_posts
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Users create blog posts" ON public.blog_posts;
CREATE POLICY "Users create blog posts" ON public.blog_posts
  FOR INSERT WITH CHECK (author_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage blog" ON public.blog_posts;
CREATE POLICY "Admins manage blog" ON public.blog_posts
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Quizzes (users see enrolled courses' quizzes)
DROP POLICY IF EXISTS "Users see course quizzes" ON public.quizzes;
CREATE POLICY "Users see course quizzes" ON public.quizzes
  FOR SELECT USING (
    course_id IN (
      SELECT course_id FROM public.course_enrollments 
      WHERE user_id = public.get_current_user_id()
    )
  );

DROP POLICY IF EXISTS "Admins manage quizzes" ON public.quizzes;
CREATE POLICY "Admins manage quizzes" ON public.quizzes
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Quiz attempts (users see own)
DROP POLICY IF EXISTS "Users see own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users see own quiz attempts" ON public.quiz_attempts
  FOR SELECT USING (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users create own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users create own quiz attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

-- =====================================================
-- 27. RLS POLICIES - USER-SPECIFIC TABLES
-- =====================================================

-- User preferences (users see own)
DROP POLICY IF EXISTS "Users see own preferences" ON public.user_preferences;
CREATE POLICY "Users see own preferences" ON public.user_preferences
  FOR ALL USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- Referrals (users see own)
DROP POLICY IF EXISTS "Users see own referrals" ON public.referrals;
CREATE POLICY "Users see own referrals" ON public.referrals
  FOR SELECT USING (referrer_id = public.get_current_user_id() OR referred_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users create referrals" ON public.referrals;
CREATE POLICY "Users create referrals" ON public.referrals
  FOR INSERT WITH CHECK (referrer_id = public.get_current_user_id());

-- User referral codes (users see own)
DROP POLICY IF EXISTS "Users see own referral codes" ON public.user_referral_codes;
CREATE POLICY "Users see own referral codes" ON public.user_referral_codes
  FOR ALL USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- SMS notifications (users see own)
DROP POLICY IF EXISTS "Users see own SMS notifications" ON public.sms_notifications;
CREATE POLICY "Users see own SMS notifications" ON public.sms_notifications
  FOR SELECT USING (user_id = public.get_current_user_id());

-- Push subscriptions (users see own)
DROP POLICY IF EXISTS "Users see own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users see own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- Push notifications (users see own)
DROP POLICY IF EXISTS "Users see own push notifications" ON public.push_notifications;
CREATE POLICY "Users see own push notifications" ON public.push_notifications
  FOR SELECT USING (user_id = public.get_current_user_id() OR user_id IS NULL);

-- Attendance (users see own)
DROP POLICY IF EXISTS "Users see own attendance" ON public.attendance;
CREATE POLICY "Users see own attendance" ON public.attendance
  FOR SELECT USING (user_id = public.get_current_user_id());

-- Volunteers (users see own)
DROP POLICY IF EXISTS "Users see own volunteer record" ON public.volunteers;
CREATE POLICY "Users see own volunteer record" ON public.volunteers
  FOR ALL USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- Groups (public can read public groups)
DROP POLICY IF EXISTS "Public can read public groups" ON public.groups;
CREATE POLICY "Public can read public groups" ON public.groups
  FOR SELECT USING (is_public = true);

-- Group members (users see groups they're in)
DROP POLICY IF EXISTS "Users see own group memberships" ON public.group_members;
CREATE POLICY "Users see own group memberships" ON public.group_members
  FOR SELECT USING (user_id = public.get_current_user_id());

-- Mentorship (users see own)
DROP POLICY IF EXISTS "Users see own mentorship" ON public.mentors;
CREATE POLICY "Users see own mentorship" ON public.mentors
  FOR ALL USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Users see own mentee record" ON public.mentees;
CREATE POLICY "Users see own mentee record" ON public.mentees
  FOR ALL USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- Giving statements (users see own)
DROP POLICY IF EXISTS "Users see own giving statements" ON public.giving_statements;
CREATE POLICY "Users see own giving statements" ON public.giving_statements
  FOR SELECT USING (user_id = public.get_current_user_id());

-- User 2FA (users see own)
DROP POLICY IF EXISTS "Users see own 2FA" ON public.user_2fa;
CREATE POLICY "Users see own 2FA" ON public.user_2fa
  FOR ALL USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());

-- =====================================================
-- 28. RLS POLICIES - ADMIN-ONLY TABLES
-- =====================================================

-- SMS settings (admin only)
DROP POLICY IF EXISTS "Admins manage SMS settings" ON public.sms_settings;
CREATE POLICY "Admins manage SMS settings" ON public.sms_settings
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Email templates (admin only)
DROP POLICY IF EXISTS "Admins manage email templates" ON public.email_templates;
CREATE POLICY "Admins manage email templates" ON public.email_templates
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Scheduled emails (admin can see all, users see own)
DROP POLICY IF EXISTS "Users see own scheduled emails" ON public.scheduled_emails;
CREATE POLICY "Users see own scheduled emails" ON public.scheduled_emails
  FOR SELECT USING (recipient_id = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage scheduled emails" ON public.scheduled_emails;
CREATE POLICY "Admins manage scheduled emails" ON public.scheduled_emails
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Report templates (admin only)
DROP POLICY IF EXISTS "Admins manage report templates" ON public.report_templates;
CREATE POLICY "Admins manage report templates" ON public.report_templates
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Report runs (admin can see all, users see own)
DROP POLICY IF EXISTS "Users see own report runs" ON public.report_runs;
CREATE POLICY "Users see own report runs" ON public.report_runs
  FOR SELECT USING (run_by = public.get_current_user_id());

DROP POLICY IF EXISTS "Admins manage report runs" ON public.report_runs;
CREATE POLICY "Admins manage report runs" ON public.report_runs
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Audit logs (admin only)
DROP POLICY IF EXISTS "Admins see audit logs" ON public.audit_logs;
CREATE POLICY "Admins see audit logs" ON public.audit_logs
  FOR SELECT TO project_admin USING (true);

-- Volunteer roles (public read, admin manage)
DROP POLICY IF EXISTS "Public can read volunteer roles" ON public.volunteer_roles;
CREATE POLICY "Public can read volunteer roles" ON public.volunteer_roles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage volunteer roles" ON public.volunteer_roles;
CREATE POLICY "Admins manage volunteer roles" ON public.volunteer_roles
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Live streams (public read, admin manage)
DROP POLICY IF EXISTS "Public can read live streams" ON public.live_streams;
CREATE POLICY "Public can read live streams" ON public.live_streams
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage live streams" ON public.live_streams;
CREATE POLICY "Admins manage live streams" ON public.live_streams
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Mentorship programs (public read, admin manage)
DROP POLICY IF EXISTS "Public can read mentorship programs" ON public.mentorship_programs;
CREATE POLICY "Public can read mentorship programs" ON public.mentorship_programs
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage mentorship programs" ON public.mentorship_programs;
CREATE POLICY "Admins manage mentorship programs" ON public.mentorship_programs
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- Attendance (admin can see all)
DROP POLICY IF EXISTS "Admins see all attendance" ON public.attendance;
CREATE POLICY "Admins see all attendance" ON public.attendance
  FOR SELECT TO project_admin USING (true);

-- Groups (admin manage all)
DROP POLICY IF EXISTS "Admins manage groups" ON public.groups;
CREATE POLICY "Admins manage groups" ON public.groups
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- All new feature tables have been created with RLS policies
-- Next steps:
-- 1. Create additional storage buckets if needed:
--    - resources (for resource library files)
--    - blog (for blog post images)
--    - recordings (for live stream recordings)
-- 2. Test the new features
-- 3. Update frontend to use new tables
-- =====================================================


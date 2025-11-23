-- =====================================================
-- CREATE PRAYER REQUESTS TABLE
-- This script creates the prayer_requests and prayer_responses tables
-- Run this in your InsForge SQL Editor
-- =====================================================

-- Prayer Requests Table
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  request TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'answered', 'archived')),
  prayer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_id ON public.prayer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_status ON public.prayer_requests(status);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_public ON public.prayer_requests(is_public);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_created_at ON public.prayer_requests(created_at);

-- Prayer Responses Table (users can pray for requests)
CREATE TABLE IF NOT EXISTS public.prayer_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prayer_request_id, user_id)
);

-- Create indexes for prayer responses
CREATE INDEX IF NOT EXISTS idx_prayer_responses_request_id ON public.prayer_responses(prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_prayer_responses_user_id ON public.prayer_responses(user_id);

-- Enable Row Level Security
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_responses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR PRAYER REQUESTS
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read public prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Users see own prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Users create own prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Admins manage prayer requests" ON public.prayer_requests;

-- Public can read public active prayer requests
CREATE POLICY "Public can read public prayer requests"
  ON public.prayer_requests
  FOR SELECT
  USING (is_public = true AND status = 'active');

-- Users can see their own prayer requests (any status)
CREATE POLICY "Users see own prayer requests"
  ON public.prayer_requests
  FOR SELECT
  USING (user_id = public.get_current_user_id() OR user_id IS NULL);

-- Users can create their own prayer requests
CREATE POLICY "Users create own prayer requests"
  ON public.prayer_requests
  FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id() OR user_id IS NULL);

-- Admins can see and manage all prayer requests
-- Note: This uses the is_current_user_admin() function which should already exist
-- If it doesn't, you'll need to run FIX_USER_PROFILES_RLS.sql first
CREATE POLICY "Admins manage prayer requests"
  ON public.prayer_requests
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- =====================================================
-- RLS POLICIES FOR PRAYER RESPONSES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users see prayer responses" ON public.prayer_responses;
DROP POLICY IF EXISTS "Users create prayer responses" ON public.prayer_responses;
DROP POLICY IF EXISTS "Admins manage prayer responses" ON public.prayer_responses;

-- Users can see all prayer responses (for counting prayers)
CREATE POLICY "Users see prayer responses"
  ON public.prayer_responses
  FOR SELECT
  USING (true);

-- Users can create their own prayer responses
CREATE POLICY "Users create prayer responses"
  ON public.prayer_responses
  FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

-- Admins can manage all prayer responses
CREATE POLICY "Admins manage prayer responses"
  ON public.prayer_responses
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());


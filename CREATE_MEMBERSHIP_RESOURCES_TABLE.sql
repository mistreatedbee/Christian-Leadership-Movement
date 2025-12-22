-- Create membership_resources table for managing membership program resources
CREATE TABLE IF NOT EXISTS public.membership_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL, -- 'document', 'video', 'audio', 'link', 'textbook', 'notes'
  file_url TEXT,
  file_key TEXT,
  external_link TEXT,
  thumbnail_url TEXT,
  thumbnail_key TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_membership_resources_type ON public.membership_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_membership_resources_created_by ON public.membership_resources(created_by);
CREATE INDEX IF NOT EXISTS idx_membership_resources_is_public ON public.membership_resources(is_public);
CREATE INDEX IF NOT EXISTS idx_membership_resources_is_featured ON public.membership_resources(is_featured);
CREATE INDEX IF NOT EXISTS idx_membership_resources_display_order ON public.membership_resources(display_order);

-- Enable RLS
ALTER TABLE public.membership_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can do everything
CREATE POLICY "Admins can manage all membership resources" ON public.membership_resources
  FOR ALL
  USING (public.is_current_user_admin());

-- Authenticated users can view public resources
CREATE POLICY "Users can view public membership resources" ON public.membership_resources
  FOR SELECT
  USING (auth.role() = 'authenticated' AND is_public = true);


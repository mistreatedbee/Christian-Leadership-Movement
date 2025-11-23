-- =====================================================
-- CREATE RESOURCES AND RESOURCE_CATEGORIES TABLES
-- =====================================================
-- This script creates the resources and resource_categories tables
-- Run this if the tables don't exist yet

-- Resource categories table
CREATE TABLE IF NOT EXISTS public.resource_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_categories_slug ON public.resource_categories(slug);
CREATE INDEX IF NOT EXISTS idx_resource_categories_order ON public.resource_categories(order_index);

-- Resources table
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL DEFAULT 'document',
  file_url TEXT,
  file_key TEXT,
  external_link TEXT,
  thumbnail_url TEXT,
  thumbnail_key TEXT,
  download_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_category_id ON public.resources(category_id);
CREATE INDEX IF NOT EXISTS idx_resources_is_featured ON public.resources(is_featured);
CREATE INDEX IF NOT EXISTS idx_resources_is_public ON public.resources(is_public);
CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON public.resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(created_at);

-- Enable RLS
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resource_categories
DROP POLICY IF EXISTS "Public can read active categories" ON public.resource_categories;
CREATE POLICY "Public can read active categories"
  ON public.resource_categories
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.resource_categories;
CREATE POLICY "Admins manage categories"
  ON public.resource_categories
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- RLS Policies for resources
DROP POLICY IF EXISTS "Public can read public resources" ON public.resources;
CREATE POLICY "Public can read public resources"
  ON public.resources
  FOR SELECT
  USING (is_public = true OR public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins manage resources" ON public.resources;
CREATE POLICY "Admins manage resources"
  ON public.resources
  FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Add comments for documentation
COMMENT ON TABLE public.resource_categories IS 'Categories for organizing resources';
COMMENT ON TABLE public.resources IS 'General resources library (documents, videos, audio, links, etc.)';
COMMENT ON COLUMN public.resources.resource_type IS 'Type of resource: document, pdf, video, audio, image, link, textbook, notes, other';
COMMENT ON COLUMN public.resources.external_link IS 'URL for resources hosted externally (YouTube, Vimeo, Google Drive, etc.)';
COMMENT ON COLUMN public.resources.is_featured IS 'Whether this resource should be featured prominently';
COMMENT ON COLUMN public.resources.is_public IS 'Whether this resource is visible to all users (false = admin only)';

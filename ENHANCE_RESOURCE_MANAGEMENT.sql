-- =====================================================
-- ENHANCE RESOURCE MANAGEMENT WITH CATEGORIES
-- =====================================================

-- Ensure resource_categories table exists
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

-- Ensure resources table has category_id
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resources_category_id ON public.resources(category_id);

-- Enable RLS
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;

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

-- Update resources table to support multiple file types
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS external_link TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_resources_is_featured ON public.resources(is_featured);
CREATE INDEX IF NOT EXISTS idx_resources_is_public ON public.resources(is_public);

-- RLS Policies for resources (if not already exist)
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

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


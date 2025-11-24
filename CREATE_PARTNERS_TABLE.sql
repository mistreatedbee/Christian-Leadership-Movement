-- Create partners table for managing partner organizations
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  logo_key TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  partner_type TEXT, -- e.g., 'educational', 'government', 'ministry', 'church'
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Create index for active partners
CREATE INDEX IF NOT EXISTS idx_partners_active ON public.partners(is_active);
CREATE INDEX IF NOT EXISTS idx_partners_display_order ON public.partners(display_order);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can do everything
CREATE POLICY "Admins can manage all partners" ON public.partners
  FOR ALL
  USING (public.is_current_user_admin());

-- Authenticated users can view active partners
CREATE POLICY "Users can view active partners" ON public.partners
  FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);


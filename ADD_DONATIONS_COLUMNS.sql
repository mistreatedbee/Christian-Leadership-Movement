-- Add missing columns to donations table
-- Run this SQL script in your InsForge database console

-- Add anonymous column
ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS anonymous BOOLEAN DEFAULT false;

-- Add message column
ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS message TEXT;

-- Note: The table already has 'campaign_name' column
-- Make sure code uses 'campaign_name' instead of 'campaign'


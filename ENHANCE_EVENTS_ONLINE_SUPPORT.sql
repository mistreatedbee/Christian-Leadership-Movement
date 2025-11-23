-- =====================================================
-- ENHANCE EVENTS FOR ONLINE/IN-PERSON SUPPORT
-- =====================================================

-- Add online event support fields
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS online_link TEXT, -- Meeting link for online events
ADD COLUMN IF NOT EXISTS online_password TEXT, -- Optional password for online events
ADD COLUMN IF NOT EXISTS address TEXT; -- Physical address for in-person events

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_events_is_online ON public.events(is_online);

-- Add comments for documentation
COMMENT ON COLUMN public.events.is_online IS 'Whether this event is online or in-person';
COMMENT ON COLUMN public.events.online_link IS 'Meeting link (Zoom, Teams, etc.) for online events';
COMMENT ON COLUMN public.events.online_password IS 'Optional password for online event meetings';
COMMENT ON COLUMN public.events.address IS 'Physical address for in-person events';


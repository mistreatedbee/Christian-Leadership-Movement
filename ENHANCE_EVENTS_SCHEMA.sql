-- =====================================================
-- ENHANCE EVENTS SCHEMA FOR ADVANCED EVENT MANAGEMENT
-- =====================================================

-- Add registration fee fields to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS has_registration_fee BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Add registration data and payment fields to event_registrations
ALTER TABLE public.event_registrations
ADD COLUMN IF NOT EXISTS registration_data JSONB,
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_status ON public.event_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_id ON public.event_registrations(payment_id);
CREATE INDEX IF NOT EXISTS idx_events_has_registration_fee ON public.events(has_registration_fee);

-- Add comment for documentation
COMMENT ON COLUMN public.events.has_registration_fee IS 'Whether this event requires a registration fee';
COMMENT ON COLUMN public.events.registration_fee IS 'Registration fee amount in ZAR';
COMMENT ON COLUMN public.events.images IS 'Array of image URLs and keys for event gallery';
COMMENT ON COLUMN public.event_registrations.registration_data IS 'JSONB object containing user registration form data (name, surname, email, phone, etc.)';
COMMENT ON COLUMN public.event_registrations.payment_id IS 'Reference to payment record if registration fee was paid';
COMMENT ON COLUMN public.event_registrations.payment_status IS 'Payment status: pending, paid, failed, or refunded';


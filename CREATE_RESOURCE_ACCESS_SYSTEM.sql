-- CREATE RESOURCE ACCESS SYSTEM
-- This migration creates tables and logic for automatic resource access management

-- Table to track user access to different programs/resources
CREATE TABLE IF NOT EXISTS public.user_program_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  program_type VARCHAR(50) NOT NULL CHECK (program_type IN ('bible_school', 'membership', 'course')),
  program_id UUID, -- For courses, this is the course_id. For bible_school/membership, this is NULL
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  access_granted_at TIMESTAMPTZ DEFAULT NOW(),
  access_granted_by UUID REFERENCES public.users(id), -- Admin who approved (or system for auto-approval)
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- Optional: for time-limited access
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, program_type, program_id) -- One access record per user per program
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_program_access_user_id ON public.user_program_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_program_access_program ON public.user_program_access(program_type, program_id);
CREATE INDEX IF NOT EXISTS idx_user_program_access_active ON public.user_program_access(user_id, is_active) WHERE is_active = true;

-- Table to track access history/audit log
CREATE TABLE IF NOT EXISTS public.access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  program_type VARCHAR(50) NOT NULL,
  program_id UUID,
  action VARCHAR(50) NOT NULL CHECK (action IN ('granted', 'revoked', 'expired', 'renewed')),
  performed_by UUID REFERENCES public.users(id), -- NULL for system actions
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_audit_user ON public.access_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_access_audit_program ON public.access_audit_log(program_type, program_id);

-- Function to automatically grant access when application is approved
CREATE OR REPLACE FUNCTION public.grant_program_access()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_program_type VARCHAR(50);
  v_program_id UUID;
  v_payment_status VARCHAR(20);
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    v_user_id := NEW.user_id;
    v_program_type := NEW.program_type;
    v_payment_status := NEW.payment_status;
    
    -- For course applications, get the course_id
    IF v_program_type = 'course' THEN
      -- Check if this is a course application (from course_applications table)
      SELECT course_id INTO v_program_id
      FROM public.course_applications
      WHERE user_id = v_user_id
      AND status = 'approved'
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;
    
    -- Only grant access if payment is confirmed (for paid programs)
    -- For free programs, grant access immediately
    IF v_payment_status = 'confirmed' OR v_payment_status IS NULL OR v_payment_status = '' THEN
      -- Check if access already exists
      IF NOT EXISTS (
        SELECT 1 FROM public.user_program_access
        WHERE user_id = v_user_id
        AND program_type = v_program_type
        AND (program_id = v_program_id OR (program_id IS NULL AND v_program_id IS NULL))
        AND is_active = true
      ) THEN
        -- Grant access
        INSERT INTO public.user_program_access (
          user_id,
          program_type,
          program_id,
          application_id,
          access_granted_by,
          is_active
        ) VALUES (
          v_user_id,
          v_program_type,
          v_program_id,
          NEW.id,
          NULL, -- System auto-grant
          true
        );
        
        -- Log the access grant
        INSERT INTO public.access_audit_log (
          user_id,
          program_type,
          program_id,
          action,
          performed_by,
          reason
        ) VALUES (
          v_user_id,
          v_program_type,
          v_program_id,
          'granted',
          NULL,
          'Automatic access grant upon application approval'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to grant access when application is approved
DROP TRIGGER IF EXISTS trigger_grant_program_access ON public.applications;
CREATE TRIGGER trigger_grant_program_access
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved'))
  EXECUTE FUNCTION public.grant_program_access();

-- Function to grant access when payment is confirmed (for already approved applications)
CREATE OR REPLACE FUNCTION public.grant_access_on_payment_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_application RECORD;
  v_program_id UUID;
BEGIN
  -- Only proceed if payment status changed to 'confirmed'
  IF NEW.payment_status = 'confirmed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'confirmed') THEN
    -- Get the application details
    SELECT * INTO v_application
    FROM public.applications
    WHERE id = NEW.id;
    
    -- Only grant access if application is also approved
    IF v_application.status = 'approved' THEN
      -- For course applications, get the course_id
      IF v_application.program_type = 'course' THEN
        SELECT course_id INTO v_program_id
        FROM public.course_applications
        WHERE user_id = v_application.user_id
        AND status = 'approved'
        ORDER BY created_at DESC
        LIMIT 1;
      END IF;
      
      -- Check if access already exists
      IF NOT EXISTS (
        SELECT 1 FROM public.user_program_access
        WHERE user_id = v_application.user_id
        AND program_type = v_application.program_type
        AND (program_id = v_program_id OR (program_id IS NULL AND v_program_id IS NULL))
        AND is_active = true
      ) THEN
        -- Grant access
        INSERT INTO public.user_program_access (
          user_id,
          program_type,
          program_id,
          application_id,
          access_granted_by,
          is_active
        ) VALUES (
          v_application.user_id,
          v_application.program_type,
          v_program_id,
          v_application.id,
          NULL, -- System auto-grant
          true
        );
        
        -- Log the access grant
        INSERT INTO public.access_audit_log (
          user_id,
          program_type,
          program_id,
          action,
          performed_by,
          reason
        ) VALUES (
          v_application.user_id,
          v_application.program_type,
          v_program_id,
          'granted',
          NULL,
          'Automatic access grant upon payment confirmation'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to grant access when payment is confirmed
DROP TRIGGER IF EXISTS trigger_grant_access_on_payment ON public.applications;
CREATE TRIGGER trigger_grant_access_on_payment
  AFTER UPDATE OF payment_status ON public.applications
  FOR EACH ROW
  WHEN (NEW.payment_status = 'confirmed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'confirmed'))
  EXECUTE FUNCTION public.grant_access_on_payment_confirmed();

-- Function to handle course application approvals
CREATE OR REPLACE FUNCTION public.grant_course_access()
RETURNS TRIGGER AS $$
DECLARE
  v_payment_status VARCHAR(20);
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get payment status from course_applications
    v_payment_status := NEW.payment_status;
    
    -- Only grant access if payment is confirmed (for paid courses)
    IF v_payment_status = 'confirmed' OR v_payment_status IS NULL OR v_payment_status = '' THEN
      -- Check if access already exists
      IF NOT EXISTS (
        SELECT 1 FROM public.user_program_access
        WHERE user_id = NEW.user_id
        AND program_type = 'course'
        AND program_id = NEW.course_id
        AND is_active = true
      ) THEN
        -- Grant access
        INSERT INTO public.user_program_access (
          user_id,
          program_type,
          program_id,
          application_id,
          access_granted_by,
          is_active
        ) VALUES (
          NEW.user_id,
          'course',
          NEW.course_id,
          NEW.id,
          NULL, -- System auto-grant
          true
        );
        
        -- Log the access grant
        INSERT INTO public.access_audit_log (
          user_id,
          program_type,
          program_id,
          action,
          performed_by,
          reason
        ) VALUES (
          NEW.user_id,
          'course',
          NEW.course_id,
          'granted',
          NULL,
          'Automatic access grant upon course application approval'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for course application approvals
DROP TRIGGER IF EXISTS trigger_grant_course_access ON public.course_applications;
CREATE TRIGGER trigger_grant_course_access
  AFTER UPDATE OF status ON public.course_applications
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved'))
  EXECUTE FUNCTION public.grant_course_access();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on user_program_access
DROP TRIGGER IF EXISTS update_user_program_access_updated_at ON public.user_program_access;
CREATE TRIGGER update_user_program_access_updated_at
  BEFORE UPDATE ON public.user_program_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_program_access
ALTER TABLE public.user_program_access ENABLE ROW LEVEL SECURITY;

-- Users can view their own access
DROP POLICY IF EXISTS "Users can view their own access" ON public.user_program_access;
CREATE POLICY "Users can view their own access"
  ON public.user_program_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all access
DROP POLICY IF EXISTS "Admins can view all access" ON public.user_program_access;
CREATE POLICY "Admins can view all access"
  ON public.user_program_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- Admins can manage access
DROP POLICY IF EXISTS "Admins can manage access" ON public.user_program_access;
CREATE POLICY "Admins can manage access"
  ON public.user_program_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- RLS Policies for access_audit_log
ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit log
DROP POLICY IF EXISTS "Users can view their own audit log" ON public.access_audit_log;
CREATE POLICY "Users can view their own audit log"
  ON public.access_audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all audit logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.access_audit_log;
CREATE POLICY "Admins can view all audit logs"
  ON public.access_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- Comments
COMMENT ON TABLE public.user_program_access IS 'Tracks user access to programs (Bible School, Membership, Courses). Access is automatically granted when application is approved and payment is confirmed.';
COMMENT ON TABLE public.access_audit_log IS 'Audit log for all access grants, revocations, and changes.';
COMMENT ON FUNCTION public.grant_program_access() IS 'Automatically grants program access when application status changes to approved and payment is confirmed.';
COMMENT ON FUNCTION public.grant_access_on_payment_confirmed() IS 'Grants access when payment is confirmed for already-approved applications.';
COMMENT ON FUNCTION public.grant_course_access() IS 'Automatically grants course access when course application is approved and payment is confirmed.';


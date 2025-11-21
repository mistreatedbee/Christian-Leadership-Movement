-- =====================================================
-- UNIVERSITY OF PRETORIA COURSES SETUP
-- Centre for Faith and Community Partnership
-- =====================================================

-- Add field to courses table to mark UP-endorsed courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS is_up_endorsed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS partner_institution TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS level TEXT;

-- Create index for UP-endorsed courses
CREATE INDEX IF NOT EXISTS idx_courses_up_endorsed ON public.courses(is_up_endorsed);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);

-- Insert University of Pretoria Endorsed Courses
-- These 7 courses are endorsed by Enterprises@UP and facilitated by Centre for Faith and Community

INSERT INTO public.courses (
  title,
  description,
  instructor,
  is_up_endorsed,
  partner_institution,
  category,
  duration,
  level
) VALUES
(
  'From Victims to Agents',
  'This transformative course empowers individuals to move from victimhood to agency, developing resilience, self-advocacy skills, and the ability to create positive change in their communities. Participants learn to identify their strengths, overcome trauma, and become active agents of transformation.',
  'Centre for Faith and Community, University of Pretoria',
  true,
  'University of Pretoria - Centre for Faith and Community',
  'Community Development',
  '8-12 weeks',
  'Intermediate'
),
(
  'Starting and Sustaining Community Projects',
  'Learn the essential skills needed to initiate, plan, and maintain successful community projects. This comprehensive course covers project planning, resource mobilization, stakeholder engagement, sustainability strategies, and effective project management for community initiatives.',
  'Centre for Faith and Community, University of Pretoria',
  true,
  'University of Pretoria - Centre for Faith and Community',
  'Community Development',
  '10-14 weeks',
  'Intermediate'
),
(
  'Radio Ministry',
  'Master the art of effective radio ministry and broadcasting. This course provides training in scriptwriting, voice techniques, program planning, audience engagement, and using radio as a powerful tool for ministry, community outreach, and spiritual communication.',
  'Centre for Faith and Community, University of Pretoria',
  true,
  'University of Pretoria - Centre for Faith and Community',
  'Ministry & Communication',
  '8-10 weeks',
  'Beginner to Intermediate'
),
(
  'Pastoral Care',
  'Develop essential skills in providing compassionate pastoral care and support. This course covers counseling techniques, crisis intervention, grief support, spiritual guidance, ethical considerations, and building effective pastoral relationships with individuals and families.',
  'Centre for Faith and Community, University of Pretoria',
  true,
  'University of Pretoria - Centre for Faith and Community',
  'Ministry & Care',
  '12-16 weeks',
  'Intermediate to Advanced'
),
(
  'Crisis and Trauma Support',
  'Learn to provide effective support to individuals and communities experiencing crisis and trauma. This course covers trauma-informed care, crisis intervention strategies, psychological first aid, community resilience building, and supporting recovery processes.',
  'Centre for Faith and Community, University of Pretoria',
  true,
  'University of Pretoria - Centre for Faith and Community',
  'Care & Support',
  '10-12 weeks',
  'Intermediate'
),
(
  'Early Childhood Development',
  'Gain comprehensive knowledge and skills in early childhood development and education. This course covers child development stages, learning theories, age-appropriate activities, creating safe learning environments, and supporting the holistic development of young children.',
  'Centre for Faith and Community, University of Pretoria',
  true,
  'University of Pretoria - Centre for Faith and Community',
  'Education & Development',
  '12-14 weeks',
  'Beginner to Intermediate'
),
(
  'Peace Building',
  'Learn strategies and techniques for building peace in communities and resolving conflicts constructively. This course covers conflict analysis, mediation skills, dialogue facilitation, reconciliation processes, and sustainable peacebuilding approaches for community transformation.',
  'Centre for Faith and Community, University of Pretoria',
  true,
  'University of Pretoria - Centre for Faith and Community',
  'Community Development',
  '10-12 weeks',
  'Intermediate'
)
ON CONFLICT DO NOTHING;

-- Add RLS policies for UP courses (they should be publicly viewable)
-- Note: Access control can be managed through enrollment system

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- The 7 University of Pretoria endorsed courses have been added
-- These courses are facilitated by the Centre for Faith and Community
-- and endorsed by Enterprises@UP
-- =====================================================


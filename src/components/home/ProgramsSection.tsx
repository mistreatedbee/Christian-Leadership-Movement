import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { Button } from '../ui/Button';
import { insforge } from '../../lib/insforge';
import { GraduationCap, Award, Lock, CheckCircle, Users, Target, ArrowRight, FileText } from 'lucide-react';

interface Program {
  id: string;
  name: string; // Database uses 'name', not 'title'
  description: string | null;
  type: string;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  is_up_endorsed: boolean;
  category: string | null;
}

export function ProgramsSection() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [upCourses, setUpCourses] = useState<Course[]>([]);
  const [hasMembership, setHasMembership] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch only Bible School and Membership programs
        const programsPromise = insforge.database
          .from('programs')
          .select('*')
          .in('type', ['bible_school', 'membership'])
          .order('created_at', { ascending: false });

        // Fetch UP courses
        const coursesPromise = insforge.database
          .from('courses')
          .select('id, title, description, is_up_endorsed, category')
          .eq('is_up_endorsed', true)
          .order('created_at', { ascending: false })
          .limit(1);

        const [programsResult, coursesResult] = await Promise.all([
          programsPromise,
          coursesPromise
        ]);

        if (programsResult.error) throw programsResult.error;
        setPrograms(programsResult.data || []);

        if (coursesResult.error) throw coursesResult.error;
        setUpCourses(coursesResult.data || []);

        // Check membership if user is logged in
        if (user) {
          const { data: membership } = await insforge.database
            .from('applications')
            .select('status')
            .eq('user_id', user.id)
            .eq('program_type', 'membership')
            .eq('status', 'approved')
            .eq('payment_status', 'confirmed')
            .maybeSingle();

          setHasMembership(!!membership);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setPrograms([]);
        setUpCourses([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  return <section className="py-16 bg-muted-gray">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-ink mb-4">
            Our Programs
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Transformative educational experiences designed to equip and empower
            Christian leaders.
          </p>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading programs...</p>
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No programs available at the moment.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* University of Pretoria Courses Card */}
            {upCourses.length > 0 && (
              <div className="bg-white rounded-card overflow-hidden shadow-soft hover:shadow-lg transition-all border-2 border-blue-200">
                <div className="h-48 overflow-hidden bg-gradient-to-r from-navy-ink to-brand-dark-blue relative">
                  <Award className="absolute top-3 right-3 w-6 h-6 text-gold" />
                  <div className="w-full h-full flex items-center justify-center">
                    <GraduationCap className="w-16 h-16 text-white/30" />
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-2">
                    <span className="px-3 py-1 bg-gold text-white rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                      <Award className="w-3 h-3" />
                      UP Endorsed
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-navy-ink mb-2">
                    University of Pretoria Courses
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Endorsed by Enterprises@UP and facilitated by the Centre for Faith and Community. 
                    {!hasMembership && (
                      <span className="block mt-2 text-amber-600 font-medium">
                        <Lock className="w-3 h-3 inline mr-1" />
                        CLM Membership Required
                      </span>
                    )}
                  </p>
                  <Button 
                    href="/programs?up_courses=true" 
                    variant="primary"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/programs?up_courses=true');
                    }}
                  >
                    View Courses
                  </Button>
                </div>
              </div>
            )}

            {/* Bible School Program */}
            {programs.find(p => p.type === 'bible_school') && (
              <div className="bg-white rounded-card overflow-hidden shadow-soft hover:shadow-lg transition-all">
                <div className="h-48 overflow-hidden bg-gradient-to-r from-brand-dark-blue to-navy-ink relative">
                  <GraduationCap className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 text-white/30" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-navy-ink mb-3">
                    Bible School Program
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    Comprehensive theological education and leadership training designed to equip Christian leaders 
                    for effective ministry and service. This program provides in-depth biblical studies, practical 
                    ministry skills, and leadership development.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        <strong>Application Required:</strong> You need to complete the application form to enroll.
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="primary"
                    className="w-full"
                    onClick={() => navigate('/programs/bible-school')}
                  >
                    View Program
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Membership Program */}
            {programs.find(p => p.type === 'membership') && (
              <div className="bg-white rounded-card overflow-hidden shadow-soft hover:shadow-lg transition-all">
                <div className="h-48 overflow-hidden bg-gradient-to-r from-gold to-amber-500 relative">
                  <Users className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 text-white/30" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-navy-ink mb-3">
                    CLM Membership Program
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    Join the Christian Leadership Movement and gain access to all resources, courses, and community 
                    benefits. Membership provides exclusive access to educational materials, UP-endorsed courses, 
                    mentorship programs, and a supportive community.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        <strong>Application Required:</strong> You need to complete the membership application form to join.
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="primary"
                    className="w-full"
                    onClick={() => navigate('/programs/membership')}
                  >
                    View Program
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Mentorship Program Card */}
            <div className="bg-white rounded-card overflow-hidden shadow-soft hover:shadow-lg transition-all">
              <div className="h-48 overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-600 relative">
                <Target className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 text-white/30" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-navy-ink mb-3">
                  Mentorship Program
                </h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  Connect with experienced mentors and grow in your leadership journey. Our mentorship program pairs 
                  you with seasoned Christian leaders who provide guidance, support, and wisdom to help you develop 
                  your calling and ministry skills.
                </p>
                <Button 
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate('/mentorship')}
                >
                  View Mentorship Program
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
        </div>
        )}
        <div className="mt-12 text-center">
          <Button href="/programs" variant="secondary" size="lg">
            View All Programs
          </Button>
        </div>
      </div>
    </section>;
}
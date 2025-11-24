import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { Users, BookOpen, Award, CheckCircle, ArrowRight, ArrowLeft, FileText, Lock, Unlock, Download, Clock } from 'lucide-react';
import { getStorageUrl } from '../lib/connection';

interface Program {
  id: string;
  name: string;
  description: string | null;
  type: string;
}

export function MembershipProgramPage() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [program, setProgram] = useState<Program | null>(null);
  const [hasMembership, setHasMembership] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    fetchProgram();
    if (user) {
      checkMembership();
    }
    fetchQuizzes();
    fetchResources();
  }, [user, program]);

  const fetchProgram = async () => {
    try {
      const { data, error } = await insforge.database
        .from('programs')
        .select('*')
        .eq('type', 'membership')
        .maybeSingle();

      if (error) throw error;
      setProgram(data);
    } catch (err) {
      console.error('Error fetching program:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkMembership = async () => {
    if (!user) return;

    try {
      const { data } = await insforge.database
        .from('applications')
        .select('status')
        .eq('user_id', user.id)
        .eq('program_type', 'membership')
        .eq('status', 'approved')
        .eq('payment_status', 'confirmed')
        .maybeSingle();

      setHasMembership(!!data);
    } catch (err) {
      console.error('Error checking membership:', err);
    }
  };

  const handleApply = () => {
    if (!user) {
      navigate('/login?redirect=/apply?type=membership');
      return;
    }
    navigate('/apply?type=membership');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow bg-muted-gray">
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-ink to-brand-dark-blue text-white py-16">
          <div className="container mx-auto px-4">
            <Button
              variant="secondary"
              onClick={() => navigate('/')}
              className="mb-6 bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-white/20 p-4 rounded-full">
                <Users className="w-12 h-12" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">CLM Membership Program</h1>
                <p className="text-lg text-blue-100">
                  Full membership with access to all resources and benefits
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* About Section */}
          <div className="bg-white rounded-card shadow-soft p-8 mb-8">
            <h2 className="text-3xl font-bold text-navy-ink mb-4 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-gold" />
              About Membership
            </h2>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-4 leading-relaxed">
                {program?.description || 'Join the Christian Leadership Movement and gain access to all resources, courses, and community benefits. Membership provides you with exclusive access to our comprehensive library of educational materials, University of Pretoria endorsed courses, mentorship programs, and a supportive community of Christian leaders.'}
              </p>
              <p className="text-gray-600 leading-relaxed">
                As a CLM member, you become part of a vibrant community dedicated to equipping and empowering 
                Christian leaders for effective ministry. Our membership program is designed to support your 
                growth, provide valuable resources, and connect you with like-minded individuals on similar journeys.
              </p>
            </div>
          </div>

          {/* Why Apply Section */}
          <div className="bg-gradient-to-r from-gold to-amber-500 text-white rounded-card shadow-soft p-8 mb-8">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-8 h-8" />
              Why Become a CLM Member?
            </h2>
            <p className="text-lg text-amber-50 mb-6">
              Unlock unlimited access to resources, courses, and a supportive community of Christian leaders. Your membership opens doors to transformation and growth.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-navy-ink flex-shrink-0 mt-1" />
                <p className="text-amber-50">Access all University of Pretoria endorsed courses</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-navy-ink flex-shrink-0 mt-1" />
                <p className="text-amber-50">Join a vibrant community of Christian leaders</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-navy-ink flex-shrink-0 mt-1" />
                <p className="text-amber-50">Get exclusive access to premium resources</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-navy-ink flex-shrink-0 mt-1" />
                <p className="text-amber-50">Participate in mentorship programs</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-navy-ink flex-shrink-0 mt-1" />
                <p className="text-amber-50">Attend exclusive events and workshops</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-navy-ink flex-shrink-0 mt-1" />
                <p className="text-amber-50">Earn certificates and recognition</p>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-white rounded-card shadow-soft p-8 mb-8">
            <h2 className="text-3xl font-bold text-navy-ink mb-6 flex items-center gap-2">
              <Award className="w-8 h-8 text-gold" />
              Exclusive Membership Benefits
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-4 bg-gold/5 rounded-lg">
                <div className="bg-gold/20 p-3 rounded-lg">
                  <BookOpen className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-ink mb-2">Full Course Access</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Unlimited access to all University of Pretoria endorsed courses, Bible School programs, and specialized training courses.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• All UP-endorsed courses included</li>
                    <li>• Self-paced learning options</li>
                    <li>• Progress tracking and certificates</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="bg-brand-dark-blue/20 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-brand-dark-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-ink mb-2">Community & Networking</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Join forums, discussion groups, and connect with Christian leaders from around the world.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Private member forums</li>
                    <li>• Networking events and meetups</li>
                    <li>• Peer support and collaboration</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <div className="bg-green-500/20 p-3 rounded-lg">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-ink mb-2">Premium Resource Library</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Access thousands of documents, videos, audio resources, study guides, and educational materials.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Downloadable study materials</li>
                    <li>• Video and audio content library</li>
                    <li>• Exclusive member-only resources</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                <div className="bg-purple-500/20 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-ink mb-2">Mentorship Programs</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Get matched with experienced mentors who provide guidance, support, and wisdom for your leadership journey.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• One-on-one mentorship matching</li>
                    <li>• Regular mentorship sessions</li>
                    <li>• Career and ministry guidance</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-lg">
                <div className="bg-orange-500/20 p-3 rounded-lg">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-ink mb-2">Exclusive Events & Workshops</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Priority access to conferences, workshops, training sessions, and member-only events.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Early registration for events</li>
                    <li>• Member-only workshops</li>
                    <li>• Discounted event tickets</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-lg">
                <div className="bg-indigo-500/20 p-3 rounded-lg">
                  <Award className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-ink mb-2">Certificates & Recognition</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Earn certificates for completed courses, achievements, and milestones in your leadership journey.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Course completion certificates</li>
                    <li>• Achievement badges and recognition</li>
                    <li>• Professional development credits</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Resources & Materials Section */}
          <div className="bg-white rounded-card shadow-soft p-8 mb-8">
            <h2 className="text-3xl font-bold text-navy-ink mb-6 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-gold" />
              Resources & Materials You'll Get
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-gold pl-4">
                <h3 className="font-bold text-navy-ink mb-3">📚 Educational Resources</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Complete access to all course materials and textbooks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Study guides, notes, and supplementary materials</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Digital library with theological and ministry resources</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Research papers and academic articles</span>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-brand-dark-blue pl-4">
                <h3 className="font-bold text-navy-ink mb-3">🎥 Multimedia Content</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Video lectures and teaching series</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Audio sermons, podcasts, and interviews</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Interactive online courses and webinars</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Documentary films and ministry case studies</span>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-bold text-navy-ink mb-3">📝 Practical Tools</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Sermon preparation templates and outlines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Ministry planning worksheets and checklists</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Leadership development resources</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Counseling and pastoral care guides</span>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-bold text-navy-ink mb-3">👥 Community & Support</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Access to private member forums and groups</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Monthly member newsletters and updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Priority customer support and assistance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Networking opportunities and member directory</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Application Requirement */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-card p-6 mb-8">
            <div className="flex items-start gap-4">
              <FileText className="w-8 h-8 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-amber-900 mb-2">Application Required</h3>
                <p className="text-amber-800 mb-4">
                  To become a CLM member, you need to complete the membership application form. 
                  The application process includes providing personal information, ministry involvement, 
                  qualifications, and references.
                </p>
                <p className="text-amber-800 font-medium">
                  Click the "Apply Now" button below to start your membership application.
                </p>
              </div>
            </div>
          </div>

          {/* Membership Status */}
          {hasMembership && (
            <div className="bg-green-50 border-2 border-green-200 rounded-card p-6 mb-8">
              <div className="flex items-center gap-4">
                <Unlock className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="text-xl font-bold text-green-900 mb-2">You are a CLM Member!</h3>
                  <p className="text-green-800">
                    You have full access to all membership benefits and resources.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Apply Button */}
          <div className="text-center">
            {!hasMembership ? (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleApply}
                  className="px-8 py-4 text-lg"
                >
                  Apply Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                {!user && (
                  <p className="text-gray-600 mt-4 text-sm">
                    You'll need to log in to complete the application
                  </p>
                )}
              </>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/dashboard')}
                className="px-8 py-4 text-lg"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>

          {/* Resources Section */}
          {hasMembership && resources.length > 0 && (
            <div className="bg-white rounded-card shadow-soft p-8 mb-8">
              <h2 className="text-3xl font-bold text-navy-ink mb-6 flex items-center gap-2">
                <BookOpen className="w-8 h-8 text-gold" />
                Membership Resources
              </h2>
              <p className="text-gray-600 mb-6">
                Access exclusive resources, materials, and links available to CLM members.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map(resource => {
                  const hasDownload = resource.file_url || resource.external_link;
                  return (
                    <div key={resource.id} className="bg-white border border-gray-200 rounded-card p-6 hover:border-gold transition-all shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-navy-ink text-lg">{resource.title}</h3>
                        <FileText className="text-blue-500 flex-shrink-0" size={20} />
                      </div>
                      {resource.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">{resource.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mb-4">
                        <span className="px-2 py-1 bg-gray-100 rounded">{resource.resource_type}</span>
                        {resource.is_featured && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Featured</span>
                        )}
                        <span>Downloads: {resource.download_count || 0}</span>
                      </div>
                      {hasDownload && (
                        <Button 
                          variant="primary" 
                          className="w-full"
                          onClick={() => handleDownloadResource(resource)}
                        >
                          <Download className="mr-2" size={16} />
                          {resource.external_link ? 'Open Link' : 'Download'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quizzes Section */}
          {quizzes.length > 0 && (
            <div className="bg-white rounded-card shadow-soft p-8 mb-8">
              <h2 className="text-3xl font-bold text-navy-ink mb-6 flex items-center gap-2">
                <BookOpen className="w-8 h-8 text-gold" />
                Membership Program Quizzes
              </h2>
              <p className="text-gray-600 mb-6">
                Test your knowledge and track your progress with these quizzes designed for members.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map(quiz => (
                  <div key={quiz.id} className="bg-white border border-gray-200 rounded-card p-6 hover:border-gold transition-all shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-navy-ink text-lg">{quiz.title}</h3>
                      <BookOpen className="text-blue-500 flex-shrink-0" size={20} />
                    </div>
                    {quiz.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{quiz.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      {quiz.time_limit && (
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{quiz.time_limit} min</span>
                        </div>
                      )}
                      <span>Pass: {quiz.passing_score}%</span>
                    </div>
                    <Link to={`/dashboard/quizzes/${quiz.id}/take`}>
                      <Button variant="primary" className="w-full">
                        Take Quiz <ArrowRight className="ml-2" size={16} />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}


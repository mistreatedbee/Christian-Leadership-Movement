import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';
import { Button } from '../components/ui/Button';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { GraduationCap, BookOpen, Users, Award, CheckCircle, ArrowRight, ArrowLeft, FileText, Shield } from 'lucide-react';
import { getUserRole } from '../lib/auth';

interface Program {
  id: string;
  name: string;
  description: string | null;
  type: string;
}

export function BibleSchoolProgramPage() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchProgram();
    checkAdminStatus();
  }, [user, isLoaded]);

  const checkAdminStatus = async () => {
    if (user) {
      try {
        const role = await getUserRole(user.id);
        setIsAdmin(role === 'admin' || role === 'super_admin');
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    }
  };

  const fetchProgram = async () => {
    try {
      const { data, error } = await insforge.database
        .from('programs')
        .select('*')
        .eq('type', 'bible_school')
        .maybeSingle();

      if (error) throw error;
      setProgram(data);
    } catch (err) {
      console.error('Error fetching program:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!user) {
      navigate('/login?redirect=/apply?type=bible_school');
      return;
    }
    navigate('/apply?type=bible_school');
  };

  const handleAccessResources = () => {
    navigate('/bible-school');
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
                <GraduationCap className="w-12 h-12" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Bible School Program</h1>
                <p className="text-lg text-blue-100">
                  Comprehensive theological education and leadership training
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* About Section */}
          <div className="bg-white rounded-card shadow-soft p-8 mb-8">
            <h2 className="text-3xl font-bold text-navy-ink mb-4 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-brand-dark-blue" />
              About Bible School
            </h2>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-4 leading-relaxed">
                {program?.description || 'Our Bible School program offers comprehensive theological education and leadership training designed to equip Christian leaders for effective ministry and service. This program provides in-depth biblical studies, practical ministry skills, and leadership development.'}
              </p>
              <p className="text-gray-600 leading-relaxed">
                The Bible School program is designed for individuals who are called to Christian leadership and ministry. 
                Through structured coursework, practical training, and mentorship, students develop a strong biblical foundation 
                and the skills necessary to serve effectively in their communities and beyond.
              </p>
            </div>
          </div>

          {/* Why Apply Section */}
          <div className="bg-gradient-to-r from-brand-dark-blue to-navy-ink text-white rounded-card shadow-soft p-8 mb-8">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-8 h-8" />
              Why Apply for Bible School?
            </h2>
            <p className="text-lg text-blue-100 mb-6">
              Transform your calling into effective ministry through comprehensive theological education and practical leadership training.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                <p className="text-blue-50">Develop a deep understanding of Scripture and theology</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                <p className="text-blue-50">Gain practical ministry skills for real-world application</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                <p className="text-blue-50">Build confidence in preaching, teaching, and leadership</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                <p className="text-blue-50">Join a community of like-minded Christian leaders</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                <p className="text-blue-50">Receive recognized certification for your ministry</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-1" />
                <p className="text-blue-50">Access ongoing support and mentorship</p>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-white rounded-card shadow-soft p-8 mb-8">
            <h2 className="text-3xl font-bold text-navy-ink mb-6 flex items-center gap-2">
              <Award className="w-8 h-8 text-gold" />
              What You'll Gain
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="bg-brand-dark-blue/20 p-3 rounded-lg">
                  <BookOpen className="w-6 h-6 text-brand-dark-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-ink mb-2">Comprehensive Biblical Education</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    In-depth study of Old and New Testaments, systematic theology, church history, biblical interpretation, and hermeneutics.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Complete Bible survey and exegesis</li>
                    <li>• Theological foundations and doctrines</li>
                    <li>• Church history and tradition</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gold/5 rounded-lg">
                <div className="bg-gold/20 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-ink mb-2">Practical Ministry Skills</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Hands-on training in pastoral care, preaching, teaching, counseling, worship leadership, and community outreach.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Sermon preparation and delivery</li>
                    <li>• Pastoral counseling techniques</li>
                    <li>• Worship and service planning</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <div className="bg-green-500/20 p-3 rounded-lg">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-ink mb-2">Recognized Certification</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Earn a certificate of completion that validates your theological education and enhances your ministry credentials.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Official CLM Bible School certificate</li>
                    <li>• Enhanced ministry credibility</li>
                    <li>• Recognition in Christian leadership circles</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                <div className="bg-purple-500/20 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-ink mb-2">Mentorship & Support</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Access to experienced pastors and leaders who provide guidance, answer questions, and support your growth.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• One-on-one mentorship sessions</li>
                    <li>• Regular check-ins and feedback</li>
                    <li>• Ongoing support after graduation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Resources & Materials Section */}
          <div className="bg-white rounded-card shadow-soft p-8 mb-8">
            <h2 className="text-3xl font-bold text-navy-ink mb-6 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-brand-dark-blue" />
              Resources & Materials You'll Receive
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-brand-dark-blue pl-4">
                <h3 className="font-bold text-navy-ink mb-3">📚 Study Materials</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Comprehensive course textbooks and study guides</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Digital library access with theological resources</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Biblical commentaries and reference materials</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Study notes and lecture materials</span>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-gold pl-4">
                <h3 className="font-bold text-navy-ink mb-3">🎥 Video & Audio Content</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Recorded lectures and teaching sessions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Video demonstrations of ministry practices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Audio sermons and teaching series</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Interactive online learning modules</span>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-bold text-navy-ink mb-3">📝 Practical Tools</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Sermon preparation templates and guides</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Ministry planning worksheets and checklists</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Counseling resources and frameworks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Leadership assessment tools</span>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-bold text-navy-ink mb-3">👥 Community Access</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Access to student forums and discussion groups</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Networking opportunities with fellow students</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Access to alumni network after graduation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    <span>Regular webinars and Q&A sessions</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Admin Access Notice */}
          {isAdmin && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-card p-6 mb-8">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-blue-900 mb-2">Admin Access</h3>
                  <p className="text-blue-800 mb-4">
                    As an administrator, you have full access to all Bible School resources, studies, classes, meetings, and materials without needing to apply.
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleAccessResources}
                    className="mt-2"
                  >
                    Access Bible School Resources
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Application Requirement */}
          {!isAdmin && (
            <>
              <div className="bg-amber-50 border-2 border-amber-200 rounded-card p-6 mb-8">
                <div className="flex items-start gap-4">
                  <FileText className="w-8 h-8 text-amber-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-amber-900 mb-2">Application Required</h3>
                    <p className="text-amber-800 mb-4">
                      To enroll in the Bible School program, you need to complete the application form. 
                      The application process includes providing personal information, spiritual background, 
                      leadership interests, vision & calling, and references.
                    </p>
                    <p className="text-amber-800 font-medium">
                      Click the "Apply Now" button below to start your application.
                    </p>
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <div className="text-center">
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
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}


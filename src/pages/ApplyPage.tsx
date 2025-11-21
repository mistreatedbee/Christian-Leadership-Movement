import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@insforge/react';
import { Button } from '../components/ui/Button';
import { BookOpen, Users, GraduationCap, ArrowRight, CheckCircle } from 'lucide-react';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

export function ApplyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoaded } = useUser();
  const type = searchParams.get('type');

  // Redirect to specific form if type is provided
  React.useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      navigate('/login?redirect=/apply');
      return;
    }
    if (type === 'membership') {
      navigate('/apply/membership');
      return;
    }
    if (type === 'bible_school' || type === 'bible-school') {
      navigate('/apply/bible-school');
      return;
    }
    if (type === 'short_course' || type === 'short-course') {
      // Short courses require membership - redirect to membership application
      navigate('/apply/membership', { 
        state: { 
          message: 'University of Pretoria courses require CLM membership. Please complete your membership application first.' 
        } 
      });
      return;
    }
  }, [type, user, isLoaded, navigate]);

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow py-12 px-4 bg-muted-gray">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-navy-ink mb-4">
              Application Forms
            </h1>
            <p className="text-lg text-gray-600">
              Choose the application form that applies to you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CLM Membership Application */}
            <div className="bg-white rounded-card shadow-soft p-8 hover:shadow-lg transition-shadow">
              <div className="text-center mb-6">
                <div className="bg-gold/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-gold" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-navy-ink mb-2">
                  CLM Membership Application
                </h2>
                <p className="text-gray-600">
                  3-step application form for Christian Leadership Movement membership
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-2 mt-1" size={20} />
                  <span className="text-sm text-gray-600">Personal Information</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-2 mt-1" size={20} />
                  <span className="text-sm text-gray-600">Ministry Involvement</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-2 mt-1" size={20} />
                  <span className="text-sm text-gray-600">Qualifications & References</span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate('/apply/membership')}
              >
                Start Membership Application
                <ArrowRight className="ml-2" size={16} />
              </Button>
            </div>

            {/* Bible School / Ordination Application */}
            <div className="bg-white rounded-card shadow-soft p-8 hover:shadow-lg transition-shadow">
              <div className="text-center mb-6">
                <div className="bg-brand-dark-blue/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="text-brand-dark-blue" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-navy-ink mb-2">
                  Bible School / Ordination Application
                </h2>
                <p className="text-gray-600">
                  5-step application form for Bible School and Ordination programs
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-2 mt-1" size={20} />
                  <span className="text-sm text-gray-600">Personal Information</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-2 mt-1" size={20} />
                  <span className="text-sm text-gray-600">Spiritual Background</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-2 mt-1" size={20} />
                  <span className="text-sm text-gray-600">Leadership Interests</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-2 mt-1" size={20} />
                  <span className="text-sm text-gray-600">Vision & Calling</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="text-green-500 mr-2 mt-1" size={20} />
                  <span className="text-sm text-gray-600">References & Fees</span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate('/apply/bible-school')}
              >
                Start Bible School Application
                <ArrowRight className="ml-2" size={16} />
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { MissionSection } from '../components/home/MissionSection';
import { StrategicObjectivesSection } from '../components/home/StrategicObjectivesSection';
import { BookOpen, Users, Award, Heart, Globe, Shield } from 'lucide-react';
import { insforge } from '../lib/insforge';

export function AboutPage() {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<{
    vision?: string;
    mission?: string;
    about?: string;
  }>({});

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await insforge.database
        .from('content_sections')
        .select('*')
        .in('section_type', ['vision', 'mission', 'about']);

      if (error) throw error;

      const contentMap: any = {};
      data?.forEach((section: any) => {
        contentMap[section.section_type] = section.content;
      });

      setContent(contentMap);
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-grow flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-navy-ink to-brand-dark-blue text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">About Us</h1>
            <p className="text-lg text-blue-100 text-center max-w-3xl mx-auto">
              Empowering Christian leaders to transform communities through faith, education, and service.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Mission & Vision */}
          <MissionSection />

          {/* Strategic Objectives */}
          <StrategicObjectivesSection />

          {/* Values Section */}
          <div className="bg-white rounded-card shadow-soft p-8 mb-8">
            <h2 className="text-3xl font-bold text-navy-ink mb-6 text-center">Our Core Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-navy-ink mb-2">Faith-Centered</h3>
                <p className="text-gray-600">
                  Everything we do is rooted in biblical principles and Christian values.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-navy-ink mb-2">Community-Focused</h3>
                <p className="text-gray-600">
                  We believe in building strong, supportive communities of leaders.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-navy-ink mb-2">Excellence in Education</h3>
                <p className="text-gray-600">
                  We provide high-quality theological and leadership training.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-navy-ink mb-2">Integrity</h3>
                <p className="text-gray-600">
                  We operate with honesty, transparency, and ethical standards.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-navy-ink mb-2">Impact</h3>
                <p className="text-gray-600">
                  We measure success by the positive transformation in communities.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-navy-ink mb-2">Service</h3>
                <p className="text-gray-600">
                  We serve others with humility, compassion, and dedication.
                </p>
              </div>
            </div>
          </div>

          {/* Additional About Content */}
          {content.about && (
            <div className="bg-white rounded-card shadow-soft p-8">
              <h2 className="text-3xl font-bold text-navy-ink mb-6">More About Us</h2>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content.about }} />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}


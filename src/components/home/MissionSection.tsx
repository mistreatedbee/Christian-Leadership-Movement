import React, { useEffect, useState } from 'react';
import { BookOpen, Users, Award, Globe, Book, UserCheck, Shield } from 'lucide-react';
import { insforge } from '../../lib/insforge';

interface ContentSection {
  section_type: string;
  title: string | null;
  content: string;
}

interface StrategicObjective {
  title: string;
  description: string;
}

const objectiveIcons = [BookOpen, Users, Award, Globe, Book, UserCheck, Shield];

export function MissionSection() {
  const [vision, setVision] = useState<string>('');
  const [mission, setMission] = useState<string>('');
  const [strategicObjectives, setStrategicObjectives] = useState<StrategicObjective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const fetchPromise = insforge.database
          .from('content_sections')
          .select('*');
        
        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        if (error) throw error;
        
        data?.forEach((section: ContentSection) => {
          if (section.section_type === 'vision') {
            setVision(section.content);
          } else if (section.section_type === 'mission') {
            setMission(section.content);
          } else if (section.section_type === 'strategic_objectives') {
            // Parse strategic objectives - each line should be "Title: Description"
            const objectives = section.content.split('\n').filter(obj => obj.trim()).map(obj => {
              const parts = obj.split(':');
              if (parts.length >= 2) {
                return {
                  title: parts[0].trim(),
                  description: parts.slice(1).join(':').trim()
                };
              }
              // If no colon, treat entire line as title
              return {
                title: obj.trim(),
                description: ''
              };
            });
            setStrategicObjectives(objectives);
          }
        });
      } catch (err: any) {
        console.error('Error fetching content:', err);
        // Fallback content - page will still render
        setVision('To raise, equip, and empower Christ-centered leaders who transform their communities and nations through servant leadership, integrity, and the power of the Holy Spirit.');
        setMission('To develop and empower Christian leaders who transform communities through faith, integrity, and servant leadership.');
        setStrategicObjectives([
          {
            title: 'Leadership Development and Training',
            description: 'Establish training programs, workshops, and schools that equip emerging and established leaders in biblical leadership, character formation, and ministry excellence.'
          },
          {
            title: 'Mentorship and Discipleship Networks',
            description: 'Build mentorship platforms connecting seasoned leaders with the next generation for spiritual, moral, and practical growth.'
          },
          {
            title: 'Community Transformation Initiatives',
            description: 'Launch community-based projects that address spiritual, social, and economic needs through the application of godly leadership principles.'
          },
          {
            title: 'Global Kingdom Partnerships',
            description: 'Create alliances with local and international ministries, educational institutions, and mission organizations to advance the cause of Christ globally.'
          },
          {
            title: 'Leadership Resources and Publications',
            description: 'Develop books, manuals, devotionals, and online content that promote biblical leadership and inspire ongoing personal development.'
          },
          {
            title: 'Empowering the Next Generation',
            description: 'Focus on youth and emerging leaders through leadership academies, conferences, and mentorship movements that raise future Kingdom influencers.'
          },
          {
            title: 'Advocacy for Godly Governance and Ethics',
            description: 'Encourage ethical leadership and moral integrity in public life and governance guided by biblical truth.'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, []);
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading content...</p>
          </div>
        ) : (
          <>
            {/* Vision & Mission */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-ink mb-4">
            Our Vision
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-6">
                {vision || 'To raise, equip, and empower Christ-centered leaders who transform their communities and nations through servant leadership, integrity, and the power of the Holy Spirit.'}
          </p>
          <p className="text-md italic text-gray-500 max-w-2xl mx-auto">
            <strong>Scriptural Foundation:</strong> 2 Timothy 2:2 – "And the things that you have heard from me among many witnesses, commit these to faithful men who will be able to teach others also."
          </p>
          <div className="mt-8 p-6 bg-gold/10 rounded-card border-2 border-gold">
            <p className="text-xl font-bold text-navy-ink text-center">
              OUR MOTTO: TRANSFORM LEADERS!!!!!!!!TRANSFORM THE NATIONS!!!!!!!!
            </p>
          </div>
        </div>

        {/* Strategic Objectives */}
            {strategicObjectives.length > 0 && (
              <>
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-navy-ink mb-4">
                    Strategic Objectives
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {strategicObjectives.map((obj, idx) => {
                    const Icon = objectiveIcons[idx % objectiveIcons.length];
                    return (
                      <div
                        key={idx}
                        className="bg-white p-6 rounded-card shadow-soft hover:shadow-lg transition-shadow border-l-4 border-gold"
                      >
                        <div className="flex items-start space-x-4 mb-4">
                          <div className="bg-gold/10 p-3 rounded-full w-14 h-14 flex items-center justify-center flex-shrink-0">
                            <Icon size={28} className="text-gold" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-navy-ink mb-2">
                              {obj.title}
                            </h3>
                            {obj.description && (
                              <p className="text-gray-600 leading-relaxed">
                                {obj.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

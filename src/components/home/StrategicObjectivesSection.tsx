import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  Heart, 
  Home, 
  UserCheck, 
  GraduationCap, 
  Globe,
  ArrowRight
} from 'lucide-react';
import { insforge } from '../../lib/insforge';

interface StrategicObjective {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  full_description: string;
  icon: string | null;
  image_url: string | null;
}

const defaultIcons = [
  BookOpen, Users, Heart, Home, UserCheck, GraduationCap, Globe
];

export function StrategicObjectivesSection() {
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchObjectives = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const fetchPromise = insforge.database
          .from('strategic_objectives')
          .select('*')
          .order('created_at', { ascending: true });

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

        if (error) throw error;
        setObjectives(data || []);
      } catch (err: any) {
        console.error('Error fetching objectives:', err);
        // Fallback to empty array - page will still render
        setObjectives([]);
      } finally {
        setLoading(false);
      }
    };

    fetchObjectives();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-600">Loading objectives...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-semibold text-navy-ink mb-4">
            Strategic Objectives
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Our comprehensive approach to transforming leaders and communities through faith-based initiatives
          </p>
        </div>

        {/* Objectives Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {objectives.map((objective, idx) => {
            const IconComponent = defaultIcons[idx % defaultIcons.length];
            
            return (
              <Link
                key={objective.id}
                to={`/objectives/${objective.slug}`}
                className="group"
              >
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col">
                  {/* Icon */}
                  <div className="mb-6 flex justify-center">
                    <div className="bg-gold/10 p-4 rounded-2xl group-hover:bg-gold/20 transition-colors">
                      <IconComponent className="text-gold" size={40} />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-semibold text-navy-ink mb-4 text-center">
                    {objective.title}
                  </h3>

                  {/* Short Description */}
                  <p className="text-base text-gray-600 leading-relaxed mb-6 flex-grow text-center">
                    {objective.short_description}
                  </p>

                  {/* View Details Button */}
                  <div className="flex justify-center mt-auto">
                    <span className="inline-flex items-center text-gold font-medium group-hover:text-gold/80 transition-colors">
                      View Details
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {objectives.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No strategic objectives available yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}


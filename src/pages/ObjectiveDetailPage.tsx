import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { insforge } from '../lib/insforge';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

interface StrategicObjective {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  full_description: string;
  icon: string | null;
  image_url: string | null;
}

interface PastWork {
  id: string;
  title: string;
  description: string;
  date: string;
  image_url: string | null;
  attachment_url: string | null;
}

interface UpcomingWork {
  id: string;
  title: string;
  description: string;
  event_date: string;
  image_url: string | null;
  link_url: string | null;
}

interface GalleryImage {
  id: string;
  image_url: string;
  order_index: number;
}

export function ObjectiveDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [objective, setObjective] = useState<StrategicObjective | null>(null);
  const [pastWork, setPastWork] = useState<PastWork[]>([]);
  const [upcomingWork, setUpcomingWork] = useState<UpcomingWork[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      try {
        // Fetch objective
        const { data: objData, error: objError } = await insforge.database
          .from('strategic_objectives')
          .select('*')
          .eq('slug', slug)
          .single();

        if (objError) throw objError;
        setObjective(objData);

        // Fetch past work
        const { data: pastData } = await insforge.database
          .from('past_work')
          .select('*')
          .eq('objective_id', objData.id)
          .order('date', { ascending: false });

        setPastWork(pastData || []);

        // Fetch upcoming work
        const { data: upcomingData } = await insforge.database
          .from('upcoming_work')
          .select('*')
          .eq('objective_id', objData.id)
          .order('event_date', { ascending: true });

        setUpcomingWork(upcomingData || []);

        // Fetch gallery
        const { data: galleryData } = await insforge.database
          .from('objective_gallery')
          .select('*')
          .eq('objective_id', objData.id)
          .order('order_index', { ascending: true });

        setGallery(galleryData || []);
      } catch (err) {
        console.error('Error fetching objective data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

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

  if (!objective) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-navy-ink mb-4">Objective Not Found</h1>
            <Link to="/" className="text-gold hover:underline">
              Return to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow">
        {/* Back Button */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <Link
              to="/"
              className="inline-flex items-center text-gold hover:text-gold/80 transition-colors"
            >
              <ArrowLeft className="mr-2" size={20} />
              Back to Objectives
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-navy-ink to-[#2C2E78] text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-semibold mb-6">
                {objective.title}
              </h1>
              <p className="text-xl text-gray-200 leading-relaxed">
                {objective.short_description}
              </p>
            </div>
          </div>
        </section>

        {/* Full Description */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-semibold text-navy-ink mb-6">About This Objective</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">
                  {objective.full_description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Past Projects & Activities */}
        {pastWork.length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-semibold text-navy-ink mb-12 text-center">
                  Past Projects & Activities
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {pastWork.map((work) => (
                    <div
                      key={work.id}
                      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
                    >
                      {work.image_url && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={work.image_url}
                            alt={work.title}
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-center text-gray-500 text-sm mb-3">
                          <Calendar className="mr-2" size={16} />
                          {new Date(work.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <h3 className="text-xl font-semibold text-navy-ink mb-3">
                          {work.title}
                        </h3>
                        <p className="text-base text-gray-600 leading-relaxed mb-4">
                          {work.description}
                        </p>
                        {work.attachment_url && (
                          <a
                            href={work.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-gold hover:text-gold/80 transition-colors"
                          >
                            <Download className="mr-2" size={18} />
                            Download PDF
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Work */}
        {upcomingWork.length > 0 && (
          <section className="py-16 bg-white">
            <div className="container mx-auto px-4">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-semibold text-navy-ink mb-12 text-center">
                  Upcoming Work
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {upcomingWork.map((work) => (
                    <div
                      key={work.id}
                      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden border-2 border-gold/20"
                    >
                      {work.image_url && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={work.image_url}
                            alt={work.title}
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-center text-gray-500 text-sm mb-3">
                          <Calendar className="mr-2" size={16} />
                          {new Date(work.event_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <h3 className="text-xl font-semibold text-navy-ink mb-3">
                          {work.title}
                        </h3>
                        <p className="text-base text-gray-600 leading-relaxed mb-4">
                          {work.description}
                        </p>
                        {work.link_url && (
                          <a
                            href={work.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-gold hover:text-gold/80 transition-colors"
                          >
                            Learn More
                            <ExternalLink className="ml-2" size={18} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-semibold text-navy-ink mb-12 text-center">
                  Gallery
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {gallery.map((img) => (
                    <div
                      key={img.id}
                      className="aspect-square overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow group cursor-pointer"
                    >
                      <img
                        src={img.image_url}
                        alt="Gallery"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}


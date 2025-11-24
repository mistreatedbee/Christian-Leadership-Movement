import React, { useEffect, useState } from 'react';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { insforge } from '../lib/insforge';
import { getStorageUrl } from '../lib/connection';

interface Partner {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  logo_key: string | null;
  website_url: string | null;
}

export function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data, error } = await insforge.database
        .from('partners')
        .select('id, name, description, logo_url, logo_key, website_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (err) {
      console.error('Error fetching partners:', err);
      // Fallback to empty array if table doesn't exist yet
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-grow py-16 bg-muted-gray">
          <div className="container mx-auto px-4 text-center">
            <p className="text-gray-600">Loading partners...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow py-16 bg-muted-gray">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-navy-ink mb-4">
              Our Partners
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We collaborate with churches, ministries, educational institutions, and government organizations to maximize our impact and ensure the highest standards of service delivery.
            </p>
          </div>

          {/* Partners Grid */}
          {partners.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No partners available at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {partners.map(partner => {
                const logoUrl = partner.logo_key 
                  ? getStorageUrl('gallery', partner.logo_key) 
                  : partner.logo_url || 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=Partner';
                
                return (
                  <div
                    key={partner.id}
                    className="bg-white p-8 rounded-2xl shadow-soft hover:shadow-lg transition-shadow duration-300"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                      <div className="flex-shrink-0">
                        <img
                          src={logoUrl}
                          alt={partner.name}
                          className="max-h-20 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=Partner';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-navy-ink mb-2">
                          {partner.name}
                        </h3>
                        {partner.description && (
                          <p className="text-gray-600 mb-4">
                            {partner.description}
                          </p>
                        )}
                        {partner.website_url && (
                          <a
                            href={partner.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold hover:underline font-medium"
                          >
                            Visit Website →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Partnership Benefits Section */}
          <div className="bg-white p-8 rounded-2xl shadow-soft">
            <h2 className="text-2xl font-bold text-navy-ink mb-6 text-center">
              Why Partner With Us?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">✓</span>
                </div>
                <h3 className="text-lg font-semibold text-navy-ink mb-2">Quality Assurance</h3>
                <p className="text-gray-600">
                  All our programs meet the highest standards of accreditation and quality assurance.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">✓</span>
                </div>
                <h3 className="text-lg font-semibold text-navy-ink mb-2">Safety & Compliance</h3>
                <p className="text-gray-600">
                  We maintain strict compliance with all safety regulations and background check requirements.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">✓</span>
                </div>
                <h3 className="text-lg font-semibold text-navy-ink mb-2">Impact & Reach</h3>
                <p className="text-gray-600">
                  Together, we create greater impact in transforming communities through faith and leadership.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}


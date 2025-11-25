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
      // Fetch all active partners - no authentication required (public access)
      const { data, error } = await insforge.database
        .from('partners')
        .select('id, name, description, logo_url, logo_key, website_url, partner_type')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('Partners table does not exist yet');
          setPartners([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      
      setPartners(data || []);
    } catch (err) {
      console.error('Error fetching partners:', err);
      // Fallback to empty array on any error
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {partners.map(partner => {
                const logoUrl = partner.logo_key 
                  ? getStorageUrl('gallery', partner.logo_key) 
                  : partner.logo_url || null;
                
                return (
                  <div
                    key={partner.id}
                    className="bg-white p-8 rounded-2xl shadow-soft hover:shadow-lg transition-all duration-300 flex flex-col"
                  >
                    {/* Logo */}
                    <div className="flex-shrink-0 mb-4 flex justify-center">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={partner.name}
                          className="max-h-24 max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-32 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm"
                        style={{ display: logoUrl ? 'none' : 'flex' }}
                      >
                        {partner.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Partner Info */}
                    <div className="flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-navy-ink mb-3 text-center">
                        {partner.name}
                      </h3>
                      {partner.description && (
                        <p className="text-gray-600 mb-4 flex-1 text-center">
                          {partner.description}
                        </p>
                      )}
                      {partner.website_url && (
                        <div className="mt-auto pt-4 border-t border-gray-200">
                          <a
                            href={partner.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold hover:underline font-medium flex items-center justify-center gap-2"
                          >
                            Visit Website
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
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


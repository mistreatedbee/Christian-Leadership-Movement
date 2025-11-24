import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { insforge } from '../../lib/insforge';
import { getStorageUrl } from '../../lib/connection';

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  logo_key: string | null;
}

export function PartnersSection() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data, error } = await insforge.database
        .from('partners')
        .select('id, name, logo_url, logo_key')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(8);

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
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-gray-600">Loading partners...</p>
        </div>
      </div>
    </section>
    );
  }

  if (partners.length === 0) {
    return null; // Don't show section if no partners
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy-ink mb-4">
            Our Partners
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We collaborate with churches, ministries, educational institutions, and government organizations to maximize our impact.
          </p>
        </div>

        {/* Partner Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {partners.map(partner => {
            const logoUrl = partner.logo_key 
              ? getStorageUrl('gallery', partner.logo_key) 
              : partner.logo_url || 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=Partner';
            
            return (
              <div
                key={partner.id}
                className="bg-gradient-to-br from-white to-gray-100 p-6 rounded-2xl shadow-soft hover:shadow-lg transform hover:scale-105 transition-transform transition-shadow duration-300 flex flex-col items-center text-center"
              >
                <img
                  src={logoUrl}
                  alt={partner.name}
                  className="max-h-16 mb-4 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=Partner';
                  }}
                />
                <h3 className="text-lg font-semibold text-navy-ink">
                  {partner.name}
                </h3>
              </div>
            );
          })}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Button href="/partners" variant="secondary">
            View All Partners
          </Button>
        </div>
      </div>
    </section>
  );
}

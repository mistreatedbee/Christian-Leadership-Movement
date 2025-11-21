import React from 'react';
import { Button } from '../ui/Button';

const partners = [
  {
    id: 1,
    name: 'ACRP (Association of Christian Religious Practitioners)',
    logo: 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=ACRP'
  },
  {
    id: 2,
    name: 'SAQA Recognized Center for Faith Community Enterprise @ University of Pretoria',
    logo: 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=SAQA'
  },
  {
    id: 3,
    name: 'Department of Social Development Mpumalanga Province - Screening Child Protection Register Act No. 38 of 2005',
    logo: 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=DSD'
  },
  {
    id: 4,
    name: 'Criminal offence Registry (NARSO) National Registry for Sex offenders License',
    logo: 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=NARSO'
  }
];

export function PartnersSection() {
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
          {partners.map(partner => (
            <div
              key={partner.id}
              className="bg-gradient-to-br from-white to-gray-100 p-6 rounded-2xl shadow-soft hover:shadow-lg transform hover:scale-105 transition-transform transition-shadow duration-300 flex flex-col items-center text-center"
            >
              <img
                src={partner.logo}
                alt={partner.name}
                className="max-h-16 mb-4 object-contain"
              />
              <h3 className="text-lg font-semibold text-navy-ink">
                {partner.name}
              </h3>
            </div>
          ))}
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

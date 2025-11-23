import React from 'react';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';

const partners = [
  {
    id: 1,
    name: 'ACRP (Association of Christian Religious Practitioners)',
    description: 'Professional association for Christian religious practitioners providing accreditation and support.',
    logo: 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=ACRP',
    website: '#'
  },
  {
    id: 2,
    name: 'University of Pretoria',
    description: 'A recognized center providing quality assurance and accreditation for faith-based education programs.',
    logo: 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=SAQA',
    website: '#'
  },
  {
    id: 3,
    name: 'Department of Social Development Mpumalanga Province - Screening Child Protection Register Act No. 38 of 2005',
    description: 'Government partnership ensuring child protection and safety standards in all programs.',
    logo: 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=DSD',
    website: '#'
  },
  {
    id: 4,
    name: 'Criminal offence Registry (NARSO) National Registry for Sex offenders License',
    description: 'National registry partnership ensuring safety and compliance with criminal background checks.',
    logo: 'https://placehold.co/200x100/1B1C5F/FFFFFF?text=NARSO',
    website: '#'
  }
];

export function PartnersPage() {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {partners.map(partner => (
              <div
                key={partner.id}
                className="bg-white p-8 rounded-2xl shadow-soft hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      className="max-h-20 object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-navy-ink mb-2">
                      {partner.name}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {partner.description}
                    </p>
                    {partner.website && partner.website !== '#' && (
                      <a
                        href={partner.website}
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
            ))}
          </div>

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


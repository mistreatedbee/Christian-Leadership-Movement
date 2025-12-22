import React from 'react';
import { Button } from '../ui/Button';
export function CtaSection() {
  return <section className="py-16 bg-brand-dark-blue">
      <div className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-brand-dark-blue to-navy-ink p-8 md:p-12 rounded-hero relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gold/5 rounded-full translate-y-1/3 -translate-x-1/4"></div>
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Grow as a Christian Leader?
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Join the Christian Leadership Movement today and be equipped to
              transform your community through faith and action.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button href="/apply" variant="primary" size="lg">
                Apply Now
              </Button>
              <Button href="/contact" variant="outline" size="lg">
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>;
}
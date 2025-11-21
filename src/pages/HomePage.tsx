import React, { useEffect } from 'react';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { HeroSection } from '../components/home/HeroSection';
import { MissionSection } from '../components/home/MissionSection';
import { StrategicObjectivesSection } from '../components/home/StrategicObjectivesSection';
import { ProgramsSection } from '../components/home/ProgramsSection';
import { UpcomingEventsSection } from '../components/home/UpcomingEventsSection';
import { GallerySection } from '../components/home/GallerySection';
import { PartnersSection } from '../components/home/PartnersSection';
import { CtaSection } from '../components/home/CtaSection';
import { testConnection } from '../lib/testConnection';

export function HomePage() {
  useEffect(() => {
    // Test connection on mount in development
    if (import.meta.env.DEV) {
      console.log('🏠 HomePage loaded - testing connection...');
      testConnection().catch(console.error);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-grow">
        <HeroSection />
        <MissionSection />
        <StrategicObjectivesSection />
        <ProgramsSection />
        <UpcomingEventsSection />
        <GallerySection />
        <PartnersSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
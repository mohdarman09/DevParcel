import React, { useEffect } from 'react';
import { DevParcelHeader } from '../components/DevParcelHeader';
import { DevParcelHero } from '../components/DevParcelHero';
import { ShareLinkInput } from '../components/ShareLinkInput';
import { ProductFeatures } from '../components/ProductFeatures';
import { AvailabilitySection } from '../components/AvailabilitySection';
import { QuoteSection } from '../components/QuoteSection';
import { DeveloperCard } from '../components/DeveloperCard';
import { DevParcelFooter } from '../components/DevParcelFooter';

export const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = 'DevParcel — Secure Project Sharing';
  }, []);

  return (
    <div className="app-shell min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 relative overflow-x-hidden">
      {/* Decorative ambient background glows (pointer-events: none) */}
      <div
        className="ambient-glow fixed -top-24 left-1/4 w-[32rem] h-[32rem] bg-gradient-to-br from-blue-100/60 to-indigo-100/40 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="ambient-glow fixed top-1/3 -right-24 w-[28rem] h-[28rem] bg-gradient-to-bl from-purple-100/50 to-blue-50/30 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="ambient-glow fixed bottom-1/4 left-10 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <DevParcelHeader />

      <main
        className="app-main flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
        id="main-content"
      >
        <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 py-4 sm:py-6">
          <DevParcelHero />
          <ShareLinkInput />
          <ProductFeatures />
          <AvailabilitySection />
          <QuoteSection />
          <DeveloperCard />
        </div>
      </main>

      <DevParcelFooter />
    </div>
  );
};

export default LandingPage;

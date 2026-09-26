import React from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { DevParcelMarketing } from '../components/DevParcelMarketing';
import { ShareStatusNotice } from '../components/ShareStatusNotice';
import { QuoteSection } from '../components/QuoteSection';
import { CreatorCard } from '../components/CreatorCard';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="app-shell min-h-screen flex flex-col bg-slate-50 text-slate-900 relative overflow-x-hidden">
      <div className="ambient-glow fixed -top-24 left-1/4 w-[32rem] h-[32rem] bg-gradient-to-br from-blue-100/60 to-indigo-100/40 rounded-full blur-3xl pointer-events-none -z-10" aria-hidden="true" />
      <div className="ambient-glow fixed top-1/3 -right-24 w-[28rem] h-[28rem] bg-gradient-to-bl from-purple-100/50 to-blue-50/30 rounded-full blur-3xl pointer-events-none -z-10" aria-hidden="true" />

      <Header />
      <main className="app-main flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="main-content">
        <ShareStatusNotice
          type="not_found"
          message="This page or link is invalid or no longer available."
        />
        <DevParcelMarketing />
        <QuoteSection />
        <CreatorCard />
      </main>
      <Footer />
    </div>
  );
};

import React from 'react';
import { DevParcelHero } from './DevParcelHero';
import { ShareLinkInput } from './ShareLinkInput';
import { ProductFeatures } from './ProductFeatures';
import { AvailabilitySection } from './AvailabilitySection';

export const DevParcelMarketing: React.FC = () => {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6" aria-label="DevParcel Product Overview">
      <DevParcelHero />
      <ShareLinkInput />
      <ProductFeatures />
      <AvailabilitySection />
    </section>
  );
};

export default DevParcelMarketing;

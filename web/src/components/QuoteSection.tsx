import React from 'react';

export const QuoteSection: React.FC = () => {
  return (
    <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 my-6 sm:my-8 text-center" aria-label="DevParcel Brand Philosophy">
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70 border border-blue-100 shadow-soft-sm">
        <span className="text-4xl sm:text-5xl font-serif text-blue-300 select-none block leading-none mb-2" aria-hidden="true">
          “
        </span>
        <blockquote className="text-xl sm:text-3xl font-extrabold text-slate-800 tracking-tight leading-snug">
          Share code, not the chaos.
        </blockquote>
        <div className="w-12 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mx-auto my-4" aria-hidden="true" />
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
          DevParcel
        </span>
      </div>
    </section>
  );
};

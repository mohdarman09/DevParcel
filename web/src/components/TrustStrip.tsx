import React from 'react';

export const TrustStrip: React.FC = () => {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-6 sm:my-8" aria-label="DevParcel Benefits and Guarantees">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Item 1: Secure Sharing */}
        <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 transition-all text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center mb-3.5 mx-auto sm:mx-0 shadow-soft-sm" aria-hidden="true">
            <svg
              className="w-5 h-5 shrink-0"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Secure Sharing</h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
            Your code, your control.
            <br />
            Sensitive files stay private.
          </p>
        </div>

        {/* Item 2: No Account Needed */}
        <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 transition-all text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center mb-3.5 mx-auto sm:mx-0 shadow-soft-sm" aria-hidden="true">
            <svg
              className="w-5 h-5 shrink-0"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">No Account Needed</h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
            Recipients can download
            <br />
            instantly, no signup required.
          </p>
        </div>

        {/* Item 3: Built for Developers */}
        <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 transition-all text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/60 text-purple-600 flex items-center justify-center mb-3.5 mx-auto sm:mx-0 shadow-soft-sm" aria-hidden="true">
            <svg
              className="w-5 h-5 shrink-0"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Built for Developers</h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
            A seamless way to share
            <br />
            projects with anyone.
          </p>
        </div>

        {/* Item 4: Open Source */}
        <div className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 transition-all text-center sm:text-left">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center mb-3.5 mx-auto sm:mx-0 shadow-soft-sm" aria-hidden="true">
            <svg
              className="w-5 h-5 shrink-0"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Open Source</h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
            Built for the global developer
            <br />
            community.
          </p>
        </div>
      </div>
    </section>
  );
};

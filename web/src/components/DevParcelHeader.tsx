import React from 'react';

export const DevParcelHeader: React.FC = () => {
  return (
    <header
      className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 transition-all"
      role="banner"
      aria-label="DevParcel Header"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a
          href="/"
          className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl p-1"
          aria-label="DevParcel Home"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-soft group-hover:scale-105 group-hover:shadow-md transition-all shrink-0">
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
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
              DevParcel
            </span>
            <span className="text-xs font-medium text-slate-500 tracking-tight mt-0.5">
              Secure Project Sharing
            </span>
          </div>
        </a>

        <div
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold shadow-soft-sm hover:border-slate-300 transition-colors"
          aria-label="DevParcel guarantee: Safe, Secure, Simple"
        >
          <svg
            className="w-3.5 h-3.5 shrink-0 text-blue-600"
            width="14"
            height="14"
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
          <span>Safe • Secure • Simple</span>
        </div>
      </div>
    </header>
  );
};

export const Header = DevParcelHeader;
export default DevParcelHeader;

import React from 'react';
import { siteConfig } from '../config/siteConfig';
import { useInstallModal } from './InstallEditorModal';

export const DevParcelHero: React.FC = () => {
  const { openModal } = useInstallModal();
  const githubUrl = siteConfig.creator.githubUrl || 'https://github.com/mohdarman09/DevParcel';
  const defaultInstallUrl = 'vscode:extension/mohdarman.devparcel';
  const ctaUrl = siteConfig.marketplaceUrl || defaultInstallUrl;

  return (
    <div className="text-center max-w-3xl mx-auto pt-4 sm:pt-6 pb-2">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4 shadow-soft-sm">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" aria-hidden="true" />
        <span>BUILT FOR DEVELOPERS</span>
      </div>

      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
        Share Projects Securely with <span className="text-blue-600 underline decoration-blue-200 underline-offset-4">DevParcel</span>
      </h1>

      <p className="mt-4 text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
        Package and share your development projects securely, directly from your editor.
        <span className="block mt-1 text-slate-500 text-sm sm:text-base">
          Package and securely share your development projects directly from your editor — without requiring recipients to create an account.
        </span>
      </p>

      {/* Primary Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <a
          href={ctaUrl}
          onClick={(e) => {
            e.preventDefault();
            openModal();
          }}
          id="hero-get-devparcel-btn"
          aria-label="Get DevParcel - Install in Your Code Editor"
          className="w-full sm:w-auto px-5 py-3 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm sm:text-base shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 whitespace-nowrap cursor-pointer"
        >
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
          <span className="sr-only">Get DevParcel</span>
          <span>Install in Your Code Editor</span>
          <span className="text-blue-200 text-sm ml-0.5" aria-hidden="true">↗</span>
        </a>

        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="hero-github-btn"
          className="w-full sm:w-auto px-5 py-3 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold text-sm sm:text-base border border-slate-300 shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 active:translate-y-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 whitespace-nowrap"
        >
          <svg
            className="w-5 h-5 shrink-0 text-slate-700"
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
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
          <span>View on GitHub</span>
          <span className="text-slate-400 text-sm ml-0.5" aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
};

export default DevParcelHero;

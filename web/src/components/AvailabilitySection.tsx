import React from 'react';
import { siteConfig } from '../config/siteConfig';
import { useInstallModal } from './InstallEditorModal';

export const AvailabilitySection: React.FC = () => {
  const { openModal } = useInstallModal();
  const githubUrl = siteConfig.creator.githubUrl || 'https://github.com/mohdarman09/DevParcel';
  const defaultInstallUrl = 'vscode:extension/mohdarman.devparcel';
  const ctaUrl = siteConfig.marketplaceUrl || defaultInstallUrl;

  return (
    <section
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-8 sm:my-10"
      aria-label="Available for VS Code & Antigravity"
    >
      <div className="p-6 sm:p-8 bg-gradient-to-b from-white via-slate-50/50 to-white rounded-3xl border border-slate-200/90 shadow-soft-lg">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Available for VS Code, Cursor &amp; Antigravity
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Use DevParcel directly from your development environment to package and share projects in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {/* VS Code Card */}
          <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3.5 mb-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0 shadow-soft-sm" aria-hidden="true">
                <svg className="w-6 h-6 shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.26a1 1 0 0 0-.005 1.415L3.98 12 .322 15.324a1 1 0 0 0 .005 1.416l1.322 1.201a1 1 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zM18 16.712l-6.832-5.112L18 6.488v10.224z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">VS Code</h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Available
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Package and securely share projects directly from your Visual Studio Code workspace.
            </p>
          </div>

          {/* Cursor Card */}
          <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3.5 mb-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-300/70 text-slate-900 flex items-center justify-center shrink-0 shadow-soft-sm" aria-hidden="true">
                <svg className="w-6 h-6 shrink-0" width="24" height="24" viewBox="0 0 466.73 532.09" fill="currentColor" aria-hidden="true">
                  <path d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cursor</h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Available
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Seamlessly package and share code directly from your Cursor AI development workspace.
            </p>
          </div>

          {/* Antigravity Card */}
          <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
            <div className="flex items-center gap-3.5 mb-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0 shadow-soft-sm" aria-hidden="true">
                <svg className="w-6 h-6 shrink-0" width="24" height="24" viewBox="0 0 112 112" fill="currentColor" aria-hidden="true">
                  <path d="M89.754 92.75c4.667 3.5 11.667 1.167 5.25-5.25-19.25-18.667-15.167-70-39.083-70-23.917 0-19.834 51.333-39.084 70-7 7 .584 8.75 5.25 5.25C40.171 80.5 39.004 58.917 55.921 58.917c16.916 0 15.75 21.583 33.833 33.833Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Antigravity</h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Available
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Use DevParcel with Antigravity AI-assisted development workflows to package and share projects quickly.
            </p>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
          <a
            href={ctaUrl}
            onClick={(e) => {
              e.preventDefault();
              openModal();
            }}
            id="availability-get-btn"
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
            id="availability-github-btn"
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
    </section>
  );
};

export default AvailabilitySection;

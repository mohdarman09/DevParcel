import React from 'react';
import { siteConfig } from '../config/siteConfig';
import { useInstallModal } from './InstallEditorModal';

export const DevParcelPromo: React.FC = () => {
  const { openModal } = useInstallModal();
  // Use direct editor installation protocol so clicking installs extension directly in user's editor
  const defaultInstallUrl = 'vscode:extension/mohdarman.devparcel';
  const ctaUrl = siteConfig.marketplaceUrl || defaultInstallUrl;

  return (
    <div className="w-full flex flex-col items-start" aria-label="About DevParcel Editor Extension">
      <div className="w-full p-6 sm:p-8 bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft transition-all flex flex-col">
        <div className="flex flex-col items-start">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold uppercase tracking-wider mb-3 shadow-soft-sm">
            BUILT FOR DEVELOPERS
          </span>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Share Your Projects Securely with <span className="text-blue-600">DevParcel</span>
          </h2>

          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            DevParcel lets developers package and securely share projects directly from their editor.
          </p>
        </div>

        <ul className="my-5 grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="DevParcel capabilities">
          <li className="flex items-center gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs sm:text-sm font-medium text-slate-700">
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0 shadow-soft-sm" aria-hidden="true">
              <svg width="15" height="15" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span>One-click project packaging</span>
          </li>

          <li className="flex items-center gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs sm:text-sm font-medium text-slate-700">
            <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200/60 text-teal-600 flex items-center justify-center shrink-0 shadow-soft-sm" aria-hidden="true">
              <svg width="15" height="15" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span>Automatically exclude sensitive files</span>
          </li>

          <li className="flex items-center gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs sm:text-sm font-medium text-slate-700">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0 shadow-soft-sm" aria-hidden="true">
              <svg width="15" height="15" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span>Get a shareable download link</span>
          </li>

          <li className="flex items-center gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs sm:text-sm font-medium text-slate-700">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0 shadow-soft-sm" aria-hidden="true">
              <svg width="15" height="15" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <span>Simple, fast and secure</span>
          </li>
        </ul>

        {/* Availability Section */}
        <div className="pt-4 border-t border-slate-200/80" aria-label="Available for VS Code & Antigravity">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                Available for VS Code, Cursor &amp; Antigravity
              </span>
              <p className="text-xs text-slate-600 mt-1">
                Package and share directly inside your editor. Click to install:
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2" role="list" aria-label="Supported IDEs">
                <a
                  href="vscode:extension/mohdarman.devparcel"
                  title="Install in VS Code"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/70 text-blue-700 text-xs font-semibold shadow-soft-sm transition-colors"
                  role="listitem"
                >
                  <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.26a1 1 0 0 0-.005 1.415L3.98 12 .322 15.324a1 1 0 0 0 .005 1.416l1.322 1.201a1 1 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zM18 16.712l-6.832-5.112L18 6.488v10.224z" />
                  </svg>
                  <span>VS Code</span>
                  <span className="text-[10px] text-blue-500 font-normal">↗</span>
                </a>

                <a
                  href="cursor:extension/mohdarman.devparcel"
                  title="Install in Cursor"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-300/70 text-slate-800 text-xs font-semibold shadow-soft-sm transition-colors"
                  role="listitem"
                >
                  <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 466.73 532.09" fill="currentColor" aria-hidden="true">
                    <path d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z" />
                  </svg>
                  <span>Cursor</span>
                  <span className="text-[10px] text-slate-500 font-normal">↗</span>
                </a>

                <a
                  href="antigravity:extension/mohdarman.devparcel"
                  title="Install in Antigravity"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 text-indigo-700 text-xs font-semibold shadow-soft-sm transition-colors"
                  role="listitem"
                >
                  <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 112 112" fill="currentColor" aria-hidden="true">
                    <path d="M89.754 92.75c4.667 3.5 11.667 1.167 5.25-5.25-19.25-18.667-15.167-70-39.083-70-23.917 0-19.834 51.333-39.084 70-7 7 .584 8.75 5.25 5.25C40.171 80.5 39.004 58.917 55.921 58.917c16.916 0 15.75 21.583 33.833 33.833Z" />
                  </svg>
                  <span>Antigravity</span>
                  <span className="text-[10px] text-indigo-500 font-normal">↗</span>
                </a>
              </div>
            </div>

            <div className="w-full md:w-auto shrink-0 mt-3 md:mt-0">
              <a
                href={ctaUrl}
                onClick={(e) => {
                  e.preventDefault();
                  openModal();
                }}
                className="w-full md:w-auto px-5 py-3 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-sm font-semibold shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 whitespace-nowrap cursor-pointer"
                id="marketplace-cta-link"
                aria-label="Install DevParcel in Your Editor"
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
                <span>Install in Your Code Editor</span>
                <span className="text-slate-300 text-xs ml-0.5" aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevParcelPromo;

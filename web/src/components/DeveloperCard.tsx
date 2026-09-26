import React from 'react';
import { siteConfig } from '../config/siteConfig';

export const DeveloperCard: React.FC = () => {
  const { name, role, bio, linkedinUrl, portfolioUrl, githubUrl } = siteConfig.creator;

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-6 sm:my-8" aria-label="About the Creator">
      <div className="p-6 sm:p-7 bg-white rounded-2xl border border-slate-200/90 shadow-soft-sm flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left: Developer Identity */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-lg shadow-soft shrink-0" aria-hidden="true">
            <span>MA</span>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">Developed by</span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{name}</h3>
            <span className="text-xs sm:text-sm font-medium text-slate-500 block">{role}</span>
            <p className="text-sm text-slate-600 mt-1 max-w-md">
              {bio || "Creating tools that make developers' lives easier."}
            </p>
          </div>
        </div>

        {/* Center: Social Action Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3" aria-label="Creator links">
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-semibold border border-slate-200 hover:border-slate-300 shadow-soft-sm hover:shadow transition-all whitespace-nowrap"
              id="creator-linkedin-link"
            >
              <svg
                width="16"
                height="16"
                className="w-4 h-4 shrink-0 text-blue-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              <span>LinkedIn</span>
              <span className="text-slate-400 text-xs" aria-hidden="true">↗</span>
            </a>
          )}

          {portfolioUrl && (
            <a
              href={portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-semibold border border-slate-200 hover:border-slate-300 shadow-soft-sm hover:shadow transition-all whitespace-nowrap"
              id="creator-portfolio-link"
            >
              <svg
                width="16"
                height="16"
                className="w-4 h-4 shrink-0 text-emerald-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Portfolio</span>
              <span className="text-slate-400 text-xs" aria-hidden="true">↗</span>
            </a>
          )}

          <a
            href={githubUrl || 'https://github.com/mohdarman09/DevParcel'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-semibold border border-slate-200 hover:border-slate-300 shadow-soft-sm hover:shadow transition-all whitespace-nowrap"
            id="creator-github-link"
            aria-label="DevParcel GitHub repository (opens in new tab)"
          >
            <svg
              width="16"
              height="16"
              className="w-4 h-4 shrink-0 text-slate-800"
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
            <span>GitHub</span>
            <span className="text-slate-400 text-xs" aria-hidden="true">↗</span>
          </a>
        </div>

        {/* Right: Signature Quotation */}
        <div className="hidden xl:block text-right border-l border-slate-200 pl-6" aria-hidden="true">
          <p className="text-xs italic text-slate-500 leading-relaxed font-serif">
            “Let&apos;s build
            <br />
            a better dev experience.”
          </p>
          <span className="text-xs font-semibold text-slate-700 mt-1 block">— Mohd Arman</span>
        </div>
      </div>
    </section>
  );
};

export const CreatorCard = DeveloperCard;
export default DeveloperCard;

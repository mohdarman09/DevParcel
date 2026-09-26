import React from 'react';
import { siteConfig } from '../config/siteConfig';

export const DevParcelFooter: React.FC = () => {
  const { name, portfolioUrl, githubUrl } = siteConfig.creator;
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="w-full border-t border-slate-200/90 bg-white/90 mt-10 sm:mt-12"
      role="contentinfo"
      aria-label="DevParcel Footer"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-soft-sm shrink-0" aria-hidden="true">
            <svg
              width="16"
              height="16"
              className="w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 block leading-tight">DevParcel</span>
            <span className="text-xs text-slate-500">Secure Project Sharing</span>
          </div>
        </div>

        {/* Center: Copyright Notice */}
        <div className="text-center" aria-label="Copyright Notice">
          <span className="text-xs sm:text-sm text-slate-500">
            © {currentYear} DevParcel. All rights reserved.
          </span>
        </div>

        {/* Right: Credits & Supported Links */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <a
              href={githubUrl || 'https://github.com/mohdarman09/DevParcel'}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors font-medium"
            >
              GitHub
            </a>
            {portfolioUrl && (
              <>
                <span className="text-slate-300">•</span>
                <a
                  href={portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors font-medium"
                >
                  Portfolio
                </a>
              </>
            )}
          </div>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="font-medium text-slate-700">
            Engineered by <span className="font-semibold text-slate-900">{name}</span>
          </span>
        </div>
      </div>
    </footer>
  );
};

export const Footer = DevParcelFooter;
export default DevParcelFooter;

import React from 'react';
import { SharePublicMetadata } from '../types/share';
import { formatBytes, formatDateOnly } from '../utils/formatters';
import { useCountdown } from '../hooks/useCountdown';

export interface HeroProjectInfoProps {
  share: SharePublicMetadata;
}

export const HeroProjectInfo: React.FC<HeroProjectInfoProps> = ({ share }) => {
  const { formatted: countdownText, isExpired } = useCountdown(share.expiresAt);

  return (
    <div className="w-full flex flex-col justify-between p-6 sm:p-7 bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft transition-all text-left" aria-label="Project Information and Statistics">
      {/* Top Project Header Block */}
      <div>
        {/* Top Status Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3 shadow-soft-sm" aria-label="Status: Project Ready">
          <svg
            width="14"
            height="14"
            className="w-3.5 h-3.5 shrink-0 text-emerald-600"
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
          <span>PROJECT READY</span>
        </div>

        {/* Dynamic Project Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight break-words" id="project-title">
          {share.projectName}
        </h1>

        <div className="mt-1">
          <span className="inline-block text-xs font-bold tracking-wider uppercase text-blue-600">
            PROJECT PACKAGE
          </span>
        </div>

        <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
          Your project package is ready to download.
          <br className="hidden sm:inline" />
          No account required. Just one click.
        </p>
      </div>

      {/* Stats Container Block */}
      <div className="mt-6 sm:mt-8">
        {/* 6-Stat Dynamic Grid (2 Columns matching original design) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3" role="region" aria-label="Project Package Specifications">
          {/* Stat 1: Files */}
          <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200/80 shadow-soft-sm flex items-center gap-2.5 sm:gap-3 overflow-hidden">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-50 border border-purple-200/60 text-purple-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="15" height="15" className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium block">Files</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block whitespace-nowrap" title={share.fileCount.toLocaleString()}>{share.fileCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Stat 2: Package Size */}
          <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200/80 shadow-soft-sm flex items-center gap-2.5 sm:gap-3 overflow-hidden">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-cyan-50 border border-cyan-200/60 text-cyan-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="15" height="15" className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium block">Package Size</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block whitespace-nowrap" title={formatBytes(share.packageSize)}>{formatBytes(share.packageSize)}</span>
            </div>
          </div>

          {/* Stat 3: Original Size */}
          <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200/80 shadow-soft-sm flex items-center gap-2.5 sm:gap-3 overflow-hidden">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="15" height="15" className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium block">Original Size</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block whitespace-nowrap" title={formatBytes(share.originalSize)}>{formatBytes(share.originalSize)}</span>
            </div>
          </div>

          {/* Stat 4: Excluded Files */}
          <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200/80 shadow-soft-sm flex items-center gap-2.5 sm:gap-3 overflow-hidden">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="15" height="15" className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium block">Excluded Files</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block whitespace-nowrap" title={share.excludedCount.toLocaleString()}>{share.excludedCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Stat 5: Shared on */}
          <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200/80 shadow-soft-sm flex items-center gap-2.5 sm:gap-3 overflow-hidden">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-sky-50 border border-sky-200/60 text-sky-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="15" height="15" className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium block">Shared on</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block whitespace-nowrap" title={formatDateOnly(share.createdAt)}>{formatDateOnly(share.createdAt)}</span>
            </div>
          </div>

          {/* Stat 6: Expires in */}
          <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200/80 shadow-soft-sm flex items-center gap-2.5 sm:gap-3 overflow-hidden">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="15" height="15" className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs text-slate-500 font-medium block">Expires in</span>
              <span
                className={`text-xs sm:text-sm font-bold block whitespace-nowrap ${isExpired ? 'text-rose-600' : 'text-slate-900'}`}
                title={countdownText}
              >
                {countdownText.replace(/^Expires in\s*/i, '') || countdownText}
              </span>
            </div>
          </div>
        </div>

        {/* Sensitive file notice if present */}
        {share.sensitiveFileCount > 0 && (
          <aside className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs sm:text-sm flex items-start gap-2.5 shadow-soft-sm" role="status" aria-label="Sensitive files notice">
            <svg
              width="16"
              height="16"
              className="w-4 h-4 shrink-0 mt-0.5 text-amber-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <strong>Note:</strong> Package includes {share.sensitiveFileCount} sensitive file
              {share.sensitiveFileCount > 1 ? 's' : ''} permitted by sender.
            </span>
          </aside>
        )}
      </div>
    </div>
  );
};

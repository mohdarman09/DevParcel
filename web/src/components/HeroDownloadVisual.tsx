import React from 'react';
import { DownloadState } from '../types/share';
import { DownloadButton } from './DownloadButton';

export interface HeroDownloadVisualProps {
  downloadState: DownloadState;
  downloadError: string | null;
  onDownload: () => void;
  onRetryDownload: () => void;
}

export const HeroDownloadVisual: React.FC<HeroDownloadVisualProps> = ({
  downloadState,
  downloadError,
  onDownload,
  onRetryDownload,
}) => {
  return (
    <div className="w-full flex flex-col items-center" aria-label="Project Download Package">
      <div className="w-full flex-1 p-6 sm:p-7 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-soft hover:shadow-soft-lg transition-all flex flex-col items-center justify-between text-center relative overflow-hidden">
        {/* Ambient subtle glow behind visual */}
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-br from-blue-200/40 via-indigo-100/30 to-purple-200/20 rounded-full blur-2xl pointer-events-none -z-0"
          aria-hidden="true"
        />

        {/* Top Header Block matching Card 1 & Card 3 */}
        <div className="w-full flex flex-col items-center text-center z-10 mb-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2 shadow-soft-sm">
            DIRECT DOWNLOAD
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Ready to Download
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs">
            Clean, uncompressed ZIP archive packaged from the workspace.
          </p>
        </div>

        {/* Visual Stage with Stylized Package Folder */}
        <div className="relative w-40 h-36 flex items-center justify-center my-2 shrink-0 z-10" aria-hidden="true">
          <svg
            className="w-32 h-32 sm:w-36 sm:h-36 shrink-0 drop-shadow-md hover:scale-105 transition-transform duration-300"
            width="144"
            height="144"
            viewBox="0 0 160 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="folderBackGrad" x1="20" y1="30" x2="140" y2="130" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3b82f6" />
                <stop offset="1" stopColor="#1d4ed8" />
              </linearGradient>
              <linearGradient id="folderFrontGrad" x1="20" y1="60" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60a5fa" />
                <stop offset="1" stopColor="#2563eb" />
              </linearGradient>
              <filter id="folderShadow" x="10" y="30" width="140" height="120" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#1e3a8a" floodOpacity="0.2" />
              </filter>
              <filter id="badgeShadow" x="40" y="70" width="80" height="60" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.18" />
              </filter>
            </defs>

            {/* Folder Back with Tab */}
            <g filter="url(#folderShadow)">
              <path
                d="M26 44C26 37.3726 31.3726 32 38 32H64C68.2435 32 72.1895 34.2409 74.3416 37.8974L77.6584 43.1026C79.8105 46.7591 83.7565 49 88 49H122C128.627 49 134 54.3726 134 61V116C134 122.627 128.627 128 122 128H38C31.3726 128 26 122.627 26 116V44Z"
                fill="url(#folderBackGrad)"
              />
            </g>

            {/* Folder Front Flap */}
            <path
              d="M24 62C24 55.3726 29.3726 50 36 50H124C130.627 50 136 55.3726 136 62V118C136 124.627 130.627 130 124 130H36C29.3726 130 24 124.627 24 118V62Z"
              fill="url(#folderFrontGrad)"
            />

            {/* Central Code Badge </> */}
            <g filter="url(#badgeShadow)">
              <rect x="52" y="74" width="56" height="34" rx="10" fill="#ffffff" fillOpacity="0.25" stroke="#ffffff" strokeWidth="1.5" />
              <path
                d="M68 86L62 91L68 96"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M77 84L73 98"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M82 86L88 91L82 96"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>

        {/* Download Button CTA & Feedback */}
        <div className="w-full mt-4 flex flex-col items-center gap-3 z-10">
          <DownloadButton
            downloadState={downloadState}
            onClick={onDownload}
          />

          {/* Download Error Banner */}
          {downloadError && (
            <aside
              className="w-full p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs sm:text-sm flex items-center justify-between gap-2 shadow-soft-sm"
              role="alert"
            >
              <span className="truncate">{downloadError}</span>
              <button
                type="button"
                className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline underline-offset-2 ml-2 shrink-0 focus-visible:outline-none"
                onClick={onRetryDownload}
              >
                Try Again
              </button>
            </aside>
          )}

          {/* Microcopy */}
          <p className="text-xs text-slate-500 font-medium">Your download will start shortly.</p>

          {/* Security Guarantee Pill */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-slate-600 text-xs font-medium shadow-soft-sm"
            aria-label="Security status"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0 text-emerald-600"
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
            <span>This link is secure and expires automatically</span>
          </div>
        </div>
      </div>
    </div>
  );
};

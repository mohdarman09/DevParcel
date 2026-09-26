import React from 'react';
import { DownloadState } from '../types/share';

export interface DownloadButtonProps {
  downloadState: DownloadState;
  onClick: () => void;
  disabled?: boolean;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  downloadState,
  onClick,
  disabled = false,
}) => {
  const isPreparing = downloadState === 'preparing';
  const isSuccess = downloadState === 'success';

  const baseClasses =
    'w-full px-6 py-4 min-h-[52px] inline-flex items-center justify-center gap-3 rounded-2xl font-bold text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

  const stateClasses = isSuccess
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft focus-visible:ring-emerald-500'
    : 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-slate-400';

  return (
    <button
      type="button"
      id="download-cta-btn"
      className={`${baseClasses} ${stateClasses}`}
      onClick={onClick}
      disabled={disabled || isPreparing}
      aria-busy={isPreparing}
      aria-live="polite"
    >
      {isPreparing ? (
        <>
          <svg
            width="20"
            height="20"
            className="w-5 h-5 shrink-0 animate-spin text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeOpacity="0.25"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeLinecap="round"
            />
          </svg>
          <span>Preparing download...</span>
        </>
      ) : isSuccess ? (
        <>
          <svg
            width="20"
            height="20"
            className="w-5 h-5 shrink-0 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Download started</span>
        </>
      ) : (
        <>
          <svg
            width="20"
            height="20"
            className="w-5 h-5 shrink-0 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Download ZIP</span>
          <svg
            width="16"
            height="16"
            className="w-4 h-4 shrink-0 text-slate-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </>
      )}
    </button>
  );
};

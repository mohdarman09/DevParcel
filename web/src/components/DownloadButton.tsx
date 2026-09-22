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

  return (
    <button
      type="button"
      id="download-cta-btn"
      className={`download-btn ${isSuccess ? 'download-btn--success' : ''}`}
      onClick={onClick}
      disabled={disabled || isPreparing}
      aria-busy={isPreparing}
      aria-live="polite"
    >
      {isPreparing ? (
        <>
          <svg
            className="spinner"
            width="18"
            height="18"
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
            width="18"
            height="18"
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
            className="download-icon-leading"
            width="18"
            height="18"
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
          <span className="download-btn-label">Download ZIP</span>
          <svg
            className="download-icon-trailing"
            width="16"
            height="16"
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

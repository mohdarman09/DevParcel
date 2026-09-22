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
    <div className="hero-center-column" aria-label="Project Download Package">
      <div className="package-card">
        {/* Floating Decorative Elements around Aura */}
        <div className="package-visual-stage" aria-hidden="true">
          <div className="aura-glow" />
          <div className="floating-dot floating-dot--1" />
          <div className="floating-dot floating-dot--2" />
          <div className="floating-dot floating-dot--3" />

          {/* Stylized Folder Visual with Code Badge */}
          <div className="folder-illustration">
            <svg
              className="folder-svg"
              width="140"
              height="140"
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
                  <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#1e3a8a" floodOpacity="0.28" />
                </filter>
                <filter id="badgeShadow" x="40" y="70" width="80" height="60" filterUnits="userSpaceOnUse">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.2" />
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
                <rect x="52" y="74" width="56" height="34" rx="10" fill="#ffffff" fillOpacity="0.2" stroke="#ffffff" strokeWidth="1.5" />
                {/* Code symbol */}
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
        </div>

        {/* Download Button CTA */}
        <div className="package-cta-container">
          <DownloadButton
            downloadState={downloadState}
            onClick={onDownload}
          />

          {/* Download Error Banner */}
          {downloadError && (
            <aside className="download-error-banner" role="alert">
              <span>{downloadError}</span>
              <button
                type="button"
                className="error-retry-btn"
                onClick={onRetryDownload}
              >
                Try Again
              </button>
            </aside>
          )}

          {/* Microcopy */}
          <p className="download-microcopy">Your download will start shortly.</p>

          {/* Security Guarantee Pill */}
          <div className="security-guarantee-pill" aria-label="Security status">
            <svg
              className="guarantee-shield-icon"
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

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
    <div className="hero-left-column" aria-label="Project Information and Statistics">
      {/* Top Project Header Block */}
      <div className="hero-project-header">
        {/* Top Status Pill */}
        <div className="hero-status-pill" aria-label="Status: Project Ready">
          <svg
            className="status-shield-icon"
            width="13"
            height="13"
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
        <h1 className="hero-project-title" id="project-title">
          {share.projectName}
        </h1>

        <span className="hero-project-tag">PROJECT PACKAGE</span>

        <p className="hero-project-description">
          Your project package is ready to download.
          <br />
          No account required. Just one click.
        </p>
      </div>

      {/* Stats Container Block */}
      <div className="hero-project-stats-container">
        {/* 6-Stat Dynamic Grid */}
        <div className="hero-stats-grid" role="region" aria-label="Project Package Specifications">
          {/* Stat 1: Files */}
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon--purple" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Files</span>
              <span className="stat-value">{share.fileCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Stat 2: Package Size */}
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon--cyan" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Package Size</span>
              <span className="stat-value">{formatBytes(share.packageSize)}</span>
            </div>
          </div>

          {/* Stat 3: Original Size */}
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon--blue" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Original Size</span>
              <span className="stat-value">{formatBytes(share.originalSize)}</span>
            </div>
          </div>

          {/* Stat 4: Excluded Files */}
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon--rose" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Excluded Files</span>
              <span className="stat-value">{share.excludedCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Stat 5: Shared on */}
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon--sky" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Shared on</span>
              <span className="stat-value">{formatDateOnly(share.createdAt)}</span>
            </div>
          </div>

          {/* Stat 6: Expires in */}
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-icon--emerald" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Expires in</span>
              <span className={`stat-value ${isExpired ? 'stat-value--expired' : ''}`}>
                {countdownText}
              </span>
            </div>
          </div>
        </div>

        {/* Sensitive file notice if present */}
        {share.sensitiveFileCount > 0 && (
          <aside className="sensitive-notice" role="status" aria-label="Sensitive files notice">
            <svg
              width="15"
              height="15"
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

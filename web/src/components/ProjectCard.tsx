import React from 'react';
import { SharePublicMetadata, DownloadState } from '../types/share';
import { MetadataGrid } from './MetadataGrid';
import { DownloadButton } from './DownloadButton';
import { ExpiryBadge } from './ExpiryBadge';

export interface ProjectCardProps {
  share: SharePublicMetadata;
  downloadState: DownloadState;
  downloadError: string | null;
  onDownload: () => void;
  onRetryDownload: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  share,
  downloadState,
  downloadError,
  onDownload,
  onRetryDownload,
}) => {
  return (
    <article className="project-card" aria-label="DevParcel Project Download Card">
      {/* Live Status Chip */}
      <div className="project-chip" aria-label="Status: Ready">
        <span className="chip-dot" aria-hidden="true" />
        <span>Project Ready</span>
      </div>

      {/* Neumorphic package icon container */}
      <div className="card-icon-container" aria-hidden="true">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      </div>

      {/* Dynamic Project Title */}
      <h1 className="project-title" id="project-title">
        {share.projectName}
      </h1>
      <span className="project-badge-subtitle">Project Package</span>
      <p className="project-lead">
        Your project package is ready to download. No account required.
      </p>

      {/* Dynamic Metadata Grid */}
      <MetadataGrid
        fileCount={share.fileCount}
        packageSizeBytes={share.packageSize}
        originalSizeBytes={share.originalSize}
        excludedFileCount={share.excludedCount}
        sensitiveCount={share.sensitiveFileCount}
      />

      {/* Primary Download CTA */}
      <DownloadButton
        downloadState={downloadState}
        onClick={onDownload}
      />

      {/* Inline Download Error if download preparation fails */}
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

      {/* Dynamic Expiry Ticker */}
      <ExpiryBadge expiresAt={share.expiresAt} />

      {/* Subtle Security Indicators Trust Row */}
      <div className="security-trust-row" aria-label="DevParcel security highlights">
        <span className="security-trust-item">
          <svg
            className="security-check-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Secure temporary link
        </span>
        <span className="security-trust-item">
          <svg
            className="security-check-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          No account required
        </span>
        <span className="security-trust-item">
          <svg
            className="security-check-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Automatically expires
        </span>
      </div>
    </article>
  );
};

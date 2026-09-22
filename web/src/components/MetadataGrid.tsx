import React from 'react';
import { formatBytes } from '../utils/formatters';

export interface MetadataGridProps {
  fileCount: number;
  packageSizeBytes: number;
  originalSizeBytes: number;
  excludedFileCount: number;
  sensitiveCount?: number;
}

export const MetadataGrid: React.FC<MetadataGridProps> = ({
  fileCount,
  packageSizeBytes,
  originalSizeBytes,
  excludedFileCount,
  sensitiveCount,
}) => {
  return (
    <>
      <section className="metadata-grid" aria-label="Project Package Specifications">
        <div className="metadata-item">
          <span className="metadata-label">Files</span>
          <span className="metadata-value">{fileCount.toLocaleString()}</span>
        </div>

        <div className="metadata-item">
          <span className="metadata-label">Package Size</span>
          <span className="metadata-value">{formatBytes(packageSizeBytes)}</span>
        </div>

        <div className="metadata-item">
          <span className="metadata-label">Original Size</span>
          <span className="metadata-value">{formatBytes(originalSizeBytes)}</span>
        </div>

        <div className="metadata-item">
          <span className="metadata-label">Excluded Files</span>
          <span className="metadata-value">{excludedFileCount.toLocaleString()}</span>
        </div>
      </section>

      {sensitiveCount !== undefined && sensitiveCount > 0 && (
        <aside className="sensitive-notice" role="status" aria-label="Sensitive files note">
          <svg
            width="16"
            height="16"
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
            <strong>Note:</strong> Package includes {sensitiveCount} sensitive file{sensitiveCount > 1 ? 's' : ''} permitted by sender.
          </span>
        </aside>
      )}
    </>
  );
};

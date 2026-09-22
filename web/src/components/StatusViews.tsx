import React from 'react';

/**
 * Skeleton loading state for DevParcel project page.
 */
export const SkeletonView: React.FC = () => {
  return (
    <div
      className="hero-skeleton-container"
      aria-label="Loading project metadata"
      aria-busy="true"
      role="status"
    >
      {/* Left skeleton */}
      <div className="skeleton-col skeleton-col--left">
        <div className="skeleton-bar skeleton-pill" />
        <div className="skeleton-bar skeleton-title" />
        <div className="skeleton-bar skeleton-sub" />
        <div className="skeleton-bar skeleton-text" />
        <div className="skeleton-stats-grid">
          <div className="skeleton-bar skeleton-stat-tile" />
          <div className="skeleton-bar skeleton-stat-tile" />
          <div className="skeleton-bar skeleton-stat-tile" />
          <div className="skeleton-bar skeleton-stat-tile" />
          <div className="skeleton-bar skeleton-stat-tile" />
          <div className="skeleton-bar skeleton-stat-tile" />
        </div>
      </div>

      {/* Center skeleton */}
      <div className="skeleton-col skeleton-col--center">
        <div className="skeleton-bar skeleton-circle-aura" />
        <div className="skeleton-bar skeleton-btn" />
        <div className="skeleton-bar skeleton-micro" />
        <div className="skeleton-bar skeleton-pill-bottom" />
      </div>

      {/* Right skeleton */}
      <div className="skeleton-col skeleton-col--right">
        <div className="skeleton-bar skeleton-pill" />
        <div className="skeleton-bar skeleton-headline" />
        <div className="skeleton-bar skeleton-sub" />
        <div className="skeleton-bar skeleton-bullet" />
        <div className="skeleton-bar skeleton-bullet" />
        <div className="skeleton-bar skeleton-bullet" />
        <div className="skeleton-bar skeleton-bullet" />
        <div className="skeleton-bar skeleton-btn-wide" />
      </div>
    </div>
  );
};

/**
 * Expired share link state.
 */
export const ExpiredView: React.FC<{ message?: string | null }> = ({ message }) => {
  return (
    <article className="status-card" role="alert" aria-label="Link expired">
      <div className="status-icon-circle icon-expired" aria-hidden="true">
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h1 className="status-heading">Share Unavailable</h1>
      <p className="status-body">
        {message || 'This link has expired.'}
      </p>
    </article>
  );
};

/**
 * Revoked share link state.
 */
export const RevokedView: React.FC<{ message?: string | null }> = ({ message }) => {
  return (
    <article className="status-card" role="alert" aria-label="Link revoked">
      <div className="status-icon-circle icon-revoked" aria-hidden="true">
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
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      </div>

      <h1 className="status-heading">Share Unavailable</h1>
      <p className="status-body">
        {message || 'This link has been revoked.'}
      </p>
    </article>
  );
};

/**
 * Not found share link state.
 */
export const NotFoundView: React.FC<{ message?: string | null }> = ({ message }) => {
  return (
    <article className="status-card" role="alert" aria-label="Link not found">
      <div className="status-icon-circle icon-notfound" aria-hidden="true">
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
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <h1 className="status-heading">Link Not Found</h1>
      <p className="status-body">
        {message || "This DevParcel link doesn't exist or is no longer available."}
      </p>
    </article>
  );
};

/**
 * Server/Network error state with retry.
 */
export const ServerErrorView: React.FC<{
  message?: string | null;
  onRetry: () => void;
}> = ({ message, onRetry }) => {
  return (
    <article className="status-card" role="alert" aria-label="Server error">
      <div className="status-icon-circle icon-error" aria-hidden="true">
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
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      <h1 className="status-heading">Something went wrong</h1>
      <p className="status-body">
        {message || "We couldn't load this project right now. Please check your connection."}
      </p>

      <button
        type="button"
        className="secondary-action-btn"
        onClick={onRetry}
      >
        Try Again
      </button>
    </article>
  );
};

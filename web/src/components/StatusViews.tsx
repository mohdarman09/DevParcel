import React from 'react';

/**
 * Skeleton loading state for DevParcel project page.
 */
export const SkeletonView: React.FC = () => {
  return (
    <div
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse"
      aria-label="Loading share package"
      aria-busy="true"
      role="status"
    >
      <div className="flex items-center justify-center gap-3 py-3 text-slate-700">
        <svg
          className="w-5 h-5 shrink-0 animate-spin text-blue-600"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeLinecap="round" />
        </svg>
        <span className="text-base font-semibold text-slate-800">Loading share package...</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Left skeleton */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm flex flex-col gap-4">
          <div className="w-28 h-6 rounded-full bg-slate-200" />
          <div className="w-3/4 h-10 rounded-xl bg-slate-200" />
          <div className="w-1/2 h-5 rounded-lg bg-slate-200" />
          <div className="w-full h-12 rounded-lg bg-slate-200" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            <div className="h-16 rounded-xl bg-slate-200" />
            <div className="h-16 rounded-xl bg-slate-200" />
            <div className="h-16 rounded-xl bg-slate-200" />
            <div className="h-16 rounded-xl bg-slate-200" />
            <div className="h-16 rounded-xl bg-slate-200" />
            <div className="h-16 rounded-xl bg-slate-200" />
          </div>
        </div>

        {/* Center skeleton */}
        <div className="flex flex-col items-center justify-center p-7 bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm">
          <div className="w-32 h-32 rounded-2xl bg-slate-200 mb-6" />
          <div className="w-full h-12 rounded-xl bg-slate-200 mb-3" />
          <div className="w-40 h-4 rounded bg-slate-200" />
        </div>

        {/* Right skeleton */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm flex flex-col gap-4">
          <div className="w-24 h-5 rounded-full bg-slate-200" />
          <div className="w-48 h-8 rounded-xl bg-slate-200" />
          <div className="w-full h-16 rounded-lg bg-slate-200" />
          <div className="space-y-2 mt-2">
            <div className="w-full h-5 rounded bg-slate-200" />
            <div className="w-full h-5 rounded bg-slate-200" />
            <div className="w-full h-5 rounded bg-slate-200" />
          </div>
          <div className="w-full h-10 rounded-xl bg-slate-200 mt-auto" />
        </div>
      </div>
    </div>
  );
};

/**
 * Expired share link state.
 */
export const ExpiredView: React.FC<{ message?: string | null }> = ({ message }) => {
  return (
    <article className="w-full max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200/90 shadow-soft-lg text-center" role="alert" aria-label="Link expired">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-soft-sm shrink-0" aria-hidden="true">
        <svg
          width="28"
          height="28"
          className="w-7 h-7 shrink-0"
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

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Share Unavailable</h1>
      <p className="mt-2 text-sm text-slate-600">
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
    <article className="w-full max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200/90 shadow-soft-lg text-center" role="alert" aria-label="Link revoked">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-soft-sm shrink-0" aria-hidden="true">
        <svg
          width="28"
          height="28"
          className="w-7 h-7 shrink-0"
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

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Share Unavailable</h1>
      <p className="mt-2 text-sm text-slate-600">
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
    <article className="w-full max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200/90 shadow-soft-lg text-center" role="alert" aria-label="Link not found">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center mx-auto mb-4 shadow-soft-sm shrink-0" aria-hidden="true">
        <svg
          width="28"
          height="28"
          className="w-7 h-7 shrink-0"
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

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Link Not Found</h1>
      <p className="mt-2 text-sm text-slate-600">
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
    <article className="w-full max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200/90 shadow-soft-lg text-center" role="alert" aria-label="Server error">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-soft-sm shrink-0" aria-hidden="true">
        <svg
          width="28"
          height="28"
          className="w-7 h-7 shrink-0"
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

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        {message || "We couldn't load this project right now. Please check your connection."}
      </p>

      <button
        type="button"
        className="mt-6 px-6 py-2.5 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all whitespace-nowrap"
        onClick={onRetry}
      >
        Try Again
      </button>
    </article>
  );
};

import React from 'react';

export type ShareStatusType = 'expired' | 'revoked' | 'invalid' | 'not_found' | 'error';

export interface ShareStatusNoticeProps {
  type: ShareStatusType;
  message?: string | null;
  onRetry?: () => void;
}

export const ShareStatusNotice: React.FC<ShareStatusNoticeProps> = ({
  type,
  message,
  onRetry,
}) => {
  let badgeLabel = 'LINK UNAVAILABLE';
  let heading = 'Share Link Unavailable';
  let description = 'This link is invalid or no longer available.';
  let isNetworkError = false;
  let colorScheme = 'rose';

  if (type === 'expired') {
    badgeLabel = 'LINK EXPIRED';
    heading = 'Share Link Expired';
    description = message || 'This share link is no longer available.';
    colorScheme = 'amber';
  } else if (type === 'revoked') {
    badgeLabel = 'LINK REVOKED';
    heading = 'Share Link Unavailable';
    description = message || 'This share link has been revoked or is no longer available.';
    colorScheme = 'rose';
  } else if (type === 'error') {
    badgeLabel = 'SERVICE NOTICE';
    heading = 'Share information is temporarily unavailable.';
    description = message || 'Please try again later.';
    isNetworkError = true;
    colorScheme = 'blue';
  } else {
    // invalid or not_found
    badgeLabel = 'LINK UNAVAILABLE';
    heading = 'Share Link Unavailable';
    description = message || 'This link is invalid or no longer available.';
    colorScheme = 'rose';
  }

  const borderClasses =
    colorScheme === 'amber'
      ? 'border-amber-200/90 bg-amber-50/70 text-amber-900'
      : colorScheme === 'blue'
      ? 'border-blue-200/90 bg-blue-50/70 text-blue-900'
      : 'border-rose-200/90 bg-rose-50/70 text-rose-900';

  const badgeClasses =
    colorScheme === 'amber'
      ? 'bg-amber-100/80 text-amber-800 border-amber-300/80'
      : colorScheme === 'blue'
      ? 'bg-blue-100/80 text-blue-800 border-blue-300/80'
      : 'bg-rose-100/80 text-rose-800 border-rose-300/80';

  return (
    <section
      className={`share-status-card w-full max-w-4xl mx-auto my-6 p-5 sm:p-6 rounded-2xl border ${borderClasses} shadow-soft-sm`}
      role="status"
      aria-label={heading}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 shrink-0" aria-hidden="true">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border shadow-soft-sm shrink-0 ${badgeClasses}`}>
              <svg
                width="20"
                height="20"
                className="w-5 h-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>

          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-1.5 ${badgeClasses}`}>
              <span>{badgeLabel}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{heading}</h2>
            <p className="text-sm text-slate-600 mt-0.5">{description}</p>
          </div>
        </div>

        {isNetworkError && onRetry && (
          <button
            type="button"
            className="px-5 py-2.5 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold text-sm border border-slate-300 shadow-soft-sm hover:shadow transition-all shrink-0 whitespace-nowrap"
            onClick={onRetry}
            aria-label="Retry loading share metadata"
          >
            <svg
              width="16"
              height="16"
              className="w-4 h-4 shrink-0 text-slate-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Retry</span>
          </button>
        )}
      </div>
    </section>
  );
};

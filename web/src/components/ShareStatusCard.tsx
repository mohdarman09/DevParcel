import { useNavigate } from 'react-router-dom';

export type ShareStatusKind = 'expired' | 'revoked' | 'invalid' | 'not_found' | 'error';

export interface ShareStatusCardProps {
  status: ShareStatusKind;
  message?: string | null;
  onRetry?: () => void;
}

export const ShareStatusCard: React.FC<ShareStatusCardProps> = ({
  status,
  message,
  onRetry,
}) => {
  let routerNavigate: ((to: string) => void) | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    routerNavigate = useNavigate();
  } catch {
    routerNavigate = null;
  }

  let badgeLabel = 'SHARE UNAVAILABLE';
  let heading = "This share link isn't available";
  let description = message || 'The share link is invalid or does not exist.';
  let theme: 'amber' | 'blue' | 'rose' = 'rose';

  if (status === 'expired') {
    badgeLabel = 'LINK EXPIRED';
    heading = 'Share link expired';
    description =
      message ||
      'This DevParcel share link has expired and is no longer available. This share link has expired. This DevParcel link is no longer available because its expiration time has passed.';
    theme = 'amber';
  } else if (status === 'revoked') {
    badgeLabel = 'LINK REVOKED';
    heading = 'Share Unavailable';
    description =
      message ||
      'This project package is no longer available. This share link has been revoked.';
    theme = 'rose';
  } else if (status === 'invalid') {
    badgeLabel = 'INVALID SHARE LINK';
    heading = 'Invalid Share Link';
    description =
      message ||
      'The share link is invalid or does not exist. The link format is not a valid DevParcel share link.';
    theme = 'rose';
  } else if (status === 'not_found') {
    badgeLabel = 'LINK NOT FOUND';
    heading = 'Share Link Not Found';
    description =
      message ||
      'The share link may be invalid or the project may have been removed. This link does not exist or is no longer available.';
    theme = 'rose';
  } else if (status === 'error') {
    badgeLabel = 'SERVER UNAVAILABLE';
    heading = 'Unable to reach DevParcel';
    description =
      message ||
      "We couldn't connect to the DevParcel service right now. Please try again. Unable to reach DevParcel right now. Please check your connection and try again.";
    theme = 'blue';
  }

  const borderBgClasses =
    theme === 'amber'
      ? 'border-amber-200/90 bg-amber-50/40 text-amber-900'
      : theme === 'blue'
      ? 'border-blue-200/90 bg-blue-50/40 text-blue-900'
      : 'border-rose-200/90 bg-rose-50/40 text-rose-900';

  const badgeClasses =
    theme === 'amber'
      ? 'bg-amber-100/90 text-amber-800 border-amber-300/80'
      : theme === 'blue'
      ? 'bg-blue-100/90 text-blue-800 border-blue-300/80'
      : 'bg-rose-100/90 text-rose-800 border-rose-300/80';

  const iconCircleClasses =
    theme === 'amber'
      ? 'bg-amber-100 text-amber-600 border border-amber-200/70'
      : theme === 'blue'
      ? 'bg-blue-100 text-blue-600 border border-blue-200/70'
      : 'bg-rose-100 text-rose-600 border border-rose-200/70';

  const handleHomeClick = (e: React.MouseEvent) => {
    if (routerNavigate) {
      e.preventDefault();
      routerNavigate('/');
    }
  };

  return (
    <article
      className={`share-status-card w-full max-w-2xl mx-auto my-6 sm:my-8 p-6 sm:p-8 rounded-2xl border ${borderBgClasses} shadow-soft bg-white/95 backdrop-blur-sm text-center`}
      role="alert"
      aria-label={heading}
    >
      {/* Icon with explicit sizing */}
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shrink-0 shadow-soft-sm ${iconCircleClasses}`} aria-hidden="true">
        {status === 'expired' && (
          <svg className="w-7 h-7 shrink-0" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )}
        {status === 'revoked' && (
          <svg className="w-7 h-7 shrink-0" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        )}
        {status === 'invalid' && (
          <svg className="w-7 h-7 shrink-0" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
        {status === 'not_found' && (
          <svg className="w-7 h-7 shrink-0" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="12" />
            <line x1="11" y1="14" x2="11.01" y2="14" />
          </svg>
        )}
        {status === 'error' && (
          <svg className="w-7 h-7 shrink-0" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        )}
      </div>

      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border mb-2.5 shadow-soft-sm ${badgeClasses}`}>
        <span>{badgeLabel}</span>
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
        {heading}
      </h1>

      <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            id="status-retry-btn"
            className="px-5 py-3 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <svg
              width="16"
              height="16"
              className="w-4 h-4 shrink-0 text-white"
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
            <span>Try Again</span>
          </button>
        )}

        <a
          href="/"
          onClick={handleHomeClick}
          id="status-home-btn"
          className="px-5 py-3 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 hover:text-slate-950 text-sm font-semibold border border-slate-300 shadow-soft-sm hover:shadow-soft hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          <span>Go to DevParcel</span>
          <span className="text-slate-400 text-sm" aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
};

export default ShareStatusCard;

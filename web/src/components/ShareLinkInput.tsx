import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface ShareLinkValidationResult {
  isValid: boolean;
  token: string;
  errorMessage: string | null;
}

/**
 * Validates user input and extracts a valid DevParcel share token.
 * Provides clear, actionable error messages when the link format is invalid.
 */
export function validateShareInput(input: string): ShareLinkValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      isValid: false,
      token: '',
      errorMessage: 'Please enter a DevParcel share link.',
    };
  }

  // 1. Complete URL starting with http:// or https://
  if (/^https?:\/\//i.test(trimmed)) {
    const urlMatch = trimmed.match(/^https?:\/\/([^/\s:]+)(?::\d+)?(\/.*)?$/i);
    const hostname = urlMatch ? urlMatch[1].toLowerCase() : '';
    const pathAndQuery = urlMatch && urlMatch[2] ? urlMatch[2] : '';

    const isDevParcelHost =
      hostname === 'dev-parcel.vercel.app' ||
      hostname.endsWith('.dev-parcel.vercel.app') ||
      hostname === 'devparcel.com' ||
      hostname.endsWith('.devparcel.com') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1';

    if (!isDevParcelHost) {
      return {
        isValid: false,
        token: '',
        errorMessage:
          'Invalid DevParcel share link. Please enter a valid link such as https://dev-parcel.vercel.app/share/ABC123',
      };
    }

    if (!pathAndQuery.toLowerCase().includes('/share')) {
      return {
        isValid: false,
        token: '',
        errorMessage:
          "Invalid share link. DevParcel links must include '/share/' followed by a token (e.g. https://dev-parcel.vercel.app/share/ABC123).",
      };
    }

    const shareMatch = pathAndQuery.match(/\/share\/([a-zA-Z0-9_\-]+)/i);
    if (!shareMatch || !shareMatch[1] || !shareMatch[1].trim()) {
      return {
        isValid: false,
        token: '',
        errorMessage:
          'Share token is missing. Please enter a valid link such as https://dev-parcel.vercel.app/share/ABC123',
      };
    }

    return {
      isValid: true,
      token: shareMatch[1].trim(),
      errorMessage: null,
    };
  }

  // 2. Domain-first URL without protocol (e.g., dev-parcel.vercel.app/share/ABC123)
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d+)?\//i.test(trimmed)) {
    const parts = trimmed.match(/^([^/\s:]+)(?::\d+)?(\/.*)?$/i);
    const hostname = parts ? parts[1].toLowerCase() : '';
    const pathAndQuery = parts && parts[2] ? parts[2] : '';

    const isDevParcelHost =
      hostname === 'dev-parcel.vercel.app' ||
      hostname.endsWith('.dev-parcel.vercel.app') ||
      hostname === 'devparcel.com' ||
      hostname.endsWith('.devparcel.com') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1';

    if (!isDevParcelHost) {
      return {
        isValid: false,
        token: '',
        errorMessage:
          'Invalid DevParcel share link. Please enter a valid link such as https://dev-parcel.vercel.app/share/ABC123',
      };
    }

    if (!pathAndQuery.toLowerCase().includes('/share')) {
      return {
        isValid: false,
        token: '',
        errorMessage:
          "Invalid share link. DevParcel links must include '/share/' followed by a token (e.g. https://dev-parcel.vercel.app/share/ABC123).",
      };
    }

    const shareMatch = pathAndQuery.match(/\/share\/([a-zA-Z0-9_\-]+)/i);
    if (!shareMatch || !shareMatch[1] || !shareMatch[1].trim()) {
      return {
        isValid: false,
        token: '',
        errorMessage:
          'Share token is missing. Please enter a valid link such as https://dev-parcel.vercel.app/share/ABC123',
      };
    }

    return {
      isValid: true,
      token: shareMatch[1].trim(),
      errorMessage: null,
    };
  }

  // 3. Domain alone without path (e.g. "dev-parcel.vercel.app" or "google.com")
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(trimmed)) {
    return {
      isValid: false,
      token: '',
      errorMessage:
        'Invalid DevParcel share link. Please enter a valid link such as https://dev-parcel.vercel.app/share/ABC123',
    };
  }

  // 4. Relative path starting with /
  if (trimmed.startsWith('/')) {
    if (!trimmed.toLowerCase().startsWith('/share')) {
      return {
        isValid: false,
        token: '',
        errorMessage:
          'Invalid DevParcel share link. Please enter a valid link such as https://dev-parcel.vercel.app/share/ABC123',
      };
    }

    const shareMatch = trimmed.match(/^\/share\/([a-zA-Z0-9_\-]+)/i);
    if (!shareMatch || !shareMatch[1] || !shareMatch[1].trim()) {
      return {
        isValid: false,
        token: '',
        errorMessage:
          'Share token is missing. Please enter a valid link such as https://dev-parcel.vercel.app/share/ABC123',
      };
    }

    return {
      isValid: true,
      token: shareMatch[1].trim(),
      errorMessage: null,
    };
  }

  // 5. Raw token string (alphanumeric, underscore, hyphen)
  if (/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
    return {
      isValid: true,
      token: trimmed,
      errorMessage: null,
    };
  }

  // 6. Any other malformed input
  return {
    isValid: false,
    token: '',
    errorMessage:
      'Invalid DevParcel share link. Please enter a valid link such as https://dev-parcel.vercel.app/share/ABC123',
  };
}

/**
 * Normalizes user input to extract a valid DevParcel share token.
 * Retains backwards compatibility with existing callers.
 */
export function extractShareToken(input: string): string {
  const result = validateShareInput(input);
  return result.isValid ? result.token : '';
}

export interface ShareLinkInputProps {
  onNavigate?: (path: string) => void;
}

export const ShareLinkInput: React.FC<ShareLinkInputProps> = ({ onNavigate }) => {
  const [inputValue, setInputValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  let routerNavigate: ((to: string) => void) | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    routerNavigate = useNavigate();
  } catch {
    routerNavigate = null;
  }

  const navigateTo = (targetPath: string) => {
    if (onNavigate) {
      onNavigate(targetPath);
    } else if (routerNavigate) {
      routerNavigate(targetPath);
    } else if (typeof window !== 'undefined') {
      window.location.assign(targetPath);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateShareInput(inputValue);

    if (!result.isValid || !result.token) {
      setErrorMessage(
        result.errorMessage ||
          'Invalid DevParcel share link. Please enter a valid link such as https://dev-parcel.vercel.app/share/ABC123'
      );
      return;
    }

    setIsValidating(true);
    setErrorMessage(null);

    try {
      // Navigate to the share page route so the share page performs the actual validation & API request
      navigateTo(`/share/${encodeURIComponent(result.token)}`);
    } catch {
      setErrorMessage('Unable to open this share link. Please check the link and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <section
      className="w-full max-w-2xl mx-auto my-6 sm:my-8 p-6 sm:p-7 bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft transition-all"
      aria-label="Access a DevParcel Share"
    >
      <div className="text-center sm:text-left mb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2 shadow-soft-sm">
          <svg
            className="w-3.5 h-3.5 shrink-0"
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
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>Direct Access</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Have a DevParcel share link?
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mt-1">
          Paste your secure share link below to access the project package.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg
                className="w-5 h-5 shrink-0"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <input
              id="share-link-input"
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isValidating}
              placeholder="Paste your DevParcel share link here..."
              aria-label="DevParcel share link or token"
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            id="share-link-submit-btn"
            disabled={isValidating}
            className="px-6 py-3 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm sm:text-base shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 shrink-0 whitespace-nowrap"
          >
            {isValidating ? (
              <>
                <svg
                  className="w-4 h-4 shrink-0 animate-spin text-white"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeLinecap="round" />
                </svg>
                <span>Opening share...</span>
              </>
            ) : (
              <>
                <span>Open Share</span>
                <svg
                  className="w-4 h-4 shrink-0"
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
        </div>

        {errorMessage && (
          <div
            id="share-link-error"
            role="alert"
            className="mt-3.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-sm flex items-start gap-2.5 animate-fadeIn shadow-soft-sm"
          >
            <svg
              className="w-4 h-4 mt-0.5 shrink-0 text-rose-600"
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}
      </form>
    </section>
  );
};

export default ShareLinkInput;

import React, { useState } from 'react';

export interface PasswordProtectedViewProps {
  projectName?: string;
  isVerifying: boolean;
  errorMessage?: string | null;
  onSubmitPassword: (password: string) => void;
}

export const PasswordProtectedView: React.FC<PasswordProtectedViewProps> = ({
  projectName,
  isVerifying,
  errorMessage,
  onSubmitPassword,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isVerifying) return;
    onSubmitPassword(password);
  };

  return (
    <article
      className="w-full max-w-md mx-auto my-10 p-6 sm:p-8 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-soft-lg text-center"
      role="region"
      aria-label="Password protection prompt"
    >
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
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-bold uppercase tracking-wider mb-3">
        <span>PASSWORD PROTECTED</span>
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
        {projectName ? projectName : 'Password Protected'}
      </h1>
      <p className="mt-2 text-sm text-slate-600 max-w-xs mx-auto">
        This project is protected.
        <br />
        Enter the password to continue.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 w-full max-w-sm mx-auto">
        <div className="relative mb-3">
          <input
            id="share-password-input"
            type={showPassword ? 'text' : 'password'}
            className={`w-full h-12 pl-4 pr-11 rounded-xl border ${
              errorMessage ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 bg-slate-50/50'
            } text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all`}
            placeholder="Enter password"
            aria-label="Project password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isVerifying}
            autoFocus
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
            title={showPassword ? 'Hide password' : 'Show password'}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="20" height="20" className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="20" height="20" className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="3" r="3" />
              </svg>
            )}
          </button>
        </div>

        {errorMessage && (
          <div
            className="p-3 mb-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs sm:text-sm text-left flex items-start gap-2"
            role="alert"
          >
            <svg width="16" height="16" className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!password.trim() || isVerifying}
          className="w-full px-6 py-3 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm sm:text-base shadow-soft hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
        >
          {isVerifying ? (
            <>
              <svg width="16" height="16" className="w-4 h-4 shrink-0 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeLinecap="round" />
              </svg>
              <span>Verifying...</span>
            </>
          ) : (
            <span>Continue →</span>
          )}
        </button>
      </form>
    </article>
  );
};

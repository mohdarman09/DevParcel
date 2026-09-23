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
      className="status-card password-protected-card"
      role="region"
      aria-label="Password protection prompt"
    >
      <div className="status-icon-circle icon-protected" aria-hidden="true">
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
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <div className="hero-status-pill" style={{ margin: '0 auto 12px' }}>
        <span>PASSWORD PROTECTED</span>
      </div>

      <h1 className="status-heading">
        {projectName ? projectName : 'Password Protected'}
      </h1>
      <p className="status-body" style={{ maxWidth: '400px', margin: '0 auto 20px' }}>
        This project is protected.
        <br />
        Enter the password to continue.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ width: '100%', maxWidth: '340px', margin: '0 auto' }}
      >
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input
            id="share-password-input"
            type={showPassword ? 'text' : 'password'}
            className={`password-input-field ${errorMessage ? 'password-input-field--error' : ''}`}
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
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={showPassword ? 'Hide password' : 'Show password'}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              color: '#ef4444',
              fontSize: '13px',
              marginBottom: '14px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              padding: '8px 12px',
              borderRadius: '8px',
            }}
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          className="download-cta-btn"
          disabled={!password.trim() || isVerifying}
          style={{ width: '100%', justifyContent: 'center', height: '46px' }}
        >
          {isVerifying ? <span>Verifying...</span> : <span>Continue →</span>}
        </button>
      </form>
    </article>
  );
};

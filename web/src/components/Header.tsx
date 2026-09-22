import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="app-header" role="banner" aria-label="DevParcel Header">
      <div className="header-container">
        <div className="header-brand-lockup">
          <div className="brand-icon-wrapper" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className="brand-text-block">
            <span className="brand-title">DevParcel</span>
            <span className="brand-subtitle">Secure Project Sharing</span>
          </div>
        </div>

        <div className="header-trust-pill" aria-label="DevParcel guarantee: Safe, Secure, Simple">
          <svg
            className="trust-shield-icon"
            width="15"
            height="15"
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
          <span className="trust-pill-text">Safe • Secure • Simple</span>
        </div>
      </div>
    </header>
  );
};

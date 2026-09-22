import React from 'react';

export const TrustStrip: React.FC = () => {
  return (
    <section className="trust-strip-section" aria-label="DevParcel Benefits and Guarantees">
      <div className="trust-strip-grid">
        {/* Item 1: Secure Sharing */}
        <div className="trust-strip-card">
          <div className="trust-icon-circle trust-icon--green" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <h3 className="trust-card-title">Secure Sharing</h3>
          <p className="trust-card-desc">
            Your code, your control.
            <br />
            Sensitive files stay private.
          </p>
        </div>

        {/* Item 2: No Account Needed */}
        <div className="trust-strip-card">
          <div className="trust-icon-circle trust-icon--blue" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h3 className="trust-card-title">No Account Needed</h3>
          <p className="trust-card-desc">
            Recipients can download
            <br />
            instantly, no signup required.
          </p>
        </div>

        {/* Item 3: Built for Developers */}
        <div className="trust-strip-card">
          <div className="trust-icon-circle trust-icon--purple" aria-hidden="true">
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
          <h3 className="trust-card-title">Built for Developers</h3>
          <p className="trust-card-desc">
            A seamless way to share
            <br />
            projects with anyone.
          </p>
        </div>

        {/* Item 4: Open Source */}
        <div className="trust-strip-card">
          <div className="trust-icon-circle trust-icon--rose" aria-hidden="true">
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
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <h3 className="trust-card-title">Open Source</h3>
          <p className="trust-card-desc">
            Built for the global developer
            <br />
            community.
          </p>
        </div>
      </div>
    </section>
  );
};

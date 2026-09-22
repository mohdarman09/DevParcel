import React from 'react';

export const QuoteSection: React.FC = () => {
  return (
    <section className="quote-section" aria-label="DevParcel Brand Philosophy">
      {/* Decorative Tilted Code Badge in background */}
      <div className="quote-bg-badge" aria-hidden="true">
        <div className="floating-code-tile">
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
      </div>

      <div className="quote-container">
        <span className="quote-mark" aria-hidden="true">
          “
        </span>
        <blockquote className="quote-text">
          Share code, not the chaos.
        </blockquote>
        <div className="quote-rule" aria-hidden="true" />
        <span className="quote-author">DevParcel</span>
      </div>
    </section>
  );
};

import React from 'react';
import { siteConfig } from '../config/siteConfig';

export const Footer: React.FC = () => {
  const { name } = siteConfig.creator;

  return (
    <footer className="app-footer" role="contentinfo" aria-label="DevParcel Footer">
      <div className="footer-container">
        {/* Left: Brand */}
        <div className="footer-left">
          <div className="footer-brand-icon" aria-hidden="true">
            <svg
              width="16"
              height="16"
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
          <div className="footer-brand-text">
            <span className="footer-brand-name">DevParcel</span>
            <span className="footer-brand-tagline">Secure Project Sharing</span>
          </div>
        </div>

        {/* Center: Copyright Notice */}
        <div className="footer-center" aria-label="Copyright Notice">
          <span className="footer-copyright">© {new Date().getFullYear()} DevParcel. All rights reserved.</span>
        </div>

        {/* Right: Credits */}
        <div className="footer-right">
          <span>Engineered for developers</span>
          <span className="footer-creator-credit">Created by {name}</span>
        </div>
      </div>
    </footer>
  );
};

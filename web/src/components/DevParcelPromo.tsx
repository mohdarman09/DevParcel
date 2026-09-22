import React from 'react';
import { siteConfig } from '../config/siteConfig';

export const DevParcelPromo: React.FC = () => {
  const hasMarketplaceUrl = Boolean(siteConfig.marketplaceUrl);

  return (
    <div className="hero-right-column" aria-label="About DevParcel VS Code Extension">
      <div className="promo-editorial-container">
        <span className="promo-category-tag">BUILT FOR DEVELOPERS</span>

        <h2 className="promo-headline">
          Share Your Projects
          <br />
          Securely with
          <br />
          <span className="promo-brand-highlight">DevParcel</span>
        </h2>

        <p className="promo-subheadline">
          A VS Code extension to package and share your projects safely, excluding sensitive
          files automatically.
        </p>

        <ul className="promo-feature-list" aria-label="DevParcel capabilities">
          <li className="promo-feature-row">
            <div className="feature-circle-icon feature-circle--amber" aria-hidden="true">
              <svg
                width="14"
                height="14"
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
            <span>One-click project packaging</span>
          </li>

          <li className="promo-feature-row">
            <div className="feature-circle-icon feature-circle--teal" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span>Automatically exclude sensitive files</span>
          </li>

          <li className="promo-feature-row">
            <div className="feature-circle-icon feature-circle--indigo" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span>Get a shareable download link</span>
          </li>

          <li className="promo-feature-row">
            <div className="feature-circle-icon feature-circle--emerald" aria-hidden="true">
              <svg
                width="14"
                height="14"
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
            <span>Simple, fast and secure</span>
          </li>
        </ul>

        {/* CTA Button */}
        <div className="promo-cta-box">
          {hasMarketplaceUrl ? (
            <a
              href={siteConfig.marketplaceUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="vscode-cta-btn"
              id="marketplace-cta-link"
            >
              <svg
                className="vscode-logo-svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.26a1 1 0 0 0-.005 1.415L3.98 12 .322 15.324a1 1 0 0 0 .005 1.416l1.322 1.201a1 1 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zM18 16.712l-6.832-5.112L18 6.488v10.224z" />
              </svg>
              <span>Get DevParcel for VS Code</span>
              <svg
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
            </a>
          ) : (
            <div
              className="vscode-cta-pending"
              id="marketplace-cta-pending"
              role="status"
              aria-label="Coming soon to VS Code Marketplace"
            >
              <svg
                className="vscode-logo-svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.26a1 1 0 0 0-.005 1.415L3.98 12 .322 15.324a1 1 0 0 0 .005 1.416l1.322 1.201a1 1 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zM18 16.712l-6.832-5.112L18 6.488v10.224z" />
              </svg>
              <span>Coming soon to VS Code Marketplace</span>
            </div>
          )}

          <div className="marketplace-subtext">
            <span className="bullet-dot">•</span>
            <span>{hasMarketplaceUrl ? 'Available on VS Code Marketplace' : 'Coming soon to VS Code Marketplace'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

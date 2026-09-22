import React from 'react';
import { siteConfig } from '../config/siteConfig';

export const CreatorCard: React.FC = () => {
  const { name, role, bio, linkedinUrl, portfolioUrl, githubUrl } = siteConfig.creator;

  return (
    <section className="creator-panel" aria-label="About the Creator">
      <div className="creator-panel-inner">
        {/* Left: Developer Identity (Strictly No Photo / No Avatar as instructed) */}
        <div className="creator-identity-col">
          <div className="creator-avatar-badge" aria-hidden="true">
            <span className="creator-initials">MA</span>
          </div>

          <div className="creator-text-block">
            <span className="creator-kicker">Developed by</span>
            <h3 className="creator-name">{name}</h3>
            <span className="creator-role">{role}</span>
            <p className="creator-bio">{bio}</p>
          </div>
        </div>

        {/* Center: Social Action Pills */}
        <div className="creator-actions-col" aria-label="Creator links">
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="creator-pill-btn creator-pill--linkedin"
              id="creator-linkedin-link"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              <span>LinkedIn</span>
              <span className="arrow-sup">↗</span>
            </a>
          )}

          {portfolioUrl && (
            <a
              href={portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="creator-pill-btn creator-pill--portfolio"
              id="creator-portfolio-link"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Portfolio</span>
              <span className="arrow-sup">↗</span>
            </a>
          )}

          {githubUrl ? (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="creator-pill-btn creator-pill--github"
              id="creator-github-link"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              <span>GitHub</span>
              <span className="arrow-sup">↗</span>
            </a>
          ) : (
            <div
              className="creator-pill-disabled"
              id="creator-github-pending"
              role="status"
              aria-label="GitHub repository coming soon"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              <div className="github-text-wrap">
                <span className="github-main-text">GitHub</span>
                <span className="github-sub-text">Coming Soon</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Signature Quotation */}
        <div className="creator-signature-col" aria-hidden="true">
          <p className="signature-quote">
            “Let&apos;s build
            <br />
            a better dev experience.”
          </p>
          <span className="signature-author">— Mohd Arman</span>
        </div>
      </div>
    </section>
  );
};

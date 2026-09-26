import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '../src/pages/LandingPage';
import { ShareDownloadPage } from '../src/pages/ShareDownloadPage';
import { extractShareToken, validateShareInput, ShareLinkInput } from '../src/components/ShareLinkInput';
import { HeroProjectInfo } from '../src/components/HeroProjectInfo';
import { HeroDownloadVisual } from '../src/components/HeroDownloadVisual';
import { DevParcelPromo } from '../src/components/DevParcelPromo';
import { ShareStatusCard } from '../src/components/ShareStatusCard';
import { DeveloperCard } from '../src/components/DeveloperCard';
import { SharePublicMetadata } from '../src/types/share';

describe('Route Separation and Share Flow Verification', () => {
  const sampleShare: SharePublicMetadata = {
    token: 'tKql19_Pr9i8Nj_drjZSw',
    publicUrl: 'https://dev-parcel.vercel.app/share/tKql19_Pr9i8Nj_drjZSw',
    projectName: 'AcmeProject',
    fileCount: 42,
    originalSize: 10485760,
    packageSize: 3145728,
    excludedCount: 8,
    sensitiveFileCount: 0,
    createdAt: '2026-09-25T10:00:00.000Z',
    expiresAt: '2026-09-28T10:00:00.000Z',
    downloadCount: 5,
    status: 'active',
    isPasswordProtected: false,
  };

  describe('Test A: Base Route (/) Landing Page', () => {
    it('renders LandingPage containing hero, features, availability, and share-link input section', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/'] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, { path: '/', element: React.createElement(LandingPage) })
          )
        )
      );

      // DevParcel branding
      assert.ok(html.includes('DevParcel'));
      assert.ok(html.includes('Secure Project Sharing'));

      // Hero / landing content
      assert.ok(html.includes('Share Projects Securely with'));
      assert.ok(html.includes('Get DevParcel'));
      assert.ok(html.includes('View on GitHub'));

      // Share-link input section
      assert.ok(html.includes('Have a DevParcel share link?'));
      assert.ok(html.includes('Paste your secure share link below to access the project package.'));
      assert.ok(html.includes('Open Share'));
      assert.ok(html.includes('id="share-link-input"'));
      assert.ok(html.includes('id="share-link-submit-btn"'));

      // Product information & features
      assert.ok(html.includes('One-click project packaging'));
      assert.ok(html.includes('Automatically exclude sensitive files'));

      // Developer information
      assert.ok(html.includes('Mohd Arman'));
      assert.ok(html.includes('LinkedIn'));
      assert.ok(html.includes('Portfolio'));
      assert.ok(html.includes('GitHub'));

      // Must NOT contain share-page download visual or project details
      assert.strictEqual(html.includes('Download ZIP'), false);
      assert.strictEqual(html.includes('PROJECT READY'), false);
      assert.strictEqual(html.includes('share-status-card'), false);
    });
  });

  describe('Test B & C: Valid Share Route (/share/:token)', () => {
    it('renders valid share page with 3-column layout and developer card', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          'div',
          null,
          React.createElement(
            'section',
            { className: 'hero-section grid grid-cols-1 lg:grid-cols-3' },
            React.createElement(HeroProjectInfo, { share: sampleShare }),
            React.createElement(HeroDownloadVisual, {
              downloadState: 'idle',
              downloadError: null,
              onDownload: () => {},
              onRetryDownload: () => {},
            }),
            React.createElement(DevParcelPromo)
          ),
          React.createElement(DeveloperCard)
        )
      );

      // Left side: Project ready badge, DevParcel, PROJECT PACKAGE, etc.
      assert.ok(html.includes('PROJECT READY'));
      assert.ok(html.includes('AcmeProject'));
      assert.ok(html.includes('PROJECT PACKAGE'));
      assert.ok(html.includes('Your project package is ready to download.'));
      assert.ok(html.includes('No account required. Just one click.'));
      assert.ok(html.includes('Files'));
      assert.ok(html.includes('42'));
      assert.ok(html.includes('Package Size'));
      assert.ok(html.includes('Original Size'));
      assert.ok(html.includes('Excluded Files'));
      assert.ok(html.includes('Shared on'));
      assert.ok(html.includes('Expires in'));

      // Center: Visual, Download ZIP button, download helper text, secure/expiry status
      assert.ok(html.includes('Download ZIP'));
      assert.ok(html.includes('Your download will start shortly.'));
      assert.ok(html.includes('This link is secure and expires automatically'));

      // Right side: Built for developers, promo, capabilities
      assert.ok(html.includes('BUILT FOR DEVELOPERS'));
      assert.ok(html.includes('Share Your Projects'));
      assert.ok(html.includes('Securely with'));
      assert.ok(html.includes('DevParcel'));
      assert.ok(html.includes('Available for VS Code &amp; Antigravity') || html.includes('Available for VS Code & Antigravity'));

      // STRICTLY MUST NOT contain "Have a DevParcel share link?"
      assert.strictEqual(html.includes('Have a DevParcel share link?'), false);
      assert.strictEqual(html.includes('Paste your secure share link below'), false);
      assert.strictEqual(html.includes('Open Share'), false);
    });

    it('SharePage component layout strictly excludes ShareLinkInput in all states', () => {
      // Test the error/unavailable state layout in SharePage
      const errorStateHtml = renderToStaticMarkup(
        React.createElement(
          'div',
          { className: 'w-full max-w-4xl mx-auto py-4 sm:py-6 space-y-6' },
          React.createElement(ShareStatusCard, { status: 'not_found' }),
          React.createElement(DevParcelPromo),
          React.createElement(DeveloperCard)
        )
      );

      assert.ok(errorStateHtml.includes('Link Not Found'));
      assert.ok(errorStateHtml.includes('Go to DevParcel'));
      assert.ok(errorStateHtml.includes('Share Your Projects'));
      assert.ok(errorStateHtml.includes('Mohd Arman'));

      // CRITICAL REQUIREMENT: ShareLinkInput must NOT appear on /share/:token error states
      assert.strictEqual(errorStateHtml.includes('Have a DevParcel share link?'), false);
      assert.strictEqual(errorStateHtml.includes('Paste your secure share link below'), false);
      assert.strictEqual(errorStateHtml.includes('id="share-link-input"'), false);
      assert.strictEqual(errorStateHtml.includes('Open Share'), false);
    });
  });

  describe('Test D: Unavailable / Invalid Share Route', () => {
    it('renders unavailable/invalid status card with branding and developer card, NO download or project details', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          'div',
          null,
          React.createElement(ShareStatusCard, { status: 'invalid' }),
          React.createElement(DevParcelPromo),
          React.createElement(DeveloperCard)
        )
      );

      assert.ok(html.includes('Invalid Share Link'));
      assert.ok(html.includes('The share link is invalid or does not exist.'));
      assert.ok(html.includes('Go to DevParcel'));
      assert.ok(html.includes('Mohd Arman'));

      // Must NOT contain project details, download button, or fake expiry
      assert.strictEqual(html.includes('Download ZIP'), false);
      assert.strictEqual(html.includes('PROJECT READY'), false);
      assert.strictEqual(html.includes('PROJECT PACKAGE'), false);
      assert.strictEqual(html.includes('Have a DevParcel share link?'), false);
    });
  });

  describe('Test E: Expired Share Route', () => {
    it('renders expired state with "This share link has expired." message and Go to DevParcel link', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          'div',
          null,
          React.createElement(ShareStatusCard, {
            status: 'expired',
            message: 'This share link has expired.',
          }),
          React.createElement(DevParcelPromo),
          React.createElement(DeveloperCard)
        )
      );

      assert.ok(html.includes('Share link expired'));
      assert.ok(html.includes('This share link has expired.'));
      assert.ok(html.includes('Go to DevParcel'));

      // Must NOT contain project details or download button
      assert.strictEqual(html.includes('Download ZIP'), false);
      assert.strictEqual(html.includes('PROJECT READY'), false);
      assert.strictEqual(html.includes('Have a DevParcel share link?'), false);
    });
  });

  describe('Link Normalization & Token Extraction', () => {
    it('extracts token from full production share URL', () => {
      assert.strictEqual(
        extractShareToken('https://dev-parcel.vercel.app/share/tKql19_Pr9i8Nj_drjZSw'),
        'tKql19_Pr9i8Nj_drjZSw'
      );
    });

    it('extracts token from URL with trailing slash', () => {
      assert.strictEqual(
        extractShareToken('https://dev-parcel.vercel.app/share/tKql19_Pr9i8Nj_drjZSw/'),
        'tKql19_Pr9i8Nj_drjZSw'
      );
    });

    it('extracts token from URL with query parameters', () => {
      assert.strictEqual(
        extractShareToken('https://dev-parcel.vercel.app/share/tKql19_Pr9i8Nj_drjZSw?download=direct&src=ext'),
        'tKql19_Pr9i8Nj_drjZSw'
      );
    });

    it('extracts token from relative share path', () => {
      assert.strictEqual(
        extractShareToken('/share/tKql19_Pr9i8Nj_drjZSw'),
        'tKql19_Pr9i8Nj_drjZSw'
      );
    });

    it('extracts raw token with surrounding whitespace', () => {
      assert.strictEqual(
        extractShareToken('   tKql19_Pr9i8Nj_drjZSw   '),
        'tKql19_Pr9i8Nj_drjZSw'
      );
    });

    it('rejects clearly invalid URLs without /share/ token', () => {
      assert.strictEqual(extractShareToken('https://google.com'), '');
      assert.strictEqual(extractShareToken('https://dev-parcel.vercel.app'), '');
      assert.strictEqual(extractShareToken('https://dev-parcel.vercel.app/'), '');
      assert.strictEqual(extractShareToken('https://dev-parcel.vercel.app/about'), '');
      assert.strictEqual(extractShareToken('random-invalid text with spaces'), '');
    });
  });

  describe('Input Validation on Base Page', () => {
    it('ShareLinkInput renders input field with proper aria-label and submit button', () => {
      const html = renderToStaticMarkup(React.createElement(ShareLinkInput));
      assert.ok(html.includes('id="share-link-input"'));
      assert.ok(html.includes('id="share-link-submit-btn"'));
      assert.ok(html.includes('Open Share'));
      assert.ok(html.includes('Have a DevParcel share link?'));
    });

    it('validateShareInput provides specific error messages for invalid formats', () => {
      // Empty input
      const emptyResult = validateShareInput('');
      assert.strictEqual(emptyResult.isValid, false);
      assert.strictEqual(emptyResult.errorMessage, 'Please enter a DevParcel share link.');

      // Wrong domain
      const wrongDomainResult = validateShareInput('https://google.com');
      assert.strictEqual(wrongDomainResult.isValid, false);
      assert.ok(wrongDomainResult.errorMessage?.includes('https://dev-parcel.vercel.app/share/ABC123'));

      // Missing /share/
      const missingShareResult = validateShareInput('https://dev-parcel.vercel.app');
      assert.strictEqual(missingShareResult.isValid, false);
      assert.ok(missingShareResult.errorMessage?.includes("must include '/share/'"));

      // Missing token
      const missingTokenResult = validateShareInput('https://dev-parcel.vercel.app/share/');
      assert.strictEqual(missingTokenResult.isValid, false);
      assert.ok(missingTokenResult.errorMessage?.includes('Share token is missing'));

      // Valid full URL
      const validResult = validateShareInput('https://dev-parcel.vercel.app/share/ABC123');
      assert.strictEqual(validResult.isValid, true);
      assert.strictEqual(validResult.token, 'ABC123');
      assert.strictEqual(validResult.errorMessage, null);
    });

    it('ShareStatusCard renders both "Try Again" and "Go to DevParcel" buttons', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusCard, {
          status: 'not_found',
          onRetry: () => {},
        })
      );

      assert.ok(html.includes('Try Again'));
      assert.ok(html.includes('id="status-retry-btn"'));
      assert.ok(html.includes('Go to DevParcel'));
      assert.ok(html.includes('id="status-home-btn"'));
    });
  });

  describe('Router Configuration', () => {
    it('ShareDownloadPage backward-compatible wrapper delegates to LandingPage on / and SharePage on /share/:token', () => {
      const landingHtml = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/'] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, { path: '/', element: React.createElement(ShareDownloadPage) })
          )
        )
      );
      assert.ok(landingHtml.includes('Have a DevParcel share link?'));

      const shareHtml = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/share/test-token-123'] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, {
              path: '/share/:token',
              element: React.createElement(ShareDownloadPage),
            })
          )
        )
      );
      // SharePage does NOT contain ShareLinkInput
      assert.strictEqual(shareHtml.includes('Have a DevParcel share link?'), false);
    });
  });
});

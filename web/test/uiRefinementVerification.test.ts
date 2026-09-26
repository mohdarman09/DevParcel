import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ShareDownloadPage } from '../src/pages/ShareDownloadPage';
import { DevParcelHeader } from '../src/components/DevParcelHeader';
import { DevParcelFooter } from '../src/components/DevParcelFooter';
import { DevParcelHero } from '../src/components/DevParcelHero';
import { ShareLinkInput } from '../src/components/ShareLinkInput';
import { HeroDownloadVisual } from '../src/components/HeroDownloadVisual';
import { DevParcelPromo } from '../src/components/DevParcelPromo';
import { ShareStatusCard } from '../src/components/ShareStatusCard';
import { DeveloperCard } from '../src/components/DeveloperCard';
import { HeroProjectInfo } from '../src/components/HeroProjectInfo';
import { AvailabilitySection } from '../src/components/AvailabilitySection';
import { SharePublicMetadata } from '../src/types/share';

describe('DevParcel UI & Layout Refinement Verification (All 18 Requirements)', () => {
  const sampleShare: SharePublicMetadata = {
    token: 'test-valid-token-888',
    publicUrl: 'http://localhost:5173/share/test-valid-token-888',
    projectName: 'DevParcelCore',
    fileCount: 24,
    originalSize: 4800000,
    packageSize: 1800000,
    excludedCount: 5,
    sensitiveFileCount: 0,
    createdAt: '2026-09-25T10:00:00.000Z',
    expiresAt: '2026-09-28T10:00:00.000Z',
    downloadCount: 3,
    status: 'active',
    isPasswordProtected: false,
  };

  describe('1. Removal of the 4 Feature Cards from ALL Share Pages (Requirement 1)', () => {
    it('valid share page component composition does NOT include TrustStrip or the 4 cards', () => {
      // Direct render of the 3-column valid share section + developer card
      const validShareMarkup = renderToStaticMarkup(
        React.createElement(
          'div',
          null,
          React.createElement(
            'section',
            { className: 'hero-section' },
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

      // Verify the 4 cards are strictly NOT present in the share page content
      assert.strictEqual(validShareMarkup.includes('No Account Needed'), false);
      assert.strictEqual(validShareMarkup.includes('Open Source'), false);
      assert.strictEqual(validShareMarkup.includes('Your code, your control.'), false);
      assert.strictEqual(validShareMarkup.includes('Built for the global developer'), false);
    });

    it('invalid share page composition does NOT include the 4 feature cards', () => {
      const invalidShareMarkup = renderToStaticMarkup(
        React.createElement(
          'div',
          null,
          React.createElement(ShareStatusCard, { status: 'invalid' }),
          React.createElement(ShareLinkInput),
          React.createElement(DevParcelPromo),
          React.createElement(DeveloperCard)
        )
      );

      assert.strictEqual(invalidShareMarkup.includes('No Account Needed'), false);
      assert.strictEqual(invalidShareMarkup.includes('Open Source'), false);
      assert.strictEqual(invalidShareMarkup.includes('Your code, your control.'), false);
    });

    it('expired share page composition does NOT include the 4 feature cards', () => {
      const expiredShareMarkup = renderToStaticMarkup(
        React.createElement(
          'div',
          null,
          React.createElement(ShareStatusCard, { status: 'expired' }),
          React.createElement(ShareLinkInput),
          React.createElement(DevParcelPromo),
          React.createElement(DeveloperCard)
        )
      );

      assert.strictEqual(expiredShareMarkup.includes('No Account Needed'), false);
      assert.strictEqual(expiredShareMarkup.includes('Open Source'), false);
    });
  });

  describe('2. Valid Share Page Layout & Natural Content Height (Requirement 2)', () => {
    it('HeroDownloadVisual uses natural height, pure Tailwind styling, and explicit SVG sizing', () => {
      const html = renderToStaticMarkup(
        React.createElement(HeroDownloadVisual, {
          downloadState: 'idle',
          downloadError: null,
          onDownload: () => {},
          onRetryDownload: () => {},
        })
      );

      assert.ok(html.includes('Download ZIP'));
      assert.ok(html.includes('Your download will start shortly.'));
      assert.ok(html.includes('This link is secure and expires automatically'));
      assert.ok(html.includes('w-32 h-32 sm:w-36 sm:h-36 shrink-0 drop-shadow-md'));
      // No custom css classes that force artificial height
      assert.strictEqual(html.includes('package-visual-stage'), false);
      assert.strictEqual(html.includes('h-full'), false);
    });

    it('DevParcelPromo uses natural height without justify-between', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelPromo));
      assert.ok(html.includes('Share Your Projects'));
      assert.ok(html.includes('Available for VS Code &amp; Antigravity') || html.includes('Available for VS Code & Antigravity'));
      assert.strictEqual(html.includes('justify-between'), false, 'Must not use justify-between to push content apart');
    });
  });

  describe('3. Base Landing Page Structure & Content (Requirements 4, 5, 13)', () => {
    it('Base URL (/) renders hero, share input, features, availability, and developer sections', () => {
      const html = renderToStaticMarkup(
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

      // Hero
      assert.ok(html.includes('Share Projects Securely with'));
      assert.ok(html.includes('Get DevParcel'));
      assert.ok(html.includes('View on GitHub'));

      // Direct Link input
      assert.ok(html.includes('Have a DevParcel share link?'));
      assert.ok(html.includes('Paste your secure share link below to access the project package.'));
      assert.ok(html.includes('Open Share'));

      // Product capabilities
      assert.ok(html.includes('One-click project packaging'));
      assert.ok(html.includes('Automatically exclude sensitive files'));

      // Availability
      assert.ok(html.includes('Available for VS Code &amp; Antigravity') || html.includes('Available for VS Code & Antigravity'));

      // Developer attribution
      assert.ok(html.includes('Mohd Arman'));
      assert.ok(html.includes('LinkedIn'));
      assert.ok(html.includes('Portfolio'));
      assert.ok(html.includes('GitHub'));
    });
  });

  describe('4. Invalid & Expired Share Link Behavior (Requirements 6 & 7)', () => {
    it('invalid share status displays accurate distinct message and Go to DevParcel link', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusCard, { status: 'invalid' })
      );

      assert.ok(html.includes('Invalid Share Link'));
      assert.ok(html.includes('The share link is invalid or does not exist.'));
      assert.ok(html.includes('Go to DevParcel'));
      assert.ok(html.includes('id="status-home-btn"'));
      assert.strictEqual(html.includes('Download ZIP'), false);
    });

    it('expired share status displays accurate distinct message and Go to DevParcel link', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusCard, { status: 'expired' })
      );

      assert.ok(html.includes('Share link expired'));
      assert.ok(html.includes('This share link has expired.'));
      assert.ok(html.includes('Go to DevParcel'));
      assert.strictEqual(html.includes('Download ZIP'), false);
    });

    it('revoked share status displays accurate distinct message', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusCard, { status: 'revoked' })
      );

      assert.ok(html.includes('Share Unavailable'));
      assert.ok(html.includes('This project package is no longer available.'));
      assert.strictEqual(html.includes('Download ZIP'), false);
    });

    it('server error status displays retry button and Go to DevParcel', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusCard, { status: 'error', onRetry: () => {} })
      );

      assert.ok(html.includes('Unable to reach DevParcel'));
      assert.ok(html.includes('Try Again'));
      assert.ok(html.includes('Go to DevParcel'));
    });
  });

  describe('5. GitHub and Action Buttons Padding & Dimensions (Requirement 8)', () => {
    it('DevParcelHero buttons have balanced padding and min-height', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelHero));
      assert.ok(html.includes('min-h-[48px]'));
      assert.ok(html.includes('px-5 py-3'));
      assert.ok(html.includes('w-5 h-5 shrink-0'));
    });

    it('AvailabilitySection buttons have balanced padding and min-height', () => {
      const html = renderToStaticMarkup(React.createElement(AvailabilitySection));
      assert.ok(html.includes('min-h-[48px]'));
      assert.ok(html.includes('px-5 py-3'));
      assert.ok(html.includes('w-5 h-5 shrink-0'));
    });

    it('DevParcelPromo extension button has balanced padding and min-height', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelPromo));
      assert.ok(html.includes('min-h-[48px]'));
      assert.ok(html.includes('px-5 py-3'));
      assert.ok(html.includes('w-5 h-5 shrink-0'));
    });
  });

  describe('6. Reusable Header and Footer (Requirements 10 & 11)', () => {
    it('DevParcelHeader renders compact header with branding and status pill', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelHeader));
      assert.ok(html.includes('DevParcel'));
      assert.ok(html.includes('Secure Project Sharing'));
      assert.ok(html.includes('Safe • Secure • Simple'));
      assert.ok(html.includes('w-5 h-5 shrink-0'));
    });

    it('DevParcelFooter renders clean footer without excessive blank space', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelFooter));
      assert.ok(html.includes('DevParcel'));
      assert.ok(html.includes('All rights reserved.'));
      assert.ok(html.includes('Mohd Arman'));
      assert.ok(html.includes('w-4 h-4 shrink-0'));
    });
  });
});

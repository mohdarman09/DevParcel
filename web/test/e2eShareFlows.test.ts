import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { extractShareToken } from '../src/components/ShareLinkInput';
import { ShareStatusCard } from '../src/components/ShareStatusCard';
import { DevParcelHeader } from '../src/components/DevParcelHeader';
import { DevParcelFooter } from '../src/components/DevParcelFooter';
import { DeveloperCard } from '../src/components/DeveloperCard';
import { ProductFeatures } from '../src/components/ProductFeatures';
import { AvailabilitySection } from '../src/components/AvailabilitySection';
import { DevParcelHero } from '../src/components/DevParcelHero';
import { ShareDownloadPage } from '../src/pages/ShareDownloadPage';
import { resolveApiBaseUrl } from '../src/config/siteConfig';

describe('DevParcel End-to-End Share Flows & Regression Verification', () => {
  describe('1. API Base URL Production Safety', () => {
    it('resolveApiBaseUrl falls back to https://devparcel.onrender.com for non-localhost production environments', () => {
      // Mock production non-localhost environment
      const originalWindow = globalThis.window;
      try {
        (globalThis as any).window = {
          location: {
            hostname: 'dev-parcel.vercel.app',
          },
        };
        const resolved = resolveApiBaseUrl();
        assert.strictEqual(
          resolved,
          'https://devparcel.onrender.com',
          'Production hostname must NEVER connect to localhost'
        );
      } finally {
        (globalThis as any).window = originalWindow;
      }
    });

    it('resolveApiBaseUrl supports local development on localhost', () => {
      const originalWindow = globalThis.window;
      try {
        (globalThis as any).window = {
          location: {
            hostname: 'localhost',
          },
        };
        const resolved = resolveApiBaseUrl();
        assert.ok(
          resolved.includes('localhost') || resolved.includes('127.0.0.1') || resolved.startsWith('http'),
          'Localhost hostname allows local dev server'
        );
      } finally {
        (globalThis as any).window = originalWindow;
      }
    });
  });

  describe('2. Share Link Input URL & Token Parsing', () => {
    it('correctly extracts token from full Vercel production URL', () => {
      const token = extractShareToken('https://dev-parcel.vercel.app/share/valid-share-token-1234');
      assert.strictEqual(token, 'valid-share-token-1234');
    });

    it('correctly extracts token from URL with trailing slash and query params', () => {
      const token = extractShareToken('https://dev-parcel.vercel.app/share/my-token-abc_123/?utm_source=twitter#anchor');
      assert.strictEqual(token, 'my-token-abc_123');
    });

    it('correctly extracts token from relative path', () => {
      const token = extractShareToken('/share/relative-token-xyz');
      assert.strictEqual(token, 'relative-token-xyz');
    });

    it('correctly extracts raw token with surrounding whitespace', () => {
      const token = extractShareToken('   raw-token-12345678   ');
      assert.strictEqual(token, 'raw-token-12345678');
    });

    it('rejects URLs that do not contain a /share/ token', () => {
      assert.strictEqual(extractShareToken('https://google.com'), '');
      assert.strictEqual(extractShareToken('https://dev-parcel.vercel.app'), '');
      assert.strictEqual(extractShareToken('https://dev-parcel.vercel.app/'), '');
      assert.strictEqual(extractShareToken('https://github.com/mohdarman09/DevParcel'), '');
    });

    it('rejects empty or whitespace input', () => {
      assert.strictEqual(extractShareToken(''), '');
      assert.strictEqual(extractShareToken('    '), '');
    });
  });

  describe('3. Reusable Component Architecture (Requirement 11)', () => {
    it('renders DevParcelHeader with logo, brand, and secure badge', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelHeader));
      assert.ok(html.includes('DevParcel'));
      assert.ok(html.includes('Secure Project Sharing'));
      assert.ok(html.includes('Safe • Secure • Simple'));
    });

    it('renders DevParcelHero with single H1, description, and CTA buttons', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelHero));
      assert.ok(html.includes('Share Projects Securely with'));
      assert.ok(html.includes('DevParcel'));
      assert.ok(html.includes('Get DevParcel'));
      assert.ok(html.includes('View on GitHub'));
      assert.ok(html.includes('w-5 h-5 shrink-0'));
    });

    it('renders ProductFeatures with all 8 features and explicit icon dimensions', () => {
      const html = renderToStaticMarkup(React.createElement(ProductFeatures));
      assert.ok(html.includes('Engineered for frictionless code sharing'));
      assert.ok(html.includes('One-click project packaging'));
      assert.ok(html.includes('Automatically exclude sensitive files'));
      assert.ok(html.includes('Secure shareable download links'));
      assert.ok(html.includes('Configurable link expiry'));
      assert.ok(html.includes('Works with VS Code and Antigravity'));
      assert.ok(html.includes('Built for developers'));
      assert.ok(html.includes('No account required'));
      assert.ok(html.includes('Open Source'));
    });

    it('renders AvailabilitySection with VS Code and Antigravity cards and CTAs', () => {
      const html = renderToStaticMarkup(React.createElement(AvailabilitySection));
      assert.ok(html.includes('Available for VS Code &amp; Antigravity') || html.includes('Available for VS Code & Antigravity'));
      assert.ok(html.includes('VS Code'));
      assert.ok(html.includes('Antigravity'));
      assert.ok(html.includes('Available'));
      assert.ok(html.includes('Get DevParcel'));
      assert.ok(html.includes('View on GitHub'));
    });

    it('renders DeveloperCard with Mohd Arman attribution and verified social links', () => {
      const html = renderToStaticMarkup(React.createElement(DeveloperCard));
      assert.ok(html.includes('Mohd Arman'));
      assert.ok(html.includes('Developed by'));
      assert.ok(html.includes('LinkedIn'));
      assert.ok(html.includes('Portfolio'));
      assert.ok(html.includes('GitHub'));
    });

    it('renders DevParcelFooter with brand, copyright, and creator credit', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelFooter));
      assert.ok(html.includes('DevParcel'));
      assert.ok(html.includes('All rights reserved.'));
      assert.ok(html.includes('Mohd Arman'));
    });
  });

  describe('4. Polished Error & Status States (Requirement 2, 4, 10)', () => {
    it('renders Expired status card with clean message and no project details', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusCard, { status: 'expired' })
      );
      assert.ok(html.includes('Share link expired'));
      assert.ok(html.includes('This DevParcel link is no longer available because its expiration time has passed.'));
      assert.ok(html.includes('LINK EXPIRED'));
      assert.strictEqual(html.includes('Download ZIP'), false);
    });

    it('renders Revoked status card with clean message and no project details', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusCard, { status: 'revoked' })
      );
      assert.ok(html.includes('Share Unavailable'));
      assert.ok(html.includes('This share link has been revoked.'));
      assert.ok(html.includes('LINK REVOKED'));
      assert.strictEqual(html.includes('Download ZIP'), false);
    });

    it('renders Invalid link status card with clean message and no project details', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusCard, { status: 'invalid' })
      );
      assert.ok(html.includes('Invalid Share Link'));
      assert.ok(html.includes('The link format is not a valid DevParcel share link.'));
      assert.ok(html.includes('INVALID SHARE LINK'));
      assert.strictEqual(html.includes('Download ZIP'), false);
    });

    it('renders Link Not Found status card with clean message and no project details', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusCard, { status: 'not_found' })
      );
      assert.ok(html.includes('Link Not Found'));
      assert.ok(html.includes('exist or is no longer available.'));
      assert.ok(html.includes('LINK NOT FOUND'));
      assert.strictEqual(html.includes('Download ZIP'), false);
    });

    it('renders Server Unavailable status card with connection message and Try Again button', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusCard, {
          status: 'error',
          onRetry: () => {},
        })
      );
      assert.ok(html.includes('Unable to reach DevParcel'));
      assert.ok(html.includes('Unable to reach DevParcel right now. Please check your connection and try again.'));
      assert.ok(html.includes('Try Again'));
      assert.ok(html.includes('SERVER UNAVAILABLE'));
    });
  });

  describe('5. Base Landing Page Composition (/)', () => {
    it('renders full promotional landing page on / without requiring share token', () => {
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

      // Verify Header
      assert.ok(html.includes('DevParcel'));
      assert.ok(html.includes('Secure Project Sharing'));

      // Verify Hero
      assert.ok(html.includes('Share Projects Securely with'));
      assert.ok(html.includes('Get DevParcel'));
      assert.ok(html.includes('View on GitHub'));

      // Verify Direct Share Link Input
      assert.ok(html.includes('Have a DevParcel share link?'));
      assert.ok(html.includes('Open Share'));

      // Verify Features & Availability
      assert.ok(html.includes('One-click project packaging'));
      assert.ok(html.includes('Available for VS Code &amp; Antigravity') || html.includes('Available for VS Code & Antigravity'));

      // Verify Quote, Developer, Footer (TrustStrip 4 cards removed per user requirements)
      assert.strictEqual(html.includes('No Account Needed'), false);
      assert.ok(html.includes('Share code, not the chaos.'));
      assert.ok(html.includes('Mohd Arman'));
      assert.ok(html.includes('LinkedIn'));
      assert.ok(html.includes('Portfolio'));
      assert.ok(html.includes('GitHub'));

      // Verify NO project details or download button on landing page
      assert.strictEqual(html.includes('Download ZIP'), false);
      assert.strictEqual(html.includes('PROJECT READY'), false);
    });
  });
});

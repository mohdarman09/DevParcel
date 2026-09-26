import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShareStatusNotice } from '../src/components/ShareStatusNotice';
import { DevParcelMarketing } from '../src/components/DevParcelMarketing';
import { DevParcelPromo } from '../src/components/DevParcelPromo';
import { HeroProjectInfo } from '../src/components/HeroProjectInfo';
import { HeroDownloadVisual } from '../src/components/HeroDownloadVisual';
import { TrustStrip } from '../src/components/TrustStrip';
import { QuoteSection } from '../src/components/QuoteSection';
import { CreatorCard } from '../src/components/CreatorCard';
import { Footer } from '../src/components/Footer';
import { Header } from '../src/components/Header';
import { SharePublicMetadata } from '../src/types/share';

describe('All 8 Requested States Verification', () => {
  // Helper to render the complete page layout
  function renderLayout(opts: {
    statusNotice?: { type: 'expired' | 'revoked' | 'not_found' | 'error'; message?: string } | null;
    share?: SharePublicMetadata | null;
  }) {
    const isValidActiveShare = Boolean(opts.share);

    return renderToStaticMarkup(
      React.createElement(
        'div',
        { className: 'app-shell' },
        React.createElement(Header),
        React.createElement(
          'main',
          { className: 'app-main' },
          opts.statusNotice &&
            React.createElement(ShareStatusNotice, {
              type: opts.statusNotice.type,
              message: opts.statusNotice.message,
              onRetry: () => {},
            }),
          isValidActiveShare &&
            opts.share &&
            React.createElement(
              'section',
              { className: 'hero-section' },
              React.createElement(HeroProjectInfo, { share: opts.share }),
              React.createElement(HeroDownloadVisual, {
                downloadState: 'idle',
                downloadError: null,
                onDownload: () => Promise.resolve(),
                onRetryDownload: () => {},
              }),
              React.createElement(DevParcelPromo)
            ),
          !isValidActiveShare && React.createElement(DevParcelMarketing),
          React.createElement(TrustStrip),
          React.createElement(QuoteSection),
          React.createElement(CreatorCard)
        ),
        React.createElement(Footer)
      )
    );
  }

  // Common assertions for the marketing layer
  function assertCommonMarketingSections(html: string) {
    assert.ok(html.includes('DevParcel'), 'Contains DevParcel logo/brand');
    assert.ok(html.includes('Secure Project Sharing'), 'Contains tagline');
    assert.ok(html.includes('Secure Sharing'), 'Contains Secure Sharing pillar');
    assert.ok(html.includes('No Account Needed'), 'Contains No Account Needed pillar');
    assert.ok(html.includes('Built for Developers'), 'Contains Built for Developers pillar');
    assert.ok(html.includes('Open Source'), 'Contains Open Source pillar');
    assert.ok(html.includes('Share code, not the chaos.'), 'Contains "Share code, not the chaos."');
    assert.ok(html.includes('Mohd Arman'), 'Contains Developed by Mohd Arman');
    assert.ok(html.includes('LinkedIn'), 'Contains LinkedIn');
    assert.ok(html.includes('Portfolio'), 'Contains Portfolio');
    assert.ok(html.includes('GitHub'), 'Contains GitHub');
    assert.ok(html.includes('Available for VS Code &amp; Antigravity') || html.includes('Available for VS Code & Antigravity'));
    assert.strictEqual(html.toLowerCase().includes('coming soon'), false, 'Must not contain coming soon');
  }

  it('State 1: Base URL (/) renders pure public marketing page without project info or status cards', () => {
    const html = renderLayout({ statusNotice: null, share: null });

    assertCommonMarketingSections(html);
    assert.ok(html.includes('Share Projects Securely with'));
    assert.ok(html.includes('One-click project packaging'));

    // NO project info, NO download button, NO status warning
    assert.strictEqual(html.toLowerCase().includes('download zip'), false);
    assert.strictEqual(html.toLowerCase().includes('project ready'), false);
    assert.strictEqual(html.includes('share-status-card'), false);
  });

  it('State 2: Valid Share (/share/<valid-token>) renders project ready, download ZIP, and marketing layer', () => {
    const validShare: SharePublicMetadata = {
      token: 'tok-valid-12345678',
      publicUrl: 'http://localhost:5173/share/tok-valid-12345678',
      projectName: 'AlphaRelease',
      fileCount: 32,
      originalSize: 8400000,
      packageSize: 3200000,
      excludedCount: 4,
      sensitiveFileCount: 1,
      createdAt: '2026-09-25T12:00:00.000Z',
      expiresAt: '2026-09-27T12:00:00.000Z',
      downloadCount: 5,
      status: 'active',
      isPasswordProtected: false,
    };

    const html = renderLayout({ statusNotice: null, share: validShare });

    assertCommonMarketingSections(html);
    assert.ok(html.includes('AlphaRelease'), 'Renders project name');
    assert.ok(html.includes('32'), 'Renders file count');
    assert.ok(html.includes('Download ZIP'), 'Renders Download ZIP button');
    assert.ok(html.includes('PROJECT READY'), 'Renders project ready pill');
    assert.strictEqual(html.includes('share-status-card'), false);
  });

  it('State 3: Expired Share (/share/<expired-token>) shows small expired notice and marketing page, zero project data', () => {
    const html = renderLayout({
      statusNotice: { type: 'expired' },
      share: null,
    });

    assertCommonMarketingSections(html);
    assert.ok(html.includes('Share Link Expired'));
    assert.ok(html.includes('This share link is no longer available.'));

    // STRICTLY zero project metadata or download controls
    assert.strictEqual(html.toLowerCase().includes('download zip'), false);
    assert.strictEqual(html.toLowerCase().includes('project ready'), false);
    assert.strictEqual(html.toLowerCase().includes('package size'), false);
  });

  it('State 4: Revoked Share (/share/<revoked-token>) shows small revoked notice and marketing page, zero project data', () => {
    const html = renderLayout({
      statusNotice: { type: 'revoked' },
      share: null,
    });

    assertCommonMarketingSections(html);
    assert.ok(html.includes('Share Link Unavailable'));
    assert.ok(html.includes('This share link has been revoked or is no longer available.'));

    assert.strictEqual(html.toLowerCase().includes('download zip'), false);
    assert.strictEqual(html.toLowerCase().includes('project ready'), false);
  });

  it('State 5: Invalid Share (/share/invalid) shows small unavailable notice and marketing page, zero project data', () => {
    const html = renderLayout({
      statusNotice: { type: 'not_found' },
      share: null,
    });

    assertCommonMarketingSections(html);
    assert.ok(html.includes('Share Link Unavailable'));
    assert.ok(html.includes('This link is invalid or no longer available.'));

    assert.strictEqual(html.toLowerCase().includes('download zip'), false);
    assert.strictEqual(html.toLowerCase().includes('project ready'), false);
  });

  it('State 6: Non-existing Share (/share/does-not-exist) shows small unavailable notice and marketing page', () => {
    const html = renderLayout({
      statusNotice: { type: 'not_found' },
      share: null,
    });

    assertCommonMarketingSections(html);
    assert.ok(html.includes('Share Link Unavailable'));
    assert.ok(html.includes('This link is invalid or no longer available.'));

    assert.strictEqual(html.toLowerCase().includes('download zip'), false);
  });

  it('State 7: Random unknown route renders complete marketing content', () => {
    const html = renderLayout({
      statusNotice: { type: 'not_found', message: 'This page or link is invalid or no longer available.' },
      share: null,
    });

    assertCommonMarketingSections(html);
    assert.ok(html.includes('Share Link Unavailable'));
    assert.strictEqual(html.toLowerCase().includes('download zip'), false);
  });

  it('State 8: Backend unavailable (Network Error) renders non-blocking notice without breaking or emptying marketing page', () => {
    const html = renderLayout({
      statusNotice: { type: 'error' },
      share: null,
    });

    assertCommonMarketingSections(html);
    assert.ok(html.includes('Share information is temporarily unavailable.'));
    assert.ok(html.includes('Please try again later.'));
    assert.ok(html.includes('Retry'));

    // The whole page is NOT replaced with an empty "Something went wrong" screen!
    assert.strictEqual(html.toLowerCase().includes('something went wrong'), false);
    assert.ok(html.includes('Share Projects Securely with'));
    assert.ok(html.includes('DevParcel'));
    assert.ok(html.includes('One-click project packaging'));
  });
});

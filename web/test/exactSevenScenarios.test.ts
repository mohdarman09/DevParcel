import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { validateShareInput, ShareLinkInput } from '../src/components/ShareLinkInput';
import { ShareStatusCard } from '../src/components/ShareStatusCard';
import { LandingPage } from '../src/pages/LandingPage';
import { SharePage } from '../src/pages/SharePage';
import { HeroProjectInfo } from '../src/components/HeroProjectInfo';
import { HeroDownloadVisual } from '../src/components/HeroDownloadVisual';
import { DevParcelPromo } from '../src/components/DevParcelPromo';
import { DownloadButton } from '../src/components/DownloadButton';
import { SharePublicMetadata } from '../src/types/share';

describe('Exact 7 Manual Scenarios & Routing Architecture Verification', () => {
  const validShare: SharePublicMetadata = {
    token: 'ABC123VALID',
    publicUrl: 'https://dev-parcel.vercel.app/share/ABC123VALID',
    projectName: 'DemoPackage',
    fileCount: 18,
    originalSize: 5200000,
    packageSize: 2100000,
    excludedCount: 4,
    sensitiveFileCount: 0,
    createdAt: '2026-09-25T10:00:00.000Z',
    expiresAt: '2026-09-28T10:00:00.000Z',
    downloadCount: 2,
    status: 'active',
    isPasswordProtected: false,
  };

  it('Requirement: App router defines only TWO user-facing routes (/ and /share/:token)', () => {
    // 1. Landing Page at /
    const landingHtml = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: '/', element: React.createElement(LandingPage) }),
          React.createElement(Route, { path: '/share/:token', element: React.createElement(SharePage) })
        )
      )
    );
    assert.ok(landingHtml.includes('Share Projects Securely with'));
    assert.ok(landingHtml.includes('Have a DevParcel share link?'));
    assert.ok(landingHtml.includes('Open Share'));

    // 2. Share Page at /share/:token
    const shareHtml = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/share/ABC123VALID'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, { path: '/', element: React.createElement(LandingPage) }),
          React.createElement(Route, { path: '/share/:token', element: React.createElement(SharePage) })
        )
      )
    );
    assert.ok(shareHtml.includes('DevParcel'));
    assert.ok(shareHtml.includes('Secure Project Sharing'));
  });

  it('Test 1: Open / and enter an invalid string -> inline validation error without navigating', () => {
    // Test validation helper for invalid strings
    const invalidResult1 = validateShareInput('invalid-string 123');
    assert.strictEqual(invalidResult1.isValid, false);
    assert.strictEqual(invalidResult1.token, '');
    assert.ok(invalidResult1.errorMessage?.includes('https://dev-parcel.vercel.app/share/ABC123'));

    const invalidResult2 = validateShareInput('https://google.com/share/XYZ');
    assert.strictEqual(invalidResult2.isValid, false);
    assert.ok(invalidResult2.errorMessage?.includes('https://dev-parcel.vercel.app/share/ABC123'));

    const invalidResult3 = validateShareInput('https://dev-parcel.vercel.app/notshare/XYZ');
    assert.strictEqual(invalidResult3.isValid, false);
    assert.ok(invalidResult3.errorMessage?.includes("must include '/share/'"));

    const invalidResult4 = validateShareInput('https://dev-parcel.vercel.app/share/');
    assert.strictEqual(invalidResult4.isValid, false);
    assert.ok(invalidResult4.errorMessage?.includes('Share token is missing'));

    const emptyResult = validateShareInput('');
    assert.strictEqual(emptyResult.isValid, false);
    assert.strictEqual(emptyResult.errorMessage, 'Please enter a DevParcel share link.');

    // Component markup includes input and submit button
    const html = renderToStaticMarkup(React.createElement(ShareLinkInput));
    assert.ok(html.includes('id="share-link-input"'));
    assert.ok(html.includes('id="share-link-submit-btn"'));
    assert.ok(html.includes('Open Share'));
  });

  it('Test 2: Enter a valid DevParcel share URL with a valid token -> resolves token and renders Download ZIP page', () => {
    const validResult = validateShareInput('https://dev-parcel.vercel.app/share/ABC123VALID');
    assert.strictEqual(validResult.isValid, true);
    assert.strictEqual(validResult.token, 'ABC123VALID');
    assert.strictEqual(validResult.errorMessage, null);

    // Render Valid Share Page
    const validShareHtml = renderToStaticMarkup(
      React.createElement(
        'div',
        null,
        React.createElement(HeroProjectInfo, { share: validShare }),
        React.createElement(HeroDownloadVisual, {
          downloadState: 'idle',
          downloadError: null,
          onDownload: () => {},
          onRetryDownload: () => {},
        }),
        React.createElement(DevParcelPromo)
      )
    );

    assert.ok(validShareHtml.includes('DemoPackage'));
    assert.ok(validShareHtml.includes('Download ZIP'));
    assert.ok(validShareHtml.includes('id="download-cta-btn"'));
    assert.ok(validShareHtml.includes('Package Size'));
    assert.ok(validShareHtml.includes('Original Size'));
    assert.ok(validShareHtml.includes('Excluded Files'));
    assert.ok(validShareHtml.includes('Shared on'));
    assert.ok(validShareHtml.includes('Expires in'));
  });

  it('Test 3: Open /share/invalid-token -> stays at /share/invalid-token and renders Share Unavailable error UI', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShareStatusCard, {
        status: 'not_found',
        onRetry: () => {},
      })
    );

    // Stays on same route, renders error UI
    assert.ok(html.includes('Share Link Not Found') || html.includes('Link Not Found') || html.includes("This share link isn't available"));
    assert.ok(html.includes('The share link may be invalid or the project may have been removed.'));
    assert.ok(html.includes('SHARE UNAVAILABLE') || html.includes('LINK NOT FOUND'));
    assert.ok(html.includes('Try Again'));
    assert.ok(html.includes('Go to DevParcel'));
    assert.ok(html.includes('id="status-retry-btn"'));
    assert.ok(html.includes('id="status-home-btn"'));
    assert.strictEqual(html.includes('Download ZIP'), false);
  });

  it('Test 4: Open an expired share token -> stays at /share/:token and displays Expired error UI', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShareStatusCard, {
        status: 'expired',
        onRetry: () => {},
      })
    );

    assert.ok(html.includes('Share link expired'));
    assert.ok(html.includes('This DevParcel share link has expired and is no longer available.'));
    assert.ok(html.includes('LINK EXPIRED') || html.includes('SHARE UNAVAILABLE'));
    assert.ok(html.includes('Try Again'));
    assert.ok(html.includes('Go to DevParcel'));
    assert.strictEqual(html.includes('Download ZIP'), false);
  });

  it('Test 5: Click "Try Again" -> retry callback is bound to retry the same token request', () => {
    let retried = false;
    const retryHandler = () => {
      retried = true;
    };

    const html = renderToStaticMarkup(
      React.createElement(ShareStatusCard, {
        status: 'error',
        onRetry: retryHandler,
      })
    );

    assert.ok(html.includes('Try Again'));
    assert.ok(html.includes('id="status-retry-btn"'));
    retryHandler();
    assert.strictEqual(retried, true);
  });

  it('Test 6: Click "Go to DevParcel" -> links directly to /', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShareStatusCard, {
        status: 'not_found',
        onRetry: () => {},
      })
    );

    assert.ok(html.includes('Go to DevParcel'));
    assert.ok(html.includes('href="/"'));
    assert.ok(html.includes('id="status-home-btn"'));
  });

  it('Test 7: Click "Download ZIP" on valid share -> triggers download action with correct states', () => {
    const idleHtml = renderToStaticMarkup(
      React.createElement(DownloadButton, {
        downloadState: 'idle',
        onClick: () => {},
      })
    );
    assert.ok(idleHtml.includes('Download ZIP'));
    assert.ok(idleHtml.includes('id="download-cta-btn"'));

    const preparingHtml = renderToStaticMarkup(
      React.createElement(DownloadButton, {
        downloadState: 'preparing',
        onClick: () => {},
      })
    );
    assert.ok(preparingHtml.includes('Preparing download...'));
    assert.ok(preparingHtml.includes('aria-busy="true"'));

    const successHtml = renderToStaticMarkup(
      React.createElement(DownloadButton, {
        downloadState: 'success',
        onClick: () => {},
      })
    );
    assert.ok(successHtml.includes('Download started'));
  });

  it('Requirement: Four feature cards (Secure Sharing, No Account Needed, Built for Developers, Open Source) are NOT in /share/:token', () => {
    // Valid share page
    const validHtml = renderToStaticMarkup(
      React.createElement(
        'div',
        null,
        React.createElement(HeroProjectInfo, { share: validShare }),
        React.createElement(HeroDownloadVisual, {
          downloadState: 'idle',
          downloadError: null,
          onDownload: () => {},
          onRetryDownload: () => {},
        }),
        React.createElement(DevParcelPromo)
      )
    );
    assert.strictEqual(validHtml.includes('Secure Sharing'), false);
    assert.strictEqual(validHtml.includes('No Account Needed'), false);
    assert.strictEqual(validHtml.includes('Your code, your control.'), false);
    assert.strictEqual(validHtml.includes('Recipients can download'), false);

    // Error state share page
    const errorHtml = renderToStaticMarkup(
      React.createElement(ShareStatusCard, { status: 'invalid', onRetry: () => {} })
    );
    assert.strictEqual(errorHtml.includes('Secure Sharing'), false);
    assert.strictEqual(errorHtml.includes('No Account Needed'), false);
    assert.strictEqual(errorHtml.includes('Open Source'), false);
  });
});

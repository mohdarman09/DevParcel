import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DevParcelPromo } from '../src/components/DevParcelPromo';
import { DevParcelMarketing } from '../src/components/DevParcelMarketing';
import { ShareStatusNotice } from '../src/components/ShareStatusNotice';
import { TrustStrip } from '../src/components/TrustStrip';
import { QuoteSection } from '../src/components/QuoteSection';
import { CreatorCard } from '../src/components/CreatorCard';
import { Footer } from '../src/components/Footer';
import { SharePublicMetadata } from '../src/types/share';
import { fetchShareMetadata, ShareApiError } from '../src/services/shareApi';

describe('DevParcel Web Share Page Enhancements & Architecture', () => {
  describe('1. Availability Section & Complete Removal of "Coming Soon"', () => {
    it('renders "Available for VS Code & Antigravity" in DevParcelPromo without any "Coming Soon" phrase', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelPromo));

      assert.ok(
        html.includes('Available for VS Code &amp; Antigravity') ||
          html.includes('Available for VS Code & Antigravity')
      );
      assert.ok(
        html.includes(
          'DevParcel lets developers package and securely share projects directly from their editor.'
        )
      );
      assert.ok(html.includes('VS Code'));
      assert.ok(html.includes('Antigravity'));

      assert.strictEqual(
        html.toLowerCase().includes('coming soon to vs code marketplace'),
        false,
        'Must completely remove "Coming soon to VS Code Marketplace"'
      );
      assert.strictEqual(
        html.toLowerCase().includes('coming soon'),
        false,
        'Must not contain "coming soon"'
      );
    });

    it('renders "Available for VS Code & Antigravity" in DevParcelMarketing', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelMarketing));

      assert.ok(
        html.includes('Available for VS Code &amp; Antigravity') ||
          html.includes('Available for VS Code & Antigravity')
      );
      assert.ok(
        html.includes(
          'Use DevParcel directly from your development environment to package and share projects in seconds.'
        )
      );
      assert.ok(html.includes('VS Code'));
      assert.ok(html.includes('Antigravity'));
      assert.strictEqual(html.toLowerCase().includes('coming soon'), false);
    });
  });

  describe('2. Public DevParcel Marketing & Landing Layer (Always Visible)', () => {
    it('DevParcelMarketing renders hero and all 6 key feature points', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelMarketing));

      assert.ok(html.includes('Share Projects Securely with'));
      assert.ok(html.includes('DevParcel'));
      assert.ok(
        html.includes(
          'Package and share your development projects securely, directly from your editor.'
        )
      );

      // 6 Feature points
      assert.ok(html.includes('One-click project packaging'));
      assert.ok(html.includes('Automatically exclude sensitive files'));
      assert.ok(html.includes('Secure shareable download links'));
      assert.ok(html.includes('Configurable link expiry'));
      assert.ok(html.includes('Works with VS Code and Antigravity'));
      assert.ok(html.includes('Built for developers'));

      // STRICTLY zero project-specific data or download controls
      assert.strictEqual(html.toLowerCase().includes('download zip'), false);
      assert.strictEqual(html.toLowerCase().includes('project ready'), false);
      assert.strictEqual(html.toLowerCase().includes('package size'), false);
      assert.strictEqual(html.toLowerCase().includes('original size'), false);
      assert.strictEqual(html.toLowerCase().includes('excluded files'), false);
    });

    it('TrustStrip renders 4 pillars: Secure Sharing, No Account Needed, Built for Developers, Open Source', () => {
      const html = renderToStaticMarkup(React.createElement(TrustStrip));
      assert.ok(html.includes('Secure Sharing'));
      assert.ok(html.includes('No Account Needed'));
      assert.ok(html.includes('Built for Developers'));
      assert.ok(html.includes('Open Source'));
    });

    it('QuoteSection renders "Share code, not the chaos."', () => {
      const html = renderToStaticMarkup(React.createElement(QuoteSection));
      assert.ok(html.includes('Share code, not the chaos.'));
      assert.ok(html.includes('DevParcel'));
    });

    it('CreatorCard renders Mohd Arman attribution and portfolio links', () => {
      const html = renderToStaticMarkup(React.createElement(CreatorCard));
      assert.ok(html.includes('Mohd Arman'));
      assert.ok(html.includes('LinkedIn'));
      assert.ok(html.includes('Portfolio'));
      assert.ok(html.includes('GitHub'));
    });

    it('Footer renders branding and credits', () => {
      const html = renderToStaticMarkup(React.createElement(Footer));
      assert.ok(html.includes('DevParcel'));
      assert.ok(html.includes('Secure Project Sharing'));
      assert.ok(html.includes('Mohd Arman'));
    });
  });

  describe('3. ShareStatusNotice - Non-blocking status messages at top of page', () => {
    it('renders expired status notice', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusNotice, { type: 'expired' })
      );
      assert.ok(html.includes('Share Link Expired'));
      assert.ok(html.includes('This share link is no longer available.'));
      assert.ok(html.includes('LINK EXPIRED'));
    });

    it('renders revoked status notice', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusNotice, { type: 'revoked' })
      );
      assert.ok(html.includes('Share Link Unavailable'));
      assert.ok(html.includes('This share link has been revoked or is no longer available.'));
      assert.ok(html.includes('LINK REVOKED'));
    });

    it('renders invalid / not_found status notice', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusNotice, { type: 'not_found' })
      );
      assert.ok(html.includes('Share Link Unavailable'));
      assert.ok(html.includes('This link is invalid or no longer available.'));
      assert.ok(html.includes('LINK UNAVAILABLE'));
    });

    it('renders network / server failure non-blocking status notice without blocking marketing content', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareStatusNotice, { type: 'error', onRetry: () => {} })
      );
      assert.ok(html.includes('Share information is temporarily unavailable.'));
      assert.ok(html.includes('Please try again later.'));
      assert.ok(html.includes('Retry'));
      assert.strictEqual(
        html.toLowerCase().includes('something went wrong'),
        false,
        'Must not say "Something went wrong" as primary message'
      );
    });
  });

  describe('4. Required Test Cases (Valid, Invalid, Malformed, Revoked, Expired, Network Error)', () => {
    const originalFetch = globalThis.fetch;

    it('Case 1: Valid share token displays project-specific information', async () => {
      const validMetadata: SharePublicMetadata = {
        token: 'valid-secure-token-123',
        publicUrl: 'http://localhost:5173/share/valid-secure-token-123',
        projectName: 'SuperSecretProject',
        fileCount: 42,
        originalSize: 1048576,
        packageSize: 524288,
        excludedCount: 5,
        sensitiveFileCount: 2,
        createdAt: '2026-09-25T12:00:00.000Z',
        expiresAt: '2026-09-27T12:00:00.000Z',
        downloadCount: 3,
        status: 'active',
        isPasswordProtected: false,
      };

      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: validMetadata }),
        } as any);

      const result = await fetchShareMetadata('valid-secure-token-123');
      assert.strictEqual(result.projectName, 'SuperSecretProject');
      assert.strictEqual(result.fileCount, 42);
      assert.strictEqual(result.packageSize, 524288);
      assert.strictEqual(result.status, 'active');

      globalThis.fetch = originalFetch;
    });

    it('Case 2: Invalid token (not found) maps to not_found without leaking project info', async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          json: async () => ({
            success: false,
            error: {
              code: 'SHARE_NOT_FOUND',
              message: 'The requested share link was not found.',
            },
          }),
        } as any);

      await assert.rejects(
        () => fetchShareMetadata('non-existent-token'),
        (err: any) => {
          assert.ok(err instanceof ShareApiError);
          assert.strictEqual(err.pageStatus, 'not_found');
          assert.strictEqual(err.statusCode, 404);
          return true;
        }
      );

      globalThis.fetch = originalFetch;
    });

    it('Case 3: Malformed token (400 INVALID_TOKEN) maps to not_found without leaking internal errors', async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          json: async () => ({
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'The provided share token is invalid or malformed.',
            },
          }),
        } as any);

      await assert.rejects(
        () => fetchShareMetadata('bad!token@123'),
        (err: any) => {
          assert.ok(err instanceof ShareApiError);
          assert.strictEqual(err.pageStatus, 'not_found');
          assert.strictEqual(err.statusCode, 400);
          return true;
        }
      );

      globalThis.fetch = originalFetch;
    });

    it('Case 4: Revoked token maps to revoked status without returning project metadata', async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 410,
          json: async () => ({
            success: false,
            error: {
              code: 'SHARE_REVOKED',
              message: 'This share link has been revoked.',
            },
          }),
        } as any);

      await assert.rejects(
        () => fetchShareMetadata('revoked-token-123'),
        (err: any) => {
          assert.ok(err instanceof ShareApiError);
          assert.strictEqual(err.pageStatus, 'revoked');
          assert.strictEqual(err.statusCode, 410);
          return true;
        }
      );

      globalThis.fetch = originalFetch;
    });

    it('Case 5: Expired token maps to expired status without returning project metadata', async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 410,
          json: async () => ({
            success: false,
            error: {
              code: 'SHARE_EXPIRED',
              message: 'This share link has expired and is no longer available.',
            },
          }),
        } as any);

      await assert.rejects(
        () => fetchShareMetadata('expired-token-123'),
        (err: any) => {
          assert.ok(err instanceof ShareApiError);
          assert.strictEqual(err.pageStatus, 'expired');
          assert.strictEqual(err.statusCode, 410);
          return true;
        }
      );

      globalThis.fetch = originalFetch;
    });

    it('Case 6: Backend unavailable maps to error with non-blocking message without breaking page', async () => {
      globalThis.fetch = async () => {
        throw new Error('Failed to fetch');
      };

      await assert.rejects(
        () => fetchShareMetadata('any-token'),
        (err: any) => {
          assert.ok(err instanceof ShareApiError);
          assert.strictEqual(err.pageStatus, 'error');
          assert.strictEqual(err.code, 'NETWORK_ERROR');
          return true;
        }
      );

      globalThis.fetch = originalFetch;
    });
  });
});

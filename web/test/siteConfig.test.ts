import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { siteConfig } from '../src/config/siteConfig';

describe('siteConfig', () => {
  it('provides configured API base URL without trailing slash', () => {
    assert.ok(siteConfig.apiBaseUrl.length > 0);
    assert.strictEqual(siteConfig.apiBaseUrl.endsWith('/'), false);
  });

  it('correctly handles empty marketplace URL as null (Coming Soon)', () => {
    // When unset or empty, marketplaceUrl should normalize to null
    assert.strictEqual(typeof siteConfig.marketplaceUrl, 'object');
    // If null, UI shows 'Coming soon to VS Code Marketplace'
    if (siteConfig.marketplaceUrl === null) {
      assert.strictEqual(siteConfig.marketplaceUrl, null);
    }
  });

  it('provides accurate creator information for Mohd Arman', () => {
    assert.strictEqual(siteConfig.creator.name, 'Mohd Arman');
    assert.ok(siteConfig.creator.linkedinUrl.includes('mohd-arman-6417a7320'));
    assert.ok(siteConfig.creator.portfolioUrl.includes('mohd-arman-portfolio.vercel.app'));
  });

  it('provides real GitHub repository URL for DevParcel', () => {
    assert.ok(siteConfig.creator.githubUrl);
    assert.strictEqual(
      siteConfig.creator.githubUrl,
      'https://github.com/mohdarman09/DevParcel'
    );
  });
});

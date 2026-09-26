import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShareLinkInput, extractShareToken } from '../src/components/ShareLinkInput';
import { DevParcelMarketing } from '../src/components/DevParcelMarketing';
import { Footer } from '../src/components/Footer';
import { CreatorCard } from '../src/components/CreatorCard';
import { DownloadButton } from '../src/components/DownloadButton';

describe('ShareLinkInput & Redesign Verification', () => {
  describe('1. ShareLinkInput token extraction & normalization', () => {
    it('normalizes full production URLs', () => {
      const token = extractShareToken('https://dev-parcel.vercel.app/share/tok-prod-12345');
      assert.strictEqual(token, 'tok-prod-12345');
    });

    it('normalizes localhost URLs', () => {
      const token = extractShareToken('http://localhost:5173/share/tok-local-67890');
      assert.strictEqual(token, 'tok-local-67890');
    });

    it('normalizes relative share paths', () => {
      const token = extractShareToken('/share/tok-relative-abc');
      assert.strictEqual(token, 'tok-relative-abc');
    });

    it('normalizes raw tokens with whitespace', () => {
      const token = extractShareToken('   tok-raw-secure-999   ');
      assert.strictEqual(token, 'tok-raw-secure-999');
    });

    it('normalizes URLs with query parameters and hash fragments', () => {
      const token = extractShareToken(
        'https://devparcel.com/share/tok-with-params?utm_source=slack&auth=1#access'
      );
      assert.strictEqual(token, 'tok-with-params');
    });

    it('handles empty input gracefully', () => {
      assert.strictEqual(extractShareToken(''), '');
      assert.strictEqual(extractShareToken('   '), '');
    });
  });

  describe('2. ShareLinkInput component DOM & accessibility', () => {
    it('renders heading, description, input field, and Open Share button', () => {
      const html = renderToStaticMarkup(React.createElement(ShareLinkInput));

      assert.ok(html.includes('Have a DevParcel share link?'));
      assert.ok(html.includes('Paste your secure share link below to access the project package.'));
      assert.ok(html.includes('placeholder="Paste your DevParcel share link here..."'));
      assert.ok(html.includes('Open Share'));
      assert.ok(html.includes('id="share-link-input"'));
      assert.ok(html.includes('id="share-link-submit-btn"'));
    });
  });

  describe('3. Hero Section Button Consistency & Padding', () => {
    it('DevParcelMarketing buttons have proper padding, height, and no cramped text', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelMarketing));

      // Hero action buttons
      assert.ok(html.includes('Get DevParcel'));
      assert.ok(html.includes('View on GitHub'));
      assert.ok(html.includes('id="hero-get-devparcel-btn"'));
      assert.ok(html.includes('id="hero-github-btn"'));

      // Both buttons have proper padding and min-height classes
      assert.ok(html.includes('min-h-[48px]'));
      assert.ok(html.includes('rounded-xl'));
      assert.ok(html.includes('inline-flex'));
      assert.ok(html.includes('items-center'));
      assert.ok(html.includes('justify-center'));
    });
  });

  describe('4. 8 Feature Cards Redesign', () => {
    it('renders all 8 distinct feature cards with descriptions', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelMarketing));

      assert.ok(html.includes('One-click project packaging'));
      assert.ok(html.includes('Automatically exclude sensitive files'));
      assert.ok(html.includes('Secure shareable download links'));
      assert.ok(html.includes('Configurable link expiry'));
      assert.ok(html.includes('Works with VS Code and Antigravity'));
      assert.ok(html.includes('Built for developers'));
      assert.ok(html.includes('No account required'));
      assert.ok(html.includes('Open Source'));
    });
  });

  describe('5. VS Code & Antigravity Section', () => {
    it('shows status Available for both VS Code and Antigravity without any Coming Soon copy', () => {
      const html = renderToStaticMarkup(React.createElement(DevParcelMarketing));

      assert.ok(html.includes('Available for VS Code &amp; Antigravity') || html.includes('Available for VS Code & Antigravity'));
      assert.ok(html.includes('VS Code'));
      assert.ok(html.includes('Antigravity'));
      assert.ok(html.includes('Available'));
      assert.strictEqual(html.toLowerCase().includes('coming soon'), false);
    });
  });

  describe('6. Creator & Footer Section', () => {
    it('renders Mohd Arman attribution with LinkedIn, Portfolio, and GitHub links', () => {
      const html = renderToStaticMarkup(React.createElement(CreatorCard));

      assert.ok(html.includes('Developed by'));
      assert.ok(html.includes('Mohd Arman'));
      assert.ok(html.includes('Developer • Builder • Learner'));
      assert.ok(html.includes('LinkedIn'));
      assert.ok(html.includes('Portfolio'));
      assert.ok(html.includes('GitHub'));
    });

    it('renders Footer with brand, copyright, and creator credit', () => {
      const html = renderToStaticMarkup(React.createElement(Footer));

      assert.ok(html.includes('DevParcel'));
      assert.ok(html.includes('Secure Project Sharing'));
      assert.ok(html.includes('All rights reserved'));
      assert.ok(html.includes('Engineered by'));
      assert.ok(html.includes('Mohd Arman'));
    });
  });

  describe('7. DownloadButton States & Styling', () => {
    it('renders idle state with Download ZIP label and proper padding', () => {
      const html = renderToStaticMarkup(
        React.createElement(DownloadButton, {
          downloadState: 'idle',
          onClick: () => {},
        })
      );

      assert.ok(html.includes('Download ZIP'));
      assert.ok(html.includes('min-h-[52px]'));
      assert.ok(html.includes('rounded-2xl'));
    });

    it('renders preparing state with spinner and accessible label', () => {
      const html = renderToStaticMarkup(
        React.createElement(DownloadButton, {
          downloadState: 'preparing',
          onClick: () => {},
        })
      );

      assert.ok(html.includes('Preparing download...'));
      assert.ok(html.includes('animate-spin'));
      assert.ok(html.includes('aria-busy="true"'));
    });

    it('renders success state with Download started label', () => {
      const html = renderToStaticMarkup(
        React.createElement(DownloadButton, {
          downloadState: 'success',
          onClick: () => {},
        })
      );

      assert.ok(html.includes('Download started'));
      assert.ok(html.includes('bg-emerald-600'));
    });
  });
});

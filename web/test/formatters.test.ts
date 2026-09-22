import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, formatDate, formatTimeRemaining } from '../src/utils/formatters';

describe('formatters', () => {
  describe('formatBytes', () => {
    it('handles 0 or invalid inputs', () => {
      assert.strictEqual(formatBytes(0), '0 B');
      assert.strictEqual(formatBytes(-10), '0 B');
      assert.strictEqual(formatBytes(NaN), '0 B');
    });

    it('formats bytes correctly', () => {
      assert.strictEqual(formatBytes(500), '500 B');
    });

    it('formats kilobytes correctly', () => {
      assert.strictEqual(formatBytes(1024), '1 KB');
      assert.strictEqual(formatBytes(2048), '2 KB');
      assert.strictEqual(formatBytes(1536), '1.5 KB');
    });

    it('formats megabytes correctly', () => {
      assert.strictEqual(formatBytes(1024 * 1024), '1 MB');
      assert.strictEqual(formatBytes(1024 * 1024 * 4.5), '4.5 MB');
    });

    it('formats gigabytes correctly', () => {
      assert.strictEqual(formatBytes(1024 * 1024 * 1024 * 2), '2 GB');
    });
  });

  describe('formatDate', () => {
    it('formats valid ISO date string', () => {
      const formatted = formatDate('2026-09-22T10:30:00.000Z');
      assert.ok(formatted.length > 5);
      assert.notStrictEqual(formatted, 'Unknown date');
    });

    it('returns fallback on invalid date', () => {
      assert.strictEqual(formatDate('invalid-date'), 'Unknown date');
    });
  });

  describe('formatTimeRemaining', () => {
    it('detects expired times', () => {
      const pastTime = new Date(Date.now() - 10000).toISOString();
      const result = formatTimeRemaining(pastTime);
      assert.strictEqual(result.isExpired, true);
      assert.strictEqual(result.text, 'Expired');
    });

    it('calculates remaining days and hours', () => {
      const baseMs = 1000000000;
      // 2 days + 5 hours
      const futureMs = baseMs + (2 * 24 * 3600 + 5 * 3600) * 1000;
      const result = formatTimeRemaining(new Date(futureMs), baseMs);
      assert.strictEqual(result.isExpired, false);
      assert.strictEqual(result.text, 'Expires in 2d 5h');
    });

    it('calculates remaining hours and minutes', () => {
      const baseMs = 1000000000;
      // 3 hours + 25 minutes
      const futureMs = baseMs + (3 * 3600 + 25 * 60) * 1000;
      const result = formatTimeRemaining(new Date(futureMs), baseMs);
      assert.strictEqual(result.isExpired, false);
      assert.strictEqual(result.text, 'Expires in 3h 25m');
    });

    it('calculates remaining minutes', () => {
      const baseMs = 1000000000;
      // 15 minutes
      const futureMs = baseMs + 15 * 60 * 1000;
      const result = formatTimeRemaining(new Date(futureMs), baseMs);
      assert.strictEqual(result.isExpired, false);
      assert.strictEqual(result.text, 'Expires in 15m');
    });

    it('calculates remaining seconds', () => {
      const baseMs = 1000000000;
      // 45 seconds
      const futureMs = baseMs + 45 * 1000;
      const result = formatTimeRemaining(new Date(futureMs), baseMs);
      assert.strictEqual(result.isExpired, false);
      assert.strictEqual(result.text, 'Expires in 45s');
    });
  });
});

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchShareMetadata, requestDownloadUrl } from '../src/services/shareApi';

describe('dynamicBinding & token isolation', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches and binds distinct metadata for different tokens (Token A vs Token B)', async () => {
    const mockDatabase: Record<string, any> = {
      'token-alpha-111': {
        token: 'token-alpha-111',
        projectName: 'AlphaEngine',
        fileCount: 14,
        originalSize: 82000,
        packageSize: 32000,
        excludedCount: 2,
        sensitiveFileCount: 0,
        createdAt: '2026-09-22T01:00:00.000Z',
        expiresAt: '2026-09-23T01:00:00.000Z',
        downloadCount: 1,
        status: 'active',
      },
      'token-beta-222': {
        token: 'token-beta-222',
        projectName: 'BetaService',
        fileCount: 108,
        originalSize: 5400000,
        packageSize: 1250000,
        excludedCount: 15,
        sensitiveFileCount: 1,
        createdAt: '2026-09-22T01:30:00.000Z',
        expiresAt: '2026-09-23T01:30:00.000Z',
        downloadCount: 5,
        status: 'active',
      },
    };

    globalThis.fetch = async (url: any) => {
      const match = String(url).match(/\/api\/v1\/shares\/([^/?]+)/);
      const token = match ? decodeURIComponent(match[1]) : '';
      const record = mockDatabase[token];

      if (!record) {
        return {
          ok: false,
          status: 404,
          json: async () => ({
            success: false,
            error: { code: 'SHARE_NOT_FOUND', message: 'Not found' },
          }),
        } as any;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: record,
        }),
      } as any;
    };

    // 1. Fetch Token A
    const shareA = await fetchShareMetadata('token-alpha-111');
    assert.strictEqual(shareA.projectName, 'AlphaEngine');
    assert.strictEqual(shareA.fileCount, 14);
    assert.strictEqual(shareA.packageSize, 32000);
    assert.strictEqual(shareA.excludedCount, 2);

    // 2. Fetch Token B
    const shareB = await fetchShareMetadata('token-beta-222');
    assert.strictEqual(shareB.projectName, 'BetaService');
    assert.strictEqual(shareB.fileCount, 108);
    assert.strictEqual(shareB.packageSize, 1250000);
    assert.strictEqual(shareB.excludedCount, 15);

    // 3. Verify absolute isolation (Token A data never bleeds into Token B)
    assert.notStrictEqual(shareA.projectName, shareB.projectName);
    assert.notStrictEqual(shareA.fileCount, shareB.fileCount);
    assert.notStrictEqual(shareA.packageSize, shareB.packageSize);
  });

  it('binds the download request specifically to the active token', async () => {
    let requestedToken = '';

    globalThis.fetch = async (url: any) => {
      const match = String(url).match(/\/api\/v1\/shares\/([^/]+)\/download/);
      if (match) {
        requestedToken = decodeURIComponent(match[1]);
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            downloadUrl: `https://storage.example.com/${requestedToken}.zip`,
            fileName: `${requestedToken}.zip`,
          },
        }),
      } as any;
    };

    const res = await requestDownloadUrl('custom-token-xyz');
    assert.strictEqual(requestedToken, 'custom-token-xyz');
    assert.ok(res.downloadUrl.includes('custom-token-xyz.zip'));
  });

  it('respects AbortSignal to cancel pending requests on token navigation', async () => {
    const controller = new AbortController();

    globalThis.fetch = async (_url: any, options: any) => {
      if (options?.signal?.aborted) {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        throw error;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { projectName: 'Delayed' } }),
      } as any;
    };

    controller.abort();
    await assert.rejects(
      () => fetchShareMetadata('some-token', controller.signal),
      (err: any) => {
        assert.strictEqual(err.name, 'AbortError');
        return true;
      }
    );
  });

  it('sanitizes missing or malformed backend fields gracefully', async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            token: 'sparse-token',
            // projectName omitted
            // fileCount omitted
          },
        }),
      } as any);

    const share = await fetchShareMetadata('sparse-token');
    assert.strictEqual(share.token, 'sparse-token');
    assert.strictEqual(share.projectName, 'Untitled Project');
    assert.strictEqual(share.fileCount, 0);
    assert.strictEqual(share.packageSize, 0);
    assert.strictEqual(share.excludedCount, 0);
    assert.ok(share.createdAt.length > 0);
  });
});

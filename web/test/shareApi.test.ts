import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchShareMetadata,
  requestDownloadUrl,
  ShareApiError,
} from '../src/services/shareApi';

describe('shareApi', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('fetchShareMetadata', () => {
    it('returns share metadata on 200 OK', async () => {
      const mockData = {
        token: 'test-token-123',
        publicUrl: 'http://localhost:5173/share/test-token-123',
        projectName: 'TestProject',
        fileCount: 15,
        originalSize: 45000,
        packageSize: 12000,
        excludedCount: 2,
        sensitiveFileCount: 0,
        createdAt: '2026-09-22T00:00:00.000Z',
        expiresAt: '2026-09-23T00:00:00.000Z',
        downloadCount: 0,
        status: 'active',
      };

      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: mockData,
          }),
        } as any);

      const result = await fetchShareMetadata('test-token-123');
      assert.strictEqual(result.projectName, 'TestProject');
      assert.strictEqual(result.fileCount, 15);
      assert.strictEqual(result.packageSize, 12000);
    });

    it('maps 404 response to not_found pageStatus', async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          json: async () => ({
            success: false,
            error: {
              code: 'SHARE_NOT_FOUND',
              message: 'Share link not found or expired',
            },
          }),
        } as any);

      await assert.rejects(
        () => fetchShareMetadata('nonexistent-token'),
        (err: any) => {
          assert.ok(err instanceof ShareApiError);
          assert.strictEqual(err.pageStatus, 'not_found');
          assert.strictEqual(err.statusCode, 404);
          return true;
        }
      );
    });

    it('maps 410 response with SHARE_EXPIRED to expired pageStatus', async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 410,
          json: async () => ({
            success: false,
            error: {
              code: 'SHARE_EXPIRED',
              message: 'This share link has expired',
            },
          }),
        } as any);

      await assert.rejects(
        () => fetchShareMetadata('expired-token'),
        (err: any) => {
          assert.ok(err instanceof ShareApiError);
          assert.strictEqual(err.pageStatus, 'expired');
          assert.strictEqual(err.statusCode, 410);
          return true;
        }
      );
    });

    it('maps 410 response with SHARE_REVOKED to revoked pageStatus', async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 410,
          json: async () => ({
            success: false,
            error: {
              code: 'SHARE_REVOKED',
              message: 'This share link has been revoked',
            },
          }),
        } as any);

      await assert.rejects(
        () => fetchShareMetadata('revoked-token'),
        (err: any) => {
          assert.ok(err instanceof ShareApiError);
          assert.strictEqual(err.pageStatus, 'revoked');
          assert.strictEqual(err.statusCode, 410);
          return true;
        }
      );
    });

    it('maps network failure to error pageStatus with user-friendly message', async () => {
      globalThis.fetch = async () => {
        throw new Error('Failed to fetch');
      };

      await assert.rejects(
        () => fetchShareMetadata('any-token'),
        (err: any) => {
          assert.ok(err instanceof ShareApiError);
          assert.strictEqual(err.pageStatus, 'error');
          assert.strictEqual(err.code, 'NETWORK_ERROR');
          assert.ok(err.userFriendlyMessage.includes('internet connection'));
          return true;
        }
      );
    });
  });

  describe('requestDownloadUrl', () => {
    it('returns authorized pre-signed URL and filename', async () => {
      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              downloadUrl: 'https://example-storage.com/project.zip?token=xyz',
              fileName: 'MyProject.zip',
            },
          }),
        } as any);

      const result = await requestDownloadUrl('valid-token');
      assert.strictEqual(
        result.downloadUrl,
        'https://example-storage.com/project.zip?token=xyz'
      );
      assert.strictEqual(result.fileName, 'MyProject.zip');
    });

    it('throws ShareApiError if server returns 410 on download', async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 410,
          json: async () => ({
            success: false,
            error: {
              code: 'SHARE_EXPIRED',
              message: 'Share expired',
            },
          }),
        } as any);

      await assert.rejects(
        () => requestDownloadUrl('expired-token'),
        (err: any) => {
          assert.ok(err instanceof ShareApiError);
          assert.strictEqual(err.pageStatus, 'expired');
          return true;
        }
      );
    });

    it('throws ShareApiError when downloadUrl is missing from payload', async () => {
      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {},
          }),
        } as any);

      await assert.rejects(
        () => requestDownloadUrl('valid-token'),
        (err: any) => {
          assert.ok(err instanceof ShareApiError);
          assert.strictEqual(err.code, 'DOWNLOAD_URL_MISSING');
          return true;
        }
      );
    });
  });
});

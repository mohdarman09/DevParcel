import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { Readable } from 'stream';
import { createApp } from '../app';
import { config } from '../config';
import { setStorageProvider, MockStorageProvider } from '../services/storage';
import { setShareRepository, MockShareRepository } from '../repositories';
import { ShareService, ShareServiceError } from '../services/sharing/shareService';
import { CleanupService } from '../services/sharing/cleanupService';
import { generateShareToken, isValidShareToken } from '../utils/tokenGenerator';
import { generateStorageKey, isValidStorageKey } from '../utils/storageKeyGenerator';

describe('Phase 6: Share Download Link + Backend Foundation', () => {
  let server: http.Server;
  let baseUrl: string;
  let mockStorage: MockStorageProvider;
  let mockRepo: MockShareRepository;

  before(async () => {
    mockStorage = new MockStorageProvider();
    setStorageProvider(mockStorage);

    mockRepo = new MockShareRepository();
    setShareRepository(mockRepo);

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    mockStorage.clear();
    mockRepo.clear();
  });

  // Helper to create a dummy ZIP buffer
  function createTestZipBuffer(): Buffer {
    // Minimal standard ZIP header
    const header = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const body = Buffer.from('mock zip content');
    return Buffer.concat([header, body]);
  }

  // ==================================================
  // 1. CREATE SHARE & UPLOAD (TEST 1 - 3)
  // ==================================================
  describe('Create Share & Upload Flow', () => {
    test('TEST 1: Create share with valid ZIP and metadata succeeds', async () => {
      const formData = new FormData();
      const zipBuffer = createTestZipBuffer();
      const blob = new Blob([new Uint8Array(zipBuffer)], { type: 'application/zip' });

      formData.append('projectName', 'my-test-project');
      formData.append('fileCount', '42');
      formData.append('originalSize', '102400');
      formData.append('packageSize', '51200');
      formData.append('excludedCount', '5');
      formData.append('sensitiveFileCount', '0');
      formData.append('expiryHours', '24');
      formData.append('file', blob, 'package.zip');

      const res = await fetch(`${baseUrl}/api/v1/shares`, {
        method: 'POST',
        body: formData,
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.token);
      assert.equal(json.data.projectName, 'my-test-project');
      assert.equal(json.data.fileCount, 42);
      assert.equal(json.data.originalSize, 102400);
      assert.ok(json.data.publicUrl.includes(json.data.token));
      assert.equal(json.data.status, 'active');

      // Verify file was stored in storage provider
      assert.equal(mockStorage.storage.size, 1);
      // Verify metadata record stored in repository
      assert.equal(mockRepo.records.size, 1);
    });

    test('TEST 2: Invalid upload (no file or non-ZIP file) is rejected', async () => {
      // 2a: No file
      const formDataNoFile = new FormData();
      formDataNoFile.append('projectName', 'my-project');
      const resNoFile = await fetch(`${baseUrl}/api/v1/shares`, {
        method: 'POST',
        body: formDataNoFile,
      });
      assert.equal(resNoFile.status, 400);
      const jsonNoFile = await resNoFile.json();
      assert.equal(jsonNoFile.success, false);
      assert.equal(jsonNoFile.error.code, 'NO_FILE_UPLOADED');

      // 2b: Non-ZIP file
      const formDataBadMime = new FormData();
      const txtBlob = new Blob(['hello world'], { type: 'text/plain' });
      formDataBadMime.append('projectName', 'my-project');
      formDataBadMime.append('file', txtBlob, 'test.txt');
      const resBadMime = await fetch(`${baseUrl}/api/v1/shares`, {
        method: 'POST',
        body: formDataBadMime,
      });
      assert.equal(resBadMime.status, 415);
      const jsonBadMime = await resBadMime.json();
      assert.equal(jsonBadMime.success, false);
      assert.equal(jsonBadMime.error.code, 'UNSUPPORTED_MEDIA_TYPE');
    });

    test('TEST 3: Upload size limit enforcement rejects oversized payload', async () => {
      // Temporarily set a very small max size (50 bytes)
      const originalMax = config.upload.maxSizeBytes;
      const originalMb = config.upload.maxSizeMb;
      (config.upload as any).maxSizeBytes = 50;
      (config.upload as any).maxSizeMb = 0.00005;

      try {
        const formData = new FormData();
        const bigBuffer = Buffer.alloc(200, 'A');
        const blob = new Blob([new Uint8Array(bigBuffer)], { type: 'application/zip' });
        formData.append('projectName', 'oversized-project');
        formData.append('fileCount', '1');
        formData.append('originalSize', '200');
        formData.append('file', blob, 'package.zip');

        const res = await fetch(`${baseUrl}/api/v1/shares`, {
          method: 'POST',
          body: formData,
        });

        assert.equal(res.status, 413);
        const json = await res.json();
        assert.equal(json.success, false);
        assert.equal(json.error.code, 'FILE_TOO_LARGE');

        // Verify storage was cleaned up
        assert.equal(mockStorage.storage.size, 0);
      } finally {
        (config.upload as any).maxSizeBytes = originalMax;
        (config.upload as any).maxSizeMb = originalMb;
      }
    });

    test('TEST 3b: Uploads larger than 16KB stream buffer (e.g. 100KB) succeed without deadlocking', async () => {
      const formData = new FormData();
      const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      const bigBuffer = Buffer.alloc(100 * 1024, 0x5a); // 100 KB payload
      const blob = new Blob([new Uint8Array(Buffer.concat([zipHeader, bigBuffer]))], {
        type: 'application/zip',
      });

      formData.append('projectName', 'large-buffer-project');
      formData.append('fileCount', '25');
      formData.append('originalSize', '102400');
      formData.append('packageSize', '102404');
      formData.append('file', blob, 'large-package.zip');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const res = await fetch(`${baseUrl}/api/v1/shares`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        assert.equal(res.status, 201);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.ok(json.data.token);
        assert.equal(json.data.projectName, 'large-buffer-project');
        assert.equal(mockStorage.storage.size, 1);
        assert.equal(mockRepo.records.size, 1);
      } finally {
        clearTimeout(timeout);
      }
    });
  });

  // ==================================================
  // 2. TOKEN GENERATION & VALIDATION (TEST 4 - 5)
  // ==================================================
  describe('Token Security & Entropy', () => {
    test('TEST 4: Secure token generation produces high entropy URL-safe string', () => {
      const token = generateShareToken(16);
      assert.ok(isValidShareToken(token));
      assert.ok(token.length >= 20);
      assert.match(token, /^[A-Za-z0-9_-]+$/);
    });

    test('TEST 5: Token uniqueness across consecutive generations', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const t = generateShareToken();
        assert.ok(!tokens.has(t), `Duplicate token detected: ${t}`);
        tokens.add(t);
      }
      assert.equal(tokens.size, 50);
    });
  });

  // ==================================================
  // 3. METADATA VALIDATION (TEST 6)
  // ==================================================
  describe('Metadata Validation', () => {
    test('TEST 6: Missing or invalid metadata rejected with 400', async () => {
      const shareService = new ShareService(mockStorage, mockRepo);
      const stream = Readable.from(createTestZipBuffer());

      // Empty project name
      await assert.rejects(
        async () => {
          await shareService.createShare({
            projectName: '',
            fileCount: 10,
            originalSize: 1000,
            packageSize: 500,
            fileStream: stream,
          });
        },
        (err: any) => {
          assert.equal(err.code, 'INVALID_METADATA');
          return true;
        }
      );

      // Negative fileCount
      await assert.rejects(
        async () => {
          await shareService.createShare({
            projectName: 'valid-project',
            fileCount: -1,
            originalSize: 1000,
            packageSize: 500,
            fileStream: Readable.from(createTestZipBuffer()),
          });
        },
        (err: any) => {
          assert.equal(err.code, 'INVALID_METADATA');
          return true;
        }
      );

      // Out of bounds expiry
      await assert.rejects(
        async () => {
          await shareService.createShare({
            projectName: 'valid-project',
            fileCount: 1,
            originalSize: 100,
            packageSize: 50,
            expiryHours: 999, // Max is 168
            fileStream: Readable.from(createTestZipBuffer()),
          });
        },
        (err: any) => {
          assert.equal(err.code, 'INVALID_EXPIRY');
          return true;
        }
      );
    });
  });

  // ==================================================
  // 4. STORAGE UPLOAD & DB FAILURE RECOVERY (TEST 7 - 9)
  // ==================================================
  describe('Storage Upload & DB Failure Recovery', () => {
    test('TEST 7: Storage upload success puts file under safe storage key', async () => {
      const shareService = new ShareService(mockStorage, mockRepo);
      const stream = Readable.from(createTestZipBuffer());
      const metadata = await shareService.createShare({
        projectName: 'storage-key-test',
        fileCount: 10,
        originalSize: 2000,
        packageSize: 1000,
        fileStream: stream,
      });

      assert.ok(metadata.token);
      assert.equal(mockStorage.storage.size, 1);

      const [storedKey] = mockStorage.storage.keys();
      assert.ok(isValidStorageKey(storedKey));
      assert.match(storedKey, /^shares\/[a-f0-9-]+\/package\.zip$/);
    });

    test('TEST 8: Storage upload failure halts share creation without DB record', async () => {
      mockStorage.shouldFailUpload = true;
      const shareService = new ShareService(mockStorage, mockRepo);
      const stream = Readable.from(createTestZipBuffer());

      await assert.rejects(
        async () => {
          await shareService.createShare({
            projectName: 'fail-project',
            fileCount: 5,
            originalSize: 1000,
            packageSize: 500,
            fileStream: stream,
          });
        },
        (err: any) => {
          assert.equal(err.code, 'STORAGE_UPLOAD_FAILED');
          assert.equal(err.statusCode, 502);
          return true;
        }
      );

      assert.equal(mockRepo.records.size, 0);
    });

    test('TEST 9: Database failure cleans up uploaded storage object', async () => {
      mockRepo.shouldFail = true;
      const shareService = new ShareService(mockStorage, mockRepo);
      const stream = Readable.from(createTestZipBuffer());

      await assert.rejects(
        async () => {
          await shareService.createShare({
            projectName: 'db-fail-project',
            fileCount: 5,
            originalSize: 1000,
            packageSize: 500,
            fileStream: stream,
          });
        },
        (err: any) => {
          assert.equal(err.code, 'DATABASE_ERROR');
          return true;
        }
      );

      // Verify orphaned object was cleaned up from storage
      assert.equal(mockStorage.storage.size, 0);
    });
  });

  // ==================================================
  // 5. GET SHARE METADATA & EXPIRY (TEST 10 - 12)
  // ==================================================
  describe('Get Share Metadata & Expiry Enforcement', () => {
    test('TEST 10: Get valid share returns sanitized metadata without storage keys or DB IDs', async () => {
      const shareService = new ShareService(mockStorage, mockRepo);
      const stream = Readable.from(createTestZipBuffer());
      const created = await shareService.createShare({
        projectName: 'get-test-project',
        fileCount: 15,
        originalSize: 10000,
        packageSize: 4000,
        excludedCount: 2,
        sensitiveFileCount: 0,
        fileStream: stream,
      });

      const res = await fetch(`${baseUrl}/api/v1/shares/${created.token}`);
      assert.equal(res.status, 200);
      const json = await res.json();

      assert.equal(json.success, true);
      assert.equal(json.data.projectName, 'get-test-project');
      assert.equal(json.data.fileCount, 15);
      assert.equal(json.data.token, created.token);
      assert.equal(json.data.id, undefined);
      assert.equal(json.data._id, undefined);
      assert.equal(json.data.storageKey, undefined);
    });

    test('TEST 11: Get invalid share returns 404 SHARE_NOT_FOUND', async () => {
      const randomToken = generateShareToken();
      const res = await fetch(`${baseUrl}/api/v1/shares/${randomToken}`);
      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'SHARE_NOT_FOUND');
    });

    test('TEST 12: Expired share returns HTTP 410 SHARE_EXPIRED', async () => {
      const token = generateShareToken();
      const storageKey = generateStorageKey();
      // Insert already expired share into mock repository
      await mockRepo.create({
        token,
        storageKey,
        projectName: 'expired-project',
        fileCount: 1,
        originalSize: 100,
        packageSize: 50,
        excludedCount: 0,
        sensitiveFileCount: 0,
        createdAt: new Date(Date.now() - 48 * 3600 * 1000),
        expiresAt: new Date(Date.now() - 24 * 3600 * 1000), // expired 24h ago
        status: 'active',
      });

      const res = await fetch(`${baseUrl}/api/v1/shares/${token}`);
      assert.equal(res.status, 410);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'SHARE_EXPIRED');
    });
  });

  // ==================================================
  // 6. DOWNLOAD FLOW & SIGNED URLS (TEST 13 - 17)
  // ==================================================
  describe('Download Flow & Signed URLs', () => {
    test('TEST 13: Download valid share returns 302 redirect to signed URL or JSON format', async () => {
      const shareService = new ShareService(mockStorage, mockRepo);
      const stream = Readable.from(createTestZipBuffer());
      const created = await shareService.createShare({
        projectName: 'download-project',
        fileCount: 3,
        originalSize: 300,
        packageSize: 150,
        fileStream: stream,
      });

      // 13a: JSON format request
      const resJson = await fetch(`${baseUrl}/api/v1/shares/${created.token}/download?format=json`);
      assert.equal(resJson.status, 200);
      const json = await resJson.json();
      assert.equal(json.success, true);
      assert.ok(json.data.downloadUrl);
      assert.equal(json.data.fileName, 'download-project.zip');

      // 13b: Redirect request (redirect: 'manual')
      const resRedirect = await fetch(`${baseUrl}/api/v1/shares/${created.token}/download`, {
        redirect: 'manual',
      });
      assert.equal(resRedirect.status, 302);
      assert.ok(resRedirect.headers.get('location'));
    });

    test('TEST 14: Download expired share returns 410 SHARE_EXPIRED', async () => {
      const token = generateShareToken();
      await mockRepo.create({
        token,
        storageKey: generateStorageKey(),
        projectName: 'expired-download',
        fileCount: 1,
        originalSize: 100,
        packageSize: 50,
        createdAt: new Date(Date.now() - 48 * 3600 * 1000),
        expiresAt: new Date(Date.now() - 1000),
        status: 'expired',
      });

      const res = await fetch(`${baseUrl}/api/v1/shares/${token}/download`);
      assert.equal(res.status, 410);
      const json = await res.json();
      assert.equal(json.error.code, 'SHARE_EXPIRED');
    });

    test('TEST 15: Download with invalid token returns 400 INVALID_TOKEN', async () => {
      const res = await fetch(`${baseUrl}/api/v1/shares/invalid!token@123/download`);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error.code, 'INVALID_TOKEN');
    });

    test('TEST 16: Signed URL generation contains encoded filename', async () => {
      const shareService = new ShareService(mockStorage, mockRepo);
      const stream = Readable.from(createTestZipBuffer());
      const created = await shareService.createShare({
        projectName: 'Project With Spaces',
        fileCount: 2,
        originalSize: 200,
        packageSize: 100,
        fileStream: stream,
      });

      const downloadResult = await shareService.getDownloadUrlForShare(created.token);
      assert.ok(downloadResult.downloadUrl.includes('Project%20With%20Spaces.zip'));
    });

    test('TEST 17: Download count safely increments on download', async () => {
      const shareService = new ShareService(mockStorage, mockRepo);
      const stream = Readable.from(createTestZipBuffer());
      const created = await shareService.createShare({
        projectName: 'counter-test',
        fileCount: 1,
        originalSize: 100,
        packageSize: 50,
        fileStream: stream,
      });

      // Perform download
      await fetch(`${baseUrl}/api/v1/shares/${created.token}/download?format=json`);

      const stored = mockRepo.records.get(created.token);
      assert.equal(stored?.downloadCount, 1);
      assert.ok(stored?.lastDownloadedAt);
    });
  });

  // ==================================================
  // 7. CLEANUP SERVICE & IDEMPOTENCY (TEST 18 - 19)
  // ==================================================
  describe('Cleanup Service', () => {
    test('TEST 18: Cleanup expired share removes storage object and updates status', async () => {
      const token = generateShareToken();
      const storageKey = generateStorageKey();
      mockStorage.storage.set(storageKey, Buffer.from('test zip'));

      await mockRepo.create({
        token,
        storageKey,
        projectName: 'cleanup-test',
        fileCount: 1,
        originalSize: 100,
        packageSize: 50,
        createdAt: new Date(Date.now() - 48 * 3600 * 1000),
        expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
        status: 'active',
      });

      const cleanupService = new CleanupService(mockStorage, mockRepo);
      const result = await cleanupService.cleanupExpiredShares();

      assert.equal(result.scanned, 1);
      assert.equal(result.cleaned, 1);
      assert.equal(result.errors, 0);

      // Verify object was deleted from storage
      assert.equal(mockStorage.storage.has(storageKey), false);
      // Verify record status is 'cleaned'
      assert.equal(mockRepo.records.get(token)?.status, 'cleaned');
    });

    test('TEST 19: Cleanup idempotency tolerates repeated runs and missing objects', async () => {
      const cleanupService = new CleanupService(mockStorage, mockRepo);
      const result1 = await cleanupService.cleanupExpiredShares();
      assert.equal(result1.scanned, 0);

      // Add share whose storage object was already deleted
      const token = generateShareToken();
      const storageKey = generateStorageKey();
      await mockRepo.create({
        token,
        storageKey,
        projectName: 'already-deleted',
        fileCount: 1,
        originalSize: 100,
        packageSize: 50,
        createdAt: new Date(Date.now() - 48 * 3600 * 1000),
        expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
        status: 'expired',
      });

      const result2 = await cleanupService.cleanupExpiredShares();
      assert.equal(result2.scanned, 1);
      assert.equal(result2.cleaned, 1);
      assert.equal(result2.errors, 0);
    });
  });

  // ==================================================
  // 8. SECURITY, CORS, & PATH TRAVERSAL (TEST 20 - 23)
  // ==================================================
  describe('Security, CORS & Path Traversal', () => {
    test('TEST 20: Path traversal and storage key protection', () => {
      assert.equal(isValidStorageKey('shares/abc-123/package.zip'), true);
      assert.equal(isValidStorageKey('shares/../secret.txt'), false);
      assert.equal(isValidStorageKey('shares/..\\secret.txt'), false);
      assert.equal(isValidStorageKey('etc/passwd'), false);
      assert.equal(isValidStorageKey('/shares/123/package.zip'), false);
    });

    test('TEST 21: Sensitive metadata (passwords/secrets/file contents) not persisted', async () => {
      const shareService = new ShareService(mockStorage, mockRepo);
      const stream = Readable.from(createTestZipBuffer());
      const created = await shareService.createShare({
        projectName: 'secret-audit-project',
        fileCount: 1,
        originalSize: 100,
        packageSize: 50,
        fileStream: stream,
      });

      const record = mockRepo.records.get(created.token);
      assert.equal((record as any).password, undefined);
      assert.equal((record as any).secret, undefined);
      assert.equal((record as any).apiKey, undefined);
      assert.equal((record as any).fileContents, undefined);
      assert.equal((record as any).zipBinary, undefined);
    });

    test('TEST 22: CORS behavior sets appropriate access control headers', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`, {
        headers: {
          Origin: 'http://localhost:5173',
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    });

    test('TEST 23: Error response consistency across all error types', async () => {
      // Test 404 endpoint
      const res404 = await fetch(`${baseUrl}/api/v1/nonexistent`);
      assert.equal(res404.status, 404);
      const json404 = await res404.json();
      assert.equal(json404.success, false);
      assert.ok(json404.error?.code);
      assert.ok(json404.error?.message);

      // Test invalid token
      const res400 = await fetch(`${baseUrl}/api/v1/shares/bad!token`);
      assert.equal(res400.status, 400);
      const json400 = await res400.json();
      assert.equal(json400.success, false);
      assert.ok(json400.error?.code);
      assert.ok(json400.error?.message);
    });
  });
});

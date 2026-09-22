import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockShareRepository } from '../repositories/mockShareRepository';
import { generateShareToken } from '../utils/tokenGenerator';
import { generateStorageKey } from '../utils/storageKeyGenerator';

describe('PostgreSQL Share Repository Contract & Concurrency Tests', () => {
  let repo: MockShareRepository;

  beforeEach(() => {
    repo = new MockShareRepository();
  });

  test('TEST R1: Create share persists all metadata fields and generates UUID', async () => {
    const token = generateShareToken();
    const storageKey = generateStorageKey();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    const record = await repo.create({
      token,
      storageKey,
      projectName: 'my-project',
      fileCount: 42,
      originalSize: 102400,
      packageSize: 51200,
      excludedCount: 3,
      sensitiveFileCount: 0,
      expiresAt,
    });

    assert.ok(record.id);
    assert.equal(record.token, token);
    assert.equal(record.storageKey, storageKey);
    assert.equal(record.projectName, 'my-project');
    assert.equal(record.fileCount, 42);
    assert.equal(record.originalSize, 102400);
    assert.equal(record.packageSize, 51200);
    assert.equal(record.excludedCount, 3);
    assert.equal(record.sensitiveFileCount, 0);
    assert.equal(record.downloadCount, 0);
    assert.equal(record.status, 'active');
  });

  test('TEST R2: Unique token constraint rejects duplicate tokens', async () => {
    const token = generateShareToken();
    await repo.create({
      token,
      storageKey: generateStorageKey(),
      projectName: 'project-1',
      fileCount: 1,
      originalSize: 100,
      packageSize: 50,
      expiresAt: new Date(Date.now() + 3600000),
    });

    await assert.rejects(
      async () => {
        await repo.create({
          token, // Duplicate token
          storageKey: generateStorageKey(),
          projectName: 'project-2',
          fileCount: 2,
          originalSize: 200,
          packageSize: 100,
          expiresAt: new Date(Date.now() + 3600000),
        });
      },
      (err: any) => {
        assert.equal(err.code, '23505'); // PostgreSQL unique violation
        return true;
      }
    );
  });

  test('TEST R3: Database constraints enforce non-negative counts and sizes', async () => {
    await assert.rejects(
      async () => {
        await repo.create({
          token: generateShareToken(),
          storageKey: generateStorageKey(),
          projectName: 'invalid-counts',
          fileCount: -5,
          originalSize: 100,
          packageSize: 50,
          expiresAt: new Date(Date.now() + 3600000),
        });
      },
      (err: any) => {
        assert.equal(err.code, '23514'); // PostgreSQL check violation
        return true;
      }
    );
  });

  test('TEST R4: Concurrent download count increments execute atomically without race conditions', async () => {
    const token = generateShareToken();
    await repo.create({
      token,
      storageKey: generateStorageKey(),
      projectName: 'concurrent-download-project',
      fileCount: 10,
      originalSize: 5000,
      packageSize: 2500,
      expiresAt: new Date(Date.now() + 3600000),
    });

    // Simulate 20 concurrent downloads
    const concurrentDownloads = Array.from({ length: 20 }, () =>
      repo.incrementDownloadCount(token)
    );

    const results = await Promise.all(concurrentDownloads);
    assert.equal(results.length, 20);

    const finalRecord = await repo.findByToken(token);
    assert.equal(finalRecord?.downloadCount, 20);
    assert.ok(finalRecord?.lastDownloadedAt);
  });

  test('TEST R5: findExpired returns only expired or explicitly marked expired shares', async () => {
    const now = new Date();

    // 1. Active, unexpired
    await repo.create({
      token: generateShareToken(),
      storageKey: generateStorageKey(),
      projectName: 'active-unexpired',
      fileCount: 1,
      originalSize: 100,
      packageSize: 50,
      expiresAt: new Date(now.getTime() + 3600000),
    });

    // 2. Expired by timestamp
    const expiredToken = generateShareToken();
    await repo.create({
      token: expiredToken,
      storageKey: generateStorageKey(),
      projectName: 'expired-by-time',
      fileCount: 1,
      originalSize: 100,
      packageSize: 50,
      expiresAt: new Date(now.getTime() - 1000),
    });

    // 3. Marked 'cleaned' (should be excluded)
    const cleanedToken = generateShareToken();
    const cleanedRecord = await repo.create({
      token: cleanedToken,
      storageKey: generateStorageKey(),
      projectName: 'already-cleaned',
      fileCount: 1,
      originalSize: 100,
      packageSize: 50,
      expiresAt: new Date(now.getTime() - 1000),
      status: 'cleaned',
    });
    await repo.updateStatus(cleanedRecord.id, 'cleaned');

    const expiredList = await repo.findExpired(now);
    assert.equal(expiredList.length, 1);
    assert.equal(expiredList[0].token, expiredToken);
  });

  test('TEST R6: updateStatus transitions status to cleaned or expired', async () => {
    const token = generateShareToken();
    const record = await repo.create({
      token,
      storageKey: generateStorageKey(),
      projectName: 'status-transition',
      fileCount: 1,
      originalSize: 100,
      packageSize: 50,
      expiresAt: new Date(Date.now() + 3600000),
    });

    assert.equal(record.status, 'active');
    await repo.updateStatus(record.id, 'cleaned');

    const updated = await repo.findByToken(token);
    assert.equal(updated?.status, 'cleaned');
  });
});

import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { Readable } from 'stream';
import { createApp } from '../app';
import { setStorageProvider, MockStorageProvider } from '../services/storage';
import { setShareRepository, MockShareRepository } from '../repositories';
import { ShareService } from '../services/sharing/shareService';
import { PasswordHasher } from '../utils/passwordHasher';
import { AccessTicket } from '../utils/accessTicket';
import { PasswordRateLimiter } from '../utils/rateLimiter';

describe('Phase 8 Backend: Share History, Revoke, Custom Expiry & Password Protection', () => {
  let server: http.Server;
  let baseUrl: string;
  let mockStorage: MockStorageProvider;
  let mockRepo: MockShareRepository;
  let shareService: ShareService;

  before(async () => {
    mockStorage = new MockStorageProvider();
    setStorageProvider(mockStorage);

    mockRepo = new MockShareRepository();
    setShareRepository(mockRepo);

    shareService = new ShareService(mockStorage, mockRepo);

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
    PasswordRateLimiter.clear();
  });

  function createDummyStream(): NodeJS.ReadableStream {
    return Readable.from([Buffer.from('PK\x03\x04dummy-zip-content')]);
  }

  describe('Feature 1 & 2: Share History & Revoke', () => {
    test('TEST 8.1: Share history isolation by senderId', async () => {
      const sender1 = 'sender-alice-uuid-1111';
      const sender2 = 'sender-bob-uuid-2222';

      // Create shares for sender 1
      await shareService.createShare({
        projectName: 'Alice Project Alpha',
        fileCount: 5,
        originalSize: 1000,
        packageSize: 500,
        fileStream: createDummyStream(),
        senderId: sender1,
      });

      await shareService.createShare({
        projectName: 'Alice Project Beta',
        fileCount: 10,
        originalSize: 2000,
        packageSize: 1000,
        fileStream: createDummyStream(),
        senderId: sender1,
      });

      // Create share for sender 2
      await shareService.createShare({
        projectName: 'Bob Project Secret',
        fileCount: 20,
        originalSize: 5000,
        packageSize: 2500,
        fileStream: createDummyStream(),
        senderId: sender2,
      });

      // Query history for sender 1 via HTTP
      const res1 = await fetch(`${baseUrl}/api/v1/shares/history`, {
        headers: { 'X-Sender-Id': sender1 },
      });
      assert.strictEqual(res1.status, 200);
      const data1 = await res1.json();
      assert.strictEqual(data1.success, true);
      assert.strictEqual(data1.data.length, 2);
      assert.strictEqual(data1.data[0].projectName, 'Alice Project Beta');
      assert.strictEqual(data1.data[1].projectName, 'Alice Project Alpha');

      // Verify no leakage of Bob's project to Alice
      const aliceHasBobsProject = data1.data.some(
        (p: any) => p.projectName === 'Bob Project Secret'
      );
      assert.strictEqual(aliceHasBobsProject, false, 'No cross-user share leakage');

      // Query history without X-Sender-Id -> 401
      const resNoSender = await fetch(`${baseUrl}/api/v1/shares/history`);
      assert.strictEqual(resNoSender.status, 401);
    });

    test('TEST 8.2: Revoke active share link and enforce download block', async () => {
      const sender = 'sender-revoke-owner-123';
      const imposter = 'imposter-attacker-999';

      const created = await shareService.createShare({
        projectName: 'Revoke Target Project',
        fileCount: 3,
        originalSize: 800,
        packageSize: 400,
        fileStream: createDummyStream(),
        senderId: sender,
      });

      // Imposter tries to revoke -> 403 Forbidden
      const imposterRes = await fetch(`${baseUrl}/api/v1/shares/${created.token}/revoke`, {
        method: 'POST',
        headers: { 'X-Sender-Id': imposter },
      });
      assert.strictEqual(imposterRes.status, 403);

      // Legitimate owner revokes -> 200 OK
      const ownerRes = await fetch(`${baseUrl}/api/v1/shares/${created.token}/revoke`, {
        method: 'POST',
        headers: { 'X-Sender-Id': sender },
      });
      assert.strictEqual(ownerRes.status, 200);
      const revokeJson = await ownerRes.json();
      assert.strictEqual(revokeJson.data.status, 'revoked');

      // Idempotent repeated revoke succeeds
      const repeatRes = await fetch(`${baseUrl}/api/v1/shares/${created.token}/revoke`, {
        method: 'POST',
        headers: { 'X-Sender-Id': sender },
      });
      assert.strictEqual(repeatRes.status, 200);

      // Recipient metadata fetch returns 410 SHARE_REVOKED
      const getRes = await fetch(`${baseUrl}/api/v1/shares/${created.token}`);
      assert.strictEqual(getRes.status, 410);
      const getJson = await getRes.json();
      assert.strictEqual(getJson.error.code, 'SHARE_REVOKED');

      // Recipient download attempt blocked with 410 SHARE_REVOKED
      const dlRes = await fetch(`${baseUrl}/api/v1/shares/${created.token}/download`);
      assert.strictEqual(dlRes.status, 410);
    });
  });

  describe('Feature 3: Custom Expiry Validation', () => {
    test('TEST 8.3: Custom expiry within bounds (1h, 6h, 72h, 168h) succeeds', async () => {
      for (const hours of [1, 6, 24, 72, 168]) {
        const share = await shareService.createShare({
          projectName: `Expiry ${hours}h`,
          fileCount: 1,
          originalSize: 100,
          packageSize: 50,
          fileStream: createDummyStream(),
          expiryHours: hours,
        });

        const diffHours = Math.round(
          (new Date(share.expiresAt).getTime() - new Date(share.createdAt).getTime()) / (3600 * 1000)
        );
        assert.strictEqual(diffHours, hours);
      }
    });

    test('TEST 8.4: Out-of-bounds expiry (< 1h or > 168h) rejected with 400 INVALID_EXPIRY', async () => {
      await assert.rejects(
        async () => {
          await shareService.createShare({
            projectName: 'Invalid Expiry',
            fileCount: 1,
            originalSize: 100,
            packageSize: 50,
            fileStream: createDummyStream(),
            expiryHours: 0,
          });
        },
        (err: any) => err.code === 'INVALID_EXPIRY'
      );

      await assert.rejects(
        async () => {
          await shareService.createShare({
            projectName: 'Invalid Expiry High',
            fileCount: 1,
            originalSize: 100,
            packageSize: 50,
            fileStream: createDummyStream(),
            expiryHours: 200,
          });
        },
        (err: any) => err.code === 'INVALID_EXPIRY'
      );
    });
  });

  describe('Feature 4: Password Protection', () => {
    test('TEST 8.5: Plaintext password is never stored; Argon2id hash is persisted', async () => {
      const plaintextPassword = 'SecretPassword123!';
      const share = await shareService.createShare({
        projectName: 'Top Secret Project',
        fileCount: 2,
        originalSize: 500,
        packageSize: 250,
        fileStream: createDummyStream(),
        password: plaintextPassword,
      });

      assert.strictEqual(share.isPasswordProtected, true);

      // Verify raw DB record contains password_hash and NOT plaintext
      const record = await mockRepo.findByToken(share.token);
      assert.ok(record?.passwordHash, 'Hash must exist');
      assert.notStrictEqual(record?.passwordHash, plaintextPassword, 'Must not be plaintext');
      assert.ok(record?.passwordHash?.startsWith('$argon2id$'), 'Must be an Argon2id hash');
    });

    test('TEST 8.6: Password protected share masks metadata until unlocked', async () => {
      const share = await shareService.createShare({
        projectName: 'Hidden Classified App',
        fileCount: 15,
        originalSize: 50000,
        packageSize: 20000,
        fileStream: createDummyStream(),
        password: 'PassWord987!',
      });

      // GET /api/v1/shares/:token returns masked placeholder metadata
      const res = await fetch(`${baseUrl}/api/v1/shares/${share.token}`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.isPasswordProtected, true);
      assert.strictEqual(json.data.projectName, 'Protected Project');
      assert.strictEqual(json.data.fileCount, 0);
      assert.strictEqual(json.data.packageSize, 0);
    });

    test('TEST 8.7: Incorrect password rejected; Correct password grants accessTicket', async () => {
      const password = 'SuperSecurePassword42';
      const share = await shareService.createShare({
        projectName: 'Unlockable Project',
        fileCount: 4,
        originalSize: 2000,
        packageSize: 800,
        fileStream: createDummyStream(),
        password,
      });

      // Attempt with wrong password -> 401
      const wrongRes = await fetch(`${baseUrl}/api/v1/shares/${share.token}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'WrongPassword!' }),
      });
      assert.strictEqual(wrongRes.status, 401);
      const wrongJson = await wrongRes.json();
      assert.strictEqual(wrongJson.error.code, 'INVALID_PASSWORD');

      // Attempt with correct password -> 200 + access ticket + full metadata
      const correctRes = await fetch(`${baseUrl}/api/v1/shares/${share.token}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      assert.strictEqual(correctRes.status, 200);
      const correctJson = await correctRes.json();
      assert.strictEqual(correctJson.data.share.projectName, 'Unlockable Project');
      assert.strictEqual(correctJson.data.share.fileCount, 4);
      assert.ok(correctJson.data.accessTicket, 'Must receive accessTicket');

      // Download WITHOUT ticket -> 401 UNAUTHORIZED
      const dlNoTicket = await fetch(`${baseUrl}/api/v1/shares/${share.token}/download`);
      assert.strictEqual(dlNoTicket.status, 401);

      // Download WITH ticket -> 302 redirect
      const dlWithTicket = await fetch(
        `${baseUrl}/api/v1/shares/${share.token}/download?ticket=${encodeURIComponent(
          correctJson.data.accessTicket
        )}`,
        { redirect: 'manual' }
      );
      assert.strictEqual(dlWithTicket.status, 302);
    });

    test('TEST 8.8: Password brute-force rate limiting locks out after 5 failures', async () => {
      const share = await shareService.createShare({
        projectName: 'Brute Force Target',
        fileCount: 1,
        originalSize: 100,
        packageSize: 50,
        fileStream: createDummyStream(),
        password: 'ValidPassword123',
      });

      // Fail 4 times -> 401
      for (let i = 0; i < 4; i++) {
        const res = await fetch(`${baseUrl}/api/v1/shares/${share.token}/verify-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: `wrong_${i}` }),
        });
        assert.strictEqual(res.status, 401);
      }

      // 5th failure -> 401 and activates lockout
      const fifthRes = await fetch(`${baseUrl}/api/v1/shares/${share.token}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong_5' }),
      });
      assert.strictEqual(fifthRes.status, 401);

      // 6th attempt (even with CORRECT password) -> 429 RATE_LIMIT_EXCEEDED
      const lockedRes = await fetch(`${baseUrl}/api/v1/shares/${share.token}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'ValidPassword123' }),
      });
      assert.strictEqual(lockedRes.status, 429);
      const lockedJson = await lockedRes.json();
      assert.strictEqual(lockedJson.error.code, 'RATE_LIMIT_EXCEEDED');
    });
  });
});

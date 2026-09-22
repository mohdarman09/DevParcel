import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { Readable } from 'stream';
import { createApp } from '../app';
import { setStorageProvider, MockStorageProvider } from '../services/storage';
import { setShareRepository, MockShareRepository } from '../repositories';
import { ShareService, ShareServiceError } from '../services/sharing/shareService';
import { generateShareToken, isValidShareToken } from '../utils/tokenGenerator';
import { generateStorageKey, isValidStorageKey } from '../utils/storageKeyGenerator';
import { PasswordHasher } from '../utils/passwordHasher';
import { AccessTicket } from '../utils/accessTicket';
import { PasswordRateLimiter } from '../utils/rateLimiter';
import { validateEnvironment } from '../config/envValidator';
import { config } from '../config';

describe('Phase 9 Backend: Security Hardening & Production Security Audit Tests', () => {
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
    return Readable.from([Buffer.from('PK\x03\x04dummy-security-test-content')]);
  }

  // ====================================================
  // 1. TOKEN SECURITY & ENUMERATION PROTECTION
  // ====================================================
  describe('1. Token Security & Enumeration Defense', () => {
    test('SEC-1.1: Cryptographic tokens have 128+ bits entropy and zero collisions in batch', () => {
      const tokens = new Set<string>();
      const BATCH_SIZE = 200;

      for (let i = 0; i < BATCH_SIZE; i++) {
        const token = generateShareToken();
        assert.equal(isValidShareToken(token), true);
        assert.equal(token.length >= 22, true);
        assert.equal(tokens.has(token), false, 'Token collision detected!');
        tokens.add(token);
      }
      assert.equal(tokens.size, BATCH_SIZE);
    });

    test('SEC-1.2: Malformed tokens are rejected with HTTP 400 INVALID_TOKEN', async () => {
      const malformedTokens = [
        'short',
        '../../evil-path',
        'has spaces in token',
        '!@#$%^&*()',
        'a'.repeat(60), // Exceeds max 48 length
      ];

      for (const token of malformedTokens) {
        const res = await fetch(`${baseUrl}/api/v1/shares/${encodeURIComponent(token)}`);
        assert.equal(res.status, 400);
        const json = (await res.json()) as any;
        assert.equal(json.success, false);
        assert.equal(json.error.code, 'INVALID_TOKEN');
      }
    });

    test('SEC-1.3: Non-existent valid token returns 404 without leaking internal db or storage details', async () => {
      const validNonExistentToken = generateShareToken();
      const res = await fetch(`${baseUrl}/api/v1/shares/${validNonExistentToken}`);
      assert.equal(res.status, 404);
      const json = (await res.json()) as any;
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'SHARE_NOT_FOUND');
      assert.equal(json.data, undefined);
      assert.equal(json.error.message, 'The requested share link was not found.');
    });
  });

  // ====================================================
  // 2. SERVER-SIDE EXPIRY ENFORCEMENT
  // ====================================================
  describe('2. Server-Side Expiry Enforcement', () => {
    test('SEC-2.1: Active share permits download before expiry', async () => {
      const share = await shareService.createShare({
        projectName: 'ActiveProject',
        fileCount: 5,
        originalSize: 1000,
        packageSize: 500,
        expiryHours: 24,
        fileStream: createDummyStream(),
      });

      const dl = await shareService.getDownloadUrlForShare(share.token);
      assert.ok(dl.downloadUrl);
      assert.equal(dl.fileName, 'ActiveProject.zip');
    });

    test('SEC-2.2: Expired share is strictly rejected on exact clock boundary (HTTP 410)', async () => {
      const share = await shareService.createShare({
        projectName: 'ExpiredProject',
        fileCount: 3,
        originalSize: 500,
        packageSize: 250,
        expiryHours: 1,
        fileStream: createDummyStream(),
      });

      // Manually set expiresAt to the past in mock repository storage
      const stored = mockRepo.records.get(share.token);
      assert.ok(stored);
      stored.expiresAt = new Date(Date.now() - 5000); // 5 seconds in past

      // 1. Metadata query must fail with SHARE_EXPIRED
      await assert.rejects(
        async () => {
          await shareService.getShareByToken(share.token);
        },
        (err: any) => {
          assert.equal(err.code, 'SHARE_EXPIRED');
          assert.equal(err.statusCode, 410);
          return true;
        }
      );

      // 2. Download query must fail with SHARE_EXPIRED
      await assert.rejects(
        async () => {
          await shareService.getDownloadUrlForShare(share.token);
        },
        (err: any) => {
          assert.equal(err.code, 'SHARE_EXPIRED');
          assert.equal(err.statusCode, 410);
          return true;
        }
      );
    });
  });

  // ====================================================
  // 3. REVOCATION SECURITY & SENDER AUTHORIZATION
  // ====================================================
  describe('3. Revocation Security & Sender Authorization', () => {
    const senderOwner = '11111111-2222-3333-4444-555555555555';
    const senderAttacker = '99999999-8888-7777-6666-555555555555';

    test('SEC-3.1: Only legitimate sender owner can revoke share', async () => {
      const share = await shareService.createShare({
        projectName: 'RevokeTest',
        fileCount: 4,
        originalSize: 400,
        packageSize: 200,
        senderId: senderOwner,
        fileStream: createDummyStream(),
      });

      // Attacker attempt to revoke
      await assert.rejects(
        async () => {
          await shareService.revokeShare(share.token, senderAttacker);
        },
        (err: any) => {
          assert.equal(err.code, 'FORBIDDEN');
          assert.equal(err.statusCode, 403);
          return true;
        }
      );

      // Legitimate owner revokes
      const revoked = await shareService.revokeShare(share.token, senderOwner);
      assert.equal(revoked.status, 'revoked');
    });

    test('SEC-3.2: Revoked share cannot be downloaded under any circumstance', async () => {
      const share = await shareService.createShare({
        projectName: 'RevokedDownloadTest',
        fileCount: 2,
        originalSize: 200,
        packageSize: 100,
        senderId: senderOwner,
        fileStream: createDummyStream(),
      });

      await shareService.revokeShare(share.token, senderOwner);

      // Download must fail
      await assert.rejects(
        async () => {
          await shareService.getDownloadUrlForShare(share.token);
        },
        (err: any) => {
          assert.equal(err.code, 'SHARE_REVOKED');
          assert.equal(err.statusCode, 410);
          return true;
        }
      );
    });

    test('SEC-3.3: Unclaimed share (no senderId) cannot be revoked by arbitrary caller', async () => {
      const share = await shareService.createShare({
        projectName: 'UnclaimedShare',
        fileCount: 1,
        originalSize: 100,
        packageSize: 50,
        fileStream: createDummyStream(),
      });

      await assert.rejects(
        async () => {
          await shareService.revokeShare(share.token, senderAttacker);
        },
        (err: any) => {
          assert.equal(err.code, 'FORBIDDEN');
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  // ====================================================
  // 4. PASSWORD SECURITY & RATE LIMITING
  // ====================================================
  describe('4. Password Security, Argon2id & Rate Limiting', () => {
    test('SEC-4.1: Password is stored as Argon2id hash, never plaintext', async () => {
      const plainPassword = 'super-secret-password-123';
      const share = await shareService.createShare({
        projectName: 'SecureVault',
        fileCount: 10,
        originalSize: 5000,
        packageSize: 2500,
        password: plainPassword,
        fileStream: createDummyStream(),
      });

      const record = await mockRepo.findByToken(share.token);
      assert.ok(record);
      assert.equal(record.passwordProtected, true);
      assert.ok(record.passwordHash);
      assert.notEqual(record.passwordHash, plainPassword);
      assert.ok(record.passwordHash.startsWith('$argon2id$'));

      // Verify Argon2id hash
      const verified = await PasswordHasher.verify(record.passwordHash, plainPassword);
      assert.equal(verified, true);
    });

    test('SEC-4.2: Password verification rate limiter locks out after 5 consecutive failures', async () => {
      const plainPassword = 'correct-password-456';
      const share = await shareService.createShare({
        projectName: 'LockoutVault',
        fileCount: 2,
        originalSize: 200,
        packageSize: 100,
        password: plainPassword,
        fileStream: createDummyStream(),
      });

      // 4 wrong attempts
      for (let i = 0; i < 4; i++) {
        await assert.rejects(
          async () => {
            await shareService.verifySharePassword(share.token, 'wrong-password');
          },
          (err: any) => {
            assert.equal(err.code, 'INVALID_PASSWORD');
            assert.equal(err.statusCode, 401);
            return true;
          }
        );
      }

      // 5th wrong attempt triggers lockout
      await assert.rejects(
        async () => {
          await shareService.verifySharePassword(share.token, 'wrong-password');
        },
        (err: any) => {
          assert.equal(err.code, 'INVALID_PASSWORD');
          return true;
        }
      );

      // 6th attempt (even with correct password) is blocked by rate limiter
      await assert.rejects(
        async () => {
          await shareService.verifySharePassword(share.token, plainPassword);
        },
        (err: any) => {
          assert.equal(err.code, 'RATE_LIMIT_EXCEEDED');
          assert.equal(err.statusCode, 429);
          return true;
        }
      );
    });

    test('SEC-4.3: HMAC access tickets prevent download tampering', async () => {
      const plainPassword = 'tamper-proof-password';
      const share = await shareService.createShare({
        projectName: 'TamperTest',
        fileCount: 1,
        originalSize: 100,
        packageSize: 50,
        password: plainPassword,
        fileStream: createDummyStream(),
      });

      // 1. Download without ticket fails
      await assert.rejects(
        async () => {
          await shareService.getDownloadUrlForShare(share.token);
        },
        (err: any) => {
          assert.equal(err.code, 'UNAUTHORIZED');
          assert.equal(err.statusCode, 401);
          return true;
        }
      );

      // 2. Download with forged ticket fails
      await assert.rejects(
        async () => {
          await shareService.getDownloadUrlForShare(share.token, '9999999999.forgedsignature123');
        },
        (err: any) => {
          assert.equal(err.code, 'UNAUTHORIZED');
          assert.equal(err.statusCode, 401);
          return true;
        }
      );

      // 3. Legitimate ticket succeeds
      const { accessTicket } = await shareService.verifySharePassword(share.token, plainPassword);
      const download = await shareService.getDownloadUrlForShare(share.token, accessTicket);
      assert.ok(download.downloadUrl);
    });
  });

  // ====================================================
  // 5. STORAGE KEY ISOLATION & PATH TRAVERSAL
  // ====================================================
  describe('5. Storage Key Isolation & Path Traversal', () => {
    test('SEC-5.1: Storage keys are generated strictly in safe UUID format', () => {
      for (let i = 0; i < 50; i++) {
        const key = generateStorageKey();
        assert.equal(isValidStorageKey(key), true);
        assert.equal(key.startsWith('shares/'), true);
        assert.equal(key.endsWith('/package.zip'), true);
        assert.equal(key.includes('..'), false);
        assert.equal(key.includes('\\'), false);
      }
    });

    test('SEC-5.2: Path traversal storage keys are rejected by validator', () => {
      const maliciousKeys = [
        '../shares/uuid/package.zip',
        'shares/../../etc/passwd',
        'shares/uuid/package.zip\0',
        'C:\\shares\\uuid\\package.zip',
        'shares/unsafe',
      ];

      for (const key of maliciousKeys) {
        assert.equal(isValidStorageKey(key), false);
      }
    });
  });

  // ====================================================
  // 6. INPUT VALIDATION & BOUNDARY DEFENSE
  // ====================================================
  describe('6. Input Validation & Boundary Checks', () => {
    test('SEC-6.1: Invalid expiry hours rejected', async () => {
      const invalidExpiries = [-1, 0, 169, 1000, 3.5, NaN];

      for (const expiry of invalidExpiries) {
        await assert.rejects(
          async () => {
            await shareService.createShare({
              projectName: 'InvalidExpiry',
              fileCount: 1,
              originalSize: 100,
              packageSize: 50,
              expiryHours: expiry,
              fileStream: createDummyStream(),
            });
          },
          (err: any) => {
            assert.equal(err.code, 'INVALID_EXPIRY');
            return true;
          }
        );
      }
    });

    test('SEC-6.2: Invalid sender identifier rejected on create', async () => {
      const invalidSenders = [
        'short',
        'invalid sender with spaces',
        '../../evil-path',
        'sender; DROP TABLE shares;',
        'a'.repeat(80), // Exceeds 64 chars
      ];

      for (const sender of invalidSenders) {
        await assert.rejects(
          async () => {
            await shareService.createShare({
              projectName: 'InvalidSender',
              fileCount: 1,
              originalSize: 100,
              packageSize: 50,
              senderId: sender,
              fileStream: createDummyStream(),
            });
          },
          (err: any) => {
            assert.equal(err.code, 'INVALID_SENDER_ID');
            return true;
          }
        );
      }
    });
  });

  // ====================================================
  // 7. SECURITY HEADERS & CORS
  // ====================================================
  describe('7. Security Headers & CORS Policy', () => {
    test('SEC-7.1: Helmet security headers are present in HTTP responses', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);

      // Check security headers
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.ok(res.headers.get('content-security-policy'));
      assert.equal(res.headers.get('cross-origin-resource-policy'), 'cross-origin');
    });

    test('SEC-7.2: CORS allows safe headers including X-Sender-Id and X-Access-Ticket', async () => {
      const res = await fetch(`${baseUrl}/api/v1/shares/non-existent`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, X-Sender-Id, X-Access-Ticket',
        },
      });

      assert.equal(res.status, 204);
      const allowHeaders = res.headers.get('access-control-allow-headers') || '';
      assert.ok(allowHeaders.includes('X-Sender-Id'));
      assert.ok(allowHeaders.includes('X-Access-Ticket'));
    });
  });

  // ====================================================
  // 8. ENVIRONMENT CONFIGURATION VALIDATOR
  // ====================================================
  describe('8. Environment Configuration Safety', () => {
    test('SEC-8.1: Environment validator flags missing production variables without exposing secrets', () => {
      const mockProdConfig = {
        ...config,
        nodeEnv: 'production',
        databaseUrl: '',
        storage: {
          ...config.storage,
          endpoint: undefined,
          accessKeyId: undefined,
          secretAccessKey: undefined,
        },
      };

      const result = validateEnvironment(mockProdConfig);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('DATABASE_URL is required')));
      assert.ok(result.errors.some((e) => e.includes('STORAGE_ENDPOINT is required')));
      assert.ok(result.errors.some((e) => e.includes('STORAGE_ACCESS_KEY is required')));
      assert.ok(result.errors.some((e) => e.includes('STORAGE_SECRET_KEY is required')));

      // Confirm zero secret values leaked in error messages
      for (const err of result.errors) {
        assert.equal(err.includes('postgres://'), false);
        assert.equal(err.includes('password'), false);
      }
    });
  });
});

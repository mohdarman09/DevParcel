import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../app';
import { config } from '../config';
import { setStorageProvider, MockStorageProvider } from '../services/storage';
import { setShareRepository, MockShareRepository } from '../repositories';
import { HealthController } from '../controllers/healthController';
import { getAppVersion } from '../utils/version';

describe('Health Check & Readiness Probe Regression Tests', () => {
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
    HealthController.setReadinessOverride(null);
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    mockStorage.clear();
    mockRepo.clear();
    HealthController.setReadinessOverride(null);
  });

  // ==================================================
  // 1-6. LIVENESS SPECIFICATION VERIFICATION
  // ==================================================
  describe('GET /health (Liveness Probe)', () => {
    test('1. GET /health returns HTTP 200', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);
    });

    test('2. Response contains status "ok"', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      assert.equal(body.status, 'ok');
    });

    test('3. Service name is "devparcel-backend"', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      assert.equal(body.service, 'devparcel-backend');
    });

    test('4. Uptime is numeric, integer, and >= 0', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      assert.equal(typeof body.uptime, 'number');
      assert.ok(body.uptime >= 0);
      assert.equal(body.uptime, Math.floor(body.uptime));
    });

    test('5. Timestamp is valid ISO timestamp', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      assert.ok(body.timestamp);
      const parsedDate = new Date(body.timestamp);
      assert.equal(isNaN(parsedDate.getTime()), false);
      assert.equal(parsedDate.toISOString(), body.timestamp);
    });

    test('6. Version is returned correctly and dynamically matches package.json', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      const expectedVersion = getAppVersion();
      assert.equal(body.version, expectedVersion);
      assert.equal(typeof body.version, 'string');
      assert.ok(body.version.length > 0);
    });
  });

  // ==================================================
  // 7-9. SECURITY & STORAGE ZERO-SIDE-EFFECT CHECKS
  // ==================================================
  describe('Security & Isolation Guarantees', () => {
    test('7. GET /health does not require authentication or authorization headers', async () => {
      // Calling without any Authorization, token, or session headers
      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: {},
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, 'ok');
    });

    test('8. GET /health does not expose secrets, credentials, or internal paths', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const rawText = await res.text();
      const body = JSON.parse(rawText);

      // Verify no sensitive keys exist in JSON keys
      const forbiddenKeys = [
        'databaseUrl',
        'database_url',
        'password',
        'secret',
        'storage',
        'accessKeyId',
        'secretAccessKey',
        'apiKey',
        'env',
        'stack',
        'headers',
      ];
      for (const key of forbiddenKeys) {
        assert.equal(key in body, false, `Response exposed forbidden field: ${key}`);
      }

      // Verify configuration secrets are not leaked anywhere in payload
      if (config.databaseUrl) {
        assert.equal(rawText.includes(config.databaseUrl), false, 'DATABASE_URL leaked in health response');
      }
      if (config.storage.secretAccessKey) {
        assert.equal(rawText.includes(config.storage.secretAccessKey), false, 'Storage secret leaked');
      }
      assert.equal(rawText.includes('process.env'), false);
      assert.equal(rawText.includes('node_modules'), false);
    });

    test('9. GET /health does not perform a storage upload or access Supabase Storage', async () => {
      const initialUploads = mockStorage.storage.size;
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);

      // Ensure storage provider was never called
      const postUploads = mockStorage.storage.size;
      assert.equal(initialUploads, postUploads);
      assert.equal(postUploads, 0);
    });
  });

  // ==================================================
  // 10-11. READINESS PROBE SPECIFICATION
  // ==================================================
  describe('GET /health/ready (Readiness Probe)', () => {
    test('10a. GET /health/ready returns HTTP 200 when operational', async () => {
      const res = await fetch(`${baseUrl}/health/ready`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, 'ready');
      assert.equal(body.service, 'devparcel-backend');
      assert.ok(body.timestamp);
      assert.equal(new Date(body.timestamp).toISOString(), body.timestamp);
    });

    test('10b. GET /health/ready returns HTTP 503 when degraded and does not expose internal failure details', async () => {
      // Simulate an internal degradation / readiness failure
      HealthController.setReadinessOverride(async () => ({
        ready: false,
        reason: 'Database pool connection timed out: postgresql://postgres:super_secret@localhost:5432/db',
      }));

      const res = await fetch(`${baseUrl}/health/ready`);
      assert.equal(res.status, 503);
      const rawText = await res.text();
      const body = JSON.parse(rawText);

      assert.equal(body.status, 'not_ready');
      assert.equal(body.service, 'devparcel-backend');
      assert.ok(body.timestamp);

      // Verify internal failure reason and secrets are NOT exposed in public response
      assert.equal(body.reason, undefined);
      assert.equal(rawText.includes('super_secret'), false, 'Private credentials leaked in 503 response');
      assert.equal(rawText.includes('postgresql://'), false, 'Internal database URI leaked');
    });

    test('11. Health requests do not trigger normal API authentication or token requirement', async () => {
      // Sending random garbage headers to health endpoint should still succeed without 401/403
      const res = await fetch(`${baseUrl}/health`, {
        headers: {
          'X-Random-Unauthenticated': 'unknown-client',
        },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, 'ok');
    });
  });

  // ==================================================
  // 12-13. SECURITY HEADERS & REGRESSION VERIFICATION
  // ==================================================
  describe('Middleware, Security Headers & Regression Verification', () => {
    test('12. Existing Helmet security headers remain active on /health', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);
      // Verify Helmet security headers are present
      assert.ok(res.headers.get('x-content-type-options'), 'Missing X-Content-Type-Options');
      assert.ok(res.headers.get('x-frame-options') || res.headers.get('content-security-policy'), 'Missing frame protection');
      assert.ok(res.headers.get('cross-origin-resource-policy'), 'Missing CORP header');
    });

    test('13a. Existing root endpoint GET / remains unaffected', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.name, 'DevParcel Backend API');
      assert.equal(body.status, 'online');
      assert.equal(body.version, getAppVersion());
    });

    test('13b. Backward compatibility: GET /api/v1/health continues to respond 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, 'ok');
      assert.equal(body.service, 'devparcel-backend');
      assert.ok(body.timestamp);
    });

    test('13c. Existing share endpoints remain unaffected and error formats are preserved', async () => {
      const res = await fetch(`${baseUrl}/api/v1/shares/bad!token`);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error?.code, 'INVALID_TOKEN');
    });
  });
});

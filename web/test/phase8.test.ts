import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fetchShareMetadata, verifySharePassword, requestDownloadUrl, ShareApiError } from '../src/services/shareApi';
import { siteConfig } from '../src/config/siteConfig';

describe('Phase 8 — Recipient Web App Features', () => {
  let server: http.Server;
  let serverPort: number;
  let originalBaseUrl: string;

  before(async () => {
    originalBaseUrl = siteConfig.apiBaseUrl;

    server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${serverPort}`);

      // 1. Password Protected Share Metadata
      if (req.method === 'GET' && url.pathname === '/api/v1/shares/protected-token-123') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: {
              token: 'protected-token-123',
              publicUrl: 'http://localhost:5173/share/protected-token-123',
              projectName: 'VaultApp',
              fileCount: 14,
              originalSize: 85000,
              packageSize: 32000,
              excludedCount: 2,
              sensitiveFileCount: 0,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
              downloadCount: 0,
              status: 'active',
              isPasswordProtected: true,
            },
          })
        );
        return;
      }

      // 2. Password Verification endpoint
      if (req.method === 'POST' && url.pathname === '/api/v1/shares/protected-token-123/verify-password') {
        let bodyStr = '';
        req.on('data', (c) => (bodyStr += c));
        req.on('end', () => {
          const body = JSON.parse(bodyStr || '{}');
          if (body.password === 'secret123') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                data: {
                  verified: true,
                  accessTicket: 'valid-ticket-xyz-789',
                  metadata: {
                    token: 'protected-token-123',
                    projectName: 'VaultApp',
                    fileCount: 14,
                    originalSize: 85000,
                    packageSize: 32000,
                    excludedCount: 2,
                    sensitiveFileCount: 0,
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
                    downloadCount: 0,
                    status: 'active',
                    isPasswordProtected: true,
                  },
                },
              })
            );
          } else if (body.password === 'trigger-429') {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                error: {
                  code: 'TOO_MANY_ATTEMPTS',
                  message: 'Too many incorrect attempts. Please wait 15 minutes before trying again.',
                },
              })
            );
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                error: {
                  code: 'INVALID_PASSWORD',
                  message: 'Incorrect password.',
                },
              })
            );
          }
        });
        return;
      }

      // 3. Download with access ticket
      if (req.method === 'GET' && url.pathname === '/api/v1/shares/protected-token-123/download') {
        const ticketQuery = url.searchParams.get('ticket');
        const ticketHeader = req.headers['x-access-ticket'];

        if (ticketQuery === 'valid-ticket-xyz-789' || ticketHeader === 'valid-ticket-xyz-789') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              data: {
                downloadUrl: 'https://storage.supabase.co/object/sign/shares/vault.zip?token=xyz',
                fileName: 'VaultApp.zip',
              },
            })
          );
        } else {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: {
                code: 'PASSWORD_REQUIRED',
                message: 'This share requires a valid password access ticket to download.',
              },
            })
          );
        }
        return;
      }

      // 4. Revoked Share
      if (req.method === 'GET' && url.pathname === '/api/v1/shares/revoked-share-456') {
        res.writeHead(410, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            error: {
              code: 'SHARE_REVOKED',
              message: 'This download link has been revoked.',
            },
          })
        );
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    serverPort = (server.address() as any).port;
    siteConfig.apiBaseUrl = `http://localhost:${serverPort}`;
  });

  after(async () => {
    siteConfig.apiBaseUrl = originalBaseUrl;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('TEST 1: fetchShareMetadata parses isPasswordProtected flag correctly', async () => {
    const meta = await fetchShareMetadata('protected-token-123');
    assert.equal(meta.token, 'protected-token-123');
    assert.equal(meta.projectName, 'VaultApp');
    assert.equal(meta.isPasswordProtected, true);
  });

  test('TEST 2: verifySharePassword succeeds with correct password and returns access ticket', async () => {
    const result = await verifySharePassword('protected-token-123', 'secret123');
    assert.equal(result.verified, true);
    assert.equal(result.accessTicket, 'valid-ticket-xyz-789');
    assert.equal(result.metadata.projectName, 'VaultApp');
  });

  test('TEST 3: verifySharePassword throws user-friendly error on incorrect password (401)', async () => {
    await assert.rejects(
      async () => {
        await verifySharePassword('protected-token-123', 'wrong-pass');
      },
      (err: any) => {
        assert.ok(err instanceof ShareApiError);
        assert.equal(err.pageStatus, 'password_required');
        assert.equal(err.userFriendlyMessage, 'Incorrect password.');
        return true;
      }
    );
  });

  test('TEST 4: verifySharePassword handles brute force lockout (429)', async () => {
    await assert.rejects(
      async () => {
        await verifySharePassword('protected-token-123', 'trigger-429');
      },
      (err: any) => {
        assert.ok(err instanceof ShareApiError);
        assert.equal(err.statusCode, 429);
        assert.ok(err.userFriendlyMessage.includes('Too many incorrect attempts'));
        return true;
      }
    );
  });

  test('TEST 5: requestDownloadUrl authorizes download when valid access ticket is supplied', async () => {
    const res = await requestDownloadUrl('protected-token-123', 'valid-ticket-xyz-789');
    assert.equal(res.fileName, 'VaultApp.zip');
    assert.ok(res.downloadUrl.includes('VaultApp.zip') || res.downloadUrl.includes('vault.zip'));
  });

  test('TEST 6: requestDownloadUrl throws error when access ticket is omitted for protected share', async () => {
    await assert.rejects(
      async () => {
        await requestDownloadUrl('protected-token-123', null);
      },
      (err: any) => {
        assert.ok(err instanceof ShareApiError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  test('TEST 7: fetchShareMetadata maps revoked status correctly to revoked page status', async () => {
    await assert.rejects(
      async () => {
        await fetchShareMetadata('revoked-share-456');
      },
      (err: any) => {
        assert.ok(err instanceof ShareApiError);
        assert.equal(err.pageStatus, 'revoked');
        assert.equal(err.code, 'SHARE_REVOKED');
        return true;
      }
    );
  });
});

import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { siteConfig } from '../src/config/siteConfig';
import { fetchShareMetadata, verifySharePassword, requestDownloadUrl, ShareApiError } from '../src/services/shareApi';

describe('Phase 9 Web: Security Hardening & Regression Tests', () => {
  let mockServer: http.Server;
  let mockPort: number;

  before(async () => {
    mockServer = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);

      if (req.method === 'GET' && url.pathname === '/api/v1/shares/protected-token-xyz') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: {
              token: 'protected-token-xyz',
              publicUrl: 'http://localhost:5173/share/protected-token-xyz',
              projectName: 'Protected Project',
              fileCount: 0,
              originalSize: 0,
              packageSize: 0,
              excludedCount: 0,
              sensitiveFileCount: 0,
              createdAt: '2026-03-20T12:00:00.000Z',
              expiresAt: '2026-03-21T12:00:00.000Z',
              downloadCount: 0,
              status: 'active',
              isPasswordProtected: true,
            },
          })
        );
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/v1/shares/protected-token-xyz/verify-password') {
        let bodyStr = '';
        req.on('data', (c) => (bodyStr += c));
        req.on('end', () => {
          const body = JSON.parse(bodyStr || '{}');
          if (body.password === 'valid-pass') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                data: {
                  share: {
                    token: 'protected-token-xyz',
                    projectName: 'SecretProject',
                    fileCount: 10,
                    packageSize: 1024,
                    status: 'active',
                    isPasswordProtected: true,
                  },
                  accessTicket: '1799999999.signedticket123',
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

      if (req.method === 'GET' && url.pathname === '/api/v1/shares/protected-token-xyz/download') {
        const ticket = req.headers['x-access-ticket'];
        if (ticket === '1799999999.signedticket123') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              data: {
                downloadUrl: 'https://storage.supabase.co/object/sign/shares/package.zip?token=signed',
                fileName: 'SecretProject.zip',
              },
            })
          );
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Password verification required.',
              },
            })
          );
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }));
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, () => {
        mockPort = (mockServer.address() as any).port;
        siteConfig.apiBaseUrl = `http://localhost:${mockPort}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  });

  // ====================================================
  // 1. SECRET HYGIENE IN FRONTEND
  // ====================================================
  describe('1. Secret Hygiene in Frontend Bundle', () => {
    test('SEC-WEB-1.1: siteConfig contains zero server credentials, database strings, or private keys', () => {
      const configStr = JSON.stringify(siteConfig);
      assert.equal(configStr.includes('postgres://'), false);
      assert.equal(configStr.includes('STORAGE_SECRET'), false);
      assert.equal(configStr.includes('accessKeyId'), false);
      assert.equal(configStr.includes('secretAccessKey'), false);
      assert.equal(configStr.includes('argon2'), false);
    });

    test('SEC-WEB-1.2: External URLs in siteConfig use HTTPS', () => {
      assert.ok(siteConfig.creator.linkedinUrl.startsWith('https://'));
      assert.ok(siteConfig.creator.portfolioUrl.startsWith('https://'));
    });
  });

  // ====================================================
  // 2. METADATA MASKING & DATA NORMALIZATION
  // ====================================================
  describe('2. Metadata Masking & Password Verification', () => {
    test('SEC-WEB-2.1: Protected project metadata masks internal name and sizes before password entry', async () => {
      const meta = await fetchShareMetadata('protected-token-xyz');
      assert.equal(meta.isPasswordProtected, true);
      assert.equal(meta.projectName, 'Protected Project');
      assert.equal(meta.fileCount, 0);
      assert.equal(meta.packageSize, 0);
    });

    test('SEC-WEB-2.2: Password verification returns uniform error on invalid password without leaking hints', async () => {
      await assert.rejects(
        async () => {
          await verifySharePassword('protected-token-xyz', 'wrong-guess');
        },
        (err: any) => {
          assert.equal(err instanceof ShareApiError, true);
          assert.equal(err.code, 'INVALID_PASSWORD');
          assert.equal(err.userFriendlyMessage, 'Incorrect password.');
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    });

    test('SEC-WEB-2.3: Correct password returns access ticket and authorizes download without putting password in URL', async () => {
      const auth = await verifySharePassword('protected-token-xyz', 'valid-pass');
      assert.ok(auth.accessTicket);
      assert.equal(auth.metadata.projectName, 'SecretProject');

      // Request download URL with ticket
      const download = await requestDownloadUrl('protected-token-xyz', auth.accessTicket);
      assert.ok(download.downloadUrl);
      assert.equal(download.fileName, 'SecretProject.zip');
      assert.equal(download.downloadUrl.includes('valid-pass'), false);
    });
  });
});

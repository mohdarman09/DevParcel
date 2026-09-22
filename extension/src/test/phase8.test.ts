// Install mock vscode module for testing extension commands, view provider, and configs
const Module = require('module');
const originalRequire = Module.prototype.require;

const mockVscode: any = {
  commands: {
    executeCommand: async (cmd: string, ...args: any[]) => {
      mockVscode.executedCommands.push({ cmd, args });
      return undefined;
    },
  },
  window: {
    showInformationMessage: async (msg: string, ...items: any[]) => {
      mockVscode.infoMessages.push({ msg, items });
      return items[0];
    },
    showWarningMessage: async (msg: string, ...items: any[]) => {
      mockVscode.warningMessages.push({ msg, items });
      return items[0];
    },
    showErrorMessage: async (msg: string, ...items: any[]) => {
      mockVscode.errorMessages.push({ msg, items });
      return items[0];
    },
    withProgress: async (_options: any, task: (progress: any, token: any) => Promise<any>) => {
      const progress = { report: () => {} };
      const token = { isCancellationRequested: false, onCancellationRequested: () => {} };
      return task(progress, token);
    },
  },
  workspace: {
    workspaceFolders: [] as any[],
    onDidChangeWorkspaceFolders: () => ({ dispose: () => {} }),
    getConfiguration: () => ({
      get: (key: string, defaultVal: any) => {
        if (key === 'devparcel.passwordProtectShares' || key === 'passwordProtectShares') {
          return mockVscode.configPasswordProtect ?? defaultVal;
        }
        if (key === 'devparcel.defaultLinkExpiryHours' || key === 'defaultLinkExpiryHours') {
          return mockVscode.configExpiryHours ?? defaultVal;
        }
        if (key === 'devparcel.defaultExclusions' || key === 'defaultExclusions') {
          return mockVscode.configExclusions ?? defaultVal;
        }
        if (key === 'devparcel.backendUrl' || key === 'backendUrl') {
          return mockVscode.configBackendUrl ?? defaultVal;
        }
        return defaultVal;
      },
    }),
  },
  env: {
    clipboard: {
      writeText: async (text: string) => {
        mockVscode.clipboardText = text;
      },
    },
    openExternal: async (uri: any) => {
      mockVscode.openedExternal = uri;
      return true;
    },
  },
  Uri: {
    parse: (url: string) => ({ toString: () => url, url }),
    file: (fPath: string) => ({ fsPath: fPath, path: fPath }),
  },
  ProgressLocation: {
    Notification: 15,
  },
  executedCommands: [] as Array<{ cmd: string; args: any[] }>,
  infoMessages: [] as Array<{ msg: string; items: any[] }>,
  warningMessages: [] as Array<{ msg: string; items: any[] }>,
  errorMessages: [] as Array<{ msg: string; items: any[] }>,
  clipboardText: '',
  openedExternal: null as any,
  configPasswordProtect: undefined as boolean | undefined,
  configExpiryHours: undefined as number | undefined,
  configExclusions: undefined as string[] | undefined,
  configBackendUrl: undefined as string | undefined,
};

Module.prototype.require = function (id: string) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};

import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import http from 'http';
import { SenderIdentityService } from '../services/SenderIdentityService';
import { DevParcelConfig } from '../config/configuration';
import { DevParcelViewProvider } from '../ui/devparcelViewProvider';
import { BackendClient, CreateSharePayload, UploadProgressInfo } from '../sharing/backendClient';

describe('Phase 8: Advanced Sharing & Project Management Features', () => {
  const tempDir = path.join(os.tmpdir(), `devparcel-p8-test-${Date.now()}`);

  before(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  after(() => {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  });

  describe('1. Sender Identity & Settings', () => {
    test('TEST 1: SenderIdentityService returns a valid UUID and remains consistent', () => {
      const mockStorage: Record<string, any> = {};
      const mockContext: any = {
        globalState: {
          get: (key: string) => mockStorage[key],
          update: (key: string, val: any) => {
            mockStorage[key] = val;
            return Promise.resolve();
          },
        },
      };

      const id1 = SenderIdentityService.getOrCreateSenderId(mockContext);
      assert.ok(typeof id1 === 'string' && id1.length > 20, 'Sender ID must be a valid non-empty string');

      const id2 = SenderIdentityService.getOrCreateSenderId(mockContext);
      assert.equal(id1, id2, 'Subsequent calls must return the same persisted sender ID');
    });

    test('TEST 2: DevParcelConfig.getPasswordProtectShares defaults to false', () => {
      mockVscode.configPasswordProtect = undefined;
      const val = DevParcelConfig.getPasswordProtectShares();
      assert.equal(typeof val, 'boolean');
      assert.equal(val, false, 'Password protection must be OFF by default');
    });
  });

  describe('2. Drag & Drop ZIP Validation', () => {
    test('TEST 3: validateZipFile accepts valid ZIP archive', () => {
      const provider = new DevParcelViewProvider({} as any);
      const validZipPath = path.join(tempDir, 'valid-project.zip');
      // Create a valid zip magic header PK\x03\x04 followed by minimal content
      const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
      fs.writeFileSync(validZipPath, zipHeader);

      const result = provider.validateZipFile(validZipPath);
      assert.equal(result.valid, true);
      assert.equal(result.fileName, 'valid-project.zip');
      assert.equal(result.sizeBytes, 8);
    });

    test('TEST 4: validateZipFile rejects non-existent file', () => {
      const provider = new DevParcelViewProvider({} as any);
      const missingPath = path.join(tempDir, 'missing-file.zip');
      const result = provider.validateZipFile(missingPath);
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('does not exist'));
    });

    test('TEST 5: validateZipFile rejects non-.zip extension', () => {
      const provider = new DevParcelViewProvider({} as any);
      const tarPath = path.join(tempDir, 'archive.tar.gz');
      fs.writeFileSync(tarPath, Buffer.from('not a zip'));
      const result = provider.validateZipFile(tarPath);
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('Only ZIP archives'));
    });

    test('TEST 6: validateZipFile rejects files with invalid magic header', () => {
      const provider = new DevParcelViewProvider({} as any);
      const fakeZipPath = path.join(tempDir, 'fake-archive.zip');
      fs.writeFileSync(fakeZipPath, Buffer.from('THIS IS JUST PLAIN TEXT NOT A ZIP'));
      const result = provider.validateZipFile(fakeZipPath);
      assert.equal(result.valid, false);
      assert.ok(result.error?.includes('Invalid ZIP format'));
    });
  });

  describe('3. Share History & Revoke BackendClient API', () => {
    let server: http.Server;
    let serverPort: number;

    before(async () => {
      server = http.createServer((req, res) => {
        const url = new URL(req.url || '', `http://localhost:${serverPort}`);

        // GET /api/v1/shares/history
        if (req.method === 'GET' && url.pathname === '/api/v1/shares/history') {
          const senderId = req.headers['x-sender-id'];
          if (senderId === 'sender-user-1') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                data: [
                  {
                    token: 'tok-history-1',
                    publicUrl: 'http://localhost:5173/share/tok-history-1',
                    projectName: 'Gup-Sup',
                    fileCount: 5,
                    originalSize: 1000,
                    packageSize: 400,
                    excludedCount: 1,
                    sensitiveFileCount: 0,
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
                    downloadCount: 3,
                    status: 'active',
                    isPasswordProtected: false,
                  },
                  {
                    token: 'tok-history-2',
                    publicUrl: 'http://localhost:5173/share/tok-history-2',
                    projectName: 'ChatVerse',
                    fileCount: 10,
                    originalSize: 5000,
                    packageSize: 2000,
                    excludedCount: 2,
                    sensitiveFileCount: 0,
                    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
                    expiresAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
                    downloadCount: 0,
                    status: 'revoked',
                    isPasswordProtected: true,
                  },
                ],
              })
            );
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: [] }));
          }
          return;
        }

        // POST /api/v1/shares/:token/revoke
        if (req.method === 'POST' && url.pathname.includes('/revoke')) {
          const senderId = req.headers['x-sender-id'];
          if (senderId !== 'sender-user-1') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You do not have permission to revoke this share.' },
              })
            );
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              data: {
                token: 'tok-history-1',
                status: 'revoked',
                projectName: 'Gup-Sup',
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
    });

    after(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    test('TEST 7: getShareHistory retrieves user shares and parses fields correctly', async () => {
      const history = await BackendClient.getShareHistory(`http://localhost:${serverPort}`, 'sender-user-1');
      assert.equal(history.length, 2);
      assert.equal(history[0].projectName, 'Gup-Sup');
      assert.equal(history[0].status, 'active');
      assert.equal(history[0].downloadCount, 3);
      assert.equal(history[1].projectName, 'ChatVerse');
      assert.equal(history[1].status, 'revoked');
      assert.equal(history[1].isPasswordProtected, true);
    });

    test('TEST 8: getShareHistory isolates history per senderId (no leakage)', async () => {
      const historyOther = await BackendClient.getShareHistory(`http://localhost:${serverPort}`, 'sender-user-other');
      assert.equal(historyOther.length, 0);
    });

    test('TEST 9: revokeShare revokes active share with sender authorization', async () => {
      const res = await BackendClient.revokeShare(`http://localhost:${serverPort}`, 'tok-history-1', 'sender-user-1');
      assert.equal(res.status, 'revoked');
      assert.equal(res.token, 'tok-history-1');
    });

    test('TEST 10: revokeShare rejects unauthorized sender', async () => {
      await assert.rejects(
        async () => {
          await BackendClient.revokeShare(`http://localhost:${serverPort}`, 'tok-history-1', 'imposter-sender');
        },
        (err: any) => {
          assert.ok(err.message.includes('permission') || err.message.includes('FORBIDDEN'));
          return true;
        }
      );
    });
  });

  describe('4. Upload Progress & Custom Expiry Integration', () => {
    let server: http.Server;
    let serverPort: number;

    before(async () => {
      server = http.createServer((req, res) => {
        const url = new URL(req.url || '', `http://localhost:${serverPort}`);

        if (req.method === 'POST' && url.pathname === '/api/v1/shares') {
          let chunks: Buffer[] = [];
          req.on('data', (c) => chunks.push(c));
          req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf-8');
            const hasCustomExpiry = raw.includes('name="expiryHours"\r\n\r\n6');
            const hasPassword = raw.includes('name="password"\r\n\r\nmypassword123');

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                data: {
                  token: 'tok-p8-upload',
                  publicUrl: 'http://localhost:5173/share/tok-p8-upload',
                  projectName: 'CustomExpiryApp',
                  fileCount: 3,
                  originalSize: 1200,
                  packageSize: 500,
                  excludedCount: 0,
                  sensitiveFileCount: 0,
                  createdAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
                  status: 'active',
                  isPasswordProtected: hasPassword,
                  customExpiryVerified: hasCustomExpiry,
                },
              })
            );
          });
          return;
        }

        res.writeHead(404);
        res.end();
      });

      await new Promise<void>((resolve) => server.listen(0, resolve));
      serverPort = (server.address() as any).port;
    });

    after(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    test('TEST 11: uploadShare invokes onProgress callback with real stages and metrics', async () => {
      const zipPath = path.join(tempDir, 'stream-test.zip');
      // Create a 10KB test buffer with zip magic header
      const buf = Buffer.alloc(10 * 1024, 0x58);
      buf[0] = 0x50; buf[1] = 0x4b; buf[2] = 0x03; buf[3] = 0x04;
      fs.writeFileSync(zipPath, buf);

      const progressStages: string[] = [];
      const payload: CreateSharePayload = {
        projectName: 'CustomExpiryApp',
        fileCount: 3,
        originalSize: 1200,
        packageSize: 10240,
        excludedCount: 0,
        sensitiveFileCount: 0,
        expiryHours: 6,
        password: 'mypassword123',
        senderId: 'sender-test',
      };

      const result = await BackendClient.uploadShare(
        `http://localhost:${serverPort}`,
        zipPath,
        payload,
        {
          onProgress: (p: UploadProgressInfo) => {
            progressStages.push(p.stage);
          },
        }
      );

      assert.ok(progressStages.includes('preparing'), 'Progress must include preparing stage');
      assert.ok(progressStages.includes('ready'), 'Progress must include ready stage');
      assert.equal(result.token, 'tok-p8-upload');
      assert.equal((result as any).isPasswordProtected, true);
      assert.equal((result as any).customExpiryVerified, true);
    });
  });
});

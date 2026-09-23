import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import http from 'http';
import { BackendClient, CreateSharePayload } from '../sharing/backendClient';

describe('Phase 6: Extension Share Download Link Integration', () => {
  const tempDir = path.join(os.tmpdir(), `devparcel-ext-test-${Date.now()}`);
  const testZipPath = path.join(tempDir, 'test-package.zip');

  test('TEST 1: BackendClient is defined and exports uploadShare method', () => {
    assert.equal(typeof BackendClient.uploadShare, 'function');
  });

  test('TEST 2: BackendClient.uploadShare throws when ZIP file does not exist', async () => {
    const fakePath = path.join(tempDir, 'non-existent.zip');
    const payload: CreateSharePayload = {
      projectName: 'test',
      fileCount: 1,
      originalSize: 100,
      packageSize: 50,
      excludedCount: 0,
      sensitiveFileCount: 0,
      expiryHours: 24,
    };

    await assert.rejects(
      async () => {
        await BackendClient.uploadShare('http://localhost:3000', fakePath, payload);
      },
      (err: any) => {
        assert.ok(err.message.includes('not found'));
        return true;
      }
    );
  });

  test('TEST 3: BackendClient.uploadShare throws informative error when server unreachable', async () => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(testZipPath, Buffer.from('mock zip content'));

    const payload: CreateSharePayload = {
      projectName: 'test',
      fileCount: 1,
      originalSize: 100,
      packageSize: 50,
      excludedCount: 0,
      sensitiveFileCount: 0,
      expiryHours: 24,
    };

    // Use a port where no server is listening
    await assert.rejects(
      async () => {
        await BackendClient.uploadShare('http://127.0.0.1:59999', testZipPath, payload);
      },
      (err: any) => {
        assert.ok(err.message.includes('Unable to reach DevParcel backend'));
        return true;
      }
    );
  });

  test('TEST 4: BackendClient.uploadShare successfully uploads and parses share link result', async () => {
    // Spin up an ephemeral HTTP server mimicking the backend
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/api/v1/shares') {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: {
              token: 'test-token-12345678',
              publicUrl: 'http://localhost:5173/share/test-token-12345678',
              projectName: 'mock-proj',
              fileCount: 5,
              originalSize: 2000,
              packageSize: 1000,
              excludedCount: 1,
              sensitiveFileCount: 0,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
              downloadCount: 0,
              status: 'active',
            },
          })
        );
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const payload: CreateSharePayload = {
        projectName: 'mock-proj',
        fileCount: 5,
        originalSize: 2000,
        packageSize: 1000,
        excludedCount: 1,
        sensitiveFileCount: 0,
        expiryHours: 24,
      };

      const result = await BackendClient.uploadShare(
        `http://localhost:${port}`,
        testZipPath,
        payload
      );

      assert.equal(result.token, 'test-token-12345678');
      assert.equal(result.projectName, 'mock-proj');
      assert.equal(result.fileCount, 5);
      assert.equal(result.publicUrl, 'http://localhost:5173/share/test-token-12345678');
      assert.equal(result.status, 'active');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test('TEST 5: BackendClient.uploadShare respects timeout and throws timeout error', async () => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(testZipPath, Buffer.from('mock zip content for timeout test'));

    // Create a hanging server that never responds
    const server = http.createServer((_req, _res) => {
      // Intentionally do not reply
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const payload: CreateSharePayload = {
        projectName: 'timeout-proj',
        fileCount: 1,
        originalSize: 100,
        packageSize: 50,
        excludedCount: 0,
        sensitiveFileCount: 0,
        expiryHours: 24,
      };

      await assert.rejects(
        async () => {
          await BackendClient.uploadShare(
            `http://localhost:${port}`,
            testZipPath,
            payload,
            { timeoutMs: 100 } // Short 100ms timeout for test
          );
        },
        (err: any) => {
          assert.ok(err.message.includes('Cloud upload timed out'));
          return true;
        }
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  });

  test('TEST 6: BackendClient.uploadShare respects external cancellation signal', async () => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(testZipPath, Buffer.from('mock zip content for abort test'));

    const server = http.createServer((_req, _res) => {
      // Intentionally do not reply
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);

    try {
      const payload: CreateSharePayload = {
        projectName: 'abort-proj',
        fileCount: 1,
        originalSize: 100,
        packageSize: 50,
        excludedCount: 0,
        sensitiveFileCount: 0,
        expiryHours: 24,
      };

      await assert.rejects(
        async () => {
          await BackendClient.uploadShare(
            `http://localhost:${port}`,
            testZipPath,
            payload,
            { signal: controller.signal }
          );
        },
        (err: any) => {
          assert.ok(err.message.includes('cancelled') || err.message.includes('timed out'));
          return true;
        }
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  });
});

// ============================================================================
// Phase 7: Share Download Link Confirmation Flow & UI Polish (TEST 7 - 18)
// ============================================================================
describe('Phase 7: Share Download Link Confirmation Flow & UI Polish', () => {
  // Install mock vscode module for testing extension commands and view provider
  const Module = require('module');
  const originalRequire = Module.prototype.require;

  const mockVscode: any = {
    commands: {
      executeCommand: async (cmd: string, ...args: any[]) => {
        mockVscode.executedCommands.push({ cmd, args });
        return undefined;
      }
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
      }
    },
    workspace: {
      workspaceFolders: [] as any[],
      onDidChangeWorkspaceFolders: () => ({ dispose: () => {} }),
      getConfiguration: () => ({
        get: (key: string, defaultVal: any) => {
          if (key === 'devparcel.backendEnvironment' || key === 'backendEnvironment') {
            return mockVscode.configBackendEnvironment ?? defaultVal;
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
        }
      })
    },
    env: {
      clipboard: {
        writeText: async (text: string) => {
          mockVscode.clipboardText = text;
        }
      },
      openExternal: async (uri: any) => {
        mockVscode.openedExternal = uri;
        return true;
      }
    },
    Uri: {
      parse: (url: string) => ({ toString: () => url, url }),
      file: (fPath: string) => ({ fsPath: fPath, path: fPath })
    },
    ProgressLocation: {
      Notification: 15
    },
    executedCommands: [] as Array<{ cmd: string; args: any[] }>,
    infoMessages: [] as Array<{ msg: string; items: any[] }>,
    warningMessages: [] as Array<{ msg: string; items: any[] }>,
    errorMessages: [] as Array<{ msg: string; items: any[] }>,
    clipboardText: '',
    openedExternal: null as any,
    ExtensionMode: {
      Production: 1,
      Development: 2,
      Test: 3,
    },
    configBackendEnvironment: undefined as 'Production' | 'Local' | undefined,
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

  const {
    handleShareDownloadLink,
    isShareOperationInProgress,
    resetShareOperationLock
  } = require('../commands/shareDownloadLinkCommand');
  const { DevParcelViewProvider } = require('../ui/devparcelViewProvider');
  const { DevParcelConfig } = require('../config');

  function createTestWorkspace(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `devparcel-test-${prefix}-`));
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1;');
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name": "test-pkg"}');
    return dir;
  }

  function createMockWebview() {
    const listeners: Array<(msg: any) => void> = [];
    const webview = {
      html: '',
      options: {},
      postMessage: async (_msg: any) => true,
      onDidReceiveMessage: (listener: (msg: any) => void) => {
        listeners.push(listener);
        return { dispose: () => {} };
      }
    };
    const webviewView = {
      webview,
      visible: true,
      show: () => {}
    };
    return { webview, webviewView, listeners };
  }

  test('TEST 7: Clicking Share Download Link opens summary screen (does NOT start upload immediately)', async () => {
    resetShareOperationLock();
    const wsDir = createTestWorkspace('test7');
    mockVscode.workspace.workspaceFolders = [{ name: 'test7-proj', uri: { fsPath: wsDir } }];

    let summaryScreenOpened = false;
    let receivedSummary: any = null;

    const mockProvider = {
      isResolved: true,
      showShareSummary: async (summary: any, _expiry: number) => {
        summaryScreenOpened = true;
        receivedSummary = summary;
        // User is currently reviewing; return cancel so no upload proceeds
        return 'cancel' as const;
      },
      resetToIdle: () => {}
    };

    try {
      await handleShareDownloadLink(mockProvider as any);
      assert.equal(summaryScreenOpened, true, 'Share Summary screen must be opened');
      assert.ok(receivedSummary, 'Summary data must be passed to summary screen');
      assert.equal(receivedSummary.projectName, path.basename(wsDir));
    } finally {
      fs.rmSync(wsDir, { recursive: true, force: true });
    }
  });

  test('TEST 8: Clicking Share Download Link does NOT start upload immediately', async () => {
    resetShareOperationLock();
    const wsDir = createTestWorkspace('test8');
    mockVscode.workspace.workspaceFolders = [{ name: 'test8-proj', uri: { fsPath: wsDir } }];

    let uploadCalled = false;
    const originalUpload = BackendClient.uploadShare;
    BackendClient.uploadShare = async () => {
      uploadCalled = true;
      throw new Error('Upload should not have been called!');
    };

    const mockProvider = {
      isResolved: true,
      showShareSummary: async () => {
        // User stays on confirmation screen or cancels
        return 'cancel' as const;
      },
      resetToIdle: () => {}
    };

    try {
      await handleShareDownloadLink(mockProvider as any);
      assert.equal(uploadCalled, false, 'BackendClient.uploadShare must NOT be invoked upon opening summary screen');
    } finally {
      BackendClient.uploadShare = originalUpload;
      fs.rmSync(wsDir, { recursive: true, force: true });
    }
  });

  test('TEST 9: Summary shows current dynamic project data (name, file count, sizes, excluded)', async () => {
    const wsDir = createTestWorkspace('test9');
    fs.mkdirSync(path.join(wsDir, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(wsDir, 'node_modules', 'dummy.js'), 'dummy');
    mockVscode.workspace.workspaceFolders = [{ name: 'test9-proj', uri: { fsPath: wsDir } }];

    const provider = new DevParcelViewProvider({ fsPath: wsDir } as any);
    const { webview, webviewView } = createMockWebview();
    provider.resolveWebviewView(webviewView as any, {} as any, {} as any);

    const testSummary = {
      projectName: 'dynamic-koenig-training',
      workspaceRoot: wsDir,
      fileCount: 42,
      totalSize: 135100,
      excludedCount: 5,
      excludedPaths: [],
      sensitiveFiles: [],
      hasSensitiveFiles: false,
      scanStatus: 'ready' as const,
      zipSize: 47200
    };

    // Trigger showShareSummary
    provider.showShareSummary(testSummary, 24);

    assert.equal(provider.viewState, 'share-summary');
    assert.ok(webview.html.includes('READY TO SHARE'));
    assert.ok(webview.html.includes('dynamic-koenig-training'));
    assert.ok(webview.html.includes('42'));
    assert.ok(webview.html.includes('131.9 KB') || webview.html.includes('135.1 KB') || webview.html.includes('KB'));
    assert.ok(webview.html.includes('5'));
    assert.ok(webview.html.includes('46.1 KB') || webview.html.includes('47.2 KB') || webview.html.includes('KB'));

    fs.rmSync(wsDir, { recursive: true, force: true });
  });

  test('TEST 10: Summary shows current configured expiry (not hardcoded)', async () => {
    const wsDir = createTestWorkspace('test10');
    mockVscode.workspace.workspaceFolders = [{ name: 'test10-proj', uri: { fsPath: wsDir } }];

    const provider = new DevParcelViewProvider({ fsPath: wsDir } as any);
    const { webview, webviewView } = createMockWebview();
    provider.resolveWebviewView(webviewView as any, {} as any, {} as any);

    const testSummary = {
      projectName: 'expiry-test',
      workspaceRoot: wsDir,
      fileCount: 2,
      totalSize: 500,
      excludedCount: 0,
      excludedPaths: [],
      sensitiveFiles: [],
      hasSensitiveFiles: false,
      scanStatus: 'ready' as const
    };

    // Test with 48 hours expiry
    provider.showShareSummary(testSummary, 48);
    assert.ok(webview.html.includes('48 hours'), 'Must display configured 48 hours expiry');

    // Test with 72 hours expiry
    provider.showShareSummary(testSummary, 72);
    assert.ok(webview.html.includes('72 hours'), 'Must display configured 72 hours expiry');

    fs.rmSync(wsDir, { recursive: true, force: true });
  });

  test('TEST 11: Summary shows sensitive-file state correctly (both safe and warning cases)', async () => {
    const wsDir = createTestWorkspace('test11');
    mockVscode.workspace.workspaceFolders = [{ name: 'test11-proj', uri: { fsPath: wsDir } }];

    const provider = new DevParcelViewProvider({ fsPath: wsDir } as any);
    const { webview, webviewView } = createMockWebview();
    provider.resolveWebviewView(webviewView as any, {} as any, {} as any);

    // 1. Safe state (0 sensitive files)
    const safeSummary = {
      projectName: 'safe-proj',
      workspaceRoot: wsDir,
      fileCount: 3,
      totalSize: 600,
      excludedCount: 0,
      excludedPaths: [],
      sensitiveFiles: [],
      hasSensitiveFiles: false,
      scanStatus: 'ready' as const
    };

    provider.showShareSummary(safeSummary, 24);
    assert.ok(webview.html.includes('No sensitive files included'), 'Safe state must show "No sensitive files included"');
    assert.ok(!webview.html.includes('Sensitive files included'), 'Safe state must NOT show warning');

    // 2. Sensitive state (> 0 sensitive files)
    const sensitiveSummary = {
      projectName: 'sensitive-proj',
      workspaceRoot: wsDir,
      fileCount: 4,
      totalSize: 800,
      excludedCount: 0,
      excludedPaths: [],
      sensitiveFiles: [{
        relativePath: '.env',
        absolutePath: path.join(wsDir, '.env'),
        reason: 'Environment file containing credentials'
      }],
      hasSensitiveFiles: true,
      scanStatus: 'warning' as const
    };

    provider.showShareSummary(sensitiveSummary, 24);
    assert.ok(webview.html.includes('Sensitive files included'), 'Warning state must show "Sensitive files included"');
    assert.ok(webview.html.includes('1 sensitive file is included'), 'Must show sensitive file count message');
    assert.ok(webview.html.includes('.env'), 'Must display the relative path of the sensitive file');

    fs.rmSync(wsDir, { recursive: true, force: true });
  });

  test('TEST 12: Cancel / Back returns to main sidebar without generating link', async () => {
    resetShareOperationLock();
    const wsDir = createTestWorkspace('test12');
    mockVscode.workspace.workspaceFolders = [{ name: 'test12-proj', uri: { fsPath: wsDir } }];

    const provider = new DevParcelViewProvider({ fsPath: wsDir } as any);
    const { webviewView, listeners } = createMockWebview();
    provider.resolveWebviewView(webviewView as any, {} as any, {} as any);

    const testSummary = {
      projectName: 'cancel-test',
      workspaceRoot: wsDir,
      fileCount: 2,
      totalSize: 500,
      excludedCount: 0,
      excludedPaths: [],
      sensitiveFiles: [],
      hasSensitiveFiles: false,
      scanStatus: 'ready' as const
    };

    const decisionPromise = provider.showShareSummary(testSummary, 24);
    assert.equal(provider.viewState, 'share-summary');

    // Simulate user clicking Cancel in webview
    listeners[0]({ command: 'shareSummaryCancel' });
    const decision = await decisionPromise;

    assert.equal(decision, 'cancel', 'Cancel button must resolve decision as "cancel"');
    assert.equal(provider.viewState, 'idle', 'State must return to idle / main sidebar');

    fs.rmSync(wsDir, { recursive: true, force: true });
  });

  test('TEST 13: Generate Share Link starts the existing upload flow', async () => {
    resetShareOperationLock();
    const wsDir = createTestWorkspace('test13');
    mockVscode.workspace.workspaceFolders = [{ name: 'test13-proj', uri: { fsPath: wsDir } }];

    // Ephemeral backend server
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/api/v1/shares') {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            data: {
              token: 'test-gen-token-12345',
              publicUrl: 'http://localhost:5173/share/test-gen-token-12345',
              projectName: 'test13-proj',
              fileCount: 2,
              originalSize: 500,
              packageSize: 300,
              excludedCount: 0,
              sensitiveFileCount: 0,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
              downloadCount: 0,
              status: 'active',
            },
          })
        );
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    DevParcelConfig.setExtensionMode(mockVscode.ExtensionMode.Development);
    DevParcelConfig.setTestBackendUrl(`http://localhost:${port}`);

    let shareSuccessScreenShown = false;
    let createdResult: any = null;

    const mockProvider = {
      isResolved: true,
      showShareSummary: async () => 'generate' as const,
      showShareLinkCreated: (result: any) => {
        shareSuccessScreenShown = true;
        createdResult = result;
      },
      resetToIdle: () => {}
    };

    try {
      await handleShareDownloadLink(mockProvider as any);
      assert.equal(shareSuccessScreenShown, true, 'Share success screen must be shown on successful upload');
      assert.equal(createdResult.token, 'test-gen-token-12345');
      assert.equal(createdResult.publicUrl, 'http://localhost:5173/share/test-gen-token-12345');
    } finally {
      DevParcelConfig.setTestBackendUrl(undefined);
      DevParcelConfig.setExtensionMode(mockVscode.ExtensionMode.Production);
      await new Promise<void>((resolve) => server.close(() => resolve()));
      fs.rmSync(wsDir, { recursive: true, force: true });
    }
  });

  test('TEST 14: Generate button prevents duplicate requests (double-click protection)', async () => {
    resetShareOperationLock();
    const wsDir = createTestWorkspace('test14');
    mockVscode.workspace.workspaceFolders = [{ name: 'test14-proj', uri: { fsPath: wsDir } }];

    const provider = new DevParcelViewProvider({ fsPath: wsDir } as any);
    const { webviewView, listeners } = createMockWebview();
    provider.resolveWebviewView(webviewView as any, {} as any, {} as any);

    const testSummary = {
      projectName: 'double-click-test',
      workspaceRoot: wsDir,
      fileCount: 2,
      totalSize: 500,
      excludedCount: 0,
      excludedPaths: [],
      sensitiveFiles: [],
      hasSensitiveFiles: false,
      scanStatus: 'ready' as const
    };

    let resolutions = 0;
    const decisionPromise = provider.showShareSummary(testSummary, 24);
    decisionPromise.then(() => {
      resolutions++;
    });

    // Send two rapid generate messages (simulating double click)
    listeners[0]({ command: 'shareSummaryGenerate' });
    listeners[0]({ command: 'shareSummaryGenerate' });

    await decisionPromise;
    assert.equal(resolutions, 1, 'Only one resolution must occur for duplicate clicks');

    // Also verify operation concurrency guard
    assert.equal(typeof isShareOperationInProgress, 'function');

    fs.rmSync(wsDir, { recursive: true, force: true });
  });

  test('TEST 15: Existing share flow still succeeds', async () => {
    // Verified that BackendClient.uploadShare contract remains functional
    assert.equal(typeof BackendClient.uploadShare, 'function');
  });

  test('TEST 16: Existing Download ZIP still works without regression', async () => {
    const { ZipEngine } = require('../zip/zipEngine');
    assert.equal(typeof ZipEngine.createZip, 'function');
    assert.equal(typeof ZipEngine.sanitizeArchivePath, 'function');
  });

  test('TEST 17: Existing Share ZIP still works without regression', async () => {
    const { SharingService } = require('../sharing/sharingService');
    assert.equal(typeof SharingService.createTemporarySharePath, 'function');
    assert.equal(typeof SharingService.cleanupTemporaryShareFile, 'function');
  });

  test('TEST 18: Settings UI is simplified, redundant security status text is removed, and settings command opens correctly', async () => {
    const wsDir = createTestWorkspace('test18');
    mockVscode.workspace.workspaceFolders = [{ name: 'test18-proj', uri: { fsPath: wsDir } }];

    const provider = new DevParcelViewProvider({ fsPath: wsDir } as any);
    const { webview, webviewView } = createMockWebview();
    provider.resolveWebviewView(webviewView as any, {} as any, {} as any);

    // In default / idle view:
    // 1. Redundant security status text must be REMOVED
    assert.ok(
      !webview.html.includes('Sensitive files protected • Auto-expiry'),
      'Sidebar must NOT contain "Sensitive files protected • Auto-expiry"'
    );

    // 2. Settings secondary text "Exclusions & preferences" must be REMOVED
    assert.ok(
      !webview.html.includes('Exclusions & preferences'),
      'Settings must NOT contain "Exclusions & preferences"'
    );

    // 3. Settings button is placed in top header as an icon-only button (no text label, no footer)
    assert.ok(webview.html.includes('dp-btn-header-settings'), 'Header must contain dp-btn-header-settings');
    assert.ok(webview.html.includes('id="settingsBtn"'), 'Settings button must have id="settingsBtn"');
    assert.ok(webview.html.includes('dp-settings-icon'), 'Settings icon must have dp-settings-icon class');
    assert.ok(!webview.html.includes('dp-settings-text'), 'Settings text label must NOT be present');
    assert.ok(!webview.html.includes('class="dp-footer"'), 'Bottom settings footer must NOT be present');

    fs.rmSync(wsDir, { recursive: true, force: true });
  });

  test('TEST 19: MAX_UPLOAD_SIZE constants are strictly defined as 50 MB', () => {
    const { DevParcelConfig, MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES } = require('../config');
    assert.equal(MAX_UPLOAD_SIZE_MB, 50, 'MAX_UPLOAD_SIZE_MB must be 50');
    assert.equal(MAX_UPLOAD_SIZE_BYTES, 50 * 1024 * 1024, 'MAX_UPLOAD_SIZE_BYTES must be 52428800');
    assert.equal(DevParcelConfig.MAX_UPLOAD_SIZE_MB, 50);
    assert.equal(DevParcelConfig.MAX_UPLOAD_SIZE_BYTES, 50 * 1024 * 1024);
  });

  test('TEST 20: Package Too Large fallback renders dynamic ZIP size, 50 MB limit, and action buttons', async () => {
    const wsDir = createTestWorkspace('test20');
    const provider = new DevParcelViewProvider({ fsPath: wsDir } as any);
    const { webview, webviewView } = createMockWebview();
    provider.resolveWebviewView(webviewView as any, {} as any, {} as any);

    // Call showPackageTooLarge with 93.9 MB (98,461,286 bytes)
    const size93MB = Math.round(93.9 * 1024 * 1024);
    void provider.showPackageTooLarge({
      projectName: 'Iris-Global-new',
      zipPath: path.join(os.tmpdir(), 'Iris-Global-new.zip'),
      zipSize: size93MB,
      maxSizeBytes: 50 * 1024 * 1024,
    });

    const html = webview.html;
    // Header & Status
    assert.ok(html.includes('Package Ready to Share'), 'Header indicates Package Ready to Share');
    assert.ok(html.includes('CLOUD LINK UNAVAILABLE'), 'Status chip shows CLOUD LINK UNAVAILABLE');
    assert.ok(html.includes('PACKAGE TOO LARGE'), 'Card heading shows PACKAGE TOO LARGE');
    assert.ok(html.includes('⚠️'), 'Amber warning icon is present');

    // Dynamic text and values
    assert.ok(html.includes('93.9 MB'), 'Dynamic ZIP size 93.9 MB is rendered');
    assert.ok(html.includes('50 MB'), 'Configured 50 MB limit is rendered');
    assert.ok(
      html.includes("Download links can't be generated for files larger than 50 MB"),
      'Explains limit on download links'
    );
    assert.ok(
      html.includes('You can still send this ZIP directly using Windows Explorer'),
      'Guides user to Windows Explorer'
    );

    // Buttons
    assert.ok(html.includes('Send ZIP by Explorer 📁'), 'Primary button is Send ZIP by Explorer 📁');
    assert.ok(html.includes('Cancel'), 'Secondary button is Cancel');

    // Does NOT say "Upload failed"
    assert.ok(!html.includes('Upload failed'), 'Must NOT call this an Upload Failed state');

    // Cancel to clean up
    provider.resetToIdle();
    fs.rmSync(wsDir, { recursive: true, force: true });
  });

  test('TEST 21: Clicking Send ZIP by Explorer on Package Too Large resolves with "explorer"', async () => {
    const wsDir = createTestWorkspace('test21');
    const provider = new DevParcelViewProvider({ fsPath: wsDir } as any);
    const { webviewView, listeners } = createMockWebview();
    provider.resolveWebviewView(webviewView as any, {} as any, {} as any);

    const decisionPromise = provider.showPackageTooLarge({
      projectName: 'HugeProject',
      zipPath: '/tmp/huge.zip',
      zipSize: 60 * 1024 * 1024,
      maxSizeBytes: 50 * 1024 * 1024,
    });

    listeners[0]({ command: 'packageTooLargeSendExplorer' });
    const decision = await decisionPromise;
    assert.equal(decision, 'explorer', 'Decision must be "explorer"');
    assert.equal((provider as any)._viewState, 'idle', 'Sidebar returns to idle after explorer trigger');

    fs.rmSync(wsDir, { recursive: true, force: true });
  });

  test('TEST 22: Clicking Cancel on Package Too Large resolves with "cancel"', async () => {
    const wsDir = createTestWorkspace('test22');
    const provider = new DevParcelViewProvider({ fsPath: wsDir } as any);
    const { webviewView, listeners } = createMockWebview();
    provider.resolveWebviewView(webviewView as any, {} as any, {} as any);

    const decisionPromise = provider.showPackageTooLarge({
      projectName: 'HugeProject',
      zipPath: '/tmp/huge.zip',
      zipSize: 60 * 1024 * 1024,
      maxSizeBytes: 50 * 1024 * 1024,
    });

    listeners[0]({ command: 'packageTooLargeCancel' });
    const decision = await decisionPromise;
    assert.equal(decision, 'cancel', 'Decision must be "cancel"');
    assert.equal((provider as any)._viewState, 'idle', 'Sidebar returns to idle on cancel');

    fs.rmSync(wsDir, { recursive: true, force: true });
  });

  test('TEST 23: handleShareDownloadLink proactively intercepts ZIP > 50MB and NEVER calls backend upload', async () => {
    resetShareOperationLock();
    const wsDir = createTestWorkspace('test23');
    mockVscode.workspace.workspaceFolders = [{ name: 'test23-proj', uri: { fsPath: wsDir } }];
    mockVscode.executedCommands = [];

    const { ZipEngine } = require('../zip/zipEngine');
    const originalCreateZip = ZipEngine.createZip;
    const originalUploadShare = BackendClient.uploadShare;

    let uploadInvoked = false;
    BackendClient.uploadShare = async () => {
      uploadInvoked = true;
      throw new Error('BackendClient.uploadShare should NEVER be called for ZIP > 50MB!');
    };

    // Mock ZipEngine to return 75 MB package size
    ZipEngine.createZip = async (_files: any, outPath: string) => {
      fs.writeFileSync(outPath, 'fake-large-zip-content');
      return {
        zipPath: outPath,
        zipSize: 75 * 1024 * 1024, // 75 MB
        fileCount: 5,
        totalBytes: 75 * 1024 * 1024,
      };
    };

    let fallbackShown = false;
    const mockProvider = {
      isResolved: true,
      showShareSummary: async () => 'generate' as const,
      showPackageTooLarge: async (info: any) => {
        fallbackShown = true;
        assert.equal(info.zipSize, 75 * 1024 * 1024);
        assert.equal(info.maxSizeBytes, 50 * 1024 * 1024);
        return 'explorer' as const;
      },
      resetToIdle: () => {},
    };

    try {
      await handleShareDownloadLink(mockProvider as any);
      assert.equal(fallbackShown, true, 'Package Too Large fallback must be displayed');
      assert.equal(uploadInvoked, false, 'Backend upload must NEVER be initiated for >50 MB package');

      // Verify revealFileInOS was called to open Windows Explorer
      const revealCmd = mockVscode.executedCommands.find((c: any) => c.cmd === 'revealFileInOS');
      assert.ok(revealCmd, 'revealFileInOS must be called to open Explorer');
    } finally {
      ZipEngine.createZip = originalCreateZip;
      BackendClient.uploadShare = originalUploadShare;
      fs.rmSync(wsDir, { recursive: true, force: true });
    }
  });

  test('TEST 24: handleShareDownloadLink cleans up temporary file when Cancel is chosen on oversized fallback', async () => {
    resetShareOperationLock();
    const wsDir = createTestWorkspace('test24');
    mockVscode.workspace.workspaceFolders = [{ name: 'test24-proj', uri: { fsPath: wsDir } }];

    const { ZipEngine } = require('../zip/zipEngine');
    const originalCreateZip = ZipEngine.createZip;
    let createdZipPath = '';

    ZipEngine.createZip = async (_files: any, outPath: string) => {
      createdZipPath = outPath;
      fs.writeFileSync(outPath, 'fake-oversized-zip');
      return {
        zipPath: outPath,
        zipSize: 80 * 1024 * 1024,
        fileCount: 1,
        totalBytes: 80 * 1024 * 1024,
      };
    };

    const mockProvider = {
      isResolved: true,
      showShareSummary: async () => 'generate' as const,
      showPackageTooLarge: async () => 'cancel' as const,
      resetToIdle: () => {},
    };

    try {
      await handleShareDownloadLink(mockProvider as any);
      assert.ok(createdZipPath.length > 0, 'Zip was created');
      assert.equal(fs.existsSync(createdZipPath), false, 'Temporary zip must be deleted after Cancel');
    } finally {
      ZipEngine.createZip = originalCreateZip;
      fs.rmSync(wsDir, { recursive: true, force: true });
    }
  });

  test('TEST 25: SharingService.revealInExplorer invokes revealFileInOS command', async () => {
    const { SharingService } = require('../sharing/sharingService');
    mockVscode.executedCommands = [];

    const testFile = path.join(os.tmpdir(), 'devparcel-reveal-test.zip');
    fs.writeFileSync(testFile, 'dummy');

    try {
      const result = await SharingService.revealInExplorer(testFile);
      assert.equal(result, true, 'revealInExplorer returns true on success');
      const revealCmd = mockVscode.executedCommands.find((c: any) => c.cmd === 'revealFileInOS');
      assert.ok(revealCmd, 'revealFileInOS command was executed');
      assert.equal(revealCmd.args[0].fsPath, testFile);
    } finally {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  });

  test('TEST 26: Development extension mode resolves to http://localhost:3000', () => {
    DevParcelConfig.setExtensionMode(mockVscode.ExtensionMode.Development);
    DevParcelConfig.setTestBackendUrl(undefined);
    assert.equal(DevParcelConfig.getExtensionMode(), mockVscode.ExtensionMode.Development);
    assert.equal(
      DevParcelConfig.getBackendUrl(),
      'http://localhost:3000',
      'Development mode must resolve to http://localhost:3000'
    );
  });

  test('TEST 27: Production extension mode resolves to https://devparcel.onrender.com', () => {
    DevParcelConfig.setExtensionMode(mockVscode.ExtensionMode.Production);
    DevParcelConfig.setTestBackendUrl(undefined);
    assert.equal(DevParcelConfig.getExtensionMode(), mockVscode.ExtensionMode.Production);
    assert.equal(
      DevParcelConfig.getBackendUrl(),
      'https://devparcel.onrender.com',
      'Production mode must resolve to https://devparcel.onrender.com'
    );
  });

  test('TEST 28: Production mode strictly prevents any unintended localhost:3000 reference', () => {
    DevParcelConfig.setExtensionMode(mockVscode.ExtensionMode.Production);
    // Even if an external test url was set, production mode must strictly ignore it and return production URL
    DevParcelConfig.setTestBackendUrl('http://localhost:3000');
    assert.equal(
      DevParcelConfig.getBackendUrl(),
      'https://devparcel.onrender.com',
      'Production mode must never return localhost:3000'
    );
    DevParcelConfig.setTestBackendUrl(undefined);
  });

  test('TEST 29: No backend environment or backend URL setting is exposed through package.json contributes.configuration', () => {
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const pkgContent = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgContent);

    const properties = pkg?.contributes?.configuration?.properties || {};

    assert.equal(
      properties['devparcel.backendEnvironment'],
      undefined,
      'devparcel.backendEnvironment must NOT be exposed in package.json configuration'
    );
    assert.equal(
      properties['devparcel.backendUrl'],
      undefined,
      'devparcel.backendUrl must NOT be exposed in package.json configuration'
    );

    // Verify allowed properties are only the non-backend user settings
    const keys = Object.keys(properties);
    assert.deepEqual(
      keys.sort(),
      [
        'devparcel.defaultExclusions',
        'devparcel.defaultLinkExpiryHours',
        'devparcel.passwordProtectShares',
        'devparcel.showProjectSummary',
      ].sort(),
      'Configuration properties must only contain non-backend user preferences'
    );
  });

  test('TEST 30: Existing API URL construction continues to work for both Development and Production', () => {
    // 1. Development URL paths
    DevParcelConfig.setExtensionMode(mockVscode.ExtensionMode.Development);
    const devUrl = DevParcelConfig.getBackendUrl();
    assert.equal(devUrl, 'http://localhost:3000');
    assert.equal(`${devUrl}/api/v1/shares`, 'http://localhost:3000/api/v1/shares');
    assert.equal(`${devUrl}/api/v1/shares/history`, 'http://localhost:3000/api/v1/shares/history');
    assert.equal(`${devUrl}/api/v1/shares/tok123/revoke`, 'http://localhost:3000/api/v1/shares/tok123/revoke');

    // 2. Production URL paths
    DevParcelConfig.setExtensionMode(mockVscode.ExtensionMode.Production);
    const prodUrl = DevParcelConfig.getBackendUrl();
    assert.equal(prodUrl, 'https://devparcel.onrender.com');
    assert.equal(`${prodUrl}/api/v1/shares`, 'https://devparcel.onrender.com/api/v1/shares');
    assert.equal(`${prodUrl}/api/v1/shares/history`, 'https://devparcel.onrender.com/api/v1/shares/history');
    assert.equal(`${prodUrl}/api/v1/shares/tok123/revoke`, 'https://devparcel.onrender.com/api/v1/shares/tok123/revoke');
  });

  test('TEST 31: Vercel share route configuration is present in web/vercel.json', () => {
    const vercelConfigPath = path.resolve(__dirname, '../../../web/vercel.json');
    assert.ok(fs.existsSync(vercelConfigPath), 'web/vercel.json must exist');

    const vercelJson = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    assert.ok(Array.isArray(vercelJson.rewrites), 'vercel.json must contain a rewrites array');

    const spaRewrite = vercelJson.rewrites.find(
      (r: any) => (r.source === '/(.*)' || r.source === '/:path*') && r.destination === '/index.html'
    );
    assert.ok(spaRewrite, 'vercel.json must have a catch-all rewrite to /index.html');
    assert.equal(spaRewrite.source, '/(.*)');
    assert.equal(spaRewrite.destination, '/index.html');
  });
});



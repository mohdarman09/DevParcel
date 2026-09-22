import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ZipEngine } from '../zip/zipEngine';
import { FileScanner } from '../scanner/fileScanner';
import { ExclusionEngine, DEFAULT_EXCLUSIONS } from '../scanner/exclusionEngine';
import { SensitiveFileDetector } from '../security/sensitiveFileDetector';
import { SenderIdentityService } from '../services/SenderIdentityService';

describe('Phase 9 Extension: Security Hardening & Regression Tests', () => {
  let tempWorkspace: string;

  beforeEach(async () => {
    tempWorkspace = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'devparcel-sec-test-'));
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempWorkspace, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  // ====================================================
  // 1. ZIP SLIP & ARCHIVE PATH SANITIZATION
  // ====================================================
  describe('1. Zip Slip Prevention & Archive Path Sanitization', () => {
    test('SEC-EXT-1.1: Directory traversal paths (..) are strictly rejected', () => {
      const maliciousPaths = [
        '../evil.txt',
        '../../evil.txt',
        'sub/../../evil.txt',
        'folder/sub/../../../etc/passwd',
        '..\\windows\\system32',
        'sub/..\\..\\evil.txt',
      ];

      for (const p of maliciousPaths) {
        const sanitized = ZipEngine.sanitizeArchivePath(p);
        assert.equal(sanitized, null, `Path traversal sequence was not rejected: ${p}`);
      }
    });

    test('SEC-EXT-1.2: Windows drive letter paths are strictly rejected', () => {
      const drivePaths = [
        'C:/windows/system32/notepad.exe',
        'c:\\boot.ini',
        'D:/secrets/passwords.txt',
        'E:\\data\\file.zip',
      ];

      for (const p of drivePaths) {
        const sanitized = ZipEngine.sanitizeArchivePath(p);
        assert.equal(sanitized, null, `Windows drive path was not rejected: ${p}`);
      }
    });

    test('SEC-EXT-1.3: Absolute paths and leading slashes are safely normalized', () => {
      const pathsWithLeadingSlashes = [
        '/var/www/index.html',
        '///home/user/code.ts',
        '\\src\\app.ts',
      ];

      for (const p of pathsWithLeadingSlashes) {
        const sanitized = ZipEngine.sanitizeArchivePath(p);
        assert.ok(sanitized);
        assert.equal(sanitized!.startsWith('/'), false);
        assert.equal(sanitized!.startsWith('\\'), false);
      }
    });

    test('SEC-EXT-1.4: Safe relative paths remain preserved', () => {
      const safePaths = [
        'src/index.ts',
        'package.json',
        'assets/images/logo.png',
        'deeply/nested/folder/component.tsx',
      ];

      for (const p of safePaths) {
        const sanitized = ZipEngine.sanitizeArchivePath(p);
        assert.equal(sanitized, p);
      }
    });
  });

  // ====================================================
  // 2. WORKSPACE BOUNDARY & SCANNER DEFENSE
  // ====================================================
  describe('2. Workspace Boundary Defense', () => {
    test('SEC-EXT-2.1: Scanner respects boundary and excludes symlinks/reparse points', async () => {
      const regularFile = path.join(tempWorkspace, 'regular.txt');
      await fs.promises.writeFile(regularFile, 'safe file content');

      // Create symlink pointing outside workspace
      const symlinkPath = path.join(tempWorkspace, 'symlink-to-outside');
      try {
        await fs.promises.symlink(os.tmpdir(), symlinkPath, 'dir');
      } catch {
        // Symlink creation might require admin on Windows; if so, skip symlink creation
      }

      const scanner = new FileScanner();
      const result = await scanner.scan(tempWorkspace);

      // Verify regular file is included
      assert.ok(result.includedFiles.some((f) => f.relativePath === 'regular.txt'));

      // Verify symlink is NEVER included in includedFiles
      assert.equal(
        result.includedFiles.some((f) => f.relativePath.includes('symlink-to-outside')),
        false,
        'Symlink was improperly included in archive scan!'
      );
    });
  });

  // ====================================================
  // 3. SENSITIVE FILE DETECTION & DEFAULT EXCLUSIONS
  // ====================================================
  describe('3. Sensitive File Detection & Default Exclusions', () => {
    test('SEC-EXT-3.1: Default exclusions automatically exclude .env, .env.*, node_modules', () => {
      const engine = new ExclusionEngine([], DEFAULT_EXCLUSIONS);

      // Check files that must be excluded
      assert.equal(engine.shouldExcludeFile('.env', '.env').excluded, true);
      assert.equal(engine.shouldExcludeFile('.env.local', '.env.local').excluded, true);
      assert.equal(engine.shouldExcludeFile('.env.production', '.env.production').excluded, true);
      assert.equal(engine.shouldExcludeDirectory('node_modules/', 'node_modules').excluded, true);
      assert.equal(engine.shouldExcludeDirectory('.git/', '.git').excluded, true);
      assert.equal(engine.shouldExcludeDirectory('dist/', 'dist').excluded, true);

      // Check safe template exemptions that must NOT be excluded
      assert.equal(engine.shouldExcludeFile('.env.example', '.env.example').excluded, false);
      assert.equal(engine.shouldExcludeFile('.env.sample', '.env.sample').excluded, false);
      assert.equal(engine.shouldExcludeFile('.env.template', '.env.template').excluded, false);
    });

    test('SEC-EXT-3.2: SensitiveFileDetector identifies keys, certificates, credentials', () => {
      const testCases = [
        { path: '.env', name: '.env', sensitive: true },
        { path: '.env.staging', name: '.env.staging', sensitive: true },
        { path: 'keys/id_rsa', name: 'id_rsa', sensitive: true },
        { path: 'certs/server.key', name: 'server.key', sensitive: true },
        { path: 'certs/cert.pem', name: 'cert.pem', sensitive: true },
        { path: 'keystore.p12', name: 'keystore.p12', sensitive: true },
        { path: 'config/credentials.json', name: 'credentials.json', sensitive: true },
        { path: 'config/client_secret.json', name: 'client_secret.json', sensitive: true },
        // Safe files
        { path: '.env.example', name: '.env.example', sensitive: false },
        { path: 'my-environment.ts', name: 'my-environment.ts', sensitive: false },
        { path: 'package.json', name: 'package.json', sensitive: false },
      ];

      for (const tc of testCases) {
        const result = SensitiveFileDetector.isSensitiveFile(tc.path, tc.name);
        assert.equal(
          result !== null,
          tc.sensitive,
          `Detection mismatch for ${tc.path}: expected sensitive=${tc.sensitive}`
        );
      }
    });
  });

  // ====================================================
  // 4. SENDER IDENTITY SECURITY
  // ====================================================
  describe('4. Sender Identity UUID Security', () => {
    test('SEC-EXT-4.1: Sender UUID format conforms to cryptographically secure UUID pattern', () => {
      const mockContext: any = {
        globalState: {
          storage: new Map<string, any>(),
          get(key: string) {
            return this.storage.get(key);
          },
          update(key: string, val: any) {
            this.storage.set(key, val);
            return Promise.resolve();
          },
        },
      };

      SenderIdentityService.setSenderIdForTesting(null);
      const id1 = SenderIdentityService.getOrCreateSenderId(mockContext);
      assert.ok(id1);
      assert.equal(/^[0-9a-fA-F-]{36}$/.test(id1), true);

      // Persistent idempotency
      const id2 = SenderIdentityService.getOrCreateSenderId(mockContext);
      assert.equal(id1, id2);
    });
  });
});

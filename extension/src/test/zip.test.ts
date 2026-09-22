import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ZipEngine } from '../zip/zipEngine';
import { scanWorkspace } from '../scanner';

describe('Phase 3: ZIP Engine + Download ZIP', () => {

  describe('ZipEngine.sanitizeArchivePath (Zip Slip Prevention)', () => {
    test('Preserves valid relative paths with forward slashes', () => {
      assert.equal(ZipEngine.sanitizeArchivePath('src/App.jsx'), 'src/App.jsx');
      assert.equal(ZipEngine.sanitizeArchivePath('components/Header.tsx'), 'components/Header.tsx');
      assert.equal(ZipEngine.sanitizeArchivePath('package.json'), 'package.json');
    });

    test('Normalizes Windows backslashes to forward slashes', () => {
      assert.equal(ZipEngine.sanitizeArchivePath('src\\components\\Header.jsx'), 'src/components/Header.jsx');
    });

    test('Strips leading slashes', () => {
      assert.equal(ZipEngine.sanitizeArchivePath('/src/App.jsx'), 'src/App.jsx');
      assert.equal(ZipEngine.sanitizeArchivePath('///src/App.jsx'), 'src/App.jsx');
    });

    test('Rejects path traversal (Zip Slip attempts)', () => {
      assert.equal(ZipEngine.sanitizeArchivePath('../../etc/passwd'), null);
      assert.equal(ZipEngine.sanitizeArchivePath('src/../../escaped.txt'), null);
      assert.equal(ZipEngine.sanitizeArchivePath('..\\..\\windows\\system32'), null);
    });

    test('Rejects drive letters', () => {
      assert.equal(ZipEngine.sanitizeArchivePath('C:/Windows/system32/cmd.exe'), null);
      assert.equal(ZipEngine.sanitizeArchivePath('D:\\secret.txt'), null);
    });

    test('Rejects empty or current-dir dot paths', () => {
      assert.equal(ZipEngine.sanitizeArchivePath(''), null);
      assert.equal(ZipEngine.sanitizeArchivePath('.'), null);
      assert.equal(ZipEngine.sanitizeArchivePath('./'), null);
    });
  });

  describe('ZipEngine.createZip Integration', () => {
    let tempDir: string;
    let targetZipPath: string;

    function setupTestProject(): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devparcel-zip-test-'));

      fs.mkdirSync(path.join(dir, 'src', 'components'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'src', 'App.jsx'), 'export default function App() {}');
      fs.writeFileSync(path.join(dir, 'src', 'components', 'Header.jsx'), '<header />');

      fs.mkdirSync(path.join(dir, 'public'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'public', 'logo.svg'), '<svg></svg>');

      fs.writeFileSync(path.join(dir, 'README.md'), '# Test Project');
      fs.writeFileSync(path.join(dir, '.env.example'), 'API_KEY=placeholder');

      // Excluded files
      fs.writeFileSync(path.join(dir, '.env'), 'SECRET=123');
      fs.writeFileSync(path.join(dir, '.env.local'), 'LOCAL=abc');
      fs.mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'node_modules', 'pkg', 'index.js'), 'module.exports = {};');
      fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'dist', 'bundle.js'), 'console.log("bundle");');

      return dir;
    }

    test('Creates a valid ZIP archive containing ONLY included files', async () => {
      tempDir = setupTestProject();
      targetZipPath = path.join(os.tmpdir(), `devparcel-test-output-${Date.now()}.zip`);

      // 1. Scan workspace using Phase 2 scanner
      const scanResult = await scanWorkspace(tempDir);
      assert.equal(scanResult.fileCount, 5); // App.jsx, Header.jsx, logo.svg, README.md, .env.example

      // 2. Package included files into ZIP
      const zipResult = await ZipEngine.createZip(scanResult.includedFiles, targetZipPath);

      // Verify returned result
      assert.equal(zipResult.outputPath, path.resolve(targetZipPath));
      assert.equal(zipResult.fileCount, 5);
      assert.ok(zipResult.zipSize > 0);

      // Verify file exists on disk
      assert.ok(fs.existsSync(targetZipPath));
      const stats = fs.statSync(targetZipPath);
      assert.equal(stats.size, zipResult.zipSize);

      // Verify ZIP contents by reading archive central directory strings
      const zipBuffer = fs.readFileSync(targetZipPath);
      const zipContentStr = zipBuffer.toString('utf-8');

      // Included files must be present
      assert.ok(zipContentStr.includes('src/App.jsx'), 'src/App.jsx should be inside ZIP');
      assert.ok(zipContentStr.includes('src/components/Header.jsx'), 'src/components/Header.jsx should be inside ZIP');
      assert.ok(zipContentStr.includes('public/logo.svg'), 'public/logo.svg should be inside ZIP');
      assert.ok(zipContentStr.includes('README.md'), 'README.md should be inside ZIP');
      assert.ok(zipContentStr.includes('.env.example'), '.env.example should be inside ZIP');

      // Excluded files must NOT be present
      assert.ok(!zipContentStr.includes('node_modules'), 'node_modules must not be inside ZIP');
      assert.ok(!zipContentStr.includes('.env.local'), '.env.local must not be inside ZIP');
      assert.ok(!zipContentStr.includes('dist/bundle.js'), 'dist/ must not be inside ZIP');

      // Absolute paths must NOT be present in archive entry headers
      assert.ok(!zipContentStr.includes(tempDir.replace(/\\/g, '/')), 'Workspace absolute path must not be in ZIP entries');
    });

    test('Original project files remain completely unmodified', () => {
      assert.ok(fs.existsSync(path.join(tempDir, 'src', 'App.jsx')));
      assert.ok(fs.existsSync(path.join(tempDir, '.env')));
      assert.ok(fs.existsSync(path.join(tempDir, 'node_modules', 'pkg', 'index.js')));
    });

    test('Throws error when includedFiles list is empty', async () => {
      const emptyZipPath = path.join(os.tmpdir(), `empty-${Date.now()}.zip`);
      await assert.rejects(
        async () => {
          await ZipEngine.createZip([], emptyZipPath);
        },
        /No files provided to package/
      );
      assert.ok(!fs.existsSync(emptyZipPath), 'Empty zip should not be created');
    });

    test('Cleans up temporary file when cancelled', async () => {
      const cancelZipPath = path.join(os.tmpdir(), `cancel-${Date.now()}.zip`);
      const scanResult = await scanWorkspace(tempDir);

      await assert.rejects(
        async () => {
          await ZipEngine.createZip(scanResult.includedFiles, cancelZipPath, {
            cancellationToken: { isCancellationRequested: true }
          });
        },
        /ZIP creation was cancelled/
      );

      assert.ok(!fs.existsSync(cancelZipPath), 'Target zip should not exist when cancelled');
    });

    test('REGRESSION: ensureDirectoryExists handles drive roots without throwing EPERM', async () => {
      const driveRoot = path.parse(process.cwd()).root; // e.g. 'e:\' or 'C:\'
      // Should resolve cleanly without calling mkdir on the root
      await assert.doesNotReject(async () => {
        await ZipEngine.ensureDirectoryExists(driveRoot);
      });
    });

    test('REGRESSION: createZip succeeds when destination is on a drive root', async () => {
      const driveRoot = path.parse(process.cwd()).root;
      const rootZipPath = path.join(driveRoot, `devparcel-regression-${Date.now()}.zip`);
      const scanResult = await scanWorkspace(tempDir);

      try {
        const result = await ZipEngine.createZip(scanResult.includedFiles, rootZipPath);
        assert.ok(fs.existsSync(rootZipPath));
        assert.ok(result.zipSize > 0);
        assert.equal(result.fileCount, 5);
      } finally {
        try {
          if (fs.existsSync(rootZipPath)) {
            fs.unlinkSync(rootZipPath);
          }
        } catch {}
      }
    });

    test('REGRESSION: ZipEngine invokes onProgress callback and resolves cleanly', async () => {
      const progressZipPath = path.join(os.tmpdir(), `progress-test-${Date.now()}.zip`);
      const scanResult = await scanWorkspace(tempDir);

      const progressReports: Array<{ processed: number; total: number; file: string }> = [];

      try {
        const result = await ZipEngine.createZip(scanResult.includedFiles, progressZipPath, {
          onProgress: (processed, total, file) => {
            progressReports.push({ processed, total, file });
          }
        });

        assert.ok(result.zipSize > 0);
        assert.equal(result.fileCount, 5);
        assert.equal(progressReports.length, 5);
        assert.equal(progressReports[progressReports.length - 1].processed, 5);
        assert.equal(progressReports[progressReports.length - 1].total, 5);
      } finally {
        try {
          if (fs.existsSync(progressZipPath)) {
            fs.unlinkSync(progressZipPath);
          }
        } catch {}
      }
    });

    test.after(() => {
      if (tempDir && fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {}
      }
      if (targetZipPath && fs.existsSync(targetZipPath)) {
        try {
          fs.unlinkSync(targetZipPath);
        } catch {}
      }
    });
  });
});

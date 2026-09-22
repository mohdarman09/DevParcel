import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileScanner, scanWorkspace, ExclusionEngine } from '../scanner';

describe('Phase 2: Workspace File Scanner + Exclusion Engine', () => {

  describe('ExclusionEngine Unit Tests', () => {
    const engine = new ExclusionEngine();

    test('TEST 3: node_modules/ is excluded', () => {
      assert.equal(engine.shouldExcludeDirectory('node_modules', 'node_modules').excluded, true);
      assert.equal(engine.shouldExcludeDirectory('packages/app/node_modules', 'node_modules').excluded, true);
    });

    test('TEST 4: .git/ is excluded', () => {
      assert.equal(engine.shouldExcludeDirectory('.git', '.git').excluded, true);
      assert.equal(engine.shouldExcludeDirectory('sub/.git', '.git').excluded, true);
    });

    test('TEST 5: .env is excluded', () => {
      assert.equal(engine.shouldExcludeFile('.env', '.env').excluded, true);
      assert.equal(engine.shouldExcludeFile('packages/app/.env', '.env').excluded, true);
    });

    test('TEST 6: .env.example is NOT automatically excluded; .env.* matches .env.local, .env.production', () => {
      // .env.example must NOT be excluded by default .env or .env.*
      assert.equal(engine.shouldExcludeFile('.env.example', '.env.example').excluded, false);
      assert.equal(engine.shouldExcludeFile('packages/app/.env.example', '.env.example').excluded, false);
      assert.equal(engine.shouldExcludeFile('.env.sample', '.env.sample').excluded, false);

      // .env.* matches sensitive env files
      assert.equal(engine.shouldExcludeFile('.env.local', '.env.local').excluded, true);
      assert.equal(engine.shouldExcludeFile('.env.production', '.env.production').excluded, true);
      assert.equal(engine.shouldExcludeFile('.env.development', '.env.development').excluded, true);
      assert.equal(engine.shouldExcludeFile('sub/.env.test', '.env.test').excluded, true);
    });

    test('TEST 7: dist/ is excluded', () => {
      assert.equal(engine.shouldExcludeDirectory('dist', 'dist').excluded, true);
      assert.equal(engine.shouldExcludeDirectory('packages/app/dist', 'dist').excluded, true);
    });

    test('TEST 8: build/ is excluded', () => {
      assert.equal(engine.shouldExcludeDirectory('build', 'build').excluded, true);
    });

    test('TEST 9: .cache/ is excluded', () => {
      assert.equal(engine.shouldExcludeDirectory('.cache', '.cache').excluded, true);
    });

    test('TEST 10: .next/ is excluded', () => {
      assert.equal(engine.shouldExcludeDirectory('.next', '.next').excluded, true);
    });

    test('TEST 11: coverage/ is excluded', () => {
      assert.equal(engine.shouldExcludeDirectory('coverage', 'coverage').excluded, true);
    });

    test('TEST 12: Custom exclusion works', () => {
      const customEngine = new ExclusionEngine(['logs/', '*.tmp', '.env.example']);
      assert.equal(customEngine.shouldExcludeDirectory('logs', 'logs').excluded, true);
      assert.equal(customEngine.shouldExcludeFile('app.tmp', 'app.tmp').excluded, true);
      // Explicitly configured .env.example is now excluded
      assert.equal(customEngine.shouldExcludeFile('.env.example', '.env.example').excluded, true);
    });

    test('Substring safety: Unrelated files containing .env or dist are not excluded', () => {
      assert.equal(engine.shouldExcludeFile('app.environment.ts', 'app.environment.ts').excluded, false);
      assert.equal(engine.shouldExcludeFile('dotenv.config.js', 'dotenv.config.js').excluded, false);
      assert.equal(engine.shouldExcludeFile('my-dist-script.js', 'my-dist-script.js').excluded, false);
      assert.equal(engine.shouldExcludeDirectory('distance', 'distance').excluded, false);
    });
  });

  describe('FileScanner Integration Tests', () => {
    let tempDir: string;

    // Helper to create test files
    function createTestWorkspace(): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devparcel-scanner-test-'));

      // 1. Regular files
      fs.mkdirSync(path.join(dir, 'src', 'components'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'src', 'App.jsx'), 'export default function App() {}'); // 33 bytes
      fs.writeFileSync(path.join(dir, 'src', 'components', 'Header.jsx'), '<header />'); // 10 bytes

      fs.mkdirSync(path.join(dir, 'public'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'public', 'logo.svg'), '<svg></svg>'); // 11 bytes

      fs.writeFileSync(path.join(dir, 'README.md'), '# Test Project'); // 14 bytes

      // 2. Safe env template file (must NOT be excluded)
      fs.writeFileSync(path.join(dir, '.env.example'), 'API_KEY=placeholder'); // 19 bytes

      // 3. Sensitive env files (must be excluded)
      fs.writeFileSync(path.join(dir, '.env'), 'SECRET=super_secret');
      fs.writeFileSync(path.join(dir, '.env.local'), 'LOCAL_SECRET=1234');
      fs.writeFileSync(path.join(dir, '.env.production'), 'PROD_SECRET=5678');

      // 4. Default excluded directories with nested files
      fs.mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'node_modules', 'pkg', 'index.js'), 'module.exports = {};');

      fs.mkdirSync(path.join(dir, 'packages', 'app', 'node_modules', 'nested'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'packages', 'app', 'node_modules', 'nested', 'index.js'), 'module.exports = {};');

      fs.mkdirSync(path.join(dir, '.git', 'objects'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.git', 'config'), '[core]\n');

      fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'dist', 'bundle.js'), 'console.log("bundle");');

      fs.mkdirSync(path.join(dir, 'build'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'build', 'main.js'), 'console.log("build");');

      fs.mkdirSync(path.join(dir, '.cache'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.cache', 'temp.json'), '{}');

      fs.mkdirSync(path.join(dir, '.next', 'server'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.next', 'server', 'page.js'), 'console.log("page");');

      fs.mkdirSync(path.join(dir, 'coverage'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'coverage', 'lcov.info'), 'TN:');

      // 5. Custom exclusion test directory
      fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'logs', 'app.log'), 'error at line 1');

      // 6. Empty directory
      fs.mkdirSync(path.join(dir, 'empty-dir'), { recursive: true });

      return dir;
    }

    test('TEST 1: Workspace detection works (validates workspace directory)', async () => {
      tempDir = createTestWorkspace();
      const scanner = new FileScanner();
      const result = await scanner.scan(tempDir);
      assert.equal(result.workspaceRoot, path.resolve(tempDir));
      assert.ok(result.projectName.length > 0);
      assert.equal(result.errors.length, 0);
    });

    test('TEST 2 & 8: Recursive nested file scanning works', async () => {
      const result = await scanWorkspace(tempDir);
      const relPaths = result.includedFiles.map(f => f.relativePath);

      assert.ok(relPaths.includes('src/App.jsx'));
      assert.ok(relPaths.includes('src/components/Header.jsx'));
      assert.ok(relPaths.includes('public/logo.svg'));
      assert.ok(relPaths.includes('README.md'));
    });

    test('TEST 3 & 15: node_modules/ and nested node_modules are excluded and skipped', async () => {
      const result = await scanWorkspace(tempDir);
      const relPaths = result.includedFiles.map(f => f.relativePath);

      assert.ok(!relPaths.some(p => p.includes('node_modules')));
      const excludedDirs = result.excludedPaths.map(e => e.relativePath);
      assert.ok(excludedDirs.includes('node_modules/'));
      assert.ok(excludedDirs.includes('packages/app/node_modules/'));
    });

    test('TEST 4: .git/ is excluded', async () => {
      const result = await scanWorkspace(tempDir);
      const relPaths = result.includedFiles.map(f => f.relativePath);
      assert.ok(!relPaths.some(p => p.startsWith('.git')));
    });

    test('TEST 5: .env is excluded', async () => {
      const result = await scanWorkspace(tempDir);
      const relPaths = result.includedFiles.map(f => f.relativePath);
      assert.ok(!relPaths.includes('.env'));
      assert.ok(!relPaths.includes('.env.local'));
      assert.ok(!relPaths.includes('.env.production'));
    });

    test('TEST 6: .env.example is NOT automatically excluded', async () => {
      const result = await scanWorkspace(tempDir);
      const relPaths = result.includedFiles.map(f => f.relativePath);
      assert.ok(relPaths.includes('.env.example'), 'Expected .env.example to be included by default');
    });

    test('TEST 7, 8, 9, 10, 11: dist/, build/, .cache/, .next/, coverage/ are excluded', async () => {
      const result = await scanWorkspace(tempDir);
      const relPaths = result.includedFiles.map(f => f.relativePath);

      assert.ok(!relPaths.some(p => p.startsWith('dist/')));
      assert.ok(!relPaths.some(p => p.startsWith('build/')));
      assert.ok(!relPaths.some(p => p.startsWith('.cache/')));
      assert.ok(!relPaths.some(p => p.startsWith('.next/')));
      assert.ok(!relPaths.some(p => p.startsWith('coverage/')));
    });

    test('TEST 12: Custom exclusion works (e.g. logs/)', async () => {
      // Without logs/ excluded:
      const beforeResult = await scanWorkspace(tempDir);
      assert.ok(beforeResult.includedFiles.some(f => f.relativePath === 'logs/app.log'));

      // With custom exclusion 'logs/':
      const afterResult = await scanWorkspace(tempDir, { customExclusions: ['logs/'] });
      assert.ok(!afterResult.includedFiles.some(f => f.relativePath === 'logs/app.log'));
      assert.ok(afterResult.excludedPaths.some(e => e.relativePath === 'logs/'));
    });

    test('TEST 13: Included file count is correct', async () => {
      const result = await scanWorkspace(tempDir, { customExclusions: ['logs/'] });
      // Expected included: src/App.jsx, src/components/Header.jsx, public/logo.svg, README.md, .env.example
      assert.equal(result.fileCount, 5);
      assert.equal(result.includedFiles.length, 5);
    });

    test('TEST 14: Included total size is correct', async () => {
      const result = await scanWorkspace(tempDir, { customExclusions: ['logs/'] });
      // Expected sizes: 32 + 10 + 11 + 14 + 19 = 86 bytes
      assert.equal(result.totalSize, 86);

      // Verify no excluded file sizes are added
      let manualSum = 0;
      for (const file of result.includedFiles) {
        manualSum += file.size;
      }
      assert.equal(result.totalSize, manualSum);
    });

    test('TEST 16: No file outside the workspace is returned (boundary validation)', async () => {
      const result = await scanWorkspace(tempDir);
      for (const file of result.includedFiles) {
        const resolved = path.resolve(file.absolutePath);
        assert.ok(
          resolved.startsWith(path.resolve(tempDir)),
          `File ${resolved} escapes workspace boundary ${tempDir}`
        );
      }
    });

    test('TEST 17: Inaccessible or non-existent path does not crash scanner', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist-dir');
      const result = await scanWorkspace(nonExistentPath);
      assert.equal(result.includedFiles.length, 0);
      assert.ok(result.errors.length > 0);
    });

    test('TEST 18: Scanner handles empty directories safely', async () => {
      const result = await scanWorkspace(tempDir);
      // Empty directory should not cause crashes, and should not be counted as a file
      assert.ok(!result.includedFiles.some(f => f.relativePath === 'empty-dir'));
    });

    test('TEST 19: Scanner does not read file contents unnecessarily (metadata only)', async () => {
      const result = await scanWorkspace(tempDir);
      for (const file of result.includedFiles) {
        // ScannedFile should have metadata only: absolutePath, relativePath, size
        assert.ok(typeof file.size === 'number');
        assert.ok(typeof file.relativePath === 'string');
        assert.ok(typeof file.absolutePath === 'string');
        assert.equal((file as any).content, undefined);
      }
    });

    test.after(() => {
      // Clean up temp directory
      if (tempDir && fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {}
      }
    });
  });
});

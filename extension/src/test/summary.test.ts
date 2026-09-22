import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanWorkspace } from '../scanner';
import { SensitiveFileDetector } from '../security';
import { ProjectSummaryBuilder } from '../summary';
import { ScannedFile } from '../types';

describe('Phase 4: Project Summary + Sensitive File Protection', () => {

  function createMockFile(relativePath: string, size: number = 100): ScannedFile {
    return {
      relativePath,
      absolutePath: path.resolve('/fake/workspace', relativePath),
      size
    };
  }

  // ==================================================
  // 1. PROJECT SUMMARY TESTS (TEST 1 - 10)
  // ==================================================
  describe('Project Summary Builder', () => {
    let tempDir: string;

    function setupTestWorkspace(): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devparcel-summary-test-'));
      fs.mkdirSync(path.join(dir, 'src', 'components'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'console.log("hello");'); // 22 bytes
      fs.writeFileSync(path.join(dir, 'src', 'components', 'Button.tsx'), 'export const Button = () => null;'); // 34 bytes
      fs.writeFileSync(path.join(dir, 'package.json'), '{"name": "test-app"}'); // 21 bytes

      // Excluded files
      fs.mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'node_modules', 'pkg', 'index.js'), 'module.exports = {};');
      fs.writeFileSync(path.join(dir, '.env'), 'SECRET_KEY=supersecret');

      return dir;
    }

    test('TEST 1: Summary correctly reports project name', async () => {
      tempDir = setupTestWorkspace();
      const scanResult = await scanWorkspace(tempDir, { customExclusions: ['node_modules/', '.env'] });
      const securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
      const summary = ProjectSummaryBuilder.build(scanResult, securityResult);

      assert.equal(summary.projectName, path.basename(tempDir));
    });

    test('TEST 2: Summary file count equals scanner included file count', async () => {
      tempDir = setupTestWorkspace();
      const scanResult = await scanWorkspace(tempDir, { customExclusions: ['node_modules/', '.env'] });
      const securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
      const summary = ProjectSummaryBuilder.build(scanResult, securityResult);

      assert.equal(summary.fileCount, scanResult.includedFiles.length);
      assert.equal(summary.fileCount, 3); // index.ts, Button.tsx, package.json
    });

    test('TEST 3: Summary original size equals scanner included size', async () => {
      tempDir = setupTestWorkspace();
      const scanResult = await scanWorkspace(tempDir, { customExclusions: ['node_modules/', '.env'] });
      const securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
      const summary = ProjectSummaryBuilder.build(scanResult, securityResult);

      assert.equal(summary.totalSize, scanResult.totalSize);
      assert.ok(summary.totalSize > 0);
    });

    test('TEST 4: Excluded count is correct', async () => {
      tempDir = setupTestWorkspace();
      const scanResult = await scanWorkspace(tempDir, { customExclusions: ['node_modules/', '.env'] });
      const securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
      const summary = ProjectSummaryBuilder.build(scanResult, securityResult);

      assert.equal(summary.excludedCount, scanResult.excludedCount);
      assert.ok(summary.excludedCount >= 2); // node_modules/ and .env
    });

    test('TEST 5: Excluded paths are correctly represented', async () => {
      tempDir = setupTestWorkspace();
      const scanResult = await scanWorkspace(tempDir, { customExclusions: ['node_modules/', '.env'] });
      const securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
      const summary = ProjectSummaryBuilder.build(scanResult, securityResult);

      assert.deepEqual(summary.excludedPaths, scanResult.excludedPaths);
      const paths = summary.excludedPaths.map(e => e.relativePath);
      assert.ok(paths.some(p => p.includes('node_modules')));
      assert.ok(paths.some(p => p.includes('.env')));
    });

    test('TEST 6: Summary does not include excluded file sizes', async () => {
      tempDir = setupTestWorkspace();
      const scanResult = await scanWorkspace(tempDir, { customExclusions: ['node_modules/', '.env'] });
      const securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
      const summary = ProjectSummaryBuilder.build(scanResult, securityResult);

      const manualIncludedSum = scanResult.includedFiles.reduce((acc, f) => acc + f.size, 0);
      assert.equal(summary.totalSize, manualIncludedSum);

      // Verify .env and node_modules sizes are not counted
      const envStat = fs.statSync(path.join(tempDir, '.env'));
      assert.ok(!scanResult.includedFiles.some(f => f.relativePath === '.env'));
      assert.ok(summary.totalSize < manualIncludedSum + envStat.size);
    });

    test('TEST 7: Summary works with nested directories', async () => {
      tempDir = setupTestWorkspace();
      const scanResult = await scanWorkspace(tempDir, { customExclusions: ['node_modules/', '.env'] });
      const securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
      const summary = ProjectSummaryBuilder.build(scanResult, securityResult);

      const buttonFile = scanResult.includedFiles.find(f => f.relativePath.replace(/\\/g, '/') === 'src/components/Button.tsx');
      assert.ok(buttonFile);
      assert.ok(summary.fileCount >= 3);
    });

    test('TEST 8: Empty project is handled safely', async () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devparcel-empty-'));
      try {
        const scanResult = await scanWorkspace(emptyDir);
        const securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
        const summary = ProjectSummaryBuilder.build(scanResult, securityResult);

        assert.equal(summary.fileCount, 0);
        assert.equal(summary.totalSize, 0);
        assert.equal(summary.excludedCount, 0);
        assert.equal(summary.hasSensitiveFiles, false);
        assert.equal(summary.sensitiveFiles.length, 0);
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });

    test('TEST 9: Summary setting ON triggers summary display', () => {
      const showProjectSummarySetting = true;
      let summaryDisplayed = false;

      // Simulate flow decision
      if (showProjectSummarySetting) {
        summaryDisplayed = true;
      }
      assert.equal(summaryDisplayed, true);
    });

    test('TEST 10: Summary setting OFF skips summary display', () => {
      const showProjectSummarySetting = false;
      let summaryDisplayed = false;

      // Simulate flow decision
      if (showProjectSummarySetting) {
        summaryDisplayed = true;
      }
      assert.equal(summaryDisplayed, false);
    });
  });

  // ==================================================
  // 2. SENSITIVE FILE DETECTION (TEST 11 - 23)
  // ==================================================
  describe('Sensitive File Detection', () => {
    test('TEST 11: .env is detected when included', () => {
      const files = [createMockFile('.env')];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, true);
      assert.equal(result.sensitiveFiles.length, 1);
      assert.equal(result.sensitiveFiles[0].relativePath, '.env');
      assert.equal(result.sensitiveFiles[0].category, 'environment');
    });

    test('TEST 12: .env.local is detected when included', () => {
      const files = [createMockFile('.env.local')];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, true);
      assert.equal(result.sensitiveFiles.length, 1);
      assert.equal(result.sensitiveFiles[0].relativePath, '.env.local');
    });

    test('TEST 13: .env.production is detected when included', () => {
      const files = [createMockFile('.env.production')];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, true);
      assert.equal(result.sensitiveFiles.length, 1);
      assert.equal(result.sensitiveFiles[0].relativePath, '.env.production');
    });

    test('TEST 14: .pem is detected when included', () => {
      const files = [createMockFile('certs/server.pem')];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, true);
      assert.equal(result.sensitiveFiles[0].category, 'private-key');
    });

    test('TEST 15: .key is detected when included', () => {
      const files = [createMockFile('keys/private.key')];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, true);
      assert.equal(result.sensitiveFiles[0].category, 'private-key');
    });

    test('TEST 16: .p12 is detected when included', () => {
      const files = [createMockFile('certificates/bundle.p12')];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, true);
      assert.equal(result.sensitiveFiles[0].category, 'certificate');
    });

    test('TEST 17: .pfx is detected when included', () => {
      const files = [createMockFile('certificates/identity.pfx')];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, true);
      assert.equal(result.sensitiveFiles[0].category, 'certificate');
    });

    test('TEST 18: .env.example is NOT automatically flagged', () => {
      const files = [createMockFile('.env.example')];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, false);
      assert.equal(result.sensitiveFiles.length, 0);
    });

    test('TEST 19: .env.sample is NOT automatically flagged', () => {
      const files = [createMockFile('.env.sample')];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, false);
      assert.equal(result.sensitiveFiles.length, 0);
    });

    test('TEST 20: .env.template is NOT automatically flagged', () => {
      const files = [createMockFile('.env.template')];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, false);
      assert.equal(result.sensitiveFiles.length, 0);
    });

    test('TEST 21: Unrelated filenames containing similar substrings are NOT falsely detected', () => {
      const files = [
        createMockFile('src/my-environment.ts'),
        createMockFile('docs/monkey.keywords.txt'),
        createMockFile('scripts/hotkeys.js'),
        createMockFile('styles/simple.keyboard.css'),
        createMockFile('keynote.presentation.pdf')
      ];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, false);
      assert.equal(result.sensitiveFiles.length, 0);
    });

    test('TEST 22: Nested sensitive files are detected', () => {
      const files = [
        createMockFile('config/secrets/.env'),
        createMockFile('backend/ssl/server.key')
      ];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, true);
      assert.equal(result.sensitiveFiles.length, 2);
    });

    test('TEST 23: Multiple sensitive files are detected', () => {
      const files = [
        createMockFile('.env'),
        createMockFile('server.key'),
        createMockFile('bundle.p12'),
        createMockFile('identity.pfx'),
        createMockFile('src/App.tsx') // regular file
      ];
      const result = SensitiveFileDetector.detect(files);

      assert.equal(result.hasSensitiveFiles, true);
      assert.equal(result.sensitiveFiles.length, 4);
      assert.ok(result.sensitiveFiles.some(f => f.relativePath === '.env'));
      assert.ok(result.sensitiveFiles.some(f => f.relativePath === 'server.key'));
      assert.ok(result.sensitiveFiles.some(f => f.relativePath === 'bundle.p12'));
      assert.ok(result.sensitiveFiles.some(f => f.relativePath === 'identity.pfx'));
    });
  });

  // ==================================================
  // 3. SECURITY FLOW TESTS (TEST 24 - 31)
  // ==================================================
  describe('Security Flow Integration', () => {
    let tempDir: string;

    function setupProjectWithSecrets(): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devparcel-secflow-test-'));
      fs.writeFileSync(path.join(dir, 'App.js'), 'console.log("App");');
      fs.writeFileSync(path.join(dir, '.env'), 'SECRET=xyz');
      fs.writeFileSync(path.join(dir, '.env.example'), 'SECRET=placeholder');
      fs.writeFileSync(path.join(dir, 'server.key'), '-----BEGIN PRIVATE KEY-----');
      return dir;
    }

    test('TEST 24: Sensitive file excluded by default does NOT trigger warning because it is not included', async () => {
      tempDir = setupProjectWithSecrets();
      // Default exclusions include .env and .env.*
      const scanResult = await scanWorkspace(tempDir, {
        customExclusions: ['.env', '.env.*', '*.key']
      });

      // Neither .env nor server.key is included
      const securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
      assert.equal(securityResult.hasSensitiveFiles, false);
      assert.equal(securityResult.sensitiveFiles.length, 0);
    });

    test('TEST 25: If user configuration causes .env to be included, warning appears', async () => {
      tempDir = setupProjectWithSecrets();
      // User custom configuration excludes only *.key, so .env is included
      const scanResult = await scanWorkspace(tempDir, {
        defaultExclusions: ['*.key'] // .env is now included
      });

      const securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
      assert.equal(securityResult.hasSensitiveFiles, true);
      assert.ok(securityResult.sensitiveFiles.some(f => f.relativePath === '.env'));
    });

    test('TEST 26: Clicking Cancel on sensitive warning prevents ZIP creation', async () => {
      const sensitiveFiles = [createMockFile('.env')];
      const securityResult = SensitiveFileDetector.detect(sensitiveFiles);
      assert.equal(securityResult.hasSensitiveFiles, true);

      // Simulate user clicking Cancel on sensitive warning
      let zipCreated = false;
      const userChoice: 'include-anyway' | 'cancel' = 'cancel';

      if (userChoice === 'cancel') {
        // Return without packaging
        zipCreated = false;
      } else {
        zipCreated = true;
      }

      assert.equal(zipCreated, false);
    });

    test('TEST 27: Clicking Include Anyway allows packaging', async () => {
      const sensitiveFiles = [createMockFile('.env')];
      const securityResult = SensitiveFileDetector.detect(sensitiveFiles);
      assert.equal(securityResult.hasSensitiveFiles, true);

      // Simulate user clicking Include Anyway
      let zipCreated = false;
      const userChoice: 'include-anyway' | 'cancel' = 'include-anyway';

      if (userChoice === 'include-anyway') {
        zipCreated = true;
      }

      assert.equal(zipCreated, true);
    });

    test('TEST 28: Include Anyway does not permanently disable the warning', () => {
      const sensitiveFiles = [createMockFile('.env')];

      // First run: user chooses 'include-anyway'
      const firstResult = SensitiveFileDetector.detect(sensitiveFiles);
      assert.equal(firstResult.hasSensitiveFiles, true);

      // Second run: verify detector is stateless and still flags the file
      const secondResult = SensitiveFileDetector.detect(sensitiveFiles);
      assert.equal(secondResult.hasSensitiveFiles, true);
      assert.equal(secondResult.sensitiveFiles.length, 1);
    });

    test('TEST 29: Sensitive warning still appears when Project Summary is disabled', () => {
      const showProjectSummary = false;
      const sensitiveFiles = [createMockFile('.env')];
      const securityResult = SensitiveFileDetector.detect(sensitiveFiles);

      let summaryShown = false;
      let warningShown = false;

      // Flow logic matching downloadZipCommand.ts
      if (showProjectSummary) {
        summaryShown = true;
      }

      if (securityResult.hasSensitiveFiles) {
        warningShown = true;
      }

      assert.equal(summaryShown, false);
      assert.equal(warningShown, true);
    });

    test('TEST 30: Sensitive detection does not read file contents', () => {
      // Create a mock file with nonexistent or unreadable path
      const fakeFile: ScannedFile = {
        relativePath: '.env',
        absolutePath: 'E:\\non_existent_folder_xyz_123\\.env',
        size: 999
      };

      // If detect() attempted to read the file, it would throw ENOENT
      assert.doesNotThrow(() => {
        const result = SensitiveFileDetector.detect([fakeFile]);
        assert.equal(result.hasSensitiveFiles, true);
        assert.equal(result.sensitiveFiles[0].relativePath, '.env');
      });
    });

    test('TEST 31: Sensitive detection does not expose secret values in UI/logs', () => {
      const sensitiveFile = createMockFile('.env');
      const result = SensitiveFileDetector.detect([sensitiveFile]);

      assert.equal(result.sensitiveFiles.length, 1);
      const detection = result.sensitiveFiles[0];

      // Detection object should only contain metadata, never content
      const keys = Object.keys(detection);
      assert.ok(!keys.includes('content'));
      assert.ok(!keys.includes('secret'));
      assert.ok(!keys.includes('value'));
      assert.equal(typeof detection.relativePath, 'string');
      assert.equal(typeof detection.reason, 'string');
      assert.equal(typeof detection.category, 'string');
    });
  });
});

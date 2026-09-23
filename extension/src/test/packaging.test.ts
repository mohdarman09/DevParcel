import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

/**
 * Pure Node.js central directory parser for ZIP / VSIX files.
 * Reads entry names without external dependencies.
 */
function getZipEntries(zipPath: string): string[] {
  const buf = fs.readFileSync(zipPath);
  const eocdSignature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const eocdOffset = buf.lastIndexOf(eocdSignature);
  if (eocdOffset === -1) {
    throw new Error(`File is not a valid zip archive: ${zipPath}`);
  }
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let offset = cdOffset;
  const entries: string[] = [];
  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) break;
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen);
    entries.push(name);
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

describe('VSIX Packaging & Runtime Dependency Verification', () => {
  const extensionDir = path.resolve(__dirname, '../..');
  const packageJsonPath = path.join(extensionDir, 'package.json');
  const vscodeignorePath = path.join(extensionDir, '.vscodeignore');

  test('TEST 1: extension/package.json declares archiver in dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.ok(pkg.dependencies, 'package.json must contain a dependencies section');
    assert.ok(
      pkg.dependencies.archiver,
      'package.json dependencies must explicitly contain "archiver"'
    );
    assert.ok(
      !pkg.devDependencies || !pkg.devDependencies.archiver,
      'archiver must NOT be placed in devDependencies'
    );
  });

  test('TEST 2: packaging script does not use --no-dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const packageScript = pkg.scripts?.package || '';
    assert.ok(
      !packageScript.includes('--no-dependencies'),
      'package script must not contain --no-dependencies flag which strips runtime dependencies'
    );
    assert.ok(
      packageScript.includes('vsce package'),
      'package script should invoke vsce package'
    );
  });

  test('TEST 3: .vscodeignore does not exclude production node_modules', () => {
    const ignoreContent = fs.readFileSync(vscodeignorePath, 'utf8');
    const lines = ignoreContent.split('\n').map((l) => l.trim());
    assert.ok(
      !lines.includes('node_modules'),
      '.vscodeignore must not blanket ignore node_modules'
    );
    assert.ok(
      !lines.includes('node_modules/**'),
      '.vscodeignore must not blanket ignore node_modules/**'
    );
  });

  test('TEST 4: VSIX package contains archiver and transitive dependencies', () => {
    // Find latest .vsix in extension directory or package one if none exists
    const vsixFiles = fs
      .readdirSync(extensionDir)
      .filter((f) => f.endsWith('.vsix'))
      .map((f) => path.join(extensionDir, f));

    let vsixPath: string;
    if (vsixFiles.length > 0) {
      vsixPath = vsixFiles[0];
    } else {
      // Build a fresh VSIX for verification
      execSync('npx @vscode/vsce package --allow-missing-repository', {
        cwd: extensionDir,
        stdio: 'pipe',
      });
      const generated = fs
        .readdirSync(extensionDir)
        .filter((f) => f.endsWith('.vsix'))
        .map((f) => path.join(extensionDir, f));
      assert.ok(generated.length > 0, 'vsce package failed to produce a .vsix file');
      vsixPath = generated[0];
    }

    const entries = getZipEntries(vsixPath);

    // 1. archiver must be physically present
    const hasArchiver = entries.some(
      (e) =>
        e === 'extension/node_modules/archiver/index.js' ||
        e === 'extension/node_modules/archiver/package.json'
    );
    assert.ok(
      hasArchiver,
      'The generated VSIX must physically include extension/node_modules/archiver/'
    );

    // 2. transitive dependencies must be present
    const hasArchiverUtils = entries.some((e) =>
      e.startsWith('extension/node_modules/archiver-utils/')
    );
    const hasZipStream = entries.some((e) =>
      e.startsWith('extension/node_modules/zip-stream/')
    );
    const hasReadableStream = entries.some((e) =>
      e.startsWith('extension/node_modules/readable-stream/')
    );

    assert.ok(hasArchiverUtils, 'VSIX must include archiver-utils');
    assert.ok(hasZipStream, 'VSIX must include zip-stream');
    assert.ok(hasReadableStream, 'VSIX must include readable-stream');

    // 3. Entry point must exist
    const hasMain = entries.includes('extension/out/extension.js');
    assert.ok(hasMain, 'VSIX must include compiled extension entry point extension/out/extension.js');

    // 4. Must not include development artifacts
    const hasEnvFiles = entries.some((e) => /(^|\/)\.env(\.|$)/.test(e));
    assert.ok(!hasEnvFiles, 'VSIX must not contain any .env files');

    const hasSourceTs = entries.some(
      (e) => e.startsWith('extension/src/') && e.endsWith('.ts')
    );
    assert.ok(!hasSourceTs, 'VSIX must not contain raw TypeScript source files under extension/src/');

    const hasTestOutputs = entries.some((e) =>
      e.startsWith('extension/out/test/')
    );
    assert.ok(!hasTestOutputs, 'VSIX must not contain compiled test files under extension/out/test/');
  });

  test('TEST 5: Clean isolated activation succeeds without external node_modules access', () => {
    // Locate the .vsix
    const vsixFiles = fs
      .readdirSync(extensionDir)
      .filter((f) => f.endsWith('.vsix'))
      .map((f) => path.join(extensionDir, f));

    assert.ok(vsixFiles.length > 0, 'No .vsix file found to test clean activation');
    const vsixPath = vsixFiles[0];

    const tempExtractDir = path.join(
      os.tmpdir(),
      `devparcel-clean-activation-test-${Date.now()}`
    );
    fs.mkdirSync(tempExtractDir, { recursive: true });

    try {
      // Extract VSIX using system tar
      execSync(`tar -xf "${vsixPath}" -C "${tempExtractDir}"`, { stdio: 'pipe' });

      const extractedExtensionDir = path.join(tempExtractDir, 'extension');
      const entryJs = path.join(extractedExtensionDir, 'out', 'extension.js');
      assert.ok(fs.existsSync(entryJs), `Extracted entry point not found at ${entryJs}`);

      // Verify node_modules exists in extracted package
      const extractedNodeModules = path.join(extractedExtensionDir, 'node_modules');
      assert.ok(
        fs.existsSync(extractedNodeModules),
        'Extracted VSIX must contain a node_modules directory'
      );
      assert.ok(
        fs.existsSync(path.join(extractedNodeModules, 'archiver')),
        'Extracted VSIX node_modules must contain archiver'
      );

      // Write a standalone runner script into temp directory to avoid command-line quoting issues on Windows
      const runnerFilePath = path.join(tempExtractDir, 'runner.js');
      const normalizedEntryJs = entryJs.replace(/\\/g, '/');
      const normalizedExtDir = extractedExtensionDir.replace(/\\/g, '/');

      const runnerCode = [
        "const Module = require('module');",
        "const origRequire = Module.prototype.require;",
        "const executed = [];",
        "",
        "const mockVscode = {",
        "  window: {",
        "    registerWebviewViewProvider: (id, provider) => {",
        "      executed.push('registerWebviewViewProvider:' + id);",
        "      return { dispose: () => {} };",
        "    },",
        "    showInformationMessage: async () => {},",
        "    showWarningMessage: async () => {},",
        "    showErrorMessage: async () => {},",
        "    withProgress: async (_opt, task) => task({ report: () => {} }, { isCancellationRequested: false })",
        "  },",
        "  commands: {",
        "    registerCommand: (cmd, handler) => {",
        "      executed.push('registerCommand:' + cmd);",
        "      return { dispose: () => {} };",
        "    },",
        "    executeCommand: async () => {}",
        "  },",
        "  workspace: {",
        "    workspaceFolders: [],",
        "    getConfiguration: () => ({ get: (k, d) => d })",
        "  },",
        "  ExtensionMode: { Production: 1, Development: 2, Test: 3 },",
        "  Uri: { file: (p) => ({ fsPath: p, path: p }) }",
        "};",
        "",
        "Module.prototype.require = function(id) {",
        "  if (id === 'vscode') return mockVscode;",
        "  return origRequire.apply(this, arguments);",
        "};",
        "",
        `const ext = require(${JSON.stringify(normalizedEntryJs)});`,
        "const context = {",
        "  subscriptions: [],",
        `  extensionUri: { fsPath: ${JSON.stringify(normalizedExtDir)} },`,
        "  extensionMode: 1",
        "};",
        "",
        "ext.activate(context);",
        "console.log(JSON.stringify({ success: true, executedCount: executed.length }));"
      ].join('\n');

      fs.writeFileSync(runnerFilePath, runnerCode, 'utf8');

      // Run isolated in os.tmpdir() with NODE_PATH unset
      const output = execSync(`node "${runnerFilePath}"`, {
        cwd: tempExtractDir,
        env: {
          ...process.env,
          NODE_PATH: '',
        },
        encoding: 'utf8',
      });

      const parsed = JSON.parse(output.trim());
      assert.equal(parsed.success, true, 'Activation script must report success');
      assert.ok(
        parsed.executedCount > 0,
        'Activation should register providers and commands'
      );
    } finally {
      try {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      } catch {}
    }
  });
});

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function getZipEntries(zipPath) {
  const buf = fs.readFileSync(zipPath);
  const eocdSignature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const eocdOffset = buf.lastIndexOf(eocdSignature);
  if (eocdOffset === -1) {
    throw new Error(`File is not a valid zip archive: ${zipPath}`);
  }
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let offset = cdOffset;
  const entries = [];
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

function verifyVsix(vsixPath) {
  console.log(`[VerifyVSIX] Inspecting: ${vsixPath}`);
  const stats = fs.statSync(vsixPath);
  console.log(`[VerifyVSIX] File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);

  const entries = getZipEntries(vsixPath);
  console.log(`[VerifyVSIX] Total entries inside archive: ${entries.length}`);

  // 1. Verify archiver
  const archiverEntries = entries.filter((e) => e.includes('node_modules/archiver/'));
  if (archiverEntries.length === 0) {
    throw new Error('FAILURE: "archiver" module is completely missing from the VSIX archive!');
  }
  console.log(`[VerifyVSIX] PASS: archiver is present (${archiverEntries.length} files)`);

  // 2. Verify transitive dependencies
  const transDeps = ['archiver-utils', 'zip-stream', 'readable-stream'];
  for (const dep of transDeps) {
    const found = entries.some((e) => e.includes(`node_modules/${dep}/`));
    if (!found) {
      throw new Error(`FAILURE: Transitive dependency "${dep}" is missing from the VSIX archive!`);
    }
    console.log(`[VerifyVSIX] PASS: Transitive dependency "${dep}" is present`);
  }

  // 3. Verify entrypoint
  if (!entries.includes('extension/out/extension.js')) {
    throw new Error('FAILURE: extension/out/extension.js is missing from the VSIX archive!');
  }
  console.log('[VerifyVSIX] PASS: extension/out/extension.js is present');

  // 3b. Verify brand icon
  if (!entries.includes('extension/resources/icon.png')) {
    throw new Error('FAILURE: extension/resources/icon.png is missing from the VSIX archive!');
  }
  console.log('[VerifyVSIX] PASS: extension/resources/icon.png is present');

  // 4. Verify no .env or secrets
  const envFiles = entries.filter((e) => /(^|\/)\.env(\.|$)/.test(e));
  if (envFiles.length > 0) {
    throw new Error(`FAILURE: Sensitive .env files found in VSIX: ${envFiles.join(', ')}`);
  }
  console.log('[VerifyVSIX] PASS: No .env files found in archive');

  // 5. Verify no source TS files
  const tsFiles = entries.filter((e) => e.startsWith('extension/src/') && e.endsWith('.ts'));
  if (tsFiles.length > 0) {
    throw new Error(`FAILURE: Source TypeScript files found in VSIX: ${tsFiles.join(', ')}`);
  }
  console.log('[VerifyVSIX] PASS: No source TypeScript files found in archive');

  // 6. Verify no test files
  const testFiles = entries.filter((e) => e.startsWith('extension/out/test/'));
  if (testFiles.length > 0) {
    throw new Error(`FAILURE: Test files found in VSIX: ${testFiles.join(', ')}`);
  }
  console.log('[VerifyVSIX] PASS: No test files found in archive');

  console.log('[VerifyVSIX] All verification checks PASSED successfully!');
  return true;
}

if (require.main === module) {
  const extensionDir = path.resolve(__dirname, '..');
  const targetVsix = process.argv[2]
    ? path.resolve(process.argv[2])
    : fs
        .readdirSync(extensionDir)
        .filter((f) => f.endsWith('.vsix'))
        .map((f) => path.join(extensionDir, f))[0];

  if (!targetVsix || !fs.existsSync(targetVsix)) {
    console.error('Error: No VSIX file found to verify.');
    process.exit(1);
  }

  try {
    verifyVsix(targetVsix);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { verifyVsix, getZipEntries };

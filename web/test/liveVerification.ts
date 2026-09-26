import assert from 'node:assert/strict';
import { extractShareToken } from '../src/components/ShareLinkInput';
import { resolveApiBaseUrl, setApiBaseUrlOverride } from '../src/config/siteConfig';
import { fetchShareMetadata, requestDownloadUrl, ShareApiError } from '../src/services/shareApi';

async function runLiveVerification() {
  console.log('--- DevParcel Live Verification Starting ---');

  // Test 1: Production vs Local API Base URL Resolution
  console.log('\n[1] Testing Production API Base URL Resolution...');
  const originalWindow = (globalThis as any).window;
  try {
    (globalThis as any).window = {
      location: {
        hostname: 'dev-parcel.vercel.app',
      },
    };
    const prodUrl = resolveApiBaseUrl();
    assert.strictEqual(prodUrl, 'https://devparcel.onrender.com');
    console.log('✓ On dev-parcel.vercel.app, API base URL resolves to:', prodUrl);

    (globalThis as any).window = {
      location: {
        hostname: 'localhost',
      },
    };
    const localUrl = resolveApiBaseUrl();
    assert.ok(localUrl.includes('localhost') || localUrl.includes('127.0.0.1'));
    console.log('✓ On localhost, API base URL resolves to:', localUrl);
  } finally {
    (globalThis as any).window = originalWindow;
  }

  // Test 2: Share Link Input Parsing
  console.log('\n[2] Testing Share Link Input URL & Token Extraction...');
  const testCases = [
    { input: 'https://dev-parcel.vercel.app/share/W_zpE91tzUkHiA_ctuZo7w', expected: 'W_zpE91tzUkHiA_ctuZo7w' },
    { input: 'https://dev-parcel.vercel.app/share/W_zpE91tzUkHiA_ctuZo7w/', expected: 'W_zpE91tzUkHiA_ctuZo7w' },
    { input: '  https://dev-parcel.vercel.app/share/W_zpE91tzUkHiA_ctuZo7w?utm_source=chat  ', expected: 'W_zpE91tzUkHiA_ctuZo7w' },
    { input: 'http://localhost:5173/share/W_zpE91tzUkHiA_ctuZo7w', expected: 'W_zpE91tzUkHiA_ctuZo7w' },
    { input: '/share/W_zpE91tzUkHiA_ctuZo7w', expected: 'W_zpE91tzUkHiA_ctuZo7w' },
    { input: '   W_zpE91tzUkHiA_ctuZo7w   ', expected: 'W_zpE91tzUkHiA_ctuZo7w' },
    { input: 'https://google.com', expected: '' },
    { input: 'https://dev-parcel.vercel.app', expected: '' },
    { input: '   ', expected: '' },
    { input: '', expected: '' },
  ];

  for (const tc of testCases) {
    const extracted = extractShareToken(tc.input);
    assert.strictEqual(extracted, tc.expected, `Failed for input: ${tc.input}`);
  }
  console.log(`✓ All ${testCases.length} URL/token normalization cases passed!`);

  // Point API to running local backend
  setApiBaseUrlOverride('http://localhost:3000');
  const validToken = 'W_zpE91tzUkHiA_ctuZo7w';

  // Test 3: Valid Active Token Metadata Lookup
  console.log('\n[3] Testing Valid Share Metadata Lookup against Live Backend...');
  const meta = await fetchShareMetadata(validToken);
  assert.ok(meta);
  assert.strictEqual(meta.token, validToken);
  assert.strictEqual(meta.status, 'active');
  assert.ok(meta.projectName);
  console.log('✓ Valid metadata retrieved successfully:');
  console.log(`   - Project: ${meta.projectName}`);
  console.log(`   - Status: ${meta.status}`);
  console.log(`   - File Count: ${meta.fileCount}`);
  console.log(`   - Package Size: ${meta.packageSize} bytes`);

  // Test 4: Download Pre-signed URL & Actual ZIP Payload Fetch
  console.log('\n[4] Testing Pre-signed Download URL & Actual ZIP Fetch...');
  const downloadResult = await requestDownloadUrl(validToken);
  assert.ok(downloadResult.downloadUrl);
  console.log('✓ Pre-signed download URL generated:');
  console.log(`   - URL: ${downloadResult.downloadUrl.slice(0, 75)}...`);
  console.log(`   - FileName: ${downloadResult.fileName}`);

  const zipResponse = await fetch(downloadResult.downloadUrl);
  assert.strictEqual(zipResponse.status, 200, 'Pre-signed storage download must return 200 OK');
  const zipBuffer = await zipResponse.arrayBuffer();
  assert.ok(zipBuffer.byteLength > 0, 'Downloaded ZIP file must contain bytes');
  // Check ZIP magic header PK\x03\x04
  const bytes = new Uint8Array(zipBuffer.slice(0, 4));
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05);
  assert.ok(isZip, 'Downloaded payload must have valid PK zip header');
  console.log(`✓ Downloaded ${zipBuffer.byteLength} bytes of valid ZIP package!`);

  // Test 5: Invalid Token Handling (e.g. malformed "invalid")
  console.log('\n[5] Testing Malformed / Invalid Token...');
  try {
    await fetchShareMetadata('invalid');
    assert.fail('Should have thrown ShareApiError');
  } catch (err: any) {
    assert.ok(err instanceof ShareApiError);
    assert.strictEqual(err.statusCode, 400);
    assert.strictEqual(err.code, 'INVALID_TOKEN');
    console.log(`✓ Malformed token returned HTTP 400 INVALID_TOKEN as expected.`);
  }

  // Test 6: Non-Existent Token Handling
  console.log('\n[6] Testing Non-Existent Token...');
  try {
    await fetchShareMetadata('A1b2C3d4E5f6G7h8I9j0');
    assert.fail('Should have thrown ShareApiError');
  } catch (err: any) {
    assert.ok(err instanceof ShareApiError);
    assert.strictEqual(err.statusCode, 404);
    assert.strictEqual(err.pageStatus, 'not_found');
    console.log(`✓ Non-existent token returned HTTP 404 SHARE_NOT_FOUND as expected.`);
  }

  // Test 7: Simulated Network Failure Handling
  console.log('\n[7] Testing Genuine Network Failure Error Mapping...');
  setApiBaseUrlOverride('http://localhost:9999'); // Non-existent port
  try {
    await fetchShareMetadata(validToken);
    assert.fail('Should have thrown network failure ShareApiError');
  } catch (err: any) {
    assert.ok(err instanceof ShareApiError);
    assert.strictEqual(err.pageStatus, 'error');
    assert.strictEqual(err.code, 'NETWORK_ERROR');
    console.log(`✓ Genuine connection failure mapped to error status with retry capability.`);
  }

  setApiBaseUrlOverride(null); // Reset override

  console.log('\n🎉 ALL LIVE VERIFICATION CHECKS PASSED PERFECTLY!\n');
}

runLiveVerification().catch((err) => {
  console.error('Live verification failed:', err);
  process.exit(1);
});

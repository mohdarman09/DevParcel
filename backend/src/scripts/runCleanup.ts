import { connectDatabase, disconnectDatabase } from '../config/database';
import { CleanupService } from '../services/sharing/cleanupService';

async function main(): Promise<void> {
  console.log('[DevParcel Cleanup] Starting expired share cleanup job...');
  try {
    await connectDatabase();
    const cleanupService = new CleanupService();
    const result = await cleanupService.cleanupExpiredShares();

    console.log('[DevParcel Cleanup] Cleanup job completed:');
    console.log(`  - Expired shares scanned: ${result.scanned}`);
    console.log(`  - Objects cleaned: ${result.cleaned}`);
    console.log(`  - Errors encountered: ${result.errors}`);

    if (result.errorDetails && result.errorDetails.length > 0) {
      console.warn('[DevParcel Cleanup] Error details:', result.errorDetails);
    }
  } catch (err) {
    console.error('[DevParcel Cleanup] Critical error during cleanup:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

main();

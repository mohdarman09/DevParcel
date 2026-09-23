import { getShareRepository, IShareRepository } from '../../repositories';
import { getStorageProvider, ICloudStorageProvider } from '../storage';

export interface CleanupResult {
  scanned: number;
  cleaned: number;
  errors: number;
  errorDetails?: Array<{ token: string; error: string }>;
}

export class CleanupService {
  constructor(
    private storageProvider?: ICloudStorageProvider,
    private shareRepository?: IShareRepository
  ) {}

  private get provider(): ICloudStorageProvider {
    return this.storageProvider || getStorageProvider();
  }

  private get repository(): IShareRepository {
    return this.shareRepository || getShareRepository();
  }

  /**
   * Scans for expired or explicitly marked expired shares and removes the associated
   * objects from object storage, updating the status in PostgreSQL to 'cleaned'.
   * Safe to run repeatedly (idempotent).
   */
  public async cleanupExpiredShares(): Promise<CleanupResult> {
    const now = new Date();
    const expiredShares = await this.repository.findExpired(now);

    const result: CleanupResult = {
      scanned: expiredShares.length,
      cleaned: 0,
      errors: 0,
      errorDetails: [],
    };

    for (const share of expiredShares) {
      try {
        // 1. Delete object from storage provider (idempotent; ignores if not found)
        await this.provider.delete(share.storageKey);

        // 2. Update record status to 'cleaned' in PostgreSQL
        await this.repository.updateStatus(share.id, 'cleaned');

        result.cleaned++;
      } catch (err: any) {
        result.errors++;
        result.errorDetails?.push({
          token: share.token,
          error: err.message || String(err),
        });
        const safeToken = share.token && share.token.length > 6 ? `${share.token.substring(0, 6)}...` : '***';
        console.error(`[CleanupService] Failed to clean up share token ${safeToken}:`, err);
      }
    }

    return result;
  }
}

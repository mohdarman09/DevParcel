import { config } from '../../config';
import { ShareRecord, ShareStatus } from '../../models/share';
import { getStorageProvider, ICloudStorageProvider } from '../storage';
import { getShareRepository, IShareRepository } from '../../repositories';
import { generateShareToken, isValidShareToken } from '../../utils/tokenGenerator';
import { generateStorageKey } from '../../utils/storageKeyGenerator';
import { PasswordHasher } from '../../utils/passwordHasher';
import { AccessTicket } from '../../utils/accessTicket';
import { PasswordRateLimiter } from '../../utils/rateLimiter';

export interface CreateShareInput {
  projectName: string;
  fileCount: number;
  originalSize: number;
  packageSize: number;
  excludedCount?: number;
  sensitiveFileCount?: number;
  expiryHours?: number;
  fileStream: NodeJS.ReadableStream;
  senderId?: string;
  password?: string;
}

export interface SharePublicMetadata {
  token: string;
  publicUrl: string;
  projectName: string;
  fileCount: number;
  originalSize: number;
  packageSize: number;
  excludedCount: number;
  sensitiveFileCount: number;
  createdAt: Date;
  expiresAt: Date;
  downloadCount: number;
  lastDownloadedAt?: Date | null;
  status: string;
  isPasswordProtected?: boolean;
}

export class ShareServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = 'ShareServiceError';
  }
}

export class ShareService {
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
   * Creates a new temporary share record and streams the ZIP file to object storage.
   */
  public async createShare(input: CreateShareInput): Promise<SharePublicMetadata> {
    // 1. Validate metadata
    if (!input.projectName || typeof input.projectName !== 'string') {
      throw new ShareServiceError('INVALID_METADATA', 'Project name is required.');
    }
    const sanitizedProjectName = input.projectName.trim().slice(0, 255);
    if (!sanitizedProjectName) {
      throw new ShareServiceError('INVALID_METADATA', 'Project name cannot be empty.');
    }

    if (
      typeof input.fileCount !== 'number' ||
      isNaN(input.fileCount) ||
      input.fileCount < 0
    ) {
      throw new ShareServiceError('INVALID_METADATA', 'File count must be a non-negative number.');
    }

    if (
      typeof input.originalSize !== 'number' ||
      isNaN(input.originalSize) ||
      input.originalSize < 0
    ) {
      throw new ShareServiceError('INVALID_METADATA', 'Original size must be a non-negative number.');
    }

    if (
      typeof input.packageSize !== 'number' ||
      isNaN(input.packageSize) ||
      input.packageSize < 0
    ) {
      throw new ShareServiceError('INVALID_METADATA', 'Package size must be a non-negative number.');
    }

    // 2. Validate expiry
    const expiryHours = input.expiryHours ?? config.expiry.defaultHours;
    if (
      typeof expiryHours !== 'number' ||
      isNaN(expiryHours) ||
      !Number.isInteger(expiryHours) ||
      expiryHours < config.expiry.minHours ||
      expiryHours > config.expiry.maxHours
    ) {
      throw new ShareServiceError(
        'INVALID_EXPIRY',
        `Expiry must be an integer between ${config.expiry.minHours} and ${config.expiry.maxHours} hours.`
      );
    }

    const SENDER_ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;
    if (input.senderId && typeof input.senderId === 'string' && !SENDER_ID_REGEX.test(input.senderId.trim())) {
      throw new ShareServiceError('INVALID_SENDER_ID', 'Sender ID must be a valid identifier (8-64 alphanumeric characters).');
    }

    // 3. Generate secure token and internal storage key
    const token = generateShareToken();
    const storageKey = generateStorageKey();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + expiryHours * 3600 * 1000);

    // Optional password protection
    let passwordHash: string | null = null;
    let isPasswordProtected = false;
    if (input.password && typeof input.password === 'string' && input.password.trim().length > 0) {
      if (input.password.length < 4) {
        throw new ShareServiceError('INVALID_PASSWORD', 'Password must be at least 4 characters in length.');
      }
      passwordHash = await PasswordHasher.hash(input.password);
      isPasswordProtected = true;
    }

    // 4. Stream upload ZIP to cloud storage
    try {
      await this.provider.upload(storageKey, input.fileStream, {
        contentType: 'application/zip',
        metadata: {
          token,
          projectName: encodeURIComponent(sanitizedProjectName),
        },
      });
    } catch (uploadErr: any) {
      throw new ShareServiceError(
        'STORAGE_UPLOAD_FAILED',
        `Failed to upload package to storage: ${uploadErr.message || uploadErr}`,
        502
      );
    }

    // 5. Insert share metadata into PostgreSQL; if fails, execute compensating cleanup on storage
    let shareRecord: ShareRecord;
    try {
      shareRecord = await this.repository.create({
        token,
        storageKey,
        projectName: sanitizedProjectName,
        fileCount: input.fileCount,
        originalSize: input.originalSize,
        packageSize: input.packageSize,
        excludedCount: input.excludedCount ?? 0,
        sensitiveFileCount: input.sensitiveFileCount ?? 0,
        createdAt,
        expiresAt,
        status: 'active',
        senderId: input.senderId || null,
        passwordProtected: isPasswordProtected,
        passwordHash,
      });
      const safeToken = token.length > 8 ? `${token.slice(0, 6)}...` : '***';
      console.log(`[Database] Share metadata inserted for token: ${safeToken}`);
    } catch (dbErr: any) {
      // Compensating rollback of orphaned storage object
      try {
        await this.provider.delete(storageKey);
      } catch (cleanupErr) {
        console.error('[ShareService] Failed to cleanup orphaned object after DB error:', cleanupErr);
      }

      throw new ShareServiceError(
        'DATABASE_ERROR',
        `Failed to persist share metadata: ${dbErr.message || dbErr}`,
        500
      );
    }

    const publicUrl = `${config.publicShareBaseUrl}/share/${token}`;

    return {
      token: shareRecord.token,
      publicUrl,
      projectName: shareRecord.projectName,
      fileCount: shareRecord.fileCount,
      originalSize: shareRecord.originalSize,
      packageSize: shareRecord.packageSize,
      excludedCount: shareRecord.excludedCount,
      sensitiveFileCount: shareRecord.sensitiveFileCount,
      createdAt: shareRecord.createdAt,
      expiresAt: shareRecord.expiresAt,
      downloadCount: shareRecord.downloadCount,
      lastDownloadedAt: shareRecord.lastDownloadedAt,
      status: shareRecord.status,
      isPasswordProtected: shareRecord.passwordProtected,
    };
  }

  /**
   * Retrieves public metadata for a share. Returns 410 if expired, 404 if not found.
   * If password protected, masks project name and details until password is provided.
   */
  public async getShareByToken(token: string): Promise<SharePublicMetadata> {
    if (!isValidShareToken(token)) {
      throw new ShareServiceError('INVALID_TOKEN', 'The provided share token is invalid.', 400);
    }

    const share = await this.repository.findByToken(token);
    if (!share) {
      throw new ShareServiceError('SHARE_NOT_FOUND', 'The requested share link was not found.', 404);
    }

    // Check expiration
    const now = Date.now();
    if (share.status === 'expired' || share.status === 'cleaned' || share.expiresAt.getTime() <= now) {
      if (share.status === 'active') {
        await this.repository.updateStatusByToken(token, 'expired').catch(() => {});
      }
      throw new ShareServiceError(
        'SHARE_EXPIRED',
        'This share link has expired and is no longer available for download.',
        410
      );
    }

    if (share.status === 'revoked') {
      throw new ShareServiceError('SHARE_REVOKED', 'This share link has been revoked.', 410);
    }

    const publicUrl = `${config.publicShareBaseUrl}/share/${token}`;

    // If protected by password, return masked metadata to avoid leaking project information
    if (share.passwordProtected) {
      return {
        token: share.token,
        publicUrl,
        projectName: 'Protected Project',
        fileCount: 0,
        originalSize: 0,
        packageSize: 0,
        excludedCount: 0,
        sensitiveFileCount: 0,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        downloadCount: share.downloadCount,
        lastDownloadedAt: share.lastDownloadedAt,
        status: share.status,
        isPasswordProtected: true,
      };
    }

    return {
      token: share.token,
      publicUrl,
      projectName: share.projectName,
      fileCount: share.fileCount,
      originalSize: share.originalSize,
      packageSize: share.packageSize,
      excludedCount: share.excludedCount,
      sensitiveFileCount: share.sensitiveFileCount,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      downloadCount: share.downloadCount,
      lastDownloadedAt: share.lastDownloadedAt,
      status: share.status,
      isPasswordProtected: false,
    };
  }

  /**
   * Verifies password for a protected share and returns a short-lived download authorization ticket.
   */
  public async verifySharePassword(
    token: string,
    password: string
  ): Promise<{ share: SharePublicMetadata; accessTicket: string }> {
    if (!isValidShareToken(token)) {
      throw new ShareServiceError('INVALID_TOKEN', 'The provided share token is invalid.', 400);
    }

    if (!password || typeof password !== 'string') {
      throw new ShareServiceError('PASSWORD_REQUIRED', 'Password is required.', 400);
    }

    const { locked, remainingSeconds } = PasswordRateLimiter.isLocked(token);
    if (locked) {
      throw new ShareServiceError(
        'RATE_LIMIT_EXCEEDED',
        `Too many failed password attempts. Please wait ${remainingSeconds} seconds before trying again.`,
        429
      );
    }

    const share = await this.repository.findByToken(token);
    if (!share) {
      throw new ShareServiceError('SHARE_NOT_FOUND', 'The requested share link was not found.', 404);
    }

    const now = Date.now();
    if (share.status === 'expired' || share.status === 'cleaned' || share.expiresAt.getTime() <= now) {
      if (share.status === 'active') {
        await this.repository.updateStatusByToken(token, 'expired').catch(() => {});
      }
      throw new ShareServiceError(
        'SHARE_EXPIRED',
        'This share link has expired and is no longer available.',
        410
      );
    }

    if (share.status === 'revoked') {
      throw new ShareServiceError('SHARE_REVOKED', 'This share link has been revoked.', 410);
    }

    if (!share.passwordProtected || !share.passwordHash) {
      throw new ShareServiceError('NOT_PASSWORD_PROTECTED', 'This share is not password protected.', 400);
    }

    const isMatch = await PasswordHasher.verify(share.passwordHash, password);
    if (!isMatch) {
      PasswordRateLimiter.recordFailure(token);
      throw new ShareServiceError('INVALID_PASSWORD', 'Incorrect password.', 401);
    }

    PasswordRateLimiter.recordSuccess(token);
    const accessTicket = AccessTicket.create(token);
    const publicUrl = `${config.publicShareBaseUrl}/share/${token}`;

    return {
      share: {
        token: share.token,
        publicUrl,
        projectName: share.projectName,
        fileCount: share.fileCount,
        originalSize: share.originalSize,
        packageSize: share.packageSize,
        excludedCount: share.excludedCount,
        sensitiveFileCount: share.sensitiveFileCount,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        downloadCount: share.downloadCount,
        lastDownloadedAt: share.lastDownloadedAt,
        status: share.status,
        isPasswordProtected: true,
      },
      accessTicket,
    };
  }

  /**
   * Retrieves list of shares created by a specific sender with dynamic expiration calculation.
   */
  public async getShareHistory(senderId: string): Promise<SharePublicMetadata[]> {
    const SENDER_ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;
    if (!senderId || typeof senderId !== 'string' || !SENDER_ID_REGEX.test(senderId.trim())) {
      throw new ShareServiceError('SENDER_ID_REQUIRED', 'A valid sender ID is required to view history.', 401);
    }

    const shares = await this.repository.findBySenderId(senderId.trim());
    const now = Date.now();

    return Promise.all(
      shares.map(async (share) => {
        let status = share.status;
        if (status === 'active' && share.expiresAt.getTime() <= now) {
          status = 'expired';
          await this.repository.updateStatusByToken(share.token, 'expired').catch(() => {});
        }

        return {
          token: share.token,
          publicUrl: `${config.publicShareBaseUrl}/share/${share.token}`,
          projectName: share.projectName,
          fileCount: share.fileCount,
          originalSize: share.originalSize,
          packageSize: share.packageSize,
          excludedCount: share.excludedCount,
          sensitiveFileCount: share.sensitiveFileCount,
          createdAt: share.createdAt,
          expiresAt: share.expiresAt,
          downloadCount: share.downloadCount,
          lastDownloadedAt: share.lastDownloadedAt,
          status,
          isPasswordProtected: share.passwordProtected,
        };
      })
    );
  }

  /**
   * Revokes an active share link if owned by sender.
   */
  public async revokeShare(token: string, senderId: string): Promise<SharePublicMetadata> {
    if (!isValidShareToken(token)) {
      throw new ShareServiceError('INVALID_TOKEN', 'The provided share token is invalid.', 400);
    }

    const SENDER_ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;
    if (!senderId || typeof senderId !== 'string' || !SENDER_ID_REGEX.test(senderId.trim())) {
      throw new ShareServiceError('SENDER_ID_REQUIRED', 'Sender identity is required to revoke.', 401);
    }

    const share = await this.repository.findByToken(token);
    if (!share) {
      throw new ShareServiceError('SHARE_NOT_FOUND', 'The requested share link was not found.', 404);
    }

    // Strict ownership check: share must have a registered sender_id and it must match the caller
    if (!share.senderId || share.senderId !== senderId.trim()) {
      throw new ShareServiceError('FORBIDDEN', 'You do not have permission to revoke this share link.', 403);
    }

    // Idempotent revocation
    if (share.status !== 'revoked') {
      await this.repository.updateStatusByToken(token, 'revoked');
    }

    return {
      token: share.token,
      publicUrl: `${config.publicShareBaseUrl}/share/${share.token}`,
      projectName: share.projectName,
      fileCount: share.fileCount,
      originalSize: share.originalSize,
      packageSize: share.packageSize,
      excludedCount: share.excludedCount,
      sensitiveFileCount: share.sensitiveFileCount,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      downloadCount: share.downloadCount,
      lastDownloadedAt: share.lastDownloadedAt,
      status: 'revoked',
      isPasswordProtected: share.passwordProtected,
    };
  }

  /**
   * Generates a pre-signed download URL and increments the download count.
   * If the share is password protected, verifies the access ticket.
   */
  public async getDownloadUrlForShare(
    token: string,
    accessTicket?: string
  ): Promise<{ downloadUrl: string; fileName: string; isDirectStream?: boolean }> {
    if (!isValidShareToken(token)) {
      throw new ShareServiceError('INVALID_TOKEN', 'The provided share token is invalid.', 400);
    }

    const share = await this.repository.findByToken(token);
    if (!share) {
      throw new ShareServiceError('SHARE_NOT_FOUND', 'The requested share link was not found.', 404);
    }

    // Expiry check
    const now = Date.now();
    if (share.status === 'expired' || share.status === 'cleaned' || share.expiresAt.getTime() <= now) {
      if (share.status === 'active') {
        await this.repository.updateStatusByToken(token, 'expired').catch(() => {});
      }
      throw new ShareServiceError(
        'SHARE_EXPIRED',
        'This share link has expired and cannot be downloaded.',
        410
      );
    }

    if (share.status === 'revoked') {
      throw new ShareServiceError('SHARE_REVOKED', 'This share link has been revoked.', 410);
    }

    // Ticket verification for password-protected shares
    if (share.passwordProtected) {
      const isTicketValid = AccessTicket.verify(token, accessTicket);
      if (!isTicketValid) {
        throw new ShareServiceError(
          'UNAUTHORIZED',
          'Password verification required to download this package.',
          401
        );
      }
    }

    const fileName = `${share.projectName}.zip`;
    const downloadUrl = await this.provider.getDownloadUrl(
      share.storageKey,
      fileName,
      300 // 5 minutes signed URL
    );

    // Atomically increment download count in PostgreSQL
    await this.repository.incrementDownloadCount(token).catch((err) => {
      console.warn('[ShareService] Failed to update download count:', err);
    });

    return {
      downloadUrl,
      fileName,
    };
  }
}

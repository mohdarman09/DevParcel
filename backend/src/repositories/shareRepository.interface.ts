import { CreateShareDTO, ShareRecord, ShareStatus } from '../models/share';

export interface IShareRepository {
  /**
   * Inserts a new share metadata record into the database.
   */
  create(data: CreateShareDTO): Promise<ShareRecord>;

  /**
   * Looks up an active share by its unique public token.
   */
  findByToken(token: string): Promise<ShareRecord | null>;

  /**
   * Finds all shares created by a specific sender, sorted by creation date descending.
   */
  findBySenderId(senderId: string): Promise<ShareRecord[]>;

  /**
   * Atomically increments the download count and updates last_downloaded_at.
   */
  incrementDownloadCount(token: string): Promise<ShareRecord | null>;

  /**
   * Finds all shares that have reached or passed their expiration timestamp,
   * or are marked 'expired', and have not yet been cleaned.
   */
  findExpired(now?: Date): Promise<ShareRecord[]>;

  /**
   * Updates the lifecycle status of a share record by its primary key.
   */
  updateStatus(id: string, status: ShareStatus): Promise<void>;

  /**
   * Updates the lifecycle status of a share record by its token.
   */
  updateStatusByToken(token: string, status: ShareStatus): Promise<void>;
}

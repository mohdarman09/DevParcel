import { CreateShareDTO, ShareRecord, ShareStatus } from '../models/share';
import { IShareRepository } from './shareRepository.interface';

export class MockShareRepository implements IShareRepository {
  public records = new Map<string, ShareRecord>();
  public shouldFail = false;

  public clear(): void {
    this.records.clear();
    this.shouldFail = false;
  }

  public async create(data: CreateShareDTO): Promise<ShareRecord> {
    if (this.shouldFail) {
      throw new Error('Simulated PostgreSQL database failure during insert');
    }

    // Constraint simulation: unique token
    if (this.records.has(data.token)) {
      const err: any = new Error('duplicate key value violates unique constraint "shares_token_key"');
      err.code = '23505';
      throw err;
    }

    // Constraint simulation: non-negative checks
    if (data.fileCount < 0 || data.originalSize < 0 || data.packageSize < 0) {
      const err: any = new Error('new row for relation "shares" violates check constraint');
      err.code = '23514';
      throw err;
    }

    const record: ShareRecord = {
      id: 'mock-uuid-' + Math.random().toString(36).substring(2, 11),
      token: data.token,
      storageKey: data.storageKey,
      projectName: data.projectName,
      fileCount: data.fileCount,
      originalSize: data.originalSize,
      packageSize: data.packageSize,
      excludedCount: data.excludedCount ?? 0,
      sensitiveFileCount: data.sensitiveFileCount ?? 0,
      createdAt: data.createdAt || new Date(),
      expiresAt: data.expiresAt,
      downloadCount: 0,
      lastDownloadedAt: null,
      status: data.status || 'active',
      senderId: data.senderId || null,
      passwordProtected: data.passwordProtected ?? false,
      passwordHash: data.passwordHash || null,
    };

    this.records.set(data.token, record);
    return { ...record };
  }

  public async findByToken(token: string): Promise<ShareRecord | null> {
    const record = this.records.get(token);
    return record ? { ...record } : null;
  }

  public async findBySenderId(senderId: string): Promise<ShareRecord[]> {
    const results: ShareRecord[] = [];
    for (const record of this.records.values()) {
      if (record.senderId === senderId) {
        results.push({ ...record });
      }
    }
    // Sort descending by created_at
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return results;
  }

  public async incrementDownloadCount(token: string): Promise<ShareRecord | null> {
    const record = this.records.get(token);
    if (!record) return null;

    record.downloadCount += 1;
    record.lastDownloadedAt = new Date();
    this.records.set(token, record);
    return { ...record };
  }

  public async findExpired(now: Date = new Date()): Promise<ShareRecord[]> {
    const expired: ShareRecord[] = [];
    for (const record of this.records.values()) {
      const isExpired = record.expiresAt.getTime() <= now.getTime() || record.status === 'expired';
      if (isExpired && record.status !== 'cleaned') {
        expired.push({ ...record });
      }
    }
    return expired;
  }

  public async updateStatus(id: string, status: ShareStatus): Promise<void> {
    for (const record of this.records.values()) {
      if (record.id === id) {
        record.status = status;
        this.records.set(record.token, record);
        break;
      }
    }
  }

  public async updateStatusByToken(token: string, status: ShareStatus): Promise<void> {
    const record = this.records.get(token);
    if (record) {
      record.status = status;
      this.records.set(token, record);
    }
  }
}

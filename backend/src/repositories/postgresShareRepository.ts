import { Pool } from 'pg';
import { getPool } from '../config/database';
import { CreateShareDTO, ShareRecord, ShareStatus } from '../models/share';
import { IShareRepository } from './shareRepository.interface';

export class PostgresShareRepository implements IShareRepository {
  constructor(private pool?: Pool) {}

  private get client(): Pool {
    return this.pool || getPool();
  }

  private mapRowToRecord(row: any): ShareRecord {
    return {
      id: row.id,
      token: row.token,
      storageKey: row.storage_key,
      projectName: row.project_name,
      fileCount: parseInt(row.file_count, 10),
      originalSize: parseInt(row.original_size, 10),
      packageSize: parseInt(row.package_size, 10),
      excludedCount: parseInt(row.excluded_count, 10),
      sensitiveFileCount: parseInt(row.sensitive_file_count, 10),
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      downloadCount: parseInt(row.download_count, 10),
      lastDownloadedAt: row.last_downloaded_at ? new Date(row.last_downloaded_at) : null,
      status: row.status as ShareStatus,
      senderId: row.sender_id || null,
      passwordProtected: Boolean(row.password_protected),
      passwordHash: row.password_hash || null,
    };
  }

  public async create(data: CreateShareDTO): Promise<ShareRecord> {
    const query = `
      INSERT INTO shares (
        token,
        storage_key,
        project_name,
        file_count,
        original_size,
        package_size,
        excluded_count,
        sensitive_file_count,
        created_at,
        expires_at,
        download_count,
        status,
        sender_id,
        password_hash,
        password_protected
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *;
    `;

    const values = [
      data.token,
      data.storageKey,
      data.projectName,
      data.fileCount,
      data.originalSize,
      data.packageSize,
      data.excludedCount ?? 0,
      data.sensitiveFileCount ?? 0,
      data.createdAt || new Date(),
      data.expiresAt,
      0,
      data.status || 'active',
      data.senderId || null,
      data.passwordHash || null,
      data.passwordProtected ?? false,
    ];

    const result = await this.client.query(query, values);
    return this.mapRowToRecord(result.rows[0]);
  }

  public async findByToken(token: string): Promise<ShareRecord | null> {
    const query = `SELECT * FROM shares WHERE token = $1 LIMIT 1;`;
    const result = await this.client.query(query, [token]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToRecord(result.rows[0]);
  }

  public async findBySenderId(senderId: string): Promise<ShareRecord[]> {
    const query = `
      SELECT * FROM shares
      WHERE sender_id = $1
      ORDER BY created_at DESC
      LIMIT 100;
    `;
    const result = await this.client.query(query, [senderId]);
    return result.rows.map((row) => this.mapRowToRecord(row));
  }

  public async incrementDownloadCount(token: string): Promise<ShareRecord | null> {
    const query = `
      UPDATE shares
      SET download_count = download_count + 1,
          last_downloaded_at = NOW()
      WHERE token = $1
      RETURNING *;
    `;
    const result = await this.client.query(query, [token]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToRecord(result.rows[0]);
  }

  public async findExpired(now: Date = new Date()): Promise<ShareRecord[]> {
    const query = `
      SELECT * FROM shares
      WHERE (expires_at <= $1 OR status = 'expired')
        AND status != 'cleaned'
      ORDER BY expires_at ASC;
    `;
    const result = await this.client.query(query, [now]);
    return result.rows.map((row) => this.mapRowToRecord(row));
  }

  public async updateStatus(id: string, status: ShareStatus): Promise<void> {
    const query = `UPDATE shares SET status = $1 WHERE id = $2;`;
    await this.client.query(query, [status, id]);
  }

  public async updateStatusByToken(token: string, status: ShareStatus): Promise<void> {
    const query = `UPDATE shares SET status = $1 WHERE token = $2;`;
    await this.client.query(query, [status, token]);
  }
}

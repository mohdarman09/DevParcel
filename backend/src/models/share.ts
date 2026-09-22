export type ShareStatus = 'active' | 'expired' | 'revoked' | 'cleaned';

export interface ShareRecord {
  id: string; // PostgreSQL UUID
  token: string;
  storageKey: string;
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
  status: ShareStatus;
  senderId?: string | null;
  passwordProtected: boolean;
  passwordHash?: string | null;
}

export interface CreateShareDTO {
  token: string;
  storageKey: string;
  projectName: string;
  fileCount: number;
  originalSize: number;
  packageSize: number;
  excludedCount?: number;
  sensitiveFileCount?: number;
  createdAt?: Date;
  expiresAt: Date;
  status?: ShareStatus;
  senderId?: string | null;
  passwordProtected?: boolean;
  passwordHash?: string | null;
}

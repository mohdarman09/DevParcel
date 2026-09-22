export interface SharePublicMetadata {
  token: string;
  publicUrl: string;
  projectName: string;
  fileCount: number;
  originalSize: number;
  packageSize: number;
  excludedCount: number;
  sensitiveFileCount: number;
  createdAt: string;
  expiresAt: string;
  downloadCount: number;
  status: 'active' | 'expired' | 'revoked' | 'cleaned' | string;
  isPasswordProtected?: boolean;
}

export interface ShareApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ShareApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ShareApiResponse<T> = ShareApiSuccessResponse<T> | ShareApiErrorResponse;

export interface DownloadUrlData {
  downloadUrl: string;
  fileName: string;
}

export type PageStatus =
  | 'loading'
  | 'ready'
  | 'password_required'
  | 'expired'
  | 'revoked'
  | 'not_found'
  | 'error';

export type DownloadState = 'idle' | 'preparing' | 'started' | 'success' | 'error';


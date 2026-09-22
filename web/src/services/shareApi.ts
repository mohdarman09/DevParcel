import { DownloadUrlData, PageStatus, SharePublicMetadata } from '../types/share';
import { siteConfig } from '../config/siteConfig';

export class ShareApiError extends Error {
  constructor(
    public readonly pageStatus: PageStatus,
    public readonly code: string,
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'ShareApiError';
  }

  get userFriendlyMessage(): string {
    return this.message;
  }
}

/**
 * Fetches public share metadata for a given share token.
 * Validates and normalizes all metadata fields to ensure robust dynamic rendering.
 */
export async function fetchShareMetadata(
  token: string,
  signal?: AbortSignal
): Promise<SharePublicMetadata> {
  const url = `${siteConfig.apiBaseUrl}/api/v1/shares/${encodeURIComponent(token)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    throw new ShareApiError(
      'error',
      'NETWORK_ERROR',
      'Unable to connect to DevParcel servers. Please check your internet connection.',
      0
    );
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorCode = body?.error?.code || 'UNKNOWN_ERROR';
    const errorMessage = body?.error?.message || response.statusText;

    if (response.status === 404) {
      throw new ShareApiError('not_found', errorCode, errorMessage, 404);
    }

    if (response.status === 410) {
      if (errorCode === 'SHARE_REVOKED') {
        throw new ShareApiError('revoked', errorCode, errorMessage, 410);
      }
      throw new ShareApiError('expired', errorCode, errorMessage, 410);
    }

    if (response.status === 400) {
      // Invalid token syntax mapped to not_found to avoid leaking internal validation
      throw new ShareApiError('not_found', errorCode, errorMessage, 400);
    }

    throw new ShareApiError('error', errorCode, errorMessage, response.status);
  }

  if (!body || !body.success || !body.data) {
    throw new ShareApiError(
      'error',
      'INVALID_RESPONSE',
      'Invalid response from server.',
      response.status
    );
  }

  const raw = body.data;

  // External data normalization to guarantee runtime safety
  return {
    token: String(raw.token || token),
    publicUrl: String(raw.publicUrl || ''),
    projectName: String(raw.projectName || 'Untitled Project'),
    fileCount: Number(raw.fileCount) || 0,
    originalSize: Number(raw.originalSize) || 0,
    packageSize: Number(raw.packageSize) || 0,
    excludedCount: Number(raw.excludedCount) || 0,
    sensitiveFileCount: Number(raw.sensitiveFileCount) || 0,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    expiresAt: String(raw.expiresAt || new Date().toISOString()),
    downloadCount: Number(raw.downloadCount) || 0,
    status: (raw.status as any) || 'active',
    isPasswordProtected: Boolean(raw.isPasswordProtected),
  };
}

/**
 * Verifies a password for a protected project share and retrieves access ticket.
 */
export async function verifySharePassword(
  token: string,
  password: string
): Promise<{ verified: boolean; accessTicket: string; metadata: SharePublicMetadata }> {
  const url = `${siteConfig.apiBaseUrl}/api/v1/shares/${encodeURIComponent(token)}/verify-password`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ password }),
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    throw new ShareApiError(
      'error',
      'NETWORK_ERROR',
      'Unable to connect to DevParcel servers. Please check your connection.',
      0
    );
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorCode = body?.error?.code || 'VERIFICATION_FAILED';
    const errorMessage = body?.error?.message || 'Incorrect password.';

    if (response.status === 401) {
      throw new ShareApiError('password_required', errorCode, 'Incorrect password.', 401);
    }
    if (response.status === 429) {
      throw new ShareApiError(
        'password_required',
        errorCode,
        errorMessage || 'Too many incorrect attempts. Please wait 15 minutes before trying again.',
        429
      );
    }
    if (response.status === 410) {
      throw new ShareApiError('expired', errorCode, errorMessage, 410);
    }
    if (response.status === 404) {
      throw new ShareApiError('not_found', errorCode, errorMessage, 404);
    }

    throw new ShareApiError('password_required', errorCode, errorMessage, response.status);
  }

  if (!body || !body.success || !body.data?.accessTicket) {
    throw new ShareApiError(
      'error',
      'INVALID_RESPONSE',
      'Invalid response from server.',
      response.status
    );
  }

  const raw = body.data.metadata || body.data.share || {};
  const metadata: SharePublicMetadata = {
    token: String(raw.token || token),
    publicUrl: String(raw.publicUrl || ''),
    projectName: String(raw.projectName || 'Untitled Project'),
    fileCount: Number(raw.fileCount) || 0,
    originalSize: Number(raw.originalSize) || 0,
    packageSize: Number(raw.packageSize) || 0,
    excludedCount: Number(raw.excludedCount) || 0,
    sensitiveFileCount: Number(raw.sensitiveFileCount) || 0,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    expiresAt: String(raw.expiresAt || new Date().toISOString()),
    downloadCount: Number(raw.downloadCount) || 0,
    status: (raw.status as any) || 'active',
    isPasswordProtected: true,
  };

  return {
    verified: true,
    accessTicket: body.data.accessTicket,
    metadata,
  };
}

/**
 * Requests the short-lived pre-signed download URL for a share package.
 */
export async function requestDownloadUrl(
  token: string,
  accessTicket?: string | null,
  signal?: AbortSignal
): Promise<DownloadUrlData> {
  let url = `${siteConfig.apiBaseUrl}/api/v1/shares/${encodeURIComponent(token)}/download?format=json`;
  if (accessTicket) {
    url += `&ticket=${encodeURIComponent(accessTicket)}`;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (accessTicket) {
    headers['X-Access-Ticket'] = accessTicket;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    throw new ShareApiError(
      'error',
      'NETWORK_ERROR',
      'Unable to prepare download. Please check your connection.',
      0
    );
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorCode = body?.error?.code || 'DOWNLOAD_ERROR';
    const errorMessage = body?.error?.message || response.statusText;

    if (response.status === 410) {
      if (errorCode === 'SHARE_REVOKED') {
        throw new ShareApiError('revoked', errorCode, errorMessage, 410);
      }
      throw new ShareApiError('expired', errorCode, errorMessage, 410);
    }

    if (response.status === 404) {
      throw new ShareApiError('not_found', errorCode, errorMessage, 404);
    }

    throw new ShareApiError('error', errorCode, errorMessage, response.status);
  }

  if (!body || !body.success || !body.data?.downloadUrl) {
    throw new ShareApiError(
      'error',
      'DOWNLOAD_URL_MISSING',
      'Server did not return a valid download URL.',
      response.status
    );
  }

  return {
    downloadUrl: body.data.downloadUrl,
    fileName: body.data.fileName || 'project-package.zip',
  };
}

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface CreateSharePayload {
  projectName: string;
  fileCount: number;
  originalSize: number;
  packageSize: number;
  excludedCount: number;
  sensitiveFileCount: number;
  expiryHours: number;
  senderId?: string;
  password?: string;
}

export interface ShareLinkResult {
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
  downloadCount?: number;
  lastDownloadedAt?: string | null;
  status: string;
  isPasswordProtected?: boolean;
}

export interface UploadProgressInfo {
  stage: 'preparing' | 'uploading' | 'creating' | 'ready';
  percent: number;
  bytesUploaded: number;
  totalBytes: number;
  etaSeconds?: number;
}

export interface UploadShareOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  senderId?: string;
  onProgress?: (progress: UploadProgressInfo) => void;
}

export class BackendClient {
  /**
   * Uploads a packaged ZIP file and metadata to the DevParcel backend with true streaming progress tracking.
   */
  public static async uploadShare(
    backendUrl: string,
    zipFilePath: string,
    metadata: CreateSharePayload,
    options?: UploadShareOptions
  ): Promise<ShareLinkResult> {
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`ZIP package file not found at: ${zipFilePath}`);
    }

    const stat = fs.statSync(zipFilePath);
    const totalFileSize = stat.size;

    options?.onProgress?.({
      stage: 'preparing',
      percent: 0,
      bytesUploaded: 0,
      totalBytes: totalFileSize,
    });

    const boundary = `----DevParcelBoundary${Date.now()}${Math.random().toString(36).substring(2)}`;
    let preamble = '';
    const addField = (name: string, value: string) => {
      preamble += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
    };

    addField('projectName', metadata.projectName);
    addField('fileCount', String(metadata.fileCount));
    addField('originalSize', String(metadata.originalSize));
    addField('packageSize', String(metadata.packageSize));
    addField('excludedCount', String(metadata.excludedCount));
    addField('sensitiveFileCount', String(metadata.sensitiveFileCount));
    addField('expiryHours', String(metadata.expiryHours));
    if (metadata.senderId) {
      addField('senderId', metadata.senderId);
    }
    if (metadata.password) {
      addField('password', metadata.password);
    }

    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(zipFilePath)}"\r\nContent-Type: application/zip\r\n\r\n`;
    const epilogue = `\r\n--${boundary}--\r\n`;

    const preambleBuf = Buffer.from(preamble, 'utf-8');
    const fileHeaderBuf = Buffer.from(fileHeader, 'utf-8');
    const epilogueBuf = Buffer.from(epilogue, 'utf-8');
    const totalContentLength =
      preambleBuf.length + fileHeaderBuf.length + totalFileSize + epilogueBuf.length;

    const endpointUrl = new URL(`${backendUrl.replace(/\/+$/, '')}/api/v1/shares`);
    const isHttps = endpointUrl.protocol === 'https:';
    const clientModule = isHttps ? https : http;

    const timeoutMs = options?.timeoutMs ?? 90000;

    return new Promise<ShareLinkResult>((resolve, reject) => {
      let isSettled = false;
      let isTimedOut = false;
      let timer: NodeJS.Timeout | null = null;
      let fileStream: fs.ReadStream | null = null;

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (fileStream && !fileStream.destroyed) {
          fileStream.destroy();
        }
      };

      const fail = (err: Error) => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        reject(err);
      };

      const succeed = (result: ShareLinkResult) => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        options?.onProgress?.({
          stage: 'ready',
          percent: 100,
          bytesUploaded: totalFileSize,
          totalBytes: totalFileSize,
        });
        resolve(result);
      };

      timer = setTimeout(() => {
        isTimedOut = true;
        req.destroy();
        fail(
          new Error(
            'Cloud upload timed out. Please check your storage configuration or network connection.'
          )
        );
      }, timeoutMs);

      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          req.destroy();
          fail(new Error('Upload was cancelled.'));
        });
      }

      const reqOptions: http.RequestOptions = {
        method: 'POST',
        hostname: endpointUrl.hostname,
        port: endpointUrl.port || (isHttps ? 443 : 80),
        path: `${endpointUrl.pathname}${endpointUrl.search}`,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(totalContentLength),
          ...(metadata.senderId || options?.senderId
            ? { 'X-Sender-Id': metadata.senderId || options?.senderId }
            : {}),
        },
      };

      const req = clientModule.request(reqOptions, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf-8');
          let json: any = null;
          try {
            json = JSON.parse(rawBody);
          } catch {
            fail(
              new Error(
                `Invalid response received from DevParcel backend (HTTP ${res.statusCode}).`
              )
            );
            return;
          }

          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300 || !json?.success) {
            const errorMsg =
              json?.error?.message || `Upload failed with status code ${res.statusCode}`;
            fail(new Error(errorMsg));
            return;
          }

          succeed(json.data as ShareLinkResult);
        });
      });

      req.on('error', (err: any) => {
        if (isTimedOut) return;
        if (options?.signal?.aborted) return;
        fail(
          new Error(
            `Unable to reach DevParcel backend at ${backendUrl}: ${err.message || err}. Please ensure the backend is running.`
          )
        );
      });

      // Write headers and stream file
      req.write(preambleBuf);
      req.write(fileHeaderBuf);

      fileStream = fs.createReadStream(zipFilePath);
      let bytesUploaded = 0;
      const startTime = Date.now();

      fileStream.on('data', (chunk: Buffer) => {
        bytesUploaded += chunk.length;
        const percent = Math.min(
          99,
          Math.max(1, Math.round((bytesUploaded / (totalFileSize || 1)) * 100))
        );
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speed = bytesUploaded / (elapsedSec || 1);
        const remainingBytes = totalFileSize - bytesUploaded;
        const etaSeconds = Math.max(0, Math.round(remainingBytes / (speed || 1)));

        options?.onProgress?.({
          stage: 'uploading',
          percent,
          bytesUploaded,
          totalBytes: totalFileSize,
          etaSeconds,
        });
      });

      fileStream.on('end', () => {
        options?.onProgress?.({
          stage: 'creating',
          percent: 100,
          bytesUploaded: totalFileSize,
          totalBytes: totalFileSize,
        });
        req.write(epilogueBuf);
        req.end();
      });

      fileStream.on('error', (err) => {
        req.destroy();
        fail(new Error(`Failed to read ZIP file: ${err.message}`));
      });

      fileStream.pipe(req, { end: false });
    });
  }

  /**
   * Retrieves share history for the sender.
   */
  public static async getShareHistory(
    backendUrl: string,
    senderId: string,
    options?: { timeoutMs?: number }
  ): Promise<ShareLinkResult[]> {
    const endpoint = `${backendUrl.replace(/\/+$/, '')}/api/v1/shares/history`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 15000);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Sender-Id': senderId,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as any;
        throw new Error(json?.error?.message || `Failed to fetch history (HTTP ${response.status})`);
      }

      const json = (await response.json()) as any;
      return (json.data || []) as ShareLinkResult[];
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Revokes a share link.
   */
  public static async revokeShare(
    backendUrl: string,
    token: string,
    senderId: string,
    options?: { timeoutMs?: number }
  ): Promise<ShareLinkResult> {
    const endpoint = `${backendUrl.replace(/\/+$/, '')}/api/v1/shares/${encodeURIComponent(token)}/revoke`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 15000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Sender-Id': senderId,
        },
        body: JSON.stringify({ senderId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as any;
        throw new Error(json?.error?.message || `Failed to revoke share (HTTP ${response.status})`);
      }

      const json = (await response.json()) as any;
      return json.data as ShareLinkResult;
    } finally {
      clearTimeout(timeout);
    }
  }
}

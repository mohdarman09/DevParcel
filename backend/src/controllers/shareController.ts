import { Request, Response, NextFunction } from 'express';
import busboy from 'busboy';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { config } from '../config';
import { ShareService, ShareServiceError } from '../services/sharing/shareService';
import { sendSuccess, sendError } from '../utils/responseFormatter';

export class ShareController {
  constructor(private shareServiceInstance?: ShareService) {}

  private get shareService(): ShareService {
    return this.shareServiceInstance || new ShareService();
  }

  /**
   * Sweeps the temporary directory and safely removes any stale devparcel spool files older than 1 hour.
   */
  public static cleanStaleSpoolFiles(): void {
    try {
      const tmpDir = os.tmpdir();
      const files = fs.readdirSync(tmpDir);
      const now = Date.now();
      const oneHourMs = 60 * 60 * 1000;

      for (const file of files) {
        if (file.startsWith('devparcel-spool-') && file.endsWith('.zip')) {
          const filePath = path.join(tmpDir, file);
          try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > oneHourMs) {
              fs.unlinkSync(filePath);
              console.log(`[Backend Cleanup] Purged stale spool file: ${file}`);
            }
          } catch {
            // Ignore file access race conditions during sweep
          }
        }
      }
    } catch (err: any) {
      console.warn('[Backend Cleanup] Failed to sweep stale spool files:', err.message || err);
    }
  }

  /**
   * Handles streaming multipart ZIP upload and delegates share creation to ShareService.
   * POST /api/v1/shares
   */
  public createShare = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('[Backend] Share request received');

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      sendError(res, 'INVALID_CONTENT_TYPE', 'Request must be multipart/form-data.', 400);
      return;
    }

    const fields: Record<string, string> = {};
    let fileUploaded = false;
    let fileExceededLimit = false;
    let fileUploadError: Error | null = null;
    let fileSpoolPath: string | null = null;
    let fileWriteStream: fs.WriteStream | null = null;
    let isSpoolComplete = false;

    let readStream: fs.ReadStream | null = null;

    // Helper to safely remove spooled temporary file
    const cleanupSpooledFile = () => {
      if (fileWriteStream && !fileWriteStream.destroyed) {
        try {
          fileWriteStream.destroy();
        } catch {
          // Ignore
        }
      }
      if (readStream && !readStream.destroyed) {
        try {
          readStream.destroy();
        } catch {
          // Ignore
        }
      }
      if (fileSpoolPath && fs.existsSync(fileSpoolPath)) {
        try {
          fs.unlinkSync(fileSpoolPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    };

    try {
      const bb = busboy({
        headers: req.headers,
        limits: {
          fileSize: config.upload.maxSizeBytes,
          files: 1,
          fields: 15,
          fieldNameSize: 100,
          fieldSize: 10 * 1024, // 10 KB per field
          parts: 20,
        },
      });

      bb.on('field', (name, val) => {
        fields[name] = val;
      });

      bb.on('file', (name, fileStream, info) => {
        const mime = info.mimeType || '';
        const filename = info.filename || '';
        const isZip =
          mime === 'application/zip' ||
          mime === 'application/x-zip-compressed' ||
          mime === 'application/octet-stream' ||
          filename.toLowerCase().endsWith('.zip');

        if (!isZip) {
          fileUploadError = new ShareServiceError(
            'UNSUPPORTED_MEDIA_TYPE',
            'Only ZIP archives (.zip) are permitted.',
            415
          );
          fileStream.resume(); // Drain stream
          return;
        }

        fileUploaded = true;
        const randomSuffix = crypto.randomBytes(8).toString('hex');
        fileSpoolPath = path.join(os.tmpdir(), `devparcel-spool-${Date.now()}-${randomSuffix}.zip`);
        fileWriteStream = fs.createWriteStream(fileSpoolPath);

        fileStream.on('error', (err) => {
          fileUploadError = err;
        });

        fileStream.on('limit', () => {
          fileExceededLimit = true;
        });

        fileStream.pipe(fileWriteStream);

        fileWriteStream.on('finish', () => {
          isSpoolComplete = true;
        });

        fileWriteStream.on('error', (err) => {
          fileUploadError = err;
        });
      });

      bb.on('error', (err: any) => {
        cleanupSpooledFile();
        next(err);
      });

      bb.on('close', async () => {
        try {
          if (fileUploadError) {
            cleanupSpooledFile();
            const err = fileUploadError as ShareServiceError;
            sendError(res, err.code || 'UPLOAD_ERROR', err.message, err.statusCode || 500);
            return;
          }

          if (!fileUploaded || !fileSpoolPath) {
            sendError(res, 'NO_FILE_UPLOADED', 'A ZIP file must be provided in the request.', 400);
            return;
          }

          // Ensure writeStream is completely flushed and closed before reading
          if (fileWriteStream && !isSpoolComplete) {
            await new Promise<void>((resolve, reject) => {
              if (fileWriteStream!.writableEnded || fileWriteStream!.closed) {
                resolve();
              } else {
                fileWriteStream!.on('finish', () => resolve());
                fileWriteStream!.on('error', (err) => reject(err));
              }
            });
          }

          if (fileExceededLimit) {
            cleanupSpooledFile();
            sendError(
              res,
              'FILE_TOO_LARGE',
              `The uploaded file exceeds the maximum allowed size of ${config.upload.maxSizeMb} MB.`,
              413
            );
            return;
          }

          // Parse numeric inputs strictly with Number() so decimals/alphanumeric garbage (e.g. 3.14 or 24abc) are not silently truncated by parseInt
          const parseNumericField = (val: string | undefined): number | undefined => {
            if (val === undefined || val === '') return undefined;
            return Number(val);
          };

          const fileCount = parseNumericField(fields.fileCount) ?? NaN;
          const originalSize = parseNumericField(fields.originalSize) ?? NaN;
          const packageSize = parseNumericField(fields.packageSize) ?? 0;
          const excludedCount = parseNumericField(fields.excludedCount) ?? 0;
          const sensitiveFileCount = parseNumericField(fields.sensitiveFileCount) ?? 0;
          const expiryHours = parseNumericField(fields.expiryHours);

          // Fast fail validation before opening file readStream
          if (!fields.projectName || typeof fields.projectName !== 'string' || !fields.projectName.trim()) {
            throw new ShareServiceError('INVALID_METADATA', 'Project name is required.');
          }
          if (typeof fileCount !== 'number' || isNaN(fileCount) || fileCount < 0) {
            throw new ShareServiceError('INVALID_METADATA', 'File count must be a non-negative number.');
          }
          if (typeof originalSize !== 'number' || isNaN(originalSize) || originalSize < 0) {
            throw new ShareServiceError('INVALID_METADATA', 'Original size must be a non-negative number.');
          }
          const effExpiry = expiryHours ?? config.expiry.defaultHours;
          if (
            typeof effExpiry !== 'number' ||
            isNaN(effExpiry) ||
            !Number.isInteger(effExpiry) ||
            effExpiry < config.expiry.minHours ||
            effExpiry > config.expiry.maxHours
          ) {
            throw new ShareServiceError(
              'INVALID_EXPIRY',
              `Expiry must be an integer between ${config.expiry.minHours} and ${config.expiry.maxHours} hours.`
            );
          }

          console.log('[Backend] Upload started to cloud storage...');
          readStream = fs.createReadStream(fileSpoolPath);
          readStream.on('error', (err) => {
            console.warn('[Backend Spool] ReadStream error:', err.message || err);
          });

          // Delegate validation, storage upload, DB insertion, and compensating cleanup to ShareService
          const shareResult = await this.shareService.createShare({
            projectName: fields.projectName,
            fileCount,
            originalSize,
            packageSize,
            excludedCount,
            sensitiveFileCount,
            expiryHours,
            fileStream: readStream,
            senderId: (req.headers['x-sender-id'] as string) || fields.senderId,
            password: fields.password,
          });

          // Log safe masked token identifier without leaking full token
          const safeTokenId = shareResult.token.length > 8 ? `${shareResult.token.slice(0, 6)}...` : '***';
          console.log(`[Backend] Share created successfully! SafeTokenId: ${safeTokenId}`);
          sendSuccess(res, shareResult, 201);
        } catch (err: any) {
          if (err instanceof ShareServiceError) {
            sendError(res, err.code, err.message, err.statusCode);
            return;
          }
          next(err);
        } finally {
          cleanupSpooledFile();
        }
      });

      req.on('aborted', () => {
        cleanupSpooledFile();
      });

      req.pipe(bb);
    } catch (err) {
      cleanupSpooledFile();
      next(err);
    }
  };

  /**
   * Retrieves public metadata for a share.
   * GET /api/v1/shares/:token
   */
  public getShare = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const metadata = await this.shareService.getShareByToken(token);
      sendSuccess(res, metadata, 200);
    } catch (err) {
      if (err instanceof ShareServiceError) {
        sendError(res, err.code, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  };

  /**
   * Initiates download for a share package.
   * GET /api/v1/shares/:token/download
   */
  public downloadShare = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const accessTicket =
        (req.headers['x-access-ticket'] as string) || (req.query.ticket as string);

      const { downloadUrl, fileName } = await this.shareService.getDownloadUrlForShare(
        token,
        accessTicket
      );

      // If client requests JSON representation of the download URL
      if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
        sendSuccess(res, { downloadUrl, fileName }, 200);
        return;
      }

      // Standard browser download flow: 302 redirect to pre-signed URL
      res.redirect(302, downloadUrl);
    } catch (err) {
      if (err instanceof ShareServiceError) {
        sendError(res, err.code, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  };

  /**
   * Retrieves share history for the sender.
   * GET /api/v1/shares/history
   */
  public getShareHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const senderId =
        (req.headers['x-sender-id'] as string) || (req.query.senderId as string);

      if (!senderId || senderId.trim().length === 0) {
        sendError(
          res,
          'SENDER_ID_REQUIRED',
          'X-Sender-Id header is required to access share history.',
          401
        );
        return;
      }

      const history = await this.shareService.getShareHistory(senderId);
      sendSuccess(res, history, 200);
    } catch (err) {
      if (err instanceof ShareServiceError) {
        sendError(res, err.code, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  };

  /**
   * Revokes an active share link.
   * POST /api/v1/shares/:token/revoke
   */
  public revokeShare = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const senderId =
        (req.headers['x-sender-id'] as string) || req.body?.senderId;

      if (!senderId || typeof senderId !== 'string' || senderId.trim().length === 0) {
        sendError(
          res,
          'SENDER_ID_REQUIRED',
          'Sender identity (X-Sender-Id) is required to revoke a share link.',
          401
        );
        return;
      }

      const updatedShare = await this.shareService.revokeShare(token, senderId);
      sendSuccess(res, updatedShare, 200);
    } catch (err) {
      if (err instanceof ShareServiceError) {
        sendError(res, err.code, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  };

  /**
   * Verifies password for a protected share and returns download access ticket.
   * POST /api/v1/shares/:token/verify-password
   */
  public verifyPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const { password } = req.body || {};

      if (!password || typeof password !== 'string') {
        sendError(res, 'PASSWORD_REQUIRED', 'Password is required.', 400);
        return;
      }

      const result = await this.shareService.verifySharePassword(token, password);
      sendSuccess(res, result, 200);
    } catch (err) {
      if (err instanceof ShareServiceError) {
        sendError(res, err.code, err.message, err.statusCode);
        return;
      }
      next(err);
    }
  };
}

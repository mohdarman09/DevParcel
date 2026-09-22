import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import archiver from 'archiver';
import { ScannedFile } from '../scanner';
import { ZipOptions, ZipResult } from './zipTypes';

export class ZipEngine {
  /**
   * Packages the provided included files into a ZIP archive at targetPath.
   * Uses an atomic temporary file approach to prevent corrupted outputs on error or cancellation.
   */
  public static async createZip(
    includedFiles: ScannedFile[],
    targetPath: string,
    options?: ZipOptions
  ): Promise<ZipResult> {
    if (!includedFiles || includedFiles.length === 0) {
      throw new Error('No files provided to package.');
    }

    const resolvedTarget = path.resolve(targetPath);
    // Ensure the target directory exists safely (avoids EPERM on Windows drive roots)
    await this.ensureDirectoryExists(path.dirname(resolvedTarget));

    // Create unique temporary file path
    const tempFileName = `devparcel-temp-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    let archive: archiver.Archiver | null = null;
    let outputStream: fs.WriteStream | null = null;
    let isAborted = false;

    const cleanupTempFile = async (): Promise<void> => {
      try {
        if (outputStream && !outputStream.closed) {
          outputStream.destroy();
        }
      } catch {}
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch (cleanupErr: any) {
        console.warn('DevParcel: Failed to clean up temporary ZIP file:', cleanupErr.message);
      }
    };

    try {
      // Check cancellation before starting
      if (options?.cancellationToken?.isCancellationRequested) {
        throw new Error('ZIP creation was cancelled.');
      }

      outputStream = fs.createWriteStream(tempFilePath);
      const compressionLevel = typeof options?.compressionLevel === 'number'
        ? Math.min(Math.max(options.compressionLevel, 0), 9)
        : 9;

      archive = archiver('zip', {
        zlib: { level: compressionLevel }
      });

      const archivePromise = new Promise<void>((resolve, reject) => {
        if (!outputStream || !archive) {
          reject(new Error('Archiver failed to initialize.'));
          return;
        }

        outputStream.on('close', () => {
          resolve();
        });

        outputStream.on('error', (err) => {
          reject(err);
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.on('warning', (err) => {
          if (err.code === 'ENOENT') {
            console.warn('Archiver warning:', err);
          } else {
            reject(err);
          }
        });
      });

      archive.pipe(outputStream);

      // Track added paths to prevent duplicate entries
      const addedPaths = new Set<string>();
      let processedCount = 0;

      for (const file of includedFiles) {
        if (options?.cancellationToken?.isCancellationRequested) {
          isAborted = true;
          archive.abort();
          throw new Error('ZIP creation was cancelled.');
        }

        // Sanitize and validate archive entry path (Zip Slip prevention)
        const sanitizedEntryPath = this.sanitizeArchivePath(file.relativePath);
        if (!sanitizedEntryPath) {
          console.warn(`Skipping invalid or unsafe archive path: ${file.relativePath}`);
          continue;
        }

        if (addedPaths.has(sanitizedEntryPath)) {
          console.warn(`Duplicate path detected, skipping: ${sanitizedEntryPath}`);
          continue;
        }

        addedPaths.add(sanitizedEntryPath);

        // Append file to archive using source absolute path
        archive.file(file.absolutePath, { name: sanitizedEntryPath });

        processedCount++;
        if (options?.onProgress) {
          options.onProgress(processedCount, includedFiles.length, sanitizedEntryPath);
        }
      }

      if (addedPaths.size === 0) {
        archive.abort();
        throw new Error('No valid files could be added to the ZIP archive.');
      }

      // Finalize the archive (writes central directory)
      await archive.finalize();
      await archivePromise;

      // Verify the generated temporary file
      const stats = await fs.promises.stat(tempFilePath);
      if (stats.size === 0) {
        throw new Error('Generated ZIP archive is empty (0 bytes).');
      }

      // Move temporary file to final target destination (cross-device safe with verification)
      await this.moveFile(tempFilePath, resolvedTarget);

      return {
        outputPath: resolvedTarget,
        fileCount: addedPaths.size,
        zipSize: stats.size
      };
    } catch (err: any) {
      console.error('DevParcel: ZIP creation failed:', {
        message: err.message,
        code: err.code,
        syscall: err.syscall,
        path: err.path,
        targetPath: resolvedTarget,
        tempFilePath
      });
      if (archive && !isAborted) {
        try {
          archive.abort();
        } catch {
          // Ignore abort errors
        }
      }
      await cleanupTempFile();
      throw err;
    }
  }

  /**
   * Ensures the target directory exists without attempting mkdir on existing directories or Windows drive roots.
   */
  public static async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      const stat = await fs.promises.stat(dirPath);
      if (!stat.isDirectory()) {
        throw new Error(`Target path directory is not a directory: ${dirPath}`);
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        await fs.promises.mkdir(dirPath, { recursive: true });
      } else {
        throw err;
      }
    }
  }

  /**
   * Sanitizes an archive entry path to prevent Zip Slip and invalid paths:
   * - Normalizes to forward slashes
   * - Strips leading slashes
   * - Rejects path traversal sequences ('..')
   * - Rejects drive letters (e.g. 'C:')
   */
  public static sanitizeArchivePath(rawPath: string): string | null {
    if (!rawPath || typeof rawPath !== 'string') {
      return null;
    }

    // Normalize slashes
    let normalized = rawPath.replace(/\\/g, '/');

    // Reject drive letters
    if (/^[a-zA-Z]:/.test(normalized)) {
      return null;
    }

    // Strip leading slashes
    normalized = normalized.replace(/^\/+/, '');

    // Check for directory traversal
    const segments = normalized.split('/');
    for (const segment of segments) {
      if (segment === '..') {
        return null;
      }
    }

    // Filter out empty segments or dot segments
    const cleanSegments = segments.filter(s => s.length > 0 && s !== '.');
    if (cleanSegments.length === 0) {
      return null;
    }

    return cleanSegments.join('/');
  }

  /**
   * Atomically moves a file, falling back to verified copy+unlink across volumes or on Windows locked/overwritten targets.
   */
  private static async moveFile(source: string, destination: string): Promise<void> {
    const sourceStats = await fs.promises.stat(source);

    // Try atomic rename first (efficient when on the same drive/volume)
    try {
      await fs.promises.rename(source, destination);
      return;
    } catch (err: any) {
      // On Windows, rename across volumes (EXDEV) or overwriting in certain configurations (EPERM / EACCES / EEXIST / EBUSY)
      // requires copying the finalized archive and verifying before unlinking the source.
      console.log(`DevParcel: Rename failed (${err.code || err.message}), falling back to copy+unlink...`);
    }

    // Safe copy fallback
    await fs.promises.copyFile(source, destination);

    // Verify destination file exists and size matches source
    const destStats = await fs.promises.stat(destination);
    if (destStats.size !== sourceStats.size) {
      try {
        await fs.promises.unlink(destination);
      } catch {}
      throw new Error(`Destination file verification failed (size mismatch: expected ${sourceStats.size}, got ${destStats.size}).`);
    }

    // Only after destination is verified, remove the temporary source file
    try {
      await fs.promises.unlink(source);
    } catch (unlinkErr: any) {
      console.warn('DevParcel: Could not remove temporary file after successful copy:', unlinkErr.message);
    }
  }
}

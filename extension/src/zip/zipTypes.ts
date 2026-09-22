import { CancellationTokenLike } from '../scanner';

export interface ZipOptions {
  /** Optional cancellation token to abort ZIP creation */
  cancellationToken?: CancellationTokenLike;
  /** Compression level from 0 (uncompressed) to 9 (maximum compression). Default: 9 */
  compressionLevel?: number;
  /** Optional progress callback invoked as files are added to the archive */
  onProgress?: (processed: number, total: number, currentFile: string) => void;
}

export interface ZipResult {
  /** Absolute path where the finished ZIP archive is saved */
  outputPath: string;
  /** Number of files included in the archive */
  fileCount: number;
  /** Total size in bytes of the generated ZIP archive */
  zipSize: number;
}

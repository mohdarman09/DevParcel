import { CancellationTokenLike, ProjectSummaryData } from '../types';

export interface WebSharePayload {
  summary: ProjectSummaryData;
  showSummary: boolean;
  packageSize: number;
  packagedFiles: number;
  fileName: string;
  tempZipPath: string;
  bytes: Uint8Array;
}

export interface IWebviewShareBridge {
  readonly isResolved: boolean;
  isWebShareAvailable(): boolean;
  prepareWebShare(data: WebSharePayload): Promise<'shared' | 'cancelled' | 'fallback' | 'failed'>;
  resetToIdle(): void;
}

export interface ShareOptions {
  /** Optional cancellation token to abort sharing */
  cancellationToken?: CancellationTokenLike;
  /** Optional custom title or message for sharing */
  title?: string;
  /** Project name for display */
  projectName?: string;
  /** Project summary data from scanner/summary builder */
  summary?: ProjectSummaryData;
  /** Whether the user has enabled the Project Summary view */
  showSummary?: boolean;
  /** Total compressed package size in bytes */
  packageSize?: number;
  /** Total file count in the package */
  fileCount?: number;
  /** Total original uncompressed size in bytes */
  totalSize?: number;
  /** Webview bridge for direct Web Share API invocation */
  viewBridge?: IWebviewShareBridge;
}

export interface ShareResult {
  /** Whether the sharing operation completed successfully (or fallback succeeded) */
  success: boolean;
  /** Identifier of the provider that handled the request */
  provider: string;
  /** Whether the user cancelled the share operation */
  cancelled?: boolean;
  /** Whether the operation was fulfilled via a supported fallback */
  isFallback?: boolean;
  /** Informational or status message */
  message?: string;
  /** Error message if the operation failed */
  error?: string;
}

export interface ISharingProvider {
  /** Unique provider identifier (e.g. 'windows-share', 'macos-share', 'linux-share') */
  readonly id: string;
  /** Human-readable provider name */
  readonly name: string;
  /** Whether this provider is supported in the current runtime environment */
  readonly isSupported: boolean;
  /** Checks if this provider can share the given file path */
  canShare(filePath: string): boolean;
  /** Executes the sharing operation for the given file path */
  share(filePath: string, options?: ShareOptions): Promise<ShareResult>;
}

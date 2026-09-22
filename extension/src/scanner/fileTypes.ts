export interface ScannedFile {
  /** Absolute filesystem path (used internally for file operations) */
  absolutePath: string;
  /** Workspace-relative path with normalized forward slashes (e.g., 'src/App.jsx') */
  relativePath: string;
  /** File size in bytes */
  size: number;
}

export interface ExcludedPath {
  /** Workspace-relative path or pattern with normalized forward slashes */
  relativePath: string;
  /** Human-readable explanation of why the path was excluded */
  reason: string;
  /** Whether the excluded item is a directory */
  isDirectory: boolean;
}

export interface ScannerError {
  /** Workspace-relative path where the error occurred */
  relativePath: string;
  /** Safe, non-sensitive error message */
  message: string;
  /** Optional error code (e.g., 'EACCES', 'EPERM') */
  code?: string;
}

export interface ScanResult {
  /** Root directory of the scanned workspace */
  workspaceRoot: string;
  /** Name of the project/workspace folder */
  projectName: string;
  /** List of files included in the package */
  includedFiles: ScannedFile[];
  /** List of paths/directories excluded from the package */
  excludedPaths: ExcludedPath[];
  /** Total count of included files */
  fileCount: number;
  /** Total count of excluded path entries */
  excludedCount: number;
  /** Total size in bytes of all included files */
  totalSize: number;
  /** Any non-fatal errors encountered during scanning */
  errors: ScannerError[];
}

export interface ExclusionRule {
  /** The original pattern string (e.g. 'node_modules/', '.env.*') */
  rawPattern: string;
  /** Whether this rule is part of DevParcel's default exclusion set */
  isDefault: boolean;
  /** Matching function returning true if path matches the rule */
  match: (relativePath: string, isDirectory: boolean) => boolean;
  /** Description for tracking why a path was excluded */
  reason: string;
}

export interface CancellationTokenLike {
  isCancellationRequested: boolean;
}

export interface ScanOptions {
  /** Optional cancellation token to abort long-running scans */
  cancellationToken?: CancellationTokenLike;
  /** Custom exclusion patterns to combine with or override defaults */
  customExclusions?: string[];
  /** Optional override for default exclusion patterns (defaults to DEFAULT_EXCLUSIONS) */
  defaultExclusions?: readonly string[];
  /** Whether to follow symlinks/reparse points (default: false for security) */
  followSymlinks?: boolean;
  /** Optional progress callback invoked as files are scanned */
  onProgress?: (scannedCount: number) => void;
}

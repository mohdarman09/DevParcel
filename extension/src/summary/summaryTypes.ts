import { ExcludedPath } from '../scanner';
import { SensitiveFileResult } from '../security';

export interface ProjectSummaryData {
  projectName: string;
  workspaceRoot: string;
  fileCount: number;
  totalSize: number; // in bytes
  excludedCount: number;
  excludedPaths: ExcludedPath[];
  sensitiveFiles: SensitiveFileResult[];
  hasSensitiveFiles: boolean;
  scanStatus: 'ready' | 'warning' | 'error';
  zipSize?: number;
}

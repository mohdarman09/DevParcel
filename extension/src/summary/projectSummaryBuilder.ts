import { ScanResult } from '../scanner';
import { SecurityScanResult } from '../security';
import { ProjectSummaryData } from './summaryTypes';

export class ProjectSummaryBuilder {
  /**
   * Constructs a ProjectSummaryData model strictly using the provided ScanResult
   * and SecurityScanResult without re-scanning or inventing data.
   */
  public static build(
    scanResult: ScanResult,
    securityResult: SecurityScanResult
  ): ProjectSummaryData {
    let scanStatus: 'ready' | 'warning' | 'error' = 'ready';
    if (securityResult.hasSensitiveFiles) {
      scanStatus = 'warning';
    } else if (scanResult.errors.length > 0) {
      scanStatus = 'error';
    }

    return {
      projectName: scanResult.projectName,
      workspaceRoot: scanResult.workspaceRoot,
      fileCount: scanResult.fileCount,
      totalSize: scanResult.totalSize,
      excludedCount: scanResult.excludedCount,
      excludedPaths: scanResult.excludedPaths,
      sensitiveFiles: securityResult.sensitiveFiles,
      hasSensitiveFiles: securityResult.hasSensitiveFiles,
      scanStatus
    };
  }
}

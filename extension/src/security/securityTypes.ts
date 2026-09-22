export type SensitiveCategory =
  | 'environment'
  | 'private-key'
  | 'certificate'
  | 'credential';

export interface SensitiveFileRule {
  id: string;
  category: SensitiveCategory;
  name: string;
  description: string;
  match: (relativePath: string, fileName: string) => boolean;
}

export interface SensitiveFileResult {
  /** Workspace-relative path of the detected sensitive file */
  relativePath: string;
  /** Identifier of the rule that matched */
  ruleId: string;
  /** Categorization of the sensitive file */
  category: SensitiveCategory;
  /** Human-readable explanation of why the file is flagged */
  reason: string;
}

export interface SecurityScanResult {
  /** Whether any sensitive files were detected in the inspected file list */
  hasSensitiveFiles: boolean;
  /** List of detected sensitive files */
  sensitiveFiles: SensitiveFileResult[];
  /** Total count of detected sensitive files */
  count: number;
}

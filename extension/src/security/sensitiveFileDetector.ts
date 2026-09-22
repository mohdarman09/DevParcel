import { ScannedFile } from '../scanner';
import {
  SensitiveFileRule,
  SensitiveFileResult,
  SecurityScanResult
} from './securityTypes';

/** Safe template files that must NOT be flagged as sensitive */
const TEMPLATE_EXEMPTIONS = new Set([
  '.env.example',
  '.env.sample',
  '.env.template'
]);

export class SensitiveFileDetector {
  private static readonly RULES: SensitiveFileRule[] = [
    // 1. Environment files
    {
      id: 'env-file',
      category: 'environment',
      name: 'Environment Configuration',
      description: 'Environment file likely containing secrets or configuration variables.',
      match: (_relPath, fileName) => {
        const lower = fileName.toLowerCase();
        if (TEMPLATE_EXEMPTIONS.has(lower)) {
          return false;
        }
        if (lower === '.env') {
          return true;
        }
        if (lower.startsWith('.env.') && lower.length > 5) {
          return true;
        }
        return false;
      }
    },

    // 2. Private Keys
    {
      id: 'private-key',
      category: 'private-key',
      name: 'Private Key',
      description: 'Cryptographic private key file.',
      match: (_relPath, fileName) => {
        const lower = fileName.toLowerCase();
        // Exact matches for common SSH private key basenames
        if (['id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519'].includes(lower)) {
          return true;
        }
        // Extension matches (ensure dot prefix)
        if (lower.endsWith('.key') || lower.endsWith('.pem')) {
          return true;
        }
        return false;
      }
    },

    // 3. Certificates & Keystores
    {
      id: 'certificate-keystore',
      category: 'certificate',
      name: 'Certificate / Keystore',
      description: 'PKCS#12 or Java Keystore archive containing certificates or private credentials.',
      match: (_relPath, fileName) => {
        const lower = fileName.toLowerCase();
        return (
          lower.endsWith('.p12') ||
          lower.endsWith('.pfx') ||
          lower.endsWith('.keystore') ||
          lower.endsWith('.jks')
        );
      }
    },

    // 4. Credential files
    {
      id: 'credential-file',
      category: 'credential',
      name: 'Credential File',
      description: 'Configuration file often containing API credentials or service account tokens.',
      match: (_relPath, fileName) => {
        const lower = fileName.toLowerCase();
        if (
          lower === 'credentials.json' ||
          lower === 'serviceaccountkey.json' ||
          lower === 'service-account.json' ||
          lower === 'client_secret.json'
        ) {
          return true;
        }
        if (lower.startsWith('client_secret') && lower.endsWith('.json')) {
          return true;
        }
        if (lower.endsWith('.secret')) {
          return true;
        }
        return false;
      }
    }
  ];

  /**
   * Evaluates an individual file to determine if it is sensitive.
   */
  public static isSensitiveFile(
    relativePath: string,
    fileName: string
  ): SensitiveFileResult | null {
    const normalizedRel = relativePath.replace(/\\/g, '/');
    const baseName = fileName || normalizedRel.split('/').pop() || '';

    for (const rule of this.RULES) {
      if (rule.match(normalizedRel, baseName)) {
        return {
          relativePath: normalizedRel,
          ruleId: rule.id,
          category: rule.category,
          reason: rule.description
        };
      }
    }

    return null;
  }

  /**
   * Scans a list of included files for sensitive files based purely on filenames and relative paths.
   * Does NOT open or read file contents.
   */
  public static detect(includedFiles: ScannedFile[]): SecurityScanResult {
    const sensitiveFiles: SensitiveFileResult[] = [];

    for (const file of includedFiles) {
      const fileName = file.relativePath.split('/').pop() || '';
      const result = this.isSensitiveFile(file.relativePath, fileName);
      if (result) {
        sensitiveFiles.push(result);
      }
    }

    return {
      hasSensitiveFiles: sensitiveFiles.length > 0,
      sensitiveFiles,
      count: sensitiveFiles.length
    };
  }
}

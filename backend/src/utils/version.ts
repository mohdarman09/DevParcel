import fs from 'fs';
import path from 'path';

let cachedVersion: string | null = null;

/**
 * Dynamically resolves the application version from package.json metadata.
 * Caches the result after the initial read to eliminate redundant filesystem I/O.
 */
export function getAppVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  const candidatePaths = [
    path.resolve(__dirname, '../../package.json'),
    path.resolve(process.cwd(), 'package.json'),
    path.resolve(process.cwd(), 'backend/package.json'),
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        const fileContent = fs.readFileSync(candidate, 'utf-8');
        const pkg = JSON.parse(fileContent);
        if (pkg && typeof pkg.version === 'string' && pkg.version.trim()) {
          const versionStr = pkg.version.trim();
          cachedVersion = versionStr;
          return versionStr;
        }
      }
    } catch {
      // Continue to next candidate if parsing or reading fails
    }
  }

  cachedVersion = '0.1.0';
  return cachedVersion;
}

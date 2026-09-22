import { ExclusionRule } from './fileTypes';

export const DEFAULT_EXCLUSIONS: readonly string[] = [
  'node_modules/',
  '.git/',
  '.env',
  '.env.*',
  'dist/',
  'build/',
  '.cache/',
  '.next/',
  'coverage/'
];

/** File extensions/names that represent safe templates and should NOT be automatically excluded by .env.* wildcard */
const ENV_TEMPLATE_EXEMPTIONS = new Set([
  '.env.example',
  '.env.sample',
  '.env.template'
]);

export class ExclusionEngine {
  private readonly rules: ExclusionRule[] = [];

  constructor(customExclusions: string[] = [], defaultExclusions: readonly string[] = DEFAULT_EXCLUSIONS) {
    this.initRules(defaultExclusions, customExclusions);
  }

  private initRules(defaultExclusions: readonly string[], customExclusions: string[]): void {
    // 1. Process default exclusions
    for (const pattern of defaultExclusions) {
      const trimmed = pattern.trim();
      if (trimmed) {
        this.rules.push(this.compileRule(trimmed, true));
      }
    }

    // 2. Process custom user-configured exclusions
    for (const pattern of customExclusions) {
      const trimmed = pattern.trim();
      if (trimmed) {
        // Avoid duplicate exact patterns
        if (!this.rules.some(r => r.rawPattern === trimmed)) {
          this.rules.push(this.compileRule(trimmed, false));
        }
      }
    }
  }

  private compileRule(rawPattern: string, isDefault: boolean): ExclusionRule {
    const normalizedPattern = rawPattern.replace(/\\/g, '/');
    const isDirOnly = normalizedPattern.endsWith('/');
    const patternWithoutTrailingSlash = isDirOnly ? normalizedPattern.slice(0, -1) : normalizedPattern;
    const hasPathSlash = patternWithoutTrailingSlash.includes('/');

    const prefix = isDefault ? 'Default exclusion' : 'Configured exclusion';
    const reason = `${prefix}: ${rawPattern}`;

    // Special handling for .env.* wildcard pattern:
    // It must match .env.local, .env.production, etc., but MUST NOT automatically match .env.example / .env.sample / .env.template
    if (normalizedPattern === '.env.*' || normalizedPattern === '.env.*') {
      return {
        rawPattern,
        isDefault,
        reason,
        match: (relPath: string, isDirectory: boolean) => {
          if (isDirectory) {
            return false;
          }
          const baseName = this.getBaseName(relPath).toLowerCase();
          // Check if it starts with .env.
          if (baseName.startsWith('.env.') && baseName.length > 5) {
            // Check template exemption
            if (ENV_TEMPLATE_EXEMPTIONS.has(baseName)) {
              // Not automatically excluded by wildcard
              return false;
            }
            return true;
          }
          return false;
        }
      };
    }

    // Exact filename match like '.env'
    if (normalizedPattern === '.env') {
      return {
        rawPattern,
        isDefault,
        reason,
        match: (relPath: string, isDirectory: boolean) => {
          if (isDirectory) {
            return false;
          }
          const baseName = this.getBaseName(relPath).toLowerCase();
          return baseName === '.env';
        }
      };
    }

    // Pattern matching logic
    const regex = this.globToRegex(patternWithoutTrailingSlash, !hasPathSlash);

    return {
      rawPattern,
      isDefault,
      reason,
      match: (relPath: string, isDirectory: boolean) => {
        const normalizedRel = relPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        const targetName = isDirOnly ? (isDirectory ? normalizedRel : null) : normalizedRel;

        if (targetName === null) {
          return false;
        }

        // If the pattern had no slash, we test against the basename as well as the full relative path
        if (!hasPathSlash) {
          const baseName = this.getBaseName(normalizedRel);
          if (regex.test(baseName)) {
            return true;
          }
        }

        return regex.test(normalizedRel);
      }
    };
  }

  private globToRegex(glob: string, matchBasename: boolean): RegExp {
    // Escape special regex characters except * and ?
    let regexStr = '';
    let i = 0;
    while (i < glob.length) {
      const char = glob[i];
      if (char === '*') {
        if (glob[i + 1] === '*') {
          // Double star: matches across slashes
          regexStr += '.*';
          i += 2;
          if (glob[i] === '/') {
            regexStr += '/?';
            i++;
          }
          continue;
        } else {
          // Single star: matches anything except slash
          regexStr += '[^/]*';
          i++;
          continue;
        }
      } else if (char === '?') {
        regexStr += '[^/]';
        i++;
        continue;
      } else if (['.', '+', '^', '$', '(', ')', '[', ']', '{', '}', '|', '\\'].includes(char)) {
        regexStr += '\\' + char;
        i++;
        continue;
      } else {
        regexStr += char;
        i++;
      }
    }

    // If matching basename, allow anchoring to exact segment
    if (matchBasename) {
      return new RegExp(`^${regexStr}$`, 'i');
    }

    return new RegExp(`(?:^|/)${regexStr}(?:$|/)`, 'i');
  }

  private getBaseName(pathStr: string): string {
    const parts = pathStr.split('/');
    return parts[parts.length - 1] || pathStr;
  }

  /**
   * Check if a directory should be excluded from scanning.
   * If excluded, the scanner will NOT recurse into it.
   */
  public shouldExcludeDirectory(relativePath: string, dirName: string): { excluded: boolean; reason?: string } {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

    for (const rule of this.rules) {
      // Check directory match
      if (rule.match(normalized, true) || rule.match(dirName, true)) {
        return { excluded: true, reason: rule.reason };
      }
    }

    return { excluded: false };
  }

  /**
   * Check if a file should be excluded from scanning.
   */
  public shouldExcludeFile(relativePath: string, fileName: string): { excluded: boolean; reason?: string } {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

    for (const rule of this.rules) {
      if (rule.match(normalized, false) || rule.match(fileName, false)) {
        return { excluded: true, reason: rule.reason };
      }
    }

    return { excluded: false };
  }

  public getRules(): readonly ExclusionRule[] {
    return this.rules;
  }
}

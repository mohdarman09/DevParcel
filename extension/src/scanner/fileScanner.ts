import * as fs from 'fs';
import * as path from 'path';
import { ExclusionEngine } from './exclusionEngine';
import {
  ScanOptions,
  ScanResult,
  ScannedFile,
  ExcludedPath,
  ScannerError
} from './fileTypes';

export class FileScanner {
  private readonly exclusionEngine: ExclusionEngine;

  constructor(customExclusions: string[] = [], defaultExclusions?: readonly string[]) {
    this.exclusionEngine = new ExclusionEngine(customExclusions, defaultExclusions);
  }

  /**
   * Recursively scan files inside the workspace root adhering to boundary and exclusion rules.
   */
  public async scan(workspaceRoot: string, options?: ScanOptions): Promise<ScanResult> {
    const resolvedRoot = path.resolve(workspaceRoot);
    const projectName = path.basename(resolvedRoot) || 'Workspace';

    const includedFiles: ScannedFile[] = [];
    const excludedPaths: ExcludedPath[] = [];
    const errors: ScannerError[] = [];

    // Verify workspace boundary exists and is accessible
    try {
      const rootStat = await fs.promises.stat(resolvedRoot);
      if (!rootStat.isDirectory()) {
        errors.push({
          relativePath: '',
          message: 'Specified workspace root is not a directory.',
          code: 'ENOTDIR'
        });
        return this.buildResult(resolvedRoot, projectName, includedFiles, excludedPaths, errors);
      }
    } catch (err: any) {
      errors.push({
        relativePath: '',
        message: 'Unable to access workspace root directory.',
        code: err.code || 'EACCES'
      });
      return this.buildResult(resolvedRoot, projectName, includedFiles, excludedPaths, errors);
    }

    // Traverse directory tree
    await this.scanDirectory(
      resolvedRoot,
      resolvedRoot,
      includedFiles,
      excludedPaths,
      errors,
      options
    );

    return this.buildResult(resolvedRoot, projectName, includedFiles, excludedPaths, errors);
  }

  private async scanDirectory(
    currentDir: string,
    workspaceRoot: string,
    includedFiles: ScannedFile[],
    excludedPaths: ExcludedPath[],
    errors: ScannerError[],
    options?: ScanOptions
  ): Promise<void> {
    if (options?.cancellationToken?.isCancellationRequested) {
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch (err: any) {
      const relPath = this.toRelativePath(currentDir, workspaceRoot);
      errors.push({
        relativePath: relPath,
        message: 'Could not read directory contents.',
        code: err.code || 'EACCES'
      });
      excludedPaths.push({
        relativePath: relPath.endsWith('/') ? relPath : `${relPath}/`,
        reason: 'Restricted or inaccessible directory',
        isDirectory: true
      });
      return;
    }

    for (const entry of entries) {
      if (options?.cancellationToken?.isCancellationRequested) {
        return;
      }

      const fullPath = path.join(currentDir, entry.name);

      // Boundary safety check: ensure path does not escape workspace
      if (!this.isInsideWorkspace(fullPath, workspaceRoot)) {
        errors.push({
          relativePath: entry.name,
          message: 'Path escapes workspace boundary.',
          code: 'EESCAPE'
        });
        continue;
      }

      const relPath = this.toRelativePath(fullPath, workspaceRoot);

      // Handle symlinks and reparse points conservatively
      if (entry.isSymbolicLink()) {
        excludedPaths.push({
          relativePath: relPath,
          reason: 'Symlink or reparse point skipped for safety',
          isDirectory: false
        });
        continue;
      }

      if (entry.isDirectory()) {
        // Check directory exclusion
        const check = this.exclusionEngine.shouldExcludeDirectory(relPath, entry.name);
        if (check.excluded) {
          // Immediately prune excluded directory without traversing into it
          const displayPath = relPath.endsWith('/') ? relPath : `${relPath}/`;
          excludedPaths.push({
            relativePath: displayPath,
            reason: check.reason || 'Directory excluded by pattern',
            isDirectory: true
          });
          continue;
        }

        // Recursively scan valid subdirectory
        await this.scanDirectory(
          fullPath,
          workspaceRoot,
          includedFiles,
          excludedPaths,
          errors,
          options
        );
      } else if (entry.isFile()) {
        // Check file exclusion
        const check = this.exclusionEngine.shouldExcludeFile(relPath, entry.name);
        if (check.excluded) {
          excludedPaths.push({
            relativePath: relPath,
            reason: check.reason || 'File excluded by pattern',
            isDirectory: false
          });
          continue;
        }

        // Query file metadata (size) without reading file content into memory
        try {
          const stat = await fs.promises.stat(fullPath);
          includedFiles.push({
            absolutePath: fullPath,
            relativePath: relPath,
            size: stat.size
          });

          if (options?.onProgress) {
            options.onProgress(includedFiles.length);
          }
        } catch (err: any) {
          errors.push({
            relativePath: relPath,
            message: 'Could not read file metadata.',
            code: err.code || 'EACCES'
          });
          excludedPaths.push({
            relativePath: relPath,
            reason: 'Unreadable or restricted file',
            isDirectory: false
          });
        }
      }
    }
  }

  /**
   * Validates that the target path is strictly contained within the workspace root.
   */
  private isInsideWorkspace(targetPath: string, workspaceRoot: string): boolean {
    const rel = path.relative(workspaceRoot, targetPath);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
  }

  /**
   * Converts an absolute path to a workspace-relative path with normalized forward slashes.
   */
  private toRelativePath(targetPath: string, workspaceRoot: string): string {
    const rel = path.relative(workspaceRoot, targetPath);
    return rel.replace(/\\/g, '/');
  }

  private buildResult(
    workspaceRoot: string,
    projectName: string,
    includedFiles: ScannedFile[],
    excludedPaths: ExcludedPath[],
    errors: ScannerError[]
  ): ScanResult {
    let totalSize = 0;
    for (const file of includedFiles) {
      totalSize += file.size;
    }

    return {
      workspaceRoot,
      projectName,
      includedFiles,
      excludedPaths,
      fileCount: includedFiles.length,
      excludedCount: excludedPaths.length,
      totalSize,
      errors
    };
  }
}

/**
 * Convenience helper to scan a workspace root using optional custom exclusions and scan options.
 */
export async function scanWorkspace(
  workspaceRoot: string,
  options?: ScanOptions
): Promise<ScanResult> {
  const scanner = new FileScanner(options?.customExclusions || [], options?.defaultExclusions);
  return scanner.scan(workspaceRoot, options);
}

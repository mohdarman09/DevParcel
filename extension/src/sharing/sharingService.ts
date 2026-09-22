import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { ISharingProvider, ShareOptions, ShareResult } from './sharingTypes';
import { WindowsShareProvider } from './providers/windowsShareProvider';
import { MacOSShareProvider } from './providers/macOSShareProvider';
import { LinuxShareProvider } from './providers/linuxShareProvider';
import { UnsupportedShareProvider } from './providers/unsupportedShareProvider';

export class SharingService {
  private readonly _provider: ISharingProvider;
  private static readonly trackedTemporaryPaths = new Set<string>();

  constructor(provider?: ISharingProvider) {
    if (provider) {
      this._provider = provider;
    } else {
      switch (process.platform) {
        case 'win32':
          this._provider = new WindowsShareProvider();
          break;
        case 'darwin':
          this._provider = new MacOSShareProvider();
          break;
        case 'linux':
          this._provider = new LinuxShareProvider();
          break;
        default:
          this._provider = new UnsupportedShareProvider();
          break;
      }
    }
  }

  public get provider(): ISharingProvider {
    return this._provider;
  }

  /**
   * Generates a safe, unique temporary file path outside the workspace in the OS temp directory.
   */
  public static createTemporarySharePath(projectName: string = 'project'): string {
    const safeProjectName = (projectName || 'project').replace(/[\\/:*?"<>|]/g, '_');
    const uniqueId = `devparcel-share-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tempDir = path.join(os.tmpdir(), uniqueId);

    fs.mkdirSync(tempDir, { recursive: true });

    const zipPath = path.join(tempDir, `${safeProjectName}.zip`);
    SharingService.trackedTemporaryPaths.add(zipPath);
    return zipPath;
  }

  /**
   * Checks if a path was created as a DevParcel temporary share file.
   */
  public static isTrackedTemporaryPath(filePath: string): boolean {
    if (!filePath) return false;
    const normalized = path.normalize(filePath);
    return (
      SharingService.trackedTemporaryPaths.has(filePath) ||
      SharingService.trackedTemporaryPaths.has(normalized) ||
      (normalized.startsWith(os.tmpdir()) && path.basename(path.dirname(normalized)).startsWith('devparcel-share-'))
    );
  }

  /**
   * Safely deletes a DevParcel-owned temporary share file and its parent folder.
   * Never deletes user-created files or files outside DevParcel temporary folders.
   */
  public static cleanupTemporaryShareFile(filePath: string): boolean {
    if (!SharingService.isTrackedTemporaryPath(filePath)) {
      // Refuse to clean up untracked or arbitrary files
      return false;
    }

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const parentDir = path.dirname(filePath);
      if (path.basename(parentDir).startsWith('devparcel-share-')) {
        try {
          fs.rmdirSync(parentDir);
        } catch {
          // Parent dir may still have files or will be cleaned up later
        }
      }

      SharingService.trackedTemporaryPaths.delete(filePath);
      SharingService.trackedTemporaryPaths.delete(path.normalize(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleans up all tracked temporary share files.
   */
  public static cleanupAllTrackedFiles(): void {
    for (const filePath of Array.from(SharingService.trackedTemporaryPaths)) {
      SharingService.cleanupTemporaryShareFile(filePath);
    }
  }

  /**
   * Reveals a file in the operating system file manager (Windows File Explorer, macOS Finder, or Linux file manager).
   * Reuses VS Code's built-in revealFileInOS command.
   */
  public static async revealInExplorer(filePath: string): Promise<boolean> {
    try {
      let vscodeModule: any;
      try {
        vscodeModule = require('vscode');
      } catch {
        vscodeModule = await import('vscode');
      }
      if (vscodeModule && vscodeModule.commands && vscodeModule.Uri) {
        const uri = vscodeModule.Uri.file(filePath);
        await vscodeModule.commands.executeCommand('revealFileInOS', uri);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Delegates sharing to the active platform provider.
   */
  public async share(filePath: string, options?: ShareOptions): Promise<ShareResult> {
    return this._provider.share(filePath, options);
  }
}

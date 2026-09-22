import * as fs from 'fs';
import * as path from 'path';
import { ISharingProvider, ShareOptions, ShareResult } from '../sharingTypes';
import { ProjectSummaryData } from '../../types';

let vscodeModule: any;
try {
  vscodeModule = require('vscode');
} catch {
  // Running outside VS Code extension host (e.g. test runner)
}

export class WindowsShareProvider implements ISharingProvider {
  public readonly id = 'windows-share';
  public readonly name = 'Windows Sharing Provider';

  public get isSupported(): boolean {
    return process.platform === 'win32';
  }

  public canShare(filePath: string): boolean {
    if (!this.isSupported || !filePath) {
      return false;
    }
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  public async share(filePath: string, options?: ShareOptions): Promise<ShareResult> {
    if (options?.cancellationToken?.isCancellationRequested) {
      return {
        success: false,
        provider: this.id,
        cancelled: true,
        message: 'Share operation was cancelled.'
      };
    }

    if (!this.canShare(filePath)) {
      return {
        success: false,
        provider: this.id,
        error: `Cannot share file: '${filePath}' does not exist or is not accessible.`
      };
    }

    // 1. If Webview share bridge is available, attempt direct Web Share API in Webview
    if (options?.viewBridge && options.viewBridge.isResolved) {
      try {
        let zipBytes: Uint8Array;
        try {
          zipBytes = await fs.promises.readFile(filePath);
        } catch {
          zipBytes = new Uint8Array(0);
        }

        const fileName = path.basename(filePath);
        const projectName = options.projectName || path.basename(filePath, '.zip');

        const summary: ProjectSummaryData = options.summary || {
          projectName,
          workspaceRoot: path.dirname(filePath),
          fileCount: options.fileCount || 0,
          totalSize: options.totalSize || zipBytes.byteLength,
          excludedCount: 0,
          excludedPaths: [],
          hasSensitiveFiles: false,
          sensitiveFiles: [],
          scanStatus: 'ready'
        };

        const outcome = await options.viewBridge.prepareWebShare({
          summary,
          showSummary: options.showSummary ?? true,
          packageSize: options.packageSize || zipBytes.byteLength,
          packagedFiles: options.fileCount || summary.fileCount,
          fileName,
          tempZipPath: filePath,
          bytes: zipBytes
        });

        if (outcome === 'shared') {
          return {
            success: true,
            provider: this.id,
            message: 'Share operation completed.'
          };
        }

        if (outcome === 'cancelled') {
          return {
            success: false,
            provider: this.id,
            cancelled: true,
            message: 'Sharing cancelled.'
          };
        }

        if (outcome === 'failed') {
          return {
            success: false,
            provider: this.id,
            error: 'Failed to share project.'
          };
        }

        // outcome === 'fallback': Fall through to File Explorer reveal
      } catch (bridgeErr: any) {
        // If webview bridge throws, fall through to File Explorer reveal
      }
    }

    // 2. Fallback: reveal in Windows File Explorer with clear, honest messaging
    try {
      if (vscodeModule) {
        const uri = vscodeModule.Uri.file(filePath);
        await vscodeModule.commands.executeCommand('revealFileInOS', uri);
      }

      return {
        success: true,
        provider: this.id,
        isFallback: true,
        message: 'The shareable ZIP has been revealed in File Explorer for sharing.'
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.id,
        error: `Failed to reveal file in Windows File Explorer: ${err.message || err}`
      };
    }
  }
}

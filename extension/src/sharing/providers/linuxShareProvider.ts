import * as fs from 'fs';
import { ISharingProvider, ShareOptions, ShareResult } from '../sharingTypes';

let vscodeModule: any;
try {
  vscodeModule = require('vscode');
} catch {
  // Running outside VS Code extension host (e.g. test runner)
}

export class LinuxShareProvider implements ISharingProvider {
  public readonly id = 'linux-share';
  public readonly name = 'Linux Sharing Provider';

  public get isSupported(): boolean {
    return process.platform === 'linux';
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

    try {
      if (vscodeModule) {
        const uri = vscodeModule.Uri.file(filePath);
        await vscodeModule.commands.executeCommand('revealFileInOS', uri);
      }

      return {
        success: true,
        provider: this.id,
        isFallback: true,
        message:
          'Unified native sharing is not available across desktop environments on Linux. The shareable ZIP has been revealed in the file manager.'
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.id,
        error: `Failed to reveal file in Linux file manager: ${err.message || err}`
      };
    }
  }
}

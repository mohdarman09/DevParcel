import * as vscode from 'vscode';

export const MAX_UPLOAD_SIZE_MB = 50;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export class DevParcelConfig {
  private static readonly SECTION = 'devparcel';

  public static readonly MAX_UPLOAD_SIZE_MB = MAX_UPLOAD_SIZE_MB;
  public static readonly MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_BYTES;

  public static getDefaultExclusions(): string[] {
    const config = vscode.workspace.getConfiguration(this.SECTION);
    return config.get<string[]>('defaultExclusions', [
      'node_modules/',
      '.git/',
      '.env',
      '.env.*',
      'dist/',
      'build/',
      '.cache/',
      '.next/',
      'coverage/'
    ]);
  }

  public static getShowProjectSummary(): boolean {
    const config = vscode.workspace.getConfiguration(this.SECTION);
    return config.get<boolean>('showProjectSummary', true);
  }

  public static getDefaultLinkExpiryHours(): number {
    const config = vscode.workspace.getConfiguration(this.SECTION);
    return config.get<number>('defaultLinkExpiryHours', 24);
  }

  public static getBackendUrl(): string {
    const config = vscode.workspace.getConfiguration(this.SECTION);
    return config.get<string>('backendUrl', 'http://localhost:3000');
  }

  public static getPasswordProtectShares(): boolean {
    const config = vscode.workspace.getConfiguration(this.SECTION);
    return config.get<boolean>('passwordProtectShares', false);
  }
}

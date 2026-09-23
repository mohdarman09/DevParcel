import * as vscode from 'vscode';

export const MAX_UPLOAD_SIZE_MB = 50;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const BACKEND_URLS = {
  Production: 'https://devparcel.onrender.com',
  Local: 'http://localhost:3000',
} as const;

export type BackendEnvironment = 'Production' | 'Local';

export class DevParcelConfig {
  private static readonly SECTION = 'devparcel';

  public static readonly MAX_UPLOAD_SIZE_MB = MAX_UPLOAD_SIZE_MB;
  public static readonly MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_BYTES;
  public static readonly BACKEND_URLS = BACKEND_URLS;

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

  public static getBackendEnvironment(): BackendEnvironment {
    const config = vscode.workspace.getConfiguration(this.SECTION);
    const env = config.get<string>('backendEnvironment', 'Production');
    return env === 'Local' ? 'Local' : 'Production';
  }

  public static getBackendUrl(): string {
    const config = vscode.workspace.getConfiguration(this.SECTION);
    const customUrl = config.get<string>('backendUrl');
    if (customUrl && customUrl.trim() !== '') {
      return customUrl.trim().replace(/\/+$/, '');
    }
    const env = this.getBackendEnvironment();
    return BACKEND_URLS[env];
  }

  public static getPasswordProtectShares(): boolean {
    const config = vscode.workspace.getConfiguration(this.SECTION);
    return config.get<boolean>('passwordProtectShares', false);
  }
}

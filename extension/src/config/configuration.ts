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

  private static _extensionMode: vscode.ExtensionMode = vscode.ExtensionMode.Production;
  private static _testBackendUrl?: string;

  public static setExtensionMode(mode: vscode.ExtensionMode): void {
    this._extensionMode = mode;
  }

  public static getExtensionMode(): vscode.ExtensionMode {
    return this._extensionMode;
  }

  public static setTestBackendUrl(url?: string): void {
    this._testBackendUrl = url;
  }

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
    // 1. In Production mode, strictly resolve to the production URL.
    if (this._extensionMode === vscode.ExtensionMode.Production) {
      return BACKEND_URLS.Production;
    }

    // 2. In non-production modes, allow test URL override if set:
    if (this._testBackendUrl && this._testBackendUrl.trim() !== '') {
      return this._testBackendUrl.trim().replace(/\/+$/, '');
    }

    // 3. In Development mode, resolve to the local development URL.
    if (this._extensionMode === vscode.ExtensionMode.Development) {
      return BACKEND_URLS.Local;
    }

    // Default fallback is Production
    return BACKEND_URLS.Production;
  }

  public static getPasswordProtectShares(): boolean {
    const config = vscode.workspace.getConfiguration(this.SECTION);
    return config.get<boolean>('passwordProtectShares', false);
  }
}

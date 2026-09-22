import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { WorkspaceDetector } from '../workspace';
import { WorkspaceInfo, ScanResult, ProjectSummaryData, SensitiveFileResult } from '../types';
import { scanWorkspace } from '../scanner';
import { DevParcelConfig } from '../config';
import { WebSharePayload, ShareLinkResult, BackendClient, UploadProgressInfo } from '../sharing';
import { SenderIdentityService } from '../services/SenderIdentityService';

export interface PackageTooLargeInfo {
  projectName: string;
  zipPath: string;
  zipSize: number;
  maxSizeBytes: number;
}

export class DevParcelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'devparcel.views.main';

  private _view?: vscode.WebviewView;
  private _scanResult?: ScanResult;
  private _isScanning: boolean = false;

  private _viewState:
    | 'idle'
    | 'main'
    | 'summary'
    | 'sensitive-warning'
    | 'ready-to-share'
    | 'share-summary'
    | 'sharing'
    | 'share-link-created'
    | 'ready-to-share-zip'
    | 'upload-progress'
    | 'upload-error'
    | 'package-too-large'
    | 'revoke-confirm' = 'idle';

  private _summaryData?: ProjectSummaryData;
  private _sensitiveFiles?: SensitiveFileResult[];
  private _sharePayload?: WebSharePayload;
  private _shareLinkResult?: { result: ShareLinkResult; expiryHours: number };
  private _shareSummaryData?: ProjectSummaryData;
  private _shareExpiryHours?: number;
  private _isSharing: boolean = false;
  private _lastFeasibilityResult?: {
    hasShare: boolean;
    hasCanShare: boolean;
    canShareZip: boolean;
    isSecureContext?: boolean;
    protocol?: string;
    error: string | null;
  };
  private _summaryResolver?: (decision: 'confirm' | 'cancel') => void;
  private _sensitiveResolver?: (decision: 'include-anyway' | 'cancel') => void;
  private _shareResolver?: (outcome: 'shared' | 'cancelled' | 'fallback' | 'failed') => void;
  private _shareSummaryResolver?: (decision: 'generate' | 'cancel') => void;

  // Phase 8 state additions
  public lastSelectedExpiryHours: number = 24;
  public lastSelectedPassword?: string;
  private _uploadProgress?: UploadProgressInfo;
  private _uploadError?: string;
  private _droppedZipInfo?: { filePath: string; fileName: string; sizeBytes: number; isTemp?: boolean };
  private _revokeTarget?: { token: string; projectName: string };
  private _packageTooLargeInfo?: PackageTooLargeInfo;
  private _packageTooLargeResolver?: (decision: 'explorer' | 'cancel') => void;
  private _historyList: ShareLinkResult[] = [];
  private _historyFilter: 'all' | 'active' | 'expired' | 'revoked' = 'all';
  private _isLoadingHistory: boolean = false;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context?: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    const initialInfo = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(initialInfo);
    this.fetchAndSendHistory();

    if (initialInfo.hasWorkspace && initialInfo.rootPath) {
      this.triggerScan(initialInfo.rootPath);
    }

    // Handle messages from the webview buttons
    webviewView.webview.onDidReceiveMessage(async (message: { command: string }) => {
      switch (message.command) {
        case 'scanWorkspace': {
          const currentInfo = WorkspaceDetector.getWorkspaceInfo();
          if (currentInfo.hasWorkspace && currentInfo.rootPath) {
            await this.triggerScan(currentInfo.rootPath);
          }
          break;
        }
        case 'downloadZip':
          vscode.commands.executeCommand('devparcel.downloadZip');
          break;
        case 'shareZip':
          vscode.commands.executeCommand('devparcel.shareZip');
          break;
        case 'shareDownloadLink':
          vscode.commands.executeCommand('devparcel.shareDownloadLink');
          break;
        case 'openSettings':
          vscode.commands.executeCommand('devparcel.openSettings');
          break;
        case 'chooseZipFile': {
          const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { 'ZIP Archives': ['zip'] },
            title: 'Select a ZIP file to share with DevParcel',
          });
          if (uris && uris.length > 0) {
            this.handleDroppedZip(uris[0].fsPath);
          }
          break;
        }
        case 'zipFileDropped': {
          if ((message as any).filePath) {
            this.handleDroppedZip((message as any).filePath);
          }
          break;
        }
        case 'zipBinaryDropped': {
          const { fileName, buffer } = message as any;
          if (fileName && buffer) {
            const tempPath = path.join(
              os.tmpdir(),
              `devparcel-drop-${Date.now()}-${path.basename(fileName)}`
            );
            fs.writeFileSync(tempPath, Buffer.from(buffer));
            this.handleDroppedZip(tempPath, true);
          }
          break;
        }
        case 'generateDroppedZipShare': {
          this.lastSelectedExpiryHours =
            (message as any).expiryHours || DevParcelConfig.getDefaultLinkExpiryHours();
          this.lastSelectedPassword = (message as any).password || undefined;
          await this.uploadDroppedZip();
          break;
        }
        case 'cancelDroppedZipShare': {
          if (this._droppedZipInfo?.isTemp && fs.existsSync(this._droppedZipInfo.filePath)) {
            try {
              fs.unlinkSync(this._droppedZipInfo.filePath);
            } catch {}
          }
          this._droppedZipInfo = undefined;
          this.resetToIdle();
          break;
        }
        case 'requestHistory': {
          await this.fetchAndSendHistory();
          break;
        }
        case 'setHistoryFilter': {
          this._historyFilter = (message as any).filter || 'all';
          this.updateHtml(WorkspaceDetector.getWorkspaceInfo());
          break;
        }
        case 'requestRevoke': {
          this._revokeTarget = {
            token: (message as any).token,
            projectName: (message as any).projectName || 'Project',
          };
          this._viewState = 'revoke-confirm';
          this.updateHtml(WorkspaceDetector.getWorkspaceInfo());
          break;
        }
        case 'confirmRevoke': {
          if (this._revokeTarget?.token) {
            await this.executeRevoke(this._revokeTarget.token);
          }
          break;
        }
        case 'cancelRevoke': {
          this._revokeTarget = undefined;
          this.resetToIdle();
          break;
        }
        case 'retryUpload': {
          this.resetToIdle();
          vscode.commands.executeCommand('devparcel.shareDownloadLink');
          break;
        }
        case 'summaryConfirm':
          if (this._summaryResolver) {
            this._summaryResolver('confirm');
            this._summaryResolver = undefined;
          }
          break;
        case 'summaryCancel':
          if (this._summaryResolver) {
            this._summaryResolver('cancel');
            this._summaryResolver = undefined;
          }
          this.resetToIdle();
          break;
        case 'shareSummaryGenerate':
          if (this._isSharing) {
            break;
          }
          this._isSharing = true;
          this.lastSelectedExpiryHours =
            (message as any).expiryHours ||
            this._shareExpiryHours ||
            DevParcelConfig.getDefaultLinkExpiryHours();
          this.lastSelectedPassword = (message as any).password || undefined;
          if (this._shareSummaryResolver) {
            this._shareSummaryResolver('generate');
            this._shareSummaryResolver = undefined;
          }
          break;
        case 'shareSummaryCancel':
          this._isSharing = false;
          if (this._shareSummaryResolver) {
            this._shareSummaryResolver('cancel');
            this._shareSummaryResolver = undefined;
          }
          this.resetToIdle();
          break;
        case 'sensitiveIncludeAnyway':
          if (this._sensitiveResolver) {
            this._sensitiveResolver('include-anyway');
            this._sensitiveResolver = undefined;
          }
          break;
        case 'sensitiveCancel':
          if (this._sensitiveResolver) {
            this._sensitiveResolver('cancel');
            this._sensitiveResolver = undefined;
          }
          this.resetToIdle();
          break;
        case 'webShareSuccess':
          if (this._shareResolver) {
            this._shareResolver('shared');
            this._shareResolver = undefined;
          }
          this.resetToIdle();
          break;
        case 'webShareCancelled':
          if (this._shareResolver) {
            this._shareResolver('cancelled');
            this._shareResolver = undefined;
          }
          this.resetToIdle();
          break;
        case 'webShareFallback':
          if (this._shareResolver) {
            this._shareResolver('fallback');
            this._shareResolver = undefined;
          }
          this.resetToIdle();
          break;
        case 'webShareFailed':
          if (this._shareResolver) {
            this._shareResolver('failed');
            this._shareResolver = undefined;
          }
          this.resetToIdle();
          break;
        case 'packageTooLargeSendExplorer':
          if (this._packageTooLargeResolver) {
            this._packageTooLargeResolver('explorer');
            this._packageTooLargeResolver = undefined;
          }
          this.resetToIdle();
          break;
        case 'packageTooLargeCancel':
          if (this._packageTooLargeResolver) {
            this._packageTooLargeResolver('cancel');
            this._packageTooLargeResolver = undefined;
          }
          this.resetToIdle();
          break;
        case 'requestSharePayload':
          if (this._sharePayload && this._view) {
            this._view.webview.postMessage({
              command: 'setSharePayload',
              bytes: this._sharePayload.bytes,
              fileName: this._sharePayload.fileName,
            });
          }
          break;
        case 'webShareFeasibilityResult':
          this._lastFeasibilityResult = (message as any).data;
          try {
            const diagDir = path.join(os.tmpdir(), 'devparcel-diagnostics');
            if (!fs.existsSync(diagDir)) {
              fs.mkdirSync(diagDir, { recursive: true });
            }
            fs.writeFileSync(
              path.join(diagDir, 'web_share_probe.json'),
              JSON.stringify((message as any).data, null, 2)
            );
          } catch {}
          break;
        case 'copyShareUrl':
          if ((message as any).url) {
            await vscode.env.clipboard.writeText((message as any).url);
            vscode.window.showInformationMessage('DevParcel: Share link copied to clipboard!');
          }
          break;
        case 'openShareUrl':
          if ((message as any).url) {
            await vscode.env.openExternal(vscode.Uri.parse((message as any).url));
          }
          break;
        case 'resetIdle':
          this.resetToIdle();
          break;
      }
    });

    // Update view automatically if workspace folders change
    WorkspaceDetector.onDidChangeWorkspace((info) => {
      this._scanResult = undefined;
      this.resetToIdle();
      this.updateHtml(info);
      if (info.hasWorkspace && info.rootPath) {
        this.triggerScan(info.rootPath);
      }
    });
  }

  public get isResolved(): boolean {
    return !!this._view;
  }

  public getFeasibilityResult(): typeof this._lastFeasibilityResult {
    return this._lastFeasibilityResult;
  }

  public isWebShareAvailable(): boolean {
    return Boolean(
      this._lastFeasibilityResult?.hasShare &&
      this._lastFeasibilityResult?.hasCanShare
    );
  }

  public get isVisible(): boolean {
    return !!this._view && this._view.visible;
  }

  public showSummary(summaryData: ProjectSummaryData): Promise<'confirm' | 'cancel'> {
    if (this._summaryResolver) {
      this._summaryResolver('cancel');
      this._summaryResolver = undefined;
    }
    this._viewState = 'summary';
    this._summaryData = summaryData;
    const currentInfo = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(currentInfo);

    return new Promise<'confirm' | 'cancel'>((resolve) => {
      this._summaryResolver = resolve;
    });
  }

  public showSensitiveWarning(sensitiveFiles: SensitiveFileResult[]): Promise<'include-anyway' | 'cancel'> {
    if (this._sensitiveResolver) {
      this._sensitiveResolver('cancel');
      this._sensitiveResolver = undefined;
    }
    this._viewState = 'sensitive-warning';
    this._sensitiveFiles = sensitiveFiles;
    const currentInfo = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(currentInfo);

    return new Promise<'include-anyway' | 'cancel'>((resolve) => {
      this._sensitiveResolver = resolve;
    });
  }

  public prepareWebShare(data: WebSharePayload): Promise<'shared' | 'cancelled' | 'fallback' | 'failed'> {
    if (this._shareResolver) {
      this._shareResolver('cancelled');
      this._shareResolver = undefined;
    }
    this._viewState = 'ready-to-share';
    this._sharePayload = data;
    const currentInfo = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(currentInfo);

    if (this._view) {
      this._view.webview.postMessage({
        command: 'setSharePayload',
        bytes: data.bytes,
        fileName: data.fileName
      });
    }

    return new Promise<'shared' | 'cancelled' | 'fallback' | 'failed'>((resolve) => {
      this._shareResolver = resolve;
    });
  }

  public get viewState(): string {
    return this._viewState;
  }

  public showShareSummary(summaryData: ProjectSummaryData, expiryHours: number): Promise<'generate' | 'cancel'> {
    if (this._shareSummaryResolver) {
      this._shareSummaryResolver('cancel');
      this._shareSummaryResolver = undefined;
    }
    this._viewState = 'share-summary';
    this._shareSummaryData = summaryData;
    this._shareExpiryHours = expiryHours;
    this._isSharing = false;
    const currentInfo = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(currentInfo);

    return new Promise<'generate' | 'cancel'>((resolve) => {
      this._shareSummaryResolver = resolve;
    });
  }

  public showShareLinkCreated(result: ShareLinkResult, expiryHours: number): void {
    this._isSharing = false;
    this._viewState = 'share-link-created';
    this._shareLinkResult = { result, expiryHours };
    const currentInfo = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(currentInfo);
  }

  public resetToIdle(): void {
    this._viewState = 'idle';
    this._isSharing = false;
    this._summaryData = undefined;
    this._sensitiveFiles = undefined;
    this._sharePayload = undefined;
    this._shareLinkResult = undefined;
    this._shareSummaryData = undefined;
    this._shareExpiryHours = undefined;
    if (this._summaryResolver) {
      this._summaryResolver('cancel');
      this._summaryResolver = undefined;
    }
    if (this._sensitiveResolver) {
      this._sensitiveResolver('cancel');
      this._sensitiveResolver = undefined;
    }
    if (this._shareResolver) {
      this._shareResolver('cancelled');
      this._shareResolver = undefined;
    }
    if (this._shareSummaryResolver) {
      this._shareSummaryResolver('cancel');
      this._shareSummaryResolver = undefined;
    }
    this._packageTooLargeInfo = undefined;
    if (this._packageTooLargeResolver) {
      this._packageTooLargeResolver('cancel');
      this._packageTooLargeResolver = undefined;
    }
    this._uploadProgress = undefined;
    this._uploadError = undefined;
    this._droppedZipInfo = undefined;
    this._revokeTarget = undefined;
    const currentInfo = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(currentInfo);
  }

  public showUploadProgress(progress: UploadProgressInfo): void {
    this._uploadProgress = progress;
    if (this._viewState !== 'upload-progress') {
      this._viewState = 'upload-progress';
      const currentInfo = WorkspaceDetector.getWorkspaceInfo();
      this.updateHtml(currentInfo);
    } else if (this._view) {
      this._view.webview.postMessage({
        command: 'updateProgress',
        progress,
      });
    }
  }

  public showUploadError(errorMessage: string): void {
    this._isSharing = false;
    this._viewState = 'upload-error';
    this._uploadError = errorMessage;
    const currentInfo = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(currentInfo);
  }

  public showPackageTooLarge(info: PackageTooLargeInfo): Promise<'explorer' | 'cancel'> {
    if (this._packageTooLargeResolver) {
      this._packageTooLargeResolver('cancel');
      this._packageTooLargeResolver = undefined;
    }
    this._isSharing = false;
    this._viewState = 'package-too-large';
    this._packageTooLargeInfo = info;
    const currentInfo = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(currentInfo);

    return new Promise<'explorer' | 'cancel'>((resolve) => {
      this._packageTooLargeResolver = resolve;
    });
  }

  public validateZipFile(filePath: string): { valid: boolean; error?: string; sizeBytes: number; fileName: string } {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File does not exist.', sizeBytes: 0, fileName: '' };
    }
    const fileName = path.basename(filePath);
    if (!fileName.toLowerCase().endsWith('.zip')) {
      return { valid: false, error: 'Only ZIP archives (.zip) are supported.', sizeBytes: 0, fileName };
    }
    const stat = fs.statSync(filePath);
    const maxSize = DevParcelConfig.MAX_UPLOAD_SIZE_BYTES;
    if (stat.size > maxSize) {
      return { valid: false, error: `ZIP is too large. Maximum allowed size: ${DevParcelConfig.MAX_UPLOAD_SIZE_MB} MB.`, sizeBytes: stat.size, fileName };
    }
    try {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(4);
      fs.readSync(fd, buf, 0, 4, 0);
      fs.closeSync(fd);
      if (!(buf[0] === 0x50 && buf[1] === 0x4b && ((buf[2] === 0x03 && buf[3] === 0x04) || (buf[2] === 0x05 && buf[3] === 0x06)))) {
        return { valid: false, error: 'Invalid ZIP format. The selected file is not a valid ZIP archive.', sizeBytes: stat.size, fileName };
      }
    } catch (e: any) {
      return { valid: false, error: 'Failed to inspect ZIP file: ' + e.message, sizeBytes: stat.size, fileName };
    }
    return { valid: true, sizeBytes: stat.size, fileName };
  }

  public handleDroppedZip(filePath: string, isTemp = false): void {
    const val = this.validateZipFile(filePath);
    if (!val.valid) {
      vscode.window.showErrorMessage(`DevParcel: ${val.error}`);
      return;
    }
    this._droppedZipInfo = {
      filePath,
      fileName: val.fileName,
      sizeBytes: val.sizeBytes,
      isTemp,
    };
    this._viewState = 'ready-to-share-zip';
    this.lastSelectedExpiryHours = DevParcelConfig.getDefaultLinkExpiryHours();
    this.lastSelectedPassword = undefined;
    const currentInfo = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(currentInfo);
  }

  private async uploadDroppedZip(): Promise<void> {
    if (!this._droppedZipInfo) return;
    const { filePath, fileName, sizeBytes, isTemp } = this._droppedZipInfo;
    const projectName = path.basename(fileName, '.zip') || 'archive';
    const backendUrl = DevParcelConfig.getBackendUrl();
    const senderId = SenderIdentityService.getOrCreateSenderId(this._context);
    const expiryHours = this.lastSelectedExpiryHours;
    const password = this.lastSelectedPassword;

    this.showUploadProgress({
      stage: 'preparing',
      percent: 0,
      bytesUploaded: 0,
      totalBytes: sizeBytes,
    });

    try {
      const result = await BackendClient.uploadShare(
        backendUrl,
        filePath,
        {
          projectName,
          fileCount: 1,
          originalSize: sizeBytes,
          packageSize: sizeBytes,
          excludedCount: 0,
          sensitiveFileCount: 0,
          expiryHours,
          senderId,
          password,
        },
        {
          timeoutMs: 90000,
          senderId,
          onProgress: (p) => this.showUploadProgress(p),
        }
      );

      if (isTemp && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
      this._droppedZipInfo = undefined;
      this.showShareLinkCreated(result, expiryHours);
      await this.fetchAndSendHistory();
    } catch (err: any) {
      if (isTemp && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
      this.showUploadError(err.message || 'Failed to upload ZIP.');
    }
  }

  public async fetchAndSendHistory(): Promise<void> {
    if (this._isLoadingHistory) return;
    this._isLoadingHistory = true;
    try {
      const backendUrl = DevParcelConfig.getBackendUrl();
      const senderId = SenderIdentityService.getOrCreateSenderId(this._context);
      this._historyList = await BackendClient.getShareHistory(backendUrl, senderId);
      if (this._viewState === 'idle') {
        this.updateHtml(WorkspaceDetector.getWorkspaceInfo());
      }
    } catch (e) {
      console.warn('[DevParcel] Could not retrieve history:', e);
    } finally {
      this._isLoadingHistory = false;
    }
  }

  private async executeRevoke(token: string): Promise<void> {
    try {
      const backendUrl = DevParcelConfig.getBackendUrl();
      const senderId = SenderIdentityService.getOrCreateSenderId(this._context);
      await BackendClient.revokeShare(backendUrl, token, senderId);
      vscode.window.showInformationMessage('DevParcel: Share link successfully revoked.');
      this._revokeTarget = undefined;
      await this.fetchAndSendHistory();
      this.resetToIdle();
    } catch (err: any) {
      vscode.window.showErrorMessage(`DevParcel: Failed to revoke link: ${err.message || err}`);
      this._revokeTarget = undefined;
      this.resetToIdle();
    }
  }

  public async triggerScan(rootPath: string): Promise<void> {
    if (this._isScanning) {
      return;
    }
    this._isScanning = true;
    const currentInfo = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(currentInfo);

    try {
      const customExclusions = DevParcelConfig.getDefaultExclusions();
      this._scanResult = await scanWorkspace(rootPath, { customExclusions });
    } catch (err) {
      console.error('Failed to scan workspace:', err);
    } finally {
      this._isScanning = false;
      this.updateHtml(currentInfo);
    }
  }

  public refresh(): void {
    const info = WorkspaceDetector.getWorkspaceInfo();
    this.updateHtml(info);
    if (info.hasWorkspace && info.rootPath) {
      this.triggerScan(info.rootPath);
    }
  }

  private updateHtml(info: WorkspaceInfo): void {
    if (this._view) {
      this._view.webview.html = this.getHtmlForWebview(info);
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${formatted} ${sizes[i]}`;
  }

  private formatRelativeExpiry(expiresAtStr: string): string {
    const expiresAt = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diffMs = expiresAt - now;
    if (diffMs <= 0) return 'Expired';
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (hours < 1) return '< 1h';
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  }

  private renderShareOptionsHtml(currentExpiryHours: number, passwordProtectionEnabled: boolean, prefix = ''): string {
    const options = [
      { label: '1 hour', hours: 1 },
      { label: '6 hours', hours: 6 },
      { label: '24 hours', hours: 24 },
      { label: '3 days', hours: 72 },
      { label: '7 days', hours: 168 },
    ];

    const chipsHtml = options
      .map(
        (opt) => `
        <button type="button" class="expiry-chip ${opt.hours === currentExpiryHours ? 'selected' : ''}" data-hours="${opt.hours}">
          ${opt.label}
        </button>
      `
      )
      .join('');

    const passwordHtml = passwordProtectionEnabled
      ? `
        <div class="dp-password-section">
          <div class="dp-options-title">PASSWORD PROTECTION</div>
          <input type="password" id="${prefix}sharePassword" class="dp-input-field" placeholder="Enter password (min 4 chars)" autocomplete="new-password" />
          <input type="password" id="${prefix}sharePasswordConfirm" class="dp-input-field" placeholder="Confirm password" autocomplete="new-password" />
          <label class="dp-checkbox-row">
            <input type="checkbox" id="${prefix}toggleShowPassword" />
            <span>Show password</span>
          </label>
          <div id="${prefix}passwordError" style="display: none; color: #ef4444; font-size: 10.5px; margin-top: 4px;"></div>
        </div>
      `
      : '';

    return `
      <div class="dp-options-group">
        <div class="dp-options-title">LINK EXPIRY</div>
        <div class="dp-expiry-chips" id="${prefix}expiryChips">
          ${chipsHtml}
        </div>
        ${passwordHtml}
      </div>
    `;
  }

  /**
   * Generates shared CSS design system tokens mapped seamlessly with VS Code theme variables.
   */
  private getCommonStyles(): string {
    return `
      :root {
        --dp-accent: #2563eb;
        --dp-accent-hover: #1d4ed8;
        --dp-accent-glow: rgba(37, 99, 235, 0.2);
        --dp-accent-subtle: rgba(37, 99, 235, 0.08);
        --dp-surface: var(--vscode-editor-background, rgba(255, 255, 255, 0.04));
        --dp-surface-elevated: var(--vscode-sideBarSectionHeader-background, rgba(255, 255, 255, 0.06));
        --dp-surface-tile: var(--vscode-sideBar-background, rgba(0, 0, 0, 0.15));
        --dp-border: var(--vscode-widget-border, rgba(128, 128, 128, 0.18));
        --dp-border-accent: rgba(37, 99, 235, 0.4);
        --dp-radius-sm: 6px;
        --dp-radius-md: 10px;
        --dp-radius-lg: 14px;
        --dp-radius-pill: 9999px;
        --dp-success: #10b981;
        --dp-warning: #f59e0b;
        --dp-danger: #ef4444;
        --dp-text-muted: var(--vscode-descriptionForeground, #888888);
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
        font-size: var(--vscode-font-size, 13px);
        color: var(--vscode-foreground);
        background-color: var(--vscode-sideBar-background, transparent);
        padding: 14px 10px 20px;
        line-height: 1.4;
        overflow-x: hidden;
      }

      /* Compact Luxury Brand Header */
      .dp-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--dp-border);
      }

      .dp-header-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        flex: 1;
      }

      .dp-logo-badge {
        width: 30px;
        height: 30px;
        border-radius: var(--dp-radius-sm);
        background: #2563eb;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
        flex-shrink: 0;
      }

      .dp-header-text {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
      }

      .dp-brand-title {
        font-size: 14px;
        font-weight: 750;
        letter-spacing: -0.02em;
        color: var(--vscode-foreground);
        line-height: 1.15;
      }

      .dp-brand-subtitle {
        font-size: 10.5px;
        font-weight: 500;
        color: var(--dp-text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dp-btn-header-settings {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        margin-left: auto;
        flex-shrink: 0;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--dp-radius-sm);
        color: var(--dp-text-muted);
        cursor: pointer;
        padding: 0;
        transition: all 0.15s ease;
      }

      .dp-btn-header-settings:hover {
        background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.16));
        color: var(--vscode-foreground);
        border-color: var(--dp-border);
      }

      .dp-btn-header-settings:active {
        background: var(--vscode-toolbar-activeBackground, rgba(128, 128, 128, 0.25));
      }

      .dp-settings-icon {
        font-size: 16px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        opacity: 0.85;
        transition: transform 0.25s ease, opacity 0.15s ease;
      }

      .dp-btn-header-settings:hover .dp-settings-icon {
        opacity: 1;
        transform: rotate(30deg);
      }

      /* General Card Container */
      .dp-card {
        background: var(--dp-surface);
        border: 1px solid var(--dp-border);
        border-radius: var(--dp-radius-md);
        padding: 12px;
        margin-bottom: 12px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
        position: relative;
        overflow: hidden;
      }

      /* Status Pill */
      .dp-status-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #10b981;
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.25);
        padding: 2px 8px;
        border-radius: var(--dp-radius-pill);
        margin-bottom: 8px;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: #10b981;
        box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
      }

      .dp-project-title {
        font-size: 14.5px;
        font-weight: 700;
        color: var(--vscode-foreground);
        word-break: break-word;
        letter-spacing: -0.015em;
        margin-bottom: 2px;
      }

      .dp-project-sub {
        font-size: 11px;
        color: var(--dp-text-muted);
        margin-bottom: 6px;
      }

      .dp-meta-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        color: var(--vscode-foreground);
        padding-top: 8px;
        border-top: 1px solid var(--dp-border);
        flex-wrap: wrap;
      }

      .dp-meta-dot {
        color: var(--dp-text-muted);
        font-size: 9px;
      }

      .dp-meta-muted {
        font-size: 11px;
        color: var(--dp-text-muted);
        font-style: italic;
      }

      /* Project Overview Card */
      .dp-overview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .dp-section-kicker {
        font-size: 10px;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--dp-text-muted);
      }

      .dp-refresh-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: var(--dp-radius-sm);
        border: 1px solid var(--dp-border);
        background: transparent;
        color: var(--vscode-foreground);
        font-size: 10.5px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .dp-refresh-btn:hover:not(:disabled) {
        background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.15));
        border-color: var(--vscode-foreground);
      }

      .dp-refresh-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .refresh-icon.spinning {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* 4-Tile Metrics Grid */
      .metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }

      .metric-tile {
        display: flex;
        flex-direction: column;
        background: var(--dp-surface-tile);
        padding: 6px 8px;
        border-radius: var(--dp-radius-sm);
        border: 1px solid var(--dp-border);
      }

      .metric-label {
        font-size: 10px;
        color: var(--dp-text-muted);
        margin-bottom: 1px;
      }

      .metric-value {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--vscode-foreground);
        letter-spacing: -0.01em;
      }

      .metric-safe {
        color: #10b981;
      }

      /* Scanning shimmer indicator */
      .scanning-indicator {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 6px 0;
        font-size: 11px;
        color: var(--dp-text-muted);
      }

      .shimmer-bar {
        height: 3px;
        border-radius: 2px;
        background: linear-gradient(90deg, #2563eb 25%, #60a5fa 50%, #2563eb 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* Action Stack Hierarchy */
      .dp-actions-stack {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 14px;
      }

      .dp-action-btn {
        width: 100%;
        border-radius: var(--dp-radius-md);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        text-align: left;
        transition: all 0.15s ease;
        position: relative;
        text-decoration: none;
        border: 1px solid transparent;
      }

      .dp-action-btn:disabled,
      .dp-action-btn.btn-disabled {
        opacity: 0.5;
        cursor: not-allowed !important;
        transform: none !important;
        box-shadow: none !important;
      }

      /* Primary Button: Download ZIP */
      .dp-action-btn--primary {
        background-color: var(--vscode-button-background, #007acc);
        color: var(--vscode-button-foreground, #ffffff);
        height: 38px;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .dp-action-btn--primary:hover:not(:disabled) {
        background-color: var(--vscode-button-hoverBackground, #0062a3);
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
      }

      /* Secondary Button: Share ZIP */
      .dp-action-btn--secondary {
        background-color: var(--vscode-button-secondaryBackground, #3a3d41);
        color: var(--vscode-button-secondaryForeground, #cccccc);
        height: 38px;
        padding: 0 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .dp-action-btn--secondary:hover:not(:disabled) {
        background-color: var(--vscode-button-secondaryHoverBackground, #45494e);
        transform: translateY(-1px);
      }

      /* Signature Accent Button: Share Download Link */
      .dp-action-btn--accent {
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.16) 0%, rgba(37, 99, 235, 0.06) 100%);
        border: 1px solid #2563eb;
        color: var(--vscode-foreground);
        padding: 8px 12px;
        min-height: 48px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
      }

      .dp-action-btn--accent:hover:not(:disabled) {
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(37, 99, 235, 0.12) 100%);
        border-color: #3b82f6;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);
        transform: translateY(-1px);
      }

      .btn-accent-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }

      .btn-accent-sub {
        font-size: 10px;
        color: var(--dp-text-muted);
        font-weight: 500;
        margin-left: 22px;
      }

      .btn-left-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .btn-chevron {
        font-size: 14px;
        font-weight: 600;
        opacity: 0.7;
      }

      /* Security Trust Badge Row */
      .dp-security-trust {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: var(--dp-radius-md);
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.2);
        color: #10b981;
        font-size: 10.5px;
        font-weight: 550;
        text-align: center;
        margin-bottom: 14px;
      }



      /* Empty State */
      .dp-empty-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 24px 14px;
        gap: 8px;
      }

      .empty-icon-wrap {
        width: 44px;
        height: 44px;
        border-radius: var(--dp-radius-md);
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(37, 99, 235, 0.05));
        color: #2563eb;
        border: 1px solid rgba(37, 99, 235, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 4px;
      }

      .empty-title {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--vscode-foreground);
      }

      .empty-desc {
        font-size: 11.5px;
        color: var(--dp-text-muted);
        line-height: 1.4;
      }

      /* Sub-Views Shared Styles (Summary, Warning, Ready, Link Created) */
      .badge-warning {
        background: rgba(245, 158, 11, 0.12);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.3);
        padding: 2px 8px;
        border-radius: var(--dp-radius-pill);
        font-size: 10.5px;
        font-weight: 600;
      }

      .badge-ready {
        background: rgba(16, 185, 129, 0.12);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
        padding: 2px 8px;
        border-radius: var(--dp-radius-pill);
        font-size: 10.5px;
        font-weight: 600;
      }

      .details-content {
        background: var(--dp-surface-tile);
        border: 1px solid var(--dp-border);
        border-radius: var(--dp-radius-sm);
        padding: 8px;
        margin-top: 8px;
        margin-bottom: 10px;
        max-height: 180px;
        overflow-y: auto;
        font-size: 11px;
      }

      .details-content.hidden {
        display: none;
      }

      .btn-toggle {
        background: transparent;
        border: 1px solid var(--dp-border);
        color: var(--vscode-foreground);
        border-radius: var(--dp-radius-sm);
        padding: 4px 8px;
        font-size: 10.5px;
        cursor: pointer;
        width: 100%;
        text-align: left;
        margin-top: 8px;
      }

      .btn-toggle:hover {
        background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.12));
      }

      .warning-box {
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.25);
        border-radius: var(--dp-radius-md);
        padding: 12px;
        margin-bottom: 14px;
      }

      .warning-title {
        color: #ef4444;
        font-weight: 700;
        font-size: 13px;
        margin-bottom: 4px;
      }

      .warning-desc {
        font-size: 11.5px;
        color: var(--vscode-foreground);
        margin-bottom: 8px;
        line-height: 1.4;
      }

      .sensitive-list {
        list-style: none;
        padding: 0;
        font-size: 11px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .sensitive-list li {
        background: var(--dp-surface);
        padding: 4px 6px;
        border-radius: 4px;
        word-break: break-all;
      }

      .btn-danger {
        background-color: #ef4444;
        color: #ffffff;
      }

      .btn-danger:hover {
        background-color: #dc2626;
      }

      .url-box {
        background: var(--vscode-input-background, #1e1e1e);
        border: 1px solid #2563eb;
        border-radius: var(--dp-radius-sm);
        padding: 8px 10px;
        margin: 10px 0 6px;
        word-break: break-all;
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 11px;
        color: #3b82f6;
        user-select: all;
      }

      .url-hint {
        font-size: 10.5px;
        color: var(--dp-text-muted);
        margin-bottom: 12px;
      }

      .subview-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .subview-actions-vertical {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 12px;
      }

      /* Back Navigation Button */
      .dp-nav-row {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
      }

      .dp-back-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: transparent;
        border: 1px solid transparent;
        color: var(--dp-text-muted);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: var(--dp-radius-sm);
        transition: all 0.15s ease;
      }

      .dp-back-btn:hover:not(:disabled) {
        color: var(--vscode-foreground);
        background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.12));
      }

      .dp-back-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Ready To Share Styles */
      .dp-status-chip--accent {
        color: #3b82f6;
        background: rgba(37, 99, 235, 0.12);
        border: 1px solid rgba(37, 99, 235, 0.25);
      }

      .status-dot--accent {
        background-color: #3b82f6;
        box-shadow: 0 0 6px rgba(37, 99, 235, 0.6);
      }

      .dp-project-header-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .dp-package-icon-wrap {
        width: 32px;
        height: 32px;
        border-radius: var(--dp-radius-sm);
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(37, 99, 235, 0.08));
        color: #3b82f6;
        border: 1px solid rgba(37, 99, 235, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .dp-project-header-info {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .dp-summary-prompt {
        font-size: 11.5px;
        color: var(--dp-text-muted);
        line-height: 1.4;
        margin-bottom: 10px;
      }

      .metric-warn {
        color: #f59e0b;
      }

      .dp-security-box {
        margin-top: 10px;
        padding: 8px 10px;
        border-radius: var(--dp-radius-sm);
        font-size: 11px;
        line-height: 1.35;
      }

      .dp-security-box--safe {
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.25);
        color: #10b981;
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 550;
      }

      .dp-security-check {
        font-size: 12px;
        font-weight: 700;
      }

      .dp-security-box--warn {
        background: rgba(245, 158, 11, 0.08);
        border: 1px solid rgba(245, 158, 11, 0.25);
        color: var(--vscode-foreground);
      }

      .dp-security-warn-header {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #f59e0b;
        font-size: 11.5px;
        font-weight: 700;
        margin-bottom: 2px;
      }

      .dp-security-warn-desc {
        color: var(--dp-text-muted);
        font-size: 10.5px;
      }

      .dp-trust-note {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid var(--dp-border);
        font-size: 10.5px;
        color: var(--dp-text-muted);
        line-height: 1.3;
      }

      /* Drag & Drop ZIP Zone */
      .dp-dropzone {
        border: 1.5px dashed var(--dp-border);
        border-radius: var(--dp-radius-md);
        padding: 12px 10px;
        text-align: center;
        margin-bottom: 12px;
        background: var(--dp-surface);
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .dp-dropzone.dragover {
        border-color: var(--dp-accent);
        background: var(--dp-accent-subtle);
        box-shadow: 0 0 10px var(--dp-accent-glow);
      }
      .dp-dropzone-icon {
        font-size: 18px;
        margin-bottom: 3px;
      }
      .dp-dropzone-title {
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.04em;
        color: var(--vscode-foreground);
        margin-bottom: 2px;
      }
      .dp-dropzone-sub {
        font-size: 10px;
        color: var(--dp-text-muted);
        margin-bottom: 6px;
      }
      .dp-dropzone-btn {
        display: inline-block;
        padding: 3px 10px;
        font-size: 11px;
        font-weight: 600;
        border-radius: var(--dp-radius-pill);
        background: var(--dp-surface-elevated);
        border: 1px solid var(--dp-border);
        color: var(--vscode-foreground);
        cursor: pointer;
      }
      .dp-dropzone-btn:hover {
        background: var(--dp-surface-tile);
      }

      /* Expiry Selector Chips */
      .dp-options-group {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid var(--dp-border);
      }
      .dp-options-title {
        font-size: 10px;
        font-weight: 750;
        letter-spacing: 0.05em;
        color: var(--dp-text-muted);
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .dp-expiry-chips {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
      }
      .expiry-chip {
        padding: 3px 7px;
        font-size: 10.5px;
        font-weight: 600;
        border-radius: var(--dp-radius-pill);
        border: 1px solid var(--dp-border);
        background: var(--dp-surface);
        color: var(--vscode-foreground);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .expiry-chip.selected {
        border-color: var(--dp-accent);
        background: var(--dp-accent);
        color: #ffffff;
      }

      /* Password Protection Inputs */
      .dp-password-section {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid var(--dp-border);
      }
      .dp-input-field {
        width: 100%;
        height: 28px;
        padding: 4px 8px;
        font-size: 11.5px;
        background: var(--vscode-input-background, rgba(0,0,0,0.2));
        color: var(--vscode-input-foreground, inherit);
        border: 1px solid var(--vscode-input-border, var(--dp-border));
        border-radius: var(--dp-radius-sm);
        margin-bottom: 6px;
      }
      .dp-input-field:focus {
        outline: 1px solid var(--dp-accent);
        border-color: var(--dp-accent);
      }
      .dp-checkbox-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--dp-text-muted);
        cursor: pointer;
        margin-top: 2px;
      }

      /* Upload Progress Screen */
      .dp-progress-wrap {
        margin: 14px 0;
      }
      .dp-progress-bar-bg {
        width: 100%;
        height: 8px;
        background: var(--dp-surface-elevated);
        border-radius: 4px;
        overflow: hidden;
        border: 1px solid var(--dp-border);
        margin: 8px 0;
      }
      .dp-progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #2563eb, #3b82f6);
        border-radius: 4px;
        transition: width 0.2s ease;
      }
      .dp-progress-stats {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: var(--dp-text-muted);
      }
      .dp-progress-stage {
        font-weight: 700;
        font-size: 13px;
        color: var(--vscode-foreground);
      }

      /* Share History Section */
      .dp-history-section {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--dp-border);
      }
      .dp-history-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .dp-filter-pills {
        display: flex;
        gap: 4px;
        margin-bottom: 10px;
      }
      .filter-pill {
        padding: 2px 7px;
        font-size: 10px;
        font-weight: 600;
        border-radius: var(--dp-radius-pill);
        border: 1px solid var(--dp-border);
        background: transparent;
        color: var(--dp-text-muted);
        cursor: pointer;
      }
      .filter-pill.active {
        background: var(--dp-surface-elevated);
        color: var(--vscode-foreground);
        border-color: var(--dp-border-accent);
      }
      .history-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .history-item-card {
        background: var(--dp-surface);
        border: 1px solid var(--dp-border);
        border-radius: var(--dp-radius-sm);
        padding: 9px;
      }
      .history-item-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .history-item-name {
        font-weight: 700;
        font-size: 12px;
        color: var(--vscode-foreground);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 140px;
      }
      .history-status-badge {
        font-size: 10px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .history-status-badge.active { color: #10b981; }
      .history-status-badge.expired { color: #f59e0b; }
      .history-status-badge.revoked { color: #ef4444; }
      .history-item-meta {
        font-size: 10px;
        color: var(--dp-text-muted);
        margin-bottom: 6px;
      }
      .history-actions-row {
        display: flex;
        gap: 6px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid rgba(128,128,128,0.1);
      }
      .history-btn {
        padding: 2px 7px;
        font-size: 10px;
        font-weight: 600;
        border-radius: 4px;
        border: 1px solid var(--dp-border);
        background: var(--dp-surface-elevated);
        color: var(--vscode-foreground);
        cursor: pointer;
      }
      .history-btn:hover {
        background: var(--dp-surface-tile);
      }
      .history-btn--revoke {
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.3);
      }
      .history-btn--revoke:hover {
        background: rgba(239, 68, 68, 0.1);
      }

      @media (max-width: 220px) {
        .metrics-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
  }

  private getHtmlForWebview(info: WorkspaceInfo): string {
    const nonce = getNonce();
    const commonStyles = this.getCommonStyles();

    const logoSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    `;

    // 1. Summary State View
    if (this._viewState === 'summary' && this._summaryData) {
      const summary = this._summaryData;
      const sensitiveCount = summary.sensitiveFiles.length;
      const statusBadge = summary.hasSensitiveFiles
        ? `<span class="badge-warning">⚠️ Attention Required</span>`
        : `<span class="badge-ready">Ready to package</span>`;

      const maxExcludedPreview = 10;
      const previewExcluded = summary.excludedPaths.slice(0, maxExcludedPreview);
      const remainingExcluded = summary.excludedPaths.length - maxExcludedPreview;

      const excludedItemsHtml = previewExcluded
        .map(e => `<li>${this.escapeHtml(e.relativePath)} <span class="dp-meta-muted">(${this.escapeHtml(e.reason)})</span></li>`)
        .join('');

      const moreExcludedHtml = remainingExcluded > 0
        ? `<li class="dp-meta-muted">+ ${remainingExcluded} more excluded path${remainingExcluded > 1 ? 's' : ''}</li>`
        : '';

      const sensitiveItemsHtml = sensitiveCount > 0
        ? `
          <div style="margin-bottom: 8px;">
            <div style="font-weight: 700; color: #f59e0b; margin-bottom: 4px;">Sensitive Files (${sensitiveCount}):</div>
            <ul style="list-style: none; padding: 0;">
              ${summary.sensitiveFiles.map(f => `<li><strong>${this.escapeHtml(f.relativePath)}</strong> — <span style="color: #f59e0b;">${this.escapeHtml(f.reason)}</span></li>`).join('')}
            </ul>
          </div>
        `
        : '';

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>DevParcel — Project Summary</title>
  <style>
    ${commonStyles}
  </style>
</head>
<body>
  <div class="dp-header">
    <div class="dp-logo-badge">${logoSvg}</div>
    <div class="dp-header-text">
      <div class="dp-brand-title">DevParcel</div>
      <div class="dp-brand-subtitle">Project Summary</div>
    </div>
  </div>

  <div class="dp-card">
    <div class="dp-project-title">${this.escapeHtml(summary.projectName)}</div>
    <div style="margin-bottom: 10px;">${statusBadge}</div>

    <div class="metrics-grid">
      <div class="metric-tile">
        <span class="metric-label">Included Files</span>
        <span class="metric-value">${summary.fileCount}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">Original Size</span>
        <span class="metric-value">${this.formatBytes(summary.totalSize)}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">Excluded</span>
        <span class="metric-value">${summary.excludedCount}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">Sensitive</span>
        <span class="metric-value" style="color: ${sensitiveCount > 0 ? '#f59e0b' : '#10b981'}">${sensitiveCount}</span>
      </div>
    </div>

    <button id="toggleDetailsBtn" class="btn-toggle">View Excluded Details ▾</button>
    <div id="detailsContent" class="details-content hidden">
      ${sensitiveItemsHtml}
      <div style="font-weight: 700; margin-bottom: 4px;">Excluded Paths (${summary.excludedCount}):</div>
      <ul style="list-style: none; padding: 0;">
        ${excludedItemsHtml}
        ${moreExcludedHtml}
      </ul>
    </div>
  </div>

  <div class="subview-actions">
    <button class="dp-action-btn dp-action-btn--secondary" id="cancelSummaryBtn" style="height: 36px; justify-content: center;">Cancel</button>
    <button class="dp-action-btn dp-action-btn--primary" id="confirmSummaryBtn" style="height: 36px; justify-content: center;">Continue</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    const toggleBtn = document.getElementById('toggleDetailsBtn');
    const details = document.getElementById('detailsContent');
    if (toggleBtn && details) {
      toggleBtn.addEventListener('click', () => {
        const isHidden = details.classList.toggle('hidden');
        toggleBtn.textContent = isHidden ? 'View Excluded Details ▾' : 'Hide Details ▴';
      });
    }

    document.getElementById('confirmSummaryBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'summaryConfirm' });
    });

    document.getElementById('cancelSummaryBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'summaryCancel' });
    });
  </script>
</body>
</html>`;
    }

    // 2. Sensitive Warning State View
    if (this._viewState === 'sensitive-warning' && this._sensitiveFiles) {
      const files = this._sensitiveFiles;
      const fileListHtml = files
        .map(f => `<li><strong>${this.escapeHtml(f.relativePath)}</strong> — <span class="dp-meta-muted">${this.escapeHtml(f.reason)}</span></li>`)
        .join('');

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>DevParcel — Sensitive Warning</title>
  <style>
    ${commonStyles}
  </style>
</head>
<body>
  <div class="dp-header">
    <div class="dp-logo-badge" style="background: #ef4444;">⚠️</div>
    <div class="dp-header-text">
      <div class="dp-brand-title">DevParcel</div>
      <div class="dp-brand-subtitle">Sensitive Files Warning</div>
    </div>
  </div>

  <div class="warning-box">
    <div class="warning-title">${files.length} Sensitive File${files.length > 1 ? 's' : ''} Included</div>
    <div class="warning-desc">
      The following files may contain secrets, private keys, or credentials:
    </div>

    <ul class="sensitive-list">
      ${fileListHtml}
    </ul>
  </div>

  <div class="subview-actions">
    <button class="dp-action-btn dp-action-btn--secondary" id="cancelSensitiveBtn" style="height: 36px; justify-content: center;">Cancel</button>
    <button class="dp-action-btn btn-danger" id="includeAnywayBtn" style="height: 36px; justify-content: center;">Include Anyway</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.getElementById('includeAnywayBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'sensitiveIncludeAnyway' });
    });

    document.getElementById('cancelSensitiveBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'sensitiveCancel' });
    });
  </script>
</body>
</html>`;
    }

    // 3. Ready to Share State View
    if (this._viewState === 'ready-to-share' && this._sharePayload) {
      const payload = this._sharePayload;
      const summary = payload.summary;
      const isWebShare = this.isWebShareAvailable();

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>DevParcel — Ready to Share</title>
  <style>
    ${commonStyles}
  </style>
</head>
<body>
  <div class="dp-header">
    <div class="dp-logo-badge">${logoSvg}</div>
    <div class="dp-header-text">
      <div class="dp-brand-title">DevParcel</div>
      <div class="dp-brand-subtitle">Package Ready to Share</div>
    </div>
  </div>

  <div class="dp-card">
    <div class="dp-project-title">${this.escapeHtml(summary.projectName)}</div>
    <div style="margin-bottom: 10px;"><span class="badge-ready">Package Created</span></div>

    <div class="metrics-grid">
      <div class="metric-tile">
        <span class="metric-label">Packaged Files</span>
        <span class="metric-value">${payload.packagedFiles}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">ZIP Size</span>
        <span class="metric-value">${this.formatBytes(payload.packageSize)}</span>
      </div>
    </div>

    <div style="margin-top: 10px; font-size: 11.5px; color: var(--dp-text-muted); line-height: 1.4;">
      ${isWebShare 
        ? 'Click <strong>Share Now</strong> to trigger the native operating system share dialog.'
        : 'Windows native sharing is unavailable in this environment. Click below to open the package in File Explorer.'}
    </div>
    <div id="shareStatusBox" style="display: none; margin-top: 8px; font-size: 11px; padding: 6px; border-radius: 4px; background: rgba(37, 99, 235, 0.15); color: #3b82f6;"></div>
  </div>

  <div class="subview-actions">
    <button class="dp-action-btn dp-action-btn--secondary" id="cancelShareBtn" style="height: 36px; justify-content: center;">Cancel</button>
    ${isWebShare 
      ? '<button class="dp-action-btn dp-action-btn--primary" id="shareNowBtn" style="height: 36px; justify-content: center;">Share Now ↗</button>'
      : '<button class="dp-action-btn dp-action-btn--primary" id="openZipBtn" style="height: 36px; justify-content: center;">Open ZIP in Explorer 📂</button>'}
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let currentShareBytes = null;
    let currentShareFileName = '${this.escapeHtml(payload.fileName)}';

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg && msg.command === 'setSharePayload') {
        currentShareBytes = msg.bytes;
        if (msg.fileName) currentShareFileName = msg.fileName;
      }
    });

    vscode.postMessage({ command: 'requestSharePayload' });

    const cancelBtn = document.getElementById('cancelShareBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'webShareCancelled' });
      });
    }

    const openZipBtn = document.getElementById('openZipBtn');
    if (openZipBtn) {
      openZipBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'webShareFallback' });
      });
    }

    const shareBtn = document.getElementById('shareNowBtn');
    const statusBox = document.getElementById('shareStatusBox');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        shareBtn.disabled = true;
        shareBtn.textContent = 'Opening Share...';
        if (statusBox) {
          statusBox.style.display = 'block';
          statusBox.textContent = 'Invoking OS share popup...';
        }

        try {
          if (!currentShareBytes) {
            for (let i = 0; i < 10; i++) {
              await new Promise(r => setTimeout(r, 100));
              if (currentShareBytes) break;
            }
          }

          if (!currentShareBytes) {
            vscode.postMessage({ command: 'webShareFallback', reason: 'Payload not yet loaded' });
            return;
          }

          let uint8;
          if (currentShareBytes instanceof Uint8Array) {
            uint8 = currentShareBytes;
          } else if (currentShareBytes instanceof ArrayBuffer) {
            uint8 = new Uint8Array(currentShareBytes);
          } else if (Array.isArray(currentShareBytes)) {
            uint8 = new Uint8Array(currentShareBytes);
          } else if (typeof currentShareBytes === 'object' && currentShareBytes !== null) {
            uint8 = new Uint8Array(Object.values(currentShareBytes));
          } else {
            uint8 = new Uint8Array(0);
          }

          const blob = new Blob([uint8], { type: 'application/zip' });
          const file = new File([blob], currentShareFileName || 'project.zip', { type: 'application/zip' });

          if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: currentShareFileName
              });
              vscode.postMessage({ command: 'webShareSuccess' });
              return;
            }
          }

          vscode.postMessage({ command: 'webShareFallback', reason: 'navigator.canShare returned false' });
        } catch (err) {
          if (err.name === 'AbortError') {
            vscode.postMessage({ command: 'webShareCancelled' });
          } else {
            vscode.postMessage({ command: 'webShareFallback', error: err.name + ': ' + err.message });
          }
        }
      });
    }
  </script>
</body>
</html>`;
    }

    // 4. Share Link Created State View
    if (this._viewState === 'share-link-created' && this._shareLinkResult) {
      const { result, expiryHours } = this._shareLinkResult;
      const projectName = this.escapeHtml(result.projectName);
      const publicUrl = this.escapeHtml(result.publicUrl);
      const packageSizeFormatted = this.formatBytes(result.packageSize);

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>DevParcel — Share Link Ready</title>
  <style>
    ${commonStyles}
  </style>
</head>
<body>
  <div class="dp-header">
    <div class="dp-logo-badge" style="background: #10b981;">✓</div>
    <div class="dp-header-text">
      <div class="dp-brand-title">DevParcel</div>
      <div class="dp-brand-subtitle">Share Link Ready</div>
    </div>
  </div>

  <div class="dp-card">
    <div class="dp-project-title">${projectName}</div>
    <div style="margin-bottom: 8px;"><span class="badge-ready">Expires in ${expiryHours}h</span></div>

    <div class="metrics-grid">
      <div class="metric-tile">
        <span class="metric-label">Files</span>
        <span class="metric-value">${result.fileCount}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">Size</span>
        <span class="metric-value">${packageSizeFormatted}</span>
      </div>
    </div>

    <div class="url-box" id="shareUrlText">${publicUrl}</div>
    <div class="url-hint">Anyone with this link can download the project package without an account.</div>
  </div>

  <div class="subview-actions-vertical">
    <button class="dp-action-btn dp-action-btn--primary" id="copyLinkBtn" style="height: 38px; justify-content: center;">
      <span>📋 Copy Link</span>
    </button>
    <button class="dp-action-btn dp-action-btn--secondary" id="openLinkBtn" style="height: 38px; justify-content: center;">
      <span>🌐 Open in Browser</span>
    </button>
    <button class="dp-action-btn dp-action-btn--secondary" id="doneLinkBtn" style="height: 34px; justify-content: center; opacity: 0.8;">
      <span>Done</span>
    </button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.getElementById('copyLinkBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'copyShareUrl', url: '${publicUrl}' });
    });

    document.getElementById('openLinkBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'openShareUrl', url: '${publicUrl}' });
    });

    document.getElementById('doneLinkBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'resetIdle' });
    });
  </script>
</body>
</html>`;
    }

    // 5. Upload Progress State View
    if (this._viewState === 'upload-progress') {
      const progress = this._uploadProgress || {
        stage: 'preparing',
        percent: 0,
        bytesUploaded: 0,
        totalBytes: 0,
      };

      let stageTitle = 'Preparing package...';
      let stageDesc = 'Compressing and preparing project files...';
      if (progress.stage === 'uploading') {
        stageTitle = `Uploading package... ${progress.percent}%`;
        stageDesc = `${this.formatBytes(progress.bytesUploaded)} of ${this.formatBytes(progress.totalBytes)} uploaded`;
      } else if (progress.stage === 'creating') {
        stageTitle = 'Creating secure share...';
        stageDesc = 'Generating link and setting permissions...';
      }

      const etaText =
        progress.etaSeconds !== undefined && progress.etaSeconds > 0
          ? `<span>ETA: ~${progress.etaSeconds}s</span>`
          : '';

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>DevParcel — Uploading</title>
  <style>
    ${commonStyles}
  </style>
</head>
<body>
  <div class="dp-header">
    <div class="dp-logo-badge">${logoSvg}</div>
    <div class="dp-header-text">
      <div class="dp-brand-title">DevParcel</div>
      <div class="dp-brand-subtitle">Packaging &amp; Uploading</div>
    </div>
  </div>

  <div class="dp-card">
    <div class="dp-status-chip dp-status-chip--accent">
      <span class="status-dot status-dot--accent"></span>
      <span id="stageTitleEl">${this.escapeHtml(stageTitle)}</span>
    </div>

    <div class="dp-project-title" style="margin-top: 4px;">Uploading package</div>
    <div class="dp-project-sub" id="stageDescEl">${this.escapeHtml(stageDesc)}</div>

    <div class="dp-progress-wrap">
      <div class="dp-progress-bar-bg">
        <div class="dp-progress-bar-fill" id="progressBarFill" style="width: ${progress.percent}%;"></div>
      </div>
      <div class="dp-progress-stats">
        <span id="progressPercentText">${progress.percent}%</span>
        <span id="progressBytesText">${this.formatBytes(progress.bytesUploaded)} / ${this.formatBytes(progress.totalBytes)}</span>
      </div>
      <div id="progressEtaText" style="font-size: 10.5px; color: var(--dp-text-muted); margin-top: 4px; text-align: right;">
        ${etaText}
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg && msg.command === 'updateProgress' && msg.progress) {
        const p = msg.progress;
        const fill = document.getElementById('progressBarFill');
        const percentText = document.getElementById('progressPercentText');
        const bytesText = document.getElementById('progressBytesText');
        const titleEl = document.getElementById('stageTitleEl');
        const descEl = document.getElementById('stageDescEl');
        const etaEl = document.getElementById('progressEtaText');

        if (fill) fill.style.width = p.percent + '%';
        if (percentText) percentText.textContent = p.percent + '%';
        if (bytesText) bytesText.textContent = formatBytes(p.bytesUploaded) + ' / ' + formatBytes(p.totalBytes);

        if (p.stage === 'preparing') {
          if (titleEl) titleEl.textContent = 'Preparing package...';
          if (descEl) descEl.textContent = 'Compressing and preparing project files...';
        } else if (p.stage === 'uploading') {
          if (titleEl) titleEl.textContent = 'Uploading package... ' + p.percent + '%';
          if (descEl) descEl.textContent = formatBytes(p.bytesUploaded) + ' of ' + formatBytes(p.totalBytes) + ' uploaded';
        } else if (p.stage === 'finalizing') {
          if (titleEl) titleEl.textContent = 'Creating secure share...';
          if (descEl) descEl.textContent = 'Generating link and setting permissions...';
        }

        if (etaEl) {
          etaEl.textContent = (p.etaSeconds && p.etaSeconds > 0) ? 'ETA: ~' + p.etaSeconds + 's' : '';
        }
      }
    });
  </script>
</body>
</html>`;
    }

    // 6. Upload Error State View
    if (this._viewState === 'upload-error') {
      const errMsg = this._uploadError || 'Upload encountered an error.';
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>DevParcel — Upload Failed</title>
  <style>
    ${commonStyles}
  </style>
</head>
<body>
  <div class="dp-header">
    <div class="dp-logo-badge" style="background: #ef4444;">⚠️</div>
    <div class="dp-header-text">
      <div class="dp-brand-title">DevParcel</div>
      <div class="dp-brand-subtitle">Upload Failed</div>
    </div>
  </div>

  <div class="dp-card" style="border-color: rgba(239, 68, 68, 0.3);">
    <div class="dp-status-chip" style="color: #ef4444; background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.25);">
      <span class="status-dot" style="background-color: #ef4444;"></span>
      <span>UPLOAD FAILED</span>
    </div>

    <div class="dp-project-title" style="margin-top: 6px;">Upload failed</div>
    <div class="dp-project-sub" style="color: #ef4444; word-break: break-word; line-height: 1.4; margin-top: 4px;">
      ${this.escapeHtml(errMsg)}
    </div>
  </div>

  <div class="subview-actions-vertical">
    <button class="dp-action-btn dp-action-btn--primary" id="retryUploadBtn" style="height: 38px; justify-content: center;">
      <span>Try Again</span>
    </button>
    <button class="dp-action-btn dp-action-btn--secondary" id="cancelErrorBtn" style="height: 34px; justify-content: center; opacity: 0.85;">
      <span>Cancel</span>
    </button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('retryUploadBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'retryUpload' });
    });
    document.getElementById('cancelErrorBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'resetIdle' });
    });
  </script>
</body>
</html>`;
    }

    // Package Too Large State View (ZIP exceeds 50 MB cloud sharing limit)
    if (this._viewState === 'package-too-large' && this._packageTooLargeInfo) {
      const info = this._packageTooLargeInfo;
      const formattedZipSize = this.formatBytes(info.zipSize);
      const maxUploadMb = Math.round(info.maxSizeBytes / (1024 * 1024));

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>DevParcel — Package Ready to Share</title>
  <style>
    ${commonStyles}
  </style>
</head>
<body>
  <div class="dp-header">
    <div class="dp-logo-badge" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">📁</div>
    <div class="dp-header-text">
      <div class="dp-brand-title">DevParcel</div>
      <div class="dp-brand-subtitle">Package Ready to Share</div>
    </div>
  </div>

  <div class="dp-card" style="border-color: rgba(245, 158, 11, 0.35);">
    <div class="dp-status-chip" style="color: #f59e0b; background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.3);">
      <span class="status-dot" style="background-color: #f59e0b;"></span>
      <span>CLOUD LINK UNAVAILABLE</span>
    </div>

    <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px; margin-bottom: 4px;">
      <span style="font-size: 18px; line-height: 1;" aria-hidden="true">⚠️</span>
      <div class="dp-project-title" style="font-size: 13px; font-weight: 700; color: #f59e0b;">PACKAGE TOO LARGE</div>
    </div>

    <div style="font-size: 11.5px; color: var(--vscode-foreground); line-height: 1.45; margin-top: 6px;">
      Your ZIP is <strong>${formattedZipSize}</strong>, which is larger than the <strong>${maxUploadMb} MB</strong> cloud sharing limit, so we can't generate a download link for it.
    </div>

    <div class="metrics-grid" style="margin-top: 10px; margin-bottom: 10px;">
      <div class="metric-tile" style="border-color: rgba(245, 158, 11, 0.25);">
        <span class="metric-label">ZIP Size</span>
        <span class="metric-value" style="color: #f59e0b;">${formattedZipSize}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">Cloud Limit</span>
        <span class="metric-value">${maxUploadMb} MB</span>
      </div>
    </div>

    <div style="font-size: 11px; color: var(--dp-text-muted); line-height: 1.4; padding: 8px 10px; border-radius: 6px; background: rgba(245, 158, 11, 0.06); border: 1px dashed rgba(245, 158, 11, 0.25);">
      Download links can't be generated for files larger than ${maxUploadMb} MB.<br>
      You can still send this ZIP directly using Windows Explorer.
    </div>
  </div>

  <div class="subview-actions-vertical" style="margin-top: 14px;">
    <button class="dp-action-btn dp-action-btn--primary" id="sendByExplorerBtn" style="height: 38px; justify-content: center; font-weight: 600;">
      <span>Send ZIP by Explorer 📁</span>
    </button>
    <button class="dp-action-btn dp-action-btn--secondary" id="cancelTooLargeBtn" style="height: 34px; justify-content: center; opacity: 0.85;">
      <span>Cancel</span>
    </button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('sendByExplorerBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'packageTooLargeSendExplorer' });
    });
    document.getElementById('cancelTooLargeBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'packageTooLargeCancel' });
    });
  </script>
</body>
</html>`;
    }

    // 7. Ready to Share Dropped ZIP State View
    if (this._viewState === 'ready-to-share-zip' && this._droppedZipInfo) {
      const zip = this._droppedZipInfo;
      const isPasswordEnabled = DevParcelConfig.getPasswordProtectShares();
      const defaultExpiry = DevParcelConfig.getDefaultLinkExpiryHours();

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>DevParcel — Share ZIP</title>
  <style>
    ${commonStyles}
  </style>
</head>
<body>
  <div class="dp-nav-row">
    <button class="dp-back-btn" id="cancelZipTopBtn" title="Back to main sidebar">
      <span>←</span>
      <span>Back</span>
    </button>
  </div>

  <div class="dp-card">
    <div class="dp-status-chip dp-status-chip--accent">
      <span class="status-dot status-dot--accent"></span>
      <span>READY TO SHARE</span>
    </div>

    <div class="dp-project-header-row">
      <div class="dp-package-icon-wrap" aria-hidden="true">${logoSvg}</div>
      <div class="dp-project-header-info">
        <div class="dp-project-title" title="${this.escapeHtml(zip.fileName)}">${this.escapeHtml(zip.fileName)}</div>
        <div class="dp-project-sub">Existing ZIP archive</div>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-tile">
        <span class="metric-label">Archive</span>
        <span class="metric-value" style="font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(zip.fileName)}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">Size</span>
        <span class="metric-value">${this.formatBytes(zip.sizeBytes)}</span>
      </div>
    </div>

    ${this.renderShareOptionsHtml(defaultExpiry, isPasswordEnabled, 'zip_')}
  </div>

  <div class="subview-actions-vertical">
    <button class="dp-action-btn dp-action-btn--primary" id="generateZipShareBtn" style="height: 38px; justify-content: center;">
      <span>Generate Share Link</span>
    </button>
    <button class="dp-action-btn dp-action-btn--secondary" id="cancelZipBottomBtn" style="height: 34px; justify-content: center; opacity: 0.85;">
      <span>Cancel</span>
    </button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let selectedExpiry = ${defaultExpiry};
    const passwordRequired = ${isPasswordEnabled};

    document.querySelectorAll('#zip_expiryChips .expiry-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#zip_expiryChips .expiry-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedExpiry = parseInt(chip.getAttribute('data-hours') || '24', 10);
      });
    });

    const togglePass = document.getElementById('zip_toggleShowPassword');
    if (togglePass) {
      togglePass.addEventListener('change', () => {
        const type = togglePass.checked ? 'text' : 'password';
        const p1 = document.getElementById('zip_sharePassword');
        const p2 = document.getElementById('zip_sharePasswordConfirm');
        if (p1) p1.type = type;
        if (p2) p2.type = type;
      });
    }

    function handleGenerate() {
      let password;
      if (passwordRequired) {
        const p1 = document.getElementById('zip_sharePassword');
        const p2 = document.getElementById('zip_sharePasswordConfirm');
        const errEl = document.getElementById('zip_passwordError');
        const val1 = p1 ? p1.value.trim() : '';
        const val2 = p2 ? p2.value.trim() : '';

        if (!val1) {
          if (errEl) { errEl.textContent = 'Password is required.'; errEl.style.display = 'block'; }
          return;
        }
        if (val1.length < 4) {
          if (errEl) { errEl.textContent = 'Password must be at least 4 characters.'; errEl.style.display = 'block'; }
          return;
        }
        if (val1 !== val2) {
          if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; }
          return;
        }
        if (errEl) errEl.style.display = 'none';
        password = val1;
      }

      const genBtn = document.getElementById('generateZipShareBtn');
      if (genBtn) {
        genBtn.disabled = true;
        genBtn.classList.add('btn-disabled');
        genBtn.innerHTML = '<span>Uploading package...</span>';
      }

      vscode.postMessage({
        command: 'generateDroppedZipShare',
        expiryHours: selectedExpiry,
        password,
      });
    }

    document.getElementById('generateZipShareBtn').addEventListener('click', handleGenerate);

    const cancel = () => vscode.postMessage({ command: 'cancelDroppedZipShare' });
    document.getElementById('cancelZipTopBtn').addEventListener('click', cancel);
    document.getElementById('cancelZipBottomBtn').addEventListener('click', cancel);
  </script>
</body>
</html>`;
    }

    // 8. Revoke Confirmation State View
    if (this._viewState === 'revoke-confirm') {
      const projName = this._revokeTarget?.projectName || 'Project';
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>DevParcel — Revoke Share Link</title>
  <style>
    ${commonStyles}
  </style>
</head>
<body>
  <div class="dp-header">
    <div class="dp-logo-badge" style="background: #ef4444;">✕</div>
    <div class="dp-header-text">
      <div class="dp-brand-title">DevParcel</div>
      <div class="dp-brand-subtitle">Revoke Share Link</div>
    </div>
  </div>

  <div class="dp-card" style="border-color: rgba(239, 68, 68, 0.3);">
    <div class="dp-status-chip" style="color: #ef4444; background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.25);">
      <span class="status-dot" style="background-color: #ef4444;"></span>
      <span>REVOKE SHARE LINK?</span>
    </div>

    <div class="dp-project-title" style="margin-top: 6px;">${this.escapeHtml(projName)}</div>
    <div class="dp-project-sub" style="line-height: 1.4; margin-top: 4px;">
      This will immediately disable this download link. Recipients will no longer be able to download this project.
    </div>
  </div>

  <div class="subview-actions">
    <button class="dp-action-btn dp-action-btn--secondary" id="cancelRevokeBtn" style="height: 36px; justify-content: center;">
      <span>Cancel</span>
    </button>
    <button class="dp-action-btn btn-danger" id="confirmRevokeBtn" style="height: 36px; justify-content: center;">
      <span>Revoke Link</span>
    </button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('confirmRevokeBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'confirmRevoke' });
    });
    document.getElementById('cancelRevokeBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'cancelRevoke' });
    });
  </script>
</body>
</html>`;
    }

    // 9. Share Summary / Confirmation State View
    if (this._viewState === 'share-summary' && this._shareSummaryData) {
      const summary = this._shareSummaryData;
      const expiryHours = this._shareExpiryHours || DevParcelConfig.getDefaultLinkExpiryHours();
      const isPasswordEnabled = DevParcelConfig.getPasswordProtectShares();
      const projectName = this.escapeHtml(summary.projectName);
      const sensitiveCount = summary.sensitiveFiles.length;
      const packageSizeFormatted = summary.zipSize !== undefined
        ? this.formatBytes(summary.zipSize)
        : this.formatBytes(Math.round(summary.totalSize * 0.35));

      const sensitiveFilesHtml = sensitiveCount > 0
        ? `
          <div class="dp-security-box dp-security-box--warn">
            <div class="dp-security-warn-header">
              <span class="dp-security-warn-icon">⚠</span>
              <span>Sensitive files included</span>
            </div>
            <div class="dp-security-warn-desc">
              ${sensitiveCount} sensitive file${sensitiveCount > 1 ? 's are' : ' is'} included in this package.
            </div>
            <ul class="sensitive-list" style="margin-top: 6px;">
              ${summary.sensitiveFiles.map(f => `<li><strong>${this.escapeHtml(f.relativePath)}</strong></li>`).join('')}
            </ul>
          </div>
        `
        : `
          <div class="dp-security-box dp-security-box--safe">
            <span class="dp-security-check">✓</span>
            <span>No sensitive files included</span>
          </div>
        `;

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>DevParcel — Ready to Share</title>
  <style>
    ${commonStyles}
  </style>
</head>
<body>
  <div class="dp-nav-row">
    <button class="dp-back-btn" id="shareSummaryBackBtn" title="Back to main sidebar">
      <span>←</span>
      <span>Back</span>
    </button>
  </div>

  <div class="dp-card">
    <div class="dp-status-chip dp-status-chip--accent">
      <span class="status-dot status-dot--accent"></span>
      <span>READY TO SHARE</span>
    </div>

    <div class="dp-project-header-row">
      <div class="dp-package-icon-wrap" aria-hidden="true">${logoSvg}</div>
      <div class="dp-project-header-info">
        <div class="dp-project-title" title="${projectName}">${projectName}</div>
        <div class="dp-project-sub">Temporary share link</div>
      </div>
    </div>

    <div class="dp-summary-prompt">
      Review your project before creating a shareable download link.
    </div>

    <div class="dp-section-kicker" style="margin-top: 10px; margin-bottom: 6px;">PROJECT SUMMARY</div>

    <div class="metrics-grid">
      <div class="metric-tile">
        <span class="metric-label">Files</span>
        <span class="metric-value">${summary.fileCount}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">Original Size</span>
        <span class="metric-value">${this.formatBytes(summary.totalSize)}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">Excluded</span>
        <span class="metric-value">${summary.excludedCount}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">Package Size</span>
        <span class="metric-value">${packageSizeFormatted}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">Sensitive Files</span>
        <span class="metric-value ${sensitiveCount > 0 ? 'metric-warn' : 'metric-safe'}">${sensitiveCount}</span>
      </div>
      <div class="metric-tile">
        <span class="metric-label">Link Expiry</span>
        <span class="metric-value" id="summaryExpiryDisplay">${expiryHours} hours</span>
      </div>
    </div>

    ${this.renderShareOptionsHtml(expiryHours, isPasswordEnabled, 'summary_')}

    ${sensitiveFilesHtml}

    <div class="dp-trust-note">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink: 0; opacity: 0.8;">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      <span>Your project will be packaged and uploaded securely.</span>
    </div>
  </div>

  <div class="subview-actions-vertical">
    <button class="dp-action-btn dp-action-btn--primary" id="generateShareLinkBtn" style="height: 38px; justify-content: center;">
      <span>Generate Share Link</span>
    </button>
    <button class="dp-action-btn dp-action-btn--secondary" id="cancelShareSummaryBtn" style="height: 34px; justify-content: center; opacity: 0.85;">
      <span>Cancel</span>
    </button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let isSubmitting = false;
    let selectedExpiry = ${expiryHours};
    const passwordRequired = ${isPasswordEnabled};

    document.querySelectorAll('#summary_expiryChips .expiry-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#summary_expiryChips .expiry-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedExpiry = parseInt(chip.getAttribute('data-hours') || '24', 10);
        const disp = document.getElementById('summaryExpiryDisplay');
        if (disp) disp.textContent = selectedExpiry + ' hours';
      });
    });

    const togglePass = document.getElementById('summary_toggleShowPassword');
    if (togglePass) {
      togglePass.addEventListener('change', () => {
        const type = togglePass.checked ? 'text' : 'password';
        const p1 = document.getElementById('summary_sharePassword');
        const p2 = document.getElementById('summary_sharePasswordConfirm');
        if (p1) p1.type = type;
        if (p2) p2.type = type;
      });
    }

    const genBtn = document.getElementById('generateShareLinkBtn');
    const cancelBtn = document.getElementById('cancelShareSummaryBtn');
    const backBtn = document.getElementById('shareSummaryBackBtn');

    if (genBtn) {
      genBtn.addEventListener('click', () => {
        if (isSubmitting) return;

        let password;
        if (passwordRequired) {
          const p1 = document.getElementById('summary_sharePassword');
          const p2 = document.getElementById('summary_sharePasswordConfirm');
          const errEl = document.getElementById('summary_passwordError');
          const val1 = p1 ? p1.value.trim() : '';
          const val2 = p2 ? p2.value.trim() : '';

          if (!val1) {
            if (errEl) { errEl.textContent = 'Password is required.'; errEl.style.display = 'block'; }
            return;
          }
          if (val1.length < 4) {
            if (errEl) { errEl.textContent = 'Password must be at least 4 characters.'; errEl.style.display = 'block'; }
            return;
          }
          if (val1 !== val2) {
            if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; }
            return;
          }
          if (errEl) errEl.style.display = 'none';
          password = val1;
        }

        isSubmitting = true;
        genBtn.disabled = true;
        genBtn.classList.add('btn-disabled');
        if (cancelBtn) {
          cancelBtn.disabled = true;
          cancelBtn.classList.add('btn-disabled');
        }
        if (backBtn) {
          backBtn.disabled = true;
          backBtn.classList.add('btn-disabled');
        }
        genBtn.innerHTML = '<span>Preparing package...</span>';
        vscode.postMessage({
          command: 'shareSummaryGenerate',
          expiryHours: selectedExpiry,
          password
        });
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (isSubmitting) return;
        vscode.postMessage({ command: 'shareSummaryCancel' });
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (isSubmitting) return;
        vscode.postMessage({ command: 'shareSummaryCancel' });
      });
    }
  </script>
</body>
</html>`;
    }

    // 10. Default Idle View
    const workspaceCardHtml = info.hasWorkspace && info.name
      ? `
        <div class="dp-card">
          <div class="dp-status-chip">
            <span class="status-dot"></span>
            <span>WORKSPACE</span>
          </div>
          <div class="dp-project-title" title="${this.escapeHtml(info.name)}">${this.escapeHtml(info.name)}</div>
          <div class="dp-project-sub">Workspace detected</div>
          ${this._scanResult ? `
            <div class="dp-meta-row">
              <span>${this._scanResult.fileCount} files</span>
              <span class="dp-meta-dot">•</span>
              <span>${this.formatBytes(this._scanResult.totalSize)}</span>
              ${this._scanResult.excludedCount > 0 ? `
                <span class="dp-meta-dot">•</span>
                <span>${this._scanResult.excludedCount} excluded</span>
              ` : ''}
            </div>
          ` : `
            <div class="dp-meta-row">
              <span class="dp-meta-muted">${this._isScanning ? 'Analyzing workspace...' : 'Ready to scan'}</span>
            </div>
          `}
        </div>
      `
      : `
        <div class="dp-card dp-empty-card">
          <div class="empty-icon-wrap" aria-hidden="true">${logoSvg}</div>
          <div class="empty-title">No workspace detected</div>
          <div class="empty-desc">Open a project or folder to start packaging and sharing with DevParcel.</div>
        </div>
      `;

    const overviewHtml = info.hasWorkspace
      ? `
        <div class="dp-card">
          <div class="dp-overview-header">
            <span class="dp-section-kicker">PROJECT OVERVIEW</span>
            <button class="dp-refresh-btn" id="scanBtn" ${this._isScanning ? 'disabled' : ''} title="Refresh workspace metrics">
              <span class="refresh-icon ${this._isScanning ? 'spinning' : ''}">⟳</span>
              <span>${this._isScanning ? 'Scanning...' : 'Refresh'}</span>
            </button>
          </div>

          ${this._isScanning ? `
            <div class="scanning-indicator">
              <div class="shimmer-bar"></div>
              <span>Analyzing project files...</span>
            </div>
          ` : this._scanResult ? `
            <div class="metrics-grid">
              <div class="metric-tile">
                <span class="metric-label">Files</span>
                <span class="metric-value">${this._scanResult.fileCount}</span>
              </div>
              <div class="metric-tile">
                <span class="metric-label">Original Size</span>
                <span class="metric-value">${this.formatBytes(this._scanResult.totalSize)}</span>
              </div>
              <div class="metric-tile">
                <span class="metric-label">Excluded</span>
                <span class="metric-value">${this._scanResult.excludedCount}</span>
              </div>
              <div class="metric-tile">
                <span class="metric-label">Protection</span>
                <span class="metric-value metric-safe">Active</span>
              </div>
            </div>
          ` : `
            <div class="dp-meta-muted">Click Refresh to analyze workspace files.</div>
          `}
        </div>
      `
      : '';

    // History items list generation
    const historyFiltered = this._historyList.filter((item) => {
      if (this._historyFilter === 'all') return true;
      return item.status === this._historyFilter;
    });

    let historyItemsHtml = '';
    if (this._isLoadingHistory && this._historyList.length === 0) {
      historyItemsHtml = `<div class="dp-meta-muted" style="text-align: center; padding: 10px;">Loading history...</div>`;
    } else if (historyFiltered.length === 0) {
      historyItemsHtml = `<div class="dp-meta-muted" style="text-align: center; padding: 10px;">No ${this._historyFilter === 'all' ? '' : this._historyFilter} shares.</div>`;
    } else {
      historyItemsHtml = historyFiltered
        .map((item) => {
          const pName = this.escapeHtml(item.projectName);
          const status = item.status;
          let statusBadgeClass = 'active';
          let statusText = 'Active';
          if (status === 'expired') {
            statusBadgeClass = 'expired';
            statusText = 'Expired';
          } else if (status === 'revoked') {
            statusBadgeClass = 'revoked';
            statusText = 'Revoked';
          } else if (status === 'cleaned') {
            statusBadgeClass = 'cleaned';
            statusText = 'Cleaned';
          }

          const expiryInfo =
            status === 'active'
              ? `Expires in ${this.formatRelativeExpiry(item.expiresAt)}`
              : `Created ${new Date(item.createdAt).toLocaleDateString()}`;

          const downloadInfo =
            item.downloadCount !== undefined
              ? ` • ${item.downloadCount} dl${item.downloadCount === 1 ? '' : 's'}`
              : '';

          const passBadge = item.isPasswordProtected
            ? `<span title="Password Protected" style="font-size: 10px; margin-left: 3px;">🔒</span>`
            : '';

          const revokeBtnHtml =
            status === 'active'
              ? `<button type="button" class="history-btn history-btn--revoke" data-action="revoke" data-token="${this.escapeHtml(item.token)}" data-name="${pName}">Revoke</button>`
              : '';

          return `
            <div class="history-item-card">
              <div class="history-item-header">
                <span class="history-item-name" title="${pName}">${pName}</span>
                <span class="history-status-badge ${statusBadgeClass}">
                  <span>●</span> <span>${statusText}</span> ${passBadge}
                </span>
              </div>
              <div class="history-item-meta">
                <span>${expiryInfo}${downloadInfo}</span>
              </div>
              <div class="history-actions-row">
                <button type="button" class="history-btn" data-action="copy" data-url="${this.escapeHtml(item.publicUrl)}">Copy</button>
                <button type="button" class="history-btn" data-action="open" data-url="${this.escapeHtml(item.publicUrl)}">Open</button>
                ${revokeBtnHtml}
              </div>
            </div>
          `;
        })
        .join('');
    }

    const disabledAttr = info.hasWorkspace ? '' : 'disabled';
    const disabledClass = info.hasWorkspace ? '' : 'btn-disabled';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>DevParcel</title>
  <style>
    ${commonStyles}
  </style>
</head>
<body>
  <!-- Brand Header -->
  <div class="dp-header">
    <div class="dp-header-brand">
      <div class="dp-logo-badge">${logoSvg}</div>
      <div class="dp-header-text">
        <div class="dp-brand-title">DevParcel</div>
        <div class="dp-brand-subtitle">Secure Project Sharing</div>
      </div>
    </div>
    <button class="dp-btn-header-settings" id="settingsBtn" title="DevParcel Settings" aria-label="DevParcel Settings">
      <span class="dp-settings-icon">⚙</span>
    </button>
  </div>

  <!-- Workspace Card -->
  ${workspaceCardHtml}

  <!-- Project Overview Card -->
  ${overviewHtml}

  <!-- Action Stack Hierarchy -->
  <div class="dp-actions-stack">
    <!-- Primary: Download ZIP -->
    <button class="dp-action-btn dp-action-btn--primary ${disabledClass}" id="downloadZipBtn" ${disabledAttr}>
      <div class="btn-left-content">
        <span class="btn-icon">📥</span>
        <span class="btn-label">Download ZIP</span>
      </div>
      <span class="btn-chevron">›</span>
    </button>

    <!-- Secondary: Share ZIP -->
    <button class="dp-action-btn dp-action-btn--secondary ${disabledClass}" id="shareZipBtn" ${disabledAttr}>
      <div class="btn-left-content">
        <span class="btn-icon">↗</span>
        <span class="btn-label">Share ZIP</span>
      </div>
      <span class="btn-chevron">›</span>
    </button>

    <!-- Signature Accent Feature: Share Download Link -->
    <button class="dp-action-btn dp-action-btn--accent ${disabledClass}" id="shareLinkBtn" ${disabledAttr}>
      <div class="btn-accent-top">
        <div class="btn-left-content">
          <span class="btn-icon">🔗</span>
          <span class="btn-label">Share Download Link</span>
        </div>
        <span class="btn-chevron">›</span>
      </div>
      <div class="btn-accent-sub">Create temporary browser link</div>
    </button>
  </div>

  <!-- Drag & Drop ZIP Area -->
  <div class="dp-dropzone" id="dpDropzone">
    <div class="dp-dropzone-icon">📦</div>
    <div class="dp-dropzone-title">DROP A ZIP TO SHARE</div>
    <div class="dp-dropzone-sub">Drag &amp; drop a ZIP file here or</div>
    <button type="button" class="dp-dropzone-btn" id="chooseZipBtn">Choose ZIP</button>
  </div>

  <!-- Share History Section -->
  <div class="dp-history-section">
    <div class="dp-history-header">
      <span class="dp-section-kicker">SHARE HISTORY</span>
      <button class="dp-refresh-btn" id="refreshHistoryBtn" ${this._isLoadingHistory ? 'disabled' : ''} title="Refresh share history">
        <span class="refresh-icon ${this._isLoadingHistory ? 'spinning' : ''}">⟳</span>
        <span>${this._isLoadingHistory ? 'Loading...' : 'Refresh'}</span>
      </button>
    </div>

    <!-- Filter Pills -->
    <div class="dp-filter-pills">
      <button type="button" class="filter-pill ${this._historyFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
      <button type="button" class="filter-pill ${this._historyFilter === 'active' ? 'active' : ''}" data-filter="active">Active</button>
      <button type="button" class="filter-pill ${this._historyFilter === 'expired' ? 'active' : ''}" data-filter="expired">Expired</button>
      <button type="button" class="filter-pill ${this._historyFilter === 'revoked' ? 'active' : ''}" data-filter="revoked">Revoked</button>
    </div>

    <!-- History List -->
    <div class="history-list">
      ${historyItemsHtml}
    </div>
  </div>



  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    // Automatic Feasibility Diagnostic Check
    try {
      const hasShare = typeof navigator.share === 'function';
      const hasCanShare = typeof navigator.canShare === 'function';
      let canShareZip = false;
      let checkError = null;

      if (hasCanShare) {
        try {
          const testFile = new File([new Uint8Array(10)], 'test.zip', { type: 'application/zip' });
          canShareZip = navigator.canShare({ files: [testFile] });
        } catch (e) {
          checkError = e.message;
        }
      }

      vscode.postMessage({
        command: 'webShareFeasibilityResult',
        data: {
          hasShare,
          hasCanShare,
          canShareZip,
          isSecureContext: window.isSecureContext,
          protocol: location.protocol,
          error: checkError
        }
      });
    } catch (e) {}

    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'scanWorkspace' });
      });
    }

    document.getElementById('downloadZipBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'downloadZip' });
    });

    document.getElementById('shareZipBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'shareZip' });
    });

    document.getElementById('shareLinkBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'shareDownloadLink' });
    });

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'openSettings' });
      });
    }

    // Dropzone logic
    const dropzone = document.getElementById('dpDropzone');
    const chooseZipBtn = document.getElementById('chooseZipBtn');

    if (chooseZipBtn) {
      chooseZipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        vscode.postMessage({ command: 'chooseZipFile' });
      });
    }

    if (dropzone) {
      dropzone.addEventListener('click', () => {
        vscode.postMessage({ command: 'chooseZipFile' });
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer ? e.dataTransfer.files : null;
        if (!files || files.length === 0) return;
        const file = files[0];
        if (!file.name.toLowerCase().endsWith('.zip')) {
          return;
        }

        if (file.path) {
          vscode.postMessage({ command: 'zipFileDropped', filePath: file.path });
          return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target && evt.target.result) {
            const buf = Array.from(new Uint8Array(evt.target.result));
            vscode.postMessage({
              command: 'zipBinaryDropped',
              fileName: file.name,
              buffer: buf
            });
          }
        };
        reader.readAsArrayBuffer(file);
      });
    }

    // Filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const filter = pill.getAttribute('data-filter');
        vscode.postMessage({ command: 'setHistoryFilter', filter });
      });
    });

    // Refresh history button
    const refreshHistBtn = document.getElementById('refreshHistoryBtn');
    if (refreshHistBtn) {
      refreshHistBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'requestHistory' });
      });
    }

    // History item buttons
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!target || !target.classList.contains('history-btn')) return;
      const action = target.getAttribute('data-action');
      if (action === 'copy') {
        const url = target.getAttribute('data-url');
        if (url) vscode.postMessage({ command: 'copyShareUrl', url });
      } else if (action === 'open') {
        const url = target.getAttribute('data-url');
        if (url) vscode.postMessage({ command: 'openShareUrl', url });
      } else if (action === 'revoke') {
        const token = target.getAttribute('data-token');
        const projectName = target.getAttribute('data-name');
        if (token) vscode.postMessage({ command: 'requestRevoke', token, projectName });
      }
    });
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

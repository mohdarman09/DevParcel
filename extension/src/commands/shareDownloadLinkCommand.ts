import * as vscode from 'vscode';
import { WorkspaceDetector } from '../workspace';
import { scanWorkspace } from '../scanner';
import { DevParcelConfig } from '../config';
import { ZipEngine, ZipResult } from '../zip';
import { DevParcelViewProvider } from '../ui';
import { SensitiveFileDetector } from '../security';
import { ProjectSummaryBuilder } from '../summary';
import { SharingService, BackendClient, ShareLinkResult } from '../sharing';
import { ScanResult, SecurityScanResult, ProjectSummaryData } from '../types';
import { SenderIdentityService } from '../services/SenderIdentityService';

let isShareLinkOperationActive = false;

export function isShareOperationInProgress(): boolean {
  return isShareLinkOperationActive;
}

export function resetShareOperationLock(): void {
  isShareLinkOperationActive = false;
}

export async function handleShareDownloadLink(viewProvider?: DevParcelViewProvider): Promise<void> {
  // Prevent duplicate concurrent share link generation operations
  if (isShareLinkOperationActive) {
    vscode.window.showInformationMessage('DevParcel: Share link generation is already in progress.');
    return;
  }

  // 1. Check workspace
  const workspaceInfo = WorkspaceDetector.getWorkspaceInfo();
  if (!workspaceInfo.hasWorkspace || !workspaceInfo.rootPath) {
    vscode.window.showWarningMessage(
      'DevParcel: No workspace detected. Open a project folder to create a share download link.'
    );
    return;
  }

  const projectName = workspaceInfo.name || 'project';
  console.log(`[ShareLink] Starting share creation for ${projectName}`);

  // 2. Perform single scan of workspace files
  let scanResult: ScanResult;
  try {
    const configuredExclusions = DevParcelConfig.getDefaultExclusions();
    scanResult = await scanWorkspace(workspaceInfo.rootPath, { defaultExclusions: configuredExclusions });
  } catch (scanErr: any) {
    vscode.window.showErrorMessage(
      `DevParcel: Workspace scan failed: ${scanErr.message || scanErr}`
    );
    return;
  }

  if (scanResult.includedFiles.length === 0) {
    vscode.window.showWarningMessage('DevParcel: No files found to package.');
    return;
  }

  // 3. Detect sensitive files (fail-safe: never share if detector throws)
  let securityResult: SecurityScanResult;
  try {
    securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
  } catch (secErr: any) {
    vscode.window.showErrorMessage(
      `DevParcel: Sensitive file detection failed: ${secErr.message || secErr}. Sharing aborted for security.`
    );
    return;
  }

  // 4. Build project summary data
  let summaryData: ProjectSummaryData;
  try {
    summaryData = ProjectSummaryBuilder.build(scanResult, securityResult);
  } catch (sumErr: any) {
    vscode.window.showErrorMessage(
      `DevParcel: Failed to generate project summary: ${sumErr.message || sumErr}`
    );
    return;
  }

  // 5. Read configured link expiry
  const expiryHours = DevParcelConfig.getDefaultLinkExpiryHours();

  // 6. Open Share Summary / Confirmation screen BEFORE packaging and uploading
  let confirmationDecision: 'generate' | 'cancel' = 'generate';

  if (viewProvider && viewProvider.isResolved) {
    await vscode.commands.executeCommand('devparcel.views.main.focus');
    confirmationDecision = await viewProvider.showShareSummary(summaryData, expiryHours);
  } else {
    // Fallback modal confirmation dialog when webview is not active
    const sizeStr = formatBytes(summaryData.totalSize);
    const detailMsg = `Files: ${summaryData.fileCount} | Original Size: ${sizeStr} | Excluded: ${summaryData.excludedCount} | Expiry: ${expiryHours}h${
      summaryData.hasSensitiveFiles ? ` | ⚠️ Sensitive: ${summaryData.sensitiveFiles.length}` : ''
    }`;
    const choice = await vscode.window.showInformationMessage(
      `DevParcel: Ready to share "${summaryData.projectName}".\n${detailMsg}`,
      { modal: true },
      'Generate Share Link'
    );
    confirmationDecision = choice === 'Generate Share Link' ? 'generate' : 'cancel';
  }

  if (confirmationDecision === 'cancel') {
    if (viewProvider) {
      viewProvider.resetToIdle();
    }
    return;
  }

  // User confirmed -> acquire operation lock and proceed to packaging + upload
  isShareLinkOperationActive = true;
  const tempZipPath = SharingService.createTemporarySharePath(projectName);

  try {
    // 7. Compress files into temporary ZIP with progress notification
    let zipResult: ZipResult | undefined;
    let isCancelled = false;

    try {
      zipResult = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'DevParcel: Preparing package...',
          cancellable: true,
        },
        async (progress, token) => {
          progress.report({
            message: `Packaging ${scanResult.fileCount} files...`,
          });

          const result = await ZipEngine.createZip(
            scanResult.includedFiles,
            tempZipPath,
            {
              cancellationToken: token,
              onProgress: (processed, total) => {
                progress.report({
                  message: `Compressing ${processed}/${total} files...`,
                });
              },
            }
          );

          if (token.isCancellationRequested) {
            isCancelled = true;
            return undefined;
          }

          return result;
        }
      );
    } catch (err: any) {
      SharingService.cleanupTemporaryShareFile(tempZipPath);
      if (viewProvider) {
        viewProvider.resetToIdle();
      }
      if (err.message === 'ZIP creation was cancelled.') {
        vscode.window.showInformationMessage('DevParcel: ZIP creation cancelled.');
        return;
      }
      vscode.window.showErrorMessage(
        `DevParcel: Failed to create temporary share ZIP: ${err.message || err}`
      );
      return;
    }

    if (isCancelled || !zipResult) {
      SharingService.cleanupTemporaryShareFile(tempZipPath);
      if (viewProvider) {
        viewProvider.resetToIdle();
      }
      vscode.window.showInformationMessage('DevParcel: Share operation cancelled.');
      return;
    }

    console.log(`[ShareLink] ZIP ready: ${tempZipPath}`);
    console.log(`[ShareLink] ZIP size: ${zipResult.zipSize} bytes`);

    // Proactively check if ZIP exceeds cloud sharing limit BEFORE initiating upload
    if (zipResult.zipSize > DevParcelConfig.MAX_UPLOAD_SIZE_BYTES) {
      console.log(
        `[ShareLink] ZIP size (${zipResult.zipSize} bytes) exceeds cloud limit (${DevParcelConfig.MAX_UPLOAD_SIZE_BYTES} bytes). Showing fallback.`
      );

      let decision: 'explorer' | 'cancel' = 'explorer';

      if (viewProvider && viewProvider.isResolved) {
        await vscode.commands.executeCommand('devparcel.views.main.focus');
        decision = await viewProvider.showPackageTooLarge({
          projectName,
          zipPath: tempZipPath,
          zipSize: zipResult.zipSize,
          maxSizeBytes: DevParcelConfig.MAX_UPLOAD_SIZE_BYTES,
        });
      } else {
        const formattedSize = formatBytes(zipResult.zipSize);
        const maxMb = DevParcelConfig.MAX_UPLOAD_SIZE_MB;
        const choice = await vscode.window.showWarningMessage(
          `DevParcel: Your ZIP is ${formattedSize}, which is larger than the ${maxMb} MB cloud sharing limit, so we can't generate a download link for it. You can still send this ZIP directly using Windows Explorer.`,
          { modal: true },
          'Send ZIP by Explorer 📁'
        );
        decision = choice === 'Send ZIP by Explorer 📁' ? 'explorer' : 'cancel';
      }

      if (decision === 'explorer') {
        const revealed = await SharingService.revealInExplorer(tempZipPath);
        if (revealed) {
          vscode.window.showInformationMessage(
            'DevParcel: The ZIP package has been revealed in Windows Explorer for manual sharing.'
          );
        } else {
          vscode.window.showErrorMessage(
            'DevParcel: Failed to open ZIP in Windows Explorer.'
          );
        }
      } else {
        SharingService.cleanupTemporaryShareFile(tempZipPath);
        if (viewProvider) {
          viewProvider.resetToIdle();
        }
        vscode.window.showInformationMessage('DevParcel: Sharing cancelled.');
      }
      return;
    }

    // 8. Upload ZIP to backend with real streaming progress notification
    const backendUrl = DevParcelConfig.getBackendUrl();
    const senderId = SenderIdentityService.getOrCreateSenderId();
    const actualExpiryHours = (viewProvider as any)?.lastSelectedExpiryHours || expiryHours;
    const actualPassword = (viewProvider as any)?.lastSelectedPassword;

    let shareLinkResult: ShareLinkResult | undefined;

    try {
      shareLinkResult = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'DevParcel: Uploading package to cloud storage...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Uploading package... 0%' });
          console.log('[ShareLink] Sending upload request');

          if (viewProvider && viewProvider.isResolved && typeof (viewProvider as any).showUploadProgress === 'function') {
            (viewProvider as any).showUploadProgress({
              stage: 'preparing',
              percent: 0,
              bytesUploaded: 0,
              totalBytes: zipResult!.zipSize,
            });
          }

          const uploadPromise = BackendClient.uploadShare(
            backendUrl,
            tempZipPath,
            {
              projectName,
              fileCount: zipResult!.fileCount,
              originalSize: summaryData.totalSize,
              packageSize: zipResult!.zipSize,
              excludedCount: summaryData.excludedCount,
              sensitiveFileCount: summaryData.sensitiveFiles.length,
              expiryHours: actualExpiryHours,
              senderId,
              password: actualPassword,
            },
            {
              timeoutMs: 90000,
              senderId,
              onProgress: (p) => {
                if (p.stage === 'uploading') {
                  progress.report({
                    message: `Uploading package... ${p.percent}%`,
                  });
                } else if (p.stage === 'creating') {
                  progress.report({ message: 'Creating secure share...' });
                } else if (p.stage === 'ready') {
                  progress.report({ message: 'Share link ready' });
                }

                if (viewProvider && viewProvider.isResolved && typeof (viewProvider as any).showUploadProgress === 'function') {
                  (viewProvider as any).showUploadProgress(p);
                }
              },
            }
          );

          const res = await uploadPromise;
          progress.report({ message: 'Share link ready' });
          return res;
        }
      );
    } catch (uploadErr: any) {
      SharingService.cleanupTemporaryShareFile(tempZipPath);
      const errMessage = uploadErr.message || 'Failed to upload share package.';

      if (viewProvider && viewProvider.isResolved && typeof (viewProvider as any).showUploadError === 'function') {
        (viewProvider as any).showUploadError(errMessage);
      } else if (viewProvider && typeof viewProvider.resetToIdle === 'function') {
        viewProvider.resetToIdle();
      }

      if (errMessage.includes('timed out')) {
        vscode.window.showErrorMessage(
          'DevParcel: Cloud upload timed out. Please check your connection and try again.'
        );
      } else {
        vscode.window.showErrorMessage(`DevParcel: ${errMessage}`);
      }
      return;
    } finally {
      // Always remove temporary file from local filesystem
      SharingService.cleanupTemporaryShareFile(tempZipPath);
    }

    if (!shareLinkResult) {
      if (viewProvider) {
        viewProvider.resetToIdle();
      }
      return;
    }

    // 9. Display "Share Link Created" UI in webview
    if (viewProvider && viewProvider.isResolved) {
      await vscode.commands.executeCommand('devparcel.views.main.focus');
      viewProvider.showShareLinkCreated(shareLinkResult, expiryHours);
    }

    // 10. Also present actionable notification with Copy / Open actions
    const notificationMsg = `DevParcel: 🔗 Share link created for ${projectName}! (Expires in ${expiryHours}h)`;
    vscode.window
      .showInformationMessage(notificationMsg, 'Copy Link', 'Open Link')
      .then((choice) => {
        if (choice === 'Copy Link') {
          vscode.env.clipboard.writeText(shareLinkResult!.publicUrl);
          vscode.window.showInformationMessage('DevParcel: Share link copied to clipboard!');
        } else if (choice === 'Open Link') {
          vscode.env.openExternal(vscode.Uri.parse(shareLinkResult!.publicUrl));
        }
      });
  } finally {
    isShareLinkOperationActive = false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${formatted} ${sizes[i]}`;
}

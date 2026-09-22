import * as vscode from 'vscode';
import { WorkspaceDetector } from '../workspace';
import { scanWorkspace } from '../scanner';
import { DevParcelConfig } from '../config';
import { ZipEngine, ZipResult } from '../zip';
import { DevParcelViewProvider } from '../ui';
import { SensitiveFileDetector } from '../security';
import { ProjectSummaryBuilder } from '../summary';
import { SharingService } from '../sharing';
import { ScanResult, SecurityScanResult, ProjectSummaryData } from '../types';

export async function handleShareZip(viewProvider?: DevParcelViewProvider): Promise<void> {
  // 1. Check workspace
  const workspaceInfo = WorkspaceDetector.getWorkspaceInfo();
  if (!workspaceInfo.hasWorkspace || !workspaceInfo.rootPath) {
    vscode.window.showWarningMessage(
      'DevParcel: No workspace detected. Open a project folder to share a ZIP.'
    );
    return;
  }

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

  // 5. Sensitive file protection (evaluated REGARDLESS of showProjectSummary)
  if (securityResult.hasSensitiveFiles) {
    let warningDecision: 'include-anyway' | 'cancel' = 'cancel';

    if (viewProvider && viewProvider.isResolved) {
      await vscode.commands.executeCommand('devparcel.views.main.focus');
      warningDecision = await viewProvider.showSensitiveWarning(securityResult.sensitiveFiles);
    } else {
      // Fallback modal warning dialog when webview is not active
      const fileList = securityResult.sensitiveFiles.map((f) => `• ${f.relativePath}`).join('\n');
      const warningMsg = `DevParcel: ${securityResult.sensitiveFiles.length} sensitive file(s) detected:\n\n${fileList}\n\nThese files may contain passwords, API keys, certificates, or private keys. Including them may expose secrets.`;
      const choice = await vscode.window.showWarningMessage(
        warningMsg,
        { modal: true },
        'Include Anyway'
      );
      warningDecision = choice === 'Include Anyway' ? 'include-anyway' : 'cancel';
    }

    if (warningDecision === 'cancel') {
      if (viewProvider) {
        viewProvider.resetToIdle();
      }
      return;
    }
  }

  // 6. Prepare temporary share file path outside workspace
  const projectName = workspaceInfo.name || 'project';
  const tempZipPath = SharingService.createTemporarySharePath(projectName);

  // 7. Compress files into temporary ZIP with progress notification
  let zipResult: ZipResult | undefined;
  let isCancelled = false;

  try {
    zipResult = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'DevParcel: Preparing shareable package...',
        cancellable: true
      },
      async (progress, token) => {
        progress.report({
          message: `Packaging ${scanResult.fileCount} files...`
        });

        const result = await ZipEngine.createZip(
          scanResult.includedFiles,
          tempZipPath,
          {
            cancellationToken: token,
            onProgress: (processed, total) => {
              progress.report({
                message: `Compressing ${processed}/${total} files...`
              });
            }
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

  // 8. Delegate to SharingService (uses provider abstraction + webview bridge with single Ready to Share screen)
  const showSummary = DevParcelConfig.getShowProjectSummary();
  const sharingService = new SharingService();
  const shareResult = await sharingService.share(tempZipPath, {
    projectName,
    summary: summaryData,
    showSummary,
    packageSize: zipResult.zipSize,
    totalSize: summaryData.totalSize,
    fileCount: zipResult.fileCount,
    viewBridge: viewProvider
  });

  if (shareResult.cancelled) {
    SharingService.cleanupTemporaryShareFile(tempZipPath);
    if (viewProvider) {
      viewProvider.resetToIdle();
    }
    vscode.window.showInformationMessage('DevParcel: Sharing cancelled.');
    return;
  }

  if (!shareResult.success) {
    SharingService.cleanupTemporaryShareFile(tempZipPath);
    if (viewProvider) {
      viewProvider.resetToIdle();
    }
    vscode.window.showErrorMessage(
      `DevParcel: ${shareResult.error || 'Failed to share project.'}`
    );
    return;
  }

  // Notify user with provider/fallback details
  if (shareResult.message) {
    vscode.window.showInformationMessage(`DevParcel: ${shareResult.message}`);
  } else {
    vscode.window.showInformationMessage('DevParcel: Share operation completed successfully.');
  }
}

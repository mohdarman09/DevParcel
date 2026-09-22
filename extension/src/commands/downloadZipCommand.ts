import * as vscode from 'vscode';
import * as path from 'path';
import { WorkspaceDetector } from '../workspace';
import { scanWorkspace } from '../scanner';
import { DevParcelConfig } from '../config';
import { ZipEngine, ZipResult } from '../zip';
import { DevParcelViewProvider } from '../ui';
import { SensitiveFileDetector } from '../security';
import { ProjectSummaryBuilder } from '../summary';
import { ScanResult, SecurityScanResult, ProjectSummaryData } from '../types';

export async function handleDownloadZip(viewProvider?: DevParcelViewProvider): Promise<void> {
  // 1. Check workspace
  const workspaceInfo = WorkspaceDetector.getWorkspaceInfo();
  if (!workspaceInfo.hasWorkspace || !workspaceInfo.rootPath) {
    vscode.window.showWarningMessage(
      'DevParcel: No workspace detected. Open a project folder to download a ZIP.'
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

  // 3. Detect sensitive files (fail-safe: never package if detector throws)
  let securityResult: SecurityScanResult;
  try {
    securityResult = SensitiveFileDetector.detect(scanResult.includedFiles);
  } catch (secErr: any) {
    vscode.window.showErrorMessage(
      `DevParcel: Sensitive file detection failed: ${secErr.message || secErr}. Packaging aborted for security.`
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

  // 5. If showProjectSummary is enabled, display summary before packaging
  const showSummary = DevParcelConfig.getShowProjectSummary();
  if (showSummary) {
    let summaryDecision: 'confirm' | 'cancel' = 'confirm';

    if (viewProvider && viewProvider.isResolved) {
      await vscode.commands.executeCommand('devparcel.views.main.focus');
      summaryDecision = await viewProvider.showSummary(summaryData);
    } else {
      // Fallback modal dialog when webview is not active
      const sizeStr = formatBytes(summaryData.totalSize);
      const detailMsg = `Files: ${summaryData.fileCount} | Original Size: ${sizeStr} | Excluded: ${summaryData.excludedCount}${
        summaryData.hasSensitiveFiles ? ` | ⚠️ Sensitive: ${summaryData.sensitiveFiles.length}` : ''
      }`;
      const choice = await vscode.window.showInformationMessage(
        `DevParcel: Ready to package "${summaryData.projectName}".\n${detailMsg}`,
        { modal: true },
        'Download ZIP'
      );
      summaryDecision = choice === 'Download ZIP' ? 'confirm' : 'cancel';
    }

    if (summaryDecision === 'cancel') {
      if (viewProvider) {
        viewProvider.resetToIdle();
      }
      return;
    }
  }

  // 6. Sensitive file protection (evaluated REGARDLESS of showProjectSummary)
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

  // 7. Prompt for save location (after user confirms summary and security warning)
  const projectName = workspaceInfo.name || 'project';
  const defaultZipName = `${projectName}.zip`;
  const defaultDir = path.dirname(workspaceInfo.rootPath);
  const defaultUri = vscode.Uri.file(path.join(defaultDir, defaultZipName));

  const targetUri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: {
      'ZIP Archive': ['zip']
    },
    saveLabel: 'Save ZIP',
    title: 'DevParcel: Save Project ZIP'
  });

  if (!targetUri) {
    // User cancelled the save dialog
    if (viewProvider) {
      viewProvider.resetToIdle();
    }
    return;
  }

  // 8. Compress files into ZIP archive with progress notification
  let zipResult: ZipResult | undefined;
  let isCancelled = false;

  try {
    zipResult = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'DevParcel: Packaging project...',
        cancellable: true
      },
      async (progress, token) => {
        progress.report({
          message: `Packaging ${scanResult.fileCount} files...`
        });

        const result = await ZipEngine.createZip(
          scanResult.includedFiles,
          targetUri.fsPath,
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
    if (viewProvider) {
      viewProvider.resetToIdle();
    }
    if (err.message === 'ZIP creation was cancelled.') {
      vscode.window.showInformationMessage('DevParcel: ZIP creation cancelled.');
      return;
    }
    vscode.window.showErrorMessage(
      `DevParcel: Failed to create ZIP archive: ${err.message || err}`
    );
    return;
  } finally {
    if (viewProvider) {
      viewProvider.resetToIdle();
    }
  }

  // 9. Post-packaging status and notification
  if (isCancelled) {
    vscode.window.showInformationMessage('DevParcel: ZIP creation cancelled.');
    return;
  }

  if (!zipResult) {
    vscode.window.showWarningMessage('DevParcel: Failed to generate ZIP archive.');
    return;
  }

  const sizeStr = formatBytes(zipResult.zipSize);
  const fileName = path.basename(zipResult.outputPath);
  const choice = await vscode.window.showInformationMessage(
    `DevParcel: Successfully created ${fileName} (${sizeStr}, ${zipResult.fileCount} files).`,
    'Open in Folder'
  );

  if (choice === 'Open in Folder') {
    await vscode.commands.executeCommand('revealFileInOS', targetUri);
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

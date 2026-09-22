import * as vscode from 'vscode';
import { handleDownloadZip } from './downloadZipCommand';
import { handleShareZip } from './shareZipCommand';
import { handleShareDownloadLink } from './shareDownloadLinkCommand';
import { DevParcelViewProvider } from '../ui';

export function registerCommands(
  context: vscode.ExtensionContext,
  viewProvider?: DevParcelViewProvider
): void {
  // Command to open / focus the DevParcel sidebar
  const openCmd = vscode.commands.registerCommand('devparcel.open', async () => {
    await vscode.commands.executeCommand('devparcel.views.main.focus');
  });

  // Action: Download ZIP (Implemented in Phase 3 & 4)
  const downloadZipCmd = vscode.commands.registerCommand('devparcel.downloadZip', async () => {
    await handleDownloadZip(viewProvider);
  });

  // Action: Share ZIP (Implemented in Phase 5)
  const shareZipCmd = vscode.commands.registerCommand('devparcel.shareZip', async () => {
    await handleShareZip(viewProvider);
  });

  // Action: Share Download Link (Implemented in Phase 6)
  const shareDownloadLinkCmd = vscode.commands.registerCommand('devparcel.shareDownloadLink', async () => {
    await handleShareDownloadLink(viewProvider);
  });

  // Action: Open Settings
  const openSettingsCmd = vscode.commands.registerCommand('devparcel.openSettings', async () => {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'devparcel');
  });

  // Diagnostic: Test Web Share API Capability
  const testWebShareCmd = vscode.commands.registerCommand('devparcel.testWebShare', async () => {
    if (!viewProvider || !viewProvider.isResolved) {
      vscode.window.showWarningMessage(
        'DevParcel: Please open the DevParcel sidebar first to test Web Share capability.'
      );
      return;
    }

    const diag = viewProvider.getFeasibilityResult();
    if (!diag) {
      vscode.window.showInformationMessage(
        'DevParcel: Web Share diagnostic probe is running. Please try again in a moment.'
      );
      return;
    }

    const shareStatus = diag.hasShare ? '✅ Available' : '❌ Not Available';
    const canShareStatus = diag.hasCanShare ? '✅ Available' : '❌ Not Available';
    const zipStatus = diag.canShareZip ? '✅ Supported' : '❌ Not Supported';
    const secureStatus = diag.isSecureContext ? '✅ Yes' : '❌ No';
    const protocol = diag.protocol || 'unknown';
    const errorInfo = diag.error ? `\nError: ${diag.error}` : '';

    const message = `DevParcel Web Share Diagnostics:\n• navigator.share: ${shareStatus}\n• navigator.canShare: ${canShareStatus}\n• canShare({ files: [zip] }): ${zipStatus}\n• Secure Context: ${secureStatus}\n• Protocol: ${protocol}${errorInfo}`;

    vscode.window.showInformationMessage(message, { modal: true });
  });

  context.subscriptions.push(
    openCmd,
    downloadZipCmd,
    shareZipCmd,
    shareDownloadLinkCmd,
    openSettingsCmd,
    testWebShareCmd
  );
}

import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { DevParcelViewProvider } from './ui';

export function activate(context: vscode.ExtensionContext): void {
  // 1. Register Sidebar Webview View Provider
  const viewProvider = new DevParcelViewProvider(context.extensionUri, context);
  const viewRegistration = vscode.window.registerWebviewViewProvider(
    DevParcelViewProvider.viewType,
    viewProvider
  );

  // 2. Register Commands
  registerCommands(context, viewProvider);

  context.subscriptions.push(viewRegistration);
}

export function deactivate(): void {
  // Clean up resources if needed when the extension is deactivated
}

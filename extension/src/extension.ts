import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { DevParcelViewProvider } from './ui';
import { DevParcelConfig } from './config';

export function activate(context: vscode.ExtensionContext): void {
  // 1. Initialize backend URL resolution based on extension runtime mode
  DevParcelConfig.setExtensionMode(context.extensionMode);

  // 2. Register Sidebar Webview View Provider
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

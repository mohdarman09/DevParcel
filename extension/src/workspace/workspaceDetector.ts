import * as vscode from 'vscode';
import { WorkspaceInfo } from '../types';

export class WorkspaceDetector {
  public static getWorkspaceInfo(): WorkspaceInfo {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return {
        hasWorkspace: false,
        name: null,
        rootPath: null,
        folderCount: 0
      };
    }

    const primaryFolder = folders[0];
    return {
      hasWorkspace: true,
      name: primaryFolder.name,
      rootPath: primaryFolder.uri.fsPath,
      folderCount: folders.length
    };
  }

  public static onDidChangeWorkspace(listener: (info: WorkspaceInfo) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeWorkspaceFolders(() => {
      listener(this.getWorkspaceInfo());
    });
  }
}

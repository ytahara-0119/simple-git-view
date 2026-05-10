import * as vscode from 'vscode';
import { getCurrentBranch, getChangedFiles } from './gitService';

export class GitStatusProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (element) {
      return [];
    }
    // ルート: ブランチノード + ファイルノード
    const branch = getCurrentBranch(this.workspaceRoot);
    const branchItem = new vscode.TreeItem(`Branch: ${branch}`, vscode.TreeItemCollapsibleState.None);
    branchItem.iconPath = new vscode.ThemeIcon('git-branch');

    const files = getChangedFiles(this.workspaceRoot);
    const fileItems = files.map(f => {
      const item = new vscode.TreeItem(f.path, vscode.TreeItemCollapsibleState.None);
      item.description = f.status;
      item.iconPath = new vscode.ThemeIcon('file');
      return item;
    });

    return [branchItem, ...fileItems];
  }
}

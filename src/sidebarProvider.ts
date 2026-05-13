import * as vscode from 'vscode';
import * as path from 'path';
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
      const absolutePath = path.join(this.workspaceRoot, f.path);
      const uri = vscode.Uri.file(absolutePath);
      item.resourceUri = uri;
      // 削除済みファイル（status `D`）は vscode.open でエラーになるので command を設定しない
      if (f.status !== 'D') {
        item.command = {
          command: 'vscode.open',
          arguments: [uri],
          title: 'Open File',
        };
      }
      return item;
    });

    return [branchItem, ...fileItems];
  }
}

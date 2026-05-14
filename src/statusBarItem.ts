import * as vscode from 'vscode';
import { getCurrentBranch } from './gitService';

export class StatusBarBranch {
  private readonly item: vscode.StatusBarItem;
  private readonly cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'simpleGitView.showHistory';
    this.item.tooltip = 'Simple Git View: Show Commit History';
    this.update();
    this.item.show();
  }

  update(): void {
    const branch = getCurrentBranch(this.cwd);
    this.item.text = branch ? `$(git-branch) ${branch}` : '';
    if (!branch) {
      this.item.hide();
    } else {
      this.item.show();
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}

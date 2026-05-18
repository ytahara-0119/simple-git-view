import * as vscode from 'vscode';
import { getCurrentBranch } from './gitService';

export class StatusBarBranch {
  private readonly item: vscode.StatusBarItem;
  private readonly cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'simpleGitView.showHistory';
    const md = new vscode.MarkdownString();
    md.appendMarkdown('**Simple Git View**\n\n');
    md.appendMarkdown('- Click: Show commit history\n');
    md.appendMarkdown('- `⌘⇧P` → `Git View` for all commands\n');
    this.item.tooltip = md;
    this.update();
    this.item.show();
  }

  update(): void {
    const branch = getCurrentBranch(this.cwd);
    this.item.text = branch ? `🌸 ${branch}` : '';
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

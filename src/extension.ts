import * as vscode from 'vscode';
import { BlameDecorationProvider } from './blameDecoration';
import { HistoryPanel } from './historyPanel';
import { StatusBarBranch } from './statusBarItem';

export function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) { return; }
  const cwd = workspaceFolders[0].uri.fsPath;

  // 1. StatusBar ブランチ表示
  const statusBar = new StatusBarBranch(cwd);
  context.subscriptions.push(statusBar);
  const headWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(cwd, '.git/HEAD')
  );
  headWatcher.onDidChange(() => statusBar.update());
  headWatcher.onDidCreate(() => statusBar.update());
  context.subscriptions.push(headWatcher);

  // 2. Blame 常時表示
  const blameProvider = new BlameDecorationProvider();
  if (vscode.window.activeTextEditor) {
    blameProvider.applyBlame(vscode.window.activeTextEditor);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) { blameProvider.applyBlame(editor); }
    })
  );

  // 3. コミット履歴コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand('simpleGitView.showHistory', () => {
      HistoryPanel.show(cwd, context);
    })
  );
}

export function deactivate() {}

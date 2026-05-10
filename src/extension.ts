import * as vscode from 'vscode';
import { GitStatusProvider } from './sidebarProvider';
import { BlameDecorationProvider } from './blameDecoration';
import { HistoryPanel } from './historyPanel';

export function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) { return; }
  const cwd = workspaceFolders[0].uri.fsPath;

  // 1. サイドバー TreeView
  const statusProvider = new GitStatusProvider(cwd);
  const treeView = vscode.window.createTreeView('simpleGitView.gitStatus', {
    treeDataProvider: statusProvider,
  });

  // 2. ファイル保存時にサイドバーを更新
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => statusProvider.refresh())
  );

  // 3. Blame 常時表示
  const blameProvider = new BlameDecorationProvider();
  if (vscode.window.activeTextEditor) {
    blameProvider.applyBlame(vscode.window.activeTextEditor);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) { blameProvider.applyBlame(editor); }
    })
  );

  // 4. コミット履歴コマンド
  context.subscriptions.push(
    vscode.commands.registerCommand('simpleGitView.showHistory', () => {
      HistoryPanel.show(cwd, context);
    })
  );

  context.subscriptions.push(treeView);
}

export function deactivate() {}

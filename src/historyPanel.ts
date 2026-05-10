import * as vscode from 'vscode';
import { getCommitLog, getCommitFiles } from './gitService';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class HistoryPanel {
  private static currentPanel: HistoryPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly cwd: string;

  static show(cwd: string, context: vscode.ExtensionContext): void {
    if (HistoryPanel.currentPanel) {
      HistoryPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'simpleGitViewHistory',
      'Git History',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    HistoryPanel.currentPanel = new HistoryPanel(panel, cwd);
    context.subscriptions.push(panel);
  }

  private constructor(panel: vscode.WebviewPanel, cwd: string) {
    this.panel = panel;
    this.cwd = cwd;
    this.panel.webview.html = this.getHtml();
    this.panel.webview.onDidReceiveMessage(msg => this.handleMessage(msg));
    this.panel.onDidDispose(() => {
      HistoryPanel.currentPanel = undefined;
    });
  }

  private handleMessage(msg: { command: string; hash?: string }): void {
    if (msg.command === 'showFiles' && msg.hash) {
      const files = getCommitFiles(this.cwd, msg.hash);
      this.panel.webview.postMessage({ command: 'renderFiles', files, hash: msg.hash });
    }
  }

  private getHtml(): string {
    const commits = getCommitLog(this.cwd);

    const rows = commits
      .map(commit => {
        const hash = escapeHtml(commit.hash);
        const shortHash = escapeHtml(commit.hash.slice(0, 7));
        const message = escapeHtml(commit.message);
        const author = escapeHtml(commit.author);
        const date = escapeHtml(commit.date);
        return `<tr data-hash="${hash}" style="cursor:pointer;" onclick="onRowClick(this)">
          <td style="font-family:monospace;white-space:nowrap;">${shortHash}</td>
          <td>${message}</td>
          <td style="white-space:nowrap;">${author}</td>
          <td style="white-space:nowrap;">${date}</td>
        </tr>`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Git History</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      margin: 0;
      padding: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead tr {
      background-color: var(--vscode-editorGroupHeader-tabsBackground);
      color: var(--vscode-tab-activeForeground);
    }
    th, td {
      padding: 4px 8px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-widget-border, #444);
    }
    tbody tr:hover {
      background-color: var(--vscode-list-hoverBackground);
    }
    tbody tr.selected {
      background-color: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }
    #file-list {
      margin-top: 16px;
    }
    #file-list h3 {
      margin: 0 0 8px 0;
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
    #file-list ul {
      margin: 0;
      padding-left: 20px;
    }
    #file-list li {
      font-family: monospace;
      padding: 2px 0;
    }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th>ハッシュ</th>
        <th>メッセージ</th>
        <th>著者</th>
        <th>日時</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div id="file-list"></div>
  <script>
    const vscode = acquireVsCodeApi();
    let selectedRow = null;

    function onRowClick(row) {
      if (selectedRow) {
        selectedRow.classList.remove('selected');
      }
      row.classList.add('selected');
      selectedRow = row;
      const hash = row.getAttribute('data-hash');
      vscode.postMessage({ command: 'showFiles', hash });
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command === 'renderFiles') {
        const container = document.getElementById('file-list');
        const shortHash = msg.hash ? msg.hash.slice(0, 7) : '';
        if (!msg.files || msg.files.length === 0) {
          container.innerHTML = '<h3>変更ファイル (' + shortHash + ')</h3><p>変更なし</p>';
          return;
        }
        const items = msg.files
          .map(f => '<li>' + escapeHtml(f) + '</li>')
          .join('');
        container.innerHTML = '<h3>変更ファイル (' + shortHash + ')</h3><ul>' + items + '</ul>';
      }
    });

    function escapeHtml(s) {
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  </script>
</body>
</html>`;
  }
}

import * as vscode from 'vscode';
import { getCommitLog, getCommitFiles, getFileLog, getDiffUris } from './gitService';

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

  private handleMessage(msg: { command: string; hash?: string; filePath?: string }): void {
    if (msg.command === 'showFiles' && msg.hash) {
      const files = getCommitFiles(this.cwd, msg.hash);
      this.panel.webview.postMessage({ command: 'renderFiles', files, hash: msg.hash });
    }

    if (msg.command === 'showFileLog' && msg.filePath) {
      const commits = getFileLog(this.cwd, msg.filePath);
      this.panel.webview.postMessage({ command: 'renderFileLog', commits, filePath: msg.filePath });
    }

    if (msg.command === 'showDiff' && msg.hash && msg.filePath) {
      const uris = getDiffUris(this.cwd, msg.hash, msg.filePath);
      const title = `${msg.filePath} @ ${msg.hash.slice(0, 7)}`;
      vscode.commands.executeCommand('vscode.diff', uris.before, uris.after, title);
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
      cursor: pointer;
    }
    #file-list li:hover {
      color: var(--vscode-list-hoverForeground);
      background-color: var(--vscode-list-hoverBackground);
    }
    #file-log {
      margin-top: 16px;
    }
    #file-log h3 {
      margin: 0 0 8px 0;
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
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
  <div id="file-log"></div>
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
        const fileLog = document.getElementById('file-log');
        fileLog.innerHTML = '';
        const shortHash = msg.hash ? msg.hash.slice(0, 7) : '';
        if (!msg.files || msg.files.length === 0) {
          container.innerHTML = '<h3>変更ファイル (' + shortHash + ')</h3><p>変更なし</p>';
          return;
        }
        const ul = document.createElement('ul');
        msg.files.forEach(f => {
          const li = document.createElement('li');
          li.textContent = f;
          li.addEventListener('click', () => {
            vscode.postMessage({ command: 'showFileLog', filePath: f });
          });
          ul.appendChild(li);
        });
        container.innerHTML = '<h3>変更ファイル (' + shortHash + ')</h3>';
        container.appendChild(ul);
      }

      if (msg.command === 'renderFileLog') {
        const container = document.getElementById('file-log');
        if (!msg.commits || msg.commits.length === 0) {
          container.innerHTML = '<h3>' + escapeHtml(msg.filePath) + ' の履歴</h3><p>履歴なし</p>';
          return;
        }
        const rows = msg.commits.map(c => {
          const hash = escapeHtml(c.hash);
          const shortHash = escapeHtml(c.hash.slice(0, 7));
          const message = escapeHtml(c.message);
          const author = escapeHtml(c.author);
          const date = escapeHtml(c.date);
          return '<tr data-hash="' + hash + '" data-filepath="' + escapeHtml(msg.filePath) + '" style="cursor:pointer;" onclick="onFileLogRowClick(this)">' +
            '<td style="font-family:monospace;white-space:nowrap;">' + shortHash + '</td>' +
            '<td>' + message + '</td>' +
            '<td style="white-space:nowrap;">' + author + '</td>' +
            '<td style="white-space:nowrap;">' + date + '</td>' +
            '</tr>';
        }).join('');
        container.innerHTML = '<h3>' + escapeHtml(msg.filePath) + ' の履歴</h3>' +
          '<table style="width:100%;border-collapse:collapse;">' +
          '<thead><tr>' +
          '<th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--vscode-widget-border,#444);">ハッシュ</th>' +
          '<th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--vscode-widget-border,#444);">メッセージ</th>' +
          '<th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--vscode-widget-border,#444);">著者</th>' +
          '<th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--vscode-widget-border,#444);">日時</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
          '</table>';
      }
    });

    function onFileLogRowClick(row) {
      const hash = row.getAttribute('data-hash');
      const filePath = row.getAttribute('data-filepath');
      vscode.postMessage({ command: 'showDiff', hash, filePath });
    }

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

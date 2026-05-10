import * as vscode from 'vscode';
import { getCommitLog, getCommitFiles, getFileLog, getDiffUris } from './gitService';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function openDiff(cwd: string, hash: string, filePath: string): void {
  const uris = getDiffUris(cwd, hash, filePath);
  const title = `${filePath} @ ${hash.slice(0, 7)}`;
  vscode.commands.executeCommand('vscode.diff', uris.before, uris.after, title);
}

function openFileHistoryPanel(cwd: string, filePath: string): void {
  const commits = getFileLog(cwd, filePath);
  const panel = vscode.window.createWebviewPanel(
    'simpleGitViewFileHistory',
    `${filePath} — 履歴`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  const rows = commits.map(c => {
    const hash = escapeHtml(c.hash);
    const shortHash = escapeHtml(c.hash.slice(0, 7));
    const message = escapeHtml(c.message);
    const author = escapeHtml(c.author);
    const date = escapeHtml(c.date);
    return `<tr data-hash="${hash}" data-filepath="${escapeHtml(filePath)}" style="cursor:pointer;" onclick="onRowClick(this)">
      <td style="font-family:monospace;white-space:nowrap;">${shortHash}</td>
      <td>${message}</td>
      <td style="white-space:nowrap;">${author}</td>
      <td style="white-space:nowrap;">${date}</td>
    </tr>`;
  }).join('\n');

  panel.webview.html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(filePath)} — 履歴</title>
  <style>
    body { font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background-color:var(--vscode-editor-background);margin:0;padding:8px; }
    h3 { margin:0 0 8px 0;font-size:var(--vscode-font-size); }
    table { width:100%;border-collapse:collapse; }
    thead tr { background-color:var(--vscode-editorGroupHeader-tabsBackground); }
    th,td { padding:4px 8px;text-align:left;border-bottom:1px solid var(--vscode-widget-border,#444); }
    tbody tr:hover { background-color:var(--vscode-list-hoverBackground); }
    tbody tr.selected { background-color:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground); }
  </style>
</head>
<body>
  <h3>${escapeHtml(filePath)}</h3>
  <table>
    <thead><tr><th>ハッシュ</th><th>メッセージ</th><th>著者</th><th>日時</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>
    const vscode = acquireVsCodeApi();
    let selectedRow = null;
    function onRowClick(row) {
      if (selectedRow) { selectedRow.classList.remove('selected'); }
      row.classList.add('selected');
      selectedRow = row;
      vscode.postMessage({ command: 'showDiff', hash: row.getAttribute('data-hash'), filePath: row.getAttribute('data-filepath') });
    }
  </script>
</body>
</html>`;

  panel.webview.onDidReceiveMessage(msg => {
    if (msg.command === 'showDiff' && msg.hash && msg.filePath) {
      openDiff(cwd, msg.hash, msg.filePath);
    }
  });
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

    if (msg.command === 'showDiff' && msg.hash && msg.filePath) {
      openDiff(this.cwd, msg.hash, msg.filePath);
    }

    if (msg.command === 'showFileLog' && msg.filePath) {
      openFileHistoryPanel(this.cwd, msg.filePath);
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
    table { width:100%;border-collapse:collapse; }
    thead tr { background-color:var(--vscode-editorGroupHeader-tabsBackground);color:var(--vscode-tab-activeForeground); }
    th,td { padding:4px 8px;text-align:left;border-bottom:1px solid var(--vscode-widget-border,#444); }
    tbody tr:hover { background-color:var(--vscode-list-hoverBackground); }
    tbody tr.selected { background-color:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground); }
    #file-list { margin-top:16px; }
    #file-list h3 { margin:0 0 4px 0;font-size:var(--vscode-font-size); }
    #file-list ul { margin:0;padding-left:20px; }
    #file-list li {
      font-family:monospace;
      padding:2px 4px;
      cursor:pointer;
      outline:none;
      list-style:none;
    }
    #file-list li:hover { background-color:var(--vscode-list-hoverBackground); }
    #file-list li:focus { background-color:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground); }
    .hint { font-size:0.85em;color:var(--vscode-descriptionForeground);margin:4px 0 0 0; }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr><th>ハッシュ</th><th>メッセージ</th><th>著者</th><th>日時</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div id="file-list"></div>
  <script>
    const vscode = acquireVsCodeApi();
    let selectedRow = null;
    let currentHash = null;

    function onRowClick(row) {
      if (selectedRow) { selectedRow.classList.remove('selected'); }
      row.classList.add('selected');
      selectedRow = row;
      currentHash = row.getAttribute('data-hash');
      vscode.postMessage({ command: 'showFiles', hash: currentHash });
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command !== 'renderFiles') { return; }
      const container = document.getElementById('file-list');
      const shortHash = msg.hash ? msg.hash.slice(0, 7) : '';
      if (!msg.files || msg.files.length === 0) {
        container.innerHTML = '<h3>変更ファイル (' + shortHash + ')</h3><p>変更なし</p>';
        return;
      }
      const ul = document.createElement('ul');
      msg.files.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f;
        li.tabIndex = 0;
        li.title = 'クリック: diff を開く  /  h キー: ファイル履歴を新規タブで開く';
        li.addEventListener('click', () => {
          if (currentHash) {
            vscode.postMessage({ command: 'showDiff', hash: currentHash, filePath: f });
          }
        });
        li.addEventListener('keydown', e => {
          if (e.key === 'h') {
            vscode.postMessage({ command: 'showFileLog', filePath: f });
          }
        });
        ul.appendChild(li);
      });
      container.innerHTML = '<h3>変更ファイル (' + shortHash + ')</h3><p class="hint">クリック: diff  /  h キー: ファイル履歴（新規タブ）</p>';
      container.appendChild(ul);
    });
  </script>
</body>
</html>`;
  }
}

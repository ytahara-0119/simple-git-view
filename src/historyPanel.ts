import * as vscode from 'vscode';
import { getCommitLog, getCommitFiles, getFileLog, getDiffUris, getFileDiff } from './gitService';

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

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

function openFileHistoryPanel(cwd: string, filePath: string, extensionUri: vscode.Uri): void {
  const commits = getFileLog(cwd, filePath);
  const fileNonce = getNonce();
  const panel = vscode.window.createWebviewPanel(
    'simpleGitViewFileHistory',
    `${filePath} — 履歴`,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out')],
    }
  );
  const csp = panel.webview.cspSource;
  const scriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'out', 'fileHistoryMain.js')
  );

  const rows = commits.map(c => {
    const hash = escapeHtml(c.hash);
    const shortHash = escapeHtml(c.hash.slice(0, 7));
    const message = escapeHtml(c.message);
    const author = escapeHtml(c.author);
    const date = escapeHtml(c.date);
    return `<tr data-hash="${hash}" data-filepath="${escapeHtml(filePath)}" tabindex="-1" style="cursor:pointer;">
      <td class="col-hash">${shortHash}</td>
      <td class="col-msg">${message}</td>
      <td class="col-author">${author}</td>
      <td class="col-date">${date}</td>
    </tr>`;
  }).join('\n');

  panel.webview.html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${csp}; script-src 'nonce-${fileNonce}' ${csp};">
  <title>${escapeHtml(filePath)} — 履歴</title>
  <style>
    body { font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background-color:var(--vscode-editor-background);margin:0;padding:8px; }
    h3 { margin:0 0 8px 0;font-size:var(--vscode-font-size); }
    table.commit-table { width:100%;border-collapse:collapse;table-layout:fixed; }
    table.commit-table thead, table.commit-table tbody { display:block;width:100%; }
    table.commit-table thead tr, table.commit-table tbody tr { display:table;width:100%;table-layout:fixed; }
    table.commit-table tbody { max-height:280px;overflow-y:auto; }
    table.commit-table thead tr { background-color:var(--vscode-editorGroupHeader-tabsBackground); }
    table.commit-table th, table.commit-table td { padding:4px 8px;text-align:left;border-bottom:1px solid var(--vscode-widget-border,#444);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    table.commit-table .col-hash { width:80px;font-family:monospace; }
    table.commit-table .col-msg { width:auto;white-space:nowrap; }
    table.commit-table .col-author { width:140px; }
    table.commit-table .col-date { width:120px; }
    table.commit-table tbody tr:hover { background-color:var(--vscode-list-hoverBackground); }
    table.commit-table tbody tr.selected { background-color:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground); }
    table.commit-table tbody tr:focus { outline:1px solid var(--vscode-focusBorder,#007acc);outline-offset:-1px; }
    #diff-view { margin-top:12px; }
    #diff-view h3 { margin:0 0 4px 0;font-size:var(--vscode-font-size); }
    .split-diff { width:100%;border-collapse:collapse;font-family:monospace;font-size:1.15em;table-layout:fixed; }
    .split-diff col.col-ln { width:40px; }
    .split-diff col.col-code { width:calc(50% - 40px); }
    .split-diff td { padding:1px 6px;white-space:pre;overflow:hidden;text-overflow:ellipsis;vertical-align:top; }
    .split-diff td:not(.ln) { width:calc(50% - 40px);overflow-x:auto;text-overflow:clip;scrollbar-width:thin; }
    .split-diff td:not(.ln)::-webkit-scrollbar { height:6px; }
    .split-diff td:not(.ln)::-webkit-scrollbar-thumb { background:var(--vscode-scrollbarSlider-background); }
    .split-diff td.ln { width:40px;min-width:40px;text-align:right;padding:1px 8px;color:var(--vscode-editorLineNumber-foreground,#858585);background:var(--vscode-editor-background);user-select:none;border-right:1px solid var(--vscode-widget-border,#444); }
    .split-diff tr.diff-meta td, .split-diff tr.diff-hunk td { color:var(--vscode-descriptionForeground);background:var(--vscode-textCodeBlock-background); }
    .split-diff td.diff-del { background:rgba(244,71,71,0.18); }
    .split-diff td.diff-add { background:rgba(78,201,78,0.18); }
    .split-diff td.diff-empty { background:rgba(128,128,128,0.08); }
  </style>
</head>
<body>
  <h3>${escapeHtml(filePath)}</h3>
  <table class="commit-table">
    <thead><tr><th class="col-hash">ハッシュ</th><th class="col-msg">メッセージ</th><th class="col-author">著者</th><th class="col-date">日時</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div id="diff-view"></div>
  <script nonce="${fileNonce}" src="${scriptUri}"></script>
</body>
</html>`;

  panel.webview.onDidReceiveMessage(msg => {
    if (msg.command === 'showDiff' && msg.hash && msg.filePath) {
      const diff = getFileDiff(cwd, msg.hash, msg.filePath);
      panel.webview.postMessage({ command: 'renderDiff', diff, filePath: msg.filePath });
    }
  });
}

export class HistoryPanel {
  private static currentPanel: HistoryPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly cwd: string;
  private readonly extensionUri: vscode.Uri;

  static show(cwd: string, context: vscode.ExtensionContext): void {
    if (HistoryPanel.currentPanel) {
      HistoryPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'simpleGitViewHistory',
      'Git History',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out')],
      }
    );

    HistoryPanel.currentPanel = new HistoryPanel(panel, cwd, context.extensionUri);
    context.subscriptions.push(panel);
  }

  private constructor(panel: vscode.WebviewPanel, cwd: string, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.cwd = cwd;
    this.extensionUri = extensionUri;
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

    if (msg.command === 'showFileDiff' && msg.hash && msg.filePath) {
      const diff = getFileDiff(this.cwd, msg.hash, msg.filePath);
      this.panel.webview.postMessage({ command: 'renderDiff', diff, filePath: msg.filePath });
    }

    if (msg.command === 'showFileLog' && msg.filePath) {
      openFileHistoryPanel(this.cwd, msg.filePath, this.extensionUri);
    }
  }

  private getHtml(): string {
    const nonce = getNonce();
    const csp = this.panel.webview.cspSource;
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'out', 'webviewMain.js')
    );
    const commits = getCommitLog(this.cwd);

    const rows = commits
      .map(commit => {
        const hash = escapeHtml(commit.hash);
        const shortHash = escapeHtml(commit.hash.slice(0, 7));
        const message = escapeHtml(commit.message);
        const author = escapeHtml(commit.author);
        const date = escapeHtml(commit.date);
        return `<tr data-hash="${hash}" tabindex="-1" style="cursor:pointer;">
          <td class="col-hash">${shortHash}</td>
          <td class="col-msg">${message}</td>
          <td class="col-author">${author}</td>
          <td class="col-date">${date}</td>
        </tr>`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${csp}; script-src 'nonce-${nonce}' ${csp};">
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
    table.commit-table { width:100%;border-collapse:collapse;table-layout:fixed; }
    table.commit-table thead, table.commit-table tbody { display:block;width:100%; }
    table.commit-table thead tr, table.commit-table tbody tr { display:table;width:100%;table-layout:fixed; }
    table.commit-table tbody { max-height:280px;overflow-y:auto; }
    table.commit-table thead tr { background-color:var(--vscode-editorGroupHeader-tabsBackground);color:var(--vscode-tab-activeForeground); }
    table.commit-table th, table.commit-table td { padding:4px 8px;text-align:left;border-bottom:1px solid var(--vscode-widget-border,#444);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    table.commit-table .col-hash { width:80px;font-family:monospace; }
    table.commit-table .col-msg { width:auto;white-space:nowrap; }
    table.commit-table .col-author { width:140px; }
    table.commit-table .col-date { width:120px; }
    table.commit-table tbody tr:hover { background-color:var(--vscode-list-hoverBackground); }
    table.commit-table tbody tr.selected { background-color:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground); }
    table.commit-table tbody tr:focus { outline:1px solid var(--vscode-focusBorder,#007acc);outline-offset:-1px; }
    #file-list { margin-top:16px; }
    #file-list h3 { margin:0 0 4px 0;font-size:var(--vscode-font-size); }
    #file-list ul { margin:0;padding-left:0; }
    #file-list li {
      font-family:monospace;
      padding:2px 4px;
      cursor:pointer;
      outline:none;
      list-style:none;
    }
    #file-list li:hover { background-color:var(--vscode-list-hoverBackground); }
    #file-list li.selected { background-color:rgba(80,200,120,0.25);color:var(--vscode-foreground); }
    #file-list li:focus { background-color:var(--vscode-list-focusBackground,rgba(80,200,120,0.4));outline:1px solid var(--vscode-focusBorder,#007acc);outline-offset:-1px; }
    .hint { font-size:0.85em;color:var(--vscode-descriptionForeground);margin:4px 0 0 0; }
    #diff-view { margin-top:12px; }
    #diff-view h3 { margin:0 0 4px 0;font-size:var(--vscode-font-size); }
    #diff-view pre {
      margin:0;
      padding:8px;
      font-family:monospace;
      font-size:0.9em;
      overflow-x:auto;
      background-color:var(--vscode-textCodeBlock-background);
      border:1px solid var(--vscode-widget-border,#444);
      white-space:pre;
    }
    .split-diff { width:100%;border-collapse:collapse;font-family:monospace;font-size:1.15em;table-layout:fixed; }
    .split-diff col.col-ln { width:40px; }
    .split-diff col.col-code { width:calc(50% - 40px); }
    .split-diff td { padding:1px 6px;white-space:pre;overflow:hidden;text-overflow:ellipsis;vertical-align:top; }
    .split-diff td:not(.ln) { width:calc(50% - 40px);overflow-x:auto;text-overflow:clip;scrollbar-width:thin; }
    .split-diff td:not(.ln)::-webkit-scrollbar { height:6px; }
    .split-diff td:not(.ln)::-webkit-scrollbar-thumb { background:var(--vscode-scrollbarSlider-background); }
    .split-diff td.ln { width:40px;min-width:40px;text-align:right;padding:1px 8px;color:var(--vscode-editorLineNumber-foreground,#858585);background:var(--vscode-editor-background);user-select:none;border-right:1px solid var(--vscode-widget-border,#444); }
    .split-diff tr.diff-meta td, .split-diff tr.diff-hunk td { color:var(--vscode-descriptionForeground);background:var(--vscode-textCodeBlock-background); }
    .split-diff td.diff-del { background:rgba(244,71,71,0.18); }
    .split-diff td.diff-add { background:rgba(78,201,78,0.18); }
    .split-diff td.diff-empty { background:rgba(128,128,128,0.08); }
  </style>
</head>
<body>
  <table class="commit-table">
    <thead>
      <tr><th class="col-hash">ハッシュ</th><th class="col-msg">メッセージ</th><th class="col-author">著者</th><th class="col-date">日時</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div id="file-list"></div>
  <div id="diff-view"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

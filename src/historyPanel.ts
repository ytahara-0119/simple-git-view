import * as vscode from 'vscode';
import { getCommitLog, getCommitFiles, getFileLog, getFileDiff, getTotalCommitCount } from './gitService';

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

const fileHistoryPanels = new Map<string, vscode.WebviewPanel>();

export function openFileHistoryPanel(cwd: string, filePath: string, extensionUri: vscode.Uri): void {
  const targetColumn = HistoryPanel.currentPanel?.viewColumn ?? vscode.ViewColumn.Beside;
  const existing = fileHistoryPanels.get(filePath);
  if (existing) {
    existing.reveal(targetColumn);
    return;
  }
  const commits = getFileLog(cwd, filePath);
  const totalCount = getTotalCommitCount(cwd, filePath);
  const fileNonce = getNonce();
  const panel = vscode.window.createWebviewPanel(
    'simpleGitViewFileHistory',
    `${filePath} — 履歴`,
    targetColumn,
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
    const ins = c.insertions;
    const del = c.deletions;
    const cls = c.isMerge ? 'is-merge' : '';
    return `<tr class="${cls}" data-hash="${hash}" data-filepath="${escapeHtml(filePath)}" tabindex="-1" style="cursor:pointer;">
      <td class="col-hash">${shortHash}</td>
      <td class="col-msg">${message}</td>
      <td class="col-stat"><span class="ins">+${ins}</span><span class="del">-${del}</span></td>
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
    table.commit-table .col-stat { width:90px;font-family:monospace; }
    table.commit-table .ins { color:var(--vscode-gitDecoration-addedResourceForeground,#3fb950); }
    table.commit-table .del { color:var(--vscode-gitDecoration-deletedResourceForeground,#f85149);margin-left:4px; }
    table.commit-table .col-author { width:140px; }
    table.commit-table .col-date { width:130px; }
    table.commit-table tbody tr:hover { background-color:var(--vscode-list-hoverBackground); }
    table.commit-table tbody tr.selected { background-color:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground); }
    table.commit-table tbody tr:focus { outline:1px solid var(--vscode-focusBorder,#007acc);outline-offset:-1px; }
    body.hide-merges table.commit-table tbody tr.is-merge { display:none; }
    #diff-view { margin-top:12px; outline:none; }
    #diff-view:focus { outline:1px solid var(--vscode-focusBorder,#007acc);outline-offset:-1px; }
    #diff-view h3 { margin:0 0 4px 0;font-size:var(--vscode-font-size); }
    .split-diff { font-family:monospace;font-size:1.15em; }
    .split-diff .row { display:grid;grid-template-columns:40px 1fr 40px 1fr;border-bottom:1px solid transparent; }
    .split-diff .row.meta, .split-diff .row.hunk { grid-template-columns:1fr;color:var(--vscode-descriptionForeground);background:var(--vscode-textCodeBlock-background); }
    .split-diff .meta-content { padding:1px 6px;white-space:pre;overflow-x:auto; }
    .split-diff .ln { text-align:right;padding:1px 8px;color:var(--vscode-editorLineNumber-foreground,#858585);background:var(--vscode-editor-background);user-select:none;border-right:1px solid var(--vscode-widget-border,#444); }
    .split-diff .cell { padding:1px 6px;white-space:pre;overflow-x:auto;min-width:0;scrollbar-width:thin; }
    .split-diff .cell::-webkit-scrollbar { height:6px; }
    .split-diff .cell::-webkit-scrollbar-thumb { background:var(--vscode-scrollbarSlider-background); }
    .split-diff .cell.diff-del { background:rgba(244,71,71,0.18); }
    .split-diff .cell.diff-add { background:rgba(78,201,78,0.18); }
    .split-diff .cell.diff-empty { background:rgba(128,128,128,0.08); }
    .hint { font-size:0.85em;color:var(--vscode-descriptionForeground);margin:4px 0 8px 0; }
    .status-line { font-size:0.85em;color:var(--vscode-descriptionForeground);margin:4px 0; }
    kbd {
      display: inline-block;
      padding: 0 4px;
      font-size: 0.85em;
      font-family: var(--vscode-editor-font-family, monospace);
      border: 1px solid var(--vscode-widget-border, #444);
      border-radius: 3px;
      background: var(--vscode-keybindingLabel-background, rgba(128,128,128,0.17));
      color: var(--vscode-keybindingLabel-foreground, inherit);
    }
    .hint kbd { margin: 0 2px; }
  </style>
</head>
<body class="hide-merges" data-total-count="${totalCount}" data-shown-count="${commits.length}">
  <h3>${escapeHtml(filePath)}</h3>
  <p class="hint">
    <kbd>↑↓</kbd> 移動 ·
    <kbd>Enter</kbd> diff へ ·
    <kbd>m</kbd> マージ表示 ·
    <kbd>q</kbd> 閉じる
  </p>
  <table class="commit-table">
    <thead><tr><th class="col-hash">ハッシュ</th><th class="col-msg">メッセージ</th><th class="col-stat">変更</th><th class="col-author">著者</th><th class="col-date">日時</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="status-line"><span class="merge-status">Merges: hidden (m)</span> · <span class="commit-count">Showing ${commits.length} / total: ${totalCount}</span></p>
  <div id="diff-view" tabindex="0"></div>
  <script nonce="${fileNonce}" src="${scriptUri}"></script>
</body>
</html>`;

  panel.webview.onDidReceiveMessage(msg => {
    if (msg.command === 'showDiff' && msg.hash && msg.filePath) {
      const diff = getFileDiff(cwd, msg.hash, msg.filePath);
      panel.webview.postMessage({ command: 'renderDiff', diff, filePath: msg.filePath });
    }
    if (msg.command === 'close') {
      panel.dispose();
      HistoryPanel.currentPanel?.reveal();
    }
  });

  fileHistoryPanels.set(filePath, panel);
  panel.onDidDispose(() => {
    fileHistoryPanels.delete(filePath);
  });
}

export class HistoryPanel {
  static currentPanel: HistoryPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly cwd: string;
  private readonly extensionUri: vscode.Uri;

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.Beside);
  }

  get viewColumn(): vscode.ViewColumn | undefined {
    return this.panel.viewColumn;
  }

  static show(cwd: string, context: vscode.ExtensionContext): void {
    if (HistoryPanel.currentPanel) {
      HistoryPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'simpleGitViewHistory',
      'Git History',
      vscode.ViewColumn.Beside,
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
    const totalCount = getTotalCommitCount(this.cwd);

    const rows = commits
      .map(commit => {
        const hash = escapeHtml(commit.hash);
        const shortHash = escapeHtml(commit.hash.slice(0, 7));
        const message = escapeHtml(commit.message);
        const author = escapeHtml(commit.author);
        const date = escapeHtml(commit.date);
        const ins = commit.insertions;
        const del = commit.deletions;
        const cls = commit.isMerge ? 'is-merge' : '';
        return `<tr class="${cls}" data-hash="${hash}" tabindex="-1" style="cursor:pointer;">
          <td class="col-hash">${shortHash}</td>
          <td class="col-msg">${message}</td>
          <td class="col-stat"><span class="ins">+${ins}</span><span class="del">-${del}</span></td>
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
    table.commit-table .col-stat { width:90px;font-family:monospace; }
    table.commit-table .ins { color:var(--vscode-gitDecoration-addedResourceForeground,#3fb950); }
    table.commit-table .del { color:var(--vscode-gitDecoration-deletedResourceForeground,#f85149);margin-left:4px; }
    table.commit-table .col-author { width:140px; }
    table.commit-table .col-date { width:130px; }
    table.commit-table tbody tr:hover { background-color:var(--vscode-list-hoverBackground); }
    table.commit-table tbody tr.selected { background-color:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground); }
    table.commit-table tbody tr:focus { outline:1px solid var(--vscode-focusBorder,#007acc);outline-offset:-1px; }
    body.hide-merges table.commit-table tbody tr.is-merge { display:none; }
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
    .status-line { font-size:0.85em;color:var(--vscode-descriptionForeground);margin:4px 0; }
    kbd {
      display: inline-block;
      padding: 0 4px;
      font-size: 0.85em;
      font-family: var(--vscode-editor-font-family, monospace);
      border: 1px solid var(--vscode-widget-border, #444);
      border-radius: 3px;
      background: var(--vscode-keybindingLabel-background, rgba(128,128,128,0.17));
      color: var(--vscode-keybindingLabel-foreground, inherit);
    }
    .hint kbd { margin: 0 2px; }
    .commit-hint { margin: 6px 0 0 0; }
    #diff-view { margin-top:12px; outline:none; }
    #diff-view:focus { outline:1px solid var(--vscode-focusBorder,#007acc);outline-offset:-1px; }
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
    .split-diff { font-family:monospace;font-size:1.15em; }
    .split-diff .row { display:grid;grid-template-columns:40px 1fr 40px 1fr;border-bottom:1px solid transparent; }
    .split-diff .row.meta, .split-diff .row.hunk { grid-template-columns:1fr;color:var(--vscode-descriptionForeground);background:var(--vscode-textCodeBlock-background); }
    .split-diff .meta-content { padding:1px 6px;white-space:pre;overflow-x:auto; }
    .split-diff .ln { text-align:right;padding:1px 8px;color:var(--vscode-editorLineNumber-foreground,#858585);background:var(--vscode-editor-background);user-select:none;border-right:1px solid var(--vscode-widget-border,#444); }
    .split-diff .cell { padding:1px 6px;white-space:pre;overflow-x:auto;min-width:0;scrollbar-width:thin; }
    .split-diff .cell::-webkit-scrollbar { height:6px; }
    .split-diff .cell::-webkit-scrollbar-thumb { background:var(--vscode-scrollbarSlider-background); }
    .split-diff .cell.diff-del { background:rgba(244,71,71,0.18); }
    .split-diff .cell.diff-add { background:rgba(78,201,78,0.18); }
    .split-diff .cell.diff-empty { background:rgba(128,128,128,0.08); }
  </style>
</head>
<body class="hide-merges" data-total-count="${totalCount}" data-shown-count="${commits.length}">
  <table class="commit-table">
    <thead>
      <tr><th class="col-hash">ハッシュ</th><th class="col-msg">メッセージ</th><th class="col-stat">変更</th><th class="col-author">著者</th><th class="col-date">日時</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="hint commit-hint">
    <kbd>↑↓</kbd> 移動 ·
    <kbd>Enter</kbd> ファイル一覧へ ·
    <kbd>m</kbd> マージ表示
  </p>
  <p class="status-line"><span class="merge-status">Merges: hidden (m)</span> · <span class="commit-count">Showing ${commits.length} / total: ${totalCount}</span></p>
  <div id="file-list"></div>
  <div id="diff-view" tabindex="0"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

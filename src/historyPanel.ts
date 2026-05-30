import * as vscode from 'vscode';
import * as path from 'path';
import { getCommitLog, getCommitFiles, getFileLog, getFileDiff, getTotalCommitCount, getCommitRangeFiles, getCommitRangeDiff } from './gitService';
import { ThemeEntry, DEFAULT_FIGMA_THEME, DEFAULT_FILE_HISTORY_THEME, buildRootCss, loadThemesFromFolder } from './themeLoader';

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

// Shared CSS using CSS variables (--sgv-*) for theming
const SHARED_STYLE = `
    body { font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--sgv-text);background:linear-gradient(142deg,var(--sgv-bg1) 0%,var(--sgv-bg2) 100%);margin:0;padding:0; }
    .tab-bar { background:linear-gradient(to right,var(--sgv-tab1),var(--sgv-tab2),var(--sgv-tab3));color:#ffffff;padding:12px 24px;font-size:14px;font-weight:600;box-shadow:0 10px 8px -6px rgba(0,0,0,0.1); }
    .theme-badge { font-size:0.75em;font-weight:400;opacity:0.9;margin-left:12px;padding:2px 10px;border-radius:999px;background:rgba(255,255,255,0.25); }
    .panel-section { padding:16px 24px; }
    table.commit-table { width:100%;border-collapse:collapse;table-layout:fixed;border-radius:16px;overflow:hidden;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1); }
    table.commit-table thead, table.commit-table tbody { display:block;width:100%; }
    table.commit-table thead tr, table.commit-table tbody tr { display:table;width:100%;table-layout:fixed; }
    table.commit-table tbody { max-height:280px;overflow-y:auto; }
    table.commit-table thead tr { background:linear-gradient(to right,var(--sgv-th1),var(--sgv-th2));color:var(--sgv-th-text); }
    table.commit-table th, table.commit-table td { padding:6px 8px;text-align:left;border-bottom:1px solid var(--sgv-row-border);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    table.commit-table .col-hash { width:80px;font-family:monospace;color:var(--sgv-hash); }
    table.commit-table .col-msg { width:auto;white-space:nowrap;color:var(--sgv-text); }
    table.commit-table .col-stat { width:90px;font-family:monospace; }
    table.commit-table .ins { color:var(--sgv-ins);font-weight:bold; }
    table.commit-table .del { color:var(--sgv-del);margin-left:4px; }
    table.commit-table .col-author { width:140px;color:var(--sgv-author); }
    table.commit-table .col-date { width:130px;color:var(--sgv-date); }
    table.commit-table tbody tr:hover { background-color:rgba(255,255,255,0.5); }
    table.commit-table tbody tr.selected { background:linear-gradient(to right,var(--sgv-sel1),var(--sgv-sel2));color:var(--sgv-sel-text); }
    table.commit-table tbody tr.marked { background: linear-gradient(to right,var(--sgv-mark1),var(--sgv-mark2)); color:var(--sgv-mark-text); }
    table.commit-table tbody tr.marked.selected { background: linear-gradient(to right,var(--sgv-marksel1),var(--sgv-marksel2)); color:var(--sgv-marksel-text); }
    table.commit-table tbody tr:focus { outline:2px solid var(--sgv-focus);outline-offset:-2px; }
    body.hide-merges table.commit-table tbody tr.is-merge { display:none; }
    #file-list { margin-top:4px; }
    #file-list h3 { margin:0 0 8px 0;font-size:var(--vscode-font-size);color:var(--sgv-text); }
    #file-list ul { margin:0;padding-left:0;display:flex;flex-direction:column;gap:6px; }
    #file-list li { font-family:monospace;padding:8px 16px;cursor:pointer;outline:none;list-style:none;border-radius:14px;background:rgba(255,255,255,0.6);color:var(--sgv-text);font-size:14px; }
    #file-list li:hover { background:rgba(255,255,255,0.85); }
    #file-list li.selected { background:linear-gradient(to right,var(--sgv-fsel1),var(--sgv-fsel2));color:var(--sgv-text);font-weight:600;box-shadow:0 4px 3px rgba(0,0,0,0.1); }
    #file-list li:focus { background:rgba(255,255,255,0.85);outline:2px solid var(--sgv-focus);outline-offset:-2px; }
    .hint { display:inline-flex;align-items:center;font-size:0.85em;color:var(--sgv-hint-text);margin:8px 0 0 0;background:var(--sgv-hint-bg);padding:4px 14px;border-radius:999px; }
    .status-line { display:inline-flex;align-items:center;font-size:0.85em;color:var(--sgv-status-text);margin:6px 0 0 6px;background:var(--sgv-status-bg);padding:4px 14px;border-radius:999px; }
    .commit-hint { margin:8px 0 0 0; }
    .file-hint { display:inline-flex;align-items:center;font-size:0.85em;color:var(--sgv-fhint-text);margin:8px 0 0 0;background:var(--sgv-fhint-bg);padding:4px 14px;border-radius:999px; }
    kbd { display:inline-block;padding:0 4px;font-size:0.85em;font-family:monospace;border:1px solid var(--sgv-kbd-border);border-radius:3px;background:var(--sgv-kbd-bg);color:var(--sgv-kbd-text); }
    .hint kbd { margin:0 2px; }
    #diff-view { padding:0 24px 16px;outline:none; }
    #diff-view:focus { outline:2px solid var(--sgv-focus);outline-offset:-2px; }
    #diff-view h3 { background:linear-gradient(to right,var(--sgv-dh1),var(--sgv-dh2),var(--sgv-dh3));color:#ffffff;padding:10px 20px;font-size:14px;font-weight:600;margin:8px 0 0 0;box-shadow:0 4px 3px rgba(0,0,0,0.1),0 2px 2px rgba(0,0,0,0.1);border-radius:14px 14px 0 0; }
    .split-diff { font-family:monospace;font-size:1.15em;background:linear-gradient(170deg,var(--sgv-diff-bg1) 0%,var(--sgv-diff-bg2) 100%);border-radius:0 0 14px 14px;border:2px solid rgba(255,255,255,0.5);box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1);overflow:hidden; }
    .split-diff .row { display:grid;grid-template-columns:40px 1fr 40px 1fr;border-bottom:1px solid rgba(200,200,200,0.2); }
    .split-diff .row.meta, .split-diff .row.hunk { grid-template-columns:1fr;color:var(--sgv-diff-meta-text);background:linear-gradient(to right,var(--sgv-diff-meta1),var(--sgv-diff-meta2)); }
    .split-diff .meta-content { padding:1px 6px;white-space:pre;overflow-x:auto; }
    .split-diff .row > .ln:nth-child(1) { text-align:right;padding:1px 8px;user-select:none;background:linear-gradient(to right,var(--sgv-lndel1),var(--sgv-lndel2));border-right:2px solid var(--sgv-lndel-b);color:var(--sgv-lndel-text); }
    .split-diff .row > .ln:nth-child(3) { text-align:right;padding:1px 8px;user-select:none;background:linear-gradient(to right,var(--sgv-lnadd1),var(--sgv-lnadd2));border-right:2px solid var(--sgv-lnadd-b);color:var(--sgv-lnadd-text); }
    .split-diff .cell { padding:1px 6px;white-space:pre;overflow-x:auto;min-width:0;scrollbar-width:thin;background:#ffffff; }
    .split-diff .cell::-webkit-scrollbar { height:6px; }
    .split-diff .cell::-webkit-scrollbar-thumb { background:rgba(150,150,150,0.3); }
    .split-diff .cell.diff-del { background:linear-gradient(to right,var(--sgv-del-cell1),var(--sgv-del-cell2)); }
    .split-diff .cell.diff-add { background:linear-gradient(to right,var(--sgv-add-cell1),var(--sgv-add-cell2)); }
    .split-diff .cell.diff-empty { background:var(--sgv-empty-cell); }
`;

// Module-level theme state
let allThemes: ThemeEntry[] = [DEFAULT_FIGMA_THEME, DEFAULT_FILE_HISTORY_THEME];
let currentThemeIdx = 0;

function broadcastTheme(theme: ThemeEntry): void {
  const css = buildRootCss(theme.vars);
  const name = theme.name;
  HistoryPanel.currentPanel?.panel.webview.postMessage({ command: 'updateTheme', css, name });
  for (const p of fileHistoryPanels.values()) {
    p.webview.postMessage({ command: 'updateTheme', css, name });
  }
}

const fileHistoryPanels = new Map<string, vscode.WebviewPanel>();

export function openFileHistoryPanel(cwd: string, filePath: string, extensionUri: vscode.Uri): void {
  const targetColumn = HistoryPanel.currentPanel?.viewColumn ?? vscode.ViewColumn.One;
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
  <style id="sgv-theme">${buildRootCss(allThemes[currentThemeIdx].vars)}</style>
  <style>${SHARED_STYLE}</style>
</head>
<body class="hide-merges" data-total-count="${totalCount}" data-shown-count="${commits.length}">
  <div class="tab-bar">📄 ${escapeHtml(filePath)} — 履歴 <span id="theme-name" class="theme-badge">${escapeHtml(allThemes[currentThemeIdx].name)}</span></div>
  <div class="panel-section">
    <p class="hint commit-hint">
      <kbd>↑↓</kbd> 移動 ·
      <kbd>Space</kbd> マーク ·
      <kbd>Enter</kbd> diff へ ·
      <kbd>m</kbd> マージ表示 ·
      <kbd>c</kbd> テーマ ·
      <kbd>q</kbd> 閉じる
    </p>
    <table class="commit-table">
      <thead><tr><th class="col-hash">ハッシュ</th><th class="col-msg">メッセージ</th><th class="col-stat">変更</th><th class="col-author">著者</th><th class="col-date">日時</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="status-line"><span class="merge-status">Merges: hidden (m)</span> · <span class="commit-count">Showing ${commits.length} / total: ${totalCount}</span></p>
  </div>
  <div id="diff-view" tabindex="0"></div>
  <script nonce="${fileNonce}" src="${scriptUri}"></script>
</body>
</html>`;

  panel.webview.onDidReceiveMessage(msg => {
    if (msg.command === 'showDiff' && msg.hash && msg.filePath) {
      const diff = getFileDiff(cwd, msg.hash, msg.filePath);
      panel.webview.postMessage({ command: 'renderDiff', diff, filePath: msg.filePath });
    }
    if (msg.command === 'showRangeDiff' && msg.fromHash && msg.toHash && msg.filePath) {
      const diff = getCommitRangeDiff(cwd, msg.fromHash as string, msg.toHash as string, msg.filePath as string);
      const shortFrom = (msg.fromHash as string).slice(0, 7);
      const shortTo = (msg.toHash as string).slice(0, 7);
      const title = `${shortFrom}..${shortTo} — ${msg.filePath as string}`;
      panel.webview.postMessage({ command: 'renderDiff', diff, filePath: msg.filePath, title });
    }
    if (msg.command === 'switchTheme') {
      currentThemeIdx = (currentThemeIdx + 1) % allThemes.length;
      broadcastTheme(allThemes[currentThemeIdx]);
    }
    if (msg.command === 'close') {
      panel.dispose();
      HistoryPanel.currentPanel?.reveal();
    }
  });

  fileHistoryPanels.set(filePath, panel);
  panel.onDidChangeViewState(e => {
    if (e.webviewPanel.visible) {
      panel.webview.postMessage({
        command: 'updateTheme',
        css: buildRootCss(allThemes[currentThemeIdx].vars),
        name: allThemes[currentThemeIdx].name,
      });
    }
  });
  panel.onDidDispose(() => {
    fileHistoryPanels.delete(filePath);
  });
}

export class HistoryPanel {
  static currentPanel: HistoryPanel | undefined;
  readonly panel: vscode.WebviewPanel;
  private readonly cwd: string;
  private readonly extensionUri: vscode.Uri;

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.One);
  }

  get viewColumn(): vscode.ViewColumn | undefined {
    return this.panel.viewColumn;
  }

  static show(cwd: string, context: vscode.ExtensionContext): void {
    // Load themes from workspace folder (pick up latest)
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (wsFolder) {
      const themesDir = path.join(wsFolder, '.simple-git-view', 'themes');
      const loaded = loadThemesFromFolder(themesDir);
      allThemes = [DEFAULT_FIGMA_THEME, DEFAULT_FILE_HISTORY_THEME, ...loaded];
    }

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
    this.panel.onDidChangeViewState(e => {
      if (e.webviewPanel.visible) {
        this.panel.webview.postMessage({
          command: 'updateTheme',
          css: buildRootCss(allThemes[currentThemeIdx].vars),
          name: allThemes[currentThemeIdx].name,
        });
      }
    });
    this.panel.onDidDispose(() => {
      HistoryPanel.currentPanel = undefined;
    });
  }

  private handleMessage(msg: { command: string; hash?: string; filePath?: string; fromHash?: string; toHash?: string }): void {
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

    if (msg.command === 'showRangeFiles' && msg.fromHash && msg.toHash) {
      const files = getCommitRangeFiles(this.cwd, msg.fromHash, msg.toHash);
      this.panel.webview.postMessage({
        command: 'renderFiles',
        files,
        hash: `${(msg.fromHash as string).slice(0, 7)}..${(msg.toHash as string).slice(0, 7)}`,
        fromHash: msg.fromHash,
        toHash: msg.toHash,
      });
    }

    if (msg.command === 'showRangeFileDiff' && msg.fromHash && msg.toHash && msg.filePath) {
      const diff = getCommitRangeDiff(this.cwd, msg.fromHash, msg.toHash, msg.filePath as string);
      this.panel.webview.postMessage({ command: 'renderDiff', diff, filePath: msg.filePath });
    }

    if (msg.command === 'switchTheme') {
      currentThemeIdx = (currentThemeIdx + 1) % allThemes.length;
      broadcastTheme(allThemes[currentThemeIdx]);
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
  <style id="sgv-theme">${buildRootCss(allThemes[currentThemeIdx].vars)}</style>
  <style>${SHARED_STYLE}</style>
</head>
<body class="hide-merges" data-total-count="${totalCount}" data-shown-count="${commits.length}">
  <div class="tab-bar">✨ Git History <span id="theme-name" class="theme-badge">${escapeHtml(allThemes[currentThemeIdx].name)}</span></div>
  <div class="panel-section">
    <table class="commit-table">
      <thead>
        <tr><th class="col-hash">ハッシュ</th><th class="col-msg">メッセージ</th><th class="col-stat">変更</th><th class="col-author">著者</th><th class="col-date">日時</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="hint commit-hint"><kbd>↑↓</kbd> 移動 · <kbd>Enter</kbd> ファイル一覧へ · <kbd>Space</kbd> マーク · <kbd>m</kbd> マージ表示 · <kbd>c</kbd> テーマ</p>
    <p class="status-line"><span class="merge-status">Merges: hidden (m)</span> · <span class="commit-count">Showing ${commits.length} / total: ${totalCount}</span></p>
  </div>
  <div class="panel-section">
    <div id="file-list"></div>
    <p class="file-hint"><kbd>↑↓</kbd> 移動 · <kbd>Enter</kbd> diff · <kbd>h</kbd> ファイル履歴 · <kbd>Esc</kbd> コミット一覧へ</p>
  </div>
  <div id="diff-view" tabindex="0"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

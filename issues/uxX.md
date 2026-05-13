# uxX

## Issue ID
uxX

## Title
サイドバー全廃 + StatusBar 化（思想転換）

## Purpose
拡張機能から **独自価値のない UI**（サイドバー Git Status）を全廃し、ブランチ表示は StatusBar に移すことで、本拡張のコンセプト「**表示特化・機能を足さない**」を徹底する。

## Background
人間レビューおよび UX-08 / UX-06 の指摘により、現状のサイドバーは以下の問題を抱える：

1. **機能重複**: 変更ファイル一覧は VSCode 標準の Source Control ビューと完全に重複しており、本拡張側の表示はアイコン無しの劣化版になっている
2. **オリジナリティ欠如**: TreeView に独自の価値（diff の自動表示、git status 以外の情報、独自のグルーピング等）が無い
3. **「表示特化」原則との矛盾**: 標準 UI と同等のものを並べて UI を肥大化させている
4. **ブランチ表示位置の不適切さ**: VSCode 標準ではブランチ名は StatusBar に出るのが慣習

本拡張に残すべき独自価値は次の 2 つに絞られる：

- **コミット履歴 Webview**（左右 split diff + キーボードナビ）
- **Blame ゴーストテキスト**

サイドバーはこの 2 つに寄与しないため全廃し、ブランチ表示だけ StatusBar Item として残す。

## Scope

### 削除する
- `src/sidebarProvider.ts` ファイル全体
- `package.json` の以下：
  - `contributes.viewsContainers.activitybar` の `simpleGitView` 定義
  - `contributes.views.simpleGitView` 定義
  - `contributes.menus.view/title` の refresh ボタン定義
  - `contributes.commands` から `simpleGitView.refreshStatus`
- `media/icon.svg`（アクティビティバーアイコンが不要になるため）
- `src/extension.ts` の以下：
  - `GitStatusProvider` の import と生成
  - `vscode.window.createTreeView('simpleGitView.gitStatus', ...)` の呼び出し
  - `onDidSaveTextDocument` での `statusProvider.refresh()` 呼び出し
  - `simpleGitView.refreshStatus` コマンド登録
  - `treeView` の subscriptions push

### 追加する
- `src/statusBarItem.ts`（新規）:
  - `vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)` で生成
  - 表示: `$(git-branch) <branch名>`
  - tooltip: `Simple Git View: Show Commit History`
  - command: `simpleGitView.showHistory`
  - ブランチ取得は既存 `getCurrentBranch(cwd)` を使用
  - 更新タイミング:
    - 初回 activate 時
    - `vscode.workspace.createFileSystemWatcher('**/.git/HEAD')` の onDidChange / onDidCreate イベント
- `src/extension.ts` で `StatusBarBranch` を初期化し subscriptions に登録

### 維持する
- コミット履歴 Webview（`historyPanel.ts`, `webviewMain.ts`, `fileHistoryMain.ts`）
- Blame ゴーストテキスト（`blameDecoration.ts`）
- `gitService.ts` の `getCurrentBranch`（StatusBar から使う）
- `simpleGitView.showHistory` コマンド

## Out of Scope
- コミット履歴 Webview や Blame の挙動変更
- StatusBar Item のクリック以外の機能（右クリックメニュー等）
- ブランチ切替などの書き込み操作（表示特化原則）

## Editable Files
- src/extension.ts
- src/statusBarItem.ts（新規）
- package.json
- SPEC.md
- src/sidebarProvider.ts（削除）
- media/icon.svg（削除）

## Do Not Edit
- src/gitService.ts
- src/blameDecoration.ts
- src/historyPanel.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts

## Dependencies
- uxA, uxB, uxC, uxD すべてマージ済みであること（main 最新）

## Branch
feature/uxX-remove-sidebar-add-statusbar

## Implementation Notes

### StatusBar Item 実装サンプル

```ts
// src/statusBarItem.ts
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
    if (!branch) { this.item.hide(); } else { this.item.show(); }
  }

  dispose(): void {
    this.item.dispose();
  }
}
```

### extension.ts の変更

```ts
import * as vscode from 'vscode';
import * as path from 'path';
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
```

### package.json の変更

削除する key:
```json
"viewsContainers": { ... }
"views": { ... }
"menus": { "view/title": [...] }
"commands": [{ "command": "simpleGitView.refreshStatus", ... }]
```

`activationEvents` も `onView:simpleGitView.gitStatus` 等が含まれていれば削除。`onCommand:simpleGitView.showHistory` または `*` に絞る。

### 削除手順

```bash
git rm src/sidebarProvider.ts
git rm media/icon.svg
```

## Acceptance Criteria
- [ ] アクティビティバーから "Simple Git View" アイコンが消える
- [ ] StatusBar 右側に `$(git-branch) main` のようにブランチ名が表示される
- [ ] StatusBar Item をクリックするとコミット履歴 Webview が開く
- [ ] ブランチを切り替える（`git checkout`）と StatusBar の表示が自動更新される
- [ ] Command Palette の `Git View: Show Commit History` は引き続き使える
- [ ] `Git View: Refresh Status` は Command Palette から消えている
- [ ] Blame ゴーストテキストは従来通り動作する
- [ ] `npm run compile` が成功し、`out/sidebarProvider.js` が無く、`out/statusBarItem.js` が生成される
- [ ] git で追跡されているファイルから `src/sidebarProvider.ts` と `media/icon.svg` が消えている

## Definition of Done
- [ ] コードが追加・削除されている
- [ ] SPEC.md が本 issue に合わせて改訂済みである（サイドバー記述削除 + StatusBar 記述追加）
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

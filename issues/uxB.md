# uxB

## Issue ID
uxB

## Title
extension.ts 統合改善（自動展開廃止 / コマンド追加 / アイコン差し替え）

## Purpose
- UX-04: 起動時に Webview を強制展開する挙動を廃止する
- UX-05: 主要操作を Command Palette から呼べるようにコマンドを追加する
- UX-03: アクティビティバーアイコンを VSCode 標準 Source Control と区別できるものに差し替える

## Background
UX レビュー（agents/ux-reviewer.md による）で以下が High 優先度として報告された：

- 起動時 `HistoryPanel.show()` でユーザーが直前に開いていたエディタ列が押し下げられる
- キー操作 (`h`, `Esc`, `Enter`, `↑↓`) が Command Palette / keybindings に露出していないため discoverable でない
- `"icon": "$(source-control)"` が VSCode 組み込み Source Control と全く同じ見た目

## Scope
- `extension.ts` の `HistoryPanel.show(cwd, context);` の自動呼び出しを削除する
- `package.json` にコマンドを追加：
  - `simpleGitView.showFileHistory` — アクティブエディタのファイルの履歴を開く（実装: extension.ts 側で active editor の `document.uri.fsPath` を取り出して `openFileHistoryPanel` を呼び出す。ただし openFileHistoryPanel は historyPanel.ts 内の関数のため、新たに export する必要があれば historyPanel.ts も触る必要があるが本 issue では historyPanel.ts は編集禁止。代替として `simpleGitView.showHistory` のみコマンド整備し、`showFileHistory` は uxH に回す）
  - `simpleGitView.refreshStatus` — サイドバー TreeView の `statusProvider.refresh()` を呼ぶ
- `package.json` の `viewsContainers` の icon を `media/icon.svg`（新規追加）に差し替える
- `media/icon.svg` を作成（シンプルな線画 SVG、24x24、currentColor）

## Out of Scope
- ファイル履歴のコマンド化（historyPanel.ts に触る必要があるため uxH へ）
- `viewsWelcome` の追加（UX-20 別 issue）
- StatusBar Item の追加（UX-08 別 issue）

## Editable Files
- src/extension.ts
- package.json
- media/icon.svg（新規）

## Do Not Edit (SPEC)
- SPEC.md は触らない（Phase 1 完了後にまとめて反映する）

## Do Not Edit
- src/gitService.ts
- src/blameDecoration.ts
- src/historyPanel.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- src/sidebarProvider.ts

## Dependencies
なし（最新 main から作成）

## Branch
feature/uxB-extension-cleanup

## Implementation Notes
- 起動時自動表示の削除は `extension.ts` から `HistoryPanel.show(cwd, context);` の **行を削除するだけ**（コメントアウト不可、コードクリーンに保つ）
- コマンド `simpleGitView.refreshStatus` の登録例：
  ```ts
  context.subscriptions.push(
    vscode.commands.registerCommand('simpleGitView.refreshStatus', () => statusProvider.refresh())
  );
  ```
- `package.json` の `contributes.commands` に追加：
  ```json
  { "command": "simpleGitView.refreshStatus", "title": "Git View: Refresh Status", "icon": "$(refresh)" }
  ```
- 既存の `simpleGitView.showHistory` のタイトルも `Git View: Show Commit History` に変更（プレフィックスを統一）
- `menus.view/title` で refresh ボタンを TreeView ヘッダに出す：
  ```json
  "view/title": [
    { "command": "simpleGitView.refreshStatus", "when": "view == simpleGitView.gitStatus", "group": "navigation" }
  ]
  ```
- `media/icon.svg` は currentColor の線画。サンプル：
  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="6" r="2"/>
    <circle cx="6" cy="18" r="2"/>
    <circle cx="18" cy="12" r="2"/>
    <path d="M6 8v8M8 6h6a4 4 0 0 1 4 4v0"/>
  </svg>
  ```
  → git-branch 風のアイコン

## Acceptance Criteria
- [ ] 拡張機能を起動してもコミット履歴 Webview が自動表示されない
- [ ] Command Palette で `Git View: Show Commit History` と `Git View: Refresh Status` の両方が表示される
- [ ] サイドバー TreeView のタイトル右に refresh ボタン（$(refresh)）が表示される
- [ ] refresh ボタンを押すと TreeView が再読み込みされる
- [ ] アクティビティバーアイコンが Source Control と区別できる見た目になっている
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md は本 issue で変更しない（Phase 1 全 issue マージ後にまとめて反映）
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

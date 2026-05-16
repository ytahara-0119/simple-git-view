# uxQQ

## Issue ID
uxQQ

## Title
コミット履歴パネルを左端カラム（ViewColumn.One）で開く

## Purpose
- uxMM で全 Webview を `ViewColumn.Beside`（編集エディタの右隣）に変更したが、ユーザーは履歴を**左端カラム**で開きたい
- メイン履歴を `ViewColumn.One` に変更する。ファイル履歴は uxPP でメイン履歴と同カラム追従するため自動的に左になる

## Background
- uxMM では「編集中エディタを押しのけない」ため Beside にした経緯がある
- 実使用したところ、ユーザーは「履歴は左に固定、コードは右」というレイアウトを希望
- `ViewColumn.One` は常に最左カラムを指す

## Scope

### `src/historyPanel.ts`
- `HistoryPanel.show` の `createWebviewPanel` 第 3 引数 `vscode.ViewColumn.Beside` → `vscode.ViewColumn.One`
- `HistoryPanel.show` 内の既存パネル再利用時 `currentPanel.panel.reveal(vscode.ViewColumn.Beside)` → `vscode.ViewColumn.One`
- `HistoryPanel.reveal()` メソッド内 `this.panel.reveal(vscode.ViewColumn.Beside)` → `vscode.ViewColumn.One`
- `openFileHistoryPanel` の `targetColumn` 計算式の fallback（`?? vscode.ViewColumn.Beside`）→ `?? vscode.ViewColumn.One`
  - メイン履歴があるときは `HistoryPanel.currentPanel?.viewColumn`（= One）を引き続き使う（uxPP の挙動維持）

## Out of Scope
- パネル位置をユーザー設定可能にすること（機能を足さない原則）
- StatusBar / Blame の挙動変更

## Editable Files
- src/historyPanel.ts

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/blameDecoration.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- src/gitService.ts
- package.json
- SPEC.md
- README.md

## Dependencies
- uxOO マージ済み（最新 main から）

## Branch
feature/uxQQ-history-view-column-one

## Acceptance Criteria
- [ ] `Git View: Show Commit History` / StatusBar クリックで履歴が左端カラムに開く
- [ ] `h` キーのファイル履歴もメイン履歴と同じ（左端）カラムに並ぶ
- [ ] q で閉じてメイン履歴に戻るとき左端カラムで表示される
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] PR が作成されている（base: main）

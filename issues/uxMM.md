# uxMM

## Issue ID
uxMM

## Title
コミット履歴 / ファイル履歴を ViewColumn.Beside に変更（UX-31）

## Purpose
現状 Webview パネルが `ViewColumn.One` に開かれ、編集中のエディタを押しのける挙動を解消する。「git を見ながら直す」動線を回復する。

## Background
- `historyPanel.ts:31`（HistoryPanel.show）と `historyPanel.ts:152` 付近（openFileHistoryPanel）で `vscode.ViewColumn.One` がハードコードされている
- これにより `Show Commit History` を実行するとアクティブエディタが背面に追いやられる
- `vscode.ViewColumn.Beside` を使うと「現在のエディタの隣（右側）」に開かれ、エディタを編集しながら履歴を参照できる

## Scope

### `src/historyPanel.ts`
- `HistoryPanel.show` の中の `vscode.window.createWebviewPanel(... , vscode.ViewColumn.One, ...)` を `vscode.ViewColumn.Beside` に変更
- `HistoryPanel.currentPanel.panel.reveal(vscode.ViewColumn.One)` の引数も `vscode.ViewColumn.Beside` に変更（uxFF の reveal 呼び出し含む）
- `openFileHistoryPanel` 内の `createWebviewPanel(... , vscode.ViewColumn.One, ...)` も `Beside` に変更
- 既存ファイル履歴パネルの再利用時の `panel.reveal(vscode.ViewColumn.One)` も `Beside` に

## Out of Scope
- パネル位置設定の永続化
- 設定項目の追加（機能を足さない原則）
- 既存ファイル履歴の reveal 時に「同一カラムに固定するか / 隣に出すか」をユーザー選択させる UI

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
- 最新 main から

## Branch
feature/uxMM-panel-view-column-beside

## Acceptance Criteria
- [ ] `Git View: Show Commit History` を実行するとアクティブエディタの右側に履歴パネルが開く
- [ ] `h` キーや `Git View: Show File History` でファイル履歴を開いてもアクティブエディタの右側に出る
- [ ] q で閉じてコミット履歴に戻るとき、コミット履歴は隣（Beside）位置で表示される
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] PR が作成されている（base: main）

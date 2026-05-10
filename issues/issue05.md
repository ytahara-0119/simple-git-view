# issue05

## Issue ID
issue05

## Title
historyPanel.ts — コミット履歴 Webview（一覧表示 + コミット変更ファイル一覧）

## Purpose
コマンド `Git: Show Commit History` で起動する Webview パネルを実装する。
直近 50 件のコミット一覧を表示し、行クリックでそのコミットの変更ファイル一覧をパネル下部に表示する。

## Background
SPEC.md §2「コミット履歴パネル」の実装。
ファイル履歴・diff 表示（§3）は issue06 で追加実装する。

## Scope
- `HistoryPanel` クラスを実装する
  - `static show(cwd: string, context: vscode.ExtensionContext): void` を公開する
  - Webview パネルを作成し HTML を描画する
- コミット一覧テーブルの表示
  - カラム: ハッシュ（7文字）/ コミットメッセージ / 著者 / 日時（相対）
  - 直近 50 件
- 行クリック → Webview から `panel.webview.postMessage` で hash を送信
- 拡張機能側で `onDidReceiveMessage` を受け取り `getCommitFiles(cwd, hash)` を呼び出す
- パネル下部（同一 Webview 内）にファイル一覧を表示する

## Out of Scope
- ファイルクリック → ファイル履歴表示（issue06 で実装）
- diff 表示（issue06 で実装）
- extension.ts へのコマンド登録（issue07 で実装）

## Editable Files
- src/historyPanel.ts

## Do Not Edit
- package.json
- tsconfig.json
- src/extension.ts
- src/gitService.ts
- src/sidebarProvider.ts
- src/blameDecoration.ts

## Dependencies
- issue01（環境構築）
- issue02（gitService.ts の `getCommitLog`, `getCommitFiles` が利用可能であること）

## Branch
feature/issue05-history-panel-basic

## Implementation Notes
- `vscode.window.createWebviewPanel` でパネルを生成する
- HTML は JS インライン形式（外部ファイルなし）
- コミット一覧の行クリックで `vscode.postMessage({ command: 'showFiles', hash })` を発火
- `panel.webview.onDidReceiveMessage` でハンドリングし、ファイル一覧を `panel.webview.postMessage` で返す
- 返ってきたファイル一覧を Webview 内 JS で下部に描画する（HTML 文字列の追加・置換）
- パネルは 1 枚のみ（既存があれば reveal する）

## Acceptance Criteria
- [ ] `HistoryPanel.show(cwd, context)` がエクスポートされている
- [ ] Webview にコミット一覧テーブル（ハッシュ/メッセージ/著者/日時）が描画される
- [ ] 行クリックでファイル一覧がパネル下部に表示される
- [ ] `npm run compile` がエラーなしで通る

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる

# issue06

## Issue ID
issue06

## Title
historyPanel.ts — ファイル履歴表示 + 左右 diff 表示

## Purpose
コミットのファイル一覧でファイルをクリックするとそのファイル単体のコミット履歴に絞り込み表示し、
さらにその履歴行をクリックすると VSCode 標準の左右 diff ビューアで差分を表示する。

## Background
SPEC.md §3「ファイル履歴 → 差分表示」の実装。
issue05 で作成した `historyPanel.ts` に機能を追加する。

## Scope
- ファイル一覧のファイルクリック → `{ command: 'showFileLog', filePath }` を発火
- `panel.webview.onDidReceiveMessage` で `getFileLog(cwd, filePath)` を呼び出す
- ファイルのコミット履歴（ハッシュ/メッセージ/著者/日時）をパネルに表示する
- ファイル履歴の行クリック → `{ command: 'showDiff', hash, filePath }` を発火
- 拡張機能側で `getDiffUris(cwd, hash, filePath)` を呼び出し `vscode.commands.executeCommand('vscode.diff', beforeUri, afterUri, title)` で diff を開く

#### 画面遷移（再掲）
```
コミット履歴一覧
  └─ 行クリック → 変更ファイル一覧
       └─ ファイルクリック → そのファイルのコミット履歴
            └─ 行クリック → 左右 diff 表示
```

## Out of Scope
- コミット履歴一覧・変更ファイル一覧の実装（issue05 完了済み）
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
- issue05（historyPanel.ts の基本実装が完了していること）

## Branch
feature/issue06-history-panel-diff

## Implementation Notes
- ファイル一覧の `<li>` にクリックハンドラを追加し `vscode.postMessage({ command: 'showFileLog', filePath })` を発火する
- ファイル履歴表示エリアは既存のファイル一覧エリアの下（または置換）で表示する
- `showDiff` メッセージを受け取った際は `vscode.commands.executeCommand('vscode.diff', ...)` を使う
- diff のタイトル: `filePath @ hash` 形式

## Acceptance Criteria
- [ ] ファイル一覧のファイルクリックでそのファイルのコミット履歴が表示される
- [ ] ファイル履歴の行クリックで VSCode の左右 diff ビューアが開く
- [ ] diff は変更前・変更後が左右に表示される
- [ ] `npm run compile` がエラーなしで通る

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる

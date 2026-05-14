# uxFF

## Issue ID
uxFF

## Title
ファイル履歴を q で閉じたあと、コミット履歴パネルに自動でフォーカスを戻す

## Purpose
uxEE で q キーによる close を実装したが、閉じた後の VSCode のフォーカス挙動が安定せずコミット履歴パネルに戻らないケースがある。明示的に `HistoryPanel.currentPanel.panel.reveal()` を呼んでフォーカスを戻す。

## Background
- ファイル履歴は「コミット履歴 → ファイル一覧 → h キー」で開く動線
- q で閉じたあとはコミット履歴に戻ってキーボード操作を続けたいのが自然な期待
- VSCode の `panel.dispose()` 後の挙動は環境依存で、必ずしも元のタブにフォーカスが返るとは限らない

## Scope

### `src/historyPanel.ts`
- `HistoryPanel` クラスに公開メソッド `reveal()` を追加：
  ```ts
  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.One);
  }
  ```
- `openFileHistoryPanel` の `onDidReceiveMessage` 内の `close` 分岐を以下に変更：
  ```ts
  if (msg.command === 'close') {
    panel.dispose();
    HistoryPanel.currentPanel?.reveal();
  }
  ```

## Out of Scope
- メイン履歴パネル側で webview 内の選択行に直接フォーカスを戻すこと（reveal でタブが手前に来ればキーボード操作は復活するため、本 issue 範囲外）
- q キー以外の close 動線（× タブクリック等）の挙動変更
- ファイル履歴 → ファイル履歴の遷移（h を続けて押す動線、現状想定なし）

## Editable Files
- src/historyPanel.ts

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- src/blameDecoration.ts
- src/gitService.ts
- package.json
- SPEC.md

## Dependencies
- uxEE マージ済み（main 最新）

## Branch
feature/uxFF-file-history-restore-focus

## Implementation Notes

- `HistoryPanel.currentPanel` は `static currentPanel: HistoryPanel | undefined` で既に定義されている
- `panel` フィールドは private のため、外側からは触らずクラス内で `reveal()` メソッドを公開する形にする
- `HistoryPanel.currentPanel` が undefined（コミット履歴を一度も開いていない / ユーザーが先に閉じた）の場合は何もしない（オプショナルチェーンで処理）

## Acceptance Criteria
- [ ] ファイル履歴パネルで `q` を押すと、ファイル履歴が閉じ、コミット履歴パネルが前面に出る
- [ ] コミット履歴パネルが開かれていない状態でも、`q` 押下時にエラーが出ない（ファイル履歴が閉じるだけ）
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

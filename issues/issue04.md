# issue04

## Issue ID
issue04

## Title
blameDecoration.ts — Blame ゴーストテキストの常時表示

## Purpose
開いているファイルの各行末尾にゴーストテキストで blame 情報（`著者: コミットメッセージ`）を常時表示する。

## Background
SPEC.md §4「Blame 表示」の実装。
VSCode の `InlineValuesProvider` ではなく `TextEditorDecorationType` + 疑似テキスト（after）を使う。
トグルなし・常時表示が要件。

## Scope
- `BlameDecorationProvider` クラスを実装する
- `applyBlame(editor: vscode.TextEditor)` メソッドを公開する
- 各行末尾に `DecorationType` の `after` プロパティでゴーストテキストを表示
  - 表示内容: `  著者: コミットメッセージ`（先頭に空白2つ）
  - 色: `new vscode.ThemeColor('editorCodeLens.foreground')`
  - フォントスタイル: italic
- エディタ切り替え時の再適用は **extension.ts 側**で `onDidChangeActiveTextEditor` を使って呼び出す

## Out of Scope
- package.json / extension.ts の変更
- トグル機能
- blame のクリック操作

## Editable Files
- src/blameDecoration.ts

## Do Not Edit
- package.json
- tsconfig.json
- src/extension.ts
- src/gitService.ts
- src/sidebarProvider.ts
- src/historyPanel.ts

## Dependencies
- issue01（環境構築）
- issue02（gitService.ts の `getBlameLines` が利用可能であること）

## Branch
feature/issue04-blame-decoration

## Implementation Notes
- `vscode.window.createTextEditorDecorationType` で DecorationType を作成する
- `editor.setDecorations(decorationType, ranges)` で適用する
- `DecorationOptions` の `renderOptions.after.contentText` にゴーストテキストを設定する
- ファイルが git 管理外のとき（blame 失敗時）は何も表示しない（エラーを握りつぶす）
- ワークスペースルートは `editor.document.uri.fsPath` の親から取得する

## Acceptance Criteria
- [ ] `BlameDecorationProvider` クラスがエクスポートされている
- [ ] `applyBlame(editor)` メソッドが公開されている
- [ ] 各行に `著者: コミットメッセージ` 形式のゴーストテキストが設定される
- [ ] 色が `editorCodeLens.foreground`、italic スタイルである
- [ ] `npm run compile` がエラーなしで通る

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる

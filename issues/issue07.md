# issue07

## Issue ID
issue07

## Title
extension.ts — エントリポイント統合 + .vsix パッケージ化

## Purpose
`activate` 関数で全プロバイダ・コマンドを初期化・登録し、拡張機能として動作する完成形にする。
`.vsix` ファイルを生成してローカルインストールできる状態にする。

## Background
各モジュール（sidebarProvider, blameDecoration, historyPanel）は単体で実装済み。
extension.ts でそれらを組み合わせて VSCode 拡張として機能させる。
またパッケージング設定（package.json の contributes, .vscodeignore）もここで整備する。

## Scope

### extension.ts の実装
- `activate(context: vscode.ExtensionContext)` で以下を実行する
  1. `workspaceRoot` の取得（`vscode.workspace.workspaceFolders[0].uri.fsPath`）
  2. `GitStatusProvider` を生成し `vscode.window.createTreeView` でサイドバーに登録
  3. `vscode.workspace.onDidSaveTextDocument` → `provider.refresh()` を登録
  4. `BlameDecorationProvider` を生成し初期エディタに `applyBlame` を適用
  5. `vscode.window.onDidChangeActiveTextEditor` → `applyBlame` を登録
  6. `simpleGitView.showHistory` コマンドを登録 → `HistoryPanel.show(cwd, context)` を呼び出す

### package.json の contributes 追加
- `contributes.commands`: `simpleGitView.showHistory` を追加
- `contributes.viewsContainers`: アクティビティバーにアイコン付きコンテナを追加
- `contributes.views`: `gitStatus` ビューを追加

### .vscodeignore の作成
- `out/` 以外のソース・設定ファイルを除外する

### パッケージング確認
- `npx vsce package` で `.vsix` が生成できること

## Out of Scope
- 各モジュールの実装ロジック変更

## Editable Files
- src/extension.ts
- package.json
- .vscodeignore

## Do Not Edit
- tsconfig.json
- src/gitService.ts
- src/sidebarProvider.ts
- src/historyPanel.ts
- src/blameDecoration.ts

## Dependencies
- issue03（GitStatusProvider）
- issue04（BlameDecorationProvider）
- issue06（HistoryPanel with diff、issue05 を含む）

## Branch
feature/issue07-extension-entry-vsix

## Implementation Notes
- アクティビティバーアイコンは `$(source-control)` などの codicon を使う（画像ファイル不要）
- `vsce` は devDependency に追加する: `npm install -D @vscode/vsce`
- `.vscodeignore` には `src/`, `tsconfig.json`, `*.md`, `.git*` などを含める
- `deactivate()` 関数は空でよい

## Acceptance Criteria
- [ ] `activate` 関数がサイドバー・blame・コマンドをすべて登録している
- [ ] `.git` が存在するワークスペースで拡張機能がアクティベートされる
- [ ] サイドバーにブランチ名と変更ファイルが表示される
- [ ] ファイル保存時にサイドバーが更新される
- [ ] エディタ切り替え時に blame が再適用される
- [ ] コマンドパレットから `Git: Show Commit History` が起動できる
- [ ] `npx vsce package` で `.vsix` ファイルが生成される
- [ ] `npm run compile` がエラーなしで通る

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる

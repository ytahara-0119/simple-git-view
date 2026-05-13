# uxD

## Issue ID
uxD

## Title
サイドバーの変更ファイルクリックでファイルを開く

## Purpose
- UX-07: サイドバー TreeView の変更ファイルアイテムをクリックしたときにエディタで該当ファイルを開く

## Background
UX レビュー（agents/ux-reviewer.md による）で High 優先度として報告：

- VSCode 標準 Source Control では変更ファイルをクリック → diff が開くが、本拡張はクリックしても何も起こらない
- 主要動線が壊れている（表示特化拡張としての価値を損なう）

## Scope
- `sidebarProvider.ts` の `getChildren` でファイル TreeItem を生成する箇所に、`command` プロパティを設定し `vscode.open` でファイルを開く

## Out of Scope
- `git.openChange` 相当の diff 表示（HEAD との差分）— 表示特化の追加機能になるため別 issue
- ブランチノードの StatusBar 移動（UX-08 別 issue）

## Editable Files
- src/sidebarProvider.ts

## Do Not Edit
- src/extension.ts
- src/gitService.ts
- src/blameDecoration.ts
- src/historyPanel.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- package.json

## Dependencies
なし（最新 main から作成）

## Branch
feature/uxD-sidebar-open-file

## Implementation Notes
- TreeItem の絶対パスは cwd と filePath の path.join で組み立てる
- TreeItem に以下を設定：
  ```ts
  item.command = {
    command: 'vscode.open',
    arguments: [vscode.Uri.file(absolutePath)],
    title: 'Open File',
  };
  item.resourceUri = vscode.Uri.file(absolutePath);
  ```
- `resourceUri` を設定すると VSCode が自動でファイルアイコンを推測して表示する
- 削除済みファイル（status `D`）は `vscode.open` でエラーになるので、status が `D` の場合は command を設定しない
- ブランチ表示ノードには command を設定しない（クリック可能にしない）

## Acceptance Criteria
- [ ] サイドバーの変更ファイルをクリックするとエディタで開く
- [ ] ファイルアイコンが拡張子に応じて表示される（resourceUri 効果）
- [ ] ブランチノードをクリックしても何も起こらない（既存挙動維持）
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

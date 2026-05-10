# issue03

## Issue ID
issue03

## Title
sidebarProvider.ts — サイドバー TreeView（ブランチ名・変更ファイル一覧）

## Purpose
アクティビティバーに専用アイコンで常時表示されるサイドバーを実装する。
ブランチ名と変更ファイル一覧（ステータス付き）を TreeView で表示し、ファイル保存時に自動更新する。

## Background
SPEC.md §1「サイドバー（Git Status）」の実装。
VSCode の `TreeDataProvider` を使って TreeView を構成する。

## Scope
- `GitStatusProvider` クラスを `TreeDataProvider<vscode.TreeItem>` として実装
- ルートノード: ブランチ名（ラベル例: `main`）
- 子ノード: 変更ファイル（ラベル例: `M  src/foo.ts`）
- `refresh()` メソッドを公開し、外部から更新を呼べるようにする
- package.json の `contributes.views` / `contributes.viewsContainers` の設定は **本 issue では行わない**（issue07 で extension.ts と合わせて設定する）

## Out of Scope
- package.json / extension.ts の変更
- ファイルをクリックしての diff 表示
- アイコン画像の追加

## Editable Files
- src/sidebarProvider.ts

## Do Not Edit
- package.json
- tsconfig.json
- src/extension.ts
- src/gitService.ts
- src/historyPanel.ts
- src/blameDecoration.ts

## Dependencies
- issue01（環境構築）
- issue02（gitService.ts の `getCurrentBranch`, `getChangedFiles` が利用可能であること）

## Branch
feature/issue03-sidebar-provider

## Implementation Notes
- コンストラクタで `workspaceRoot: string` を受け取る
- `getTreeItem(element)` / `getChildren(element?)` を実装する
- ルート呼び出し時（element なし）: `[ブランチノード, ...ファイルノード]` を返す
- ファイルノード の description に status 文字 (`M`, `A`, `?` など) を入れる
- `vscode.workspace.onDidSaveTextDocument` リスナーは **extension.ts 側で登録**するため、ここでは refresh() を公開するだけで良い
- `this._onDidChangeTreeData` イベントで TreeView を更新する標準パターンを使う

## Acceptance Criteria
- [ ] `GitStatusProvider` クラスがエクスポートされている
- [ ] `refresh()` メソッドが公開されている
- [ ] `getChildren()` がブランチノードと変更ファイルノードを返す
- [ ] `npm run compile` がエラーなしで通る

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる

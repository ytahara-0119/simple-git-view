# issue02

## Issue ID
issue02

## Title
gitService.ts — git コマンド実行・データ取得の共通層

## Purpose
`child_process.execSync` で git を呼び出し、他モジュールが利用するデータ取得関数を実装する。

## Background
SPEC.md の設計原則「外部ライブラリなし」に従い、git CLI を直接実行してデータを取得する。
各モジュール（sidebar, blame, history）が共通して使う関数をここに集約することで重複を防ぐ。

## Scope
以下の関数を `src/gitService.ts` に実装する：

| 関数 | 返す値 |
|---|---|
| `getCurrentBranch(cwd: string): string` | 現在のブランチ名 |
| `getChangedFiles(cwd: string): FileStatus[]` | 変更ファイル一覧（ステータス付き） |
| `getCommitLog(cwd: string): Commit[]` | 直近 50 件のコミット一覧 |
| `getCommitFiles(cwd: string, hash: string): string[]` | 特定コミットの変更ファイル一覧 |
| `getFileLog(cwd: string, filePath: string): Commit[]` | ファイル単体のコミット履歴 |
| `getBlameLines(cwd: string, filePath: string): BlameLine[]` | ファイルの blame 情報（行ごと） |
| `getDiffUris(cwd: string, hash: string, filePath: string): { before: vscode.Uri, after: vscode.Uri }` | diff 表示用 URI ペア（git show を使用） |

型定義も同ファイル内に記述：
```ts
export interface FileStatus { path: string; status: string; }
export interface Commit { hash: string; message: string; author: string; date: string; }
export interface BlameLine { lineNumber: number; hash: string; author: string; message: string; }
```

## Out of Scope
- VSCode の UI 操作（TreeView, Webview, Decoration）
- コマンド登録

## Editable Files
- src/gitService.ts

## Do Not Edit
- package.json
- tsconfig.json
- src/extension.ts
- src/sidebarProvider.ts
- src/historyPanel.ts
- src/blameDecoration.ts

## Dependencies
- issue01（環境構築完了・ビルドが通ること）

## Branch
feature/issue02-git-service

## Implementation Notes
- `execSync(cmd, { cwd, encoding: 'utf8' })` を使う
- エラー時は空配列 / 空文字を返す（throw しない）
- `getCommitLog` は `git log --max-count=50 --format="%H\t%s\t%an\t%ar"` を使う
- hash は最短一意桁数ではなく 7 文字固定で良い（表示は historyPanel 側で調整）
- `getDiffUris` は `vscode.Uri.parse('git-diff:...')` などの仮想 URI 方式ではなく、`git show` で取得した内容を `vscode.workspace.fs` に一時ファイルとして書き出す方式を採用する

## Acceptance Criteria
- [ ] 上記 7 関数がすべてエクスポートされている
- [ ] 型定義 3 種がエクスポートされている
- [ ] git リポジトリで `getCurrentBranch` がブランチ名を返す
- [ ] `getChangedFiles` が変更ファイルの path と status を返す
- [ ] `getCommitLog` が最大 50 件の配列を返す
- [ ] `npm run compile` がエラーなしで通る

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる

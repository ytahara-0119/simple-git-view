# uxJJ

## Issue ID
uxJJ

## Title
dead code 削除（openDiff / getDiffUris / 未使用 import）

## Purpose
- `openDiff` (historyPanel.ts) と `getDiffUris` (gitService.ts) は現状どこからも呼ばれていない
- これらに付随する `os` / `path` / `fs` の import も dead になる
- ソース見通しを良くするために削除する

## Background
diff 表示は Webview 内インライン split diff に統一されており、`vscode.diff()` 動線は完全に廃止された。`getDiffUris` は `vscode.diff()` 用の Uri を作成するためのヘルパーで、`openDiff` 経由でのみ使われていたが、`openDiff` 自体も呼び出し箇所がなくなっている。

## Scope

### `src/historyPanel.ts`
- `function openDiff(...)` を関数ごと削除
- `import { ..., getDiffUris, ... } from './gitService'` から `getDiffUris` を外す
- `getFileDiff` も使われているか確認し、使われていれば残す（メッセージハンドラ等で使用中のはず）

### `src/gitService.ts`
- `export function getDiffUris(...)` を関数ごと削除
- 未使用になる import を削除:
  - `os` (tmpdir 用)
  - `path` (basename / join 用)
  - `fs` (writeFileSync 用)
  - `vscode` は OutputChannel で使用中なので残す
- 削除前に各 import が他で使われていないかコードを精査すること

## Out of Scope
- `getBlameLines` 同期版の削除（現状 async 版と両立）
- `simple-git-view-0.0.1.vsix` の git history からの削除（既に .gitignore 済み、追跡もされていない）
- SPEC.md / README.md の編集

## Editable Files
- src/historyPanel.ts
- src/gitService.ts

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/blameDecoration.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- package.json
- SPEC.md
- README.md（並列の uxKK で作成）

## Dependencies
- uxII マージ済み（main 最新）

## Branch
feature/uxJJ-remove-dead-code

## Acceptance Criteria
- [ ] `openDiff` と `getDiffUris` が src/ から完全に消えている
- [ ] gitService.ts の未使用 import が削除されている
- [ ] `npm run compile` が成功する
- [ ] 既存機能（コミット履歴 / ファイル履歴 / diff 表示 / blame）が壊れていない

## Definition of Done
- [ ] コードが追加・削除されている
- [ ] PR が作成されている（base: main）

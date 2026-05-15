# uxLL

## Issue ID
uxLL

## Title
Blame の保存時再適用 + 非 git 管理ファイルでのスキップ（UX-26）

## Purpose
- 保存直後にカーソルが同じ行にあるとき、blame が古いまま表示される問題を解消
- リポジトリ管理外ファイル（settings.json 等）を開くたびに `git blame` が失敗して Output channel にノイズが溜まる問題を解消

## Background
- uxCC でカーソル行のみ表示に変更したが、`onDidChangeTextEditorSelection` でのみ再描画されるため、保存後にカーソルが動かないと古い blame のまま
- `getBlameLines` は失敗時に空配列を返しつつ毎回エラーをログするため、非 git ファイルでも Output channel が汚染される

## Scope

### `src/extension.ts`
- 既存 `BlameDecorationProvider` の生成 + アクティブエディタへの初回適用は維持
- `vscode.workspace.onDidSaveTextDocument` を購読し、保存ドキュメントのファイルパスで `blameProvider.invalidate(filePath)` を呼び、対応するエディタが見つかれば `applyBlame(editor)` を再実行

### `src/blameDecoration.ts`
- `applyBlame` 内でファイルがリポジトリ管理下か判定し、管理外なら静かにスキップ（decoration をクリアして return）
- 判定は新規ヘルパー `isTrackedFile(cwd, filePath)` を使う
- `invalidate(filePath)` メソッドは既存ならそれを利用、無ければ追加

### `src/gitService.ts`
- `export function isTrackedFile(cwd: string, filePath: string): boolean` を追加
  - `git ls-files --error-unmatch -- <filePath>` を `execFileSync` で実行
  - 0 終了 → true、非 0 終了 → false（catch で false 返す、ログには出さない）
- 既存 `getBlameLines` / `getBlameLinesAsync` の挙動は変更しない（呼び出し側が事前判定する設計）

## Out of Scope
- blame 自体のフォーマット変更
- 同一行 selection 連打時の debounce（UX-33 として別 issue）
- 非テキストファイル（バイナリ）の特別対応

## Editable Files
- src/blameDecoration.ts
- src/extension.ts
- src/gitService.ts

## Do Not Edit
- src/statusBarItem.ts
- src/historyPanel.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- package.json
- SPEC.md
- README.md

## Dependencies
- 最新 main から（直前の repository 追加 PR がマージ済みであること）

## Branch
feature/uxLL-blame-save-and-tracked-guard

## Acceptance Criteria
- [ ] ファイルを保存しカーソルを動かさなくても、次の selection change なしで blame が更新される
- [ ] 非 git 管理のファイル（例: `~/Downloads/foo.txt`、別リポジトリ外のファイル）を開いても Output channel に `git blame failed` が出ない
- [ ] git 管理下のファイルでは blame 表示が従来通り動作する
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] PR が作成されている（base: main）

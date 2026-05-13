# uxA

## Issue ID
uxA

## Title
gitService の execFile 化 + blame 非同期化 + エラー Output channel

## Purpose
- UX-19: shell injection 脆弱性の解消（filePath を安全に渡す）
- UX-09: blame をエディタ切替時に UI ブロックさせない、結果をキャッシュする
- UX-02: git コマンド失敗時に Output channel `Simple Git View` へエラー詳細を出力する

## Background
UX レビュー（agents/ux-reviewer.md による）で以下が High 優先度として報告された：

- gitService の `execSync` が文字列補間 + shell 経由で、特殊文字を含むファイル名で diff が壊れる・shell injection 可能
- `blameDecoration.applyBlame` が同期 `execSync` でメインスレッドをブロック。大きいファイルでエディタ切替時に固まる
- git コマンド失敗時に空配列/空文字列を返すだけで、ユーザーに失敗が一切伝わらない

## Scope
- `gitService.ts` 内の git 呼び出しを `execFileSync` または `execFile`（Promise 化）に統一する
- `gitService.ts` 内に Output channel `Simple Git View` を 1 つだけ生成し、catch 内でエラー内容を `appendLine` する
- `blameDecoration.applyBlame` を async 化し、`execFile` の Promise 版で blame を取得する
- 同一ファイルに対する blame 結果を簡易キャッシュ（`Map<filePath, BlameLine[]>`）し、`vscode.workspace.onDidSaveTextDocument` で invalidate する仕組みは blameDecoration 側に追加する
- 既存の同期 API（`getCommitLog` 等）は同期のまま、ただし execFileSync に置き換え

## Out of Scope
- エラーを `vscode.window.showErrorMessage` で出すこと（過剰通知になるので Output channel のみ）
- gitService の API シグネチャ変更（戻り値の型は維持）
- blame の表示内容自体の変更（UX-10 は別 issue）

## Editable Files
- src/gitService.ts
- src/blameDecoration.ts

## Do Not Edit
- src/extension.ts
- src/historyPanel.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- src/sidebarProvider.ts
- package.json

## Dependencies
なし（最新 main から作成）

## Branch
feature/uxA-gitservice-execfile

## Implementation Notes
- `execFile` を Promise 化するには `util.promisify(child_process.execFile)` を使う
- shell を経由しないため、`git diff ${hash}^..${hash} -- "${filePath}"` のような複合コマンドは分解して引数配列にする
  - 例: `['diff', `${hash}^..${hash}`, '--', filePath]`
- Output channel は `vscode.window.createOutputChannel('Simple Git View')` でモジュールローカルに作る
- 失敗時のログは `[gitService] <関数名> failed: <message>` 形式
- blame の async 化に伴い `applyBlame` の戻り値を `Promise<void>` にし、呼び出し側（extension.ts）は await しないファイア&フォーゲットで OK（呼び出し側の変更は最小限）
- キャッシュは `Map<filePath, BlameLine[]>` を blameDecoration のクラスフィールドとして持つ
- onDidSaveTextDocument のリスナー登録は extension.ts ではなく blameDecoration のコンストラクタで context.subscriptions に追加する形を取らないため、`applyBlame` 内でキャッシュ ↔ 保存タイミング判定を行うのではなく、`BlameDecorationProvider.invalidate(filePath)` メソッドを公開しておき extension.ts 側から呼ぶのが理想だが、本 issue では extension.ts を編集禁止のためキャッシュキー = filePath + mtime（fs.statSync の mtimeMs）方式にして自動 invalidate する

## Acceptance Criteria
- [ ] gitService の全関数が `execFileSync` または `execFile`（promisify 版）に置き換わっている
- [ ] gitService 内に Output channel `Simple Git View` が生成され、各 catch でエラー詳細が `appendLine` されている
- [ ] スペースや `$` を含むファイル名で `getFileDiff` を呼んでも例外なく diff が取得できる
- [ ] `blameDecoration.applyBlame` が async である
- [ ] 同じファイルを 2 回連続で開いたとき、2 回目は execFile が走らない（キャッシュヒット）
- [ ] ファイルを保存したら次回 applyBlame で再取得される（mtime ベースで自動 invalidate）
- [ ] `tsc --noEmit` が通る
- [ ] `npm run compile` が成功し、`out/extension.js` に変更が反映される

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

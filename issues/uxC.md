# uxC

## Issue ID
uxC

## Title
Webview UI クリーンアップ（デバッグバナー削除 / 構文ハイライト撤去 / 先頭自動選択）

## Purpose
- UX-01: 「JS: 未起動 / 起動済み ✓」のデバッグ用バナーを本番 UI から削除する
- UX-11: TypeScript/JavaScript 専用かつテーマ非追従の自前構文ハイライトを撤去する
- UX-14: メイン履歴パネルを開いた直後、先頭コミット行を自動選択して即 diff を表示する

## Background
UX レビュー（agents/ux-reviewer.md による）で以下が High 優先度として報告された：

- 赤バナー「JS: 未起動（ロード中...）」が初見ユーザーに「壊れている」と誤認させる
- 自前 `syntaxHighlight()` は TS/JS キーワードのみ対応で他言語が誤色化、文字列内の `//` で行コメント扱いになるバグもあり、`HL_*` ハードコードでテーマ非追従
- メイン履歴パネル起動直後は何も選択されておらず、ファイル一覧と diff 領域が空白で初回操作がワンステップ余計に必要（ファイル履歴パネル側は既に先頭自動選択済み）

## Scope
- `historyPanel.ts` の Webview HTML から `<div id="js-status">...</div>` を削除（メイン履歴・ファイル履歴 両方）
- `webviewMain.ts` から `jsStatus` 関連処理を削除
- `fileHistoryMain.ts` から `jsStatus` 関連処理を削除
- `webviewMain.ts` / `fileHistoryMain.ts` の `syntaxHighlight()` 関数および `KEYWORDS` セット、`HL_*` 定数を完全削除
- diff レンダリング側 (`renderSplitDiff`) は `syntaxHighlight(...)` の呼び出しを `escapeHtml(...)` に置換
- `historyPanel.ts` の CSP 直後の `<style>` 内の `.split-diff td:not(.ln) { width: ... }` などはそのまま維持（色の `+` `-` 背景は維持）
- `webviewMain.ts` の起動末尾に、ファイル履歴側と同様の「先頭行自動選択」処理を追加：
  ```ts
  if (tbody) {
    const firstRow = tbody.querySelector('tr') as HTMLElement | null;
    if (firstRow) { selectCommitRow(firstRow); }
  }
  ```
  ※ ただし `selectCommitRow` は `showFiles` メッセージを送るが、Webview 起動直後ではメッセージハンドラ側 (`historyPanel.ts`) も同期的に受け取れる前提なので問題なし

## Out of Scope
- diff レンダリングを `vscode.diff()` に戻すこと（UX-11 の代替案 R2 ではなく R1 に踏み込まない）
- 横スクロール / コピー周りの修正（UX-12 別 issue）
- SPEC.md の更新（Phase 1 完了後にまとめて反映）

## Editable Files
- src/historyPanel.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts

## Do Not Edit (SPEC)
- SPEC.md は触らない（Phase 1 完了後にまとめて反映する）

## Do Not Edit
- src/extension.ts
- src/gitService.ts
- src/blameDecoration.ts
- src/sidebarProvider.ts
- package.json

## Dependencies
なし（最新 main から作成）

## Branch
feature/uxC-webview-cleanup

## Implementation Notes
- `webviewMain.ts` で `syntaxHighlight` を削除した後、`renderSplitDiff` 内の呼び出しは全て `escapeHtml` で置き換える（コンテキスト行・追加行・削除行すべて）
- `fileHistoryMain.ts` も同様
- 先頭自動選択は `selectCommitRow(firstRow)` 呼び出しでよい。これにより `showFiles` postMessage が走り、ファイル一覧が描画され、`focusFileListAfterRender = false` の状態なので余計なフォーカス移動は起きない
- 削除後の `webviewMain.ts` は 100 行前後に短縮されることを想定

## Acceptance Criteria
- [ ] Webview を開いても「JS: 未起動」「JS: 起動済み」のバナーが一切表示されない
- [ ] diff 表示内のコード行が単色（VSCode テーマの foreground）で、`+` `-` 行の背景色のみ残る
- [ ] メイン履歴パネルを開いた直後に先頭コミットが自動選択され、変更ファイル一覧が即座に表示される
- [ ] ファイル履歴パネルの挙動（先頭行自動選択 + diff 表示）は維持される
- [ ] `npm run compile` が成功し、`out/webviewMain.js` / `out/fileHistoryMain.js` に変更が反映される
- [ ] SPEC.md は本 issue で変更しない（Phase 1 全 issue マージ後にまとめて反映）

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない（必要に応じて SPEC.md を本 issue で更新）
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

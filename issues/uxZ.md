# uxZ

## Issue ID
uxZ

## Title
split diff の中央分割位置をファイル内容に依存せず固定する

## Purpose
diff 表示の左右ウィンドウの中央分割位置が、ファイルの内容（行の長さ・新規追加か削除か等）によって左右に揺れる問題を解消する。

## Background
現状の `.split-diff` テーブルは `table-layout` の指定がなく既定値 `auto` で動作しているため、ブラウザが「内容に応じて列幅を計算する」モードになっている。`white-space: pre` で改行されない長い行が片側にあると、その列が広がり、結果として中央が左右にずれる。

期待挙動: どのコミット・ファイルを選んでも、左ペイン（変更前）と右ペイン（変更後）の中央分割位置が常に画面の中央に固定される。

## Scope
- `src/historyPanel.ts` の Webview HTML 内 `.split-diff` テーブルの CSS に `table-layout: fixed;` を追加
- メイン履歴パネル / ファイル履歴パネル両方に適用（同じ CSS ブロックがそれぞれにある）
- 既存の `.split-diff td:not(.ln) { width: calc(50% - 40px); }` と `td.ln { width: 40px; }` を生かす形で、`table-layout: fixed` により実際に列幅が遵守されるようにする

## Out of Scope
- 横スクロール挙動の追加（長い行の表示は既存の `overflow:hidden; text-overflow:ellipsis;` を維持）
- 行番号列の幅変更
- diff レンダリング JS 側の変更（webviewMain.ts / fileHistoryMain.ts は触らない）

## Editable Files
- src/historyPanel.ts

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/gitService.ts
- src/blameDecoration.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- package.json
- SPEC.md

## Dependencies
- uxY マージ済み（main 最新）

## Branch
feature/uxZ-split-diff-fixed-layout

## Implementation Notes

### CSS 修正例

```css
.split-diff {
  width: 100%;
  border-collapse: collapse;
  font-family: monospace;
  font-size: 1.15em;
  table-layout: fixed;   /* ← 追加 */
}
```

これだけで `td` 側の `width: 40px` と `width: calc(50% - 40px)` が実際に遵守され、コンテンツに依存しなくなる。

### 注意

- メイン履歴パネルとファイル履歴パネルで `.split-diff` の CSS ブロックが別々に書かれている。**両方**に `table-layout: fixed` を追加すること。
- `td` の `overflow:hidden; text-overflow:ellipsis;` が既に効いているので、長い行は省略表示（`...`）になる。これは UX-12 で別途対応予定なので本 issue ではそのまま。

## Acceptance Criteria
- [ ] 左ペイン（変更前）と右ペイン（変更後）の境界線が、選択したコミットやファイルに関わらず常に画面中央に固定される
- [ ] 新規追加ファイル（左ペインが空）でも中央が動かない
- [ ] 削除ファイル（右ペインが空）でも中央が動かない
- [ ] 長い行があるファイルでも中央が動かない
- [ ] メイン履歴パネルとファイル履歴パネル両方で挙動が一貫している
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

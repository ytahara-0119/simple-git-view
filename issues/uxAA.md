# uxAA

## Issue ID
uxAA

## Title
split diff の列幅を colgroup で固定 + 長い行はセル内横スクロールで全文閲覧可能にする

## Purpose
- 前回 uxZ で `table-layout: fixed` を追加したが、meta 行（`<td colspan="2">`）が最初の行になるためテーブルが 2 列として扱われ、本文行（4 セル）の列幅が崩れる問題が残っていた
- 長い行が省略されたまま全文を確認できない問題も解消する

## Background
uxZ 後も、ファイルや内容によって左右ペインの中央分割位置が動く問題が報告された。

原因: `table-layout: fixed` は **最初の行のセル構造** から列幅を決定する。`.split-diff` の最初の行は通常 `diff --git ...` などの meta 行で `<td colspan="2">` × 2 のため、テーブルは「2 列」と認識される。後続の本文行は 4 セルあるが、これが 2 列に押し込められて列幅が乱れる。

解決策: `<colgroup>` で 4 列の明示的な幅を指定し、最初の行の構造に依存しないようにする。

加えて、長い行の閲覧性を向上させるため、本文セルは横スクロール可能にする（ellipsis 表示はやめる。スクロールバー自体が「続きがある」サインとして機能する）。

## Scope

### webviewMain.ts / fileHistoryMain.ts （両方）
- `renderSplitDiff()` の戻り値冒頭に `<colgroup>` を挿入：
  ```html
  <colgroup>
    <col class="col-ln" />
    <col class="col-code" />
    <col class="col-ln" />
    <col class="col-code" />
  </colgroup>
  ```

### historyPanel.ts （メイン履歴 / ファイル履歴 両方の CSS ブロック）
- `<colgroup>` の列幅を定義：
  ```css
  .split-diff col.col-ln   { width: 40px; }
  .split-diff col.col-code { width: calc(50% - 40px); }
  ```
- 本文セルの省略表示をやめて、セル内横スクロール化：
  - 既存 `.split-diff td { padding:1px 6px;white-space:pre;overflow:hidden;text-overflow:ellipsis;vertical-align:top; }` を維持
  - 加えて `.split-diff td:not(.ln) { overflow-x: auto; text-overflow: clip; }` で `td:not(.ln)` のみスクロール可能に
- 既存の `.split-diff td:not(.ln) { width: calc(50% - 40px); }` は colgroup と重複するが念のため残してもよい（colgroup が優先される）

## Out of Scope
- 行番号列のスクロール（行番号は短いので不要）
- diff 内のシンタックスハイライト復活
- ホバー時の tooltip 表示

## Editable Files
- src/historyPanel.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/gitService.ts
- src/blameDecoration.ts
- package.json
- SPEC.md

## Dependencies
- uxZ マージ済み（main 最新）

## Branch
feature/uxAA-split-diff-colgroup

## Implementation Notes

### renderSplitDiff の冒頭変更（webviewMain.ts / fileHistoryMain.ts）

```ts
return '<table class="split-diff">' +
  '<colgroup>' +
    '<col class="col-ln" />' +
    '<col class="col-code" />' +
    '<col class="col-ln" />' +
    '<col class="col-code" />' +
  '</colgroup>' +
  rows.join('') + '</table>';
```

### CSS の追加例（historyPanel.ts 内 style ブロック 2 箇所）

```css
.split-diff col.col-ln   { width: 40px; }
.split-diff col.col-code { width: calc(50% - 40px); }
.split-diff td:not(.ln) { overflow-x: auto; text-overflow: clip; }
```

### スクロールバーの見た目（任意）

スクロールバーが多数並ぶと UI がうるさくなるため、必要なら以下で薄くする：

```css
.split-diff td:not(.ln) { scrollbar-width: thin; }
.split-diff td:not(.ln)::-webkit-scrollbar { height: 6px; }
.split-diff td:not(.ln)::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); }
```

## Acceptance Criteria
- [ ] split diff の中央分割線が、選択したコミット / ファイル / 行内容に関わらず常に画面中央に固定される
- [ ] 新規追加・削除・長い行いずれのファイルでも中央が動かない
- [ ] 行が幅を超える場合、そのセル内に横スクロールバーが現れ、スクロールで全文を確認できる
- [ ] 行番号列（`.ln`）にはスクロールバーが出ない
- [ ] メイン履歴パネル / ファイル履歴パネル両方で同じ挙動になる
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

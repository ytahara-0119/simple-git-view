# uxBB

## Issue ID
uxBB

## Title
split diff を CSS Grid 化して左右ペーンの 50/50 分割を確実にする

## Purpose
- 前回 uxAA で `<colgroup>` + `table-layout: fixed` で列幅固定を試みたが、片側が空セル（diff-add / diff-del のみの行）になる場合に左ペーンが視覚的に潰れる事象が残っている
- HTML テーブルの `<col>` width は環境・ブラウザ実装に依存しやすいので、`display: grid` + `grid-template-columns: 40px 1fr 40px 1fr` で根本的に解決する

## Background
ユーザー報告: 追加行 / 削除行が多いコミットの diff で、空セル側のペーンが視覚的に潰れて表示される。`<colgroup>` を入れても改善しない。

CSS Grid は `1fr 1fr` で残り幅を「**内容に関わらず**」均等分割するため、空コンテンツがあっても 50/50 を必ず維持できる。テーブルレイアウトの曖昧さを完全に排除する。

## Scope

### renderSplitDiff の出力構造を変更（webviewMain.ts / fileHistoryMain.ts 両方）

旧:
```html
<table class="split-diff">
  <colgroup>...</colgroup>
  <tr class="diff-meta"><td class="ln" colspan="2"></td><td colspan="2">...</td></tr>
  <tr><td class="ln">N</td><td class="diff-del">...</td><td class="ln">M</td><td class="diff-add">...</td></tr>
  ...
</table>
```

新:
```html
<div class="split-diff">
  <div class="row meta"><div class="meta-content">diff --git ...</div></div>
  <div class="row hunk"><div class="meta-content">@@ ... @@</div></div>
  <div class="row">
    <div class="ln">N</div>
    <div class="cell diff-del">...</div>
    <div class="ln">M</div>
    <div class="cell diff-add">...</div>
  </div>
  ...
</div>
```

- `.split-diff` は親（行のコンテナ）
- 各 `.row` は 4 つの grid item を持つ（ln / cell / ln / cell）
- meta / hunk 行は 1 つの全幅セル（`grid-column: 1 / -1`）
- 列幅は `.row` 自体に `display: grid; grid-template-columns: 40px 1fr 40px 1fr;` で固定

### CSS（historyPanel.ts 内 style ブロック 2 箇所）

旧 `.split-diff` 関連 CSS を以下に置き換え：

```css
.split-diff { font-family: monospace; font-size: 1.15em; }
.split-diff .row {
  display: grid;
  grid-template-columns: 40px 1fr 40px 1fr;
  border-bottom: 1px solid transparent;
}
.split-diff .row.meta, .split-diff .row.hunk {
  grid-template-columns: 1fr;
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-textCodeBlock-background);
}
.split-diff .meta-content { padding: 1px 6px; white-space: pre; overflow-x: auto; }
.split-diff .ln {
  text-align: right;
  padding: 1px 8px;
  color: var(--vscode-editorLineNumber-foreground, #858585);
  background: var(--vscode-editor-background);
  user-select: none;
  border-right: 1px solid var(--vscode-widget-border, #444);
}
.split-diff .cell {
  padding: 1px 6px;
  white-space: pre;
  overflow-x: auto;
  min-width: 0;          /* grid item が overflow するときに必要 */
  scrollbar-width: thin;
}
.split-diff .cell::-webkit-scrollbar { height: 6px; }
.split-diff .cell::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); }
.split-diff .cell.diff-del { background: rgba(244, 71, 71, 0.18); }
.split-diff .cell.diff-add { background: rgba(78, 201, 78, 0.18); }
.split-diff .cell.diff-empty { background: rgba(128, 128, 128, 0.08); }
```

### renderSplitDiff の JS 書き換え（共通ロジック）

```ts
function renderSplitDiff(diff: string): string {
  const lines = diff.split('\n');
  const rows: string[] = [];
  const pendingDel: string[] = [];
  const pendingAdd: string[] = [];
  let leftLine = 1;
  let rightLine = 1;

  function flush(): void {
    const max = Math.max(pendingDel.length, pendingAdd.length);
    for (let i = 0; i < max; i++) {
      const hasDel = i < pendingDel.length;
      const hasAdd = i < pendingAdd.length;
      const lCells = hasDel
        ? `<div class="ln">${leftLine + i}</div><div class="cell diff-del">${escapeHtml(pendingDel[i])}</div>`
        : `<div class="ln"></div><div class="cell diff-empty"></div>`;
      const rCells = hasAdd
        ? `<div class="ln">${rightLine + i}</div><div class="cell diff-add">${escapeHtml(pendingAdd[i])}</div>`
        : `<div class="ln"></div><div class="cell diff-empty"></div>`;
      rows.push(`<div class="row">${lCells}${rCells}</div>`);
    }
    leftLine += pendingDel.length;
    rightLine += pendingAdd.length;
    pendingDel.length = 0;
    pendingAdd.length = 0;
  }

  for (const line of lines) {
    if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
      flush();
      rows.push(`<div class="row meta"><div class="meta-content">${escapeHtml(line)}</div></div>`);
    } else if (line.startsWith('@@')) {
      flush();
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) { leftLine = parseInt(m[1], 10); rightLine = parseInt(m[2], 10); }
      rows.push(`<div class="row hunk"><div class="meta-content">${escapeHtml(line)}</div></div>`);
    } else if (line.startsWith('-')) {
      pendingDel.push(line.slice(1));
    } else if (line.startsWith('+')) {
      pendingAdd.push(line.slice(1));
    } else {
      flush();
      const content = line.startsWith(' ') ? line.slice(1) : line;
      const esc = escapeHtml(content);
      rows.push(`<div class="row"><div class="ln">${leftLine}</div><div class="cell">${esc}</div><div class="ln">${rightLine}</div><div class="cell">${esc}</div></div>`);
      leftLine++;
      rightLine++;
    }
  }
  flush();
  return `<div class="split-diff">${rows.join('')}</div>`;
}
```

## Out of Scope
- diff レンダリングの色変更
- 構文ハイライト復活
- 行番号の表示形式変更

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
- uxAA マージ済み（main 最新）

## Branch
feature/uxBB-split-diff-grid

## Implementation Notes
- `min-width: 0` を grid item の `.cell` に必ず付ける（これがないと長い行で grid item が拡大してしまう）
- meta/hunk 行は `grid-template-columns: 1fr` で全幅、その中の `.meta-content` を横スクロール可能に
- 旧 `<table class="split-diff">` の HTML 構造から完全に脱却し、`<div>` ベースに統一
- 既存の `diff-del` / `diff-add` / `diff-empty` のクラス名は維持して見た目を変えない

## Acceptance Criteria
- [ ] split diff の左右ペーンが、内容に関わらず**常に画面の中央で 50/50 に分割される**
- [ ] 追加のみの行（左側が空）でも左ペーンが視覚的に潰れない
- [ ] 削除のみの行（右側が空）でも右ペーンが視覚的に潰れない
- [ ] 長い行はセル内横スクロールで全文を確認できる
- [ ] 行番号列は 40px 固定でスクロールバーが出ない
- [ ] メイン履歴パネル / ファイル履歴パネル両方で同じ挙動になる
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

# uxHH

## Issue ID
uxHH

## Title
diff スクロールモードを追加（Enter で diff にフォーカス → ↑↓ でスクロール → ESC で一覧に戻る）

## Purpose
- メインパネル: ファイル選択後 Enter で diff エリアにフォーカスし、↑↓ で diff をスクロールできるようにする
- ファイル履歴パネル: コミット選択後 Enter で diff エリアにフォーカスし、↑↓ で diff をスクロールできるようにする
- 両パネルとも ESC で元の一覧（ファイル一覧 / コミット一覧）にフォーカスを戻す

## Background
現状は diff が画面下部に表示されるが、長い diff の全体をキーボードだけで閲覧する手段が無く、ユーザーはマウスホイール / トラックパッドに頼る必要がある。

「Enter で深い階層に入り、ESC で一段戻る」のはメインパネルの既存挙動（コミット一覧 → ファイル一覧）と一貫した動線。これを diff 領域まで拡張する。

## Scope

### `src/historyPanel.ts`
- メイン履歴パネル / ファイル履歴パネル両方の `#diff-view` div に `tabindex="0"` を付け、`outline:none` でフォーカスリングを抑制（または focus 時に薄く border を出す）
- CSS で `#diff-view` を「フォーカスされたときに薄い枠線」を出して、現在 diff モードであることを視覚的に示す：
  ```css
  #diff-view:focus { outline: 1px solid var(--vscode-focusBorder, #007acc); outline-offset: -1px; }
  #diff-view { scroll-margin-top: 8px; }
  ```

### `src/webviewMain.ts`（メインパネル）
- 新しいフォーカス領域 `diff` を導入。`document.activeElement` の判定で「diff 内にいるか」を判別
- 既存の file-list 内 keydown ハンドラに **Enter** 分岐を追加：
  ```ts
  if (e.key === 'Enter') {
    e.preventDefault();
    const dv = document.getElementById('diff-view');
    if (dv) { dv.focus(); dv.scrollIntoView({ block: 'start' }); }
  }
  ```
- グローバル keydown ハンドラに **diff モード**の分岐を追加：
  - `document.activeElement?.id === 'diff-view'` の状態で：
    - `ArrowDown` / `ArrowUp` → `window.scrollBy({ top: ±40, behavior: 'auto' })`
    - `PageDown` / `PageUp` → `window.scrollBy({ top: ±window.innerHeight * 0.8 })`
    - `Escape` → `selectedFileItem?.focus()`（前のフォーカスを復元）
  - これらを処理した場合は `e.preventDefault()` し、既存の他ハンドラを通さない

### `src/fileHistoryMain.ts`（ファイル履歴パネル）
- 同様に diff モードを実装：
  - 既存の commit row keydown に **Enter** 分岐を追加し、`#diff-view` にフォーカス
  - グローバル keydown で diff モード時の ↑↓/PgUp/PgDn/ESC を処理
  - ESC は `selectedRow?.focus()` で元のコミット行に戻す

### 注意
- 既存の **メインパネル**: コミット行 Enter は「ファイル一覧の先頭にフォーカス」する挙動を維持（変更しない）
- 既存の **メインパネル**: ファイル一覧 ESC は「コミット一覧に戻る」を維持
- 既存の **ファイル履歴**: コミット行 ↑↓ で diff を更新する挙動を維持。Enter は新規追加で diff にフォーカス
- 既存の **メインパネル**: ファイル一覧 ↑↓ で diff を更新する挙動を維持。Enter は新規追加で diff にフォーカス

## Out of Scope
- diff 内でハンク単位ジャンプ（次の `@@` まで移動など）
- diff の検索機能
- diff 内のテキスト選択モード
- 行単位の「選択行ハイライト」（スクロールのみ）

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
- uxGG マージ済み（main 最新）

## Branch
feature/uxHH-diff-scroll-mode

## Implementation Notes

### スクロール量

- 矢印キー: 40px / 押下（おおよそ 2 行分）
- PageUp/Down: `window.innerHeight * 0.8`
- `behavior: 'auto'`（スムーススクロールは VSCode 設定に従う）

### フォーカス管理

メインパネル `webviewMain.ts` の状態：
- `selectedCommitRow`: 既存
- `selectedFileItem`: 既存
- これらは保持されているので、diff モードから ESC で `selectedFileItem.focus()` を呼べば自然に戻る

ファイル履歴 `fileHistoryMain.ts` の状態：
- `selectedRow`: 既存
- ESC で `selectedRow.focus()` を呼べば戻る

### コードスケッチ（webviewMain.ts、グローバル keydown 冒頭付近）

```ts
document.addEventListener('keydown', (e: KeyboardEvent) => {
  const active = document.activeElement;
  const inDiff = active?.id === 'diff-view';

  if (inDiff) {
    if (e.key === 'ArrowDown') { e.preventDefault(); window.scrollBy({ top: 40 }); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); window.scrollBy({ top: -40 }); return; }
    if (e.key === 'PageDown')  { e.preventDefault(); window.scrollBy({ top: window.innerHeight * 0.8 }); return; }
    if (e.key === 'PageUp')    { e.preventDefault(); window.scrollBy({ top: -window.innerHeight * 0.8 }); return; }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (selectedFileItem) { (selectedFileItem as HTMLElement).focus(); }
      return;
    }
  }

  // 以下、既存の処理...
});
```

### コードスケッチ（webviewMain.ts、ファイル li の keydown 内）

既存の `li.addEventListener('keydown', ...)` 内に追加：

```ts
if (e.key === 'Enter') {
  e.preventDefault();
  const dv = document.getElementById('diff-view') as HTMLElement | null;
  if (dv) { dv.focus(); dv.scrollIntoView({ block: 'start' }); }
}
```

### コードスケッチ（fileHistoryMain.ts、グローバル keydown）

```ts
document.addEventListener('keydown', (e: KeyboardEvent) => {
  const active = document.activeElement;
  const inDiff = active?.id === 'diff-view';

  if (inDiff) {
    // 上記と同じパターン、ESC で selectedRow.focus()
    if (e.key === 'Escape') {
      e.preventDefault();
      if (selectedRow) { selectedRow.focus(); }
      return;
    }
    // ↑↓ PgUp PgDn は同じ
  }

  // 既存のコミット行操作
  if (e.key === 'Enter' && selectedRow) {
    e.preventDefault();
    const dv = document.getElementById('diff-view') as HTMLElement | null;
    if (dv) { dv.focus(); dv.scrollIntoView({ block: 'start' }); }
    return;
  }

  // 既存の ArrowDown/Up 処理...
});
```

## Acceptance Criteria

### メインパネル
- [ ] コミット選択 → ファイル一覧にフォーカス → ファイルを選んで Enter → diff にフォーカスが移動する
- [ ] diff フォーカス中に ↑↓ でページがスクロールする
- [ ] diff フォーカス中に PageUp/PageDown で画面の約 80% 分スクロールする
- [ ] diff フォーカス中に ESC を押すと、直前に選択していたファイルにフォーカスが戻る
- [ ] フォーカスが diff にあることが視覚的に分かる（薄い枠線）

### ファイル履歴パネル
- [ ] コミットを選んで Enter → diff にフォーカスが移動する
- [ ] diff フォーカス中の ↑↓ / PageUp / PageDown / ESC が同じく動作する
- [ ] ESC でコミット行にフォーカスが戻る

### 共通
- [ ] 既存の動線が壊れていない：
  - メインパネル: コミット行 Enter → ファイル一覧フォーカス（変更なし）
  - メインパネル: ファイル一覧 ESC → コミット一覧（変更なし）
  - メインパネル: ファイル一覧 ↑↓ → diff 更新（変更なし）
  - ファイル履歴: コミット行 ↑↓ → diff 更新（変更なし）
  - ファイル履歴: q → 閉じる（変更なし）
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない（キーボードショートカット表の更新は次回 SPEC 改訂時にまとめて反映）
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

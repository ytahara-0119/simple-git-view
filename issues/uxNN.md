# uxNN

## Issue ID
uxNN

## Title
両パネルに kbd 装飾付きキーボードヒントを表示（UX-22 + UX-29 + UX-17）

## Purpose
- diff スクロールモード（Enter）/ マージトグル（m）/ q で閉じる、などの存在を**画面上で発見可能**にする
- 既存の hint テキストを `<kbd>` 装飾で読みやすく整形する
- ファイル履歴パネルには現状 hint 自体が無い → 新規追加

## Background
- uxHH (Enter で diff スクロール) と uxII (m でマージトグル) の存在が画面のどこにも示されておらず、ユーザーが気づけない
- メインパネルのファイル一覧 hint は平文テキスト、ファイル履歴パネルには hint が存在しない
- README / SPEC に書いてあっても、画面に出ていないと使われない

## Scope

### `src/historyPanel.ts`

#### メイン履歴パネル
- 既存の `webviewMain.ts` が生成するファイル一覧 hint の文言を「画面のヒント表示用 CSS」に合わせて整える
- `<style>` ブロックに `kbd` 用 CSS を追加：
  ```css
  kbd {
    display: inline-block;
    padding: 0 4px;
    font-size: 0.85em;
    font-family: var(--vscode-editor-font-family, monospace);
    border: 1px solid var(--vscode-widget-border, #444);
    border-radius: 3px;
    background: var(--vscode-keybindingLabel-background, rgba(128,128,128,0.17));
    color: var(--vscode-keybindingLabel-foreground, inherit);
  }
  .hint kbd { margin: 0 2px; }
  ```
- コミットテーブル直下、ファイル一覧の直上に**コミット一覧用 hint** を追加：
  ```html
  <p class="hint commit-hint">
    <kbd>↑↓</kbd> 移動 ·
    <kbd>Enter</kbd> ファイル一覧へ ·
    <kbd>m</kbd> マージ表示
  </p>
  ```
  位置は `<table class="commit-table">...</table>` の直後で `<div id="file-list">` の直前。

#### ファイル履歴パネル
- `<h3>${escapeHtml(filePath)}</h3>` の直後、テーブルの上に hint を追加：
  ```html
  <p class="hint">
    <kbd>↑↓</kbd> 移動 ·
    <kbd>Enter</kbd> diff へ ·
    <kbd>m</kbd> マージ表示 ·
    <kbd>q</kbd> 閉じる
  </p>
  ```
- 同じ kbd CSS を `<style>` ブロックに追加（メイン側と同等内容）

### `src/webviewMain.ts`
- 既存のファイル一覧 hint 文字列を `<kbd>` 化：
  - 旧: `'<h3>変更ファイル (' + shortHash + ')</h3><p class="hint">クリック: diff を下部に表示  /  h キー: ファイル履歴（新規タブ） /  Esc: コミット一覧に戻る</p>'`
  - 新: 以下のテンプレートに：
    ```html
    <h3>変更ファイル (${shortHash})</h3>
    <p class="hint">
      <kbd>↑↓</kbd> 移動 ·
      <kbd>Enter</kbd> diff へ ·
      <kbd>h</kbd> ファイル履歴 ·
      <kbd>Esc</kbd> コミット一覧
    </p>
    ```
- 同じく「変更なし」のときの h3 も同じパターンに揃える

## Out of Scope
- hint を折りたためる / 隠せるトグル
- マルチ言語対応
- アイコン化 / GIF アニメーション

## Editable Files
- src/historyPanel.ts
- src/webviewMain.ts

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/blameDecoration.ts
- src/fileHistoryMain.ts
- src/gitService.ts
- package.json
- SPEC.md
- README.md

## Dependencies
- uxLL マージ済み
- uxMM マージ済み（最新 main から）

## Branch
feature/uxNN-kbd-hints

## Acceptance Criteria
- [ ] コミット履歴パネルのテーブル直下に「↑↓ Enter m」の kbd 装飾 hint が表示される
- [ ] ファイル一覧の「変更ファイル (xxxxxxx)」見出し下に「↑↓ Enter h Esc」の hint が表示される
- [ ] ファイル履歴パネルのテーブル直上に「↑↓ Enter m q」の hint が表示される
- [ ] kbd が VSCode テーマに馴染む見た目（薄いグレー枠 + 小さい角丸）
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] PR が作成されている（base: main）

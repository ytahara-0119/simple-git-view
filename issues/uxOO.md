# uxOO

## Issue ID
uxOO

## Title
マージ非表示インジケータ + 履歴件数の切り捨て表示（UX-23 + UX-24）

## Purpose
- マージコミットがデフォルト非表示であることが画面に出ておらず、merge 主体のリポジトリでは「何も表示されない」と誤認されかねない
- 履歴 50 件で打ち切られる際に「もっと古いのがあるよ」のサインが無い
- 両方を小さなフッタ/インジケータで提示する

## Background
- uxII でマージ非表示がデフォルトになったが、状態表示なし
- `gitService.ts` の `--max-count=50` は変えないが、UI 上で「50 件中 N 件表示中 / マージ M 件非表示」のフッタを出す

## Scope

### `src/gitService.ts`
- `getCommitLog` / `getFileLog` の戻り値の Commit 配列はそのまま
- 新規ヘルパー `export function getTotalCommitCount(cwd: string, filePath?: string): number` を追加
  - `git rev-list --count HEAD` （filePath なし）
  - `git rev-list --count HEAD -- <filePath>` （filePath あり）
  - 失敗時は 0 を返す

### `src/historyPanel.ts`
- メイン履歴パネルの `getHtml()` で `getTotalCommitCount(this.cwd)` を呼んで `totalCount` を取得
- ファイル履歴パネルの `openFileHistoryPanel` で `getTotalCommitCount(cwd, filePath)` を呼ぶ
- 各テーブル直下（uxNN で追加した hint の上 or 下）に**ステータス行**を追加：
  ```html
  <p class="status-line">
    <span class="merge-status">Merges: hidden</span> ·
    <span class="commit-count">Showing 50 / total: <total>{totalCount}</total></span>
  </p>
  ```
- CSS の追加（`<style>` 内）：
  ```css
  .status-line {
    font-size: 0.85em;
    color: var(--vscode-descriptionForeground);
    margin: 4px 0;
  }
  ```
- 表示するときに、Webview に **commits.length / totalCount / hide-merges** の状態を渡す必要があるため、`data-total-count="{totalCount}"` のような属性で `<body>` に埋め込む
- 表示中件数 = `commits.length`（取得済み）

### `src/webviewMain.ts`
- 起動時に DOM から `body.dataset.totalCount` と `body.dataset.shownCount` を読み取り、status-line の表示を更新
- `m` キーで `hide-merges` を切り替えた瞬間に `.merge-status` のテキストも切り替える：
  - 非表示: `Merges: hidden (m)`
  - 表示: `Merges: shown (m)`
- 表示中の commit 行は CSS で `display:none` されているので、`visibleRows().length` を計算して `.commit-count` も更新（既存 visibleRows() を流用）

### `src/fileHistoryMain.ts`
- 同様に body dataset から件数を読み、`m` キー切り替え時に表記更新
- 既存 visibleRows() を流用

## Out of Scope
- 「Load more」ボタンで 50 件を超えて取得（UX-21 別 issue）
- ページネーション
- 件数取得失敗時の専用 UI（0 件として扱えば OK）

## Editable Files
- src/gitService.ts
- src/historyPanel.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/blameDecoration.ts
- package.json
- SPEC.md
- README.md

## Dependencies
- uxNN マージ済み（最新 main から）

## Branch
feature/uxOO-merge-status-and-truncation-indicator

## Acceptance Criteria
- [ ] メイン履歴パネルのテーブル直下に「Merges: hidden · Showing N / total: M」のフッタが表示される
- [ ] `m` で merge 表示/非表示を切り替えると `.merge-status` のテキストと `.commit-count` の数値が即時更新される
- [ ] 切り捨てがない場合（total ≤ 50）も同じフォーマットで表示される（誤解させない）
- [ ] ファイル履歴パネルにも同じフッタが表示される
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] PR が作成されている（base: main）

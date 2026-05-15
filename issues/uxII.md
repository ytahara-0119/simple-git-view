# uxII

## Issue ID
uxII

## Title
マージコミットをデフォルト非表示 + m キーで表示/非表示トグル

## Purpose
コミット履歴を読むときにマージコミット（`Merge pull request #N` 系）はノイズになるため、デフォルトで非表示にする。必要なときは `m` キーで表示に切り替えられるようにする。

## Background
- マージコミットは PR マージ時に自動生成されるもので、実際の変更内容は元のコミットを見たほうが分かりやすい
- 50 件中半分以上がマージコミットで埋まることもあり、目的のコミットを探す妨げになる
- 「機能を足さない / 設定項目を設けない」原則は維持しつつ、**ランタイムキーボードトグル**のみ追加

## Scope

### `src/gitService.ts`
- `Commit` インターフェースに `isMerge: boolean` を追加
- `getCommitLog` / `getFileLog` の `git log --format` に `%P`（親コミットハッシュ）を追加
- パース時に `%P` がスペース区切りで複数あれば `isMerge = true`

### `src/historyPanel.ts`
- 各 `<tr>` 行に `data-is-merge="true"` または `class="is-merge"` を付ける
- `<body>` の初期クラスに `hide-merges` を付与（デフォルト非表示）
- CSS:
  ```css
  body.hide-merges table.commit-table tr.is-merge { display: none; }
  ```
- メイン履歴パネル / ファイル履歴パネル両方に同じ処理

### `src/webviewMain.ts` / `src/fileHistoryMain.ts`
- グローバル keydown に `m` キー分岐を追加：
  ```ts
  if (e.key === 'm') {
    e.preventDefault();
    document.body.classList.toggle('hide-merges');
    // 選択中の行が隠れた場合は先頭の表示行を選択
    return;
  }
  ```
- ↑↓ ナビゲーションが `display:none` の行を**スキップする**ように修正：
  ```ts
  const visibleRows = allRows.filter(r => r.offsetParent !== null);
  ```
- 初期自動選択も `visibleRows[0]` にする（マージ行が先頭の場合の対策）

## Out of Scope
- ステータスバーや表示ヒントへの「現在のモード」表示（hint テキスト程度は OK）
- マージ以外のフィルタ（著者・期間など）
- マージ表示の永続化（VSCode 設定への保存）。次回起動時はデフォルト = 非表示で OK

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

## Dependencies
- uxHH マージ済み（main 最新）

## Branch
feature/uxII-toggle-merge-commits

## Acceptance Criteria
- [ ] パネルを開いた直後、マージコミットが表示されない
- [ ] `m` キーを押すとマージコミットが表示される
- [ ] もう一度 `m` キーを押すと非表示に戻る
- [ ] ↑↓ キーで移動するとき、非表示行はスキップされる
- [ ] パネル起動時の自動選択は最初の「非マージ」コミット
- [ ] ファイル履歴パネルでも同じ挙動になる
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] PR が作成されている（base: main）

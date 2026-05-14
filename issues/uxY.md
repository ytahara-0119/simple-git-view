# uxY

## Issue ID
uxY

## Title
コミット一覧を固定高さ + 内部スクロール化（ファイル一覧 / diff が常に見える位置に固定）

## Purpose
コミット件数が多いとき、テーブルが縦に伸び続けて変更ファイル一覧と diff ビューが画面外に押し下げられる問題を解消する。

## Background
50 件のコミットが全部展開されると、変更ファイル一覧と diff ビューが常に下方向にずれ、操作のたびにユーザーがスクロールし直す必要がある。

コミットテーブルを**固定高さ + 内部スクロール**にすれば、`<tbody>` のみがスクロールし、その下のファイル一覧と diff は常に同じ位置に表示される。↑↓ キーでの選択時は既存の `scrollIntoView({ block: 'nearest' })` が tbody 内スクロールにも正しく機能する。

## Scope
- `src/historyPanel.ts` のメイン履歴パネル HTML / CSS を編集し、コミットテーブルを次の構造にする：
  - `thead` は固定表示
  - `tbody` は `max-height: 280px;` 程度（10〜12 行相当）の領域内でスクロール
  - 横幅は `table-layout: fixed` で thead と tbody の列幅を揃える
- 同様の処理をファイル履歴パネル（openFileHistoryPanel 内）にも適用
- 「変更ファイル」「diff ビュー」セクションは現状の位置のままで OK（コミットテーブルがスクロールに収まることで自動的に上に来る）

## Out of Scope
- 変更ファイル一覧 / diff ビュー側のスクロール挙動変更
- 高さをユーザー設定可能にすること（機能を足さない原則）
- ページネーション・ロードモア（別 issue）

## Editable Files
- src/historyPanel.ts

## Do Not Edit
- src/extension.ts
- src/gitService.ts
- src/blameDecoration.ts
- src/statusBarItem.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- package.json
- SPEC.md

## Dependencies
- uxX マージ済み（main 最新）

## Branch
feature/uxY-commit-table-scroll

## Implementation Notes

### CSS パターン（fixed header + scrollable body）

```css
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
thead, tbody { display: block; width: 100%; }
thead tr, tbody tr { display: table; width: 100%; table-layout: fixed; }
tbody { max-height: 280px; overflow-y: auto; }
```

列幅は thead / tbody で揃える必要があるので、各 `<th>` `<td>` に明示的な `width` をつけるか、`table-layout: fixed` に任せる。

### 推奨カラム幅（メイン履歴パネル）

| カラム | 幅 |
|---|---|
| ハッシュ | 80px |
| メッセージ | auto（残り） |
| 著者 | 140px |
| 日時 | 120px |

ファイル履歴パネルも同じ比率を採用。

### scrollIntoView 互換性

`webviewMain.ts` / `fileHistoryMain.ts` の `rows[next].scrollIntoView({ block: 'nearest' })` は親要素がスクロール可能なら親要素内でスクロールするため、tbody が `overflow-y: auto` であれば追加変更不要。

## Acceptance Criteria
- [ ] メイン履歴パネルのコミットテーブルが固定高さ（約 10 行分）内でスクロールする
- [ ] テーブルヘッダ（ハッシュ / メッセージ / 著者 / 日時）は固定表示でスクロールしない
- [ ] ↑↓ キーで選択を動かすと、選択行が tbody スクロール内で自動的に見える位置にスクロールする
- [ ] 「変更ファイル (XXXXXXX)」セクションがコミットテーブル直下に常に表示され、画面外に押し下げられない
- [ ] ファイル履歴パネルにも同じスクロール挙動が適用される
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

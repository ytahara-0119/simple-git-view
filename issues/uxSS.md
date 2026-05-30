# uxSS

## Issue ID
uxSS

## Title
ファイル履歴パネルでも Space キーによる2コミット間 diff を表示する

## Purpose
- ファイル履歴パネル（h キーで開くパネル）でも Space キーでコミットをマークし、選択中コミットとの間の diff を表示できるようにする
- uxRR で実装したコミット履歴パネルの同機能をファイル履歴パネルにも適用する

## Background
- uxRR でコミット履歴パネルに2コミット間 diff が実装された
- ファイル履歴パネルは特定のファイルに絞ったコミット一覧を表示するパネルであり、同様の操作が自然に適用できる
- ファイルが固定なので「変更ファイル一覧」のステップが不要で、uxRR より実装がシンプルになる
- `getCommitRangeDiff` は uxRR で `gitService.ts` に追加済みのため再利用する

## Scope

### `src/fileHistoryMain.ts`
- `markedHash: string | null` と `markedRow: HTMLElement | null` の状態変数を追加
- Space キーハンドラを追加（コミット一覧フォーカス中のみ有効、inDiff 中は不可）
  - 選択中コミットが未マーク → マーク設定（`.marked` クラス追加）、`markedHash` を更新
  - 選択中コミットが既マーク → マーク解除（`.marked` クラス削除）、`markedHash` を null に
- `selectRow` を修正: `markedHash` が存在しかつ現在行の hash と異なる場合 →
  - DOM インデックスで順序を比較し `fromHash`（古い方）・`toHash`（新しい方）を決定
  - `showRangeDiff` メッセージを送信: `{ command: 'showRangeDiff', fromHash, toHash, filePath }`
  - マークなし または マーク＝選択中（同一コミット）の場合は通常の `showDiff` メッセージを送信
- ヒント行に `<kbd>Space</kbd> マーク` を追加

#### マークのビジュアル（uxRR と統一）
- `.marked` クラス: `background: linear-gradient(to right,#fef08a,#fde68a); color:#78350f;`（黄色系）
- diff タイトルを `hash1..hash2 — filepath` 形式にする

### `src/historyPanel.ts`
- `openFileHistoryPanel` の `onDidReceiveMessage` に以下を追加:
  ```
  if (msg.command === 'showRangeDiff' && msg.fromHash && msg.toHash && msg.filePath) {
    const diff = getCommitRangeDiff(cwd, msg.fromHash, msg.toHash, msg.filePath);
    panel.webview.postMessage({ command: 'renderDiff', diff, filePath: msg.filePath });
  }
  ```
- import に `getCommitRangeDiff` を追加（uxRR で gitService.ts に追加済み）

### `SPEC.md`
- セクション 4「ファイル履歴パネル」のキーボードショートカット表に追記:
  ```
  | Space | 現在のコミットをマーク（2コミット間 diff の基点に設定） |
  ```

## Out of Scope
- コミット履歴パネル側の変更（uxRR で対応済み）
- `getCommitRangeDiff` の新規実装（uxRR で追加済みのため不要）
- 3コミット以上の選択

## Editable Files
- src/fileHistoryMain.ts
- src/historyPanel.ts
- SPEC.md

## Do Not Edit
- src/gitService.ts（uxRR で変更済み、再変更不要）
- src/extension.ts
- src/statusBarItem.ts
- src/blameDecoration.ts
- src/webviewMain.ts
- package.json

## Dependencies
- uxRR マージ済み（`getCommitRangeDiff` が gitService.ts に存在すること）

## Branch
feature/uxSS-file-history-range-diff

## Acceptance Criteria
- [ ] ファイル履歴パネルのコミット一覧で Space キーを押すと、選択行に黄色系ハイライトが付く
- [ ] マーク済みコミットがある状態で別のコミットを選択すると、2コミット間の split diff が表示される
- [ ] diff タイトルが `hash1..hash2 — filepath` 形式になっている
- [ ] マーク済みコミットで再度 Space を押すとマークが解除され、通常の単一コミット diff に戻る
- [ ] マークなしの通常動作（単一コミット diff）が壊れていない
- [ ] ヒント行に `Space: マーク` が表示されている
- [ ] コミット履歴パネル（webviewMain.ts）の動作に影響がない
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない（追記済み）
- [ ] PR が作成されている（base: main）

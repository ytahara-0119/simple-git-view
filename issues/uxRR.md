# uxRR

## Issue ID
uxRR

## Title
Space キーで2コミット間 diff を表示する

## Purpose
- コミット履歴パネルで Space キーを押すと「マークコミット（基点）」を設定し、現在選択中のコミットとの間の差分をインライン split diff で表示する
- 単一コミットの diff（現在の動作）と、2コミット間の diff の両方を自然なキー操作で切り替えられるようにする

## Background
- 現在はコミット選択時に「そのコミット単体の変更（hash^ .. hash）」しか表示できない
- "あのコミットとこのコミットの間に何が変わったか" を確認するユースケースがある
- `git diff hash1 hash2` コマンドは既に利用可能であり、実装コストは低い

## Scope

### `src/gitService.ts`
- `getCommitRangeFiles(cwd, hash1, hash2): string[]` を追加
  - `git diff --name-only hash1 hash2`
- `getCommitRangeDiff(cwd, hash1, hash2, filePath): string` を追加
  - `git diff hash1 hash2 -- filePath`

### `src/webviewMain.ts`
- `markedHash: string | null` と `markedRow: HTMLElement | null` の状態変数を追加
- Space キーハンドラを追加（コミット一覧フォーカス中のみ有効）
  - 選択中コミットが未マーク → マーク設定（`.marked` クラス追加）、`markedHash` を更新
  - 選択中コミットが既マーク → マーク解除（`.marked` クラス削除）、`markedHash` を null に
  - 別コミットに移動しても前のマークは維持
- コミット行を選択したとき（`selectCommitRow`）、`markedHash` が存在しかつ現在の `currentHash` と異なる場合 → `showRangeFiles` メッセージを送信
  - `markedHash === currentHash` の場合は通常の `showFiles` メッセージを送信
- ファイルクリック時、range モードの場合は `showRangeFileDiff` メッセージを送信
  - ペイロード: `{ command: 'showRangeFileDiff', fromHash, toHash, filePath }`
- ヒント行に `<kbd>Space</kbd> マーク` を追加

#### マークのビジュアル
- `.marked` クラス: 既存 `selected`（水色グラデーション）と区別できるよう黄緑/オレンジ系の背景（例: `background: linear-gradient(to right,#fef08a,#fde68a)` ＋ `color:#78350f`）
- マーク中かつ別コミット選択中は、変更ファイルパネルのタイトルを `変更ファイル (hash1..hash2)` 形式にする

#### hash の順序（git diff の方向）
- 送信するペイロードに `fromHash`（古い方）と `toHash`（新しい方）を含める
- 順序の決定: DOM 上の行インデックスで比較（上にあるほど新しいコミット）
  - `markedIdx > selectedIdx` → marked が古い → `fromHash=markedHash, toHash=selectedHash`
  - `markedIdx < selectedIdx` → selected が古い → `fromHash=selectedHash, toHash=markedHash`

### `src/historyPanel.ts`
- import に `getCommitRangeFiles`, `getCommitRangeDiff` を追加
- `webviewPanel.webview.onDidReceiveMessage` に以下を追加:
  ```
  case 'showRangeFiles':
    const files = getCommitRangeFiles(cwd, msg.fromHash, msg.toHash);
    panel.webview.postMessage({ command: 'renderFiles', files, hash: msg.fromHash + '..' + msg.toHash });
    break;
  case 'showRangeFileDiff':
    const diff = getCommitRangeDiff(cwd, msg.fromHash, msg.toHash, msg.filePath);
    panel.webview.postMessage({ command: 'renderDiff', diff, filePath: msg.filePath });
    break;
  ```

### `SPEC.md`
- セクション 2「コミット履歴パネル」のキーボードショートカット表に追記:
  ```
  | Space | 現在のコミットをマーク（2コミット間 diff の基点に設定） |
  ```
- 「2コミット間 diff」の動作説明を 2〜3 行追記

## Out of Scope
- 3コミット以上の選択
- ファイル履歴パネルへの同機能の追加（別 issue で検討）
- git merge-base を使った 3-way diff（`...` 三点記法）

## Editable Files
- src/gitService.ts
- src/webviewMain.ts
- src/historyPanel.ts
- SPEC.md

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/blameDecoration.ts
- src/fileHistoryMain.ts
- package.json

## Dependencies
- なし（最新 main から作成）

## Branch
feature/uxRR-two-commit-range-diff

## Acceptance Criteria
- [ ] コミット一覧フォーカス中に Space キーを押すと、選択行に視覚的なマーク（黄色系ハイライト）が付く
- [ ] マーク済みコミットがある状態で別のコミットを選択すると、変更ファイル一覧が 2コミット間の変更ファイルになる
- [ ] ファイルをクリック/↑↓すると、2コミット間の split diff が下部に表示される
- [ ] diff のタイトルが `hash1..hash2` 形式になっている
- [ ] マーク済みコミットで再度 Space を押すとマークが解除され、通常の単一コミット diff に戻る
- [ ] マークなしの通常動作（単一コミット diff）が壊れていない
- [ ] ヒント行に `Space: マーク` が表示されている
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない（追記済み）
- [ ] PR が作成されている（base: main）

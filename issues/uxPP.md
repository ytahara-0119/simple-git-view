# uxPP

## Issue ID
uxPP

## Title
ファイル履歴をメイン履歴と同じカラムに開く（h キーで右に新カラムができる問題の修正）

## Purpose
- uxMM で全 Webview を `ViewColumn.Beside` で開くようにしたが、`h` キー（メイン履歴から呼ばれるファイル履歴）まで `Beside` になり、メイン履歴の隣にさらに新カラムが作られる
- 期待挙動: メイン履歴と**同じカラム**（タブとして並ぶ）にファイル履歴を開く

## Background
- メイン履歴は `Show Commit History` でアクティブエディタの隣（カラム 2）に開く → これは uxMM の意図通り
- そのメイン履歴で `h` を押すと、現状 `Beside` で開かれ「メイン履歴の隣（カラム 3）」が新規生成される
- ユーザーは「メイン履歴と同じ場所（カラム 2 にタブとして並ぶ）」を期待

## Scope

### `src/historyPanel.ts`
- `openFileHistoryPanel` 内で、新規パネル作成時の ViewColumn を以下のロジックに変更：
  ```ts
  const targetColumn = HistoryPanel.currentPanel?.panel.viewColumn ?? vscode.ViewColumn.Beside;
  ```
  - メイン履歴が開いていればその ViewColumn を使う（タブとして並ぶ）
  - 開いていない（コマンドパレット直接呼び出しなど）なら fallback で Beside
- 既存パネル再利用時の `existing.reveal(...)` も同じ `targetColumn` を使う
- メイン履歴の `HistoryPanel.show` の `Beside` はそのまま維持（編集中エディタを押しのけない）

## Out of Scope
- メイン履歴の表示位置の設定化
- ファイル履歴を別タブグループに自動配置する設定
- showFileHistory コマンドの挙動を変える（メイン履歴がない場合は Beside のままで OK）

## Editable Files
- src/historyPanel.ts

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/blameDecoration.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- src/gitService.ts
- package.json
- SPEC.md
- README.md

## Dependencies
- uxNN マージ済み（最新 main から）

## Branch
feature/uxPP-file-history-same-column

## Acceptance Criteria
- [ ] メイン履歴が開いている状態で `h` キーを押すと、メイン履歴と同じカラム（タブとして並ぶ）にファイル履歴が開く
- [ ] 一旦閉じてから再度開き直しても同じカラムに開く（reveal の挙動）
- [ ] メイン履歴を一度も開かずに `Git View: Show File History` コマンドだけ実行した場合は、現状通り Beside（アクティブエディタの隣）に開く
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] PR が作成されている（base: main）

# uxEE

## Issue ID
uxEE

## Title
ファイル履歴パネルを q キーで閉じる + 不要なキーバインドを削除

## Purpose
- ファイル履歴パネルを開いた後、コミット履歴に戻る動線が無い問題を解消（`q` キーで閉じる）
- uxDD で追加した `Cmd+Alt+H` / `Cmd+Alt+Shift+H` のキーバインドが使われないので削除

## Background
- ファイル履歴パネル（`openFileHistoryPanel` で作成）には閉じる動線がなく、ユーザーは VSCode のタブ × ボタンを使う必要があった
- `q` キーは Vim 系・Less 等で「閉じる」操作の慣習なので採用
- メイン履歴パネルの Esc は「コミット一覧に戻る」フォーカス操作ですでに使われているため衝突する。`q` であれば衝突しない
- `Cmd+Alt+H` / `Cmd+Alt+Shift+H` の 2 キーバインドはユーザー検証の結果不要と判断されたため削除

## Scope

### `src/fileHistoryMain.ts`
- グローバル `keydown` リスナーを追加（既存の Arrow キーリスナーと同様の構造）
- `e.key === 'q'` のとき `vscode.postMessage({ command: 'close' })` を送る
- ただし input/textarea にフォーカスがある状態では発火させない（現状そのような要素は無いが防御的に書く）

### `src/historyPanel.ts`
- `openFileHistoryPanel` の `panel.webview.onDidReceiveMessage` に分岐を追加：
  - `msg.command === 'close'` のとき `panel.dispose()` を呼ぶ
- メイン履歴パネル側（`HistoryPanel` クラス）には close ハンドラは追加しない（メイン側で q を押せるようにする計画は本 issue 範囲外）

### `package.json`
- `contributes.keybindings` 全体を削除する（`Cmd+Alt+H` / `Cmd+Alt+Shift+H` の 2 エントリ）
- コマンド本体（`simpleGitView.showHistory` / `simpleGitView.showFileHistory`）は維持

## Out of Scope
- メイン履歴パネル（`HistoryPanel`）の q キー対応（必要なら別 issue）
- Esc キーで閉じる機能（誤操作リスク回避のため不採用）
- hint テキスト（画面下部のキー説明）への `q` 追記 — 今回追加する程度は読み手に伝わる範囲。ただし簡潔に 1 文だけ hint へ追記する（後述）

## Editable Files
- src/fileHistoryMain.ts
- src/historyPanel.ts
- package.json

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/webviewMain.ts
- src/blameDecoration.ts
- src/gitService.ts
- SPEC.md

## Dependencies
- uxDD マージ済み（main 最新）

## Branch
feature/uxEE-file-history-close-and-keybind-removal

## Implementation Notes

### fileHistoryMain.ts の keydown 追加例

既存の document keydown ハンドラ内に分岐を追加：

```ts
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'q') {
    e.preventDefault();
    vscode.postMessage({ command: 'close' });
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    // 既存処理
  }
});
```

### historyPanel.ts の onDidReceiveMessage 分岐

```ts
panel.webview.onDidReceiveMessage(msg => {
  if (msg.command === 'showDiff' && msg.hash && msg.filePath) {
    // 既存処理
  }
  if (msg.command === 'close') {
    panel.dispose();
  }
});
```

### ファイル履歴パネルの hint テキスト追加（軽微）

`historyPanel.ts` 内のファイル履歴パネル HTML テンプレートで、hint がある場合は末尾に ` / q キー: 閉じる` を追記する。hint が無ければ追加しない（追加 UI は最小限）。

### package.json

`contributes.keybindings` キー自体を削除する。

## Acceptance Criteria

### q キーで閉じる
- [ ] ファイル履歴パネルにフォーカスがある状態で `q` キーを押すと、そのパネルが閉じる
- [ ] パネルを閉じた後、再度 `h` キーや `Show File History` コマンドで同じファイルの履歴を開くと、新規パネルが作成される（Map から削除済み）

### キーバインド削除
- [ ] `package.json` の `contributes.keybindings` セクションが存在しない
- [ ] `Cmd+Alt+H` や `Cmd+Alt+Shift+H` を押しても本拡張のコマンドが起動しない
- [ ] `simpleGitView.showHistory` および `simpleGitView.showFileHistory` コマンド本体は Command Palette から呼べる

### 共通
- [ ] `npm run compile` が成功する
- [ ] メイン履歴パネルの Esc 動作（コミット一覧に戻る）は壊れていない

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

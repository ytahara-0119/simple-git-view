# uxDD

## Issue ID
uxDD

## Title
ファイル履歴タブ再利用 + Show File History コマンド追加 + StatusBar 発見性向上

## Purpose
- UX-13: `h` キー連打でファイル履歴タブが無限増殖する問題を解消（Map で再利用）
- UX-15: アクティブエディタのファイル履歴をコマンド 1 発で開けるようにする（4 ステップ → 1 ステップ）
- UX-NEW-1: サイドバー廃止後の StatusBar Item の発見性を向上（tooltip 強化 + keybinding 追加）

## Background
- 現状 `h` を 5 回押すと 5 枚のタブが開く（HistoryPanel 側のシングルトンパターンが File History 側に展開されていない）
- 「今このファイルの履歴を見たい」は頻出操作なのにコマンドパレットから直接到達できない
- StatusBar Item が唯一の入口だが、tooltip が控えめでユーザーが拡張の存在に気づきにくい

## Scope

### UX-13: ファイル履歴タブの Map ベース再利用（`src/historyPanel.ts`）
- `openFileHistoryPanel` の外側で `Map<string, vscode.WebviewPanel>` を保持（filePath → panel）
- 既に Map に存在する場合は `panel.reveal()` して既存パネルを表に出す（新規生成しない）
- `panel.onDidDispose` で Map から削除する
- 関数を `export` して extension.ts から呼べるようにする（UX-15 で利用）

### UX-15: Show File History コマンド（`src/historyPanel.ts`, `src/extension.ts`, `package.json`）
- `package.json` に追加：
  ```json
  {
    "command": "simpleGitView.showFileHistory",
    "title": "Git View: Show File History",
    "icon": "$(history)"
  }
  ```
- `package.json` の `menus` に追加：
  ```json
  "editor/title": [
    { "command": "simpleGitView.showFileHistory", "when": "editorTextFocus", "group": "navigation" }
  ],
  "editor/context": [
    { "command": "simpleGitView.showFileHistory", "when": "editorTextFocus", "group": "navigation@1" }
  ]
  ```
- `src/extension.ts` に登録：
  ```ts
  context.subscriptions.push(
    vscode.commands.registerCommand('simpleGitView.showFileHistory', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
      }
      openFileHistoryPanel(cwd, editor.document.uri.fsPath, context.extensionUri);
    })
  );
  ```
- そのために `historyPanel.ts` の `openFileHistoryPanel` 関数を `export` する

### UX-NEW-1: StatusBar 発見性向上（`src/statusBarItem.ts`, `package.json`）
- `statusBarItem.ts` の `tooltip` を `vscode.MarkdownString` で強化：
  ```ts
  const md = new vscode.MarkdownString();
  md.appendMarkdown('**Simple Git View**\n\n');
  md.appendMarkdown('- Click: Show commit history\n');
  md.appendMarkdown('- `⌘⇧P` → `Git View` for all commands\n');
  this.item.tooltip = md;
  ```
- `package.json` にデフォルトキーバインドを追加（衝突しにくい組み合わせを選ぶ）：
  ```json
  "keybindings": [
    {
      "command": "simpleGitView.showHistory",
      "key": "ctrl+alt+h",
      "mac": "cmd+alt+h"
    },
    {
      "command": "simpleGitView.showFileHistory",
      "key": "ctrl+alt+shift+h",
      "mac": "cmd+alt+shift+h",
      "when": "editorTextFocus"
    }
  ]
  ```

## Out of Scope
- `simpleGitView.showHistory` の挙動変更
- StatusBar Item のラベル / アイコン変更（tooltip と keybinding 追加のみ）
- SPEC.md の更新（本 issue 完了後に別途まとめて反映）

## Editable Files
- src/historyPanel.ts
- src/extension.ts
- src/statusBarItem.ts
- package.json

## Do Not Edit
- src/blameDecoration.ts
- src/gitService.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- SPEC.md（並列実行する uxCC と SPEC が競合しないよう本 issue では触らない）

## Dependencies
- uxBB マージ済み（main 最新）

## Branch
feature/uxDD-file-history-coordination

## Implementation Notes

### historyPanel.ts の `openFileHistoryPanel` の再利用化スケッチ

```ts
const fileHistoryPanels = new Map<string, vscode.WebviewPanel>();

export function openFileHistoryPanel(cwd: string, filePath: string, extensionUri: vscode.Uri): void {
  const existing = fileHistoryPanels.get(filePath);
  if (existing) {
    existing.reveal(vscode.ViewColumn.One);
    return;
  }
  // ...既存の panel 生成処理...
  const panel = vscode.window.createWebviewPanel(/* ... */);
  fileHistoryPanels.set(filePath, panel);
  panel.onDidDispose(() => {
    fileHistoryPanels.delete(filePath);
  });
  // ...残り...
}
```

### extension.ts の差分（追記のみ）

```ts
import { HistoryPanel, openFileHistoryPanel } from './historyPanel';

// ...activate 内の既存処理の後に...
context.subscriptions.push(
  vscode.commands.registerCommand('simpleGitView.showFileHistory', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor');
      return;
    }
    openFileHistoryPanel(cwd, editor.document.uri.fsPath, context.extensionUri);
  })
);
```

### package.json の差分

- `contributes.commands` に `simpleGitView.showFileHistory` を追加
- `contributes.menus.editor/title` と `editor/context` を新設
- `contributes.keybindings` を新設

## Acceptance Criteria

### UX-13
- [ ] 同じファイルで `h` キーを 2 回以上押しても、ファイル履歴タブが 1 枚しか開かない（2 回目以降は既存タブに切り替わる）
- [ ] ファイル履歴タブを閉じてから再度 `h` を押すと、新規パネルが開く

### UX-15
- [ ] コマンドパレットで `Git View: Show File History` が表示される
- [ ] エディタ上で右クリック → コンテキストメニューに `Git View: Show File History` が表示される
- [ ] エディタタイトル右上に `$(history)` アイコンが表示される
- [ ] 各動線からファイル履歴パネルが開く
- [ ] アクティブエディタが無いときは `No active editor` のメッセージが表示される

### UX-NEW-1
- [ ] StatusBar Item にホバーすると tooltip に Markdown 形式で「Click: Show commit history」「⌘⇧P → Git View」が表示される
- [ ] `Cmd+Alt+H` (Mac) で `Git View: Show Commit History` が起動する
- [ ] エディタにフォーカスがあるとき `Cmd+Alt+Shift+H` (Mac) で `Git View: Show File History` が起動する

### 共通
- [ ] `npm run compile` が成功する
- [ ] 既存 `simpleGitView.showHistory` および `simpleGitView.refreshStatus`（廃止済みなら不要）の挙動が壊れていない

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md は本 issue で変更しない（uxCC と競合回避）
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

# uxCC

## Issue ID
uxCC

## Title
Blame をカーソル行のみ表示に変更（情報過多解消）+ SPEC §5 改訂

## Purpose
UX-10: Blame ゴーストテキストがファイル全行に常時表示され、コードを読む邪魔になる問題を解消する。VSCode 標準 / GitLens 系と同じく「**現在のカーソル行のみ**」に絞る。

## Background
- 1 コミットで作成されたファイルだと全行が同じ blame テキストで埋まり、視線のノイズになる
- SPEC §5 の「常時表示」の原意は「トグル / 設定項目を作らない」ことであり、「全行表示」までは要求していない
- 「機能を足さない」原則は維持しつつ、表示範囲を「カーソル行 1 行」に縮小することで体験を大幅改善できる

## Scope

### `src/blameDecoration.ts`
- `BlameDecorationProvider` の挙動を「全行 decoration」から「カーソル行のみ decoration」に変更
- コンストラクタで `vscode.window.onDidChangeTextEditorSelection` を購読し、選択変更ごとに該当行の decoration を更新
- `applyBlame(editor)` は「現在のカーソル行（`editor.selection.active.line`）に対応する 1 行分の decoration だけ貼る」処理に書き換える
- 既存の blame キャッシュ（filePath + mtime）は維持（行データはファイル単位で取得し、行番号でルックアップ）
- `vscode.window.onDidChangeTextEditorSelection` の disposable はクラスフィールドで保持（リーク防止）

### `SPEC.md`
- §5 の Blame 表示セクションを改訂：
  - 旧: 「常時表示（トグルなし）／開いているファイルの各行末尾に、ゴーストテキストで表示」
  - 新: 「常時表示（トグルなし）／**現在のカーソル行末尾に**ゴーストテキストで表示／カーソル移動に応じて自動更新」
- 「エディタ切り替え時に自動再適用」の記述は維持（カーソル位置の初期 blame を表示）

## Out of Scope
- Blame のオン/オフ設定追加（「機能を足さない」原則）
- 連続コミット行のグルーピング表示（B 案）
- 著者名・メッセージの短縮（C 案）
- ホバー時の詳細情報表示

## Editable Files
- src/blameDecoration.ts
- SPEC.md

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/historyPanel.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- src/gitService.ts
- package.json

## Dependencies
- uxBB マージ済み（main 最新）

## Branch
feature/uxCC-blame-cursor-only

## Implementation Notes

### blameDecoration.ts 実装スケッチ

```ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import { getBlameLines, type BlameLine } from './gitService';

export class BlameDecorationProvider {
  private readonly decorationType: vscode.TextEditorDecorationType;
  private readonly cache = new Map<string, { mtimeMs: number; lines: BlameLine[] }>();
  private readonly selectionDisposable: vscode.Disposable;

  constructor() {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
        fontStyle: 'italic',
        margin: '0 0 0 2em',
      },
    });
    this.selectionDisposable = vscode.window.onDidChangeTextEditorSelection(e => {
      this.applyBlame(e.textEditor);
    });
  }

  applyBlame(editor: vscode.TextEditor): void {
    const filePath = editor.document.uri.fsPath;
    const lines = this.getCached(filePath);
    if (!lines) {
      editor.setDecorations(this.decorationType, []);
      return;
    }
    const lineNum = editor.selection.active.line + 1; // 1-based
    const blame = lines.find(b => b.lineNumber === lineNum);
    if (!blame) {
      editor.setDecorations(this.decorationType, []);
      return;
    }
    const range = new vscode.Range(lineNum - 1, 0, lineNum - 1, 0);
    const text = `${blame.author}: ${blame.message}`;
    editor.setDecorations(this.decorationType, [
      { range, renderOptions: { after: { contentText: text } } },
    ]);
  }

  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  private getCached(filePath: string): BlameLine[] | undefined {
    try {
      const stat = fs.statSync(filePath);
      const entry = this.cache.get(filePath);
      if (entry && entry.mtimeMs === stat.mtimeMs) {
        return entry.lines;
      }
      const lines = getBlameLines(filePath); // 既存の同期 API を使用
      this.cache.set(filePath, { mtimeMs: stat.mtimeMs, lines });
      return lines;
    } catch {
      return undefined;
    }
  }

  dispose(): void {
    this.selectionDisposable.dispose();
    this.decorationType.dispose();
  }
}
```

### 注意

- `editor.setDecorations(type, [])` で前の decoration を必ずクリアしてから新しい行に貼る（前の行に残るのを防ぐ）
- 既存 `extension.ts` 側の `vscode.window.onDidChangeActiveTextEditor` で `applyBlame(editor)` を呼ぶ既存処理は触らない。今回の変更によりカーソル変更時にも自動的に再描画される
- 既存 `applyBlame(editor: vscode.TextEditor)` のシグネチャは維持（呼び出し側を壊さないため）
- `extension.ts` は編集しないこと（並列実行する uxDD と競合するため）

## Acceptance Criteria
- [ ] ファイルを開いてもファイル全行に Blame が表示されない
- [ ] カーソルがある行にのみ Blame ゴーストテキストが表示される
- [ ] 矢印キーなどでカーソルを移動すると、移動先の行に Blame が追従する
- [ ] ファイルを保存して内容を変更した場合、次回カーソル移動時に新しい Blame が表示される（mtime キャッシュ invalidate）
- [ ] エディタタブを切り替えても挙動が継続する
- [ ] SPEC.md §5 が「カーソル行のみ表示」に改訂されている
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md が改訂されている
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getBlameLinesAsync, BlameLine } from './gitService';

interface CacheEntry {
  mtimeMs: number;
  lines: BlameLine[];
}

export class BlameDecorationProvider {
  private decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      fontStyle: 'italic',
      color: new vscode.ThemeColor('editorCodeLens.foreground'),
    },
  });

  private cache = new Map<string, CacheEntry>();
  private selectionDisposable: vscode.Disposable;

  constructor() {
    this.selectionDisposable = vscode.window.onDidChangeTextEditorSelection(e => {
      void this.applyBlame(e.textEditor);
    });
  }

  async applyBlame(editor: vscode.TextEditor): Promise<void> {
    if (!editor) {
      return;
    }
    const filePath = editor.document.uri.fsPath;
    const cwd = path.dirname(filePath);

    let mtimeMs = 0;
    try {
      mtimeMs = fs.statSync(filePath).mtimeMs;
    } catch {
      mtimeMs = 0;
    }

    let lines: BlameLine[];
    const cached = this.cache.get(filePath);
    if (cached && cached.mtimeMs === mtimeMs) {
      lines = cached.lines;
    } else {
      lines = await getBlameLinesAsync(cwd, filePath);
      this.cache.set(filePath, { mtimeMs, lines });
    }

    if (lines.length === 0) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const lineNumber = editor.selection.active.line + 1; // 1-based
    const blame = lines.find(b => b.lineNumber === lineNumber);
    if (!blame) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const lineIndex = blame.lineNumber - 1;
    const textLine = editor.document.lineAt(Math.min(lineIndex, editor.document.lineCount - 1));
    const range = new vscode.Range(textLine.range.end, textLine.range.end);
    editor.setDecorations(this.decorationType, [
      {
        range,
        renderOptions: {
          after: {
            contentText: `  ${blame.author}: ${blame.message}`,
          },
        },
      },
    ]);
  }

  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  dispose(): void {
    this.selectionDisposable.dispose();
    this.decorationType.dispose();
  }
}

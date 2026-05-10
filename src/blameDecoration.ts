import * as vscode from 'vscode';
import * as path from 'path';
import { getBlameLines } from './gitService';

export class BlameDecorationProvider {
  private decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      fontStyle: 'italic',
      color: new vscode.ThemeColor('editorCodeLens.foreground'),
    },
  });

  applyBlame(editor: vscode.TextEditor): void {
    const filePath = editor.document.uri.fsPath;
    const cwd = path.dirname(filePath);
    const lines = getBlameLines(cwd, filePath);

    if (lines.length === 0) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const decorations: vscode.DecorationOptions[] = lines.map(line => {
      const lineIndex = line.lineNumber - 1;
      const textLine = editor.document.lineAt(Math.min(lineIndex, editor.document.lineCount - 1));
      const range = new vscode.Range(textLine.range.end, textLine.range.end);
      return {
        range,
        renderOptions: {
          after: {
            contentText: `  ${line.author}: ${line.message}`,
          },
        },
      };
    });

    editor.setDecorations(this.decorationType, decorations);
  }
}

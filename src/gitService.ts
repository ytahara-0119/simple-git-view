import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export interface FileStatus {
  path: string;
  status: string;
}

export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface BlameLine {
  lineNumber: number;
  hash: string;
  author: string;
  message: string;
}

export function getCurrentBranch(cwd: string): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

export function getChangedFiles(cwd: string): FileStatus[] {
  try {
    const output = execSync('git status --porcelain', { cwd, encoding: 'utf8' });
    return output
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => ({
        status: line.slice(0, 2).trim(),
        path: line.slice(3).trim(),
      }));
  } catch {
    return [];
  }
}

export function getCommitLog(cwd: string): Commit[] {
  try {
    const output = execSync('git log --max-count=50 --format="%H\t%s\t%an\t%ar"', { cwd, encoding: 'utf8' });
    return output
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split('\t');
        return {
          hash: parts[0] ?? '',
          message: parts[1] ?? '',
          author: parts[2] ?? '',
          date: parts[3] ?? '',
        };
      });
  } catch {
    return [];
  }
}

export function getCommitFiles(cwd: string, hash: string): string[] {
  try {
    const output = execSync(`git diff-tree --no-commit-id -r --name-only ${hash}`, { cwd, encoding: 'utf8' });
    return output
      .split('\n')
      .filter(line => line.length > 0);
  } catch {
    return [];
  }
}

export function getFileLog(cwd: string, filePath: string): Commit[] {
  try {
    const output = execSync(`git log --max-count=50 --format="%H\t%s\t%an\t%ar" -- ${filePath}`, { cwd, encoding: 'utf8' });
    return output
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split('\t');
        return {
          hash: parts[0] ?? '',
          message: parts[1] ?? '',
          author: parts[2] ?? '',
          date: parts[3] ?? '',
        };
      });
  } catch {
    return [];
  }
}

export function getBlameLines(cwd: string, filePath: string): BlameLine[] {
  try {
    const output = execSync(`git blame --porcelain ${filePath}`, { cwd, encoding: 'utf8' });
    const lines = output.split('\n');
    const result: BlameLine[] = [];

    let currentHash = '';
    let currentAuthor = '';
    let currentMessage = '';
    let currentLineNumber = 0;

    for (const line of lines) {
      if (/^[0-9a-f]{40}/.test(line)) {
        const parts = line.split(' ');
        currentHash = parts[0];
        currentLineNumber = parseInt(parts[2] ?? parts[1], 10);
      } else if (line.startsWith('author ')) {
        currentAuthor = line.slice('author '.length);
      } else if (line.startsWith('summary ')) {
        currentMessage = line.slice('summary '.length);
      } else if (line.startsWith('\t')) {
        result.push({
          lineNumber: currentLineNumber,
          hash: currentHash,
          author: currentAuthor,
          message: currentMessage,
        });
      }
    }

    return result;
  } catch {
    return [];
  }
}

export function getDiffUris(
  cwd: string,
  hash: string,
  filePath: string
): { before: vscode.Uri; after: vscode.Uri } {
  const basename = path.basename(filePath);
  const tmpDir = os.tmpdir();

  const beforePath = path.join(tmpDir, `sgv-before-${hash}-${basename}`);
  const afterPath = path.join(tmpDir, `sgv-after-${hash}-${basename}`);

  try {
    const beforeContent = execSync(`git show ${hash}^:${filePath}`, { cwd, encoding: 'utf8' });
    fs.writeFileSync(beforePath, beforeContent);
  } catch {
    fs.writeFileSync(beforePath, '');
  }

  try {
    const afterContent = execSync(`git show ${hash}:${filePath}`, { cwd, encoding: 'utf8' });
    fs.writeFileSync(afterPath, afterContent);
  } catch {
    fs.writeFileSync(afterPath, '');
  }

  return {
    before: vscode.Uri.file(beforePath),
    after: vscode.Uri.file(afterPath),
  };
}

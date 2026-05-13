import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { execFileSync, execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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

const outputChannel = vscode.window.createOutputChannel('Simple Git View');

function logError(fnName: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  outputChannel.appendLine(`[gitService] ${fnName} failed: ${message}`);
}

function runGit(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

export async function runGitAsync(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, encoding: 'utf8' });
  return stdout;
}

export function getCurrentBranch(cwd: string): string {
  try {
    return runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  } catch (err) {
    logError('getCurrentBranch', err);
    return '';
  }
}

export function getChangedFiles(cwd: string): FileStatus[] {
  try {
    const output = runGit(cwd, ['status', '--porcelain']);
    return output
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => ({
        status: line.slice(0, 2).trim(),
        path: line.slice(3).trim(),
      }));
  } catch (err) {
    logError('getChangedFiles', err);
    return [];
  }
}

export function getCommitLog(cwd: string): Commit[] {
  try {
    const output = runGit(cwd, ['log', '--max-count=50', '--format=%H\t%s\t%an\t%ar']);
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
  } catch (err) {
    logError('getCommitLog', err);
    return [];
  }
}

export function getCommitFiles(cwd: string, hash: string): string[] {
  try {
    const output = runGit(cwd, ['diff-tree', '--no-commit-id', '-r', '--name-only', hash]);
    return output
      .split('\n')
      .filter(line => line.length > 0);
  } catch (err) {
    logError('getCommitFiles', err);
    return [];
  }
}

export function getFileLog(cwd: string, filePath: string): Commit[] {
  try {
    const output = runGit(cwd, ['log', '--max-count=50', '--format=%H\t%s\t%an\t%ar', '--', filePath]);
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
  } catch (err) {
    logError('getFileLog', err);
    return [];
  }
}

export function getBlameLines(cwd: string, filePath: string): BlameLine[] {
  try {
    const output = runGit(cwd, ['blame', '--porcelain', '--', filePath]);
    return parseBlamePorcelain(output);
  } catch (err) {
    logError('getBlameLines', err);
    return [];
  }
}

export async function getBlameLinesAsync(cwd: string, filePath: string): Promise<BlameLine[]> {
  try {
    const output = await runGitAsync(cwd, ['blame', '--porcelain', '--', filePath]);
    return parseBlamePorcelain(output);
  } catch (err) {
    logError('getBlameLinesAsync', err);
    return [];
  }
}

function parseBlamePorcelain(output: string): BlameLine[] {
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
}

export function getFileDiff(cwd: string, hash: string, filePath: string): string {
  try {
    return runGit(cwd, ['diff', `${hash}^..${hash}`, '--', filePath]);
  } catch (err) {
    logError('getFileDiff', err);
    try {
      return runGit(cwd, ['show', hash, '--', filePath]);
    } catch (err2) {
      logError('getFileDiff(show)', err2);
      return '';
    }
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
    const beforeContent = runGit(cwd, ['show', `${hash}^:${filePath}`]);
    fs.writeFileSync(beforePath, beforeContent);
  } catch (err) {
    logError('getDiffUris(before)', err);
    fs.writeFileSync(beforePath, '');
  }

  try {
    const afterContent = runGit(cwd, ['show', `${hash}:${filePath}`]);
    fs.writeFileSync(afterPath, afterContent);
  } catch (err) {
    logError('getDiffUris(after)', err);
    fs.writeFileSync(afterPath, '');
  }

  return {
    before: vscode.Uri.file(beforePath),
    after: vscode.Uri.file(afterPath),
  };
}

import * as vscode from 'vscode';
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
  insertions: number;
  deletions: number;
  isMerge: boolean;
  cherryPickedFrom?: string;
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
    const output = runGit(cwd, [
      'log',
      '--max-count=50',
      '--shortstat',
      '--date=format:%Y-%m-%d %H:%M',
      '--format=%H%x1F%s%x1F%an%x1F%ad%x1F%P%x1F%b',
    ]);
    return parseCommitLog(output);
  } catch (err) {
    logError('getCommitLog', err);
    return [];
  }
}

const CHERRY_PICK_RE = /\(cherry picked from commit ([0-9a-f]+)\)/;

function parseCommitLog(output: string): Commit[] {
  const commits: Commit[] = [];
  let current: Commit | undefined;
  for (const line of output.split('\n')) {
    if (line.includes('\x1F')) {
      if (current) { commits.push(current); }
      const parts = line.split('\x1F');
      const parents = (parts[4] ?? '').trim();
      const bodyFragment = (parts[5] ?? '').trim();
      const cherryMatch = bodyFragment.match(CHERRY_PICK_RE);
      current = {
        hash: parts[0] ?? '',
        message: parts[1] ?? '',
        author: parts[2] ?? '',
        date: parts[3] ?? '',
        insertions: 0,
        deletions: 0,
        isMerge: parents.includes(' '),
        cherryPickedFrom: cherryMatch ? cherryMatch[1] : undefined,
      };
      continue;
    }
    if (current && !current.cherryPickedFrom) {
      const cherryMatch = line.match(CHERRY_PICK_RE);
      if (cherryMatch) { current.cherryPickedFrom = cherryMatch[1]; }
    }
    if (current && /insertions?\(\+\)|deletions?\(-\)/.test(line)) {
      const ins = line.match(/(\d+)\s+insertions?\(\+\)/);
      const del = line.match(/(\d+)\s+deletions?\(-\)/);
      if (ins) { current.insertions = parseInt(ins[1], 10); }
      if (del) { current.deletions = parseInt(del[1], 10); }
    }
  }
  if (current) { commits.push(current); }
  return commits;
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
    const output = runGit(cwd, [
      'log',
      '--max-count=50',
      '--shortstat',
      '--date=format:%Y-%m-%d %H:%M',
      '--format=%H%x1F%s%x1F%an%x1F%ad%x1F%P%x1F%b',
      '--',
      filePath,
    ]);
    return parseCommitLog(output);
  } catch (err) {
    logError('getFileLog', err);
    return [];
  }
}

export function getTotalCommitCount(cwd: string, filePath?: string): number {
  try {
    const args = ['rev-list', '--count', 'HEAD'];
    if (filePath) { args.push('--', filePath); }
    const output = runGit(cwd, args).trim();
    const n = parseInt(output, 10);
    return Number.isNaN(n) ? 0 : n;
  } catch (err) {
    logError('getTotalCommitCount', err);
    return 0;
  }
}

export function isTrackedFile(cwd: string, filePath: string): boolean {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', filePath], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
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

export function getCommitRangeFiles(cwd: string, hash1: string, hash2: string): string[] {
  try {
    const output = runGit(cwd, ['diff', '--name-only', hash1, hash2]);
    return output.split('\n').filter(line => line.length > 0);
  } catch (err) {
    logError('getCommitRangeFiles', err);
    return [];
  }
}

export function getCommitRangeDiff(cwd: string, hash1: string, hash2: string, filePath: string): string {
  try {
    return runGit(cwd, ['diff', hash1, hash2, '--', filePath]);
  } catch (err) {
    logError('getCommitRangeDiff', err);
    return '';
  }
}

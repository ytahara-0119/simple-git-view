# uxGG

## Issue ID
uxGG

## Title
コミット一覧に変更行数（+N -N）を追加 + 日時を絶対時刻表示に変更

## Purpose
- コミット一覧のメッセージ右に挿入/削除行数を `+N -N` 形式で表示する
- 日時を相対表示（`2 days ago`）から絶対時刻（`YYYY-MM-DD HH:mm`）に変更し、いつ作業したか分かるようにする

## Background
- 「このコミットで何行変わったか」をひと目で把握したい（レビュー・調査効率向上）
- 相対時刻は「数日前」までは便利だが、過去のコミットを時系列で追うには絶対時刻のほうが有用
- メイン履歴パネルとファイル履歴パネル両方に適用

## Scope

### `src/gitService.ts`
- `Commit` インターフェースに `insertions: number` と `deletions: number` を追加
- `getCommitLog` / `getFileLog` の `git log` コマンドを以下に変更：
  - `--date=format:%Y-%m-%d %H:%M` を追加
  - `--shortstat` を追加
  - format 区切りを ASCII Unit Separator `\x1F` に変更（タブだとメッセージにタブが含まれる可能性があるため安全）
  - 例:
    ```
    git log --max-count=50 --shortstat \
      --date=format:'%Y-%m-%d %H:%M' \
      --format='%H%x1F%s%x1F%an%x1F%ad'
    ```
- 出力をパースして各コミットの `insertions` / `deletions` を集計
  - メタデータ行（hash, msg, author, date）と shortstat 行が交互に現れる
  - shortstat 行は ` 3 files changed, 10 insertions(+), 2 deletions(-)` のような形式
  - merge commit や stat 行が無いコミットでは 0 として扱う
- `getFileLog` でも同様に対応

### `src/historyPanel.ts`
- メイン履歴パネルとファイル履歴パネル両方の table に **「変更」列を追加**：
  - 列順: ハッシュ / メッセージ / 変更 / 著者 / 日時
  - 「変更」セル内容: `<span class="ins">+${insertions}</span> <span class="del">-${deletions}</span>`
  - スタイル: 緑系（`var(--vscode-gitDecoration-addedResourceForeground)` または `#3fb950`）/ 赤系（`var(--vscode-gitDecoration-deletedResourceForeground)` または `#f85149`）。フォントは monospace。
- col-stat 用 CSS：
  ```css
  table.commit-table .col-stat { width: 90px; font-family: monospace; }
  table.commit-table .ins { color: var(--vscode-gitDecoration-addedResourceForeground, #3fb950); }
  table.commit-table .del { color: var(--vscode-gitDecoration-deletedResourceForeground, #f85149); margin-left: 4px; }
  ```
- 既存の `col-hash` (80px) / `col-msg` (auto) / `col-author` (140px) / `col-date` (120px) は維持し、`col-stat` (90px) を msg の右に挿入。`col-date` は `YYYY-MM-DD HH:mm` 表示で 130px 程度に微調整。
- `<thead>` の見出しも「変更」を追加し、既存の見出しテキストはそのまま（ハッシュ / メッセージ / 変更 / 著者 / 日時）

## Out of Scope
- 変更行数で色付き棒グラフ表示などの装飾
- 日時を相対表示と絶対表示でトグル切替（機能を足さない原則）
- ファイル単位の挿入/削除行数表示（変更ファイル一覧側、別 issue）
- タイムゾーン設定（OS のローカルタイム前提）

## Editable Files
- src/gitService.ts
- src/historyPanel.ts

## Do Not Edit
- src/extension.ts
- src/statusBarItem.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts
- src/blameDecoration.ts
- package.json
- SPEC.md

## Dependencies
- uxFF マージ済み（main 最新）

## Branch
feature/uxGG-commit-stats-and-datetime

## Implementation Notes

### `getCommitLog` 実装スケッチ

```ts
export function getCommitLog(cwd: string): Commit[] {
  try {
    const output = execFileSync('git', [
      'log',
      '--max-count=50',
      '--shortstat',
      '--date=format:%Y-%m-%d %H:%M',
      '--format=%H%x1F%s%x1F%an%x1F%ad',
    ], { cwd, encoding: 'utf8' });
    return parseCommitLog(output);
  } catch (e) {
    logError('getCommitLog', e);
    return [];
  }
}

function parseCommitLog(output: string): Commit[] {
  const commits: Commit[] = [];
  let current: Commit | undefined;
  for (const rawLine of output.split('\n')) {
    const line = rawLine;
    if (line.includes('\x1F')) {
      // commit metadata
      if (current) { commits.push(current); }
      const parts = line.split('\x1F');
      current = {
        hash: parts[0] ?? '',
        message: parts[1] ?? '',
        author: parts[2] ?? '',
        date: parts[3] ?? '',
        insertions: 0,
        deletions: 0,
      };
      continue;
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
```

`getFileLog` も同様の構造。`--` の後にファイルパスを付けるだけ。

### historyPanel.ts のテーブル変更例

メイン履歴パネル `getHtml()` 内：

```ts
const rows = commits
  .map(c => {
    const hash = escapeHtml(c.hash);
    const shortHash = escapeHtml(c.hash.slice(0, 7));
    const message = escapeHtml(c.message);
    const author = escapeHtml(c.author);
    const date = escapeHtml(c.date);
    const ins = c.insertions;
    const del = c.deletions;
    return `<tr data-hash="${hash}" tabindex="-1" style="cursor:pointer;">
      <td class="col-hash">${shortHash}</td>
      <td class="col-msg">${message}</td>
      <td class="col-stat"><span class="ins">+${ins}</span><span class="del">-${del}</span></td>
      <td class="col-author">${author}</td>
      <td class="col-date">${date}</td>
    </tr>`;
  })
  .join('\n');
```

`<thead>` 側も同様に `<th>変更</th>` を追加。

ファイル履歴パネル `openFileHistoryPanel` 内のテーブルも同じ変更を適用。

## Acceptance Criteria
- [ ] メイン履歴パネルのコミット一覧で各行のメッセージ右に「変更」列が表示される
- [ ] 「変更」列に `+10 -2` 形式で挿入行数（緑系）と削除行数（赤系）が表示される
- [ ] 変更行が無いコミット（merge / 空コミット）は `+0 -0` と表示される
- [ ] 日時列が `2026-05-15 08:30` のような形式になっている
- [ ] ファイル履歴パネルでも同様の「変更」列と絶対時刻が表示される
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない（変更列・日時表記の更新は将来の SPEC 改訂で反映、本 issue では SPEC 変更しない）
- [ ] 実装内容を説明できる
- [ ] PR が作成されている（base: main）

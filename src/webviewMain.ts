// Webview client-side script (runs in browser context, no Node.js/VSCode imports)
declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
};

(function () {
  const vscode = acquireVsCodeApi();
  let selectedCommitRow: Element | null = null;
  let selectedFileItem: Element | null = null;
  let currentHash: string | null = null;
  let focusFileListAfterRender = false;
  let markedHash: string | null = null;
  let markedRow: HTMLElement | null = null;

  const tbody = document.querySelector('tbody') as HTMLElement | null;
  if (tbody) {
    tbody.tabIndex = -1;
    tbody.addEventListener('click', (e: Event) => {
      const row = (e.target as Element).closest('tr');
      if (!row) { return; }
      selectCommitRow(row as HTMLElement);
    });
  }

  function visibleRows(): HTMLElement[] {
    const all = Array.from(tbody ? tbody.querySelectorAll('tr') : []) as HTMLElement[];
    return all.filter(r => r.offsetParent !== null);
  }

  function updateStatusLine(): void {
    const hidden = document.body.classList.contains('hide-merges');
    const total = document.body.dataset.totalCount || '?';
    const ms = document.querySelector('.merge-status');
    const cc = document.querySelector('.commit-count');
    if (ms) { ms.textContent = hidden ? 'Merges: hidden (m)' : 'Merges: shown (m)'; }
    if (cc) { cc.textContent = 'Showing ' + visibleRows().length + ' / total: ' + total; }
  }

  function selectCommitRow(row: HTMLElement): void {
    if (selectedCommitRow) { selectedCommitRow.classList.remove('selected'); }
    row.classList.add('selected');
    selectedCommitRow = row;
    currentHash = row.getAttribute('data-hash');
    const dv = document.getElementById('diff-view');
    if (dv) { dv.innerHTML = ''; }
    selectedFileItem = null;

    if (markedHash && currentHash && markedHash !== currentHash && markedRow) {
      const rows = visibleRows();
      const markedIdx = rows.indexOf(markedRow as HTMLElement);
      const selectedIdx = rows.indexOf(row);
      const fromHash = markedIdx > selectedIdx ? markedHash : currentHash;
      const toHash = markedIdx > selectedIdx ? currentHash : markedHash;
      vscode.postMessage({ command: 'showRangeFiles', fromHash, toHash });
    } else {
      vscode.postMessage({ command: 'showFiles', hash: currentHash });
    }
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const active = document.activeElement;
    const inFileList = active && active.closest('#file-list');
    const inDiff = active && (active as HTMLElement).id === 'diff-view';

    if (inDiff) {
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); window.scrollBy({ top: 40 }); return; }
      if (e.key === 'ArrowUp'   || e.key === 'k') { e.preventDefault(); window.scrollBy({ top: -40 }); return; }
      if (e.key === 'PageDown')  { e.preventDefault(); window.scrollBy({ top: window.innerHeight * 0.8 }); return; }
      if (e.key === 'PageUp')    { e.preventDefault(); window.scrollBy({ top: -window.innerHeight * 0.8 }); return; }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedFileItem) { (selectedFileItem as HTMLElement).focus(); }
        return;
      }
      return;
    }

    if (e.key === 'Escape' && !inFileList) {
      if (tbody) { tbody.focus(); }
    }

    if (e.key === 'm' && !inFileList) {
      e.preventDefault();
      document.body.classList.toggle('hide-merges');
      if (selectedCommitRow && (selectedCommitRow as HTMLElement).offsetParent === null) {
        const firstVisible = visibleRows()[0];
        if (firstVisible) { selectCommitRow(firstVisible); }
      }
      updateStatusLine();
      return;
    }

    if (e.key === 'c' && !inFileList && !inDiff) {
      e.preventDefault();
      vscode.postMessage({ command: 'switchTheme' });
      return;
    }

    if (!inFileList) {
      // Commit list navigation
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const rows = visibleRows();
        if (rows.length === 0) { return; }
        const idx = selectedCommitRow ? rows.indexOf(selectedCommitRow as HTMLElement) : -1;
        let next = (e.key === 'ArrowDown' || e.key === 'j') ? idx + 1 : idx - 1;
        next = Math.max(0, Math.min(rows.length - 1, next));
        selectCommitRow(rows[next]);
        rows[next].scrollIntoView({ block: 'nearest' });
      }
      if (e.key === 'Enter' && selectedCommitRow) {
        e.preventDefault();
        const firstFile = document.querySelector('#file-list li') as HTMLElement | null;
        if (firstFile) {
          firstFile.focus();
          firstFile.scrollIntoView({ block: 'nearest' });
          firstFile.click();
        } else {
          focusFileListAfterRender = true;
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        if (!selectedCommitRow) { return; }
        if (markedRow === selectedCommitRow) {
          (markedRow as HTMLElement).classList.remove('marked');
          markedRow = null;
          markedHash = null;
          if (currentHash) { vscode.postMessage({ command: 'showFiles', hash: currentHash }); }
        } else {
          if (markedRow) { (markedRow as HTMLElement).classList.remove('marked'); }
          markedRow = selectedCommitRow as HTMLElement;
          markedHash = currentHash;
          (markedRow as HTMLElement).classList.add('marked');
        }
        return;
      }
    }
  });

  window.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data as { command: string; files?: string[]; hash?: string; diff?: string; filePath?: string; css?: string; name?: string };

    if (msg.command === 'updateTheme') {
      const el = document.getElementById('sgv-theme');
      if (el) { el.textContent = msg.css as string; }
      const badge = document.getElementById('theme-name');
      if (badge) { badge.textContent = msg.name as string; }
      return;
    }

    if (msg.command === 'renderFiles') {
      const container = document.getElementById('file-list');
      const dv = document.getElementById('diff-view');
      if (dv) { dv.innerHTML = ''; }
      selectedFileItem = null;
      if (!container) { return; }
      const shortHash = msg.hash ? msg.hash.slice(0, 7) : '';
      if (!msg.files || msg.files.length === 0) {
        container.innerHTML = '<h3>変更ファイル (' + shortHash + ')</h3>'
          + '<p class="hint">'
          + '<kbd>↑↓</kbd> 移動 · '
          + '<kbd>Enter</kbd> diff へ · '
          + '<kbd>h</kbd> ファイル履歴 · '
          + '<kbd>Esc</kbd> コミット一覧'
          + '</p>'
          + '<p>変更なし</p>';
        return;
      }
      const ul = document.createElement('ul');
      msg.files.forEach((f: string) => {
        const li = document.createElement('li');
        li.textContent = f;
        li.tabIndex = 0;
        li.title = 'クリック: diff を下部に表示  /  h キー: ファイル履歴を新規タブで開く';
        li.addEventListener('click', () => {
          if (selectedFileItem) { selectedFileItem.classList.remove('selected'); }
          li.classList.add('selected');
          selectedFileItem = li;
          if (markedHash && currentHash && markedHash !== currentHash && markedRow) {
            const rows = visibleRows();
            const markedIdx = rows.indexOf(markedRow as HTMLElement);
            const selectedIdx = selectedCommitRow ? rows.indexOf(selectedCommitRow as HTMLElement) : -1;
            const fromHash = markedIdx > selectedIdx ? markedHash : currentHash;
            const toHash = markedIdx > selectedIdx ? currentHash : markedHash;
            vscode.postMessage({ command: 'showRangeFileDiff', fromHash, toHash, filePath: f });
          } else if (currentHash) {
            vscode.postMessage({ command: 'showFileDiff', hash: currentHash, filePath: f });
          }
        });
        li.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'h') {
            vscode.postMessage({ command: 'showFileLog', filePath: f });
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            const dv = document.getElementById('diff-view') as HTMLElement | null;
            if (dv) { dv.focus(); dv.scrollIntoView({ block: 'start' }); }
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (selectedCommitRow) {
              (selectedCommitRow as HTMLElement).focus();
              (selectedCommitRow as HTMLElement).scrollIntoView({ block: 'nearest' });
            }
          }
          if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'ArrowUp' || e.key === 'k') {
            e.preventDefault();
            const items = Array.from(ul.querySelectorAll('li')) as HTMLElement[];
            const idx = items.indexOf(li);
            const next = (e.key === 'ArrowDown' || e.key === 'j') ? idx + 1 : idx - 1;
            if (next >= 0 && next < items.length) {
              items[next].focus();
              items[next].scrollIntoView({ block: 'nearest' });
              items[next].click();
            }
          }
        });
        ul.appendChild(li);
      });
      container.innerHTML = '<h3>変更ファイル (' + shortHash + ')</h3>'
        + '<p class="hint">'
        + '<kbd>↑↓</kbd> 移動 · '
        + '<kbd>Enter</kbd> diff へ · '
        + '<kbd>h</kbd> ファイル履歴 · '
        + '<kbd>Esc</kbd> コミット一覧'
        + '</p>';
      container.appendChild(ul);
      if (focusFileListAfterRender) {
        focusFileListAfterRender = false;
        const first = ul.querySelector('li') as HTMLElement | null;
        if (first) {
          first.focus();
          first.scrollIntoView({ block: 'nearest' });
          first.click();
        }
      }
    }

    if (msg.command === 'renderDiff') {
      const container = document.getElementById('diff-view');
      if (!container) { return; }
      if (!msg.diff) {
        container.innerHTML = '<h3>' + escapeHtml(msg.filePath || '') + ' — diff</h3><p>差分なし</p>';
        return;
      }
      container.innerHTML = '<h3>🔍 ' + escapeHtml(msg.filePath || '') + ' — diff</h3>' + renderSplitDiff(msg.diff);
    }
  });

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderSplitDiff(diff: string): string {
    const lines = diff.split('\n');
    const rows: string[] = [];
    const pendingDel: string[] = [];
    const pendingAdd: string[] = [];
    let leftLine = 1;
    let rightLine = 1;

    function flush(): void {
      const max = Math.max(pendingDel.length, pendingAdd.length);
      for (let i = 0; i < max; i++) {
        const hasDel = i < pendingDel.length;
        const hasAdd = i < pendingAdd.length;
        const lCells = hasDel
          ? '<div class="ln">' + (leftLine + i) + '</div><div class="cell diff-del">' + escapeHtml(pendingDel[i]) + '</div>'
          : '<div class="ln"></div><div class="cell diff-empty"></div>';
        const rCells = hasAdd
          ? '<div class="ln">' + (rightLine + i) + '</div><div class="cell diff-add">' + escapeHtml(pendingAdd[i]) + '</div>'
          : '<div class="ln"></div><div class="cell diff-empty"></div>';
        rows.push('<div class="row">' + lCells + rCells + '</div>');
      }
      leftLine += pendingDel.length;
      rightLine += pendingAdd.length;
      pendingDel.length = 0;
      pendingAdd.length = 0;
    }

    for (const line of lines) {
      if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
        flush();
        rows.push('<div class="row meta"><div class="meta-content">' + escapeHtml(line) + '</div></div>');
      } else if (line.startsWith('@@')) {
        flush();
        const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (m) { leftLine = parseInt(m[1], 10); rightLine = parseInt(m[2], 10); }
        rows.push('<div class="row hunk"><div class="meta-content">' + escapeHtml(line) + '</div></div>');
      } else if (line.startsWith('-')) {
        pendingDel.push(line.slice(1));
      } else if (line.startsWith('+')) {
        pendingAdd.push(line.slice(1));
      } else {
        flush();
        const content = line.startsWith(' ') ? line.slice(1) : line;
        const esc = escapeHtml(content);
        rows.push('<div class="row"><div class="ln">' + leftLine + '</div><div class="cell">' + esc + '</div><div class="ln">' + rightLine + '</div><div class="cell">' + esc + '</div></div>');
        leftLine++;
        rightLine++;
      }
    }
    flush();

    return '<div class="split-diff">' + rows.join('') + '</div>';
  }

  // Auto-select first visible commit row after listeners are registered
  if (tbody) {
    const firstRow = visibleRows()[0];
    if (firstRow) { selectCommitRow(firstRow); }
  }

  updateStatusLine();
}());

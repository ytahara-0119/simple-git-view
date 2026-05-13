// File history webview client-side script (browser context only)
declare function acquireVsCodeApi(): { postMessage(msg: unknown): void; };

(function () {
  const vscode = acquireVsCodeApi();
  let selectedRow: HTMLElement | null = null;
  const tbody = document.querySelector('tbody') as HTMLElement;

  function selectRow(row: HTMLElement): void {
    if (!row) { return; }
    if (selectedRow) { selectedRow.classList.remove('selected'); }
    row.classList.add('selected');
    selectedRow = row;
    row.focus();
    row.scrollIntoView({ block: 'nearest' });
    vscode.postMessage({ command: 'showDiff', hash: row.getAttribute('data-hash'), filePath: row.getAttribute('data-filepath') });
  }

  if (tbody) {
    tbody.addEventListener('click', (e: Event) => {
      const row = (e.target as Element).closest('tr') as HTMLElement | null;
      if (row) { selectRow(row); }
    });
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const rows = Array.from(tbody ? tbody.querySelectorAll('tr') : []) as HTMLElement[];
      const idx = selectedRow ? rows.indexOf(selectedRow) : -1;
      let next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
      next = Math.max(0, Math.min(rows.length - 1, next));
      selectRow(rows[next]);
    }
  });

  window.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data as { command: string; diff?: string; filePath?: string };
    if (msg.command === 'renderDiff') {
      const container = document.getElementById('diff-view');
      if (!container) { return; }
      if (!msg.diff) {
        container.innerHTML = '<h3>' + escapeHtml(msg.filePath || '') + ' — diff</h3><p>差分なし</p>';
        return;
      }
      container.innerHTML = '<h3>' + escapeHtml(msg.filePath || '') + ' — diff</h3>' + renderSplitDiff(msg.diff);
    }
  });

  // Auto-select first row after all listeners are registered
  if (tbody) {
    const firstRow = tbody.querySelector('tr') as HTMLElement | null;
    if (firstRow) { selectRow(firstRow); }
  }

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderSplitDiff(diff: string): string {
    const lines = diff.split('\n');
    const rows: string[] = [];
    const pendingDel: string[] = [];
    const pendingAdd: string[] = [];
    let leftLine = 1, rightLine = 1;

    function flush(): void {
      const max = Math.max(pendingDel.length, pendingAdd.length);
      for (let i = 0; i < max; i++) {
        const hasDel = i < pendingDel.length, hasAdd = i < pendingAdd.length;
        const lc = hasDel ? '<td class="ln">' + (leftLine + i) + '</td><td class="diff-del">' + escapeHtml(pendingDel[i]) + '</td>' : '<td class="ln"></td><td class="diff-empty"></td>';
        const rc = hasAdd ? '<td class="ln">' + (rightLine + i) + '</td><td class="diff-add">' + escapeHtml(pendingAdd[i]) + '</td>' : '<td class="ln"></td><td class="diff-empty"></td>';
        rows.push('<tr>' + lc + rc + '</tr>');
      }
      leftLine += pendingDel.length; rightLine += pendingAdd.length;
      pendingDel.length = 0; pendingAdd.length = 0;
    }

    for (const line of lines) {
      if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
        flush(); rows.push('<tr class="diff-meta"><td class="ln" colspan="2"></td><td colspan="2">' + escapeHtml(line) + '</td></tr>');
      } else if (line.startsWith('@@')) {
        flush();
        const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (m) { leftLine = parseInt(m[1], 10); rightLine = parseInt(m[2], 10); }
        rows.push('<tr class="diff-hunk"><td class="ln" colspan="2"></td><td colspan="2">' + escapeHtml(line) + '</td></tr>');
      } else if (line.startsWith('-')) { pendingDel.push(line.slice(1)); }
      else if (line.startsWith('+')) { pendingAdd.push(line.slice(1)); }
      else {
        flush();
        const content = line.startsWith(' ') ? line.slice(1) : line;
        const hl = escapeHtml(content);
        rows.push('<tr class="diff-context"><td class="ln">' + leftLine + '</td><td>' + hl + '</td><td class="ln">' + rightLine + '</td><td>' + hl + '</td></tr>');
        leftLine++; rightLine++;
      }
    }
    flush();
    return '<table class="split-diff">' + rows.join('') + '</table>';
  }
}());

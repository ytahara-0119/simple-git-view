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
    const target = e.target as HTMLElement | null;
    const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
    const isEditable = tag === 'input' || tag === 'textarea';
    const active = document.activeElement as HTMLElement | null;
    const inDiff = active && active.id === 'diff-view';

    if (inDiff) {
      if (e.key === 'ArrowDown') { e.preventDefault(); window.scrollBy({ top: 40 }); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); window.scrollBy({ top: -40 }); return; }
      if (e.key === 'PageDown')  { e.preventDefault(); window.scrollBy({ top: window.innerHeight * 0.8 }); return; }
      if (e.key === 'PageUp')    { e.preventDefault(); window.scrollBy({ top: -window.innerHeight * 0.8 }); return; }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedRow) { selectedRow.focus(); }
        return;
      }
      if (e.key === 'q' && !isEditable) {
        e.preventDefault();
        vscode.postMessage({ command: 'close' });
        return;
      }
      return;
    }

    if (e.key === 'q' && !isEditable) {
      e.preventDefault();
      vscode.postMessage({ command: 'close' });
      return;
    }
    if (e.key === 'Enter' && selectedRow) {
      e.preventDefault();
      const dv = document.getElementById('diff-view') as HTMLElement | null;
      if (dv) { dv.focus(); dv.scrollIntoView({ block: 'start' }); }
      return;
    }
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
        const lCells = hasDel
          ? '<div class="ln">' + (leftLine + i) + '</div><div class="cell diff-del">' + escapeHtml(pendingDel[i]) + '</div>'
          : '<div class="ln"></div><div class="cell diff-empty"></div>';
        const rCells = hasAdd
          ? '<div class="ln">' + (rightLine + i) + '</div><div class="cell diff-add">' + escapeHtml(pendingAdd[i]) + '</div>'
          : '<div class="ln"></div><div class="cell diff-empty"></div>';
        rows.push('<div class="row">' + lCells + rCells + '</div>');
      }
      leftLine += pendingDel.length; rightLine += pendingAdd.length;
      pendingDel.length = 0; pendingAdd.length = 0;
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
      } else if (line.startsWith('-')) { pendingDel.push(line.slice(1)); }
      else if (line.startsWith('+')) { pendingAdd.push(line.slice(1)); }
      else {
        flush();
        const content = line.startsWith(' ') ? line.slice(1) : line;
        const esc = escapeHtml(content);
        rows.push('<div class="row"><div class="ln">' + leftLine + '</div><div class="cell">' + esc + '</div><div class="ln">' + rightLine + '</div><div class="cell">' + esc + '</div></div>');
        leftLine++; rightLine++;
      }
    }
    flush();
    return '<div class="split-diff">' + rows.join('') + '</div>';
  }
}());

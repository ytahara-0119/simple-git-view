// File history webview client-side script (browser context only)
declare function acquireVsCodeApi(): { postMessage(msg: unknown): void; };

(function () {
  const vscode = acquireVsCodeApi();
  let selectedRow: HTMLElement | null = null;
  let markedHash: string | null = null;
  let markedRow: HTMLElement | null = null;
  const tbody = document.querySelector('tbody') as HTMLElement;

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

  function selectRow(row: HTMLElement): void {
    if (!row) { return; }
    if (selectedRow) { selectedRow.classList.remove('selected'); }
    row.classList.add('selected');
    selectedRow = row;
    row.focus();
    row.scrollIntoView({ block: 'nearest' });

    const hash = row.getAttribute('data-hash');
    const filePath = row.getAttribute('data-filepath');

    if (markedHash && hash && markedHash !== hash && markedRow) {
      const rows = visibleRows();
      const markedIdx = rows.indexOf(markedRow as HTMLElement);
      const selectedIdx = rows.indexOf(row);
      const fromHash = markedIdx > selectedIdx ? markedHash : hash;
      const toHash = markedIdx > selectedIdx ? hash : markedHash;
      vscode.postMessage({ command: 'showRangeDiff', fromHash, toHash, filePath });
    } else {
      vscode.postMessage({ command: 'showDiff', hash, filePath });
    }
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
      const dv = document.getElementById('diff-view') as HTMLElement;
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); dv.scrollBy({ top: 40 }); return; }
      if (e.key === 'ArrowUp'   || e.key === 'k') { e.preventDefault(); dv.scrollBy({ top: -40 }); return; }
      if (e.key === 'PageDown')  { e.preventDefault(); dv.scrollBy({ top: dv.clientHeight * 0.8 }); return; }
      if (e.key === 'PageUp')    { e.preventDefault(); dv.scrollBy({ top: -dv.clientHeight * 0.8 }); return; }
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
    if (e.key === ' ') {
      e.preventDefault();
      if (!selectedRow) { return; }
      const hash = selectedRow.getAttribute('data-hash');
      if (markedRow === selectedRow) {
        (markedRow as HTMLElement).classList.remove('marked');
        markedRow = null;
        markedHash = null;
        if (hash) {
          const filePath = selectedRow.getAttribute('data-filepath');
          vscode.postMessage({ command: 'showDiff', hash, filePath });
        }
      } else {
        if (markedRow) { (markedRow as HTMLElement).classList.remove('marked'); }
        markedRow = selectedRow;
        markedHash = hash;
        markedRow.classList.add('marked');
      }
      return;
    }
    if (e.key === 'm') {
      e.preventDefault();
      document.body.classList.toggle('hide-merges');
      if (selectedRow && selectedRow.offsetParent === null) {
        const firstVisible = visibleRows()[0];
        if (firstVisible) { selectRow(firstVisible); }
      }
      updateStatusLine();
      return;
    }
    if (e.key === 't' && !inDiff) {
      e.preventDefault();
      vscode.postMessage({ command: 'switchTheme' });
      return;
    }
    if (e.key === 'Enter' && selectedRow) {
      e.preventDefault();
      const dv = document.getElementById('diff-view') as HTMLElement | null;
      if (dv) { dv.focus(); dv.scrollTop = 0; }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      const rows = visibleRows();
      const idx = selectedRow ? rows.indexOf(selectedRow) : -1;
      let next = (e.key === 'ArrowDown' || e.key === 'j') ? idx + 1 : idx - 1;
      next = Math.max(0, Math.min(rows.length - 1, next));
      selectRow(rows[next]);
    }
  });

  window.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data as { command: string; diff?: string; filePath?: string; title?: string; css?: string; name?: string };
    if (msg.command === 'updateTheme') {
      const el = document.getElementById('sgv-theme');
      if (el) { el.textContent = msg.css as string; }
      const badge = document.getElementById('theme-name');
      if (badge) { badge.textContent = msg.name as string; }
      return;
    }
    if (msg.command === 'renderDiff') {
      const container = document.getElementById('diff-view');
      if (!container) { return; }
      const titleText = msg.title ? escapeHtml(msg.title) : escapeHtml(msg.filePath || '') + ' — diff';
      if (!msg.diff) {
        container.innerHTML = '<h3>' + titleText + '</h3><p>差分なし</p>';
        return;
      }
      container.innerHTML = '<h3>🔍 ' + titleText + '</h3>' + renderSplitDiff(msg.diff);
      container.scrollTop = 0;
    }
  });

  // Auto-select first visible row after all listeners are registered
  if (tbody) {
    const firstRow = visibleRows()[0];
    if (firstRow) { selectRow(firstRow); }
  }

  updateStatusLine();

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

  // Intercept wheel events to prevent VSCode webview outer scroll,
  // and redirect to the nearest inner scrollable element instead.
  window.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    let el = e.target as HTMLElement | null;
    while (el) {
      const style = window.getComputedStyle(el);
      const oy = style.overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) {
        el.scrollBy({ top: e.deltaY, left: e.deltaX });
        return;
      }
      el = el.parentElement;
    }
  }, { passive: false });
}());

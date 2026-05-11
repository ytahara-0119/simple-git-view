// File history webview client-side script (browser context only)
declare function acquireVsCodeApi(): { postMessage(msg: unknown): void; };

(function () {
  const vscode = acquireVsCodeApi();
  let selectedRow: HTMLElement | null = null;
  const tbody = document.querySelector('tbody') as HTMLElement;

  const jsStatus = document.getElementById('js-status');
  if (jsStatus) {
    jsStatus.textContent = 'JS: 起動済み ✓';
    (jsStatus as HTMLElement).style.background = 'rgba(80,200,120,0.2)';
    (jsStatus as HTMLElement).style.borderLeftColor = 'green';
  }

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

  const KEYWORDS = new Set([
    'abstract','any','as','asserts','async','await','boolean','break','case','catch',
    'class','const','continue','debugger','declare','default','delete','do','else',
    'enum','export','extends','false','finally','for','from','function','get','if',
    'implements','import','in','infer','instanceof','interface','is','keyof','let',
    'module','namespace','never','new','null','number','object','of','package',
    'private','protected','public','readonly','require','return','set','static',
    'string','super','switch','symbol','this','throw','true','try','type','typeof',
    'undefined','unique','unknown','var','void','while','with','yield',
  ]);

  function syntaxHighlight(code: string): string {
    let out = '', i = 0;
    while (i < code.length) {
      if (code[i] === '/' && code[i + 1] === '/') { out += '<span style="color:#6a9955">' + escapeHtml(code.slice(i)) + '</span>'; break; }
      if (code[i] === '/' && code[i + 1] === '*') { const e = code.indexOf('*/', i + 2); const c = e === -1 ? code.slice(i) : code.slice(i, e + 2); out += '<span style="color:#6a9955">' + escapeHtml(c) + '</span>'; i += c.length; continue; }
      if (code[i] === '"' || code[i] === "'" || code[i] === '`') { const q = code[i]; let j = i + 1; while (j < code.length) { if (code[j] === '\\') { j += 2; continue; } if (code[j] === q) { j++; break; } j++; } out += '<span style="color:#ce9178">' + escapeHtml(code.slice(i, j)) + '</span>'; i = j; continue; }
      if (/\d/.test(code[i]) && (i === 0 || /\W/.test(code[i - 1]))) { let j = i; while (j < code.length && /[\d._xXa-fA-FnN]/.test(code[j])) { j++; } out += '<span style="color:#b5cea8">' + escapeHtml(code.slice(i, j)) + '</span>'; i = j; continue; }
      if (/[a-zA-Z_$]/.test(code[i])) { let j = i; while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) { j++; } const w = code.slice(i, j); if (KEYWORDS.has(w)) { out += '<span style="color:#569cd6">' + escapeHtml(w) + '</span>'; } else if (/^[A-Z]/.test(w)) { out += '<span style="color:#4ec9b0">' + escapeHtml(w) + '</span>'; } else { out += '<span style="color:#9cdcfe">' + escapeHtml(w) + '</span>'; } i = j; continue; }
      out += escapeHtml(code[i]); i++;
    }
    return out;
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
        const lc = hasDel ? '<td class="ln">' + (leftLine + i) + '</td><td class="diff-del">' + syntaxHighlight(pendingDel[i]) + '</td>' : '<td class="ln"></td><td class="diff-empty"></td>';
        const rc = hasAdd ? '<td class="ln">' + (rightLine + i) + '</td><td class="diff-add">' + syntaxHighlight(pendingAdd[i]) + '</td>' : '<td class="ln"></td><td class="diff-empty"></td>';
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
        const hl = syntaxHighlight(content);
        rows.push('<tr class="diff-context"><td class="ln">' + leftLine + '</td><td>' + hl + '</td><td class="ln">' + rightLine + '</td><td>' + hl + '</td></tr>');
        leftLine++; rightLine++;
      }
    }
    flush();
    return '<table class="split-diff">' + rows.join('') + '</table>';
  }
}());

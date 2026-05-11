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

  const jsStatus = document.getElementById('js-status');
  if (jsStatus) {
    jsStatus.textContent = 'JS: 起動済み ✓';
    (jsStatus as HTMLElement).style.background = 'rgba(80,200,120,0.2)';
    (jsStatus as HTMLElement).style.borderLeftColor = 'green';
  }

  const tbody = document.querySelector('tbody') as HTMLElement | null;
  if (tbody) {
    tbody.tabIndex = -1;
    tbody.addEventListener('click', (e: Event) => {
      const row = (e.target as Element).closest('tr');
      if (!row) { return; }
      selectCommitRow(row as HTMLElement);
    });
  }

  function selectCommitRow(row: HTMLElement): void {
    if (selectedCommitRow) { selectedCommitRow.classList.remove('selected'); }
    row.classList.add('selected');
    selectedCommitRow = row;
    currentHash = row.getAttribute('data-hash');
    const dv = document.getElementById('diff-view');
    if (dv) { dv.innerHTML = ''; }
    selectedFileItem = null;
    vscode.postMessage({ command: 'showFiles', hash: currentHash });
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const active = document.activeElement;
    const inFileList = active && active.closest('#file-list');

    if (e.key === 'Escape' && !inFileList) {
      if (tbody) { tbody.focus(); }
    }

    if (!inFileList) {
      // Commit list navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const rows = Array.from(tbody ? tbody.querySelectorAll('tr') : []) as HTMLElement[];
        if (rows.length === 0) { return; }
        const idx = selectedCommitRow ? rows.indexOf(selectedCommitRow as HTMLElement) : -1;
        let next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
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
    }
  });

  window.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data as { command: string; files?: string[]; hash?: string; diff?: string; filePath?: string };

    if (msg.command === 'renderFiles') {
      const container = document.getElementById('file-list');
      const dv = document.getElementById('diff-view');
      if (dv) { dv.innerHTML = ''; }
      selectedFileItem = null;
      if (!container) { return; }
      const shortHash = msg.hash ? msg.hash.slice(0, 7) : '';
      if (!msg.files || msg.files.length === 0) {
        container.innerHTML = '<h3>変更ファイル (' + shortHash + ')</h3><p>変更なし</p>';
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
          if (currentHash) {
            vscode.postMessage({ command: 'showFileDiff', hash: currentHash, filePath: f });
          }
        });
        li.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'h') {
            vscode.postMessage({ command: 'showFileLog', filePath: f });
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (selectedCommitRow) {
              (selectedCommitRow as HTMLElement).focus();
              (selectedCommitRow as HTMLElement).scrollIntoView({ block: 'nearest' });
            }
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const items = Array.from(ul.querySelectorAll('li')) as HTMLElement[];
            const idx = items.indexOf(li);
            const next = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
            if (next >= 0 && next < items.length) {
              items[next].focus();
              items[next].scrollIntoView({ block: 'nearest' });
              items[next].click();
            }
          }
        });
        ul.appendChild(li);
      });
      container.innerHTML = '<h3>変更ファイル (' + shortHash + ')</h3><p class="hint">クリック: diff を下部に表示  /  h キー: ファイル履歴（新規タブ） /  Esc: コミット一覧に戻る</p>';
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
      container.innerHTML = '<h3>' + escapeHtml(msg.filePath || '') + ' — diff</h3>' + renderSplitDiff(msg.diff);
    }
  });

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // VS Code dark theme colors
  const HL_KW  = 'color:#569cd6';  // keywords
  const HL_STR = 'color:#ce9178';  // strings
  const HL_CM  = 'color:#6a9955';  // comments
  const HL_NUM = 'color:#b5cea8';  // numbers
  const HL_TYPE= 'color:#4ec9b0';  // types / PascalCase
  const HL_PROP= 'color:#9cdcfe';  // properties / variables

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
    let out = '';
    let i = 0;
    while (i < code.length) {
      // Line comment
      if (code[i] === '/' && code[i + 1] === '/') {
        out += '<span style="' + HL_CM + '">' + escapeHtml(code.slice(i)) + '</span>';
        break;
      }
      // Block comment fragment
      if (code[i] === '/' && code[i + 1] === '*') {
        const end = code.indexOf('*/', i + 2);
        const chunk = end === -1 ? code.slice(i) : code.slice(i, end + 2);
        out += '<span style="' + HL_CM + '">' + escapeHtml(chunk) + '</span>';
        i += chunk.length;
        continue;
      }
      // String literals
      if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
        const q = code[i];
        let j = i + 1;
        while (j < code.length) {
          if (code[j] === '\\') { j += 2; continue; }
          if (code[j] === q) { j++; break; }
          j++;
        }
        out += '<span style="' + HL_STR + '">' + escapeHtml(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Number
      if (/\d/.test(code[i]) && (i === 0 || /\W/.test(code[i - 1]))) {
        let j = i;
        while (j < code.length && /[\d._xXa-fA-FnN]/.test(code[j])) { j++; }
        out += '<span style="' + HL_NUM + '">' + escapeHtml(code.slice(i, j)) + '</span>';
        i = j;
        continue;
      }
      // Identifier / keyword / type
      if (/[a-zA-Z_$]/.test(code[i])) {
        let j = i;
        while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) { j++; }
        const word = code.slice(i, j);
        if (KEYWORDS.has(word)) {
          out += '<span style="' + HL_KW + '">' + escapeHtml(word) + '</span>';
        } else if (/^[A-Z]/.test(word)) {
          out += '<span style="' + HL_TYPE + '">' + escapeHtml(word) + '</span>';
        } else {
          out += '<span style="' + HL_PROP + '">' + escapeHtml(word) + '</span>';
        }
        i = j;
        continue;
      }
      out += escapeHtml(code[i]);
      i++;
    }
    return out;
  }

  function renderSplitDiff(diff: string): string {
    const lines = diff.split('\n');
    const rows: string[] = [];
    const pendingDel: string[] = [];
    const pendingAdd: string[] = [];
    let leftLine = 1;
    let rightLine = 1;

    function flushPending(): void {
      const max = Math.max(pendingDel.length, pendingAdd.length);
      for (let i = 0; i < max; i++) {
        const hasDel = i < pendingDel.length;
        const hasAdd = i < pendingAdd.length;
        const lNum = hasDel ? String(leftLine + i) : '';
        const rNum = hasAdd ? String(rightLine + i) : '';
        const lCell = hasDel
          ? '<td class="ln">' + lNum + '</td><td class="diff-del">' + syntaxHighlight(pendingDel[i]) + '</td>'
          : '<td class="ln"></td><td class="diff-empty"></td>';
        const rCell = hasAdd
          ? '<td class="ln">' + rNum + '</td><td class="diff-add">' + syntaxHighlight(pendingAdd[i]) + '</td>'
          : '<td class="ln"></td><td class="diff-empty"></td>';
        rows.push('<tr>' + lCell + rCell + '</tr>');
      }
      leftLine += pendingDel.length;
      rightLine += pendingAdd.length;
      pendingDel.length = 0;
      pendingAdd.length = 0;
    }

    for (const line of lines) {
      if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
        flushPending();
        rows.push('<tr class="diff-meta"><td class="ln" colspan="2"></td><td colspan="2">' + escapeHtml(line) + '</td></tr>');
      } else if (line.startsWith('@@')) {
        flushPending();
        const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (m) { leftLine = parseInt(m[1], 10); rightLine = parseInt(m[2], 10); }
        rows.push('<tr class="diff-hunk"><td class="ln" colspan="2"></td><td colspan="2">' + escapeHtml(line) + '</td></tr>');
      } else if (line.startsWith('-')) {
        pendingDel.push(line.slice(1));
      } else if (line.startsWith('+')) {
        pendingAdd.push(line.slice(1));
      } else {
        flushPending();
        const content = line.startsWith(' ') ? line.slice(1) : line;
        const hl = syntaxHighlight(content);
        rows.push('<tr class="diff-context"><td class="ln">' + leftLine + '</td><td>' + hl + '</td><td class="ln">' + rightLine + '</td><td>' + hl + '</td></tr>');
        leftLine++;
        rightLine++;
      }
    }
    flushPending();

    return '<table class="split-diff">' + rows.join('') + '</table>';
  }
}());

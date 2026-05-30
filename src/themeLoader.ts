import * as fs from 'fs';
import * as path from 'path';

export interface ThemeEntry {
  name: string;
  vars: Record<string, string>;
}

function blendWithWhite(hex: string, factor: number): string {
  if (!hex.startsWith('#') || hex.length < 7) { return hex; }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (255 - r) * factor);
  const ng = Math.round(g + (255 - g) * factor);
  const nb = Math.round(b + (255 - b) * factor);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

function hexAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length < 7) { return hex; }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function themeFromColors(name: string, colors: Record<string, string>): ThemeEntry {
  const primary     = colors.primary     || '#000000';
  const accent      = colors.accent      || '#000000';
  const signal      = colors.signal      || '#000000';
  const destructive = colors.destructive || '#000000';
  const background  = colors.background  || '#ffffff';
  const surface     = colors.surface     || '#ffffff';
  const muted       = colors.muted       || '#cccccc';
  const border      = colors.border      || '#cccccc';
  const depth       = colors.depth       || '#000000';
  const ink         = colors.ink         || '#000000';

  const vars: Record<string, string> = {
    '--sgv-text':          ink,
    '--sgv-bg1':           background,
    '--sgv-bg2':           surface,
    '--sgv-tab1':          primary,
    '--sgv-tab2':          accent,
    '--sgv-tab3':          signal,
    '--sgv-th1':           blendWithWhite(muted, 0.3),
    '--sgv-th2':           blendWithWhite(surface, 0.05),
    '--sgv-th-text':       depth,
    '--sgv-row-border':    blendWithWhite(border, 0.1),
    '--sgv-hash':          primary,
    '--sgv-ins':           signal,
    '--sgv-del':           destructive,
    '--sgv-author':        depth,
    '--sgv-date':          blendWithWhite(depth, 0.45),
    '--sgv-sel1':          blendWithWhite(primary, 0.75),
    '--sgv-sel2':          blendWithWhite(signal, 0.75),
    '--sgv-sel-text':      depth,
    '--sgv-mark1':         '#fef9c3',
    '--sgv-mark2':         '#fef08a',
    '--sgv-mark-text':     '#854d0e',
    '--sgv-marksel1':      '#fed7aa',
    '--sgv-marksel2':      '#fde68a',
    '--sgv-marksel-text':  '#78350f',
    '--sgv-focus':         accent,
    '--sgv-fsel1':         blendWithWhite(signal, 0.5),
    '--sgv-fsel2':         blendWithWhite(primary, 0.5),
    '--sgv-hint-text':     primary,
    '--sgv-hint-bg':       blendWithWhite(primary, 0.85),
    '--sgv-status-text':   signal,
    '--sgv-status-bg':     blendWithWhite(signal, 0.85),
    '--sgv-fhint-text':    primary,
    '--sgv-fhint-bg':      blendWithWhite(signal, 0.85),
    '--sgv-kbd-border':    blendWithWhite(accent, 0.3),
    '--sgv-kbd-bg':        hexAlpha(accent, 0.15),
    '--sgv-kbd-text':      accent,
    '--sgv-dh1':           primary,
    '--sgv-dh2':           signal,
    '--sgv-dh3':           destructive,
    '--sgv-diff-bg1':      blendWithWhite(background, 0.5),
    '--sgv-diff-bg2':      blendWithWhite(surface, 0.5),
    '--sgv-diff-meta-text': depth,
    '--sgv-diff-meta1':    muted,
    '--sgv-diff-meta2':    blendWithWhite(muted, 0.35),
    '--sgv-lndel1':        blendWithWhite(destructive, 0.82),
    '--sgv-lndel2':        blendWithWhite(destructive, 0.97),
    '--sgv-lndel-b':       blendWithWhite(destructive, 0.55),
    '--sgv-lndel-text':    destructive,
    '--sgv-lnadd1':        blendWithWhite(signal, 0.82),
    '--sgv-lnadd2':        blendWithWhite(signal, 0.97),
    '--sgv-lnadd-b':       blendWithWhite(signal, 0.55),
    '--sgv-lnadd-text':    signal,
    '--sgv-del-cell1':     blendWithWhite(destructive, 0.87),
    '--sgv-del-cell2':     blendWithWhite(destructive, 0.97),
    '--sgv-add-cell1':     blendWithWhite(signal, 0.87),
    '--sgv-add-cell2':     blendWithWhite(signal, 0.97),
    '--sgv-empty-cell':    blendWithWhite(background, 0.2),
  };

  return { name, vars };
}

export const DEFAULT_FIGMA_THEME: ThemeEntry = {
  name: 'Figma Pink',
  vars: {
    '--sgv-text':          '#1e2939',
    '--sgv-bg1':           'rgb(250,245,255)',
    '--sgv-bg2':           'rgb(253,242,248)',
    '--sgv-tab1':          '#c27aff',
    '--sgv-tab2':          '#fb64b6',
    '--sgv-tab3':          '#ff637e',
    '--sgv-th1':           '#e9d4ff',
    '--sgv-th2':           '#fccee8',
    '--sgv-th-text':       '#59168b',
    '--sgv-row-border':    '#f3e8ff',
    '--sgv-hash':          '#9810fa',
    '--sgv-ins':           '#00c950',
    '--sgv-del':           '#ff2056',
    '--sgv-author':        '#364153',
    '--sgv-date':          '#6a7282',
    '--sgv-sel1':          '#dbeafe',
    '--sgv-sel2':          '#cefafe',
    '--sgv-sel-text':      'inherit',
    '--sgv-mark1':         '#fef9c3',
    '--sgv-mark2':         '#fef08a',
    '--sgv-mark-text':     '#854d0e',
    '--sgv-marksel1':      '#fed7aa',
    '--sgv-marksel2':      '#fde68a',
    '--sgv-marksel-text':  '#78350f',
    '--sgv-focus':         '#c27aff',
    '--sgv-fsel1':         '#a4f4cf',
    '--sgv-fsel2':         '#96f7e4',
    '--sgv-hint-text':     '#9810fa',
    '--sgv-hint-bg':       '#f3e8ff',
    '--sgv-status-text':   '#e60076',
    '--sgv-status-bg':     '#fce7f3',
    '--sgv-fhint-text':    '#009689',
    '--sgv-fhint-bg':      '#cbfbf1',
    '--sgv-kbd-border':    '#d8b4fe',
    '--sgv-kbd-bg':        'rgba(194,122,255,0.15)',
    '--sgv-kbd-text':      '#7c3aed',
    '--sgv-dh1':           '#ffb900',
    '--sgv-dh2':           '#ff8904',
    '--sgv-dh3':           '#ff637e',
    '--sgv-diff-bg1':      '#fffbeb',
    '--sgv-diff-bg2':      '#fff7ed',
    '--sgv-diff-meta-text': '#45556c',
    '--sgv-diff-meta1':    '#e2e8f0',
    '--sgv-diff-meta2':    '#f1f5f9',
    '--sgv-lndel1':        '#ffedd4',
    '--sgv-lndel2':        '#fff7ed',
    '--sgv-lndel-b':       '#ffd6a8',
    '--sgv-lndel-text':    '#f54900',
    '--sgv-lnadd1':        '#cbfbf1',
    '--sgv-lnadd2':        '#f0fdfa',
    '--sgv-lnadd-b':       '#96f7e4',
    '--sgv-lnadd-text':    '#009689',
    '--sgv-del-cell1':     '#ffe4e6',
    '--sgv-del-cell2':     '#fef2f2',
    '--sgv-add-cell1':     '#d0fae5',
    '--sgv-add-cell2':     '#f0fdf4',
    '--sgv-empty-cell':    '#f8fafc',
  },
};

export const DEFAULT_FILE_HISTORY_THEME: ThemeEntry = {
  name: 'File History Blue',
  vars: {
    '--sgv-text':          '#1e2939',
    '--sgv-bg1':           '#eff6ff',
    '--sgv-bg2':           '#eef2ff',
    '--sgv-tab1':          '#51a2ff',
    '--sgv-tab2':          '#7c86ff',
    '--sgv-tab3':          '#c27aff',
    '--sgv-th1':           '#bedbff',
    '--sgv-th2':           '#c6d2ff',
    '--sgv-th-text':       '#1c398e',
    '--sgv-row-border':    '#dbeafe',
    '--sgv-hash':          '#155dfc',
    '--sgv-ins':           '#00c950',
    '--sgv-del':           '#ff2056',
    '--sgv-author':        '#364153',
    '--sgv-date':          '#6a7282',
    '--sgv-sel1':          '#cefafe',
    '--sgv-sel2':          '#dbeafe',
    '--sgv-sel-text':      '#155dfc',
    '--sgv-mark1':         '#fef9c3',
    '--sgv-mark2':         '#fef08a',
    '--sgv-mark-text':     '#854d0e',
    '--sgv-marksel1':      '#fed7aa',
    '--sgv-marksel2':      '#fde68a',
    '--sgv-marksel-text':  '#78350f',
    '--sgv-focus':         '#51a2ff',
    '--sgv-fsel1':         '#a4f4cf',
    '--sgv-fsel2':         '#96f7e4',
    '--sgv-hint-text':     '#4f39f6',
    '--sgv-hint-bg':       '#e0e7ff',
    '--sgv-status-text':   '#155dfc',
    '--sgv-status-bg':     '#dbeafe',
    '--sgv-fhint-text':    '#009689',
    '--sgv-fhint-bg':      '#cbfbf1',
    '--sgv-kbd-border':    '#a5b4fc',
    '--sgv-kbd-bg':        'rgba(99,102,241,0.1)',
    '--sgv-kbd-text':      '#4338ca',
    '--sgv-dh1':           '#ffb900',
    '--sgv-dh2':           '#ff8904',
    '--sgv-dh3':           '#ff637e',
    '--sgv-diff-bg1':      '#fffbeb',
    '--sgv-diff-bg2':      '#fff7ed',
    '--sgv-diff-meta-text': '#45556c',
    '--sgv-diff-meta1':    '#e2e8f0',
    '--sgv-diff-meta2':    '#f1f5f9',
    '--sgv-lndel1':        '#ffedd4',
    '--sgv-lndel2':        '#fff7ed',
    '--sgv-lndel-b':       '#ffd6a8',
    '--sgv-lndel-text':    '#f54900',
    '--sgv-lnadd1':        '#cbfbf1',
    '--sgv-lnadd2':        '#f0fdfa',
    '--sgv-lnadd-b':       '#96f7e4',
    '--sgv-lnadd-text':    '#009689',
    '--sgv-del-cell1':     '#ffe4e6',
    '--sgv-del-cell2':     '#fef2f2',
    '--sgv-add-cell1':     '#d0fae5',
    '--sgv-add-cell2':     '#f0fdf4',
    '--sgv-empty-cell':    '#f8fafc',
  },
};

export function buildRootCss(vars: Record<string, string>): string {
  return `:root {\n${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`;
}

export function loadThemesFromFolder(folderPath: string): ThemeEntry[] {
  const themes: ThemeEntry[] = [];
  if (!fs.existsSync(folderPath)) { return themes; }
  let files: string[];
  try {
    files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json')).sort();
  } catch {
    return themes;
  }
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(folderPath, file), 'utf-8');
      const json = JSON.parse(content) as { schema?: string; name?: string; colors?: Record<string, string> };
      if (json.schema !== 'simple-git-view.theme.v1') { continue; }
      if (!json.name || !json.colors) { continue; }
      themes.push(themeFromColors(json.name, json.colors));
    } catch {
      // skip invalid files
    }
  }
  return themes;
}

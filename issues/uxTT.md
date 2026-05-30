# uxTT

## Issue ID
uxTT

## Title
テーマシステム — フォルダ内 JSON テーマファイルを c キーで循環切り替え

## Purpose
- `.simple-git-view/themes/` に置いた JSON ファイルを読み込み、c キーでカラーテーマを循環切り替えする
- テーマ名をパネルのタブバーに表示する
- デフォルト（現行の Figma ピンク・ブルー）はそのまま維持する

## Background
- 現在のカラーはすべて `historyPanel.ts` の CSS 文字列にハードコードされている
- Morphous など外部デザインシステムが生成する JSON をテーマとして適用したい
- ユーザーがフォルダに複数テーマを置いてキーで瞬時に切り替えられる UX が目標

## Scope

### テーマ JSON スキーマ定義（`simple-git-view.theme.v1`）
```json
{
  "schema": "simple-git-view.theme.v1",
  "name": "テーマ表示名",
  "colors": {
    "primary":     "#hex",
    "accent":      "#hex",
    "signal":      "#hex",
    "destructive": "#hex",
    "background":  "#hex",
    "surface":     "#hex",
    "muted":       "#hex",
    "border":      "#hex",
    "depth":       "#hex",
    "ink":         "#hex"
  }
}
```
- 10 色のセマンティックカラーのみ。派生色（薄め・透過）は拡張機能側で計算する。

### `src/themeLoader.ts`（新規）
- `ThemeEntry` interface: `{ name: string; vars: Record<string, string> }`
- `buildRootCss(vars)`: `:root { --sgv-*: ... }` CSS 文字列を返す
- `DEFAULT_FIGMA_THEME`: 現行 FIGMA_STYLE の全色を `--sgv-*` に変換した定数
- `DEFAULT_FILE_HISTORY_THEME`: 現行 FILE_HISTORY_STYLE の全色を変換した定数
- `themeFromColors(name, colors)`: 10色セマンティックカラー → CSS 変数 Record を計算
  - `blendWithWhite(hex, factor)`: hex を白に factor 割合でブレンド（薄め色の派生に使用）
  - `hexAlpha(hex, alpha)`: rgba() 文字列を返す
  - 各 `--sgv-*` 変数の算出ルール（下記参照）
- `loadThemesFromFolder(folderPath)`: JSON ファイルをスキャンして `ThemeEntry[]` を返す

#### `--sgv-*` CSS 変数一覧（FIGMA デフォルト値）
| CSS 変数 | 導出元 | FIGMA デフォルト |
|---|---|---|
| `--sgv-text` | ink | `#1e2939` |
| `--sgv-bg1` | background | `rgb(250,245,255)` |
| `--sgv-bg2` | surface | `rgb(253,242,248)` |
| `--sgv-tab1` | primary | `#c27aff` |
| `--sgv-tab2` | accent | `#fb64b6` |
| `--sgv-tab3` | signal | `#ff637e` |
| `--sgv-th1` | blendWithWhite(muted, 0.3) | `#e9d4ff` |
| `--sgv-th2` | blendWithWhite(surface, 0.05) | `#fccee8` |
| `--sgv-th-text` | depth | `#59168b` |
| `--sgv-row-border` | blendWithWhite(border, 0.1) | `#f3e8ff` |
| `--sgv-hash` | primary | `#9810fa` |
| `--sgv-ins` | signal | `#00c950` |
| `--sgv-del` | destructive | `#ff2056` |
| `--sgv-author` | depth | `#364153` |
| `--sgv-date` | blendWithWhite(depth, 0.45) | `#6a7282` |
| `--sgv-sel1` | blendWithWhite(primary, 0.75) | `#dbeafe` |
| `--sgv-sel2` | blendWithWhite(signal, 0.75) | `#cefafe` |
| `--sgv-sel-text` | depth | inherit |
| `--sgv-mark1` | fixed | `#fef9c3` |
| `--sgv-mark2` | fixed | `#fef08a` |
| `--sgv-mark-text` | fixed | `#854d0e` |
| `--sgv-marksel1` | fixed | `#fed7aa` |
| `--sgv-marksel2` | fixed | `#fde68a` |
| `--sgv-marksel-text` | fixed | `#78350f` |
| `--sgv-focus` | accent | `#c27aff` |
| `--sgv-fsel1` | blendWithWhite(signal, 0.5) | `#a4f4cf` |
| `--sgv-fsel2` | blendWithWhite(primary, 0.5) | `#96f7e4` |
| `--sgv-hint-text` | primary | `#9810fa` |
| `--sgv-hint-bg` | blendWithWhite(primary, 0.85) | `#f3e8ff` |
| `--sgv-status-text` | signal | `#e60076` |
| `--sgv-status-bg` | blendWithWhite(signal, 0.85) | `#fce7f3` |
| `--sgv-fhint-text` | primary | `#009689` |
| `--sgv-fhint-bg` | blendWithWhite(signal, 0.85) | `#cbfbf1` |
| `--sgv-kbd-border` | blendWithWhite(accent, 0.3) | `#d8b4fe` |
| `--sgv-kbd-bg` | hexAlpha(accent, 0.15) | `rgba(194,122,255,0.15)` |
| `--sgv-kbd-text` | accent | `#7c3aed` |
| `--sgv-dh1` | primary | `#ffb900` |
| `--sgv-dh2` | signal | `#ff8904` |
| `--sgv-dh3` | destructive | `#ff637e` |
| `--sgv-diff-bg1` | blendWithWhite(background, 0.5) | `#fffbeb` |
| `--sgv-diff-bg2` | blendWithWhite(surface, 0.5) | `#fff7ed` |
| `--sgv-diff-meta-text` | depth | `#45556c` |
| `--sgv-diff-meta1` | muted | `#e2e8f0` |
| `--sgv-diff-meta2` | blendWithWhite(muted, 0.35) | `#f1f5f9` |
| `--sgv-lndel1` | blendWithWhite(destructive, 0.82) | `#ffedd4` |
| `--sgv-lndel2` | blendWithWhite(destructive, 0.97) | `#fff7ed` |
| `--sgv-lndel-b` | blendWithWhite(destructive, 0.55) | `#ffd6a8` |
| `--sgv-lndel-text` | destructive | `#f54900` |
| `--sgv-lnadd1` | blendWithWhite(signal, 0.82) | `#cbfbf1` |
| `--sgv-lnadd2` | blendWithWhite(signal, 0.97) | `#f0fdfa` |
| `--sgv-lnadd-b` | blendWithWhite(signal, 0.55) | `#96f7e4` |
| `--sgv-lnadd-text` | signal | `#009689` |
| `--sgv-del-cell1` | blendWithWhite(destructive, 0.87) | `#ffe4e6` |
| `--sgv-del-cell2` | blendWithWhite(destructive, 0.97) | `#fef2f2` |
| `--sgv-add-cell1` | blendWithWhite(signal, 0.87) | `#d0fae5` |
| `--sgv-add-cell2` | blendWithWhite(signal, 0.97) | `#f0fdf4` |
| `--sgv-empty-cell` | blendWithWhite(background, 0.2) | `#f8fafc` |

### `src/historyPanel.ts`（変更）
- `FIGMA_STYLE` と `FILE_HISTORY_STYLE` を削除し、CSS 変数を使う `SHARED_STYLE` 1本に統一
  - 全ハードコード色を `var(--sgv-*)` に置換
  - `.theme-badge` スタイルを追加（タブバー右側に表示する小さなバッジ）
- モジュールレベルにテーマ状態を追加
  ```typescript
  let loadedThemes: ThemeEntry[] = [];
  let currentThemeIdx = 0;
  ```
- テーマリスト = `[DEFAULT_FIGMA_THEME, DEFAULT_FILE_HISTORY_THEME, ...loadedThemes]`
- `HistoryPanel.show()` でワークスペースの `.simple-git-view/themes/` を `loadThemesFromFolder` でスキャン
- `broadcastTheme(theme: ThemeEntry)`: 全パネル（メイン + 全ファイル履歴）に `updateTheme` を送信
- `handleMessage` に `switchTheme` 処理を追加
  ```typescript
  if (msg.command === 'switchTheme') {
    currentThemeIdx = (currentThemeIdx + 1) % allThemes.length;
    broadcastTheme(allThemes[currentThemeIdx]);
  }
  ```
- `getHtml()` の `<head>` に `<style id="sgv-theme">` を追加して初期テーマ CSS を注入
- タブバー HTML に `<span id="theme-name" class="theme-badge">Default</span>` を追加
- `openFileHistoryPanel` の `onDidReceiveMessage` にも `switchTheme` 処理を追加

### `src/webviewMain.ts`（変更）
- `document.addEventListener('keydown')` に `c` キーハンドラを追加
  ```typescript
  if (e.key === 'c' && !inFileList && !inDiff) {
    e.preventDefault();
    vscode.postMessage({ command: 'switchTheme' });
    return;
  }
  ```
- `window.addEventListener('message')` に `updateTheme` ハンドラを追加
  ```typescript
  if (msg.command === 'updateTheme') {
    const el = document.getElementById('sgv-theme');
    if (el) { el.textContent = msg.css; }
    const badge = document.getElementById('theme-name');
    if (badge) { badge.textContent = msg.name; }
  }
  ```
- ヒント行に `<kbd>c</kbd> テーマ` を追記

### `src/fileHistoryMain.ts`（変更）
- webviewMain.ts と同様に `c` キーハンドラと `updateTheme` ハンドラを追加
- ヒント行に `<kbd>c</kbd> テーマ` を追記

## Out of Scope
- Morphous JSON の直接読み込み（uxUU の変換スクリプト経由で対応）
- ダークモード対応
- テーマのパーシスト（セッション内メモリのみ、再起動でリセット）
- テーマエディタ UI

## Editable Files
- src/themeLoader.ts（新規）
- src/historyPanel.ts
- src/webviewMain.ts
- src/fileHistoryMain.ts

## Do Not Edit
- src/gitService.ts
- src/extension.ts
- src/statusBarItem.ts
- src/blameDecoration.ts
- package.json

## Dependencies
- uxSS マージ済み（最新 main から作業すること）

## Branch
feature/uxTT-theme-switcher

## Implementation Notes
- `blendWithWhite(hex, factor)`: `factor=0` で元色、`factor=1` で白。例: `blendWithWhite('#ff0000', 0.8)` → `#ffcccc`
- `hexAlpha(hex, alpha)`: 例: `hexAlpha('#7c3aed', 0.15)` → `rgba(124,58,237,0.15)`
- DEFAULT_FIGMA_THEME / DEFAULT_FILE_HISTORY_THEME は computed derivation ではなく既存の実測値をそのまま定数として持つ（デフォルト色の完全一致のため）
- テーマリスト先頭 2 件はビルトイン（FIGMA/FILE_HISTORY）、以降がユーザー JSON
- 全パネルが同じ `currentThemeIdx` を参照するため、どのパネルで c を押しても全パネルが同期して切り替わる

## Acceptance Criteria
- [ ] デフォルト状態（JSON なし）で現行の Figma ピンクテーマが表示される
- [ ] c キーを押すと File History ブルーテーマに切り替わる
- [ ] さらに c を押すと `.simple-git-view/themes/` 内の JSON テーマが順に適用される
- [ ] テーマ名がタブバーのバッジに表示される
- [ ] テーマ切り替え時に開いている全パネル（メイン・ファイル履歴）が同期して変わる
- [ ] フォルダが存在しない／JSON がない場合もクラッシュせず動作する
- [ ] `npm run compile` が成功する

## Definition of Done
- [ ] コードが追加されている
- [ ] SPEC.md と矛盾しない
- [ ] PR が作成されている（base: main）

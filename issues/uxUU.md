# uxUU

## Issue ID
uxUU

## Title
Morphous テーマ JSON → simple-git-view テーマ変換スクリプト

## Purpose
- Morphous が生成する `morphous.theme.v1` JSON を `simple-git-view.theme.v1` 形式に変換するスクリプトを提供する
- ユーザーが Morphous テーマを入手したらコマンド一発で拡張機能用テーマ JSON を生成できるようにする

## Background
- Morphous JSON は `palette`（role別 hex）・`light`/`dark`（oklch CSS 変数）・`identity` など多数のフィールドを持つが、拡張機能が必要なのは10色のセマンティックカラーのみ
- uxTT で定義した `simple-git-view.theme.v1` は10色のシンプルな形式
- 変換ロジックは単純（palette の role を名前でマッピングするだけ）なので軽量スクリプトで十分

## Morphous palette role → simple-git-view colors マッピング

| Morphous `palette[role]` | simple-git-view `colors` キー | 用途 |
|---|---|---|
| `Primary` | `primary` | ハッシュ色・タブバー主色・フォーカスリング |
| `Accent` | `accent` | タブバー中間色・kbd 背景 |
| `Signal` | `signal` | タブバー終端色・insertion 色 |
| `Destructive` | `destructive` | deletion 色・diff del ハイライト |
| `Background` | `background` | ボディ背景 |
| `Surface` | `surface` | パネル面 |
| `Muted` | `muted` | テーブルヘッダー・diff meta 背景 |
| `Border` | `border` | 行区切り線 |
| `Depth` | `depth` | 著者・テーブルヘッダーテキスト |
| `Ink` | `ink` | メインテキスト |

## Scope

### `scripts/morphous-to-sgv-theme.js`（新規）
Node.js スクリプト（依存ゼロ、標準 `fs`・`path` のみ）

**使い方:**
```bash
node scripts/morphous-to-sgv-theme.js <input.json> [output.json]
# output を省略した場合 → <slug>.sgv-theme.json として同フォルダに出力
# 例:
node scripts/morphous-to-sgv-theme.js morphous-betta-scale.json
# → morphous-betta-scale.sgv-theme.json を生成
```

**出力フォーマット:**
```json
{
  "schema": "simple-git-view.theme.v1",
  "name": "Morphous Betta Scale",
  "colors": {
    "primary":     "#0EA7A6",
    "accent":      "#7861FF",
    "signal":      "#4361EE",
    "destructive": "#D7263D",
    "background":  "#F7FAFF",
    "surface":     "#F3F6FA",
    "muted":       "#D8E7F1",
    "border":      "#B9CCD7",
    "depth":       "#282F36",
    "ink":         "#080F14"
  }
}
```

**スクリプトのロジック:**
1. 入力 JSON を読み込み、`json.schema === 'morphous.theme.v1'` を確認
2. `json.palette` を走査して role 名でマッピング
3. 見つからない role はデフォルト値（FIGMA_STYLE のデフォルト色）でフォールバック
4. `simple-git-view.theme.v1` 形式 JSON を出力ファイルに書き込む
5. 成功・エラーをコンソールに表示

**エラーハンドリング:**
- 入力ファイルなし → 使い方を表示して終了
- JSON parse エラー → エラー内容を表示
- `schema` が `morphous.theme.v1` でない → 警告を出して処理継続（palette が存在すれば変換を試みる）

### `scripts/README.md`（新規）
- スクリプトの使い方と出力先フォルダの説明
- テーマを拡張機能に反映するまでの手順:
  1. 変換スクリプトで `*.sgv-theme.json` を生成
  2. ワークスペースの `.simple-git-view/themes/` に配置
  3. VSCode で Git History パネルを開き c キーでテーマを選択

## Out of Scope
- シェルスクリプト（Zsh/Bash）版は不要（Node.js スクリプト1本で十分）
- Morphous 以外のデザインシステム形式への対応
- GUI / VSCode コマンドからの起動
- バルク変換（ディレクトリ全体の一括処理）

## Editable Files
- scripts/morphous-to-sgv-theme.js（新規）
- scripts/README.md（新規）

## Do Not Edit
- src/ 配下のすべてのファイル
- package.json
- SPEC.md

## Dependencies
- uxTT で `simple-git-view.theme.v1` スキーマが定義されていること（並列実装可能。スキーマ仕様は uxTT の issue を参照）

## Branch
feature/uxUU-morphous-theme-converter

## Implementation Notes
- Node.js 18+ を前提とする（プロジェクトの VSCode 拡張開発環境に合わせる）
- `require`（CommonJS）で書く（TypeScript コンパイル不要）
- hex が `#RRGGBB` 形式かどうかは緩くチェック（`#` で始まる6桁）するだけでよい
- スクリプト自体は npm scripts に登録しない（直接 node で実行する想定）

## Acceptance Criteria
- [ ] `node scripts/morphous-to-sgv-theme.js <morphous-json>` でエラーなく `*.sgv-theme.json` が生成される
- [ ] 出力 JSON の `schema` が `"simple-git-view.theme.v1"` である
- [ ] Morphous Betta Scale JSON を変換した結果の `colors.primary` が `#0EA7A6` (Betta Teal) である
- [ ] 対応する palette role が存在しない場合にクラッシュしない
- [ ] 生成した JSON を `.simple-git-view/themes/` に置いて uxTT 実装で c キーを押すとテーマが切り替わる
- [ ] scripts/README.md に手順が記載されている

## Definition of Done
- [ ] スクリプトが追加されている
- [ ] README に使い方が記載されている
- [ ] PR が作成されている（base: main）

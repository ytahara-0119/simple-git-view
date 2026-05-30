# scripts/

このディレクトリには simple-git-view の開発・運用を補助するスクリプトが含まれています。

---

## morphous-to-sgv-theme.js

### 概要

[Morphous](https://morphous.app/) が生成する `morphous.theme.v1` JSON を
VSCode 拡張 **simple-git-view** が読み込む `simple-git-view.theme.v1` 形式に変換するスクリプトです。

依存ゼロ（Node.js 標準の `fs`・`path` のみ使用）。Node.js 18 以上で動作します。

---

### 使い方

```bash
# 基本（出力ファイル名は自動決定）
node scripts/morphous-to-sgv-theme.js path/to/morphous-theme.json

# 出力先を明示指定
node scripts/morphous-to-sgv-theme.js path/to/morphous-theme.json path/to/output.sgv-theme.json
```

出力先を省略した場合、入力ファイルと同じフォルダに `<入力ファイル名>.sgv-theme.json` を生成します。

#### 例

```bash
node scripts/morphous-to-sgv-theme.js ~/Downloads/morphous-betta-scale.json
# → ~/Downloads/morphous-betta-scale.sgv-theme.json を生成
```

---

### テーマを拡張機能に反映するまでの手順

1. **Morphous サイトでテーマ JSON をダウンロード**

   [https://morphous.app/](https://morphous.app/) でテーマを作成し、JSON 形式でエクスポートします。

2. **変換スクリプトを実行**

   ```bash
   node scripts/morphous-to-sgv-theme.js <downloaded-morphous.json>
   ```

   同フォルダに `*.sgv-theme.json` が生成されます。

3. **生成ファイルをワークスペースに配置**

   `.simple-git-view/themes/` ディレクトリを作成し、生成した `.sgv-theme.json` をコピーします。

   ```bash
   mkdir -p .simple-git-view/themes
   cp path/to/generated.sgv-theme.json .simple-git-view/themes/
   ```

4. **VSCode でテーマを切り替える**

   VSCode で Git History パネルを開き、`c` キーを押してテーマ一覧から選択します。

---

### `simple-git-view.theme.v1` スキーマ

生成される JSON のフォーマットは以下のとおりです。

```json
{
  "schema": "simple-git-view.theme.v1",
  "name": "テーマ名",
  "colors": {
    "primary":     "#RRGGBB",
    "accent":      "#RRGGBB",
    "signal":      "#RRGGBB",
    "destructive": "#RRGGBB",
    "background":  "#RRGGBB",
    "surface":     "#RRGGBB",
    "muted":       "#RRGGBB",
    "border":      "#RRGGBB",
    "depth":       "#RRGGBB",
    "ink":         "#RRGGBB"
  }
}
```

#### colors 各キーの用途

| キー | 用途 |
|---|---|
| `primary` | コミットハッシュ色・タブバー主色・フォーカスリング |
| `accent` | タブバー中間色・kbd 背景 |
| `signal` | タブバー終端色・diff insertion（追加行）ハイライト |
| `destructive` | diff deletion（削除行）ハイライト |
| `background` | ボディ背景 |
| `surface` | パネル面（カード等） |
| `muted` | テーブルヘッダー・diff meta 行背景 |
| `border` | 行区切り線 |
| `depth` | 著者名・テーブルヘッダーテキスト |
| `ink` | メインテキスト全般 |

---

## parallel-check.sh / workflow-status.sh

並列実装の依存確認・進捗確認スクリプトです。Supervisor エージェントが内部で使用します。
